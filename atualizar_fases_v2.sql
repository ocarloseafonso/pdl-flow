-- ==============================================================================
-- SCRIPT DE ATUALIZAÇÃO v2 — PDL FLOW
-- ==============================================================================
-- Instruções:
-- 1. Abra o Supabase do seu projeto.
-- 2. Vá em "SQL Editor" no menu lateral esquerdo.
-- 3. Clique em "New query".
-- 4. Cole todo este código lá dentro e clique em "RUN".
-- ==============================================================================

-- 1. Adicionar novos campos na tabela clients (se ainda não existirem)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_start_date DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS deadline_days INT NOT NULL DEFAULT 30;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_value NUMERIC(10,2);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_type TEXT;

-- 2. Atualizar clientes existentes: setar contract_start_date = created_at
UPDATE public.clients SET contract_start_date = created_at::date WHERE contract_start_date IS NULL;

-- 3. Adicionar Fase 8 (Manutenção Contínua) — a antiga Fase 7 vira "Entrega do Projeto"
UPDATE public.phases SET name = 'Entrega do Projeto', description = 'Reunião de entregáveis e aceite formal do cliente', position = 7 WHERE id = 7;

INSERT INTO public.phases (id, name, description, position, expected_days) VALUES
(8, 'Manutenção Contínua', 'Monitoramento, rastreamento e ajustes mensais', 8, 30)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, position = EXCLUDED.position, expected_days = EXCLUDED.expected_days;

-- 4. Mover clientes que estavam na Fase 7 (Manutenção) para a Fase 8
-- OBS: Se você tinha clientes na fase 7 como "manutenção", eles agora irão para a fase 8.
-- Se preferir que fiquem na fase 7 (Entrega), comente a linha abaixo.
UPDATE public.clients SET current_phase_id = 8 WHERE current_phase_id = 7;

-- 5. Atualizar os templates de tarefas
DELETE FROM public.task_templates WHERE phase_id = 7;

INSERT INTO public.task_templates (phase_id, title, position) VALUES
-- FASE 7: ENTREGA DO PROJETO
(7, 'Reunir todos os entregáveis (site publicado, blog no ar, perfil otimizado, diretórios cadastrados)', 1),
(7, 'Validar com o cliente que todos os dados estão corretos', 2),
(7, 'Enviar relatório de entrega ao cliente com resumo de tudo que foi feito', 3),
(7, 'Confirmar aceite formal do cliente', 4),
(7, 'Marcar projeto como entregue no sistema', 5),

-- FASE 8: MANUTENÇÃO CONTÍNUA
(8, 'Monitorar posição e métricas mensalmente: impressões, cliques, rotas, ligações', 1),
(8, 'Configurar link wa.me com parâmetro UTM para rastrear conversões do perfil', 2),
(8, 'Revisão mensal: atualizar fotos, serviços e atributos com o que mudou', 3),
(8, 'Responder novas avaliações em até 24h', 4),
(8, 'Publicar nova postagem semanal no perfil', 5),
(8, 'Gerar relatório mensal para o cliente com evolução das métricas', 6);

-- 6. Atualizar tarefas dos clientes existentes (adicionar as novas tarefas de Fase 7 e 8)
INSERT INTO public.client_tasks (client_id, phase_id, title, description, position)
SELECT c.id, t.phase_id, t.title, t.description, t.position 
FROM public.clients c
CROSS JOIN public.task_templates t
WHERE t.phase_id IN (7, 8)
AND NOT EXISTS (
  SELECT 1 FROM public.client_tasks ct 
  WHERE ct.client_id = c.id AND ct.phase_id = t.phase_id AND ct.title = t.title
);

-- Pronto! Atualize a página (F5) para ver as mudanças.
