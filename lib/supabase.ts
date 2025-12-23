import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(
  isSupabaseConfigured ? url : "http://localhost",
  isSupabaseConfigured ? anonKey : "anon",
  {
    auth: { persistSession: true, autoRefreshToken: true }
  }
);
