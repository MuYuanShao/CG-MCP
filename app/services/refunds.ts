import { requestJson } from '../lib/api';

export type RefundStatus = 'pending_audit' | 'approved' | 'returning' | 'completed' | 'rejected' | 'closed';

export type RefundItem = {
  id: number;
  refundNo: string;
  hospital: string;
  relatedOrderNo: string;
  productName: string;
  batchNo: string;
  refundQty: number;
  refundAmount: number;
  reason: string;
  applyDate: string;
  status: RefundStatus;
};

export type RefundPayload = Pick<
  RefundItem,
  'relatedOrderNo' | 'hospital' | 'productName' | 'batchNo' | 'refundQty' | 'refundAmount' | 'reason' | 'applyDate'
>;

export type RefundSyncPayload = RefundPayload & {
  refundNo: string;
  status?: RefundStatus;
};

export const refundQueryKey = ['refunds'] as const;

export async function listRefunds() {
  const result = await requestJson<RefundItem[]>('/refunds');
  return result.data;
}

export async function createRefund(payload: RefundPayload) {
  const result = await requestJson<RefundItem>('/refunds', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function syncRefunds(payload: RefundSyncPayload[]) {
  const result = await requestJson<RefundItem[]>('/refunds/sync', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function updateRefund(id: number, payload: RefundPayload) {
  const result = await requestJson<RefundItem>(`/refunds/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function approveRefund(id: number) {
  const result = await requestJson<RefundItem>(`/refunds/${id}/approve`, { method: 'POST' });
  return result.data;
}

export async function rejectRefund(id: number) {
  const result = await requestJson<RefundItem>(`/refunds/${id}/reject`, { method: 'POST' });
  return result.data;
}

export async function outboundRefund(id: number) {
  const result = await requestJson<RefundItem>(`/refunds/${id}/outbound`, { method: 'POST' });
  return result.data;
}
