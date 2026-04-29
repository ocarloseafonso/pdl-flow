
-- ============ PHASES (catÃ¡logo das 7 fases do PDL) ============
CREATE TABLE public.phases (
  id INT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL,
  expected_days INT NOT NULL DEFAULT 3
);

INSERT INTO public.phases (id, name, description, position, expected_days) VALUES
(1, 'Onboarding', 'Coleta de todos os dados do cliente antes de qualquer aÃ§Ã£o', 1, 4),
(2, 'CriaÃ§Ã£o do Perfil', 'CriaÃ§Ã£o ou reivindicaÃ§Ã£o do perfil no Google Business Profile', 2, 1),
(3, 'VerificaÃ§Ã£o', 'GravaÃ§Ã£o e envio do vÃ­deo de verificaÃ§Ã£o ao Google', 3, 7),
(4, 'OtimizaÃ§Ã£o + Site', 'OtimizaÃ§Ã£o do perfil + criaÃ§Ã£o do site e blog do cliente', 4, 5),
(5, 'CitaÃ§Ãµes e DiretÃ³rios', 'Cadastro em diretÃ³rios locais para fortalecer autoridade', 5, 7),
(6, 'ReputaÃ§Ã£o e Engajamento', 'EstratÃ©gia de avaliaÃ§Ãµes, Q&A e postagens semanais', 6, 7),
(7, 'ManutenÃ§Ã£o ContÃ­nua', 'Monitoramento, rastreamento e ajustes mensais', 7, 30);

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

-- ============ TASK TEMPLATES (checklist padrÃ£o por fase) ============
CREATE TABLE public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id INT NOT NULL REFERENCES public.phases(id),
  title TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL DEFAULT 0
);

INSERT INTO public.task_templates (phase_id, title, position) VALUES
-- Fase 1
(1, 'ReuniÃ£o interna: ler proposta linha por linha', 1),
(1, 'Identificar autoridade do cliente (dono/gerente/marketing)', 2),
(1, 'Verificar histÃ³rico com outras agÃªncias', 3),
(1, 'Enviar link de briefing ao cliente', 4),
(1, 'Confirmar NAP por escrito (nome, endereÃ§o, telefone)', 5),
(1, 'Distinguir loja fÃ­sica vs. atendimento na Ã¡rea', 6),
-- Fase 2
(2, 'Criar/acessar conta Google do cliente', 1),
(2, 'Definir categoria principal com mÃ¡xima especificidade', 2),
(2, 'Configurar endereÃ§o ou polÃ­gonos de cobertura', 3),
(2, 'Preencher DDD, telefone e URL do site', 4),
-- Fase 3
(3, 'Enviar roteiro de gravaÃ§Ã£o ao cliente', 1),
(3, 'Receber vÃ­deo do cliente', 2),
(3, 'Subir vÃ­deo na plataforma do Google', 3),
(3, 'Confirmar aprovaÃ§Ã£o da verificaÃ§Ã£o', 4),
-- Fase 4
(4, 'Publicar descriÃ§Ã£o de 750 caracteres', 1),
(4, 'Adicionar 2 a 5 categorias secundÃ¡rias', 2),
(4, 'Marcar todos os atributos relevantes', 3),
(4, 'Cadastrar serviÃ§os com preÃ§o e descriÃ§Ã£o', 4),
(4, 'Subir 10 fotos internas', 5),
(4, 'Subir foto de capa em alta resoluÃ§Ã£o', 6),
(4, 'Subir logo (PNG/vetor)', 7),
(4, 'Definir identidade visual (cores da marca)', 8),
(4, 'Gerar prompt e rodar Site no Antigravity', 9),
(4, 'Revisar e publicar site do cliente', 10),
(4, 'Gerar pauta de 9 artigos (Prompt 2)', 11),
(4, 'Gerar e publicar 9 artigos do blog (Prompt 3)', 12),
(4, 'Adicionar schema LocalBusiness JSON-LD', 13),
-- Fase 5
(5, 'Cadastrar em diretÃ³rios gerais (GuiaMais, etc.)', 1),
(5, 'Cadastrar em diretÃ³rios do nicho do cliente', 2),
(5, 'Validar consistÃªncia NAP em todos os diretÃ³rios', 3),
-- Fase 6
(6, 'Configurar estratÃ©gia de avaliaÃ§Ãµes', 1),
(6, 'Popular seÃ§Ã£o Q&A com perguntas frequentes', 2),
(6, 'Agendar postagem semanal recorrente', 3),
-- Fase 7
(7, 'Monitorar posiÃ§Ã£o e mÃ©tricas (mensal)', 1),
(7, 'Configurar link wa.me com mensagem UTM', 2),
(7, 'RevisÃ£o mensal de fotos, serviÃ§os e atributos', 3);

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
  status TEXT NOT NULL DEFAULT 'todo', -- todo | in_review | published
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
  type TEXT NOT NULL DEFAULT 'reminder', -- reminder | meeting | recurring | holiday
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_user_date ON public.calendar_events(user_id, event_date);
CREATE INDEX idx_events_client ON public.calendar_events(client_id);

-- ============ PROMPT TEMPLATES (editÃ¡veis pelo usuÃ¡rio) ============
CREATE TABLE public.prompt_templates (
  id TEXT PRIMARY KEY,
  user_id UUID, -- NULL = template global padrÃ£o
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.prompt_templates (id, title, content) VALUES
('site', 'Prompt 1 â€” PersonalizaÃ§Ã£o do Site', 'VocÃª Ã© um especialista em desenvolvimento web e SEO local. Vou te fornecer os dados de um cliente. Sua tarefa Ã© personalizar completamente este template de site para ele. Leia todos os arquivos do projeto antes de comeÃ§ar. NÃ£o invente informaÃ§Ãµes â€” use apenas o que estÃ¡ nos dados abaixo. Se algum dado nÃ£o foi fornecido, mantenha o placeholder original e me avise ao final.

DADOS DO CLIENTE:

Nome do responsÃ¡vel: {{responsible_name}}
Nome da empresa: {{company_name}}
Bio (2 frases): {{bio}}
Segmento/nicho: {{segment}}
Data de abertura: {{opening_date}}
Cidade e estado: {{city_state}}
Bairros/regiÃµes atendidas: {{areas}}
Telefone/WhatsApp: {{phone}}
E-mail: {{email}}
Instagram: {{instagram}}
Outras redes sociais: {{other_socials}}
HorÃ¡rio de funcionamento: {{hours}}
Formas de atendimento: {{service_modes}}
ServiÃ§o principal: {{main_service}}
Outros serviÃ§os: {{other_services}}
Problema que resolve: {{problem_solved}}
PÃºblico-alvo: {{audience}}
Diferencial: {{differentiator}}
O que os clientes elogiam: {{praises}}
DÃºvidas frequentes dos clientes: {{faq}}
O que nÃ£o atende: {{restrictions}}
Trabalha sozinho ou com equipe: {{team}}
Atendimentos por dia: {{daily_capacity}}
DuraÃ§Ã£o mÃ©dia do atendimento: {{avg_duration}}
Agendamento ou ordem de chegada: {{scheduling}}
Formas de pagamento: {{payment_methods}}
PromoÃ§Ãµes ou ofertas: {{promotions}}
Estacionamento: {{parking}}
Acessibilidade: {{accessibility}}
Banheiro para clientes: {{restroom}}
Wi-fi: {{wifi}}
Bom para crianÃ§as: {{kid_friendly}}
Slogan: {{slogan}}
Cores da marca: {{brand_colors}}

TAREFAS â€” execute nesta ordem:

1. HTML â€” todos os arquivos
- Substitua todas as ocorrÃªncias do nome antigo do template pelo nome da empresa
- Atualize a seÃ§Ã£o hero com o slogan do cliente
- Atualize a seÃ§Ã£o "Sobre" com a bio, data de abertura e histÃ³ria do responsÃ¡vel
- Atualize os cards de serviÃ§os com os serviÃ§os reais do cliente
- Atualize horÃ¡rios, formas de pagamento, formas de atendimento
- Atualize todos os links de redes sociais
- Atualize o nÃºmero do WhatsApp em todos os botÃµes de contato
- Na seÃ§Ã£o de FAQ, use as dÃºvidas frequentes do cliente
- Atualize o rodapÃ© com endereÃ§o, cidade, telefone e e-mail
- Nas pÃ¡ginas de blog, atualize apenas tÃ­tulo e meta description (conteÃºdo serÃ¡ gerado separadamente)

2. SEO â€” tags <head> de cada pÃ¡gina
- <title>: "Nome da empresa â€” ServiÃ§o principal â€” Cidade"
- <meta name="description">: atÃ© 155 caracteres com cidade, nicho e diferencial
- <meta name="keywords">: nicho + cidade + bairros + serviÃ§os principais
- <link rel="canonical"> em cada pÃ¡gina
- Schema JSON-LD LocalBusiness no <head> da home

3. CSS
- Se cores da marca foram fornecidas, substitua as variÃ¡veis principais mantendo contraste

4. Alt text de imagens
- Todos os alt devem descrever serviÃ§o + cidade

5. Ao finalizar, entregue:
- Todos os arquivos modificados
- Lista do que foi alterado em cada arquivo
- Lista de placeholders que ficaram por falta de dado'),

('blog_pauta', 'Prompt 2 â€” Pauta do Blog (9 artigos)', 'VocÃª Ã© um especialista em SEO local e marketing de conteÃºdo. Com base nos dados do cliente abaixo, defina 9 temas de artigos para o blog do site. O objetivo Ã© que cada artigo seja encontrado no Google por pessoas que buscam o serviÃ§o na cidade do cliente, e que sirva de referÃªncia para IAs quando alguÃ©m perguntar pelo melhor profissional do nicho na cidade.

DADOS DO CLIENTE:

Nome da empresa: {{company_name}}
Nicho/segmento: {{segment}}
ServiÃ§o principal: {{main_service}}
Outros serviÃ§os: {{other_services}}
Cidade e estado: {{city_state}}
Bairros/regiÃµes atendidas: {{areas}}
PÃºblico-alvo: {{audience}}
Problema que resolve: {{problem_solved}}
DÃºvidas frequentes dos clientes: {{faq}}
Diferencial: {{differentiator}}

CRITÃ‰RIOS:
- Cada tema responde uma dÃºvida real do pÃºblico antes de contratar
- Cidade ou bairro no tÃ­tulo em pelo menos 6 dos 9 artigos
- Nenhum tÃ­tulo genÃ©rico â€” citar serviÃ§o/nicho de forma especÃ­fica
- Variar formatos: 2 guias completos, 2 comparativos, 2 listas prÃ¡ticas, 2 FAQ, 1 autoridade
- ProgressÃ£o: do desconhecido ao pronto para contratar

ENTREGUE uma tabela em formato CSV (separado por |):
posicao | titulo | palavra_chave | intencao | formato | prioridade

ApÃ³s a tabela, liste os 3 artigos prioritÃ¡rios e justifique.'),

('blog_artigo', 'Prompt 3 â€” GeraÃ§Ã£o de Artigo (3000 palavras)', 'VocÃª Ã© um redator especialista em SEO local e conteÃºdo de autoridade. Vou te passar os dados do cliente e o tema do artigo. Escreva um artigo completo, mÃ­nimo 2800 palavras, que funcione como conteÃºdo Ãºtil, pÃ¡gina de conversÃ£o e referÃªncia para buscadores e IAs.

DADOS DO CLIENTE:

Nome da empresa: {{company_name}}
Nome do responsÃ¡vel: {{responsible_name}}
Nicho/segmento: {{segment}}
ServiÃ§o principal: {{main_service}}
Outros serviÃ§os: {{other_services}}
Cidade e estado: {{city_state}}
Bairros atendidos: {{areas}}
Diferencial: {{differentiator}}
O que os clientes elogiam: {{praises}}
Telefone/WhatsApp: {{phone}}
Instagram: {{instagram}}
HorÃ¡rio: {{hours}}

TEMA DO ARTIGO:
TÃ­tulo: {{article_title}}
Palavra-chave principal: {{article_keyword}}
Formato: {{article_format}}

ESTRUTURA OBRIGATÃ“RIA:
1. H1 com palavra-chave principal e cidade
2. IntroduÃ§Ã£o (150â€“200 palavras) â€” problema real, promessa de resolver, menciona cidade
3. O que Ã© / Como funciona (300â€“400 palavras)
4. Por que isso importa para quem mora em {{city_state}} (200â€“300 palavras) â€” cita bairros
5. Desenvolvimento principal (800â€“1000 palavras) â€” H2/H3, listas onde fizer sentido
6. Erros comuns / O que evitar (200â€“300 palavras)
7. Como escolher um bom profissional em {{city_state}} (200â€“300 palavras)
8. FAQ (300â€“400 palavras) â€” mÃ­nimo 5 perguntas, formato schema-ready
9. ConclusÃ£o + CTA (150â€“200 palavras) â€” nome da empresa, WhatsApp e Instagram

REGRAS:
- Tom direto, humano, sem enrolaÃ§Ã£o
- Cidade mencionada pelo menos 8 vezes naturalmente
- Nome da empresa pelo menos 4 vezes
- NÃ£o usar: "incrÃ­vel", "revolucionÃ¡rio", "Ãºnico no mercado", "melhor do Brasil"
- NÃ£o fazer promessas nÃ£o confirmadas
- Cada H2 entre 150 e 300 palavras

Ao final, entregue: tÃ­tulo SEO (atÃ© 60 chars), meta description (atÃ© 155 chars), 5 sugestÃµes de alt text para imagens.');

-- ============ HOLIDAYS BR (feriados nacionais) ============
CREATE TABLE public.holidays_br (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(date)
);

INSERT INTO public.holidays_br (date, name) VALUES
-- 2026
('2026-01-01', 'ConfraternizaÃ§Ã£o Universal'),
('2026-02-16', 'Carnaval'),
('2026-02-17', 'Carnaval'),
('2026-02-18', 'Quarta-feira de Cinzas'),
('2026-04-03', 'Sexta-feira Santa'),
('2026-04-21', 'Tiradentes'),
('2026-05-01', 'Dia do Trabalho'),
('2026-06-04', 'Corpus Christi'),
('2026-09-07', 'IndependÃªncia do Brasil'),
('2026-10-12', 'Nossa Senhora Aparecida'),
('2026-11-02', 'Finados'),
('2026-11-15', 'ProclamaÃ§Ã£o da RepÃºblica'),
('2026-11-20', 'Dia da ConsciÃªncia Negra'),
('2026-12-25', 'Natal'),
-- 2027
('2027-01-01', 'ConfraternizaÃ§Ã£o Universal'),
('2027-02-08', 'Carnaval'),
('2027-02-09', 'Carnaval'),
('2027-02-10', 'Quarta-feira de Cinzas'),
('2027-03-26', 'Sexta-feira Santa'),
('2027-04-21', 'Tiradentes'),
('2027-05-01', 'Dia do Trabalho'),
('2027-05-27', 'Corpus Christi'),
('2027-09-07', 'IndependÃªncia do Brasil'),
('2027-10-12', 'Nossa Senhora Aparecida'),
('2027-11-02', 'Finados'),
('2027-11-15', 'ProclamaÃ§Ã£o da RepÃºblica'),
('2027-11-20', 'Dia da ConsciÃªncia Negra'),
('2027-12-25', 'Natal');

-- ============ RLS ============
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays_br ENABLE ROW LEVEL SECURITY;

-- phases / task_templates / holidays: leitura pÃºblica (sÃ£o catÃ¡logos)
CREATE POLICY "phases readable by all" ON public.phases FOR SELECT USING (true);
CREATE POLICY "task_templates readable by all" ON public.task_templates FOR SELECT USING (true);
CREATE POLICY "holidays readable by all" ON public.holidays_br FOR SELECT USING (true);

-- clients: dono gerencia tudo + leitura pÃºblica via briefing_token (para o formulÃ¡rio pÃºblico)
CREATE POLICY "owner manages clients" ON public.clients FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "public can read by token" ON public.clients FOR SELECT USING (true);
CREATE POLICY "public can submit briefing" ON public.clients FOR UPDATE USING (true) WITH CHECK (true);

-- client_tasks: apenas dono do cliente
CREATE POLICY "owner manages client tasks" ON public.client_tasks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_tasks.client_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_tasks.client_id AND c.user_id = auth.uid()));

-- blog_articles: apenas dono
CREATE POLICY "owner manages articles" ON public.blog_articles FOR ALL
  USING (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = blog_articles.client_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = blog_articles.client_id AND c.user_id = auth.uid()));

-- calendar_events: apenas dono
CREATE POLICY "owner manages events" ON public.calendar_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- prompt_templates: leitura por todos os autenticados (sÃ£o padrÃ£o), ediÃ§Ã£o livre para dono
CREATE POLICY "auth users read prompts" ON public.prompt_templates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "auth users update prompts" ON public.prompt_templates FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ============ TRIGGER: criar tasks automaticamente quando cliente Ã© criado ============
CREATE OR REPLACE FUNCTION public.create_tasks_for_new_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.client_tasks (client_id, phase_id, title, description, position)
  SELECT NEW.id, t.phase_id, t.title, t.description, t.position
  FROM public.task_templates t;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_client_created_create_tasks
AFTER INSERT ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.create_tasks_for_new_client();

-- ============ TRIGGER: updated_at em clients ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER clients_set_updated_at BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Fix: search_path nas funÃ§Ãµes
CREATE OR REPLACE FUNCTION public.create_tasks_for_new_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.client_tasks (client_id, phase_id, title, description, position)
  SELECT NEW.id, t.phase_id, t.title, t.description, t.position
  FROM public.task_templates t;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Revoga execuÃ§Ã£o pÃºblica da funÃ§Ã£o do trigger (sÃ³ roda via trigger)
REVOKE EXECUTE ON FUNCTION public.create_tasks_for_new_client() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Remove a policy pÃºblica de UPDATE ampla
DROP POLICY IF EXISTS "public can submit briefing" ON public.clients;

-- FunÃ§Ã£o pÃºblica para enviar briefing via token (sem precisar de login)
CREATE OR REPLACE FUNCTION public.submit_briefing(_token TEXT, _data JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _client_id UUID;
BEGIN
  SELECT id INTO _client_id FROM public.clients WHERE briefing_token = _token;
  IF _client_id IS NULL THEN
    RETURN false;
  END IF;
  UPDATE public.clients
    SET briefing_data = _data,
        briefing_submitted_at = now()
    WHERE id = _client_id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_briefing(TEXT, JSONB) TO anon, authenticated;

-- FunÃ§Ã£o pÃºblica para o formulÃ¡rio ler dados bÃ¡sicos via token (nome da empresa para mostrar no form)
CREATE OR REPLACE FUNCTION public.get_briefing_client(_token TEXT)
RETURNS TABLE(name TEXT, company_name TEXT, briefing_submitted_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.name, c.company_name, c.briefing_submitted_at
  FROM public.clients c
  WHERE c.briefing_token = _token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_briefing_client(TEXT) TO anon, authenticated;

-- Remove a policy ampla "public can read by token" - nÃ£o Ã© mais necessÃ¡ria pois usamos a RPC acima
DROP POLICY IF EXISTS "public can read by token" ON public.clients;
