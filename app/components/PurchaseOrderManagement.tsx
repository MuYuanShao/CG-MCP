import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Minus, Plus, RefreshCw, Truck, X } from 'lucide-react';
import { useFeedback } from './AppFeedback';
import {
  confirmPurchaseOrder,
  createDeliveryEditByOrder,
  listPurchaseOrders,
  saveDeliveryEdit,
  type BusinessDocument,
  type DeliveryEdit,
} from '../services/purchase';

type DeliveryItem = {
  id: number;
  productCode: string;
  productName: string;
  spec: string;
  planQty: number;
  deliveredQty: number;
  productionDate: string;
  expiryDate: string;
  batchNo: string;
  remark: string;
};

const orderStatusText: Record<string, string> = {
  pending_confirm: '待确认',
  confirmed: '已确认',
  partial_shipped: '部分发货',
  shipped: '已发货',
  arrived: '已到货',
  accepted: '已验收',
  completed: '已完成',
  closed: '已关闭',
};

const statusClass: Record<string, string> = {
  pending_confirm: 'text-[#f59e0b] bg-[#f59e0b]/10',
  confirmed: 'text-[#3b82f6] bg-[#3b82f6]/10',
  partial_shipped: 'text-[#8b5cf6] bg-[#8b5cf6]/10',
  shipped: 'text-[#10b981] bg-[#10b981]/10',
  arrived: 'text-[#10b981] bg-[#10b981]/10',
  accepted: 'text-[#10b981] bg-[#10b981]/10',
  completed: 'text-muted-foreground bg-muted',
  closed: 'text-muted-foreground bg-muted',
};

export default function PurchaseOrderManagement() {
  const { notify } = useFeedback();
  const queryClient = useQueryClient();
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [deliveryContext, setDeliveryContext] = useState<DeliveryEdit | null>(null);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryRemark, setDeliveryRemark] = useState('');
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([]);
  const [deliverySaving, setDeliverySaving] = useState(false);

  const ordersQuery = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: listPurchaseOrders,
  });
  const orders = ordersQuery.data ?? [];
  const selectedOrder = orders.find((order) => order.id === selectedRows[0]);

  const refreshOrders = () => queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
  const refreshDeliveries = () => queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });

  const applyDeliveryEdit = (delivery: DeliveryEdit) => {
    setDeliveryContext(delivery);
    setDeliveryDate(delivery.deliveryDate ?? new Date().toISOString().slice(0, 10));
    setDeliveryRemark(delivery.remark ?? '');
    setDeliveryItems(
      delivery.items.map((item) => ({
        id: item.id,
        productCode: item.productCode,
        productName: item.productName,
        spec: item.spec ?? '',
        planQty: item.planQty,
        deliveredQty: item.deliveredQty,
        productionDate: item.productionDate ?? '',
        expiryDate: item.expiryDate ?? '',
        batchNo: item.batchNo ?? '',
        remark: item.remark ?? '',
      })),
    );
  };

  const confirmMutation = useMutation({
    mutationFn: confirmPurchaseOrder,
    onSuccess: (order) => {
      notify.success(`采购订单 ${order.documentNo} 已确认`);
      refreshOrders();
    },
    onError: (error) => notify.error(error instanceof Error ? error.message : '采购订单确认失败'),
  });

  const deliveryMutation = useMutation({
    mutationFn: createDeliveryEditByOrder,
    onSuccess: (delivery) => {
      applyDeliveryEdit(delivery);
      setShowDeliveryDialog(true);
      notify.success(`已生成配送单 ${delivery.deliveryNo}，请编辑配送信息`);
      refreshDeliveries();
      refreshOrders();
    },
    onError: (error) => notify.error(error instanceof Error ? error.message : '生成配送单失败'),
  });

  const toggleRow = (id: number) => {
    setSelectedRows((rows) => (rows.includes(id) ? rows.filter((rowId) => rowId !== id) : [id]));
  };

  const updateDeliveryQty = (id: number, qty: number) => {
    setDeliveryItems((items) =>
      items.map((item) =>
        item.id === id ? { ...item, deliveredQty: Math.min(Math.max(0, qty), item.planQty) } : item,
      ),
    );
  };

  const updateItemField = (id: number, field: keyof DeliveryItem, value: string) => {
    setDeliveryItems((items) => items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const handleSaveDeliveryEdit = async (submitted = false) => {
    if (!deliveryContext) {
      notify.warning('请先生成配送单');
      return;
    }
    setDeliverySaving(true);
    try {
      const saved = await saveDeliveryEdit(deliveryContext.deliveryId, {
        deliveryDate: deliveryDate || null,
        remark: deliveryRemark,
        submitted,
        items: deliveryItems.map((item) => ({
          id: item.id,
          productId: deliveryContext.items.find((source) => source.id === item.id)?.productId ?? 0,
          planQty: item.planQty,
          deliveredQty: item.deliveredQty,
          productionDate: item.productionDate || null,
          expiryDate: item.expiryDate || null,
          batchNo: item.batchNo,
          remark: item.remark,
        })),
      });
      applyDeliveryEdit(saved);
      setShowDeliveryDialog(false);
      refreshDeliveries();
      refreshOrders();
      notify.success(submitted ? `配送单 ${saved.deliveryNo} 已提交` : `配送单 ${saved.deliveryNo} 已保存`);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '配送单保存失败');
    } finally {
      setDeliverySaving(false);
    }
  };

  const renderStatus = (status: string) => (
    <span className={`px-2 py-1 rounded text-xs ${statusClass[status] ?? 'text-muted-foreground bg-muted'}`}>
      {orderStatusText[status] ?? status}
    </span>
  );

  const renderEmpty = () => {
    if (ordersQuery.isLoading) return <div className="p-8 text-center text-muted-foreground">正在加载采购订单...</div>;
    if (ordersQuery.isError) return <div className="p-8 text-center text-destructive">采购订单加载失败</div>;
    if (orders.length === 0) return <div className="p-8 text-center text-muted-foreground">暂无采购订单</div>;
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="p-4 border border-border rounded-lg bg-background">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => selectedOrder && confirmMutation.mutate(selectedOrder.id)}
            disabled={!selectedOrder || selectedOrder.status !== 'pending_confirm' || confirmMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="size-4" />
            确认订单
          </button>
          <button
            onClick={() => selectedOrder && deliveryMutation.mutate(selectedOrder.id)}
            disabled={!selectedOrder || ['closed', 'completed'].includes(selectedOrder.status) || deliveryMutation.isPending}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Truck className="size-4" />
            生成配送单
          </button>
          <button
            onClick={refreshOrders}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2"
          >
            <RefreshCw className="size-4" />
            刷新
          </button>
        </div>
      </div>

      <div className="border border-border rounded-lg bg-background overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left w-12"></th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">采购订单号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">来源计划</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">医院</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">金额</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">订单日期</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order: BusinessDocument) => (
                <tr key={order.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(order.id)}
                      onChange={() => toggleRow(order.id)}
                      className="size-4 rounded border-border"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{order.documentNo}</td>
                  <td className="px-4 py-3 text-sm">{order.sourceNo || '-'}</td>
                  <td className="px-4 py-3">{order.hospital}</td>
                  <td className="px-4 py-3 text-right">{Number(order.amount ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">{order.businessDate ?? '-'}</td>
                  <td className="px-4 py-3 text-center">{renderStatus(order.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {renderEmpty()}
        <div className="px-6 py-4 border-t border-border text-sm text-muted-foreground">
          每页25条 · 共{orders.length}条
        </div>
      </div>

      {showDeliveryDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-medium">编辑配送单</h2>
              <button onClick={() => setShowDeliveryDialog(false)} className="p-1 hover:bg-accent rounded transition-colors">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">配送单基本信息</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-2">配送单号</label>
                    <input type="text" value={deliveryContext?.deliveryNo ?? ''} disabled className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">采购订单号</label>
                    <input type="text" value={deliveryContext?.orderNo ?? ''} disabled className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      配送日期<span className="text-destructive">*</span>
                    </label>
                    <input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>
              </div>

              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">配送商品明细</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">商品编码</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">商品名称</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">规格</th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">计划数量</th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">配送数量</th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">未配送数量</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">生产日期</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">失效日期</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">批号</th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">备注</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {deliveryItems.map((item) => (
                        <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                          <td className="px-3 py-2 text-sm font-mono">{item.productCode}</td>
                          <td className="px-3 py-2 text-sm">{item.productName}</td>
                          <td className="px-3 py-2 text-sm">{item.spec}</td>
                          <td className="px-3 py-2 text-right text-sm">{item.planQty}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <button onClick={() => updateDeliveryQty(item.id, item.deliveredQty - 1)} className="p-1 hover:bg-accent rounded transition-colors">
                                <Minus className="size-3" />
                              </button>
                              <input type="number" value={item.deliveredQty} min="0" max={item.planQty} onChange={(event) => updateDeliveryQty(item.id, parseInt(event.target.value, 10) || 0)} className="w-16 px-2 py-1 text-center border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                              <button onClick={() => updateDeliveryQty(item.id, item.deliveredQty + 1)} className="p-1 hover:bg-accent rounded transition-colors">
                                <Plus className="size-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-sm font-medium">{item.planQty - item.deliveredQty}</td>
                          <td className="px-3 py-2">
                            <input type="date" value={item.productionDate} onChange={(event) => updateItemField(item.id, 'productionDate', event.target.value)} className="w-full px-2 py-1 border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="date" value={item.expiryDate} onChange={(event) => updateItemField(item.id, 'expiryDate', event.target.value)} className="w-full px-2 py-1 border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="text" value={item.batchNo} onChange={(event) => updateItemField(item.id, 'batchNo', event.target.value)} className="w-24 px-2 py-1 border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="text" value={item.remark} onChange={(event) => updateItemField(item.id, 'remark', event.target.value)} placeholder="备注" className="w-32 px-2 py-1 border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">备注</h3>
                <textarea rows={3} placeholder="请输入备注信息..." value={deliveryRemark} onChange={(event) => setDeliveryRemark(event.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button onClick={() => setShowDeliveryDialog(false)} className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors">
                取消
              </button>
              <button onClick={() => handleSaveDeliveryEdit(false)} disabled={deliverySaving} className="px-6 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                保存
              </button>
              <button onClick={() => handleSaveDeliveryEdit(true)} disabled={deliverySaving} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
                提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
