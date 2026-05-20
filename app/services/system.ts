import { requestJson } from '../lib/api';

export type SystemHealth = {
  ok: boolean;
  service: string;
  runtime: string;
};

export const systemHealthQueryKey = ['system-health'] as const;

export async function getSystemHealth() {
  const result = await requestJson<SystemHealth>('/health');
  return result.data;
}
