import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, BookOpen, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────
   Dados do Guia de Execução — extraídos do PDF
   ────────────────────────────────────────────── */

type GuideStep = { text: string; link?: string };
type GuideSection = { subtitle?: string; steps: GuideStep[] };
type PhaseGuide = { id: number; title: string; color: string; sections: GuideSection[] };

const GUIDE_DATA: PhaseGuide[] = [
  {
    id: 1,
    title: "Fase 1 — Onboarding",
    color: "hsl(var(--phase-1))",
    sections: [
      {
        subtitle: "Coleta de dados do cliente",
        steps: [
          { text: "Enviar formulário de briefing ao cliente" },
          { text: "Aguardar formulário 100% preenchido — não avançar com campos em branco" },
          { text: "Confirmar nome comercial exato (igual à fachada, CNPJ e papelaria — sem siglas)" },
          { text: "Confirmar endereço completo: rua, número, complemento, bairro, cidade, estado, CEP" },
          { text: "Confirmar telefone principal com DDD" },
          { text: "Confirmar WhatsApp com DDD" },
          { text: "Confirmar horário de funcionamento: seg–sex, sábado, domingo e feriados" },
          { text: "Confirmar URL do site (com https:// — verificar se está ativo)" },
          { text: "Confirmar serviço principal (o que mais gera lucro ou quer focar)" },
          { text: "Confirmar lista completa de serviços secundários" },
          { text: "Receber 10 fotos externas diurnas da fachada" },
          { text: "Receber 10 fotos internas do espaço de atendimento" },
          { text: "Receber logo em PNG ou vetor de alta qualidade" },
          { text: "Receber foto de capa em alta resolução" },
          { text: "Confirmar atributos: Wi-Fi, estacionamento, acessibilidade, banheiro, formas de pagamento" },
          { text: "Solicitar documento de segurança: conta de luz/água no endereço + alvará de funcionamento" },
          { text: "Definir tipo de negócio: LOJA FÍSICA (cliente vai até o local) ou PRESTADOR DE SERVIÇO (vai até o cliente)" },
          { text: "Confirmar se atende com hora marcada, por ordem de chegada ou ambos" },
        ],
      },
      {
        subtitle: "Pesquisa de palavras-chave (interna — você faz, cliente não vê)",
        steps: [
          { text: "Abrir Google Maps e buscar: [nicho] + [cidade do cliente]", link: "https://maps.google.com" },
          { text: "Identificar os 3 primeiros concorrentes ranqueados no Maps" },
          { text: "Colar o site de cada concorrente no Ubersuggest → capturar palavras-chave que ranqueiam", link: "https://neilpatel.com/br/ubersuggest/" },
          { text: "Google autocomplete: digitar nicho + cidade e capturar todas as sugestões que aparecem" },
          { text: 'Capturar perguntas da seção "Pessoas também perguntam" no Google' },
          { text: "Para nichos de saúde: usar keywordtool.io (sem restrição de categoria)", link: "https://keywordtool.io" },
          { text: "Montar lista final de palavras-chave: 1 principal, 3–5 variações com bairros e cidade, 5–10 de cauda longa" },
          { text: "Salvar lista de palavras-chave no briefing do cliente antes de avançar" },
        ],
      },
    ],
  },
  {
    id: 2,
    title: "Fase 2 — Criação do Perfil",
    color: "hsl(var(--phase-2))",
    sections: [
      {
        steps: [
          { text: "Abrir janela anônima no navegador (Ctrl+Shift+N no Chrome)" },
          { text: "Acessar business.google.com com e-mail corporativo da agência — nunca e-mail pessoal", link: "https://business.google.com" },
          { text: "Digitar nome comercial EXATO — sem palavras-chave, sem cidade, sem serviços no nome" },
          { text: "Verificar se já existe perfil do cliente nas sugestões do Google" },
          { text: 'Se existir: clicar em "Reivindicar esta empresa" e seguir o fluxo' },
          { text: 'Se não existir: clicar em "Criar uma empresa com este nome"' },
          { text: "Selecionar categoria principal com máxima especificidade (usar a palavra-chave principal da lista)" },
          { text: 'Se LOJA FÍSICA: marcar "Sim" para localização → preencher endereço completo' },
          { text: "Se LOJA FÍSICA: verificar se o pino caiu exatamente sobre o imóvel — arrastar manualmente se necessário" },
          { text: 'Se PRESTADOR DE SERVIÇO: marcar "Não" → configurar polígonos de cobertura com cidades e bairros exatos' },
          { text: "Preencher DDD + telefone principal" },
          { text: "Colar URL do site com https://" },
          { text: "Confirmar criação — não avançar para Fase 3 sem perfil criado ou reivindicado" },
        ],
      },
    ],
  },
  {
    id: 3,
    title: "Fase 3 — Verificação por Vídeo",
    color: "hsl(var(--phase-3))",
    sections: [
      {
        subtitle: "Roteiro de gravação para enviar ao cliente",
        steps: [
          { text: "Copiar roteiro de gravação do vídeo (disponível abaixo)" },
          { text: "Enviar roteiro ao cliente pelo WhatsApp" },
          { text: "Ligar para o cliente logo após para confirmar que entendeu todas as regras" },
          { text: "Aguardar o cliente enviar o vídeo gravado" },
          { text: "Verificar o vídeo recebido: mínimo 30s, máximo 2 min, sem cortes, sem filtros" },
          { text: "Verificar: sem rosto de clientes, sem documentos sensíveis visíveis" },
          { text: "Subir o vídeo na plataforma conforme solicitado pelo Google" },
          { text: 'Confirmar status "Processando a verificação" no painel' },
          { text: "NÃO mexer em nenhum campo do perfil durante os 5 dias úteis de análise" },
          { text: 'Confirmar aprovação e selo "Verificado" ativo antes de avançar' },
          { text: "Se reprovado: identificar o motivo, orientar nova gravação e repetir o processo" },
        ],
      },
      {
        subtitle: "📋 Roteiro de vídeo (copiar e enviar ao cliente)",
        steps: [
          { text: "\"Bom dia/Boa tarde, meu nome é [nome], sou [cargo] da [empresa].\"" },
          { text: "Filmar a fachada mostrando o nome visível da empresa" },
          { text: "Entrar no estabelecimento filmando o interior" },
          { text: "Mostrar um documento com endereço (conta de luz, alvará)" },
          { text: "Não filtar rostos de clientes ou documentos sensíveis" },
          { text: "Vídeo contínuo, sem cortes, sem filtros, entre 30s e 2 minutos" },
          { text: "Enviar em alta resolução (não comprimir pelo WhatsApp → enviar como documento)" },
        ],
      },
    ],
  },
  {
    id: 4,
    title: "Fase 4 — Otimização + Site",
    color: "hsl(var(--phase-4))",
    sections: [
      {
        subtitle: "Otimização do perfil no Google",
        steps: [
          { text: "Publicar descrição de até 750 caracteres (use todos — estrutura: o que faz / onde atende / diferenciais)" },
          { text: "Confirmar que palavras-chave locais aparecem de forma natural no texto (nunca em lista)" },
          { text: "Adicionar 2 a 5 categorias secundárias complementares à principal" },
          { text: "Confirmar que nenhuma categoria adicionada é sem relação com o negócio" },
          { text: "Marcar todos os atributos verdadeiros: Wi-Fi, acessibilidade, estacionamento, Pix, banheiro" },
          { text: "Cadastrar serviço principal: nome específico + tipo de preço + descrição (metodologia + garantia + dor que resolve)" },
          { text: "Cadastrar cada serviço secundário: nome específico + tipo de preço + descrição" },
        ],
      },
      {
        subtitle: "Fotos com Geotagging",
        steps: [
          { text: "Abrir GeoSetter com todas as fotos do cliente", link: "https://geosetter.de/en/" },
          { text: "Localizar coordenadas exatas do pin do negócio no Google Maps (botão direito no pin → copiar coordenadas)" },
          { text: "No GeoSetter: preencher os campos Title, Description, Keywords e Copyright com palavras-chave do cliente" },
          { text: "Aplicar coordenadas GPS em todas as fotos em lote" },
          { text: "Salvar e confirmar que o geotagging foi aplicado antes de qualquer edição posterior" },
          { text: 'Subir fotos externas (fachada, placa, entrada) na categoria "Exterior" — mínimo 10 fotos' },
          { text: 'Subir fotos internas (recepção, atendimento, equipamentos) na categoria "Interior" — mínimo 10 fotos' },
          { text: "Subir foto de capa em alta resolução" },
          { text: 'Subir logo em PNG ou vetor na categoria "Logotipo"' },
        ],
      },
      {
        subtitle: "Site do cliente",
        steps: [
          { text: "Coletar identidade visual do cliente: cores da marca (hex ou referência visual)" },
          { text: "Duplicar pasta do template do site → renomear com nome do cliente" },
          { text: "Abrir pasta no Antigravity" },
          { text: "Rodar Prompt 1 com os dados do formulário → site personalizado" },
          { text: "Revisar site gerado: nome, serviços, textos, links, botões de WhatsApp" },
          { text: "Publicar site do cliente" },
        ],
      },
      {
        subtitle: "Blog (9 artigos)",
        steps: [
          { text: "Rodar Prompt 2 no Claude → receber pauta dos 9 artigos com prioridade" },
          { text: "Gerar e publicar artigo 1 (Prompt 3)" },
          { text: "Gerar e publicar artigo 2 (Prompt 3)" },
          { text: "Gerar e publicar artigo 3 (Prompt 3)" },
          { text: "Gerar e publicar artigo 4 (Prompt 3)" },
          { text: "Gerar e publicar artigo 5 (Prompt 3)" },
          { text: "Gerar e publicar artigo 6 (Prompt 3)" },
          { text: "Gerar e publicar artigo 7 (Prompt 3)" },
          { text: "Gerar e publicar artigo 8 (Prompt 3)" },
          { text: "Gerar e publicar artigo 9 (Prompt 3)" },
          { text: "Adicionar schema LocalBusiness JSON-LD no <head> da home do site" },
        ],
      },
    ],
  },
  {
    id: 5,
    title: "Fase 5 — Citações e Diretórios",
    color: "hsl(var(--phase-5))",
    sections: [
      {
        steps: [
          { text: "Confirmar NAP exato novamente com o formulário antes de qualquer cadastro" },
          { text: "Anotar o NAP exato em um bloco de notas para copiar e colar em todos os diretórios" },
          { text: "Cadastrar no Bing Places for Business", link: "https://www.bingplaces.com" },
          { text: "Cadastrar no Apple Maps Connect", link: "https://mapsconnect.apple.com" },
          { text: "Cadastrar no Facebook / Meta Business", link: "https://business.facebook.com" },
          { text: "Cadastrar no Apontador", link: "https://www.apontador.com.br" },
          { text: "Cadastrar no GuiaMais", link: "https://www.guiamais.com.br" },
          { text: "Cadastrar no TeleListas", link: "https://www.telelistas.net" },
          { text: "Cadastrar no Opendi Brasil", link: "https://www.opendi.com.br" },
          { text: "Cadastrar no Kekanto (nicho: alimentação, beleza, entretenimento)", link: "https://www.kekanto.com.br" },
          { text: "Cadastrar no Yelp Brasil", link: "https://www.yelp.com.br" },
          { text: "Cadastrar no Cylex Brasil", link: "https://www.cylex.com.br" },
          { text: "Cadastrar em diretório de nicho específico do cliente (ver lista no Guia de Execução)" },
          { text: "Validar consistência do NAP em todos os diretórios cadastrados" },
        ],
      },
    ],
  },
  {
    id: 6,
    title: "Fase 6 — Reputação e Engajamento",
    color: "hsl(var(--phase-6))",
    sections: [
      {
        steps: [
          { text: "Configurar meta de avaliações: 2 a 5 novas por semana" },
          { text: "Gerar QR Code nativo do perfil no painel do Google Business Profile" },
          { text: "Orientar cliente a posicionar o QR Code: balcão, cardápio, display, NFC" },
          { text: "Responder todas as avaliações existentes no perfil (prazo: 24h)" },
          { text: "Popular seção Q&A com mínimo 5 perguntas e respostas reais do negócio" },
          { text: "Criar e agendar primeira postagem semanal recorrente no perfil" },
        ],
      },
    ],
  },
  {
    id: 7,
    title: "Fase 7 — Entrega do Projeto",
    color: "hsl(var(--phase-7))",
    sections: [
      {
        steps: [
          { text: "Reunir todos os entregáveis (site publicado, blog no ar, perfil otimizado, diretórios cadastrados)" },
          { text: "Validar com o cliente que todos os dados estão corretos" },
          { text: "Enviar relatório de entrega ao cliente com resumo de tudo que foi feito" },
          { text: "Confirmar aceite formal do cliente" },
          { text: "Marcar projeto como entregue no sistema" },
        ],
      },
    ],
  },
  {
    id: 8,
    title: "Fase 8 — Manutenção Contínua",
    color: "hsl(var(--phase-8))",
    sections: [
      {
        steps: [
          { text: "Monitorar posição e métricas mensalmente: impressões, cliques, rotas, ligações" },
          { text: "Configurar link wa.me com parâmetro UTM para rastrear conversões do perfil" },
          { text: "Revisão mensal: atualizar fotos, serviços e atributos com o que mudou" },
          { text: "Responder novas avaliações em até 24h" },
          { text: "Publicar nova postagem semanal no perfil" },
          { text: "Gerar relatório mensal para o cliente com evolução das métricas" },
        ],
      },
    ],
  },
];

/* ──────────────────────────────────────────────
   Componente principal
   ────────────────────────────────────────────── */

export default function GuiaExecucao() {
  const [searchParams] = useSearchParams();
  const faseParam = searchParams.get("fase");
  const [openPhases, setOpenPhases] = useState<Set<number>>(new Set(faseParam ? [Number(faseParam)] : [1]));

  useEffect(() => {
    if (faseParam) {
      const id = Number(faseParam);
      setOpenPhases(new Set([id]));
      // Scroll to phase
      setTimeout(() => {
        document.getElementById(`guia-fase-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [faseParam]);

  function toggle(id: number) {
    setOpenPhases((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Guia de Execução PDL</h1>
          <p className="text-sm text-muted-foreground">Tutorial passo a passo de cada fase do Método PDL. Clique em uma fase para expandir.</p>
        </div>
      </div>

      <div className="space-y-3">
        {GUIDE_DATA.map((phase) => (
          <PhaseAccordion
            key={phase.id}
            phase={phase}
            isOpen={openPhases.has(phase.id)}
            onToggle={() => toggle(phase.id)}
          />
        ))}
      </div>
    </div>
  );
}

/* ──────── Accordion por fase ──────── */

function PhaseAccordion({ phase, isOpen, onToggle }: { phase: PhaseGuide; isOpen: boolean; onToggle: () => void }) {
  const totalSteps = phase.sections.reduce((sum, s) => sum + s.steps.length, 0);

  return (
    <Card id={`guia-fase-${phase.id}`} className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ background: phase.color }} />
          <span className="font-semibold">{phase.title}</span>
          <Badge variant="secondary" className="text-[10px]">{totalSteps} passos</Badge>
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {isOpen && (
        <CardContent className="pt-0 pb-5 space-y-5">
          {phase.sections.map((section, si) => (
            <div key={si}>
              {section.subtitle && (
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-2">
                  {section.subtitle}
                </h3>
              )}
              <ol className="space-y-2">
                {section.steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm group">
                    <span className="shrink-0 h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold grid place-items-center mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="flex-1">
                      {step.text}
                      {step.link && (
                        <a
                          href={step.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 ml-1.5 text-primary/70 hover:text-primary transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span className="text-xs">abrir</span>
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
