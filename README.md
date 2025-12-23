# Guess Game

Minimal PWA for image + document flash-card challenges.

## Run

pnpm i && pnpm dev

## Ollama

Install models:

ollama pull llava:7b && ollama pull llama3:latest

Run Ollama with browser access (local dev):

OLLAMA_ORIGINS=http://localhost:3000 ollama serve

If you access from a phone on the same Wi‑Fi, add your LAN IP too:

OLLAMA_ORIGINS=http://localhost:3000,http://<YOUR_LAN_IP>:3000 ollama serve

Point the app to Ollama:

NEXT_PUBLIC_OLLAMA_URL=http://localhost:11434

## Supabase

```sql
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  module text not null,
  score integer not null,
  accuracy integer not null,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public) values ('uploads', 'uploads', true)
on conflict do nothing;
```

## Env

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_OLLAMA_URL=http://localhost:11434
```
