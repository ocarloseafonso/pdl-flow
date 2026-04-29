
# Sistema de Gestão Operacional — PDL + Geração de Site

Painel interno para gerenciar 100% da operação do PDL (Protocolo de Destaque Local), do cliente fechado até a entrega e manutenção, **incluindo a geração assistida do site e do blog do cliente** via prompts prontos para o Google Antigravity.

## Visão geral

Tudo gira em torno de um **Kanban central** com as 7 fases do playbook. Cada cliente é um cartão que percorre as fases, com checklists pré-carregados, agenda, observações e — o ponto novo — uma **central de geração de site** que monta sozinha os prompts do Antigravity já preenchidos com as respostas do briefing do cliente.

```text
[Onboarding] → [Criação Perfil] → [Verificação] → [Otimização + Site] → [Citações] → [Reputação] → [Manutenção]
```

## Estimativa realista de entrega (1 pessoa, sem improviso)

Com o sistema guiando o processo e os prompts gerando o site automaticamente:

| Fase | Tempo de trabalho seu | Tempo total (com espera externa) |
|------|----------------------|----------------------------------|
| 1. Onboarding | 30 min | 2–4 dias (cliente preencher) |
| 2. Criação do Perfil | 1 h | 1 dia |
| 3. Verificação por vídeo | 20 min | 3–7 dias (Google + cliente) |
| 4. Otimização + **Site + 9 artigos** | 4–6 h (com prompts) | 3–5 dias |
| 5. Citações e Diretórios | 2–3 h | 5–7 dias |
| 6. Reputação (setup) | 1 h | contínuo semanal |
| 7. Manutenção | 30 min/mês | contínuo |

**Setup completo: ~3 a 4 semanas por cliente. Trabalho ativo seu: ~10 a 12 horas por cliente.**

**Capacidade realista para 1 pessoa**:
- ~8 a 10 clientes ativos em paralelo (em fases diferentes)
- ~2 a 3 novos clientes por semana entrando
- Recorrência da Fase 6/7: ~30 min por cliente por semana

O sistema vai mostrar isso em tempo real: **"Você está em 7 / 10 da capacidade"**.

## Telas do sistema

### 1. Dashboard
- Banner de lembretes do dia ("Você tem 4 lembretes para hoje")
- Resumo: clientes ativos, em onboarding, atrasados, prontos para próxima fase
- **Tarefas de hoje** consolidadas de todos os clientes em um só lugar
- Indicador de capacidade: "X / 10 clientes ativos"

### 2. Kanban de Clientes (tela principal)
- 7 colunas (uma por fase do PDL)
- Cartões com: nome, dias na fase, % de tarefas concluídas, próxima ação, sinal de atraso (verde/amarelo/vermelho)
- Drag-and-drop entre fases (bloqueado se a fase atual não estiver 100% — regra de ouro do playbook)
- Filtros: atrasados, sem ação hoje, novos da semana

### 3. Cadastro de Cliente Novo
- Botão "+ Novo Cliente" abre cadastro mínimo
- Sistema gera **link único de briefing** para enviar ao cliente
- Quando o cliente preenche e envia, o cartão aparece automaticamente em **Onboarding** com status "Briefing recebido"

### 4. Formulário de Briefing (link público que o cliente preenche)
Baseado no formulário que você passou + os 3 campos extras necessários para o site:
- Dados do responsável, empresa, NAP completo (regra de ouro do playbook)
- Segmento, data de abertura, bairros atendidos, horários
- Serviços, problema que resolve, público, diferencial, dúvidas frequentes, restrições
- Estrutura operacional (sozinho/equipe, capacidade, agendamento, pagamentos)
- Atributos do local (estacionamento, acessibilidade, banheiro, wi-fi, kids)
- **+ Nome do responsável (como aparece no site)**
- **+ Bio em 2 frases**
- **+ Slogan curto**
- Aviso para enviar fotos por WhatsApp depois

### 5. Detalhe do Cliente
Tudo numa tela só, em abas:
- **Resumo**: NAP, fase atual, prazo previsto vs. real, validador NAP automático
- **Checklist da fase atual**: tarefas do playbook pré-carregadas (Fase 4 traz: descrição 750 char, 2–5 categorias, atributos, serviços com preço, 10 fotos, capa, logo + tarefas de site e blog)
- **Central de Site & Blog** (ver tela 6)
- **Histórico de fases** (recolhível)
- **Observações** livres
- **Agenda do cliente** (mini-calendário)
- **Anexos**: vídeo de verificação, fotos, prints

### 6. Central de Site & Blog (a parte nova)
Aba dentro do cliente, dividida em 3 blocos:

**Bloco A — Identidade visual (manual, definida por você)**
- Campos para cores da marca (HEX), referências visuais, observações de estilo
- Esses campos só você preenche — não vão para o cliente

**Bloco B — Geração do Site (Prompt 1)**
- Botão **"Gerar prompt do site"** — monta o Prompt 1 com TODOS os dados do briefing já substituídos automaticamente
- Botão **"Copiar prompt"** — copia para a área de transferência
- Instruções curtas na tela: "1) Duplique a pasta do template e renomeie. 2) Abra no Google Antigravity. 3) Cole o prompt."
- Checkbox "Site gerado e revisado"
- Campo para colar a URL final do site

**Bloco C — Geração do Blog (Prompts 2 e 3)**
- Botão **"Gerar prompt de pauta"** (Prompt 2) → você roda no Antigravity, recebe os 9 temas
- Campo para colar a tabela de 9 temas devolvida — o sistema parseia e cria 9 cartões de artigo
- Para cada artigo: status (a fazer / em revisão / publicado), botão **"Gerar prompt deste artigo"** (Prompt 3) já com tema, palavra-chave e formato preenchidos, campo para colar o texto final, campo de URL publicada
- Visão geral: "3 / 9 artigos publicados"

### 7. Agenda Embutida
- Visões: **Dia / Semana / Mês / Ano**
- Mostra: lembretes de clientes, tarefas recorrentes (postagens semanais Fase 6, revisões mensais Fase 7), **feriados nacionais brasileiros** pré-cadastrados
- Cores por cliente
- Notificação visual no topo do sistema quando há lembrete do dia (banner discreto com "OK" ou "Abrir agenda")

### 8. Biblioteca de Templates (admin)
- **Prompt mestre do site** (Prompt 1) editável — você ajusta sem mexer em código
- **Prompt de pauta** (Prompt 2) editável
- **Prompt de artigo** (Prompt 3) editável
- **Tarefas-padrão por fase** editáveis
- Assim você evolui o processo conforme aprende, sem depender de mim

## Como o playbook + os prompts viram trabalho automatizado

Cada fase do Kanban traz checklist pré-carregado vindo do PDL. Exemplo da **Fase 4** (a mais densa) já vem com:
- Descrição de 750 caracteres publicada
- 2 a 5 categorias secundárias
- Atributos relevantes marcados
- Serviços com preço e descrição
- 10 fotos internas + capa + logo
- **Site personalizado gerado (Prompt 1)**
- **9 artigos do blog gerados e publicados (Prompts 2 e 3)**
- Schema LocalBusiness ativo
- SEO on-page revisado

## Otimização para escala (até 10 clientes ativos)

- Tarefas recorrentes (postagens, revisões mensais) geradas automaticamente na agenda
- Templates de mensagens (briefing, roteiro de vídeo de verificação) com variáveis preenchidas
- Atalhos de teclado para mover cartões e marcar tarefas
- Indicador de carga em tempo real
- Validador NAP automático (regra de ouro do playbook)
- Gerador de link `wa.me` com mensagem pré-formatada (Fase 7 do playbook)

## Surpresas adicionais (que faz sentido incluir)

1. **Linha do tempo do cliente** — histórico visual de início/fim de cada fase (bom para mostrar progresso ao cliente)
2. **Exportar checklist em PDF** — prova de execução ou entrega final
3. **Painel de bloqueios** — cartões parados há mais de X dias por espera externa (cliente, Google) ficam destacados
4. **Atalho "Próxima ação"** — em qualquer cartão, mostra qual é literalmente a próxima coisa a fazer

## Detalhes técnicos

- **Stack**: React + Tailwind + shadcn/ui (já no projeto)
- **Backend**: Lovable Cloud (banco, autenticação, formulário público de briefing) — clientes, fases, tarefas, observações, eventos da agenda, prompts e artigos persistidos
- **Autenticação**: e-mail/senha (uso interno)
- **Kanban**: drag-and-drop com `@dnd-kit`
- **Calendário**: shadcn Calendar com visões dia/semana/mês/ano e feriados BR pré-carregados
- **Notificações**: toast + banner persistente no topo
- **Templates de prompt**: armazenados em banco, com variáveis tipo `{{nome_empresa}}` substituídas em tempo real pelos dados do cliente
- **Briefing público**: rota `/briefing/:token` acessível sem login, salva direto no cartão do cliente
- **Por enquanto**: usuário único (você). Estrutura pronta para adicionar funcionários e atribuição depois, sem reescrever.

## Fora de escopo nesta primeira versão

- Atribuição de clientes a funcionários (estrutura pronta, UI depois)
- Integração direta com API do Google Business Profile (continua manual, sistema só guia)
- Integração direta com API do Antigravity (você copia/cola — funciona com qualquer ferramenta)
- Geração automática dos artigos pela própria IA dentro do sistema (custaria caro e ficaria pior; o fluxo via Antigravity entrega mais qualidade)
- Faturamento/financeiro
- Portal do cliente

## Ordem de construção sugerida

1. Banco + autenticação + cadastro de cliente + Kanban com 7 fases
2. Detalhe do cliente + checklists pré-carregados do playbook
3. Formulário público de briefing
4. Central de Site & Blog com os 3 prompts editáveis e geração automática
5. Agenda + lembretes + feriados + notificação no topo
6. Dashboard + indicador de capacidade + linha do tempo + exportações

Se aprovar, começo pela base (1 e 2) para você já conseguir cadastrar a sua cliente atual e ver o pipeline funcionando.
