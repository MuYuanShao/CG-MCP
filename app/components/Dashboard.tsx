import {
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  ChevronRight,
  XCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { procurementWorkflow, workflowRelation } from '../lib/workflow';

const orderTrendData = [
  { month: '1月', orders: 145, amount: 286000 },
  { month: '2月', orders: 167, amount: 312000 },
  { month: '3月', orders: 189, amount: 358000 },
  { month: '4月', orders: 156, amount: 298000 },
  { month: '5月', orders: 203, amount: 425000 },
  { month: '6月', orders: 221, amount: 478000 },
];

const categoryData = [
  { name: '高值耗材', value: 45, color: 'var(--chart-1)' },
  { name: '低值耗材', value: 30, color: 'var(--chart-2)' },
  { name: '医疗设备', value: 15, color: 'var(--chart-3)' },
  { name: '其他', value: 10, color: 'var(--chart-4)' },
];

const expiringLicenses = [
  { id: 1, type: '经营许可证', product: '一次性无菌注射器', expiry: '2026-05-15', days: 33, status: 'warning' },
  { id: 2, type: '注册证', product: '医用口罩', expiry: '2026-06-20', days: 69, status: 'normal' },
  { id: 3, type: '生产许可证', product: '输液器', expiry: '2026-04-28', days: 16, status: 'urgent' },
  { id: 4, type: '备案凭证', product: '消毒液', expiry: '2026-07-10', days: 89, status: 'normal' },
];

const inventoryAlerts = [
  { id: 1, product: '一次性手套', batch: 'B20240215', expiry: '2026-05-01', qty: 2400, status: 'warning' },
  { id: 2, product: '医用纱布', batch: 'B20240301', expiry: '2026-04-20', qty: 850, status: 'urgent' },
  { id: 3, product: '注射器(5ml)', batch: 'B20240118', expiry: '2026-06-15', qty: 5200, status: 'normal' },
  { id: 4, product: '输液器', batch: 'B20240205', expiry: '2026-04-25', qty: 1200, status: 'urgent' },
];

const recentOrders = [
  { id: 'PO202604120001', hospital: '市第一人民医院', items: 15, amount: 45600, status: 'confirmed', date: '2026-04-12' },
  { id: 'PO202604120002', hospital: '中心医院', items: 8, amount: 28300, status: 'pending', date: '2026-04-12' },
  { id: 'PO202604110015', hospital: '省立医院', items: 23, amount: 67800, status: 'shipped', date: '2026-04-11' },
  { id: 'PO202604110014', hospital: '儿童医院', items: 12, amount: 34200, status: 'delivered', date: '2026-04-11' },
  { id: 'PO202604100032', hospital: '妇幼保健院', items: 18, amount: 52100, status: 'confirmed', date: '2026-04-10' },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'urgent': return 'text-destructive';
    case 'warning': return 'text-[#f59e0b]';
    case 'normal': return 'text-[#10b981]';
    case 'pending': return 'text-muted-foreground';
    case 'confirmed': return 'text-[#3b82f6]';
    case 'shipped': return 'text-[#8b5cf6]';
    case 'delivered': return 'text-[#10b981]';
    default: return 'text-foreground';
  }
}

function getStatusBg(status: string) {
  switch (status) {
    case 'urgent': return 'bg-destructive/10';
    case 'warning': return 'bg-[#f59e0b]/10';
    case 'normal': return 'bg-[#10b981]/10';
    case 'pending': return 'bg-muted';
    case 'confirmed': return 'bg-[#3b82f6]/10';
    case 'shipped': return 'bg-[#8b5cf6]/10';
    case 'delivered': return 'bg-[#10b981]/10';
    default: return 'bg-muted';
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'pending': return '待确认';
    case 'confirmed': return '已确认';
    case 'shipped': return '已发货';
    case 'delivered': return '已送达';
    case 'warning': return '预警';
    case 'urgent': return '紧急';
    case 'normal': return '正常';
    case 'expired': return '已过期';
    default: return status;
  }
}

export default function Dashboard() {
  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="p-5 border border-border rounded-lg bg-background hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="size-10 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center">
              <ShoppingCart className="size-5 text-[#3b82f6]" />
            </div>
            <div className="flex items-center gap-1 text-xs text-[#10b981]">
              <TrendingUp className="size-3" />
              <span>12.5%</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-medium">328</div>
            <div className="text-sm text-muted-foreground">本月订单</div>
          </div>
        </div>
        <div className="p-5 border border-border rounded-lg bg-background hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="size-10 rounded-lg bg-[#10b981]/10 flex items-center justify-center">
              <CheckCircle2 className="size-5 text-[#10b981]" />
            </div>
            <div className="flex items-center gap-1 text-xs text-[#10b981]">
              <TrendingUp className="size-3" />
              <span>8.2%</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-medium">¥4.78M</div>
            <div className="text-sm text-muted-foreground">本月交易额</div>
          </div>
        </div>
        <div className="p-5 border border-border rounded-lg bg-background hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="size-10 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center">
              <AlertTriangle className="size-5 text-[#f59e0b]" />
            </div>
            <div className="text-xs text-muted-foreground">需关注</div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-medium">7</div>
            <div className="text-sm text-muted-foreground">效期预警</div>
          </div>
        </div>
        <div className="p-5 border border-border rounded-lg bg-background hover:shadow-sm transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className="size-10 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center">
              <Clock className="size-5 text-[#8b5cf6]" />
            </div>
            <div className="text-xs text-muted-foreground">待处理</div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-medium">12</div>
            <div className="text-sm text-muted-foreground">待确认订单</div>
          </div>
        </div>
      </div>
      <div className="mb-6 rounded-lg border border-border bg-background p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3>履约单据关系</h3>
            <p className="mt-1 text-sm text-muted-foreground">{workflowRelation}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
          {procurementWorkflow.map((item, index) => (
            <div key={item.code} className="rounded-lg border border-border p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {index + 1}
                </span>
                <span className="font-medium">{item.name}</span>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">{item.purpose}</p>
              <div className="flex flex-wrap gap-1">
                {item.statuses.slice(0, 4).map((status) => (
                  <span key={status} className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {status}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="border border-border rounded-lg bg-background p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3>订单趋势</h3>
              <p className="text-sm text-muted-foreground mt-1">近6个月订单量与金额走势</p>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-sm bg-[var(--chart-1)]"></div>
                <span className="text-muted-foreground">订单数</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-sm bg-[var(--chart-2)]"></div>
                <span className="text-muted-foreground">交易额(千元)</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={orderTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
              <YAxis stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="orders" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="amount" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="p-6 border border-border rounded-lg bg-background">
          <div className="mb-6">
            <h3>品类分布</h3>
            <p className="text-sm text-muted-foreground mt-1">本月采购品类占比</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                {categoryData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {categoryData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                  <span>{item.name}</span>
                </div>
                <span className="text-muted-foreground">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="border border-border rounded-lg bg-background overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h3>最近订单</h3>
              <p className="text-sm text-muted-foreground mt-1">最新的采购订单动态</p>
            </div>
            <button className="text-sm text-primary hover:underline flex items-center gap-1">
              查看全部
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {recentOrders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium mb-1">{order.id}</div>
                    <div className="text-sm text-muted-foreground">{order.hospital}</div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${getStatusBg(order.status)} ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{order.items} 项商品</span>
                  <span className="font-medium">¥{order.amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="border border-border rounded-lg bg-background overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h3>证照到期提醒</h3>
              <p className="text-sm text-muted-foreground mt-1">即将到期的证照清单</p>
            </div>
            <button className="text-sm text-primary hover:underline flex items-center gap-1">
              查看全部
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="divide-y divide-border">
            {expiringLicenses.map((license) => (
              <div key={license.id} className="p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium mb-1">{license.product}</div>
                    <div className="text-sm text-muted-foreground">{license.type}</div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${getStatusBg(license.status)} ${getStatusColor(license.status)}`}>
                    {license.days}天
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">到期日期: {license.expiry}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 border border-border rounded-lg bg-background overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3>库存效期预警</h3>
            <p className="text-sm text-muted-foreground mt-1">近效期商品批次明细</p>
          </div>
          <button className="text-sm text-primary hover:underline flex items-center gap-1">
            查看全部
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">商品名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">批号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">有效期</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">库存数量</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {inventoryAlerts.map((item) => (
                <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3"><div className="font-medium">{item.product}</div></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{item.batch}</td>
                  <td className="px-4 py-3 text-sm">{item.expiry}</td>
                  <td className="px-4 py-3 text-right font-medium">{item.qty.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <div className={`px-3 py-1 rounded-full text-xs inline-flex items-center gap-1.5 ${getStatusBg(item.status)} ${getStatusColor(item.status)}`}>
                        {item.status === 'urgent' && <XCircle className="size-3" />}
                        {item.status === 'warning' && <AlertTriangle className="size-3" />}
                        {item.status === 'normal' && <CheckCircle2 className="size-3" />}
                        {item.status === 'urgent' ? '紧急' : item.status === 'warning' ? '预警' : '正常'}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
