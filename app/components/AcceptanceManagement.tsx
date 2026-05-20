import { useState } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Eye,
  Printer,
  Download,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useFeedback } from './AppFeedback';

interface Acceptance {
  id: number;
  acceptanceNo: string;
  orderNo: string;
  hospital: string;
  acceptanceDate: string;
  status: 'pending' | 'accepting' | 'partial' | 'difference' | 'confirming' | 'completed' | 'rejected' | 'closed';
  acceptor: string;
  totalQty: number;
  acceptedQty: number;
}

interface AcceptanceItem {
  id: number;
  productCode: string;
  productName: string;
  spec: string;
  model: string;
  unit: string;
  expectedQty: number;
  actualQty: number;
  qualifiedQty: number;
  unqualifiedQty: number;
  batchNo: string;
  productionDate: string;
  expiryDate: string;
  udiCode: string;
  unqualifiedReason: string;
}

const mockAcceptances: Acceptance[] = [
  {
    id: 1,
    acceptanceNo: 'YS20240001',
    orderNo: 'DD20240001',
    hospital: '浙江省人民医院',
    acceptanceDate: '2024-04-10',
    status: 'pending',
    acceptor: '张三',
    totalQty: 100,
    acceptedQty: 0,
  },
  {
    id: 2,
    acceptanceNo: 'YS20240002',
    orderNo: 'DD20240002',
    hospital: '宁波市第一医院',
    acceptanceDate: '2024-04-11',
    status: 'accepting',
    acceptor: '李四',
    totalQty: 50,
    acceptedQty: 30,
  },
  {
    id: 3,
    acceptanceNo: 'YS20240003',
    orderNo: 'DD20240003',
    hospital: '温州医科大学附属第一医院',
    acceptanceDate: '2024-04-12',
    status: 'completed',
    acceptor: '王五',
    totalQty: 200,
    acceptedQty: 200,
  },
  {
    id: 4,
    acceptanceNo: 'YS20240004',
    orderNo: 'DD20240004',
    hospital: '嘉兴市第一医院',
    acceptanceDate: '2024-04-13',
    status: 'difference',
    acceptor: '赵六',
    totalQty: 150,
    acceptedQty: 140,
  },
];

const mockAcceptanceItems: AcceptanceItem[] = [
  {
    id: 1,
    productCode: 'YLQX20240001',
    productName: '一次性无菌注射器',
    spec: '5ml',
    model: 'LB-5',
    unit: '支',
    expectedQty: 100,
    actualQty: 100,
    qualifiedQty: 100,
    unqualifiedQty: 0,
    batchNo: 'B20240301',
    productionDate: '2024-03-01',
    expiryDate: '2026-03-01',
    udiCode: '01234567890123',
    unqualifiedReason: '',
  },
  {
    id: 2,
    productCode: 'YLQX20240002',
    productName: '医用外科口罩',
    spec: '一次性',
    model: 'KZ-01',
    unit: '只',
    expectedQty: 50,
    actualQty: 48,
    qualifiedQty: 45,
    unqualifiedQty: 3,
    batchNo: 'B20240305',
    productionDate: '2024-03-05',
    expiryDate: '2026-03-05',
    udiCode: '01234567890124',
    unqualifiedReason: '包装破损',
  },
];

export default function AcceptanceManagement() {
  const { notify } = useFeedback();
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [acceptanceItems, setAcceptanceItems] = useState<AcceptanceItem[]>(mockAcceptanceItems);

  const [searchForm, setSearchForm] = useState({
    acceptanceNo: '',
    orderNo: '',
    hospital: '',
    startDate: '',
    endDate: '',
    status: '',
  });

  const [formData, setFormData] = useState({
    acceptanceNo: '',
    orderNo: '',
    hospital: '',
    acceptanceDate: '',
    remark: '',
  });

  const handleSelectAll = () => {
    if (selectedRows.length === mockAcceptances.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(mockAcceptances.map((a) => a.id));
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleOpenDialog = (mode: 'add' | 'edit') => {
    setDialogMode(mode);
    if (mode === 'add') {
      setFormData({
        acceptanceNo: 'YS20240005',
        orderNo: '',
        hospital: '',
        acceptanceDate: '',
        remark: '',
      });
      setAcceptanceItems([]);
    }
    setShowDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-muted-foreground bg-muted';
      case 'accepting':
        return 'text-[#3b82f6] bg-[#3b82f6]/10';
      case 'partial':
        return 'text-[#f59e0b] bg-[#f59e0b]/10';
      case 'difference':
        return 'text-[#f97316] bg-[#f97316]/10';
      case 'confirming':
        return 'text-[#8b5cf6] bg-[#8b5cf6]/10';
      case 'completed':
        return 'text-[#10b981] bg-[#10b981]/10';
      case 'rejected':
        return 'text-destructive bg-destructive/10';
      case 'closed':
        return 'text-muted-foreground bg-muted';
      default:
        return 'text-foreground bg-muted';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待验收';
      case 'accepting':
        return '验收中';
      case 'partial':
        return '部分验收';
      case 'difference':
        return '差异处理中';
      case 'confirming':
        return '待确认';
      case 'completed':
        return '已完成';
      case 'rejected':
        return '已驳回';
      case 'closed':
        return '已关闭';
      default:
        return status;
    }
  };

  const handleViewDetail = () => {
    if (selectedRows.length !== 1) {
      notify.warning('请选择一条记录查看明细');
      return;
    }
    setShowDetailDialog(true);
  };

  const updateItemField = (id: number, field: keyof AcceptanceItem, value: any) => {
    setAcceptanceItems(
      acceptanceItems.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          // 自动计算逻辑
          if (field === 'actualQty' || field === 'qualifiedQty' || field === 'unqualifiedQty') {
            const actualQty = field === 'actualQty' ? value : item.actualQty;
            const qualifiedQty = field === 'qualifiedQty' ? value : item.qualifiedQty;
            const unqualifiedQty = field === 'unqualifiedQty' ? value : item.unqualifiedQty;

            // 如果修改实收数，自动调整合格数
            if (field === 'actualQty') {
              updatedItem.qualifiedQty = actualQty;
              updatedItem.unqualifiedQty = 0;
            }
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <div className="p-5 border border-border rounded-lg bg-background">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm mb-2">验收单号</label>
            <input
              type="text"
              placeholder="请输入验收单号"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={searchForm.acceptanceNo}
              onChange={(e) => setSearchForm({ ...searchForm, acceptanceNo: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-2">采购订单号</label>
            <input
              type="text"
              placeholder="请输入采购订单号"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={searchForm.orderNo}
              onChange={(e) => setSearchForm({ ...searchForm, orderNo: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-2">医院</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={searchForm.hospital}
              onChange={(e) => setSearchForm({ ...searchForm, hospital: e.target.value })}
            >
              <option value="">全部</option>
              <option value="浙江省人民医院">浙江省人民医院</option>
              <option value="宁波市第一医院">宁波市第一医院</option>
              <option value="温州医科大学附属第一医院">温州医科大学附属第一医院</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2">验收日期</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={searchForm.startDate}
                onChange={(e) => setSearchForm({ ...searchForm, startDate: e.target.value })}
              />
              <span className="text-muted-foreground">~</span>
              <input
                type="date"
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={searchForm.endDate}
                onChange={(e) => setSearchForm({ ...searchForm, endDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2">状态</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={searchForm.status}
              onChange={(e) => setSearchForm({ ...searchForm, status: e.target.value })}
            >
              <option value="">全部</option>
              <option value="pending">待验收</option>
              <option value="accepting">验收中</option>
              <option value="partial">部分验收</option>
              <option value="difference">差异处理中</option>
              <option value="confirming">待确认</option>
              <option value="completed">已完成</option>
              <option value="rejected">已驳回</option>
              <option value="closed">已关闭</option>
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
            onClick={handleViewDetail}
            disabled={selectedRows.length !== 1}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="size-4" />
            查看明细
          </button>
          <button
            disabled={selectedRows.length !== 1}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="size-4" />
            打印
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
                    checked={selectedRows.length === mockAcceptances.length}
                    onChange={handleSelectAll}
                    className="size-4 rounded border-border"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  验收单号
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  采购订单号
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  医院
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  验收日期
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  应收数量
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  实收数量
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  状态
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  验收人
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockAcceptances.map((acceptance) => (
                <tr key={acceptance.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(acceptance.id)}
                      onChange={() => handleSelectRow(acceptance.id)}
                      className="size-4 rounded border-border"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{acceptance.acceptanceNo}</td>
                  <td className="px-4 py-3 text-sm">{acceptance.orderNo}</td>
                  <td className="px-4 py-3 text-sm">{acceptance.hospital}</td>
                  <td className="px-4 py-3 text-sm">{acceptance.acceptanceDate}</td>
                  <td className="px-4 py-3 text-right">{acceptance.totalQty}</td>
                  <td className="px-4 py-3 text-right font-medium">{acceptance.acceptedQty}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(acceptance.status)}`}>
                        {getStatusText(acceptance.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{acceptance.acceptor}</td>
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
          <div className="text-sm text-muted-foreground">每页25条 · 共{mockAcceptances.length}条</div>
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

      {/* Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-medium">
                {dialogMode === 'add' ? '新增验收单' : '编辑验收单'} - {formData.acceptanceNo}
              </h2>
              <button
                onClick={() => setShowDialog(false)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Information */}
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">基本信息</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm mb-2">
                      验收单号 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.acceptanceNo}
                      disabled
                      className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      采购订单 <span className="text-destructive">*</span>
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.orderNo}
                      onChange={(e) => setFormData({ ...formData, orderNo: e.target.value })}
                    >
                      <option value="">请选择订单</option>
                      <option value="DD20240001">DD20240001</option>
                      <option value="DD20240002">DD20240002</option>
                      <option value="DD20240003">DD20240003</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      医院 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value="浙江省人民医院"
                      disabled
                      className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      验收日期 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.acceptanceDate}
                      onChange={(e) => setFormData({ ...formData, acceptanceDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Acceptance Items */}
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">验收明细</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          商品编码
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          商品名称
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          规格
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">
                          应收数
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">
                          实收数
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">
                          合格数
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">
                          不合格数
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          批号
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          生产日期
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          有效期
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          UDI
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          不合格原因
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {acceptanceItems.map((item) => (
                        <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                          <td className="px-3 py-2 text-sm font-mono">{item.productCode}</td>
                          <td className="px-3 py-2 text-sm">{item.productName}</td>
                          <td className="px-3 py-2 text-sm">{item.spec}</td>
                          <td className="px-3 py-2 text-right text-sm">{item.expectedQty}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.actualQty}
                              onChange={(e) =>
                                updateItemField(item.id, 'actualQty', parseInt(e.target.value) || 0)
                              }
                              className="w-20 px-2 py-1 text-right border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                              min="0"
                              max={item.expectedQty}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.qualifiedQty}
                              onChange={(e) =>
                                updateItemField(item.id, 'qualifiedQty', parseInt(e.target.value) || 0)
                              }
                              className="w-20 px-2 py-1 text-right border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                              min="0"
                              max={item.actualQty}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={item.unqualifiedQty}
                              onChange={(e) =>
                                updateItemField(item.id, 'unqualifiedQty', parseInt(e.target.value) || 0)
                              }
                              className="w-20 px-2 py-1 text-right border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                              min="0"
                              max={item.actualQty}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.batchNo}
                              onChange={(e) => updateItemField(item.id, 'batchNo', e.target.value)}
                              className="w-24 px-2 py-1 border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={item.productionDate}
                              onChange={(e) => updateItemField(item.id, 'productionDate', e.target.value)}
                              className="w-32 px-2 py-1 border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={item.expiryDate}
                              onChange={(e) => updateItemField(item.id, 'expiryDate', e.target.value)}
                              className="w-32 px-2 py-1 border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.udiCode}
                              onChange={(e) => updateItemField(item.id, 'udiCode', e.target.value)}
                              className="w-32 px-2 py-1 border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.unqualifiedReason}
                              onChange={(e) =>
                                updateItemField(item.id, 'unqualifiedReason', e.target.value)
                              }
                              placeholder={item.unqualifiedQty > 0 ? '必填' : ''}
                              className="w-32 px-2 py-1 border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {acceptanceItems.some(
                  (item) => item.actualQty !== item.expectedQty || item.unqualifiedQty > 0
                ) && (
                  <div className="mt-4 p-3 bg-[#f59e0b]/10 border border-[#f59e0b] rounded-lg flex items-start gap-2">
                    <AlertTriangle className="size-5 text-[#f59e0b] shrink-0 mt-0.5" />
                    <div className="text-sm text-[#f59e0b]">
                      <p className="font-medium">存在验收差异</p>
                      <p className="mt-1">
                        检测到数量差异或不合格商品，请在备注中说明差异原因，验收确认前需完成差异处理。
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Remark */}
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">备注</h3>
                <textarea
                  rows={4}
                  placeholder="请输入备注信息，如有差异请说明原因..."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDialog(false)}
                className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button className="px-6 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors">
                保存
              </button>
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
                确认验收
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail View Dialog */}
      {showDetailDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-medium">验收单明细</h2>
              <button
                onClick={() => setShowDetailDialog(false)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Information */}
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">验收单基本信息</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">验收单号</label>
                    <div className="px-3 py-2 border border-border rounded-lg bg-muted text-sm">
                      YS20240001
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">配送单号</label>
                    <div className="px-3 py-2 border border-border rounded-lg bg-muted text-sm">
                      PS20240001
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">验收日期</label>
                    <div className="px-3 py-2 border border-border rounded-lg bg-muted text-sm">
                      2024-04-10
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Items */}
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">验收商品明细</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          商品编码
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          商品名称
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          规格
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">
                          计划数量
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">
                          配送数量
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">
                          未配送数量
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          生产日期
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          失效日期
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          批号
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          备注
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {acceptanceItems.map((item) => (
                        <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                          <td className="px-3 py-2 text-sm font-mono">{item.productCode}</td>
                          <td className="px-3 py-2 text-sm">{item.productName}</td>
                          <td className="px-3 py-2 text-sm">{item.spec}</td>
                          <td className="px-3 py-2 text-right text-sm">{item.expectedQty}</td>
                          <td className="px-3 py-2 text-right text-sm">{item.actualQty}</td>
                          <td className="px-3 py-2 text-right text-sm">
                            {item.expectedQty - item.actualQty}
                          </td>
                          <td className="px-3 py-2 text-sm">{item.productionDate}</td>
                          <td className="px-3 py-2 text-sm">{item.expiryDate}</td>
                          <td className="px-3 py-2 text-sm">{item.batchNo}</td>
                          <td className="px-3 py-2 text-sm">{item.unqualifiedReason || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remark */}
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">备注</h3>
                <div className="px-3 py-2 border border-border rounded-lg bg-muted text-sm min-h-[80px]">
                  验收完成，无异常情况
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDetailDialog(false)}
                className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
