import { requestFormData, requestJson } from '../lib/api';

export type LicenseItem = {
  id: number;
  licenseCode: string;
  licenseName: string;
  licenseType: string;
  relatedProduct: string;
  hospitalName: string;
  issueDate: string | null;
  expiryDate: string | null;
  expiryStatus: 'normal' | 'warning' | 'urgent' | 'critical' | 'expired';
  status: 'pending' | 'active' | 'rejected' | 'expired';
  fileUrl?: string | null;
  remark?: string | null;
};

export type LicenseSearchParams = {
  licenseType: string;
  productName: string;
  manufacturer: string;
  registrationNo: string;
  contractCode: string;
  licenseCode: string;
};

export type LicenseSavePayload = {
  licenseCode: string;
  licenseName: string;
  licenseType: string;
  relatedProduct: string;
  hospitalName: string;
  issueDate: string;
  expiryDate: string;
  fileUrl: string;
  remark: string;
};

export type LicenseUploadResult = {
  fileUrl: string;
  originalFilename: string;
  size: number;
  contentType: string;
};

export async function searchLicenses(params: LicenseSearchParams) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value.trim()) search.set(key, value.trim());
  });
  const result = await requestJson<LicenseItem[]>(`/licenses${search.toString() ? `?${search}` : ''}`);
  return result.data;
}

export async function uploadLicenseImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const result = await requestFormData<LicenseUploadResult>('/licenses/upload', {
    method: 'POST',
    body: formData,
  });
  return result.data;
}

export async function createLicense(payload: LicenseSavePayload) {
  const result = await requestJson<LicenseItem>('/licenses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function updateLicense(id: number, payload: LicenseSavePayload) {
  const result = await requestJson<LicenseItem>(`/licenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function deleteLicenses(ids: number[]) {
  const result = await requestJson<{ deleted: number }>('/licenses', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });
  return result.data;
}
