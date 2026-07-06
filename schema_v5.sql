-- Portal Comunidades - Schema v5 (rodar APÓS o schema_v4.sql)
-- Libera upload/leitura no bucket "portfolio-servicos" (portfólio em PDF dos serviços)

create policy "Allow all on portfolio-servicos"
on storage.objects for all
using (bucket_id = 'portfolio-servicos')
with check (bucket_id = 'portfolio-servicos');
