import { requestJson } from '../lib/api';

type FrontendOperationLogInput = {
  moduleCode: string;
  actionCode: string;
  message: string;
  businessId?: string;
  details?: Record<string, unknown>;
};

export async function recordFrontendOperation(input: FrontendOperationLogInput) {
  try {
    await requestJson<{ saved: boolean }>('/operation-logs', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  } catch {
    // Operation logging must never block the user's primary workflow.
  }
}
