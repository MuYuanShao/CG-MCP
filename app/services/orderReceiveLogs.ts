import { requestJson } from '../lib/api';
import type { PageResult } from './purchase';

export type OrderReceiveLog = {
  id: string;
  orderNo: string;
  state: string;
  reason: string;
  failureCode?: string;
  httpStatus: number;
  createdTime: string;
  retryResult?: string;
};

export type OrderReceiveLogDetail = { log: OrderReceiveLog; parameters: Record<string, unknown>; parametersJson?: string };

function path(id: string) {
  return `/integration/instances/${encodeURIComponent(id)}/order-receive-logs`;
}

export async function listOrderReceiveLogs(id: string, orderNo: string, page: number) {
  const query = new URLSearchParams({ orderNo, page: String(page) });
  return (await requestJson<PageResult<OrderReceiveLog>>(`${path(id)}?${query}`)).data;
}

export async function getOrderReceiveLog(id: string, logId: string) {
  return (await requestJson<OrderReceiveLogDetail>(`${path(id)}/${encodeURIComponent(logId)}`)).data;
}
