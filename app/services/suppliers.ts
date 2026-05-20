import { requestJson } from '../lib/api';

export type SupplierStatus = 'active' | 'inactive';

export type SupplierItem = {
  id: number;
  code: string;
  name: string;
  category: string;
  city: string;
  contact: string;
  phone: string;
  status: SupplierStatus;
  cooperationDate: string;
};

export type SupplierPayload = Pick<
  SupplierItem,
  'code' | 'name' | 'category' | 'city' | 'contact' | 'phone' | 'status'
>;

export const supplierQueryKey = ['suppliers'] as const;

export async function listSuppliers() {
  const result = await requestJson<SupplierItem[]>('/suppliers');
  return result.data;
}

export async function createSupplier(payload: SupplierPayload) {
  const result = await requestJson<SupplierItem>('/suppliers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function updateSupplier(id: number, payload: SupplierPayload) {
  const result = await requestJson<SupplierItem>(`/suppliers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function deleteSuppliers(ids: number[]) {
  const result = await requestJson<{ deleted: number }>('/suppliers', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });
  return result.data;
}
