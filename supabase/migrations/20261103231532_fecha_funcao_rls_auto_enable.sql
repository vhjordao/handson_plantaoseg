-- O painel do Supabase, ao criar um projeto com RLS automática, cria public.rls_auto_enable() com
-- execução aberta a todos, e o gatilho de evento ensure_rls, que liga a RLS em tabelas novas.
-- O gatilho continua valendo: o Postgres não confere EXECUTE ao disparar um gatilho de evento.
-- Só a exposição pela API sai. A função não existe no banco local da CI, daí a condição.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated, service_role;
  end if;
end;
$$;
