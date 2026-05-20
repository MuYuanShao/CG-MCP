import { requestJson } from '../lib/api';

export type DeliveryEditItem = {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  spec: string;
  model: string;
  unit: string;
  unitPrice: number;
  manufacturer: string;
  planQty: number;
  deliveredQty: number;
  productionDate: string | null;
  expiryDate: string | null;
  batchNo: string;
  remark: string;
};

export type DeliveryEdit = {
  planId: number;
  planNo: string;
  orderId: number;
  orderNo: string;
  deliveryId: number;
  deliveryNo: string;
  deliveryDate: string | null;
  status: string;
  remark: string;
  items: DeliveryEditItem[];
};

export type BusinessDocument = {
  id: number;
  documentNo: string;
  sourceNo: string;
  hospital: string;
  productName: string;
  quantity: number | null;
  amount: number | null;
  businessDate: string | null;
  status: string;
};

export type PurchaseOrderSearchParams = {
  orderNo?: string;
  sourcePlan?: string;
  productName?: string;
  hospital?: string;
  startDate?: string;
  endDate?: string;
};

export type PageResult<T> = {
  records: T[];
  total: number;
  current: number;
  size: number;
};

export type PurchaseOrderDetailSearchParams = {
  productCode?: string;
  productName?: string;
  batchNo?: string;
  manufacturer?: string;
  current?: number;
  size?: number;
};

export async function listPurchasePlans() {
  const result = await requestJson<BusinessDocument[]>('/purchase-plans');
  return result.data;
}

export type DeliveryEditSavePayload = {
  deliveryDate: string | null;
  remark: string;
  submitted?: boolean;
  items: Array<{
    id: number;
    productId: number;
    planQty: number;
    deliveredQty: number;
    productionDate: string | null;
    expiryDate: string | null;
    batchNo: string;
    remark: string;
  }>;
};

export async function createDeliveryEditByPlan(planNo: string) {
  const result = await requestJson<DeliveryEdit>(`/purchase-plans/${encodeURIComponent(planNo)}/delivery-edit`, {
    method: 'POST',
  });
  return result.data;
}

export async function listPurchaseOrders(params: PurchaseOrderSearchParams = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  const result = await requestJson<BusinessDocument[]>(`/purchase-orders${query ? `?${query}` : ''}`);
  return result.data;
}

export async function getPurchaseOrderDetails(orderId: number, params: PurchaseOrderDetailSearchParams = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  const result = await requestJson<PageResult<DeliveryEditItem>>(
    `/purchase-orders/${orderId}/items${query ? `?${query}` : ''}`,
  );
  return result.data;
}

export async function listDeliveryOrders() {
  const result = await requestJson<BusinessDocument[]>('/delivery-orders');
  return result.data;
}

export async function listShipmentOrders() {
  const result = await requestJson<BusinessDocument[]>('/shipment-orders');
  return result.data;
}

export async function confirmPurchaseOrder(orderId: number) {
  const result = await requestJson<BusinessDocument>(`/purchase-orders/${orderId}/confirm`, {
    method: 'POST',
  });
  return result.data;
}

export async function createDeliveryEditByOrder(orderId: number) {
  const result = await requestJson<DeliveryEdit>(`/purchase-orders/${orderId}/delivery-edit`, {
    method: 'POST',
  });
  return result.data;
}

export async function saveDeliveryEdit(deliveryId: number, payload: DeliveryEditSavePayload) {
  const result = await requestJson<DeliveryEdit>(`/delivery-orders/${deliveryId}/edit`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function submitDelivery(deliveryId: number) {
  const result = await requestJson<{ submitted: boolean }>(`/delivery-orders/${deliveryId}/submit`, {
    method: 'POST',
  });
  return result.data;
}

export async function deleteDeliveryOrders(ids: number[]) {
  const result = await requestJson<{ deleted: number }>('/delivery-orders', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });
  return result.data;
}

export async function createShipmentByDelivery(deliveryId: number) {
  const result = await requestJson<BusinessDocument>(`/delivery-orders/${deliveryId}/shipment`, {
    method: 'POST',
  });
  return result.data;
}

export async function outboundShipment(shipmentId: number) {
  const result = await requestJson<BusinessDocument>(`/shipment-orders/${shipmentId}/outbound`, {
    method: 'POST',
  });
  return result.data;
}

export async function signShipment(shipmentId: number) {
  const result = await requestJson<BusinessDocument>(`/shipment-orders/${shipmentId}/sign`, {
    method: 'POST',
  });
  return result.data;
}
