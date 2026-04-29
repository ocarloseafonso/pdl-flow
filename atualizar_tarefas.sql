-- ==============================================================================
-- SCRIPT DE ATUALIZAÇÃO DAS TAREFAS DO KANBAN (PDL FLOW)
-- ==============================================================================
-- Instruções:
-- 1. Abra o Supabase do seu projeto.
-- 2. Vá em "SQL Editor" no menu lateral esquerdo.
-- 3. Clique em "New query".
-- 4. Cole todo este código lá dentro e clique em "RUN".
-- ==============================================================================

-- 1. Apaga os templates antigos
DELETE FROM public.task_templates;

-- 2. Insere os novos templates detalhados
INSERT INTO public.task_templates (phase_id, title, position) VALUES
-- FASE 1: ONBOARDING
(1, 'Enviar formulário de briefing ao cliente', 1),
(1, 'Aguardar formulário 100% preenchido — não avançar com campos em branco', 2),
(1, 'Confirmar nome comercial exato (igual à fachada, CNPJ e papelaria — sem siglas)', 3),
(1, 'Confirmar endereço completo: rua, número, complemento, bairro, cidade, estado, CEP', 4),
(1, 'Confirmar telefone principal com DDD', 5),
(1, 'Confirmar WhatsApp com DDD', 6),
(1, 'Confirmar horário de funcionamento: seg–sex, sábado, domingo e feriados', 7),
(1, 'Confirmar URL do site (com https:// — verificar se está ativo)', 8),
(1, 'Confirmar serviço principal (o que mais gera lucro ou quer focar)', 9),
(1, 'Confirmar lista completa de serviços secundários', 10),
(1, 'Receber 10 fotos externas diurnas da fachada', 11),
(1, 'Receber 10 fotos internas do espaço de atendimento', 12),
(1, 'Receber logo em PNG ou vetor de alta qualidade', 13),
(1, 'Receber foto de capa em alta resolução', 14),
(1, 'Confirmar atributos: Wi-Fi, estacionamento, acessibilidade, banheiro, formas de pagamento', 15),
(1, 'Solicitar documento de segurança: conta de luz/água no endereço + alvará de funcionamento', 16),
(1, 'Definir tipo de negócio: LOJA FÍSICA ou PRESTADOR DE SERVIÇO', 17),
(1, 'Confirmar se atende com hora marcada, por ordem de chegada ou ambos', 18),
(1, 'Abrir Google Maps e buscar: [nicho] + [cidade do cliente]', 19),
(1, 'Identificar os 3 primeiros concorrentes ranqueados no Maps', 20),
(1, 'Colar o site de cada concorrente no Ubersuggest → capturar palavras-chave que ranqueiam', 21),
(1, 'Google autocomplete: digitar nicho + cidade e capturar todas as sugestões', 22),
(1, 'Capturar perguntas da seção "Pessoas também perguntam" no Google', 23),
(1, 'Para nichos de saúde: usar keywordtool.io (sem restrição de categoria)', 24),
(1, 'Montar lista final de palavras-chave (1 principal, 3-5 variações, 5-10 cauda longa)', 25),
(1, 'Salvar lista de palavras-chave no briefing do cliente antes de avançar', 26),

-- FASE 2: CRIAÇÃO DO PERFIL
(2, 'Abrir janela anônima no navegador (Ctrl+Shift+N no Chrome)', 1),
(2, 'Acessar business.google.com com e-mail corporativo da agência — nunca e-mail pessoal', 2),
(2, 'Digitar nome comercial EXATO — sem palavras-chave, sem cidade, sem serviços no nome', 3),
(2, 'Verificar se já existe perfil do cliente nas sugestões do Google', 4),
(2, 'Se existir: clicar em "Reivindicar esta empresa" e seguir o fluxo', 5),
(2, 'Se não existir: clicar em "Criar uma empresa com este nome"', 6),
(2, 'Selecionar categoria principal com máxima especificidade (usar a palavra-chave principal da lista)', 7),
(2, 'Se LOJA FÍSICA: marcar "Sim" para localização → preencher endereço completo', 8),
(2, 'Se LOJA FÍSICA: verificar se o pino caiu exatamente sobre o imóvel — arrastar manualmente se necessário', 9),
(2, 'Se PRESTADOR DE SERVIÇO: marcar "Não" → configurar polígonos de cobertura com cidades e bairros exatos', 10),
(2, 'Preencher DDD + telefone principal', 11),
(2, 'Colar URL do site com https://', 12),
(2, 'Confirmar criação — não avançar para Fase 3 sem perfil criado ou reivindicado', 13),

-- FASE 3: VERIFICAÇÃO POR VÍDEO
(3, 'Copiar roteiro de gravação do vídeo (disponível no Guia de Execução do sistema)', 1),
(3, 'Enviar roteiro ao cliente pelo WhatsApp', 2),
(3, 'Ligar para o cliente logo após para confirmar que entendeu todas as regras', 3),
(3, 'Aguardar o cliente enviar o vídeo gravado', 4),
(3, 'Verificar o vídeo recebido: mínimo 30s, máximo 2 min, sem cortes, sem filtros', 5),
(3, 'Verificar: sem rosto de clientes, sem documentos sensíveis visíveis', 6),
(3, 'Subir o vídeo na plataforma conforme solicitado pelo Google', 7),
(3, 'Confirmar status "Processando a verificação" no painel', 8),
(3, 'NÃO mexer em nenhum campo do perfil durante os 5 dias úteis de análise', 9),
(3, 'Confirmar aprovação e selo "Verificado" ativo antes de avançar', 10),
(3, 'Se reprovado: identificar o motivo, orientar nova gravação e repetir o processo', 11),

-- FASE 4: OTIMIZAÇÃO + SITE
(4, 'Publicar descrição de até 750 caracteres (use todos — estrutura: o que faz / onde atende / diferenciais)', 1),
(4, 'Confirmar que palavras-chave locais aparecem de forma natural no texto (nunca em lista)', 2),
(4, 'Adicionar 2 a 5 categorias secundárias complementares à principal', 3),
(4, 'Confirmar que nenhuma categoria adicionada é sem relação com o negócio', 4),
(4, 'Marcar todos os atributos verdadeiros: Wi-Fi, acessibilidade, estacionamento, Pix, banheiro', 5),
(4, 'Cadastrar serviço principal: nome específico + tipo de preço + descrição (metodologia + garantia + dor que resolve)', 6),
(4, 'Cadastrar cada serviço secundário: nome específico + tipo de preço + descrição', 7),
(4, 'Abrir GeoSetter com todas as fotos do cliente', 8),
(4, 'Localizar coordenadas exatas do pin do negócio no Google Maps (clicar com botão direito no pin → copiar coordenadas)', 9),
(4, 'No GeoSetter: preencher os campos Title, Description, Keywords e Copyright com palavras-chave do cliente', 10),
(4, 'Aplicar coordenadas GPS em todas as fotos em lote', 11),
(4, 'Salvar e confirmar que o geotagging foi aplicado antes de qualquer edição posterior', 12),
(4, 'Subir fotos externas (fachada, placa, entrada) na categoria "Exterior" — mínimo 10 fotos', 13),
(4, 'Subir fotos internas (recepção, atendimento, equipamentos) na categoria "Interior" — mínimo 10 fotos', 14),
(4, 'Subir foto de capa em alta resolução', 15),
(4, 'Subir logo em PNG ou vetor na categoria "Logotipo"', 16),
(4, 'Coletar identidade visual do cliente: cores da marca (hex ou referência visual)', 17),
(4, 'Duplicar pasta do template do site → renomear com nome do cliente', 18),
(4, 'Abrir pasta no Antigravity', 19),
(4, 'Rodar Prompt 1 com os dados do formulário → site personalizado', 20),
(4, 'Revisar site gerado: nome, serviços, textos, links, botões de WhatsApp', 21),
(4, 'Publicar site do cliente', 22),
(4, 'Rodar Prompt 2 aqui no Claude → receber pauta dos 9 artigos com prioridade', 23),
(4, 'Gerar e publicar artigo 1 (Prompt 3)', 24),
(4, 'Gerar e publicar artigo 2 (Prompt 3)', 25),
(4, 'Gerar e publicar artigo 3 (Prompt 3)', 26),
(4, 'Gerar e publicar artigo 4 (Prompt 3)', 27),
(4, 'Gerar e publicar artigo 5 (Prompt 3)', 28),
(4, 'Gerar e publicar artigo 6 (Prompt 3)', 29),
(4, 'Gerar e publicar artigo 7 (Prompt 3)', 30),
(4, 'Gerar e publicar artigo 8 (Prompt 3)', 31),
(4, 'Gerar e publicar artigo 9 (Prompt 3)', 32),
(4, 'Adicionar schema LocalBusiness JSON-LD no <head> da home do site', 33),

-- FASE 5: CITAÇÕES E DIRETÓRIOS
(5, 'Confirmar NAP exato novamente com o formulário antes de qualquer cadastro', 1),
(5, 'Anotar o NAP exato em um bloco de notas para copiar e colar em todos os diretórios', 2),
(5, 'Cadastrar no Bing Places for Business → bingplaces.com', 3),
(5, 'Cadastrar no Apple Maps Connect → mapsconnect.apple.com', 4),
(5, 'Cadastrar no Facebook / Meta Business → business.facebook.com', 5),
(5, 'Cadastrar no Apontador → apontador.com.br', 6),
(5, 'Cadastrar no GuiaMais → guiamais.com.br', 7),
(5, 'Cadastrar no TeleListas → telelistas.net', 8),
(5, 'Cadastrar no Opendi Brasil → opendi.com.br', 9),
(5, 'Cadastrar no Kekanto (nicho: alimentação, beleza, entretenimento) → kekanto.com.br', 10),
(5, 'Cadastrar no Yelp Brasil → yelp.com.br', 11),
(5, 'Cadastrar no Cylex Brasil → cylex.com.br', 12),
(5, 'Cadastrar em diretório de nicho específico do cliente (ver lista no Guia de Execução)', 13),
(5, 'Validar consistência do NAP em todos os diretórios cadastrados', 14),

-- FASE 6: REPUTAÇÃO E ENGAJAMENTO
(6, 'Configurar meta de avaliações: 2 a 5 novas por semana', 1),
(6, 'Gerar QR Code nativo do perfil no painel do Google Business Profile', 2),
(6, 'Orientar cliente a posicionar o QR Code: balcão, cardápio, display, NFC', 3),
(6, 'Responder todas as avaliações existentes no perfil (prazo: 24h)', 4),
(6, 'Popular seção Q&A com mínimo 5 perguntas e respostas reais do negócio', 5),
(6, 'Criar e agendar primeira postagem semanal recorrente no perfil', 6),

-- FASE 7: MANUTENÇÃO CONTÍNUA
(7, 'Monitorar posição e métricas mensalmente: impressões, cliques, rotas, ligações', 1),
(7, 'Configurar link wa.me com parâmetro UTM para rastrear conversões do perfil', 2),
(7, 'Revisão mensal: atualizar fotos, serviços e atributos com o que mudou', 3),
(7, 'Responder novas avaliações em até 24h', 4),
(7, 'Publicar nova postagem semanal no perfil', 5),
(7, 'Gerar relatório mensal para o cliente com evolução das métricas', 6);
