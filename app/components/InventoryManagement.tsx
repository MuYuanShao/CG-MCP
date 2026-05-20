import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Download,
  Eye,
  Package,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Edit,
  Trash2,
  Plus,
  X,
} from 'lucide-react';
import {
  listInventoryBatchDetails,
  listInventoryLedger,
  type InventoryLedgerItem,
} from '../services/inventory';

interface InventoryItem {
  id: number;
  productCode: string;
  productName: string;
  spec: string;
  warehouse: string;
  location: string;
  totalQty: number;
  availableQty: number;
  lockedQty: number;
  expiryStatus: 'normal' | 'warning' | 'urgent' | 'critical' | 'expired';
  status: 'normal' | 'low' | 'out';
}

interface ExpireAlert {
  id: number;
  productCode: string;
  productName: string;
  spec: string;
  batchNo: string;
  expiryDate: string;
  remainDays: number;
  alertLevel: 'warning' | 'urgent' | 'critical';
  qty: number;
  isHandled: boolean;
}

interface StockCheck {
  id: number;
  checkNo: string;
  warehouse: string;
  checkDate: string;
  status: 'draft' | 'checking' | 'completed' | 'approved';
  checker: string;
  diffCount: number;
}

const mockInventory: InventoryItem[] = [
  {
    id: 1,
    productCode: 'YLQX20240001',
    productName: '一次性无菌注射器',
    spec: '5ml',
    warehouse: '中心仓库',
    location: 'A01-01',
    totalQty: 2400,
    availableQty: 2400,
    lockedQty: 0,
    expiryStatus: 'warning',
    status: 'normal',
  },
  {
    id: 2,
    productCode: 'YLQX20240002',
    productName: '医用外科口罩',
    spec: '一次性',
    warehouse: '中心仓库',
    location: 'A01-02',
    totalQty: 850,
    availableQty: 650,
    lockedQty: 200,
    expiryStatus: 'urgent',
    status: 'low',
  },
  {
    id: 3,
    productCode: 'YLQX20240003',
    productName: '输液器',
    spec: '精密过滤',
    warehouse: '中心仓库',
    location: 'B02-01',
    totalQty: 5200,
    availableQty: 5000,
    lockedQty: 200,
    expiryStatus: 'normal',
    status: 'normal',
  },
];

const mockExpireAlerts: ExpireAlert[] = [
  {
    id: 1,
    productCode: 'YLQX20240001',
    productName: '一次性无菌注射器',
    spec: '5ml',
    batchNo: 'B20240215',
    expiryDate: '2026-05-01',
    remainDays: 38,
    alertLevel: 'warning',
    qty: 2400,
    isHandled: false,
  },
  {
    id: 2,
    productCode: 'YLQX20240002',
    productName: '医用外科口罩',
    spec: '一次性',
    batchNo: 'B20240301',
    expiryDate: '2026-04-20',
    remainDays: 27,
    alertLevel: 'critical',
    qty: 850,
    isHandled: false,
  },
  {
    id: 3,
    productCode: 'YLQX20240003',
    productName: '输液器',
    spec: '精密过滤',
    batchNo: 'B20240118',
    expiryDate: '2026-06-15',
    remainDays: 53,
    alertLevel: 'urgent',
    qty: 5200,
    isHandled: true,
  },
];

const mockStockChecks: StockCheck[] = [
  {
    id: 1,
    checkNo: 'PD20240401',
    warehouse: '中心仓库',
    checkDate: '2024-04-01',
    status: 'completed',
    checker: '张三',
    diffCount: 3,
  },
  {
    id: 2,
    checkNo: 'PD20240315',
    warehouse: '中心仓库',
    checkDate: '2024-03-15',
    status: 'approved',
    checker: '李四',
    diffCount: 0,
  },
  {
    id: 3,
    checkNo: 'PD20240301',
    warehouse: '分库',
    checkDate: '2024-03-01',
    status: 'checking',
    checker: '王五',
    diffCount: 2,
  },
];

export default function InventoryManagement() {
  const [activeTab, setActiveTab] = useState<'stock' | 'expire' | 'check'>('stock');
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showStockDetailDialog, setShowStockDetailDialog] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [detailPage, setDetailPage] = useState(1);
  const [detailSize, setDetailSize] = useState(10);

  const inventoryLedgerQuery = useQuery({
    queryKey: ['inventory-ledger'],
    queryFn: listInventoryLedger,
  });
  const stockRows: InventoryLedgerItem[] = inventoryLedgerQuery.data ?? [];
  const selectedStock = stockRows.find((item) => item.id === selectedRows[0]);
  const stockDetailQuery = useQuery({
    queryKey: ['inventory-batch-details', selectedProductId, detailPage, detailSize],
    queryFn: () => listInventoryBatchDetails(selectedProductId as number, detailPage, detailSize),
    enabled: selectedProductId !== null && showStockDetailDialog,
  });
  const stockDetailPage = stockDetailQuery.data;
  const stockDetailRows = stockDetailPage?.records ?? [];
  const stockDetailTotal = stockDetailPage?.total ?? 0;
  const stockDetailCurrent = stockDetailPage?.current ?? detailPage;
  const stockDetailSize = stockDetailPage?.size ?? detailSize;
  const stockDetailTotalPages = Math.max(1, Math.ceil(stockDetailTotal / stockDetailSize));

  const getExpiryStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'text-[#10b981] bg-[#10b981]/10';
      case 'warning':
        return 'text-[#f59e0b] bg-[#f59e0b]/10';
      case 'urgent':
        return 'text-[#f97316] bg-[#f97316]/10';
      case 'critical':
        return 'text-destructive bg-destructive/10';
      case 'expired':
        return 'text-muted-foreground bg-muted';
      default:
        return 'text-foreground bg-muted';
    }
  };

  const getExpiryStatusText = (status: string) => {
    switch (status) {
      case 'normal':
        return '正常';
      case 'warning':
        return '近效期';
      case 'urgent':
        return '临近效期';
      case 'critical':
        return '过期预警';
      case 'expired':
        return '已过期';
      default:
        return status;
    }
  };

  const getExpiryStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return <CheckCircle2 className="size-3" />;
      case 'warning':
      case 'urgent':
        return <Clock className="size-3" />;
      case 'critical':
        return <AlertTriangle className="size-3" />;
      case 'expired':
        return <XCircle className="size-3" />;
      default:
        return null;
    }
  };

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'warning':
        return 'text-[#f59e0b] bg-[#f59e0b]/10';
      case 'urgent':
        return 'text-[#f97316] bg-[#f97316]/10';
      case 'critical':
        return 'text-destructive bg-destructive/10';
      default:
        return 'text-foreground bg-muted';
    }
  };

  const getAlertLevelText = (level: string) => {
    switch (level) {
      case 'warning':
        return '近效期(90天)';
      case 'urgent':
        return '临近(30天)';
      case 'critical':
        return '紧急(7天)';
      default:
        return level;
    }
  };

  const getCheckStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'text-muted-foreground bg-muted';
      case 'checking':
        return 'text-[#3b82f6] bg-[#3b82f6]/10';
      case 'completed':
        return 'text-[#10b981] bg-[#10b981]/10';
      case 'approved':
        return 'text-[#8b5cf6] bg-[#8b5cf6]/10';
      default:
        return 'text-foreground bg-muted';
    }
  };

  const getCheckStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return '草稿';
      case 'checking':
        return '盘点中';
      case 'completed':
        return '已完成';
      case 'approved':
        return '已审核';
      default:
        return status;
    }
  };

  const handleSelectAll = () => {
    const currentData =
      activeTab === 'stock'
        ? stockRows
        : activeTab === 'expire'
        ? mockExpireAlerts
        : mockStockChecks;
    if (selectedRows.length === currentData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentData.map((item) => item.id));
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const openStockDetailDialog = () => {
    if (selectedRows.length !== 1 || !selectedStock) return;
    setSelectedProductId(selectedStock.productId);
    setDetailPage(1);
    setDetailSize(10);
    setShowStockDetailDialog(true);
  };

  const changeDetailPage = (nextPage: number) => {
    setDetailPage(Math.min(Math.max(1, nextPage), stockDetailTotalPages));
  };

  const changeDetailSize = (nextSize: number) => {
    setDetailSize(Math.min(50, Math.max(1, nextSize)));
    setDetailPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => {
            setActiveTab('stock');
            setSelectedRows([]);
          }}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'stock'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          库存台账
        </button>
        <button
          onClick={() => {
            setActiveTab('expire');
            setSelectedRows([]);
          }}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'expire'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          效期预警
        </button>
        <button
          onClick={() => {
            setActiveTab('check');
            setSelectedRows([]);
          }}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'check'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          库存盘点
        </button>
      </div>

      {/* Stock Tab */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {/* Search Form */}
          <div className="p-5 border border-border rounded-lg bg-background">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-2">商品编码</label>
                <input
                  type="text"
                  placeholder="请输入商品编码"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">商品名称</label>
                <input
                  type="text"
                  placeholder="请输入商品名称"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">仓库</label>
                <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">全部</option>
                  <option value="central">中心仓库</option>
                  <option value="branch">分库</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2">库位</label>
                <input
                  type="text"
                  placeholder="请输入库位"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">效期状态</label>
                <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">全部</option>
                  <option value="normal">正常</option>
                  <option value="warning">近效期</option>
                  <option value="urgent">临近效期</option>
                  <option value="critical">过期预警</option>
                  <option value="expired">已过期</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2">库存状态</label>
                <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">全部</option>
                  <option value="normal">正常</option>
                  <option value="low">库存不足</option>
                  <option value="out">缺货</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                <Search className="size-4" />
                查询
              </button>
              <button className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors">
                重置
              </button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-4 border border-border rounded-lg bg-background">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                disabled={selectedRows.length !== 1}
                onClick={openStockDetailDialog}
                className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Eye className="size-4" />
                查看明细
              </button>
              <button
                disabled={selectedRows.length !== 1}
                className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Package className="size-4" />
                查看批次
              </button>
              <button
                disabled={selectedRows.length !== 1}
                className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="size-4" />
                查看流水
              </button>
              <button className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2">
                <Download className="size-4" />
                导出
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="border border-border rounded-lg bg-background overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={stockRows.length > 0 && selectedRows.length === stockRows.length}
                        onChange={handleSelectAll}
                        className="size-4 rounded border-border"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      商品编码
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      商品名称
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      规格
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      仓库
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      库位
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      总量
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      可用
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      锁定
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                      效期状态
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                      库存状态
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stockRows.map((item) => (
                    <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(item.id)}
                          onChange={() => handleSelectRow(item.id)}
                          className="size-4 rounded border-border"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">{item.productCode}</td>
                      <td className="px-4 py-3 font-medium">{item.productName}</td>
                      <td className="px-4 py-3 text-sm">{item.spec}</td>
                      <td className="px-4 py-3 text-sm">{item.warehouse}</td>
                      <td className="px-4 py-3 text-sm">{item.location}</td>
                      <td className="px-4 py-3 text-right font-medium">{item.totalQty.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{item.availableQty.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {item.lockedQty.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs inline-flex items-center gap-1.5 ${getExpiryStatusColor(
                              item.expiryStatus
                            )}`}
                          >
                            {getExpiryStatusIcon(item.expiryStatus)}
                            {getExpiryStatusText(item.expiryStatus)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              item.status === 'normal'
                                ? 'text-[#10b981] bg-[#10b981]/10'
                                : item.status === 'low'
                                ? 'text-[#f59e0b] bg-[#f59e0b]/10'
                                : 'text-destructive bg-destructive/10'
                            }`}
                          >
                            {item.status === 'normal' ? '正常' : item.status === 'low' ? '库存不足' : '缺货'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!inventoryLedgerQuery.isLoading && stockRows.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={11}>
                        暂无库存台账数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {inventoryLedgerQuery.isLoading ? '库存台账加载中...' : `共${stockRows.length}条`}
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
                  首页
                </button>
                <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
                  上一页
                </button>
                <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">1</button>
                <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
                  下一页
                </button>
                <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
                  末页
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'expire' && (
        <div className="space-y-4">
          {/* Search Form */}
          <div className="p-5 border border-border rounded-lg bg-background">
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-2">商品编码</label>
                <input
                  type="text"
                  placeholder="请输入商品编码"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">商品名称</label>
                <input
                  type="text"
                  placeholder="请输入商品名称"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">预警级别</label>
                <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">全部</option>
                  <option value="warning">近效期(90天)</option>
                  <option value="urgent">临近(30天)</option>
                  <option value="critical">紧急(7天)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2">是否已处理</label>
                <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">全部</option>
                  <option value="0">未处理</option>
                  <option value="1">已处理</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                <Search className="size-4" />
                查询
              </button>
              <button className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors">
                重置
              </button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-4 border border-border rounded-lg bg-background">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                disabled={selectedRows.length === 0}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="size-4" />
                处理预警
              </button>
              <button
                disabled={selectedRows.length === 0}
                className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle className="size-4" />
                忽略预警
              </button>
              <button className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2">
                <Download className="size-4" />
                导出
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="border border-border rounded-lg bg-background overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedRows.length === mockExpireAlerts.length}
                        onChange={handleSelectAll}
                        className="size-4 rounded border-border"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      商品编码
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      商品名称
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      规格
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      批号
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      有效期
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      剩余天数
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                      预警级别
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      库存数量
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                      是否处理
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mockExpireAlerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(alert.id)}
                          onChange={() => handleSelectRow(alert.id)}
                          className="size-4 rounded border-border"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">{alert.productCode}</td>
                      <td className="px-4 py-3 font-medium">{alert.productName}</td>
                      <td className="px-4 py-3 text-sm">{alert.spec}</td>
                      <td className="px-4 py-3 text-sm font-mono">{alert.batchNo}</td>
                      <td className="px-4 py-3 text-sm">{alert.expiryDate}</td>
                      <td className="px-4 py-3 text-right font-medium">{alert.remainDays}天</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <span
                            className={`px-2 py-1 rounded text-xs ${getAlertLevelColor(
                              alert.alertLevel
                            )}`}
                          >
                            {getAlertLevelText(alert.alertLevel)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">{alert.qty.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              alert.isHandled
                                ? 'text-[#10b981] bg-[#10b981]/10'
                                : 'text-muted-foreground bg-muted'
                            }`}
                          >
                            {alert.isHandled ? '已处理' : '未处理'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                每页25条 · 共{mockExpireAlerts.length}条
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
                  首页
                </button>
                <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
                  上一页
                </button>
                <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">1</button>
                <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
                  下一页
                </button>
                <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
                  末页
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'check' && (
        <div className="space-y-4">
          {/* Search Form */}
          <div className="p-5 border border-border rounded-lg bg-background">
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-2">盘点单号</label>
                <input
                  type="text"
                  placeholder="请输入盘点单号"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">仓库</label>
                <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">全部</option>
                  <option value="central">中心仓库</option>
                  <option value="branch">分库</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2">盘点日期</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="text-muted-foreground">~</span>
                  <input
                    type="date"
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-2">状态</label>
                <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">全部</option>
                  <option value="draft">草稿</option>
                  <option value="checking">盘点中</option>
                  <option value="completed">已完成</option>
                  <option value="approved">已审核</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                <Search className="size-4" />
                查询
              </button>
              <button className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors">
                重置
              </button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-4 border border-border rounded-lg bg-background">
            <div className="flex items-center gap-2 flex-wrap">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                <Plus className="size-4" />
                新建盘点
              </button>
              <button
                disabled={selectedRows.length !== 1}
                className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Edit className="size-4" />
                修改
              </button>
              <button
                disabled={selectedRows.length === 0}
                className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="size-4" />
                删除
              </button>
              <button
                disabled={selectedRows.length !== 1}
                className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="size-4" />
                开始盘点
              </button>
              <button
                disabled={selectedRows.length !== 1}
                className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="size-4" />
                确认盘点
              </button>
              <button className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2">
                <Download className="size-4" />
                导出
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="border border-border rounded-lg bg-background overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedRows.length === mockStockChecks.length}
                        onChange={handleSelectAll}
                        className="size-4 rounded border-border"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      盘点单号
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      仓库
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      盘点日期
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                      状态
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      盘点人
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      差异数
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mockStockChecks.map((check) => (
                    <tr key={check.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(check.id)}
                          onChange={() => handleSelectRow(check.id)}
                          className="size-4 rounded border-border"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">{check.checkNo}</td>
                      <td className="px-4 py-3 text-sm">{check.warehouse}</td>
                      <td className="px-4 py-3 text-sm">{check.checkDate}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <span className={`px-2 py-1 rounded text-xs ${getCheckStatusColor(check.status)}`}>
                            {getCheckStatusText(check.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{check.checker}</td>
                      <td className="px-4 py-3 text-right font-medium">{check.diffCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button className="text-primary hover:underline text-sm">查看</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">每页25条 · 共{mockStockChecks.length}条</div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">首页</button>
                <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">上一页</button>
                <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">1</button>
                <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">下一页</button>
                <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">末页</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showStockDetailDialog && selectedProductId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-[min(980px,96vw)] max-h-[86vh] bg-background border border-border rounded-lg shadow-xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
              <div>
                <div className="font-medium">库存明细 - {selectedStock?.productCode ?? ''}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {selectedStock?.productName ?? ''} · 按批号分页展示库存明细
                </div>
              </div>
              <button
                onClick={() => setShowStockDetailDialog(false)}
                className="p-2 rounded-lg border border-border hover:bg-accent transition-colors shrink-0"
                title="关闭明细"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-muted">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">商品名称</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">规格</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">型号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">批号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">失效期</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">数量</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stockDetailRows.map((item) => (
                    <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3">{item.productName}</td>
                      <td className="px-4 py-3 text-sm">{item.spec || '-'}</td>
                      <td className="px-4 py-3 text-sm">{item.model || '-'}</td>
                      <td className="px-4 py-3 text-sm font-mono">{item.batchNo || '-'}</td>
                      <td className="px-4 py-3 text-sm">{item.expiryDate ?? '-'}</td>
                      <td className="px-4 py-3 text-right font-medium">{item.quantity.toLocaleString()}</td>
                    </tr>
                  ))}
                  {!stockDetailQuery.isLoading && stockDetailRows.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={6}>
                        暂无库存明细
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {stockDetailQuery.isLoading
                    ? '明细加载中...'
                    : `当前第 ${stockDetailCurrent}/${stockDetailTotalPages} 页 · 共 ${stockDetailTotal} 条`}
                </span>
                <span>每页</span>
                <select
                  className="px-3 py-1.5 border border-border rounded bg-background text-foreground"
                  value={stockDetailSize}
                  onChange={(event) => changeDetailSize(Number(event.target.value))}
                >
                  <option value={10}>10条</option>
                  <option value={20}>20条</option>
                  <option value={50}>50条</option>
                </select>
                <span>最多50条</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={stockDetailCurrent <= 1}
                  onClick={() => changeDetailPage(1)}
                  className="px-3 py-1.5 border border-border rounded hover:bg-accent transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  首页
                </button>
                <button
                  disabled={stockDetailCurrent <= 1}
                  onClick={() => changeDetailPage(stockDetailCurrent - 1)}
                  className="px-3 py-1.5 border border-border rounded hover:bg-accent transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <span className="px-3 py-1.5 text-sm text-muted-foreground">
                  {stockDetailCurrent} / {stockDetailTotalPages}
                </span>
                <button
                  disabled={stockDetailCurrent >= stockDetailTotalPages}
                  onClick={() => changeDetailPage(stockDetailCurrent + 1)}
                  className="px-3 py-1.5 border border-border rounded hover:bg-accent transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
                <button
                  disabled={stockDetailCurrent >= stockDetailTotalPages}
                  onClick={() => changeDetailPage(stockDetailTotalPages)}
                  className="px-3 py-1.5 border border-border rounded hover:bg-accent transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  末页
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
