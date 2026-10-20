"use client";
// Optional Google sign-in with cloud-synced progress, powered by Supabase.
// Without NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY nothing here runs and progress stays on the device.
// Setup steps are in SETUP-SIGNIN.md; the table is in supabase/schema.sql.
import { useSyncExternalStore } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { applyStore, getStore, mergeStores, setPushHook, type Store } from "./progress";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const authEnabled = !!URL && !!KEY;

export type SyncState = "idle" | "syncing" | "synced" | "error";
export type AuthState = {
  ready: boolean;
  user: { id: string; email: string; name: string; avatar: string | null } | null;
  sync: SyncState;
};

const SERVER: AuthState = { ready: false, user: null, sync: "idle" };
let state: AuthState = SERVER;
const listeners = new Set<() => void>();
let client: SupabaseClient | null = null;
let started = false;
let timer: ReturnType<typeof setTimeout> | undefined;

function set(next: Partial<AuthState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function db() {
  if (!client && authEnabled) client = createClient(URL!, KEY!);
  return client;
}

async function save(userId: string, data: Store) {
  const c = db();
  if (!c) return;
  const { error } = await c.from("progress").upsert({ user_id: userId, data, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  set({ sync: error ? "error" : "synced" });
}

/** On sign-in: merge what is saved in the cloud with what is on this device, keep both, save the result. */
async function pullAndMerge(userId: string) {
  const c = db();
  if (!c) return;
  set({ sync: "syncing" });
  const { data, error } = await c.from("progress").select("data").eq("user_id", userId).maybeSingle();
  if (error) return set({ sync: "error" });
  const merged = data?.data ? mergeStores(getStore(), data.data as Store) : getStore();
  applyStore(merged);
  await save(userId, merged);
  setPushHook((s) => {
    clearTimeout(timer);
    set({ sync: "syncing" });
    timer = setTimeout(() => void save(userId, s), 1500);
  });
}

function start() {
  if (started || !authEnabled) return;
  started = true;
  const c = db()!;
  const apply = (u: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null | undefined) => {
    if (!u) {
      setPushHook(null);
      return set({ ready: true, user: null, sync: "idle" });
    }
    const meta = u.user_metadata ?? {};
    set({
      ready: true,
      user: {
        id: u.id,
        email: u.email ?? "",
        name: String(meta.full_name ?? meta.name ?? u.email ?? "Student"),
        avatar: typeof meta.avatar_url === "string" ? meta.avatar_url : null,
      },
    });
    void pullAndMerge(u.id);
  };
  void c.auth.getSession().then(({ data }) => apply(data.session?.user));
  c.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") apply(null);
    else if (event === "SIGNED_IN" && session?.user && state.user?.id !== session.user.id) apply(session.user);
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  start();
  return () => listeners.delete(cb);
}

export function useAuth(): AuthState {
  return useSyncExternalStore(subscribe, () => state, () => SERVER);
}

export async function signInWithGoogle() {
  const c = db();
  if (!c) return;
  const here = location.href.split("#")[0].split("?")[0];
  await c.auth.signInWithOAuth({ provider: "google", options: { redirectTo: here } });
}

export async function signOut() {
  await db()?.auth.signOut();
}
