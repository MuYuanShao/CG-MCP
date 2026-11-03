import { useRef, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { useFeedback } from './AppFeedback';
import { exactMoney } from '../services/phase3';
import { supplyCapability, hospitalOrders, supplyOptions, submitSupply, supplyHistory, refreshSupply, retrySupply, supplyItems, type HospitalOrder, type SupplyLine, type SupplyOptions, type SupplyRow } from '../services/hospitalSupply';

const stateText: Record<string, string> = { pending: '待回传', sending: '回传中', failed: '回传失败，可重试', rejected: 'SPD校验拒绝', processed: 'SPD已接收' };
const receiptText: Record<string, string> = { draft: 'SPD待收货', approved: 'SPD已验收入库', rejected: 'SPD已拒收' };
const orderStatus: Record<string, string> = { approved: '已批准', sent: '已发送', closed: '已关闭', draft: '草稿', pending_approval: '待审批' };

export default function HospitalSupplyManagement({ instanceId, permissions }: { instanceId: string; permissions: string[] }) {
  const { notify, confirm } = useFeedback(); const client = useQueryClient();
  const [supplyDetail, setSupplyDetail] = useState(''); const [itemPage, setItemPage] = useState(1);
  const [query, setQuery] = useState(''); const [applied, setApplied] = useState(''); const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<HospitalOrder | null>(null); const [options, setOptions] = useState<SupplyOptions | null>(null); const [optionsError, setOptionsError] = useState('');
  const [warehouse, setWarehouse] = useState(''); const [supplyNo, setSupplyNo] = useState(''); const [remark, setRemark] = useState(''); const [lines, setLines] = useState<SupplyLine[]>([]); const [historyPage, setHistoryPage] = useState(1);
  const identity = useRef<{ fingerprint: string; key: string } | undefined>(undefined);
  const capability = useQuery({ queryKey: ['supply-capability'], queryFn: supplyCapability });
  const orders = useQuery({ queryKey: ['hospital-supply-orders', instanceId, page, applied], queryFn: () => hospitalOrders(instanceId, page, applied), enabled: !!instanceId && capability.data?.enabled === true });
  const history = useQuery({ queryKey: ['hospital-supplies', instanceId, selected?.orderNo, historyPage], queryFn: () => supplyHistory(instanceId, selected!.orderNo, historyPage), enabled: !!selected, refetchInterval: selected ? 5000 : false });
  const detailItems = useQuery({ queryKey: ['hospital-supply-items', instanceId, supplyDetail, itemPage], queryFn: () => supplyItems(instanceId, supplyDetail, itemPage), enabled: !!supplyDetail });
  const optionsRequest = useRef(0);
  async function open(order: HospitalOrder) {
    const request = ++optionsRequest.current; setSupplyDetail(''); setItemPage(1); setSelected(order); setOptions(null); setOptionsError(''); setLines([]); setWarehouse(''); setSupplyNo('GH-' + crypto.randomUUID()); setRemark(''); setHistoryPage(1); identity.current = undefined;
    if (!permissions.includes('integration:supply') || !['approved', 'sent'].includes(order.status)) return;
    try { const result = await supplyOptions(instanceId, order.orderNo); if (request !== optionsRequest.current) return; setOptions(result); setLines(result.items.map(item => ({ supplyLineId: crypto.randomUUID(), orderLineId: item.lineId, productCode: item.productCode, unit: item.unit, quantity: '0', productionBatchNo: '', productionDate: '', expireDate: '', udiCode: '' }))); }
    catch (error) { if (request === optionsRequest.current) setOptionsError((error as Error).message); }
  }
  async function reloadCapacity() {
    if (!selected) return;
    const request = ++optionsRequest.current; setOptionsError('');
    try { const result = await supplyOptions(instanceId, selected.orderNo); if (request === optionsRequest.current) setOptions(result); }
    catch (error) { if (request === optionsRequest.current) setOptionsError((error as Error).message); }
  }
  const submit = useMutation({ mutationFn: async () => {
    if (!selected || !options) throw new Error('请先读取医院订单可供货信息');
    const chosen = lines.filter(line => line.quantity !== '' && line.quantity !== '0');
    if (!supplyNo.trim() || !warehouse || !chosen.length) throw new Error('请填写供货单号、收货库房和正数供货数量');
    const totals = new Map<string, bigint>();
    for (const line of chosen) {
      if (!/^[1-9][0-9]{0,13}$/.test(line.quantity) || !line.productionBatchNo.trim() || !line.productionDate || !line.expireDate) throw new Error('供货数量须为基本单位正整数，并填写批号、生产日期及有效期');
      const total = (totals.get(line.orderLineId) || 0n) + BigInt(line.quantity); totals.set(line.orderLineId, total);
      const remaining = options.items.find(i => i.lineId === line.orderLineId)?.remainingQuantity || '0'; if (total > BigInt(remaining)) throw new Error('供货数量超过医院当前剩余可收数量，请重新读取订单');
    }
    const body = { supplyNo: supplyNo.trim(), warehouseCode: warehouse, remark: remark.trim(), items: chosen.map(i => ({ ...i, productionBatchNo: i.productionBatchNo.trim() })) };
    const fingerprint = JSON.stringify([instanceId, selected.orderNo, body]); if (identity.current?.fingerprint !== fingerprint) identity.current = { fingerprint, key: crypto.randomUUID() };
    if (!await confirm({ title: '提交供货回传', description: `将供货单 ${body.supplyNo} 回传至医院，生成待收货单，须经院方验收后入库。` })) return false;
    await submitSupply(instanceId, selected.orderNo, identity.current.key, body); return true;
  }, onSuccess: success => { if (success) { notify.success('供货已提交，等待SPD接收；可在下方查看回传记录'); client.invalidateQueries({ queryKey: ['hospital-supplies'] }); setOptions(null); setLines([]); } }, onError: error => notify.error((error as Error).message) });
  const status = useMutation({ mutationFn: (row: SupplyRow) => row.state === 'failed' ? retrySupply(instanceId, row.messageId) : refreshSupply(instanceId, row.messageId), onSuccess: () => { client.invalidateQueries({ queryKey: ['hospital-supplies'] }); notify.success('供货状态已更新'); }, onError: error => notify.error((error as Error).message) });
  function update(index: number, field: keyof SupplyLine, value: string) { setLines(current => current.map((line, i) => i === index ? { ...line, [field]: value } : line)); }
  return <section className="space-y-3" aria-label="医院订单供货回传">
    <p className="text-sm text-muted-foreground">依据SPD采购订单填写供货批次。提交后在SPD生成待收货单，由医院验收；回传成功不会直接入库或确认结算。</p>
    {capability.data?.enabled === false && <p>医院订单供货回传尚未启用，请联系管理员。</p>}
    {(capability.error || orders.error) && <p role="alert" className="text-destructive">{((capability.error || orders.error) as Error).message}</p>}
    <form className="flex gap-2" onSubmit={e => { e.preventDefault(); setApplied(query.trim()); setPage(1); }}><Input aria-label="医院采购订单号" placeholder="医院采购订单号" value={query} onChange={e => setQuery(e.target.value)} /><Button disabled={!capability.data?.enabled}>查询</Button><Button type="button" variant="outline" disabled={!capability.data?.enabled} onClick={() => orders.refetch()}>刷新订单</Button></form>
    <div className="overflow-x-auto rounded border"><Table><TableHeader><TableRow>{['医院订单号', '来源计划', '供应商', '来源状态', '订单金额', '操作'].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>
      {orders.isLoading && <TableRow><TableCell colSpan={6}>正在读取医院订单…</TableCell></TableRow>}
      {orders.data?.rows.map(row => <TableRow key={row.orderNo}><TableCell>{row.orderNo}</TableCell><TableCell>{row.sourcePlanNo || '—'}</TableCell><TableCell>{row.supplierCode}</TableCell><TableCell>{orderStatus[row.status] || row.status}</TableCell><TableCell>{row.currency} {exactMoney(String(row.totalAmount))}</TableCell><TableCell><Button variant="outline" onClick={() => open(row)}>供货与回传记录</Button></TableCell></TableRow>)}
      {!orders.isLoading && capability.data?.enabled && orders.data?.rows.length === 0 && <TableRow><TableCell colSpan={6}>暂无已授权医院采购订单，请先在SPD转单并上传。</TableCell></TableRow>}
    </TableBody></Table></div>
    <div className="flex items-center justify-between text-sm"><span>共 {orders.data?.total || 0} 条 · 第 {page} 页</span><div className="flex gap-2"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>上一页</Button><Button variant="outline" disabled={page * 20 >= (orders.data?.total || 0)} onClick={() => setPage(page + 1)}>下一页</Button></div></div>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) { optionsRequest.current++; setSelected(null); } }}><DialogContent className="max-h-[90vh] sm:max-w-6xl overflow-y-auto"><DialogHeader><DialogTitle>医院订单 {selected?.orderNo}</DialogTitle><DialogDescription>仅回传供货信息，实际收货及入库由SPD院方操作。</DialogDescription></DialogHeader>
      {optionsError && <p role="alert" className="text-destructive">{optionsError}</p>}
      {options && <form className="space-y-3" onSubmit={e => { e.preventDefault(); submit.mutate(); }}><div className="flex flex-wrap gap-3"><label className="text-sm">供应商供货单号<Input required maxLength={100} aria-label="供应商供货单号" value={supplyNo} onChange={e => setSupplyNo(e.target.value)} /></label><label className="text-sm">医院收货库房<select required aria-label="医院收货库房" className="block rounded border bg-background p-2" value={warehouse} onChange={e => setWarehouse(e.target.value)}><option value="">请选择</option>{options.warehouses.map(w => <option key={w.code} value={w.code}>{w.name} / {w.code}</option>)}</select></label><label className="text-sm">供货备注<Input maxLength={500} value={remark} onChange={e => setRemark(e.target.value)} /></label></div>
        <div className="overflow-x-auto"><Table><TableHeader><TableRow>{['商品 / 单位', '剩余可收', '本次数量', '生产批号', '生产日期', '有效期至', 'UDI（可选）', '操作'].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{lines.map((line, index) => <TableRow key={line.supplyLineId}><TableCell>{line.productCode} / {line.unit}</TableCell><TableCell>{options.items.find(i => i.lineId === line.orderLineId)?.remainingQuantity}</TableCell><TableCell><Input aria-label={`供货数量 ${index + 1}`} inputMode="numeric" value={line.quantity} onChange={e => update(index, 'quantity', e.target.value)} /></TableCell><TableCell><Input aria-label={`生产批号 ${index + 1}`} maxLength={100} value={line.productionBatchNo} onChange={e => update(index, 'productionBatchNo', e.target.value)} /></TableCell><TableCell><Input aria-label={`生产日期 ${index + 1}`} type="date" value={line.productionDate} onChange={e => update(index, 'productionDate', e.target.value)} /></TableCell><TableCell><Input aria-label={`有效期 ${index + 1}`} type="date" value={line.expireDate} onChange={e => update(index, 'expireDate', e.target.value)} /></TableCell><TableCell><Input aria-label={`UDI ${index + 1}`} maxLength={120} value={line.udiCode} onChange={e => update(index, 'udiCode', e.target.value)} /></TableCell><TableCell><Button type="button" size="sm" variant="outline" disabled={lines.length >= 1000} onClick={() => setLines([...lines, { ...line, supplyLineId: crypto.randomUUID(), quantity: '0', productionBatchNo: '', udiCode: '' }])}>增加批次</Button></TableCell></TableRow>)}</TableBody></Table></div>
        <Button disabled={submit.isPending}>提交供货回传</Button><Button type="button" variant="outline" disabled={submit.isPending} onClick={reloadCapacity}>重新读取可收数量</Button>
      </form>}
      <h3 className="border-t pt-3 font-medium">供货回传记录</h3>{history.error && <p role="alert">{(history.error as Error).message}</p>}
      <div className="overflow-x-auto"><Table><TableHeader><TableRow>{['供货单号', '回传状态', 'SPD收货单', '院方收货状态', '验收数量', '说明', '操作'].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{history.data?.rows.map(row => <TableRow key={row.messageId}><TableCell>{row.supplyNo}</TableCell><TableCell>{stateText[row.state] || row.state}</TableCell><TableCell>{row.result?.receivingNo || '—'}</TableCell><TableCell>{receiptText[row.result?.receivingStatus || ''] || '等待回传'}</TableCell><TableCell>{row.result?.receivingStatus === 'approved' ? (row.result.quantities?.map(q => `${q.unit}：实收 ${q.quantity} / 合格 ${q.qualifiedQuantity} / 不合格 ${q.unqualifiedQuantity}`).join('；') || '请刷新验收数量') : '待院方确认'}</TableCell><TableCell>{row.message || '等待任务处理'}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => { setSupplyDetail(row.messageId); setItemPage(1); }}>供货明细</Button>{(row.state === 'processed' || (row.state === 'failed' && permissions.includes('integration:supply'))) && <Button size="sm" variant="outline" disabled={status.isPending} onClick={() => status.mutate(row)}>{row.state === 'processed' ? '刷新SPD状态' : '重试回传'}</Button>}</TableCell></TableRow>)}{history.data?.total === 0 && <TableRow><TableCell colSpan={7}>暂无供货记录。</TableCell></TableRow>}</TableBody></Table></div>
      <div className="flex justify-end gap-2"><Button variant="outline" disabled={historyPage === 1} onClick={() => setHistoryPage(historyPage - 1)}>前一页记录</Button><Button variant="outline" disabled={historyPage * 20 >= (history.data?.total || 0)} onClick={() => setHistoryPage(historyPage + 1)}>后一页记录</Button></div>
      {supplyDetail && <section className="space-y-2 border-t pt-3"><h3>原供货申报明细</h3>{detailItems.error && <p role="alert">{(detailItems.error as Error).message}</p>}<div className="overflow-x-auto"><Table><TableHeader><TableRow>{['采购明细', '商品', '数量', '单位', '批号', '生产日期', '有效期', 'UDI'].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{detailItems.data?.rows.map(line => <TableRow key={line.supplyLineId}><TableCell>{line.orderLineId}</TableCell><TableCell>{line.productCode}</TableCell><TableCell>{line.quantity}</TableCell><TableCell>{line.unit}</TableCell><TableCell>{line.productionBatchNo}</TableCell><TableCell>{line.productionDate}</TableCell><TableCell>{line.expireDate}</TableCell><TableCell>{line.udiCode || '—'}</TableCell></TableRow>)}</TableBody></Table></div><div className="flex justify-end gap-2"><span>共 {detailItems.data?.total || 0} 条</span><Button variant="outline" disabled={itemPage === 1} onClick={() => setItemPage(itemPage - 1)}>前一页申报</Button><Button variant="outline" disabled={itemPage * 20 >= (detailItems.data?.total || 0)} onClick={() => setItemPage(itemPage + 1)}>后一页申报</Button></div></section>}
    </DialogContent></Dialog>
  </section>;
}
