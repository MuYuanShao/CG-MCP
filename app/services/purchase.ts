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
  canApprove?: boolean;
  canEdit?: boolean;
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

export type ApprovalScopeOption = { id: number; code: string; name: string };
export type ApprovalScopeConfig = {
  workflowCode: string;
  roles: ApprovalScopeOption[];
  users: ApprovalScopeOption[];
  selectedRoleIds: number[];
  selectedUserIds: number[];
};

export async function getPurchasePlanApprovalScope() {
  const result = await requestJson<ApprovalScopeConfig>('/approval-scopes/purchase-plan');
  return result.data;
}

export async function updatePurchasePlanApprovalScope(roleIds: number[], userIds: number[]) {
  const result = await requestJson<ApprovalScopeConfig>('/approval-scopes/purchase-plan', {
    method: 'PUT',
    body: JSON.stringify({ roleIds, userIds }),
  });
  return result.data;
}

export type PurchaseOrderDetailSearchParams = {
  productCode?: string;
  productName?: string;
  batchNo?: string;
  manufacturer?: string;
  current?: number;
  size?: number;
};

export async function listPurchasePlans(current = 1, size = 20) {
  const search = new URLSearchParams({ current: String(current), size: String(size) });
  const result = await requestJson<PageResult<BusinessDocument> | BusinessDocument[]>(`/purchase-plans?${search.toString()}`);
  return Array.isArray(result.data)
    ? { records: result.data, total: result.data.length, current, size }
    : result.data;
}

export async function approvePurchasePlan(planId: number) {
  const result = await requestJson<{ approved: boolean }>(`/purchase-plans/${planId}/approve`, { method: 'POST' });
  return result.data;
}

export async function rejectPurchasePlan(planId: number) {
  const result = await requestJson<{ rejected: boolean }>(`/purchase-plans/${planId}/reject`, { method: 'POST' });
  return result.data;
}

export async function submitPurchasePlan(planId: number) {
  return (await requestJson<{ submitted: boolean }>(`/purchase-plans/${planId}/submit`, { method: 'POST' })).data;
}

export async function updatePurchasePlan(
  planId: number,
  payload: { quantity: number; unitPrice: number; expectedDeliveryDate: string },
) {
  const result = await requestJson<{ updated: boolean }>(`/purchase-plans/${planId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
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

export async function listPurchaseOrders(params: PurchaseOrderSearchParams = {}, current = 1, size = 20) {
  const search = new URLSearchParams();
  search.set('current', String(current));
  search.set('size', String(size));
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  const result = await requestJson<PageResult<BusinessDocument> | BusinessDocument[]>(`/purchase-orders?${query}`);
  return Array.isArray(result.data) ? { records: result.data, total: result.data.length, current: 1, size: result.data.length } : result.data;
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

export async function listDeliveryOrders(current = 1, size = 20) {
  const search = new URLSearchParams({ current: String(current), size: String(size) });
  const result = await requestJson<PageResult<BusinessDocument> | BusinessDocument[]>(`/delivery-orders?${search.toString()}`);
  return Array.isArray(result.data) ? { records: result.data, total: result.data.length, current: 1, size: result.data.length } : result.data;
}

export async function listShipmentOrders(current = 1, size = 20) {
  const search = new URLSearchParams({ current: String(current), size: String(size) });
  const result = await requestJson<PageResult<BusinessDocument> | BusinessDocument[]>(`/shipment-orders?${search.toString()}`);
  return Array.isArray(result.data) ? { records: result.data, total: result.data.length, current: 1, size: result.data.length } : result.data;
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
