import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { useFeedback } from './AppFeedback';
import { saveSupplyDraft, submitSupply, supplyOptions, type SupplyBody, type SupplyDraft, type SupplyLine } from '../services/hospitalSupply';
import type { ImportedOrder } from '../lib/importedPurchasePlans';

function batchId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
}

export default function PurchaseSupplyDraft({ draft, order, onBack, onSubmitted, onSaved }: {
  draft: SupplyDraft;
  order?: ImportedOrder;
  onBack: () => void;
  onSubmitted: () => void;
  onSaved: () => void;
}) {
  const { notify, confirm } = useFeedback();
  const [body, setBody] = useState<SupplyBody>(draft.body);
  const options = useQuery({
    queryKey: ['purchase-supply-options', draft.instanceId, draft.orderNo],
    queryFn: () => supplyOptions(draft.instanceId, draft.orderNo),
    staleTime: 0,
  });
  const missing = options.data?.items.filter(item => !body.items.some(line => line.orderLineId === item.lineId)).map(item => ({
    supplyLineId: 'base-' + item.lineId, orderLineId: item.lineId, productCode: item.productCode, unit: item.unit,
    quantity: '', productionBatchNo: '', productionDate: '', expireDate: '', udiCode: '',
  })) ?? [];
  const lines = [...body.items, ...missing];
  const save = useMutation({
    mutationFn: () => saveSupplyDraft(draft, { ...body, items: lines }),
    onSuccess: () => { onSaved(); notify.success('供货草稿已保存'); },
    onError: error => notify.error(error.message),
  });
  const submit = useMutation({
    mutationFn: async () => {
      const chosen = lines.filter(line => line.quantity !== '' && line.quantity !== '0');
      if (!body.supplyNo.trim() || !body.warehouseCode || !chosen.length)
        throw new Error('请填写供货单号、收货库房及供货数量');
      if (!options.data?.warehouses.some(w => w.code === body.warehouseCode)) throw new Error('请选择当前可用的收货库房');
      const totals = new Map<string, bigint>();
      for (const line of chosen) {
        const source = options.data?.items.find(item => item.lineId === line.orderLineId);
        if (!source || source.productCode !== line.productCode || source.unit !== line.unit)
          throw new Error('来源明细已变更，请移除无效批次后重试');
        if (!/^[1-9][0-9]{0,13}$/.test(line.quantity) || !line.productionBatchNo.trim() || !line.productionDate || !line.expireDate)
          throw new Error('供货数量必须为正整数，并填写批号、生产日期和有效期');
        if (line.productionDate > line.expireDate) throw new Error('有效期不得早于生产日期');
        const quantity = (totals.get(line.orderLineId) ?? 0n) + BigInt(line.quantity);
        // The SPD endpoint accepts whole basic units even if remaining quantity is decimal.
        if (quantity > BigInt(source.remainingQuantity.split('.')[0] || '0')) throw new Error('同一明细的供货数量合计不得超过剩余可供量');
        totals.set(line.orderLineId, quantity);
      }
      if (!await confirm({ title: '提交供货单', description: `确认将供货单 ${body.supplyNo.trim()} 回传到 SPD-PR 生成待收货单？` })) return false;
      await submitSupply(draft.instanceId, draft.orderNo, draft.draftId, {
        ...body, supplyNo: body.supplyNo.trim(), remark: body.remark.trim(),
        items: chosen.map(line => ({ ...line, productionBatchNo: line.productionBatchNo.trim(), udiCode: line.udiCode.trim() })),
      });
      return true;
    },
    onSuccess: sent => { if (sent) { notify.success('供货单已提交，等待 SPD-PR 接收'); onSubmitted(); } },
    onError: error => notify.error(error.message),
  });
  const busy = save.isPending || submit.isPending;
  const update = (id: string, field: keyof SupplyLine, value: string) =>
    setBody(current => ({ ...current, items: lines.map(line => line.supplyLineId === id ? { ...line, [field]: value } : line) }));
  const addBatch = (line: SupplyLine, index: number) => setBody(current => ({ ...current, items: [...lines.slice(0, index + 1), {
    ...line, supplyLineId: batchId(), quantity: '', productionBatchNo: '', productionDate: '', expireDate: '', udiCode: '',
  }, ...lines.slice(index + 1)] }));

  return <section className="space-y-4 rounded-lg border bg-background p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><h2 className="text-lg font-semibold">采购订单（供货单）</h2><Badge variant="secondary">草稿</Badge></div>
      <Button variant="outline" disabled={busy} onClick={onBack}><ArrowLeft /> 返回采购计划</Button>
    </div>
    <dl className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm md:grid-cols-4">
      <div><dt className="text-muted-foreground">来源订单</dt><dd className="font-medium">{draft.orderNo}</dd></div>
      <div><dt className="text-muted-foreground">来源医院</dt><dd>{draft.hospital}</dd></div>
      <div><dt className="text-muted-foreground">供应商</dt><dd>{order?.header.supplierName || draft.supplierCode}</dd></div>
      <div><dt className="text-muted-foreground">收货地址</dt><dd>{order?.header.receivingAddress || '未提供'}</dd></div>
    </dl>
    {options.isLoading && <p role="status" className="text-sm text-muted-foreground">正在读取医院可供货信息…</p>}
    {options.error && <p role="alert" className="text-sm text-destructive">{options.error.message}</p>}
    <fieldset disabled={busy} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="space-y-1 text-sm"><span>供货单号</span><Input maxLength={100} value={body.supplyNo} onChange={e => setBody({ ...body, supplyNo: e.target.value })} /></label>
        <label className="space-y-1 text-sm"><span>收货库房</span><select className="h-9 w-full rounded-md border bg-background px-3" value={body.warehouseCode} onChange={e => setBody({ ...body, warehouseCode: e.target.value })}><option value="">请选择收货库房</option>{options.data?.warehouses.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}</select></label>
        <label className="space-y-1 text-sm"><span>供货备注</span><Input maxLength={500} value={body.remark} onChange={e => setBody({ ...body, remark: e.target.value })} /></label>
      </div>
      <div className="rounded-md border">
        <Table><TableHeader><TableRow>{['商品', '单位', '采购数量', '剩余可供', '供货数量', '批号', '生产日期', '有效期', 'UDI', '操作'].map(label => <TableHead key={label} className="whitespace-nowrap">{label}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{lines.map((line, index) => {
            const source = order?.lines.find(item => item.sourceLineId === line.orderLineId);
            const available = options.data?.items.find(item => item.lineId === line.orderLineId);
            return <TableRow key={line.supplyLineId}>
              <TableCell className="min-w-32"><div>{source?.productName || line.productCode}</div><div className="text-xs text-muted-foreground">{[line.productCode, source?.spec, source?.model].filter(Boolean).join(' · ')}</div></TableCell>
              <TableCell>{line.unit}</TableCell><TableCell>{source?.quantityExact ?? source?.planQty ?? '—'}</TableCell><TableCell>{available?.remainingQuantity ?? '—'}</TableCell>
              <TableCell><Input className="min-w-20" aria-label={`供货数量 ${index + 1}`} inputMode="numeric" value={line.quantity} onChange={e => update(line.supplyLineId, 'quantity', e.target.value)} /></TableCell>
              <TableCell><Input className="min-w-24" aria-label={`批号 ${index + 1}`} maxLength={100} value={line.productionBatchNo} onChange={e => update(line.supplyLineId, 'productionBatchNo', e.target.value)} /></TableCell>
              <TableCell><Input aria-label={`生产日期 ${index + 1}`} type="date" value={line.productionDate} onChange={e => update(line.supplyLineId, 'productionDate', e.target.value)} /></TableCell>
              <TableCell><Input aria-label={`有效期 ${index + 1}`} type="date" value={line.expireDate} onChange={e => update(line.supplyLineId, 'expireDate', e.target.value)} /></TableCell>
              <TableCell><Input className="min-w-28" aria-label={`UDI ${index + 1}`} maxLength={120} value={line.udiCode} onChange={e => update(line.supplyLineId, 'udiCode', e.target.value)} /></TableCell>
              <TableCell><div className="flex gap-1"><Button size="sm" variant="outline" disabled={lines.length >= 1000 || !available} onClick={() => addBatch(line, index)}><Plus />批次</Button><Button size="icon" variant="ghost" disabled={!!available && lines.filter(item => item.orderLineId === line.orderLineId).length <= 1} aria-label={`移除批次 ${index + 1}`} onClick={() => setBody({ ...body, items: lines.filter(item => item.supplyLineId !== line.supplyLineId) })}><Trash2 /></Button></div></TableCell>
            </TableRow>;
          })}
          {!lines.length && <TableRow><TableCell colSpan={10} className="py-6 text-center text-muted-foreground">暂无可填写的供货明细</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </fieldset>
    <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
      <Button variant="outline" className="mr-auto" disabled={busy} onClick={() => { void options.refetch(); }}>刷新可供数量</Button>
      <Button variant="outline" disabled={busy} onClick={() => save.mutate()}>保存草稿</Button>
      <Button disabled={busy || options.isFetching || !options.data || !!options.error} onClick={() => submit.mutate()}>提交供货单</Button>
    </div>
  </section>;
}
