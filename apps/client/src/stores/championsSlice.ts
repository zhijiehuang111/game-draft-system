import type { Champion } from '@app/shared';
import type { StateCreator } from 'zustand';
import type { AppStore } from './index.js';

export interface ChampionsSlice {
  champions: Record<string, Champion>;
  setChampions(list: readonly Champion[]): void;
}

export const createChampionsSlice: StateCreator<AppStore, [], [], ChampionsSlice> = (set) => ({
  champions: {},
  setChampions: (list) =>
    set({
      champions: Object.fromEntries(list.map((c) => [c.id, c])),
    }),
});
