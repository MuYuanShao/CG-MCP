import { requestJson } from '../lib/api';
import type { SpdInstance } from './integration';
export type Phase3Kind = 'purchase-plans' | 'settlements';
export type Phase3Page<T> = { rows: T[]; total: number; page: number; size: number };
export type Phase3Document = { sourceId: string; documentNo: string; supplierCode: string; revision: string; operation: 'UPSERT' | 'CANCEL'; sourceStatus: string; totalAmount: string | null; currency: string | null; payload: Record<string, unknown> };
export type Phase3Item = { sourceLineId: string; productCode: string; unit: string; plannedQuantity?: string; quantity?: string; unitPrice?: string; amount?: string; priceBasis?: string; estimatedUnitPrice?: string | null; estimatedAmount?: string | null; sourceBizType?: string; sourceBizId?: string; systemBatchNo?: string | null };
export type Phase3Feedback = { messageId: string; state: string; message?: string; createdAt: string; payload: string };
const base = (id: string) => `/integration/instances/${encodeURIComponent(id)}/phase3`;
export async function phase3Instances() { return (await requestJson<SpdInstance[]>('/integration/phase3/instances')).data; }
export async function phase3Documents(id: string, kind: Phase3Kind, page: number, size: number, query: string) {
  return (await requestJson<Phase3Page<Phase3Document>>(`${base(id)}/${kind}?${new URLSearchParams({ page: String(page), size: String(size), query })}`)).data;
}
export async function phase3Items(id: string, kind: Phase3Kind, source: string, page: number) {
  return (await requestJson<Phase3Page<Phase3Item>>(`${base(id)}/${kind}/${encodeURIComponent(source)}/items?page=${page}&size=20`)).data;
}
export async function phase3Feedbacks(id: string, source: string) { return (await requestJson<Phase3Feedback[]>(`${base(id)}/settlements/${encodeURIComponent(source)}/feedback`)).data; }
export async function phase3Feedback(id: string, source: string, key: string, body: { revision: string; feedbackType: string; reason: string }) {
  return (await requestJson<{ messageId: string; state: string }>(`${base(id)}/settlements/${encodeURIComponent(source)}/feedback`, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(body) })).data;
}
export async function phase3SupplierAccess(id: string, username: string, supplierCode: string, remove = false) {
  return (await requestJson(`${base(id)}/supplier-access`, { method: 'POST', body: JSON.stringify({ username, supplierCode, remove }) })).data;
}
export function exactMoney(value: string | null | undefined) {
  if (value == null) return '—';
  const [integer = '0', decimal = ''] = value.split('.');
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${decimal.padEnd(4, '0')}`;
}
