import { requestJson } from '../lib/api';

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

export async function listProducts() {
  const result = await requestJson<ProductItem[]>('/products');
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
