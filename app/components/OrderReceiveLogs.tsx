import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { getOrderReceiveLog, listOrderReceiveLogs } from '../services/orderReceiveLogs';

const states: Record<string, string> = { failed: '处理失败', request_failed: '请求被拒绝', retried: '已重试' };

export default function OrderReceiveLogs({ instanceId }: { instanceId: string }) {
  const [input, setInput] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const logs = useQuery({
    queryKey: ['spd-order-receive-logs', instanceId, orderNo, page],
    queryFn: () => listOrderReceiveLogs(instanceId, orderNo, page),
  });
  const detail = useQuery({
    queryKey: ['spd-order-receive-log', instanceId, selected],
    queryFn: () => getOrderReceiveLog(instanceId, selected ?? ''),
    enabled: selected !== null,
  });
  const total = logs.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / (logs.data?.size ?? 20)));
  return <section className="space-y-4 rounded-lg border bg-background p-4">
    <div>
      <h2 className="font-semibold">接收采购计划接口</h2>
      <p className="mt-1 text-sm text-muted-foreground">查询 SPD-PR 采购订单的接收失败记录及请求参数。</p>
    </div>
    <form className="flex flex-wrap items-end gap-3" onSubmit={event => {
      event.preventDefault();
      const next = input.trim();
      if (next === orderNo && page === 1) void logs.refetch();
      setOrderNo(next);
      setPage(1);
    }}>
      <label className="space-y-1 text-sm">
        <span>订单号</span>
        <Input value={input} maxLength={100} placeholder="输入 SPD-PR 订单号" onChange={e => setInput(e.target.value)} />
      </label>
      <Button type="submit">查询</Button>
      <Button type="button" variant="outline" onClick={() => { setInput(''); setOrderNo(''); setPage(1); }}>重置</Button>
    </form>
    {logs.isLoading && <p role="status" className="text-sm text-muted-foreground">正在加载失败日志…</p>}
    {logs.error && <p role="alert" className="text-sm text-destructive">{logs.error.message}</p>}
    {logs.data && <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            {['接收时间', '来源订单号', '结果', 'HTTP', '失败原因', '操作'].map(label => <TableHead key={label}>{label}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {logs.data.records.map(log => <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap">{log.createdTime}</TableCell>
              <TableCell className="font-mono">{log.orderNo || '—'}</TableCell>
              <TableCell><Badge variant={log.state === 'retried' ? 'secondary' : 'destructive'}>{states[log.state] ?? log.state}</Badge></TableCell>
              <TableCell>{log.httpStatus}</TableCell>
              <TableCell className="min-w-56 whitespace-normal break-words">{log.reason}</TableCell>
              <TableCell><Button size="sm" variant="outline" onClick={() => setSelected(log.id)}>查看参数</Button></TableCell>
            </TableRow>)}
            {logs.data.records.length === 0 && <TableRow><TableCell colSpan={6} className="py-6 text-center text-muted-foreground">没有匹配的失败日志</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">共 {total} 条 · 第 {page} / {pages} 页</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>下一页</Button>
        </div>
      </div>
    </>}
    <Dialog open={selected !== null} onOpenChange={open => { if (!open) setSelected(null); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>接收采购计划失败详情</DialogTitle>
          <DialogDescription>查看本次接收的失败原因和订单业务参数。</DialogDescription>
        </DialogHeader>
        {detail.isLoading && <p role="status">正在加载参数…</p>}
        {detail.error && <p role="alert" className="text-destructive">{detail.error.message}</p>}
        {detail.data && <>
          <div className="space-y-1 text-sm">
            <p className="font-medium">订单号：{detail.data.log.orderNo || '—'}</p>
            <p>失败原因：{detail.data.log.reason}</p>
            <p className="text-muted-foreground">HTTP {detail.data.log.httpStatus}{detail.data.log.failureCode ? ' · ' + detail.data.log.failureCode : ''}</p>
            {detail.data.log.retryResult && <p>{detail.data.log.retryResult}</p>}
          </div>
          <h3 className="text-sm font-semibold">请求参数</h3>
          {Object.keys(detail.data.parameters).length ? (
            <pre className="max-h-[50vh] overflow-auto rounded-lg bg-muted p-3 text-xs">{detail.data.parametersJson ?? JSON.stringify(detail.data.parameters, null, 2)}</pre>
          ) : <p className="text-sm text-muted-foreground">没有可展示的业务参数。</p>}
        </>}
      </DialogContent>
    </Dialog>
  </section>;
}
