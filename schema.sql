-- Portal Comunidades - Schema SQL
-- Run this in the Supabase SQL Editor

-- Líderes
create table if not exists lideres (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  contato text,
  regiao text,
  associacao text,
  status text default 'ativo',
  created_at timestamp with time zone default now()
);

-- Vagas
create table if not exists vagas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  unidade text,
  regiao text,
  status text default 'aberta',
  created_at timestamp with time zone default now()
);

-- Candidaturas
create table if not exists candidaturas (
  id uuid primary key default gen_random_uuid(),
  vaga_id uuid references vagas(id) on delete cascade,
  lider_id uuid references lideres(id) on delete cascade,
  status text default 'pendente',
  created_at timestamp with time zone default now()
);

-- Serviços Comunidade
create table if not exists servicos_comunidade (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  descricao text,
  contato text,
  created_at timestamp with time zone default now()
);

-- Funcionários Associação
create table if not exists funcionarios_associacao (
  id uuid primary key default gen_random_uuid(),
  funcionario_nome text not null,
  associacao text,
  unidade text,
  created_at timestamp with time zone default now()
);

-- Ações Sociais
create table if not exists acoes_sociais (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  data date,
  comunidade text,
  responsavel text,
  descricao text,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (optional - adjust as needed)
alter table lideres enable row level security;
alter table vagas enable row level security;
alter table candidaturas enable row level security;
alter table servicos_comunidade enable row level security;
alter table funcionarios_associacao enable row level security;
alter table acoes_sociais enable row level security;

-- Allow all operations for authenticated users (adjust policies as needed)
create policy "Allow all for authenticated" on lideres for all using (true);
create policy "Allow all for authenticated" on vagas for all using (true);
create policy "Allow all for authenticated" on candidaturas for all using (true);
create policy "Allow all for authenticated" on servicos_comunidade for all using (true);
create policy "Allow all for authenticated" on funcionarios_associacao for all using (true);
create policy "Allow all for authenticated" on acoes_sociais for all using (true);
