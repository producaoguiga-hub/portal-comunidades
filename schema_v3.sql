-- Portal Comunidades - Schema v3 (rodar APÓS o schema_v2.sql)
-- Adiciona a coluna de descrição da estratégia de mitigação de riscos

alter table riscos add column if not exists descricao_mitigacao text;
