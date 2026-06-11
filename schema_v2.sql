-- Portal Comunidades - Schema v2 (rodar APÓS o schema.sql)

-- Comunidades com PIN de acesso
create table if not exists comunidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  pin text not null,
  created_at timestamp with time zone default now()
);

-- Perfis de usuário (admin / gestor)
create table if not exists perfis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  email text,
  role text not null default 'gestor',
  created_at timestamp with time zone default now()
);

-- Vincular líderes a uma comunidade
alter table lideres add column if not exists comunidade_id uuid references comunidades(id);

-- Vincular funcionários a uma comunidade
alter table funcionarios_associacao add column if not exists comunidade_id uuid references comunidades(id);

-- RLS
alter table comunidades enable row level security;
alter table perfis enable row level security;

create policy "Allow all on comunidades" on comunidades for all using (true);
create policy "Allow all on perfis" on perfis for all using (true);

-- ⚠️ Após o primeiro login, rode este comando para tornar seu usuário admin:
-- update perfis set role = 'admin' where email = 'seu@email.com';
