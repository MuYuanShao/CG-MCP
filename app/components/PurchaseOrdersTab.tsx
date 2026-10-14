import { Search, Download, X } from 'lucide-react';
import { useFeedback } from './AppFeedback';

interface PurchaseOrder {
  id: number;
  orderNo: string;
  planNo: string;
  hospital: string;
  productName: string;
  totalAmount: number;
  orderDate: string;
  status: string;
}

interface OrderDetailItem {
  id: number;
  productCode: string;
  productName: string;
  spec: string;
  model: string;
  unit: string;
  deliveredQty: number;
  unitPrice: number | string;
  productionDate: string | null;
  expiryDate: string | null;
  batchNo: string;
  manufacturer: string;
  remark: string;
}

interface OrderDetailSearchForm {
  productCode: string;
  productName: string;
  batchNo: string;
  manufacturer: string;
}

interface PurchaseOrdersTabProps {
  purchaseOrders: PurchaseOrder[];
  selectedOrderRows: number[];
  onSelectOrderRow: (id: number) => void;
  onSelectOrderAll: () => void;
  orderSearchForm: {
    orderNo?: string;
    sourcePlan?: string;
    productName?: string;
    hospital?: string;
    startDate?: string;
    endDate?: string;
  };
  onUpdateOrderSearchForm: (form: {
    orderNo?: string;
    sourcePlan?: string;
    productName?: string;
    hospital?: string;
    startDate?: string;
    endDate?: string;
  }) => void;
  onSearchOrders: () => void;
  onResetOrderSearch: () => void;
  onShowOrderDetail: () => void;

  showOrderDetailDialog: boolean;
  onCloseOrderDetail: () => void;
  selectedOrderDetail: PurchaseOrder | undefined;
  orderDetailSearchForm: OrderDetailSearchForm;
  onUpdateDetailSearchForm: (form: OrderDetailSearchForm) => void;
  onSearchDetails: () => void;
  onResetDetailSearch: () => void;
  onExportDetails: () => void;
  orderDetailItems: OrderDetailItem[];
  orderDetailCurrent: number;
  orderDetailTotalPages: number;
  orderDetailTotal: number;
  orderDetailSize: number;
  onChangeDetailPage: (page: number) => void;
  onChangeDetailSize: (size: number) => void;
  isLoading: boolean;
  error?: string;
  isDetailLoading?: boolean;
  detailError?: string;
}

function getOrderStatusText(status: string) {
  switch (status) {
    case 'pending_confirm': return '待确认';
    case 'confirmed': return '已确认';
    case 'partial_shipped': return '部分发货';
    case 'shipped': return '已发货';
    case 'arrived': return '已到货';
    case 'accepted': return '已验收';
    case 'completed': return '已完成';
    case 'closed': return '已关闭';
    default: return status;
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case 'pending_confirm': return 'text-[#f59e0b] bg-[#f59e0b]/10';
    case 'confirmed': return 'text-[#3b82f6] bg-[#3b82f6]/10';
    case 'partial_shipped': return 'text-[#8b5cf6] bg-[#8b5cf6]/10';
    case 'shipped': return 'text-[#8b5cf6] bg-[#8b5cf6]/10';
    case 'arrived': return 'text-[#10b981] bg-[#10b981]/10';
    case 'accepted': return 'text-[#10b981] bg-[#10b981]/10';
    case 'completed': return 'text-[#10b981] bg-[#10b981]/10';
    case 'closed': return 'text-muted-foreground bg-muted';
    default: return 'text-foreground bg-muted';
  }
}

export default function PurchaseOrdersTab({
  purchaseOrders,
  selectedOrderRows,
  onSelectOrderRow,
  onSelectOrderAll,
  orderSearchForm,
  onUpdateOrderSearchForm,
  onSearchOrders,
  onResetOrderSearch,
  onShowOrderDetail,
  showOrderDetailDialog,
  onCloseOrderDetail,
  selectedOrderDetail,
  orderDetailSearchForm,
  onUpdateDetailSearchForm,
  onSearchDetails,
  onResetDetailSearch,
  onExportDetails,
  orderDetailItems,
  orderDetailCurrent,
  orderDetailTotalPages,
  orderDetailTotal,
  orderDetailSize,
  onChangeDetailPage,
  onChangeDetailSize,
  isLoading,
  error,
  isDetailLoading = false,
  detailError,
}: PurchaseOrdersTabProps) {
  return (
    <>
      <div className="space-y-4">
        {error && <p role="alert" className="rounded-lg border border-destructive p-3 text-destructive">采购订单加载失败：{error}</p>}
        <div className="p-5 border border-border rounded-lg bg-background">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm mb-2">采购订单号</label>
              <input type="text" placeholder="请输入采购订单号" value={orderSearchForm.orderNo}
                onChange={(e) => onUpdateOrderSearchForm({ ...orderSearchForm, orderNo: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm mb-2">来源计划</label>
              <input type="text" placeholder="请输入来源计划号" value={orderSearchForm.sourcePlan}
                onChange={(e) => onUpdateOrderSearchForm({ ...orderSearchForm, sourcePlan: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm mb-2">商品名称</label>
              <input type="text" placeholder="请输入明细商品名称" value={orderSearchForm.productName}
                onChange={(e) => onUpdateOrderSearchForm({ ...orderSearchForm, productName: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm mb-2">医院</label>
              <input type="text" placeholder="请输入医院名称" value={orderSearchForm.hospital}
                onChange={(e) => onUpdateOrderSearchForm({ ...orderSearchForm, hospital: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm mb-2">订单日期</label>
              <div className="flex items-center gap-2">
                <input type="date" value={orderSearchForm.startDate}
                  onChange={(e) => onUpdateOrderSearchForm({ ...orderSearchForm, startDate: e.target.value })}
                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
                <span className="text-muted-foreground">~</span>
                <input type="date" value={orderSearchForm.endDate}
                  onChange={(e) => onUpdateOrderSearchForm({ ...orderSearchForm, endDate: e.target.value })}
                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onSearchOrders} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
              <Search className="size-4" /> 查询
            </button>
            <button onClick={onResetOrderSearch} className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors">重置</button>
          </div>
        </div>

        <div className="p-4 border border-border rounded-lg bg-background">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-muted-foreground">采购订单按单号汇总展示，商品名称查询会匹配订单明细商品。</div>
            <button disabled={selectedOrderRows.length !== 1} onClick={onShowOrderDetail}
              className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              <Search className="size-4" /> 查看明细
            </button>
          </div>
        </div>

        <div className="border border-border rounded-lg bg-background overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left">
                    <input type="checkbox" checked={purchaseOrders.length > 0 && selectedOrderRows.length === purchaseOrders.length}
                      onChange={onSelectOrderAll} className="size-4 rounded border-border" />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">采购订单号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">来源计划</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">医院</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">明细商品</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">金额(¥)</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">订单日期</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {purchaseOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedOrderRows.includes(order.id)} onChange={() => onSelectOrderRow(order.id)} className="size-4 rounded border-border" />
                    </td>
                    <td className="px-4 py-3 font-medium">{order.orderNo}</td>
                    <td className="px-4 py-3 text-sm">{order.planNo}</td>
                    <td className="px-4 py-3">{order.hospital}</td>
                    <td className="px-4 py-3">{order.productName}</td>
                    <td className="px-4 py-3 text-right">{order.totalAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{order.orderDate}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusClass(order.status)}`}>{getOrderStatusText(order.status)}</span>
                    </td>
                  </tr>
                ))}
                {!isLoading && !error && purchaseOrders.length === 0 && (
                  <tr><td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={8}>暂无采购订单数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-border flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {isLoading ? '采购订单加载中...' : `按单号汇总 · 共${purchaseOrders.length}条`}
            </div>
          </div>
        </div>
      </div>

      {showOrderDetailDialog && selectedOrderDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-[min(1180px,96vw)] max-h-[88vh] bg-background border border-border rounded-lg shadow-xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
              <div>
                <div className="font-medium">订单明细 - {selectedOrderDetail.orderNo}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  来源计划：{selectedOrderDetail.planNo || '-'} · 医院：{selectedOrderDetail.hospital || '-'}
                </div>
              </div>
              <button onClick={onCloseOrderDetail} className="p-2 rounded-lg border border-border hover:bg-accent transition-colors shrink-0" title="关闭明细">
                <X className="size-4" />
              </button>
            </div>

            <div className="p-4 border-b border-border">
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="block text-sm mb-2">商品编码</label>
                  <input type="text" placeholder="请输入商品编码" value={orderDetailSearchForm.productCode}
                    onChange={(e) => onUpdateDetailSearchForm({ ...orderDetailSearchForm, productCode: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm mb-2">商品名称</label>
                  <input type="text" placeholder="请输入商品名称" value={orderDetailSearchForm.productName}
                    onChange={(e) => onUpdateDetailSearchForm({ ...orderDetailSearchForm, productName: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm mb-2">批号</label>
                  <input type="text" placeholder="请输入批号" value={orderDetailSearchForm.batchNo}
                    onChange={(e) => onUpdateDetailSearchForm({ ...orderDetailSearchForm, batchNo: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm mb-2">厂家</label>
                  <input type="text" placeholder="请输入厂家" value={orderDetailSearchForm.manufacturer}
                    onChange={(e) => onUpdateDetailSearchForm({ ...orderDetailSearchForm, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  {isDetailLoading ? '明细加载中...' : `当前第 ${orderDetailCurrent}/${orderDetailTotalPages} 页 · 共 ${orderDetailTotal} 条明细`}
                </div>
                <div className="flex gap-2">
                  <button onClick={onSearchDetails} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                    <Search className="size-4" /> 查询
                  </button>
                  <button onClick={onResetDetailSearch} className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors">重置</button>
                  <button onClick={onExportDetails} className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2">
                    <Download className="size-4" /> 导出
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-muted">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">商品编码</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">商品名称</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">规格</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">型号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">单位</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">订单数量</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">单价(¥)</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">生产日期</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">有效期</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">批号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">厂家</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">备注</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orderDetailItems.map((item) => (
                    <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono">{item.productCode}</td>
                      <td className="px-4 py-3">{item.productName}</td>
                      <td className="px-4 py-3 text-sm">{item.spec}</td>
                      <td className="px-4 py-3 text-sm">{item.model}</td>
                      <td className="px-4 py-3 text-sm">{item.unit}</td>
                      <td className="px-4 py-3 text-right">{item.deliveredQty}</td>
                      <td className="px-4 py-3 text-right">{Number(item.unitPrice ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">{item.productionDate ?? '-'}</td>
                      <td className="px-4 py-3 text-sm">{item.expiryDate ?? '-'}</td>
                      <td className="px-4 py-3 text-sm">{item.batchNo || '-'}</td>
                      <td className="px-4 py-3 text-sm">{item.manufacturer}</td>
                      <td className="px-4 py-3 text-sm">{item.remark || '-'}</td>
                    </tr>
                  ))}
                  {detailError && <tr><td colSpan={12} role="alert" className="px-4 py-4 text-destructive">订单明细加载失败：{detailError}</td></tr>}
                  {!isDetailLoading && !detailError && orderDetailItems.length === 0 && (
                    <tr><td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={12}>暂无订单明细</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>每页</span>
                <select className="px-3 py-1.5 border border-border rounded bg-background text-foreground" value={orderDetailSize}
                  onChange={(e) => onChangeDetailSize(Number(e.target.value))}>
                  <option value={10}>10条</option>
                  <option value={20}>20条</option>
                  <option value={50}>50条</option>
                </select>
                <span>最多50条</span>
              </div>
              <div className="flex items-center gap-2">
                <button disabled={orderDetailCurrent <= 1} onClick={() => onChangeDetailPage(1)}
                  className="px-3 py-1.5 border border-border rounded hover:bg-accent transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">首页</button>
                <button disabled={orderDetailCurrent <= 1} onClick={() => onChangeDetailPage(orderDetailCurrent - 1)}
                  className="px-3 py-1.5 border border-border rounded hover:bg-accent transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">上一页</button>
                <span className="px-3 py-1.5 text-sm text-muted-foreground">{orderDetailCurrent} / {orderDetailTotalPages}</span>
                <button disabled={orderDetailCurrent >= orderDetailTotalPages} onClick={() => onChangeDetailPage(orderDetailCurrent + 1)}
                  className="px-3 py-1.5 border border-border rounded hover:bg-accent transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">下一页</button>
                <button disabled={orderDetailCurrent >= orderDetailTotalPages} onClick={() => onChangeDetailPage(orderDetailTotalPages)}
                  className="px-3 py-1.5 border border-border rounded hover:bg-accent transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">末页</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
