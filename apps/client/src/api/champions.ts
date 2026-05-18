import type { Champion } from '@app/shared';
import { request } from './http.js';

export async function fetchChampions(): Promise<Champion[]> {
  const { champions } = await request<{ champions: Champion[] }>('/champions');
  return champions;
}
