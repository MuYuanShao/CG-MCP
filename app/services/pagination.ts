import type { PageResult } from './purchase';

/** Normalize current list APIs and adapters that provide a paginated response. */
export function toPageResult<T>(data: PageResult<T> | T[]): PageResult<T> {
  return Array.isArray(data)
    ? { records: data, total: data.length, current: 1, size: data.length }
    : data;
}
