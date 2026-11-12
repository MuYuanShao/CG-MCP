import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { useFeedback } from './AppFeedback';
import { listSupplyDrafts, listSupplyOrders, refreshSupply, retrySupply, type SupplyDocument, type SupplyDraft } from '../services/hospitalSupply';

const states: Record<string, string> = { pending: '待回传', sending: '回传中', processed: 'SPD-PR 已接收', failed: '回传失败', rejected: 'SPD-PR 已拒绝' };
const receiptStates: Record<string, string> = { draft: '待收货', approved: '已验收', rejected: '已拒收' };

export default function PurchaseSupplyOrders({ onOpen }: { onOpen: (draft: SupplyDraft) => void }) {
  const [page, setPage] = useState(1);
  const { notify } = useFeedback();
  const client = useQueryClient();
  const drafts = useQuery({ queryKey: ['purchase-supply-drafts'], queryFn: listSupplyDrafts });
  const orders = useQuery({ queryKey: ['purchase-supply-orders', page], queryFn: () => listSupplyOrders(page), refetchInterval: 5000 });
  const update = useMutation({
    mutationFn: (row: SupplyDocument) => row.state === 'failed' ? retrySupply(row.instanceId, row.messageId) : refreshSupply(row.instanceId, row.messageId),
    onSuccess: () => { void client.invalidateQueries({ queryKey: ['purchase-supply-orders'] }); notify.success('供货回传状态已更新'); },
    onError: error => notify.error(error.message),
  });
  return <section className="space-y-4 rounded-lg border bg-background p-4">
    <div><h2 className="font-semibold">SPD-PR 供货单</h2><p className="text-sm text-muted-foreground">继续填写已保存草稿，或查看提交后的回传状态。</p></div>
    {(drafts.isLoading || orders.isLoading) && <p role="status" className="text-sm text-muted-foreground">正在读取供货记录…</p>}
    {(drafts.error || orders.error) && <p role="alert" className="text-sm text-destructive">{(drafts.error || orders.error)?.message}</p>}
    <Table>
      <TableHeader><TableRow>{['供货单号', '来源订单', '来源医院', '供应商', '状态', 'SPD-PR 收货单', '操作'].map(label => <TableHead key={label}>{label}</TableHead>)}</TableRow></TableHeader>
      <TableBody>
        {page === 1 && drafts.data?.map(draft => <TableRow key={draft.draftId}><TableCell>{draft.body.supplyNo}</TableCell><TableCell>{draft.orderNo}</TableCell><TableCell>{draft.hospital}</TableCell><TableCell>{draft.supplierCode}</TableCell><TableCell><Badge variant="secondary">草稿</Badge></TableCell><TableCell>—</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => onOpen(draft)}>继续填写</Button></TableCell></TableRow>)}
        {orders.data?.rows.map(row => <TableRow key={row.messageId}><TableCell>{row.supplyNo}</TableCell><TableCell>{row.orderNo}</TableCell><TableCell>{row.hospital}</TableCell><TableCell>{row.supplierCode}</TableCell><TableCell><Badge variant={row.state === 'rejected' || row.state === 'failed' ? 'destructive' : 'secondary'}>{states[row.state] ?? row.state}</Badge>{row.message && <div className="mt-1 max-w-52 whitespace-normal text-xs text-muted-foreground">{row.message}</div>}</TableCell><TableCell>{row.result?.receivingNo || '—'}{row.result && <div className="text-xs text-muted-foreground">{receiptStates[row.result.receivingStatus] ?? row.result.receivingStatus}</div>}</TableCell><TableCell>{['processed', 'failed'].includes(row.state) && <Button size="sm" variant="outline" disabled={update.isPending} onClick={() => update.mutate(row)}>{row.state === 'failed' ? '重试回传' : '刷新收货状态'}</Button>}</TableCell></TableRow>)}
        {drafts.data?.length === 0 && orders.data?.total === 0 && <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">暂无供货单</TableCell></TableRow>}
      </TableBody>
    </Table>
    <div className="flex justify-between text-sm"><span className="text-muted-foreground">已提交 {orders.data?.total ?? 0} 张 · 第 {page} 页</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</Button><Button size="sm" variant="outline" disabled={page * 20 >= (orders.data?.total ?? 0)} onClick={() => setPage(page + 1)}>下一页</Button></div></div>
  </section>;
}
