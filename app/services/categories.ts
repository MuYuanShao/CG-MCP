import { requestJson } from '../lib/api';

export type CategoryItem = {
  id: number;
  categoryName: string;
  sortOrder: number;
};

export type CategoryPayload = Pick<CategoryItem, 'categoryName' | 'sortOrder'>;

export const categoryQueryKey = ['product-categories'] as const;

export async function listCategories(): Promise<CategoryItem[]> {
  const result = await requestJson<CategoryItem[]>('/product-categories');
  return result.data;
}

export async function createCategory(payload: CategoryPayload): Promise<CategoryItem> {
  const result = await requestJson<CategoryItem>('/product-categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function updateCategory(id: number, payload: CategoryPayload): Promise<CategoryItem> {
  const result = await requestJson<CategoryItem>(`/product-categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function deleteCategories(ids: number[]): Promise<{ deleted: number }> {
  const result = await requestJson<{ deleted: number }>('/product-categories', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });
  return result.data;
}
