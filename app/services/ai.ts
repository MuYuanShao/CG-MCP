import { requestJson } from '../lib/api';

export type AiSearchResponse = {
  answer: string;
  model: string;
};

export async function aiSearch(query: string) {
  const result = await requestJson<AiSearchResponse>('/ai/search', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
  return result.data;
}
