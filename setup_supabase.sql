-- LIMPEZA INICIAL PARA EVITAR ERROS DE DUPLICIDADE
DROP TABLE IF EXISTS public.blog_articles CASCADE;
DROP TABLE IF EXISTS public.calendar_events CASCADE;
DROP TABLE IF EXISTS public.client_tasks CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.holidays_br CASCADE;
DROP TABLE IF EXISTS public.phases CASCADE;
DROP TABLE IF EXISTS public.prompt_templates CASCADE;
DROP TABLE IF EXISTS public.task_templates CASCADE;
DROP FUNCTION IF EXISTS public.create_tasks_for_new_client CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at CASCADE;
DROP FUNCTION IF EXISTS public.submit_briefing CASCADE;
DROP FUNCTION IF EXISTS public.get_briefing_client CASCADE;

-- ============ PHASES (catálogo das 7 fases do PDL) ============
CREATE TABLE public.phases (
  id INT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL,
  expected_days INT NOT NULL DEFAULT 3
);

INSERT INTO public.phases (id, name, description, position, expected_days) VALUES
(1, 'Onboarding', 'Coleta de todos os dados do cliente antes de qualquer ação', 1, 4),
(2, 'Criação do Perfil', 'Criação ou reivindicação do perfil no Google Business Profile', 2, 1),
(3, 'Verificação', 'Gravação e envio do vídeo de verificação ao Google', 3, 7),
(4, 'Otimização + Site', 'Otimização do perfil + criação do site e blog do cliente', 4, 5),
(5, 'Citações e Diretórios', 'Cadastro em diretórios locais para fortalecer autoridade', 5, 7),
(6, 'Reputação e Engajamento', 'Estratégia de avaliações, Q&A e postagens semanais', 6, 7),
(7, 'Manutenção Contínua', 'Monitoramento, rastreamento e ajustes mensais', 7, 30);

-- ============ CLIENTS ============
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  company_name TEXT,
  segment TEXT,
  current_phase_id INT NOT NULL DEFAULT 1 REFERENCES public.phases(id),
  phase_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  briefing_token TEXT UNIQUE NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  briefing_submitted_at TIMESTAMPTZ,
  briefing_data JSONB DEFAULT '{}'::jsonb,
  brand_colors TEXT,
  brand_notes TEXT,
  site_url TEXT,
  site_generated BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clients_user ON public.clients(user_id);
CREATE INDEX idx_clients_phase ON public.clients(current_phase_id);

-- ============ TASK TEMPLATES (checklist padrão por fase) ============
CREATE TABLE public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id INT NOT NULL REFERENCES public.phases(id),
  title TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL DEFAULT 0
);

INSERT INTO public.task_templates (phase_id, title, position) VALUES
(1, 'Reunião interna: ler proposta linha por linha', 1),
(1, 'Identificar autoridade do cliente (dono/gerente/marketing)', 2),
(1, 'Verificar histórico com outras agências', 3),
(1, 'Enviar link de briefing ao cliente', 4),
(1, 'Confirmar NAP por escrito (nome, endereço, telefone)', 5),
(1, 'Distinguir loja física vs. atendimento na área', 6),
(2, 'Criar/acessar conta Google do cliente', 1),
(2, 'Definir categoria principal com máxima especificidade', 2),
(2, 'Configurar endereço ou polígonos de cobertura', 3),
(2, 'Preencher DDD, telefone e URL do site', 4),
(3, 'Enviar roteiro de gravação ao cliente', 1),
(3, 'Receber vídeo do cliente', 2),
(3, 'Subir vídeo na plataforma do Google', 3),
(3, 'Confirmar aprovação da verificação', 4),
(4, 'Publicar descrição de 750 caracteres', 1),
(4, 'Adicionar 2 a 5 categorias secundárias', 2),
(4, 'Marcar todos os atributos relevantes', 3),
(4, 'Cadastrar serviços com preço e descrição', 4),
(4, 'Subir 10 fotos internas', 5),
(4, 'Subir foto de capa em alta resolução', 6),
(4, 'Subir logo (PNG/vetor)', 7),
(4, 'Definir identidade visual (cores da marca)', 8),
(4, 'Gerar prompt e rodar Site no Antigravity', 9),
(4, 'Revisar e publicar site do cliente', 10),
(4, 'Gerar pauta de 9 artigos (Prompt 2)', 11),
(4, 'Gerar e publicar 9 artigos do blog (Prompt 3)', 12),
(4, 'Adicionar schema LocalBusiness JSON-LD', 13),
(5, 'Cadastrar em diretórios gerais (GuiaMais, etc.)', 1),
(5, 'Cadastrar em diretórios do nicho do cliente', 2),
(5, 'Validar consistência NAP em todos os diretórios', 3),
(6, 'Configurar estratégia de avaliações', 1),
(6, 'Popular seção Q&A com perguntas frequentes', 2),
(6, 'Agendar postagem semanal recorrente', 3),
(7, 'Monitorar posição e métricas (mensal)', 1),
(7, 'Configurar link wa.me com mensagem UTM', 2),
(7, 'Revisão mensal de fotos, serviços e atributos', 3);

-- ============ CLIENT TASKS (tarefas reais por cliente) ============
CREATE TABLE public.client_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  phase_id INT NOT NULL REFERENCES public.phases(id),
  title TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_tasks_client ON public.client_tasks(client_id);
CREATE INDEX idx_client_tasks_phase ON public.client_tasks(client_id, phase_id);

-- ============ BLOG ARTICLES ============
CREATE TABLE public.blog_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  position INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  keyword TEXT,
  intent TEXT,
  format TEXT,
  priority INT,
  status TEXT NOT NULL DEFAULT 'todo',
  content TEXT,
  published_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_articles_client ON public.blog_articles(client_id);

-- ============ CALENDAR EVENTS ============
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  type TEXT NOT NULL DEFAULT 'reminder',
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_user_date ON public.calendar_events(user_id, event_date);
CREATE INDEX idx_events_client ON public.calendar_events(client_id);

-- ============ PROMPT TEMPLATES ============
CREATE TABLE public.prompt_templates (
  id TEXT PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ HOLIDAYS BR ============
CREATE TABLE public.holidays_br (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(date)
);

INSERT INTO public.holidays_br (date, name) VALUES
('2026-01-01', 'Confraternização Universal'),
('2026-04-03', 'Sexta-feira Santa'),
('2026-04-21', 'Tiradentes'),
('2026-05-01', 'Dia do Trabalho'),
('2026-09-07', 'Independência do Brasil'),
('2026-10-12', 'Nossa Senhora Aparecida'),
('2026-11-02', 'Finados'),
('2026-11-15', 'Proclamação da República'),
('2026-11-20', 'Dia da Consciência Negra'),
('2026-12-25', 'Natal');

-- ============ RLS (DESATIVADO PARA FACILITAR USO LOCAL) ============
-- Permitir todas as operações para todos (anon e autenticados) para facilitar uso sem login
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissive" ON public.clients FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissive" ON public.client_tasks FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissive" ON public.blog_articles FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissive" ON public.calendar_events FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissive" ON public.prompt_templates FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissive" ON public.phases FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissive" ON public.task_templates FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.holidays_br ENABLE ROW LEVEL SECURITY;
CREATE POLICY "permissive" ON public.holidays_br FOR ALL USING (true) WITH CHECK (true);

-- ============ FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.create_tasks_for_new_client()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.client_tasks (client_id, phase_id, title, description, position)
  SELECT NEW.id, t.phase_id, t.title, t.description, t.position FROM public.task_templates t;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_client_created_create_tasks AFTER INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.create_tasks_for_new_client();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER clients_set_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.submit_briefing(_token TEXT, _data JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _client_id UUID;
BEGIN
  SELECT id INTO _client_id FROM public.clients WHERE briefing_token = _token;
  IF _client_id IS NULL THEN RETURN false; END IF;
  UPDATE public.clients SET briefing_data = _data, briefing_submitted_at = now() WHERE id = _client_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_briefing(TEXT, JSONB) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_briefing_client(_token TEXT)
RETURNS TABLE(name TEXT, company_name TEXT, briefing_submitted_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
BEGIN
  RETURN QUERY SELECT c.name, c.company_name, c.briefing_submitted_at FROM public.clients c WHERE c.briefing_token = _token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_briefing_client(TEXT) TO anon, authenticated;
