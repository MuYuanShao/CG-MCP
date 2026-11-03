import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { useFeedback } from './AppFeedback';
import HospitalSupplyManagement from './HospitalSupplyManagement';
import { phase3Instances, phase3Documents, phase3Items, phase3Feedback, phase3Feedbacks, phase3SupplierAccess, exactMoney, type Phase3Kind, type Phase3Document } from '../services/phase3';

const statuses: Record<string, string> = { draft: '院内草稿', approved: '院内已批准', executed: 'SPD已转订单', rejected: '院内已驳回', pending_confirm: '院内待确认', confirmed: '院内已确认' };
const feedbackStates: Record<string, string> = { pending: '等待发送', sending: '发送中', processed: 'SPD已接收', failed: '待重试' };

export default function Phase3Management({ instanceId, permissions }: { instanceId?: string; permissions: string[] }) {
  const { notify, confirm } = useFeedback(); const client = useQueryClient();
  const [showSupply, setShowSupply] = useState(false);
  const [selected, setSelected] = useState(''); const [kind, setKind] = useState<Phase3Kind>('purchase-plans');
  const [query, setQuery] = useState(''); const [applied, setApplied] = useState(''); const [page, setPage] = useState(1); const [size, setSize] = useState(20);
  const [detail, setDetail] = useState<Phase3Document | null>(null); const [detailPage, setDetailPage] = useState(1);
  const [feedbackType, setFeedbackType] = useState('received'); const [reason, setReason] = useState('');
  const [username, setUsername] = useState(''); const [supplier, setSupplier] = useState('');
  const retryIdentity = useRef<{ fingerprint: string; key: string } | undefined>(undefined);
  const instances = useQuery({ queryKey: ['phase3-instances'], queryFn: phase3Instances, enabled: !instanceId });
  const id = instanceId || selected || instances.data?.[0]?.id || '';
  const documents = useQuery({ queryKey: ['phase3-documents', id, kind, page, size, applied], queryFn: () => phase3Documents(id, kind, page, size, applied), enabled: !!id });
  const items = useQuery({ queryKey: ['phase3-items', id, kind, detail?.sourceId, detailPage], queryFn: () => phase3Items(id, kind, detail!.sourceId, detailPage), enabled: !!id && !!detail });
  const feedbacks = useQuery({ queryKey: ['phase3-feedback', id, detail?.sourceId], queryFn: () => phase3Feedbacks(id, detail!.sourceId), enabled: !!id && !!detail && kind === 'settlements', refetchInterval: detail ? 5000 : false });
  const feedback = useMutation({ mutationFn: async () => {
    if (!detail) throw new Error('请选择结算单');
    if (feedbackType === 'disputed' && !reason.trim()) throw new Error('差异反馈必须填写原因');
    const body = { revision: detail.revision, feedbackType, reason: reason.trim() };
    const fingerprint = JSON.stringify([id, detail.sourceId, body]);
    if (retryIdentity.current?.fingerprint !== fingerprint) retryIdentity.current = { fingerprint, key: crypto.randomUUID() };
    return phase3Feedback(id, detail.sourceId, retryIdentity.current.key, body);
  }, onSuccess: () => { notify.success('协同反馈已提交，接收结果可在下方查看'); client.invalidateQueries({ queryKey: ['phase3-feedback'] }); }, onError: e => notify.error((e as Error).message) });
  const access = useMutation({ mutationFn: (remove: boolean) => phase3SupplierAccess(id, username.trim(), supplier.trim(), remove), onSuccess: () => notify.success('供应商数据范围已更新'), onError: e => notify.error((e as Error).message) });
  const error = instances.error || documents.error;

  return <section className="space-y-4" aria-label="医院采购计划与结算">
    {!instanceId && <label className="flex flex-wrap items-center gap-2 text-sm">医院实例<select aria-label="医院实例" className="rounded border bg-background p-2" value={id} onChange={e => { setSelected(e.target.value); setPage(1); setDetail(null); }}>{instances.data?.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label>}
    <Button variant="outline" onClick={() => setShowSupply(!showSupply)}>{showSupply ? '返回医院计划与结算' : '医院订单供货'}</Button>
    {showSupply && <HospitalSupplyManagement instanceId={id} permissions={permissions} />}
    <div hidden={showSupply} className="space-y-4">
    <p className="text-sm text-muted-foreground">以院内审批和结算结果为准。计划转单关联已有SPD订单；供应商反馈不会确认付款或改变院内金额。</p>
    <div className="flex flex-wrap items-center gap-2">
      {(['purchase-plans', 'settlements'] as const).map(value => <Button key={value} variant={kind === value ? 'default' : 'outline'} onClick={() => { setKind(value); setPage(1); setDetail(null); }}>{value === 'purchase-plans' ? '医院采购计划' : '医院结算单'}</Button>)}
      <form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); setApplied(query.trim()); setPage(1); }}><Input aria-label="来源单号或供应商编码" placeholder="来源单号 / 供应商编码" value={query} onChange={e => setQuery(e.target.value)} /><Button disabled={!id} type="submit">查询</Button></form>
      <Button variant="outline" disabled={!id || documents.isFetching} onClick={() => documents.refetch()}>刷新</Button>
    </div>
    {error && <p role="alert" className="text-destructive">{(error as Error).message}</p>}
    {!error && !id && !instances.isLoading && <p className="py-6 text-muted-foreground">暂无已授权的医院实例，请联系管理员配置供应商数据范围。</p>}
    <div className="overflow-x-auto rounded border"><Table><TableHeader><TableRow>{['来源单号', '供应商编码', '来源状态', '版本', kind === 'settlements' ? '结算金额（四位）' : '估价依据', '操作'].map(title => <TableHead key={title}>{title}</TableHead>)}</TableRow></TableHeader><TableBody>
      {documents.isLoading && id && <TableRow><TableCell colSpan={6}>正在加载医院单据…</TableCell></TableRow>}
      {documents.data?.rows.map(row => <TableRow key={row.sourceId}><TableCell className="whitespace-nowrap">{row.documentNo}</TableCell><TableCell>{row.supplierCode}</TableCell><TableCell><Badge variant={row.operation === 'CANCEL' ? 'destructive' : 'outline'}>{row.operation === 'CANCEL' ? '原单已撤销' : statuses[row.sourceStatus] || row.sourceStatus}</Badge></TableCell><TableCell>{row.revision}</TableCell><TableCell className="text-right tabular-nums">{kind === 'settlements' ? `${row.currency || ''} ${exactMoney(row.totalAmount)}` : '详见明细；缺失估价不填零'}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => { setDetail(row); setDetailPage(1); setReason(''); setFeedbackType('received'); }}>明细与反馈</Button></TableCell></TableRow>)}
      {id && !documents.isLoading && !error && documents.data?.rows.length === 0 && <TableRow><TableCell colSpan={6}>当前条件下暂无医院单据。</TableCell></TableRow>}
    </TableBody></Table></div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>共 {documents.data?.total ?? 0} 条 · 第 {page} 页</span><div className="flex items-center gap-2"><select aria-label="每页条数" className="rounded border bg-background p-2" value={size} onChange={e => { setSize(Number(e.target.value)); setPage(1); }}>{[20, 50, 100, 200].map(n => <option key={n}>{n}</option>)}</select><Button variant="outline" disabled={page === 1 || documents.isFetching} onClick={() => setPage(page - 1)}>上一页</Button><Button variant="outline" disabled={page * size >= (documents.data?.total ?? 0) || documents.isFetching} onClick={() => setPage(page + 1)}>下一页</Button></div></div>
    {permissions.includes('integration:manage') && <details className="rounded border p-3"><summary className="cursor-pointer font-medium">供应商数据范围配置</summary><p className="my-2 text-sm text-muted-foreground">账户需单独授予第三期只读权限；提交反馈还需协同反馈权限。绑定只限定已有账户的数据范围。</p><form className="flex flex-wrap gap-2" onSubmit={e => { e.preventDefault(); access.mutate(false); }}><Input required maxLength={50} aria-label="供应商用户名" placeholder="已有供应商用户名" value={username} onChange={e => setUsername(e.target.value)} /><Input required maxLength={100} aria-label="来源供应商编码" placeholder="SPD来源供应商编码" value={supplier} onChange={e => setSupplier(e.target.value)} /><Button disabled={!id || access.isPending}>保存绑定</Button><Button type="button" variant="outline" disabled={!username || !supplier || access.isPending} onClick={async () => { if (await confirm({ title: '移除供应商数据范围', description: '该账户将失去此医院供应商单据的访问范围。', destructive: true })) access.mutate(true); }}>移除绑定</Button></form></details>}
    <Dialog open={!!detail} onOpenChange={open => { if (!open) setDetail(null); }}><DialogContent className="max-h-[85vh] max-w-6xl overflow-y-auto"><DialogHeader><DialogTitle>{detail?.documentNo}</DialogTitle><DialogDescription>来源版本 {detail?.revision} · {detail?.operation === 'CANCEL' ? '原单已撤销' : statuses[detail?.sourceStatus || '']} · {kind === 'settlements' ? `${detail?.currency} ${exactMoney(detail?.totalAmount)}` : '采购计划估价按来源记录展示'}</DialogDescription></DialogHeader>
      {items.error && <p role="alert" className="text-destructive">{(items.error as Error).message}</p>}
      <div className="overflow-x-auto"><Table><TableHeader><TableRow>{['明细编号', '商品编码', '数量', '单位', '单价 / 估价', '来源金额', '来源业务'].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{items.data?.rows.map(item => <TableRow key={item.sourceLineId}><TableCell>{item.sourceLineId}</TableCell><TableCell>{item.productCode}</TableCell><TableCell className="text-right">{item.quantity ?? item.plannedQuantity}</TableCell><TableCell>{item.unit}</TableCell><TableCell className="text-right">{kind === 'settlements' ? exactMoney(item.unitPrice) : item.priceBasis === 'not_recorded' ? '未记录估价' : exactMoney(item.estimatedUnitPrice)}</TableCell><TableCell className="text-right">{exactMoney(kind === 'settlements' ? item.amount : item.estimatedAmount)}</TableCell><TableCell>{item.sourceBizType ? `${item.sourceBizType} / ${item.sourceBizId}` : '院内采购计划'}</TableCell></TableRow>)}</TableBody></Table></div>
      <div className="flex items-center justify-between gap-2 text-sm"><span>明细共 {items.data?.total ?? 0} 条</span><div className="flex gap-2"><Button variant="outline" disabled={detailPage === 1 || items.isFetching} onClick={() => setDetailPage(detailPage - 1)}>前一页明细</Button><Button variant="outline" disabled={detailPage * 20 >= (items.data?.total ?? 0) || items.isFetching} onClick={() => setDetailPage(detailPage + 1)}>后一页明细</Button></div></div>
      {kind === 'settlements' && <section className="space-y-3 border-t pt-3"><h3 className="font-medium">供应商协同反馈</h3>{permissions.includes('integration:reconcile') && detail?.operation !== 'CANCEL' && <form className="space-y-2" onSubmit={e => { e.preventDefault(); feedback.mutate(); }}><select aria-label="反馈类型" className="rounded border bg-background p-2" value={feedbackType} onChange={e => setFeedbackType(e.target.value)}><option value="received">已接收</option><option value="disputed">存在差异</option><option value="withdrawn">撤回先前反馈</option></select><Input aria-label="反馈原因" placeholder="差异反馈必须填写原因" maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} /><Button disabled={feedback.isPending}>提交协同反馈</Button></form>}{feedbacks.error && <p role="alert" className="text-destructive">{(feedbacks.error as Error).message}</p>}{feedbacks.data?.length === 0 && <p className="text-sm text-muted-foreground">暂无协同反馈。</p>}{feedbacks.data?.map(row => <p key={row.messageId} className="text-sm">{feedbackStates[row.state] || row.state} · {row.message || '反馈已保存，等待SPD接收'}</p>)}</section>}
    </DialogContent></Dialog>
    </div>
  </section>;
}
