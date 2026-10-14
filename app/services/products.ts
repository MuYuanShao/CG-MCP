import { requestJson } from '../lib/api';
import type { PageResult } from './purchase';

export type ProductItem = {
  id: number;
  code: string;
  name: string;
  genericName: string;
  spec: string;
  model: string;
  unitPrice: number;
  unit: string;
  registrationNo: string;
  medicalInsuranceCode: string;
  udi: string;
  category: string;
  manufacturer: string;
  distributor: string;
  brand: string;
  isImported: number;
  isVolume: number;
  volumeCategory: string;
  zcLocalCode: string;
  mediumPackage: number;
  largePackage: number;
  hospitalContractCode: string;
  status: string;
};

export type ProductPayload = Omit<ProductItem, 'id'>;

export const productQueryKey = ['products'] as const;

export async function listProducts(current = 1, size = 20) {
  const search = new URLSearchParams({ current: String(current), size: String(size) });
  const result = await requestJson<PageResult<ProductItem> | ProductItem[]>(`/products?${search.toString()}`);
  if (Array.isArray(result.data)) {
    return { records: result.data, total: result.data.length, current: 1, size: result.data.length };
  }
  return result.data;
}

export async function createProduct(payload: ProductPayload) {
  const result = await requestJson<ProductItem>('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function updateProduct(id: number, payload: ProductPayload) {
  const result = await requestJson<ProductItem>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function deleteProducts(ids: number[]) {
  const result = await requestJson<{ deleted: number }>('/products', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });
  return result.data;
}
