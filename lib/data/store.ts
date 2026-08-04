// Lightweight JSON-file-backed store for user-created artifacts.
// Works fully in `next dev` and on Node hosts; on serverless (Vercel) writes
// are ephemeral per-invocation, so we also re-seed deterministically.

import * as fs from "fs";
import * as path from "path";
import { getKpis, DQ_RULES, NOTIFICATIONS, type Kpi, type DqRule, type Notification } from "./enterprise";

interface StoreShape {
  kpis: Kpi[];
  rules: DqRule[];
  notifications: Notification[];
  drafts: Record<string, unknown>;
}

function initialState(): StoreShape {
  return {
    kpis: getKpis(),
    rules: JSON.parse(JSON.stringify(DQ_RULES)),
    notifications: NOTIFICATIONS,
    drafts: {},
  };
}

let store: StoreShape | null = null;

function storeFile(): string {
  return path.join(process.cwd(), ".data", "store.json");
}

export function loadStore(): StoreShape {
  if (store) return store;
  try {
    const raw = fs.readFileSync(storeFile(), "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    store = parsed;
  } catch {
    store = initialState();
  }
  return store;
}

export function saveStore(): void {
  if (!store) return;
  try {
    const dir = path.dirname(storeFile());
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(storeFile(), JSON.stringify(store, null, 2), "utf8");
  } catch {
    // non-fatal (e.g. serverless read-only fs)
  }
}

export const storeApi = {
  getKpis: (): Kpi[] => loadStore().kpis,
  getKpi: (id: string) => loadStore().kpis.find((k) => k.id === id),
  createKpi: (kpi: Kpi): Kpi => {
    loadStore().kpis.unshift(kpi);
    saveStore();
    return kpi;
  },
  getRules: (): DqRule[] => loadStore().rules,
  createRule: (rule: DqRule): DqRule => {
    loadStore().rules.unshift(rule);
    saveStore();
    return rule;
  },
  updateRule: (id: string, patch: Partial<DqRule>): DqRule | undefined => {
    const r = loadStore().rules.find((x) => x.id === id);
    if (r) Object.assign(r, patch);
    saveStore();
    return r;
  },
  getNotifications: (): Notification[] => loadStore().notifications,
  markRead: (id: string): void => {
    const n = loadStore().notifications.find((x) => x.id === id);
    if (n) n.read = true;
    saveStore();
  },
  markAllRead: (): void => {
    loadStore().notifications.forEach((n) => (n.read = true));
    saveStore();
  },
};
