
-- Fix: search_path nas funções
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

-- Revoga execução pública da função do trigger (só roda via trigger)
REVOKE EXECUTE ON FUNCTION public.create_tasks_for_new_client() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Remove a policy pública de UPDATE ampla
DROP POLICY IF EXISTS "public can submit briefing" ON public.clients;

-- Função pública para enviar briefing via token (sem precisar de login)
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

-- Função pública para o formulário ler dados básicos via token (nome da empresa para mostrar no form)
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

-- Remove a policy ampla "public can read by token" - não é mais necessária pois usamos a RPC acima
DROP POLICY IF EXISTS "public can read by token" ON public.clients;
