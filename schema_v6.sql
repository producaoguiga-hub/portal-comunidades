-- Portal Comunidades - Schema v6 (rodar APÓS o schema_v5.sql)
-- Adiciona capítulos (agrupando aulas) e carga horária por aula, para o
-- redesenho do Portal do Aluno (EAD)

create table if not exists capitulos (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid references cursos(id) on delete cascade not null,
  titulo text not null,
  ordem integer default 1,
  created_at timestamp with time zone default now()
);

alter table capitulos enable row level security;
create policy "Allow all on capitulos" on capitulos for all using (true);

alter table aulas add column if not exists capitulo_id uuid references capitulos(id) on delete set null;
alter table aulas add column if not exists duracao_horas numeric(6,2) default 0;
