import { useState } from 'react';
import {
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  CheckCircle2,
  FileText,
  XCircle,
  Upload,
  Printer,
} from 'lucide-react';

interface InvoiceItem {
  id: number;
  invoiceNo: string;
  invoiceCode: string;
  settlementNo: string;
  hospital: string;
  invoiceDate: string;
  invoiceAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: 'pending_audit' | 'audited' | 'signed' | 'rejected' | 'returned' | 'voided';
}

const mockInvoices: InvoiceItem[] = [
  {
    id: 1,
    invoiceNo: '00001234',
    invoiceCode: '044032200111',
    settlementNo: 'JS20240401',
    hospital: '北京协和医院',
    invoiceDate: '2024-04-10',
    invoiceAmount: 240677.97,
    taxAmount: 44322.03,
    totalAmount: 285000,
    status: 'pending_audit',
  },
  {
    id: 2,
    invoiceNo: '00001235',
    invoiceCode: '044032200111',
    settlementNo: 'JS20240315',
    hospital: '上海瑞金医院',
    invoiceDate: '2024-03-28',
    invoiceAmount: 381355.93,
    taxAmount: 70644.07,
    totalAmount: 452000,
    status: 'audited',
  },
  {
    id: 3,
    invoiceNo: '00001236',
    invoiceCode: '044032200111',
    settlementNo: 'JS20240301',
    hospital: '广州中山医院',
    invoiceDate: '2024-03-15',
    invoiceAmount: 310169.49,
    taxAmount: 57830.51,
    totalAmount: 368000,
    status: 'signed',
  },
  {
    id: 4,
    invoiceNo: '00001237',
    invoiceCode: '044032200111',
    settlementNo: 'JS20240215',
    hospital: '北京协和医院',
    invoiceDate: '2024-03-01',
    invoiceAmount: 164406.78,
    taxAmount: 30593.22,
    totalAmount: 195000,
    status: 'rejected',
  },
];

export default function InvoiceManagement() {
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState('240677.97');
  const [taxAmount, setTaxAmount] = useState('44322.03');
  const [taxRate, setTaxRate] = useState('0.13');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_audit':
        return 'text-muted-foreground bg-muted';
      case 'audited':
        return 'text-[#3b82f6] bg-[#3b82f6]/10';
      case 'signed':
        return 'text-[#10b981] bg-[#10b981]/10';
      case 'rejected':
        return 'text-destructive bg-destructive/10';
      case 'returned':
        return 'text-[#f97316] bg-[#f97316]/10';
      case 'voided':
        return 'text-muted-foreground bg-muted';
      default:
        return 'text-foreground bg-muted';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_audit':
        return '待审核';
      case 'audited':
        return '已审核';
      case 'signed':
        return '已签收';
      case 'rejected':
        return '驳回';
      case 'returned':
        return '已退回';
      case 'voided':
        return '已作废';
      default:
        return status;
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.length === mockInvoices.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(mockInvoices.map((item) => item.id));
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const calculateTotal = () => {
    const amount = parseFloat(invoiceAmount) || 0;
    const tax = parseFloat(taxAmount) || 0;
    return (amount + tax).toFixed(2);
  };

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <div className="p-5 border border-border rounded-lg bg-background">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm mb-2">发票号码</label>
            <input
              type="text"
              placeholder="请输入发票号码"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
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
            <label className="block text-sm mb-2">发票日期范围</label>
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
              <option value="pending_audit">待审核</option>
              <option value="audited">已审核</option>
              <option value="signed">已签收</option>
              <option value="rejected">驳回</option>
              <option value="returned">已退回</option>
              <option value="voided">已作废</option>
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
            onClick={() => setShowEditDialog(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Plus className="size-4" />
            新增
          </button>
          <button
            disabled={selectedRows.length !== 1}
            onClick={() => setShowEditDialog(true)}
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
            审核
          </button>
          <button
            disabled={selectedRows.length !== 1}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="size-4" />
            签收
          </button>
          <button
            disabled={selectedRows.length !== 1}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="size-4" />
            查看
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
                    checked={selectedRows.length === mockInvoices.length}
                    onChange={handleSelectAll}
                    className="size-4 rounded border-border"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  发票号码
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  发票代码
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  结算单号
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  医院
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  发票日期
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                  价税合计(元)
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
              {mockInvoices.map((item) => (
                <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(item.id)}
                      onChange={() => handleSelectRow(item.id)}
                      className="size-4 rounded border-border"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium font-mono">{item.invoiceNo}</td>
                  <td className="px-4 py-3 text-sm font-mono">{item.invoiceCode}</td>
                  <td className="px-4 py-3 text-sm">{item.settlementNo}</td>
                  <td className="px-4 py-3 text-sm">{item.hospital}</td>
                  <td className="px-4 py-3 text-sm">{item.invoiceDate}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    ¥{item.totalAmount.toLocaleString()}
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
          <div className="text-sm text-muted-foreground">每页25条 · 共{mockInvoices.length}条</div>
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
          <div className="bg-background rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Dialog Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
              <h3 className="font-semibold">编辑发票 - FP20240001</h3>
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
                      发票号码 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      defaultValue="00001234"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      发票代码 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      defaultValue="044032200111"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      发票类型 <span className="text-destructive">*</span>
                    </label>
                    <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">请选择发票类型</option>
                      <option value="electronic_plain" selected>
                        电子普通发票
                      </option>
                      <option value="electronic_special">电子专用发票</option>
                      <option value="paper_plain">纸质普通发票</option>
                      <option value="paper_special">纸质专用发票</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      关联结算单 <span className="text-destructive">*</span>
                    </label>
                    <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring">
                      <option value="">请选择结算单</option>
                      <option value="JS20240401" selected>
                        JS20240401
                      </option>
                      <option value="JS20240315">JS20240315</option>
                      <option value="JS20240301">JS20240301</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm mb-2">
                      医院 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value="北京协和医院"
                      disabled
                      className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Tax Info */}
              <div>
                <h4 className="font-medium mb-4">价税信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">
                      发票日期 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="date"
                      defaultValue="2024-04-10"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      税率 <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="0.13">13%</option>
                      <option value="0.09">9%</option>
                      <option value="0.06">6%</option>
                      <option value="0.03">3%</option>
                      <option value="0">0%</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      发票金额(元) <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      税额(元) <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={taxAmount}
                      onChange={(e) => setTaxAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm mb-2">
                      价税合计(元) <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={`¥${calculateTotal()}`}
                      disabled
                      className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Invoice File */}
              <div>
                <h4 className="font-medium mb-4">发票文件</h4>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                  <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-1">点击上传或拖拽文件到此区域</p>
                  <p className="text-xs text-muted-foreground">
                    支持 PDF、JPG、PNG 格式，单个文件不超过 10MB
                  </p>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  已上传 <span className="text-primary">发票_00001234.pdf</span> (2.5MB)
                </div>
              </div>

              {/* Remark */}
              <div>
                <label className="block text-sm mb-2">备注</label>
                <textarea
                  rows={3}
                  placeholder="请输入备注信息"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                ></textarea>
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
                提交审核
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
