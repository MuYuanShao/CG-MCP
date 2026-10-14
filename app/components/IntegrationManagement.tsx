import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from './ui/table';
import { useFeedback } from './AppFeedback';
import SpdConnectionAddressFields from './SpdConnectionAddressFields';
import Phase2Management from './Phase2Management';
import { listInstances, saveInstance, listSyncLogs, retrySync, listIntegrationRecords, procurementReport, syncStates, orderStates, type InstancePayload, type SpdInstance, type Order, type Master, type PricePoint } from '../services/integration';

const initial: InstancePayload = { name: '', organization: '', endpoint: '', tokenEnv: 'SPD_PR_MAIN_TOKEN', enabled: true };
const kinds: Record<string, string> = { product: '商品及证照', licenses: '证照', supplier: '供应商', manufacturer: '厂家', order: '采购订单', receiving: '收货与验收', inbound: '采购入库', return: '采购退货', inventory: '批次库存' };
const formatNumber = (n: number) => n.toLocaleString('zh-CN', { maximumFractionDigits: 6 });
const seriesKey = (p: PricePoint) => JSON.stringify([p.productCode, p.unit, p.currency, p.taxIncluded]);

export default function IntegrationManagement({ permissions, settingsOnly = false }: { permissions: string[]; settingsOnly?: boolean }) {
  const client = useQueryClient();
  const { notify } = useFeedback();
  const canManage = permissions.includes('integration:manage');
  const [selectedInstance, setSelectedInstance] = useState('');
  const [tab, setTab] = useState('logs');
  const [dialog, setDialog] = useState(false);
  const [editId, setEditId] = useState<string>();
  const [form, setForm] = useState(initial);
  const [stateFilter, setStateFilter] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [detail, setDetail] = useState<Order | null>(null);
  const [filters, setFilters] = useState({ from: '', to: '', supplier: '', product: '', manufacturer: '' });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [selectedSeries, setSelectedSeries] = useState('');
  const instances = useQuery({ queryKey: ['spd-instances'], queryFn: listInstances });
  const id = selectedInstance || instances.data?.[0]?.id || '';
  const logs = useQuery({ queryKey: ['spd-logs', id], queryFn: () => listSyncLogs(id), enabled: !!id && tab === 'logs' && !settingsOnly });
  const orders = useQuery({ queryKey: ['spd-orders', id], queryFn: () => listIntegrationRecords<Order>(id, 'order'), enabled: !!id && tab === 'orders' && !settingsOnly });
  const suppliers = useQuery({ queryKey: ['spd-suppliers', id], queryFn: () => listIntegrationRecords<Master>(id, 'supplier'), enabled: !!id && tab === 'masters' && !settingsOnly });
  const manufacturers = useQuery({ queryKey: ['spd-manufacturers', id], queryFn: () => listIntegrationRecords<Master>(id, 'manufacturer'), enabled: !!id && tab === 'masters' && !settingsOnly });
  const report = useQuery({ queryKey: ['spd-report', id, appliedFilters], queryFn: () => procurementReport(id, appliedFilters), enabled: !!id && tab === 'report' && !settingsOnly });
  const save = useMutation({ mutationFn: () => saveInstance(form, editId), onSuccess: (i) => { client.invalidateQueries({ queryKey: ['spd-instances'] }); setSelectedInstance(i.id); setDialog(false); notify.success('对接配置已保存'); }, onError: (e: Error) => notify.error(e.message) });
  const retry = useMutation({ mutationFn: retrySync, onSuccess: (log) => { client.invalidateQueries({ queryKey: ['spd-logs', id] }); client.invalidateQueries({ queryKey: ['spd-orders', id] }); client.invalidateQueries({ queryKey: ['spd-report', id] }); client.invalidateQueries({ queryKey: ['spd-phase2-report', id] }); client.invalidateQueries({ queryKey: ['spd-phase2-documents', id] }); log.state === 'failed' ? notify.error(log.message) : notify.success(syncStates[log.state]); }, onError: (e: Error) => notify.error(e.message) });
  const openConfig = (instance?: SpdInstance) => { setEditId(instance?.id); setForm(instance ? { ...instance } : { ...initial }); setDialog(true); };
  const error = instances.error || (!settingsOnly && (tab === 'logs' ? logs.error : tab === 'orders' ? orders.error : tab === 'masters' ? suppliers.error || manufacturers.error : report.error));
  const loading = instances.isLoading || (!settingsOnly && (tab === 'logs' ? logs.isFetching : tab === 'orders' ? orders.isFetching : tab === 'masters' ? suppliers.isFetching || manufacturers.isFetching : report.isFetching));
  const series = [...new Map(report.data?.prices.map(p => [seriesKey(p), p])).entries()];
  const currentSeries = series.some(([key]) => key === selectedSeries) ? selectedSeries : series[0]?.[0];
  const chartData = report.data?.prices.filter(p => seriesKey(p) === currentSeries).sort((a, b) => a.date.localeCompare(b.date)) || [];
  const masterTable = (label: string, records: typeof suppliers.data) => <section className="space-y-3"><h3 className="font-semibold">{label}</h3><Table><TableHeader><TableRow>{['来源编码', '名称', '统一社会信用代码', '联系人', '电话', '状态', '来源更新时间'].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{records?.map(({ payload: m }) => <TableRow key={m.sourceCode}><TableCell>{m.sourceCode}</TableCell><TableCell>{m.name}</TableCell><TableCell>{m.creditCode || '—'}</TableCell><TableCell>{m.contactName || '—'}</TableCell><TableCell>{m.contactPhone || '—'}</TableCell><TableCell>{m.status === 'active' ? '启用' : '停用'}</TableCell><TableCell>{m.sourceUpdatedAt}</TableCell></TableRow>)}</TableBody></Table>{records?.length === 0 && <p className="text-sm text-muted-foreground">暂无上传记录</p>}</section>;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-background p-4">
      <Select value={id} onValueChange={setSelectedInstance}><SelectTrigger className="w-72" aria-label="对接实例"><SelectValue placeholder="选择 SPD-PR 实例" /></SelectTrigger><SelectContent>{instances.data?.map(i => <SelectItem key={i.id} value={i.id}>{i.name} · {i.organization}{i.enabled ? '' : '（停用）'}</SelectItem>)}</SelectContent></Select>
      {canManage && <><Button onClick={() => openConfig()}>新增实例</Button><Button variant="outline" disabled={!id} onClick={() => openConfig(instances.data?.find(i => i.id === id))}>编辑配置</Button></>}
      <Button variant="outline" disabled={loading} onClick={() => { client.invalidateQueries({ predicate: q => String(q.queryKey[0]).startsWith('spd-') }); }}>刷新</Button>
    </div>
    {error && <p role="alert" className="rounded-lg border border-destructive p-3 text-destructive">{error.message}</p>}
    {loading && <p role="status" className="text-sm text-muted-foreground">正在加载…</p>}
    {!instances.isLoading && !error && !id && <div className="rounded-lg border bg-background p-8 text-center text-muted-foreground">暂无对接实例，请先配置 SPD-PR。</div>}
    {settingsOnly && <section className="rounded-lg border bg-background p-4"><h2 className="mb-3 font-semibold">SPD-PR连接设置</h2><p className="mb-3 text-sm text-muted-foreground">点击新增实例或编辑配置，直接填写SPD-PR的IP地址／域名和端口。保存后商品下发自动使用新地址。</p><Table><TableHeader><TableRow><TableHead>实例</TableHead><TableHead>机构</TableHead><TableHead>接收地址</TableHead><TableHead>状态</TableHead></TableRow></TableHeader><TableBody>{instances.data?.map(i => <TableRow key={i.id}><TableCell>{i.name}</TableCell><TableCell>{i.organization}</TableCell><TableCell className="break-all">{i.endpoint}</TableCell><TableCell>{i.enabled ? '启用' : '停用'}</TableCell></TableRow>)}</TableBody></Table></section>}
    {id && !settingsOnly && <Tabs value={tab} onValueChange={setTab}><TabsList className="flex h-auto flex-wrap justify-start"><TabsTrigger value="logs">同步记录</TabsTrigger><TabsTrigger value="masters">供应商与厂家</TabsTrigger><TabsTrigger value="orders">上传采购订单</TabsTrigger><TabsTrigger value="report">采购订购报表</TabsTrigger><TabsTrigger value="phase2">履约与库存</TabsTrigger></TabsList>
      <TabsContent value="phase2"><Phase2Management instanceId={id} /></TabsContent>
      <TabsContent value="logs" className="space-y-4 rounded-lg border bg-background p-4"><div className="flex flex-wrap gap-3"><Select value={stateFilter} onValueChange={setStateFilter}><SelectTrigger className="w-48" aria-label="同步状态"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">全部状态</SelectItem>{Object.entries(syncStates).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select><Select value={kindFilter} onValueChange={setKindFilter}><SelectTrigger className="w-48" aria-label="同步对象"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">全部对象</SelectItem>{Object.entries(kinds).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div><p className="text-xs text-muted-foreground">显示最近 500 条记录。失败订单保留在此处，补齐关联后可重试；“接口已接收”需要等待 SPD-PR 处理回执。</p><Table><TableHeader><TableRow>{['时间', '方向', '对象', '业务编号', '批次', '状态', '结果', '操作'].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{logs.data?.filter(l => (stateFilter === 'all' || l.state === stateFilter) && (kindFilter === 'all' || l.kind === kindFilter)).map(l => <TableRow key={l.id}><TableCell className="whitespace-nowrap">{l.createdTime}</TableCell><TableCell>{l.direction === 'upload' ? '上传' : '下发'}</TableCell><TableCell>{kinds[l.kind]}</TableCell><TableCell>{l.sourceCode}</TableCell><TableCell title={l.batchId}>{l.batchId.slice(0, 8)}</TableCell><TableCell><Badge variant={l.state === 'failed' ? 'destructive' : l.state === 'processed' ? 'default' : 'secondary'}>{syncStates[l.state]}</Badge></TableCell><TableCell className="min-w-56 break-words">{l.message}</TableCell><TableCell>{canManage && <Button size="sm" variant="outline" disabled={l.state !== 'failed' || retry.isPending} onClick={() => retry.mutate(l.id)}>重试</Button>}</TableCell></TableRow>)}</TableBody></Table>{logs.data?.length === 0 && <p className="text-muted-foreground">暂无同步记录</p>}</TabsContent>
      <TabsContent value="masters" className="space-y-6 rounded-lg border bg-background p-4"><p className="text-sm text-muted-foreground">以下资料由 SPD-PR 维护，按实例隔离，仅供查询及业务关联。</p>{masterTable('供应商', suppliers.data)}{masterTable('厂家', manufacturers.data)}</TabsContent>
      <TabsContent value="orders" className="rounded-lg border bg-background p-4"><Table><TableHeader><TableRow>{['订单编号', '供应商编码', '采购日期', '状态', '总金额', '币种', '税口径', '操作'].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{orders.data?.map(({ payload: o }) => <TableRow key={o.orderNo}><TableCell>{o.orderNo}</TableCell><TableCell>{o.supplierCode}</TableCell><TableCell>{o.orderDate}</TableCell><TableCell>{orderStates[o.status]}</TableCell><TableCell className="text-right">{formatNumber(o.totalAmount)}</TableCell><TableCell>{o.currency}</TableCell><TableCell>{o.taxIncluded ? '含税' : '未税'}</TableCell><TableCell><Button size="sm" variant="outline" onClick={() => setDetail(o)}>明细</Button></TableCell></TableRow>)}</TableBody></Table>{orders.data?.length === 0 && <p className="text-muted-foreground">暂无已成功上传的订单。关联失败的订单请查看同步记录。</p>}</TabsContent>
      <TabsContent value="report" className="space-y-5 rounded-lg border bg-background p-4"><form className="grid gap-3 md:grid-cols-3 xl:grid-cols-4" onSubmit={e => { e.preventDefault(); setAppliedFilters({ ...filters }); }}>
        {Object.entries({ from: '开始日期', to: '结束日期', supplier: '供应商编码', product: '商品编码', manufacturer: '厂家名称' }).map(([key, label]) => <label key={key} className="space-y-1 text-sm"><span>{label}</span><Input type={['from', 'to'].includes(key) ? 'date' : 'text'} value={filters[key as keyof typeof filters]} onChange={e => setFilters({ ...filters, [key]: e.target.value })} /></label>)}<div className="flex items-end"><Button type="submit">查询</Button></div></form>
        <p className="text-sm text-muted-foreground">仅统计已提交且未取消订单；金额使用上传明细金额。数量按商品及单位分组，价格按同一商品、单位、币种及税口径展示。</p><p className="text-lg font-semibold">采购订单数量：{report.data?.orderCount ?? '—'}</p>
        <Table><TableHeader><TableRow>{['商品编码', '商品', '厂家', '单位', '币种', '税口径', '订单数', '采购数量', '采购金额'].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{report.data?.groups.map((g, index) => <TableRow key={index}><TableCell>{g.productCode}</TableCell><TableCell>{g.productName}</TableCell><TableCell>{g.manufacturer}</TableCell><TableCell>{g.unit}</TableCell><TableCell>{g.currency}</TableCell><TableCell>{g.taxIncluded ? '含税' : '未税'}</TableCell><TableCell className="text-right">{g.orderCount}</TableCell><TableCell className="text-right">{formatNumber(g.quantity)}</TableCell><TableCell className="text-right">{formatNumber(g.amount)}</TableCell></TableRow>)}</TableBody></Table>
        {report.data?.groups.length === 0 && <p className="text-muted-foreground">当前条件下暂无可统计订单。</p>}
        {series.length > 0 && <section className="space-y-4"><h3 className="font-semibold">采购价格趋势（日加权平均单价）</h3><Select value={currentSeries} onValueChange={setSelectedSeries}><SelectTrigger aria-label="价格趋势商品" className="max-w-xl"><SelectValue /></SelectTrigger><SelectContent>{series.map(([key, p]) => <SelectItem key={key} value={key}>{p.productName} · {p.unit} · {p.currency} · {p.taxIncluded ? '含税' : '未税'}</SelectItem>)}</SelectContent></Select><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Line type="monotone" dataKey="unitPrice" name="单价" stroke="#2563eb" strokeWidth={2} /></LineChart></ResponsiveContainer></div></section>}
      </TabsContent>
    </Tabs>}
    <Dialog open={dialog} onOpenChange={next => { if (!save.isPending) setDialog(next); }}>
      <DialogContent><DialogHeader><DialogTitle>{editId ? '编辑对接配置' : '新增 SPD-PR 实例'}</DialogTitle><DialogDescription>填写SPD-PR的IP地址或域名及端口，自动生成接收地址。机构标识创建后不可修改；鉴权密钥仍由服务器环境变量提供。</DialogDescription></DialogHeader>
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); save.mutate(); }}>
          <fieldset disabled={save.isPending} className="space-y-4">
            {Object.entries({ name: '实例名称', organization: '机构标识', tokenEnv: '鉴权环境变量名' }).map(([key, label]) => <label key={key} className="block space-y-1 text-sm"><span>{label}</span><Input required pattern={key === 'tokenEnv' ? 'SPD_PR_[A-Z0-9_]+' : undefined} disabled={key === 'organization' && !!editId} value={form[key as keyof Omit<InstancePayload, 'enabled'>]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}
            <SpdConnectionAddressFields value={form.endpoint} onChange={endpoint => setForm(current => ({ ...current, endpoint }))} />
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} />启用实例</label>
          </fieldset>
          <Button disabled={save.isPending} type="submit">{save.isPending ? '保存中…' : '保存'}</Button>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={!!detail} onOpenChange={open => { if (!open) setDetail(null); }}><DialogContent className="max-w-5xl"><DialogHeader><DialogTitle>采购订单 {detail?.orderNo}</DialogTitle><DialogDescription>来源 SPD-PR · 更新时间 {detail?.sourceUpdatedAt}</DialogDescription></DialogHeader><Table><TableHeader><TableRow>{['明细编号', '商品编码', '数量', '单位', '单价', '金额'].map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{detail?.items.map(i => <TableRow key={i.lineId}><TableCell>{i.lineId}</TableCell><TableCell>{i.productCode}</TableCell><TableCell className="text-right">{formatNumber(i.quantity)}</TableCell><TableCell>{i.unit}</TableCell><TableCell className="text-right">{formatNumber(i.unitPrice)}</TableCell><TableCell className="text-right">{formatNumber(i.amount)}</TableCell></TableRow>)}</TableBody></Table></DialogContent></Dialog>
  </div>;
}
