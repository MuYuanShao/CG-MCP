import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { orderStates } from '../services/integration';
import { formatPlanDecimal, type ImportedOrder } from '../lib/importedPurchasePlans';

export default function ImportedPurchaseOrders({ orders, canSupply, creating, onCreateSupply }: {
  orders: ImportedOrder[];
  canSupply: boolean;
  creating: boolean;
  onCreateSupply: (order: ImportedOrder) => Promise<boolean>;
}) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string>();
  const [search, setSearch] = useState('');
  const [detailPage, setDetailPage] = useState(1);
  const current = orders.find(order => order.key === selected);
  const header = current?.header;
  const detail = current?.lines.filter(line =>
    [line.productCode, line.productName, line.registrationNo, line.manufacturer, line.zcLocalCode]
      .some(value => (value ?? '').toLowerCase().includes(search.trim().toLowerCase()))) ?? [];
  const pageCount = Math.max(1, Math.ceil(orders.length / 20));
  const shownPage = Math.min(page, pageCount);
  const detailCount = Math.max(1, Math.ceil(detail.length / 10));
  const shownDetailPage = Math.min(detailPage, detailCount);
  const canCreate = canSupply && !!header?.instanceId && ['approved', 'sent'].includes(header.sourceStatus ?? '');

  return <section className="rounded-lg border bg-background">
    <div className="border-b px-5 py-4">
      <h2 className="font-semibold">SPD-PR 采购计划</h2>
      <p className="mt-1 text-sm text-muted-foreground">每张来源订单显示一行，点击查看明细并生成供货草稿。</p>
    </div>
    <Table>
      <TableHeader><TableRow>{['订单号', '来源医院', '收货地址', '供应商', '商品明细', '采购总量', '总金额', '状态', '操作'].map(label => <TableHead key={label} className="whitespace-nowrap">{label}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{orders.slice((shownPage - 1) * 20, shownPage * 20).map(order => {
        const row = order.header;
        return <TableRow key={order.key}>
          <TableCell className="font-medium">{row.orderNo}</TableCell>
          <TableCell>{row.hospital || '—'}</TableCell>
          <TableCell className="max-w-56 whitespace-normal">{row.receivingAddress || '未提供'}</TableCell>
          <TableCell>{row.supplierName || row.supplierCode || '—'}{row.supplierName && row.supplierCode && <div className="text-xs text-muted-foreground">{row.supplierCode}</div>}</TableCell>
          <TableCell>{order.lines.length} 条</TableCell>
          <TableCell>{order.quantitySummary}</TableCell>
          <TableCell className="text-right tabular-nums">{row.currency} {order.total}<div className="text-xs text-muted-foreground">{row.taxIncluded == null ? '' : row.taxIncluded ? '含税' : '未税'}</div></TableCell>
          <TableCell><Badge variant="secondary">{orderStates[row.sourceStatus ?? ''] ?? row.sourceStatus}</Badge></TableCell>
          <TableCell><Button size="sm" variant="outline" onClick={() => { setSelected(order.key); setSearch(''); setDetailPage(1); }}>查看明细</Button></TableCell>
        </TableRow>;
      })}
      {!orders.length && <TableRow><TableCell colSpan={9} className="py-6 text-center text-muted-foreground">没有匹配的 SPD-PR 订单</TableCell></TableRow>}
      </TableBody>
    </Table>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3 text-sm">
      <span className="text-muted-foreground">共 {orders.length} 张订单 · 第 {shownPage} / {pageCount} 页</span>
      <div className="flex gap-2"><Button size="sm" variant="outline" disabled={shownPage <= 1} onClick={() => setPage(shownPage - 1)}>上一页</Button><Button size="sm" variant="outline" disabled={shownPage >= pageCount} onClick={() => setPage(shownPage + 1)}>下一页</Button></div>
    </div>
    <Dialog open={!!current} onOpenChange={open => { if (!open && !creating) setSelected(undefined); }}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>采购计划明细 · {header?.orderNo}</DialogTitle>
          <DialogDescription>{header?.hospital || '来源医院未提供'} · {header?.supplierName || header?.supplierCode || '供应商未提供'}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap justify-between gap-2 rounded-md border bg-muted/40 p-3 text-sm">
          <span>收货地址：{header?.receivingAddress || '未提供'}</span>
          <span className="font-medium">{current?.lines.length} 条明细 · {current?.quantitySummary} · {header?.currency} {current?.total}</span>
        </div>
        <Input className="max-w-sm" aria-label="明细商品搜索" placeholder="商品编码、名称、注册证号、厂家或招采编码" value={search} onChange={event => { setSearch(event.target.value); setDetailPage(1); }} />
        <div className="min-h-0 overflow-auto">
          <Table>
            <TableHeader><TableRow>{['商品编码', '商品名称', '规格型号', '注册证号', '厂家', '招采子本地编码', '单位', '采购数量', '单价', '金额'].map(label => <TableHead key={label} className="whitespace-nowrap">{label}</TableHead>)}</TableRow></TableHeader>
            <TableBody>{detail.slice((shownDetailPage - 1) * 10, shownDetailPage * 10).map(line => <TableRow key={line.id}>
              <TableCell className="font-mono">{line.productCode}</TableCell><TableCell>{line.productName}</TableCell>
              <TableCell>{[line.spec, line.model].filter(Boolean).join(' / ') || '—'}</TableCell>
              <TableCell className="min-w-28 whitespace-normal break-all">{line.registrationNo || '—'}</TableCell>
              <TableCell className="min-w-28 whitespace-normal">{line.manufacturer || '—'}</TableCell>
              <TableCell className="min-w-32 whitespace-normal break-all font-mono">{line.zcLocalCode || '—'}</TableCell>
              <TableCell>{line.unit}</TableCell>
              <TableCell className="text-right tabular-nums">{formatPlanDecimal(line.quantityExact ?? String(line.planQty))}</TableCell>
              <TableCell className="text-right tabular-nums">{formatPlanDecimal(line.unitPriceExact ?? String(line.unitPrice), 2)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatPlanDecimal(line.amountExact ?? String(line.amount ?? 0), 2)}</TableCell>
            </TableRow>)}
            {!detail.length && <TableRow><TableCell colSpan={10} className="py-5 text-center text-muted-foreground">没有匹配的明细</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">共 {detail.length} 条 · 第 {shownDetailPage} / {detailCount} 页</span>
          <div className="flex gap-2"><Button size="sm" variant="outline" disabled={shownDetailPage <= 1} onClick={() => setDetailPage(shownDetailPage - 1)}>上一页</Button><Button size="sm" variant="outline" disabled={shownDetailPage >= detailCount} onClick={() => setDetailPage(shownDetailPage + 1)}>下一页</Button></div>
        </div>
        <DialogFooter className="border-t pt-3">
          {!canCreate && <span className="mr-auto self-center text-xs text-muted-foreground">需有供货权限且来源订单已审批或发送。</span>}
          <Button variant="outline" disabled={creating} onClick={() => setSelected(undefined)}>取消</Button>
          <Button disabled={!canCreate || creating} onClick={async () => { if (current && await onCreateSupply(current)) setSelected(undefined); }}>{creating ? '生成中…' : '确认生成供货单'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>;
}
