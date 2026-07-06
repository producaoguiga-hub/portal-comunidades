-- Portal Comunidades - Schema v4 (rodar APÓS o schema_v3.sql)
-- Adiciona a coluna de portfólio em PDF dos serviços comunitários

alter table servicos_comunidade add column if not exists portfolio_pdf_url text;
