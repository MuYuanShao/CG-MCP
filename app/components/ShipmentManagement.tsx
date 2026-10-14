import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PackageCheck, RefreshCw, Send } from 'lucide-react';
import { useFeedback } from './AppFeedback';
import {
  createShipmentByDelivery,
  listDeliveryOrders,
  listShipmentOrders,
  outboundShipment,
  signShipment,
  type BusinessDocument,
} from '../services/purchase';

const shipmentStatusText: Record<string, string> = {
  pending_outbound: '待出库',
  outbound: '已出库',
  in_transit: '运输中',
  signed: '已签收',
  sign_exception: '签收异常',
};

const deliveryStatusText: Record<string, string> = {
  pending_ship: '待发货',
  pending_shipment: '待发货',
  picking: '拣货中',
  shipped: '已发货',
  logistics_exception: '物流异常',
  arrived: '已到货',
  withdrawn: '已撤回',
};

const statusClass: Record<string, string> = {
  pending_outbound: 'text-[#f59e0b] bg-[#f59e0b]/10',
  outbound: 'text-[#3b82f6] bg-[#3b82f6]/10',
  in_transit: 'text-[#8b5cf6] bg-[#8b5cf6]/10',
  signed: 'text-[#10b981] bg-[#10b981]/10',
  sign_exception: 'text-destructive bg-destructive/10',
};

export default function ShipmentManagement() {
  const { notify } = useFeedback();
  const queryClient = useQueryClient();
  const [selectedDeliveryId, setSelectedDeliveryId] = useState('');
  const [selectedShipmentRows, setSelectedShipmentRows] = useState<number[]>([]);

  const shipmentsQuery = useQuery({
    queryKey: ['shipment-orders'],
    queryFn: () => listShipmentOrders(),
  });
  const deliveriesQuery = useQuery({
    queryKey: ['delivery-orders'],
    queryFn: () => listDeliveryOrders(),
  });

  const shipments = shipmentsQuery.data?.records ?? [];
  const deliveries = deliveriesQuery.data?.records ?? [];
  const selectedShipment = shipments.find((shipment) => shipment.id === selectedShipmentRows[0]);
  const shipmentDeliveryNos = useMemo(() => new Set(shipments.map((shipment) => shipment.sourceNo)), [shipments]);
  const availableDeliveries = deliveries.filter((delivery) => !shipmentDeliveryNos.has(delivery.documentNo));

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['shipment-orders'] });
    queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
    queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
  };

  const createMutation = useMutation({
    mutationFn: (deliveryId: number) => createShipmentByDelivery(deliveryId),
    onSuccess: (shipment) => {
      notify.success(`已生成发货单 ${shipment.documentNo}`);
      setSelectedDeliveryId('');
      refreshAll();
    },
    onError: (error) => notify.error(error instanceof Error ? error.message : '生成发货单失败'),
  });

  const outboundMutation = useMutation({
    mutationFn: outboundShipment,
    onSuccess: (shipment) => {
      notify.success(`发货单 ${shipment.documentNo} 已出库`);
      refreshAll();
    },
    onError: (error) => notify.error(error instanceof Error ? error.message : '发货单出库失败'),
  });

  const signMutation = useMutation({
    mutationFn: signShipment,
    onSuccess: (shipment) => {
      notify.success(`发货单 ${shipment.documentNo} 已签收`);
      refreshAll();
    },
    onError: (error) => notify.error(error instanceof Error ? error.message : '发货单签收失败'),
  });

  const toggleShipment = (id: number) => {
    setSelectedShipmentRows((rows) => (rows.includes(id) ? rows.filter((rowId) => rowId !== id) : [id]));
  };

  const handleCreateShipment = () => {
    const deliveryId = Number(selectedDeliveryId);
    if (!deliveryId) {
      notify.warning('请选择一张配送单');
      return;
    }
    createMutation.mutate(deliveryId);
  };

  const renderStatus = (status: string) => (
    <span className={`px-2 py-1 rounded text-xs ${statusClass[status] ?? 'text-muted-foreground bg-muted'}`}>
      {shipmentStatusText[status] ?? status}
    </span>
  );

  const renderEmpty = () => {
    if (shipmentsQuery.isLoading) return <div className="p-8 text-center text-muted-foreground">正在加载发货单...</div>;
    if (shipmentsQuery.isError) return <div className="p-8 text-center text-destructive">发货单加载失败</div>;
    if (shipments.length === 0) return <div className="p-8 text-center text-muted-foreground">暂无发货单</div>;
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="p-4 border border-border rounded-lg bg-background">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedDeliveryId}
            onChange={(event) => setSelectedDeliveryId(event.target.value)}
            className="h-10 min-w-72 px-3 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">选择配送单生成发货单</option>
            {availableDeliveries.map((delivery) => (
              <option key={delivery.id} value={delivery.id}>
                {delivery.documentNo} / {delivery.sourceNo} / {deliveryStatusText[delivery.status] ?? delivery.status}
              </option>
            ))}
          </select>
          <button
            onClick={handleCreateShipment}
            disabled={!selectedDeliveryId || createMutation.isPending}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="size-4" />
            生成发货单
          </button>
          <button
            onClick={() => selectedShipment && outboundMutation.mutate(selectedShipment.id)}
            disabled={!selectedShipment || selectedShipment.status !== 'pending_outbound' || outboundMutation.isPending}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PackageCheck className="size-4" />
            出库
          </button>
          <button
            onClick={() => selectedShipment && signMutation.mutate(selectedShipment.id)}
            disabled={!selectedShipment || !['outbound', 'in_transit'].includes(selectedShipment.status) || signMutation.isPending}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PackageCheck className="size-4" />
            签收
          </button>
          <button
            onClick={refreshAll}
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
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">发货单号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">配送单号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">医院</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">金额</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">发货日期</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shipments.map((shipment: BusinessDocument) => (
                <tr key={shipment.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedShipmentRows.includes(shipment.id)}
                      onChange={() => toggleShipment(shipment.id)}
                      className="size-4 rounded border-border"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{shipment.documentNo}</td>
                  <td className="px-4 py-3 text-sm">{shipment.sourceNo}</td>
                  <td className="px-4 py-3">{shipment.hospital}</td>
                  <td className="px-4 py-3 text-right">{Number(shipment.amount ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">{shipment.businessDate ?? '-'}</td>
                  <td className="px-4 py-3 text-center">{renderStatus(shipment.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {renderEmpty()}
        <div className="px-6 py-4 border-t border-border text-sm text-muted-foreground">
          每页25条 · 共{shipments.length}条
        </div>
      </div>
    </div>
  );
}
