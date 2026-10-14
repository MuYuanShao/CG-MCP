import { X, Plus, Minus } from 'lucide-react';
import type { DeliveryEdit } from '../services/purchase';

interface DeliveryItem {
  id: number;
  productCode: string;
  productName: string;
  spec: string;
  model: string;
  unit: string;
  unitPrice: number;
  manufacturer: string;
  planQty: number;
  deliveredQty: number;
  productionDate: string;
  expiryDate: string;
  batchNo: string;
  remark: string;
}

function getReadableDeliveryStatusText(status: string) {
  switch (status) {
    case 'pending_ship':
    case 'pending_shipment':
      return '待发货';
    case 'picking':
      return '拣货中';
    case 'shipped':
      return '已发货';
    case 'logistics_exception':
      return '物流异常';
    case 'arrived':
      return '已到货';
    case 'withdrawn':
      return '已撤销';
    default:
      return status;
  }
}

interface DeliveryEditDialogProps {
  open: boolean;
  onClose: () => void;
  deliveryContext: DeliveryEdit | null;
  deliveryDate: string;
  deliveryRemark: string;
  deliveryItems: DeliveryItem[];
  deliverySaving: boolean;
  deliveryDialogLocked: boolean;
  onSave: (submitted: boolean) => void;
  onUpdateDate: (date: string) => void;
  onUpdateRemark: (remark: string) => void;
  onUpdateItemField: (id: number, field: string, value: string) => void;
  onUpdateItemQty: (id: number, qty: number) => void;
}

export default function DeliveryEditDialog({
  open,
  onClose,
  deliveryContext,
  deliveryDate,
  deliveryRemark,
  deliveryItems,
  deliverySaving,
  deliveryDialogLocked,
  onSave,
  onUpdateDate,
  onUpdateRemark,
  onUpdateItemField,
  onUpdateItemQty,
}: DeliveryEditDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium">计划转订单</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              该操作会生成采购订单，请补充订单数量、生产日期、失效日期、批号、UID 等履约信息后确认生成。
            </p>
            {deliveryDialogLocked && (
              <p className="mt-2 text-sm text-destructive">
                当前采购订单已{getReadableDeliveryStatusText(deliveryContext?.status ?? '')}，不能再次保存。
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-accent rounded transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="border border-border rounded-lg p-4">
            <h3 className="font-medium mb-4">订单信息</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-2">采购订单号</label>
                <input type="text" value={deliveryContext?.orderNo ?? ''} disabled className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm mb-2">订单状态</label>
                <input type="text" value={deliveryContext ? getReadableDeliveryStatusText(deliveryContext.status) : ''} disabled className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-sm mb-2">订单日期 <span className="text-destructive">*</span></label>
                <input type="date" value={deliveryDate} onChange={(e) => onUpdateDate(e.target.value)} disabled={deliveryDialogLocked} className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          </div>

          <div className="border border-border rounded-lg p-4">
            <h3 className="font-medium mb-4">订单商品明细</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">商品编码</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">商品名称</th>
                    <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">规格</th>
                    <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">计划数量</th>
                    <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">订单数量</th>
                    <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">剩余数量</th>
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
                          <button onClick={() => onUpdateItemQty(item.id, item.deliveredQty - 1)} disabled={deliveryDialogLocked} className="p-1 hover:bg-accent rounded transition-colors">
                            <Minus className="size-3" />
                          </button>
                          <input type="number" value={item.deliveredQty} onChange={(e) => onUpdateItemQty(item.id, parseInt(e.target.value) || 0)} disabled={deliveryDialogLocked}
                            className="w-16 px-2 py-1 text-center border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm" min="0" max={item.planQty} />
                          <button onClick={() => onUpdateItemQty(item.id, item.deliveredQty + 1)} disabled={deliveryDialogLocked} className="p-1 hover:bg-accent rounded transition-colors">
                            <Plus className="size-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-medium">{item.planQty - item.deliveredQty}</td>
                      <td className="px-3 py-2">
                        <input type="date" value={item.productionDate} onChange={(e) => onUpdateItemField(item.id, 'productionDate', e.target.value)} disabled={deliveryDialogLocked}
                          className="w-full px-2 py-1 border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="date" value={item.expiryDate} onChange={(e) => onUpdateItemField(item.id, 'expiryDate', e.target.value)} disabled={deliveryDialogLocked}
                          className="w-full px-2 py-1 border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={item.batchNo} onChange={(e) => onUpdateItemField(item.id, 'batchNo', e.target.value)} disabled={deliveryDialogLocked}
                          className="w-24 px-2 py-1 border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="text" value={item.remark} onChange={(e) => onUpdateItemField(item.id, 'remark', e.target.value)} placeholder="备注" disabled={deliveryDialogLocked}
                          className="w-32 px-2 py-1 border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border border-border rounded-lg p-4">
            <h3 className="font-medium mb-4">备注</h3>
            <textarea rows={3} placeholder="请输入备注信息..." value={deliveryRemark} onChange={(e) => onUpdateRemark(e.target.value)} disabled={deliveryDialogLocked}
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors">取消</button>
          <button onClick={() => onSave(false)} disabled={deliverySaving || deliveryDialogLocked}
            className="px-6 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed">保存草稿</button>
          <button onClick={() => onSave(true)} disabled={deliverySaving || deliveryDialogLocked}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">确认生成订单</button>
        </div>
      </div>
    </div>
  );
}
