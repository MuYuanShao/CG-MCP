import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Download,
  Eye,
  CheckCircle2,
  FileText,
  XCircle,
  Upload,
  X,
} from 'lucide-react';
import { useFeedback } from './AppFeedback';
import { listSettlements, getSettlementItems, type SettlementItemDetail } from '../services/settlement';

interface SettlementItem {
  id: number;
  settlementNo: string;
  hospital: string;
  settlementStart: string;
  settlementEnd: string;
  amount: number;
  status: number;
}

interface SettlementDetailItem {
  id: number;
  acceptanceNo: string;
  productCode: string;
  productName: string;
  spec: string;
  batchNo: string;
  registrationNo: string;
  qty: number;
  price: number;
  amount: number;
}

interface Invoice {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  invoiceAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: 'pending' | 'audited' | 'signed' | 'rejected';
  supplier: string;
}

const mockSettlements: SettlementItem[] = [
  {
    id: 1,
    settlementNo: 'JS20240401',
    hospital: '北京协和医院',
    settlementStart: '2024-03-01',
    settlementEnd: '2024-03-31',
    amount: 285000,
    status: 0,
  },
  {
    id: 2,
    settlementNo: 'JS20240315',
    hospital: '上海瑞金医院',
    settlementStart: '2024-02-01',
    settlementEnd: '2024-02-29',
    amount: 452000,
    status: 1,
  },
  {
    id: 3,
    settlementNo: 'JS20240301',
    hospital: '广州中山医院',
    settlementStart: '2024-01-01',
    settlementEnd: '2024-01-31',
    amount: 368000,
    status: 2,
  },
  {
    id: 4,
    settlementNo: 'JS20240215',
    hospital: '北京协和医院',
    settlementStart: '2024-01-01',
    settlementEnd: '2024-01-31',
    amount: 195000,
    status: 3,
  },
  {
    id: 5,
    settlementNo: 'JS20240201',
    hospital: '上海瑞金医院',
    settlementStart: '2023-12-01',
    settlementEnd: '2023-12-31',
    amount: 520000,
    status: 5,
  },
];

const mockDetailItems: SettlementDetailItem[] = [
  {
    id: 1,
    acceptanceNo: 'YS20240301',
    productCode: 'YLQX20240001',
    productName: '一次性无菌注射器',
    spec: '5ml',
    batchNo: 'B20240301',
    registrationNo: 'ZC20230001',
    qty: 10000,
    price: 2.5,
    amount: 25000,
  },
  {
    id: 2,
    acceptanceNo: 'YS20240302',
    productCode: 'YLQX20240002',
    productName: '医用外科口罩',
    spec: '一次性',
    batchNo: 'B20240302',
    registrationNo: 'ZC20230005',
    qty: 50000,
    price: 1.2,
    amount: 60000,
  },
  {
    id: 3,
    acceptanceNo: 'YS20240305',
    productCode: 'YLQX20240003',
    productName: '输液器',
    spec: '精密过滤',
    batchNo: 'B20240303',
    registrationNo: 'ZC20230010',
    qty: 20000,
    price: 10.0,
    amount: 200000,
  },
];

const mockInvoices: Invoice[] = [
  {
    id: 1,
    invoiceNo: 'FP20240401001',
    invoiceDate: '2024-04-01',
    invoiceAmount: 100000,
    taxAmount: 13000,
    totalAmount: 113000,
    status: 'audited',
    supplier: '浙江医疗器械有限公司',
  },
  {
    id: 2,
    invoiceNo: 'FP20240401002',
    invoiceDate: '2024-04-02',
    invoiceAmount: 150000,
    taxAmount: 19500,
    totalAmount: 169500,
    status: 'audited',
    supplier: '浙江医疗器械有限公司',
  },
  {
    id: 3,
    invoiceNo: 'FP20240403001',
    invoiceDate: '2024-04-03',
    invoiceAmount: 85000,
    taxAmount: 11050,
    totalAmount: 96050,
    status: 'audited',
    supplier: '浙江医疗器械有限公司',
  },
  {
    id: 4,
    invoiceNo: 'FP20240405001',
    invoiceDate: '2024-04-05',
    invoiceAmount: 120000,
    taxAmount: 15600,
    totalAmount: 135600,
    status: 'pending',
    supplier: '浙江医疗器械有限公司',
  },
];

export default function SettlementManagement() {
  const { notify } = useFeedback();
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showInvoiceBindDialog, setShowInvoiceBindDialog] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<number[]>([]);
  const [selectedSettlementId, setSelectedSettlementId] = useState<number | null>(null);

  const { data: settlements = mockSettlements } = useQuery({
    queryKey: ['settlements'],
    queryFn: async () => {
      try {
        return await listSettlements();
      } catch {
        return mockSettlements;
      }
    },
  });

  const { data: detailItems = mockDetailItems } = useQuery({
    queryKey: ['settlement-items', selectedSettlementId],
    queryFn: async () => {
      if (!selectedSettlementId) return mockDetailItems;
      try {
        return await getSettlementItems(selectedSettlementId);
      } catch {
        return mockDetailItems;
      }
    },
    enabled: showDetailDialog && selectedSettlementId !== null,
  });

  const statusMap: Record<number, { text: string; color: string }> = {
    0: { text: '待确认', color: 'text-muted-foreground bg-muted' },
    1: { text: '供应商已确认', color: 'text-[#3b82f6] bg-[#3b82f6]/10' },
    2: { text: '医院已确认', color: 'text-[#8b5cf6] bg-[#8b5cf6]/10' },
    3: { text: '待审批', color: 'text-[#f59e0b] bg-[#f59e0b]/10' },
    4: { text: '差异处理中', color: 'text-[#f97316] bg-[#f97316]/10' },
    5: { text: '已完成', color: 'text-[#10b981] bg-[#10b981]/10' },
    6: { text: '待开票', color: 'text-[#06b6d4] bg-[#06b6d4]/10' },
    7: { text: '已关闭', color: 'text-muted-foreground bg-muted' },
  };

  const getStatusColor = (status: number) => {
    return statusMap[status]?.color ?? 'text-foreground bg-muted';
  };

  const getStatusText = (status: number) => {
    return statusMap[status]?.text ?? '未知';
  };

  const handleSelectAll = () => {
    if (selectedRows.length === settlements.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(settlements.map((item) => item.id));
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleViewDetail = () => {
    if (selectedRows.length !== 1) {
      notify.warning('请选择一条记录查看明细');
      return;
    }
    const id = selectedRows[0];
    if (id === undefined) return;
    setSelectedSettlementId(id);
    setShowDetailDialog(true);
  };

  const handleOpenInvoiceBind = () => {
    if (selectedRows.length !== 1) {
      notify.warning('请选择一条记录进行发票绑定');
      return;
    }
    setSelectedInvoices([]);
    setShowInvoiceBindDialog(true);
  };

  const handleInvoiceSelectAll = () => {
    if (selectedInvoices.length === mockInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(mockInvoices.map((invoice) => invoice.id));
    }
  };

  const handleInvoiceSelectRow = (id: number) => {
    if (selectedInvoices.includes(id)) {
      setSelectedInvoices(selectedInvoices.filter((invoiceId) => invoiceId !== id));
    } else {
      setSelectedInvoices([...selectedInvoices, id]);
    }
  };

  const handleConfirmInvoiceBind = () => {
    if (selectedInvoices.length === 0) {
      notify.warning('请至少选择一张发票');
      return;
    }
    const selectedInvoiceNos = mockInvoices
      .filter((inv) => selectedInvoices.includes(inv.id))
      .map((inv) => inv.invoiceNo)
      .join(', ');
    notify.success(`已绑定 ${selectedInvoices.length} 张发票: ${selectedInvoiceNos}`);
    setShowInvoiceBindDialog(false);
  };

  // 获取排序后的明细数据
  const getSortedDetailItems = () => {
    return [...(detailItems ?? mockDetailItems)].sort((a, b) => a.spec.localeCompare(b.spec));
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-[#f59e0b] bg-[#f59e0b]/10';
      case 'audited':
        return 'text-[#10b981] bg-[#10b981]/10';
      case 'signed':
        return 'text-[#3b82f6] bg-[#3b82f6]/10';
      case 'rejected':
        return 'text-destructive bg-destructive/10';
      default:
        return 'text-foreground bg-muted';
    }
  };

  const getInvoiceStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待审核';
      case 'audited':
        return '已审核';
      case 'signed':
        return '已签收';
      case 'rejected':
        return '已驳回';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <div className="p-5 border border-border rounded-lg bg-background">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm mb-2">结算单号</label>
            <input
              type="text"
              placeholder="请输入结算单号"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm mb-2">医院</label>
            <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">全部</option>
              <option value="hospital1">北京协和医院</option>
              <option value="hospital2">上海瑞金医院</option>
              <option value="hospital3">广州中山医院</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2">结算日期范围</label>
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
              <option value="pending_confirm">待确认</option>
              <option value="supplier_confirmed">供应商已确认</option>
              <option value="hospital_confirmed">医院已确认</option>
              <option value="pending_audit">待审批</option>
              <option value="completed">已完成</option>
              <option value="difference">差异处理中</option>
              <option value="pending_invoice">待开票</option>
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
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="size-4" />
            供应商确认
          </button>
          <button
            disabled={selectedRows.length !== 1}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="size-4" />
            医院确认
          </button>
          <button
            disabled={selectedRows.length !== 1}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="size-4" />
            审批
          </button>
          <button
            onClick={handleViewDetail}
            disabled={selectedRows.length !== 1}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="size-4" />
            查看明细
          </button>
          <button className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2">
            <Upload className="size-4" />
            导入
          </button>
          <button
            onClick={handleOpenInvoiceBind}
            disabled={selectedRows.length !== 1}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="size-4" />
            发票绑定
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
                    checked={selectedRows.length === settlements.length}
                    onChange={handleSelectAll}
                    className="size-4 rounded border-border"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  结算单号
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  医院
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  结算开始
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  结算结束
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  结算金额(元)
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  状态
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {settlements.map((item) => (
                <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(item.id)}
                      onChange={() => handleSelectRow(item.id)}
                      className="size-4 rounded border-border"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{item.settlementNo}</td>
                  <td className="px-4 py-3 text-sm">{item.hospital}</td>
                  <td className="px-4 py-3 text-sm">{item.settlementStart}</td>
                  <td className="px-4 py-3 text-sm">{item.settlementEnd}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    ¥{item.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                    </div>
                  </td>
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
          <div className="text-sm text-muted-foreground">每页25条 · 共{settlements.length}条</div>
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
      {showEditDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            {/* Dialog Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
              <h3 className="font-semibold">编辑结算单 - JS20240401</h3>
              <button
                onClick={() => setShowEditDialog(false)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="font-medium mb-4">基本信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">
                      结算单号 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value="JS20240401"
                      disabled
                      className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      医院 <span className="text-destructive">*</span>
                    </label>
                    <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">请选择医院</option>
                      <option value="hospital1" selected>
                        北京协和医院
                      </option>
                      <option value="hospital2">上海瑞金医院</option>
                      <option value="hospital3">广州中山医院</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      结算开始 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="date"
                      defaultValue="2024-03-01"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      结算结束 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="date"
                      defaultValue="2024-03-31"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm mb-2">
                      结算金额 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value="¥285,000.00"
                      disabled
                      className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Settlement Details */}
              <div>
                <h4 className="font-medium mb-4">结算明细</h4>
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-4 py-3 text-left">
                            <input type="checkbox" className="size-4 rounded border-border" />
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                            验收单号
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
                          <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                            数量
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                            单价(元)
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                            金额(元)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {mockDetailItems.map((detail) => (
                          <tr key={detail.id} className="hover:bg-accent/50 transition-colors">
                            <td className="px-4 py-3">
                              <input type="checkbox" className="size-4 rounded border-border" />
                            </td>
                            <td className="px-4 py-3 font-medium text-sm">{detail.acceptanceNo}</td>
                            <td className="px-4 py-3 text-sm font-mono">{detail.productCode}</td>
                            <td className="px-4 py-3 text-sm">{detail.productName}</td>
                            <td className="px-4 py-3 text-sm">{detail.spec}</td>
                            <td className="px-4 py-3 text-right">{detail.qty.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">¥{detail.price.toFixed(2)}</td>
                            <td className="px-4 py-3 text-right font-medium">
                              ¥{detail.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 border-t border-border bg-muted/20 flex justify-end">
                    <div className="text-sm">
                      合计: <span className="font-medium ml-2">¥285,000.00</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Difference Handling */}
              <div>
                <h4 className="font-medium mb-4">差异标记</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-2">差异类型</label>
                      <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="">请选择</option>
                        <option value="amount">金额差异</option>
                        <option value="qty">数量差异</option>
                        <option value="price">价格差异</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-2">调整金额(元)</label>
                      <input
                        type="number"
                        placeholder="请输入调整金额"
                        className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">差异原因</label>
                    <textarea
                      rows={3}
                      placeholder="请输入差异原因"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">处理意见</label>
                    <textarea
                      rows={3}
                      placeholder="请输入处理意见"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>

            {/* Dialog Footer */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 sticky bottom-0 bg-background">
              <button
                onClick={() => setShowEditDialog(false)}
                className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button className="px-6 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors">
                保存
              </button>
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
                供应商确认
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
              <h2 className="text-xl font-medium">结算单明细</h2>
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
                <h3 className="font-medium mb-4">结算单基本信息</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">结算单号</label>
                    <div className="px-3 py-2 border border-border rounded-lg bg-muted text-sm">
                      JS20240401
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">医院</label>
                    <div className="px-3 py-2 border border-border rounded-lg bg-muted text-sm">
                      北京协和医院
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">结算期间</label>
                    <div className="px-3 py-2 border border-border rounded-lg bg-muted text-sm">
                      2024-03-01 至 2024-03-31
                    </div>
                  </div>
                </div>
              </div>

              {/* Settlement Items */}
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">结算商品明细（按规格排序）</h3>
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
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          批号
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          注册证
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">
                          数量
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">
                          单价(元)
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">
                          金额(元)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {getSortedDetailItems().map((item) => (
                        <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                          <td className="px-3 py-2 text-sm font-mono">{item.productCode}</td>
                          <td className="px-3 py-2 text-sm">{item.productName}</td>
                          <td className="px-3 py-2 text-sm">{item.spec}</td>
                          <td className="px-3 py-2 text-sm font-mono">{item.batchNo}</td>
                          <td className="px-3 py-2 text-sm font-mono">{item.registrationNo}</td>
                          <td className="px-3 py-2 text-right text-sm">{item.qty.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-sm">{item.price.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-sm font-medium">
                            {item.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/30">
                        <td colSpan={7} className="px-3 py-3 text-right font-medium">
                          合计
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-primary">
                          {getSortedDetailItems()
                            .reduce((sum, item) => sum + item.amount, 0)
                            .toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">结算汇总</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">结算总金额</span>
                    <span className="text-lg font-medium text-primary">
                      ¥ {getSortedDetailItems()
                        .reduce((sum, item) => sum + item.amount, 0)
                        .toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm text-muted-foreground">明细条目数</span>
                    <span className="text-lg font-medium">
                      {getSortedDetailItems().length} 条
                    </span>
                  </div>
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

      {/* Invoice Bind Dialog */}
      {showInvoiceBindDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-medium">发票绑定</h2>
              <button
                onClick={() => setShowInvoiceBindDialog(false)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Settlement Info */}
              <div className="border border-border rounded-lg p-4 bg-muted/30">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">结算单号：</span>
                    <span className="font-medium">JS20240401</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">医院：</span>
                    <span className="font-medium">北京协和医院</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">结算金额：</span>
                    <span className="font-medium text-primary">¥285,000.00</span>
                  </div>
                </div>
              </div>

              {/* Invoice List */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b border-border">
                  <h3 className="font-medium">可选发票列表（支持多选）</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedInvoices.length === mockInvoices.length && mockInvoices.length > 0}
                            onChange={handleInvoiceSelectAll}
                            className="size-4 rounded border-border"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          发票号
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          开票日期
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          供应商
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                          发票金额(元)
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                          税额(元)
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                          价税合计(元)
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                          状态
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {mockInvoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-accent/50 transition-colors">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedInvoices.includes(invoice.id)}
                              onChange={() => handleInvoiceSelectRow(invoice.id)}
                              className="size-4 rounded border-border"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-mono">{invoice.invoiceNo}</td>
                          <td className="px-4 py-3 text-sm">{invoice.invoiceDate}</td>
                          <td className="px-4 py-3 text-sm">{invoice.supplier}</td>
                          <td className="px-4 py-3 text-right text-sm">
                            {invoice.invoiceAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {invoice.taxAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium">
                            {invoice.totalAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center">
                              <span className={`px-2 py-1 rounded text-xs ${getInvoiceStatusColor(invoice.status)}`}>
                                {getInvoiceStatusText(invoice.status)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Selected Summary */}
              <div className="border border-border rounded-lg p-4 bg-primary/5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    已选择 <span className="font-medium text-primary">{selectedInvoices.length}</span> 张发票
                  </span>
                  <span className="text-sm">
                    <span className="text-muted-foreground">合计金额：</span>
                    <span className="font-medium text-primary text-lg">
                      ¥ {mockInvoices
                        .filter((inv) => selectedInvoices.includes(inv.id))
                        .reduce((sum, inv) => sum + inv.totalAmount, 0)
                        .toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowInvoiceBindDialog(false)}
                className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmInvoiceBind}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                确认绑定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
