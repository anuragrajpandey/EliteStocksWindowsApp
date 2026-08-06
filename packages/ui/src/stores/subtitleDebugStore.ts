import { create } from 'zustand';

export interface SubDebugEntry {
  id: number;
  time: string;
  area: string;
  msg: string;
}

interface SubtitleDebugState {
  entries: SubDebugEntry[];
  logSub: (area: string, msg: string) => void;
  clearSubLogs: () => void;
}

const MAX_ENTRIES = 300;
let nextId = 1;

export const useSubtitleDebugStore = create<SubtitleDebugState>((set) => ({
  entries: [],
  logSub: (area, msg) => {
    const entry: SubDebugEntry = {
      id: nextId++,
      time: new Date().toLocaleTimeString(),
      area,
      msg,
    };
    set((state) => ({
      entries: [...state.entries.slice(-(MAX_ENTRIES - 1)), entry],
    }));
  },
  clearSubLogs: () => set({ entries: [] }),
}));
