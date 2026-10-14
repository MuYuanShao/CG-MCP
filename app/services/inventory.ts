import { requestJson } from '../lib/api';
import type { PageResult } from './purchase';
import { toPageResult } from './pagination';

export type InventoryLedgerItem = {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  spec: string;
  warehouse: string;
  location: string;
  totalQty: number;
  availableQty: number;
  lockedQty: number;
  expiryStatus: 'normal' | 'warning' | 'urgent' | 'critical' | 'expired';
  status: 'normal' | 'low' | 'out';
};

export type InventoryBatchDetail = {
  id: number;
  productName: string;
  spec: string;
  model: string;
  batchNo: string;
  expiryDate: string | null;
  quantity: number;
};

export async function listInventoryLedger(current = 1, size = 20) {
  const search = new URLSearchParams({ current: String(current), size: String(size) });
  const result = await requestJson<PageResult<InventoryLedgerItem> | InventoryLedgerItem[]>(`/inventory-ledger?${search.toString()}`);
  return toPageResult(result.data);
}

export async function listInventoryBatchDetails(productId: number, current = 1, size = 10) {
  const search = new URLSearchParams({
    current: String(current),
    size: String(size),
  });
  const result = await requestJson<PageResult<InventoryBatchDetail>>(
    `/inventory-ledger/${productId}/details?${search.toString()}`,
  );
  return result.data;
}
