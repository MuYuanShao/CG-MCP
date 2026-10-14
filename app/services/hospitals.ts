import { requestJson } from '../lib/api';
import type { PageResult } from './purchase';
import { toPageResult } from './pagination';

export type HospitalStatus = 'active' | 'inactive';

export type HospitalItem = {
  id: number;
  code: string;
  name: string;
  level: string;
  city: string;
  contact: string;
  phone: string;
  status: HospitalStatus;
  cooperationDate: string;
};

export type HospitalPayload = Pick<
  HospitalItem,
  'code' | 'name' | 'level' | 'city' | 'contact' | 'phone' | 'status'
>;

export const hospitalQueryKey = ['hospitals'] as const;

export async function listHospitals(current = 1, size = 20) {
  const search = new URLSearchParams({ current: String(current), size: String(size) });
  const result = await requestJson<PageResult<HospitalItem> | HospitalItem[]>(`/hospitals?${search.toString()}`);
  return toPageResult(result.data);
}

export async function createHospital(payload: HospitalPayload) {
  const result = await requestJson<HospitalItem>('/hospitals', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function updateHospital(id: number, payload: HospitalPayload) {
  const result = await requestJson<HospitalItem>(`/hospitals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function deleteHospitals(ids: number[]) {
  const result = await requestJson<{ deleted: number }>('/hospitals', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });
  return result.data;
}
