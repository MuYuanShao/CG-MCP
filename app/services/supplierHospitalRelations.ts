import { requestJson } from '../lib/api';

type IdList = {
  ids: number[];
};

export type SupplierHospitalMap = Record<string, number[]>;

export async function listSupplierIdsByHospital(hospitalId: number) {
  const result = await requestJson<IdList>(`/hospitals/${hospitalId}/suppliers`);
  return result.data.ids;
}

export async function saveSuppliersForHospital(hospitalId: number, ids: number[]) {
  const result = await requestJson<IdList>(`/hospitals/${hospitalId}/suppliers`, {
    method: 'PUT',
    body: JSON.stringify({ ids }),
  });
  return result.data.ids;
}

export async function listHospitalIdsBySupplier(supplierId: number) {
  const result = await requestJson<IdList>(`/suppliers/${supplierId}/hospitals`);
  return result.data.ids;
}

export async function listHospitalIdsBySuppliers() {
  const result = await requestJson<SupplierHospitalMap>('/suppliers/hospitals');
  return result.data;
}

export async function saveHospitalsForSupplier(supplierId: number, ids: number[]) {
  const result = await requestJson<IdList>(`/suppliers/${supplierId}/hospitals`, {
    method: 'PUT',
    body: JSON.stringify({ ids }),
  });
  return result.data.ids;
}

export async function saveHospitalsForSuppliers(supplierIds: number[], hospitalIds: number[]) {
  const result = await requestJson<SupplierHospitalMap>('/suppliers/hospitals', {
    method: 'PUT',
    body: JSON.stringify({ supplierIds, hospitalIds }),
  });
  return result.data;
}
