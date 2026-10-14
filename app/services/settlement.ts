import { requestJson } from '../lib/api';

export interface SettlementItem {
  id: number;
  settlementNo: string;
  hospital: string;
  settlementStart: string;
  settlementEnd: string;
  amount: number;
  status: number;
}

export interface SettlementItemDetail {
  id: number;
  acceptanceNo: string;
  productCode: string;
  productName: string;
  spec: string;
  batchNo: string;
  registrationNo: string;
  qty: number;
  price: number;
  amount: number;
}

export async function listSettlements(): Promise<SettlementItem[]> {
  const result = await requestJson<SettlementItem[]>('/api/settlements');
  return result.data;
}

export async function getSettlementById(id: number): Promise<SettlementItem> {
  const result = await requestJson<SettlementItem>(`/api/settlements/${id}`);
  return result.data;
}

export async function getSettlementItems(id: number): Promise<SettlementItemDetail[]> {
  const result = await requestJson<SettlementItemDetail[]>(`/api/settlements/${id}/items`);
  return result.data;
}
