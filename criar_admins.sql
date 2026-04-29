-- ═══════════════════════════════════════════════════════════
-- EXECUTAR NO SQL EDITOR DO SUPABASE PARA CRIAR AS CONTAS ADMIN
-- Projeto: vntfebxbsipumjswimmo
-- ═══════════════════════════════════════════════════════════

-- Criar usuário admin 1
SELECT auth.create_user(
  '{"email": "ceafonso.solucoesdigitais@gmail.com", "password": "123456", "email_confirm": true}'::jsonb
);

-- Criar usuário admin 2
SELECT auth.create_user(
  '{"email": "contato@ceafonso.com.br", "password": "123456", "email_confirm": true}'::jsonb
);
