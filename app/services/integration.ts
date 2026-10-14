import { requestJson } from '../lib/api';

export type SpdInstance = { id: string; name: string; organization: string; endpoint: string; tokenEnv: string; enabled: boolean };
export type InstancePayload = Omit<SpdInstance, 'id'>;
export type SyncLog = { id: string; batchId: string; instanceId: string; direction: string; kind: string; sourceCode: string; state: string; message: string; createdTime: string };
export type Master = { sourceCode: string; name: string; creditCode?: string; contactName?: string; contactPhone?: string; status: string; sourceUpdatedAt: string };
export type Order = { orderNo: string; supplierCode: string; orderDate: string; status: string; totalAmount: number; currency: string; taxIncluded: boolean; sourceUpdatedAt: string; items: { lineId: string; productCode: string; quantity: number; unit: string; unitPrice: number; amount: number }[] };
export type StoredRecord<T> = { instanceId: string; kind: string; sourceCode: string; sourceUpdatedAt: string; payload: T };
export type ReportGroup = { productCode: string; productName: string; manufacturer: string; unit: string; currency: string; taxIncluded: boolean; orderCount: number; quantity: number; amount: number };
export type PricePoint = { date: string; productCode: string; productName: string; unit: string; currency: string; taxIncluded: boolean; unitPrice: number };
export type ProcurementReport = { orderCount: number; groups: ReportGroup[]; prices: PricePoint[] };
const base = '/integration';
export async function listInstances() { return (await requestJson<SpdInstance[]>(`${base}/instances`)).data; }
export async function saveInstance(payload: InstancePayload, id?: string) {
  return (await requestJson<SpdInstance>(`${base}/instances${id ? `/${encodeURIComponent(id)}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(payload) })).data;
}
export async function dispatchProducts(id: string, productIds: number[], licensesOnly = false) {
  return (await requestJson<SyncLog[]>(`${base}/instances/${encodeURIComponent(id)}/dispatch`, { method: 'POST', body: JSON.stringify({ productIds, licensesOnly }) })).data;
}
export async function listSyncLogs(id: string) { return (await requestJson<SyncLog[]>(`${base}/instances/${encodeURIComponent(id)}/logs`)).data; }
export async function retrySync(id: string) { return (await requestJson<SyncLog>(`${base}/logs/${encodeURIComponent(id)}/retry`, { method: 'POST' })).data; }
export async function listIntegrationRecords<T>(id: string, kind: string) { return (await requestJson<StoredRecord<T>[]>(`${base}/instances/${encodeURIComponent(id)}/records/${kind}`)).data; }
export async function procurementReport(id: string, filters: Record<string, string>) {
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
  return (await requestJson<ProcurementReport>(`${base}/instances/${encodeURIComponent(id)}/report?${query}`)).data;
}
export const syncStates: Record<string, string> = { pending: '等待发送', accepted: '接口已接收', processed: '处理成功', failed: '失败／待处理', ignored: '重复或旧版本', retried: '已重试' };
export const orderStates: Record<string, string> = { draft: '草稿', pending_approval: '待审批', approved: '审批通过', sent: '已发送供应商', rejected: '已驳回', voided: '已作废', submitted: '已提交', confirmed: '已确认', partial_shipped: '部分发货', shipped: '已发货', arrived: '已到货', accepted: '已验收', completed: '已完成', closed: '已关闭', cancelled: '已取消' };
