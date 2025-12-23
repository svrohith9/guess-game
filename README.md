# Guess Game

Responsive PWA for image and document flash-card challenges, running locally with optional Supabase sync.

## Install

pnpm i && pnpm dev

## Ollama models

ollama pull llava:7b && ollama pull llama3:8b

## Supabase schema

```sql
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  module text not null,
  score integer not null,
  accuracy integer not null,
  created_at timestamptz not null default now()
);
```

Optional storage bucket (for production uploads):

```sql
insert into storage.buckets (id, name, public) values ('uploads', 'uploads', true)
on conflict do nothing;
```

## Environment

Set in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_OLLAMA_URL=http://localhost:11434
```
