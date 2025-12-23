import localforage from "localforage";
import { isSupabaseConfigured, supabase } from "./supabase";

const queueStore = localforage.createInstance({ name: "gg-queue" });
const stateStore = localforage.createInstance({ name: "gg-state" });

export type QueueItem = {
  table: string;
  payload: Record<string, unknown>;
};

export async function queueWrite(item: QueueItem) {
  const existing = ((await queueStore.getItem<QueueItem[]>("writes")) ?? []).slice();
  existing.push(item);
  await queueStore.setItem("writes", existing);
}

export async function flushQueue() {
  if (!isSupabaseConfigured) return;
  const items = (await queueStore.getItem<QueueItem[]>("writes")) ?? [];
  if (!items.length) return;
  const remaining: QueueItem[] = [];
  for (const item of items) {
    const { error } = await supabase.from(item.table).insert(item.payload);
    if (error) {
      console.error("Supabase sync error", error, "Hint: check anon key and network.");
      remaining.push(item);
    }
  }
  await queueStore.setItem("writes", remaining);
}

export async function saveState<T>(key: string, value: T) {
  await stateStore.setItem(key, value);
}

export async function loadState<T>(key: string, fallback: T): Promise<T> {
  const value = await stateStore.getItem<T>(key);
  return value ?? fallback;
}

export async function storeFile(file: File): Promise<string> {
  if (process.env.NODE_ENV !== "production") {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (!res.ok) {
      const text = await res.text();
      console.error("Upload error", text, "Hint: check /public/uploads write access.");
      throw new Error(text);
    }
    const data = (await res.json()) as { path: string };
    return data.path;
  }
  if (!isSupabaseConfigured) {
    console.error("Supabase not configured", "Hint: set NEXT_PUBLIC_SUPABASE_URL and ANON KEY.");
    throw new Error("Supabase not configured");
  }
  const { data, error } = await supabase.storage.from("uploads").upload(file.name, file);
  if (error || !data) {
    console.error("Supabase storage error", error, "Hint: verify bucket 'uploads' exists.");
    throw new Error(error?.message ?? "Upload failed");
  }
  return data.path;
}
