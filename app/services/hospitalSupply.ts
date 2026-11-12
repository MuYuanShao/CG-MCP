import { requestJson } from '../lib/api';
import type { Phase3Page } from './phase3';
export type HospitalOrder = { orderNo: string; supplierCode: string; sourcePlanNo?: string; status: string; totalAmount: number; currency: string; items: { lineId: string; productCode: string; unit: string; quantity: number }[] };
export type SupplyOptions = { warehouses: { code: string; name: string }[]; items: { lineId: string; productCode: string; unit: string; remainingQuantity: string }[] };
export type SupplyLine = { supplyLineId: string; orderLineId: string; productCode: string; unit: string; quantity: string; productionBatchNo: string; productionDate: string; expireDate: string; udiCode: string };
export type SupplyBody = { supplyNo: string; warehouseCode: string; remark: string; items: SupplyLine[] };
export type SupplyDraft = { draftId: string; instanceId: string; orderNo: string; supplierCode: string; hospital: string; body: SupplyBody };
export type SupplyReceipt = { receivingNo: string; receivingStatus: string; quantity?: string; qualifiedQuantity?: string; unqualifiedQuantity?: string; quantities?: { unit: string; quantity: string; qualifiedQuantity: string; unqualifiedQuantity: string }[] };
export type SupplyRow = { messageId: string; supplyNo: string; state: string; message?: string; result?: SupplyReceipt; createdAt: string };
export type SupplyDocument = SupplyRow & { instanceId: string; orderNo: string; supplierCode: string; hospital: string };
const base = (id: string) => `/integration/instances/${encodeURIComponent(id)}/phase3`;
export const supplyCapability = async () => (await requestJson<{ enabled: boolean }>('/integration/phase3/supply-capability')).data;
export const hospitalOrders = async (id: string, page: number, query: string) => (await requestJson<Phase3Page<HospitalOrder>>(`${base(id)}/purchase-orders?${new URLSearchParams({ page: String(page), size: '20', query })}`)).data;
export const supplyOptions = async (id: string, no: string) => (await requestJson<SupplyOptions>(`${base(id)}/purchase-orders/${encodeURIComponent(no)}/supply-options`)).data;
export const submitSupply = async (id: string, no: string, key: string, body: SupplyBody) => (await requestJson(`${base(id)}/purchase-orders/${encodeURIComponent(no)}/supplies`, { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(body) })).data;
export const supplyHistory = async (id: string, no: string, page: number) => (await requestJson<Phase3Page<SupplyRow>>(`${base(id)}/purchase-orders/${encodeURIComponent(no)}/supplies?page=${page}&size=20`)).data;
export const refreshSupply = async (id: string, key: string) => (await requestJson<SupplyReceipt>(`${base(id)}/supplies/${encodeURIComponent(key)}/refresh`, { method: 'POST' })).data;
export const retrySupply = async (id: string, key: string) => (await requestJson(`${base(id)}/supplies/${encodeURIComponent(key)}/retry`, { method: 'POST' })).data;
export const supplyItems = async (id: string, key: string, page: number) => (await requestJson<Phase3Page<SupplyLine>>(`${base(id)}/supplies/${encodeURIComponent(key)}/items?page=${page}&size=20`)).data;
const draftPath = (id: string, no: string) => `${base(id)}/purchase-orders/${encodeURIComponent(no)}/supply-draft`;
export const listSupplyDrafts = async () => (await requestJson<SupplyDraft[]>('/integration/phase3/supply-drafts')).data;
export const listSupplyOrders = async (page: number) => (await requestJson<Phase3Page<SupplyDocument>>(`/integration/phase3/supply-orders?page=${page}&size=20`)).data;
export const openSupplyDraft = async (id: string, no: string) =>
  (await requestJson<SupplyDraft>(draftPath(id, no), { method: 'POST' })).data;
export const saveSupplyDraft = async (draft: SupplyDraft, body: SupplyBody) =>
  (await requestJson<SupplyDraft>(`${draftPath(draft.instanceId, draft.orderNo)}/${encodeURIComponent(draft.draftId)}`,
    { method: 'PUT', body: JSON.stringify(body) })).data;
