import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Wand2, Globe, RefreshCw, Copy, Trash2, Send, CheckCircle2,
  XCircle, Clock, ChevronDown, ChevronUp, Settings, Zap,
  Package, Info, Eye, EyeOff, BookOpen, User, AlertTriangle,
  Sparkles, Loader2, FileText, PenLine
} from "lucide-react";
import type { BlogArticle, Client, BriefingData } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type Section = "artigos" | "servicos" | "sobre";

interface QueueItem {
  id: string;
  title: string;
  keyword?: string | null;
  intent?: string | null;
  format?: string | null;
  status: "aguardando" | "gerando" | "pronto" | "erro";
  content: string;
  error?: string;
  categories: number[];
  wpId?: number;
  wpLink?: string;
  // For artigos: linked to blog_articles row
  articleId?: string;
}

interface WPCategory { id: number; name: string; count: number; }

interface WPConfig {
  wpUrl: string; wpUser: string; wpPass: string; wpStatus: string;
  genImage: boolean; aiSuggestCats: boolean; defaultCats: number[];
  rulesArtigos: string; rulesServicos: string; rulesSobre: string;
}

interface ClientRow {
  id: string; name: string; company_name: string | null;
  site_url: string | null; segment: string | null;
  notes: string | null; briefing_data: any;
}

interface EstrategiaData {
  estrategia?: string; discussao?: string; execucao?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const WP_CONFIG_KEY = "pdl_wpforge_config";
const DEFAULT_RULES: Record<Section, string> = {
  artigos: "Formato HTML completo (sem <html>/<head>/<body>). Use H2 e H3, parágrafos, listas. SEO otimizado com a palavra-chave no título, primeiro parágrafo e ao longo do texto. Português do Brasil. Mínimo 800 palavras.",
  servicos: "Formato HTML. Descreva o serviço em detalhes, benefícios, como funciona, para quem é indicado, diferenciais e CTA para contato. Tom profissional. Português do Brasil.",
  sobre: "Formato HTML. Apresente a empresa/profissional com história, missão, valores e credenciais. Tom humanizado e próximo. Português do Brasil.",
};

function loadWPConfig(): WPConfig {
  try {
    const raw = localStorage.getItem(WP_CONFIG_KEY);
    if (raw) return { ...{ genImage: false, aiSuggestCats: true, defaultCats: [], ...DEFAULT_RULES }, ...JSON.parse(raw) };
  } catch { /* */ }
  return { wpUrl: "", wpUser: "", wpPass: "", wpStatus: "draft", genImage: false, aiSuggestCats: true, defaultCats: [], rulesArtigos: DEFAULT_RULES.artigos, rulesServicos: DEFAULT_RULES.servicos, rulesSobre: DEFAULT_RULES.sobre };
}

function parseEstrategia(notes: string | null): EstrategiaData {
  if (!notes?.startsWith("__ESTRATEGIA__\n")) return {};
  try { return JSON.parse(notes.replace("__ESTRATEGIA__\n", "")); } catch { return {}; }
}

function buildClientContext(client: ClientRow, estrategia: EstrategiaData): string {
  const b: BriefingData = client.briefing_data ?? {};
  const lines: string[] = [
    `CLIENTE: ${client.name}`,
    `EMPRESA: ${client.company_name || "—"}`,
    `SEGMENTO: ${client.segment || b.segment || "—"}`,
    `SITE: ${client.site_url || b.website || "—"}`,
  ];
  const briefingFields: [string, string][] = [
    ["Serviço principal", b.main_service || ""],
    ["Outros serviços", b.other_services || ""],
    ["Público-alvo", b.audience || ""],
    ["Diferencial", b.differentiator || ""],
    ["Cidade/Estado", b.city_state || ""],
    ["Problema que resolve", b.problem_solved || ""],
    ["Dúvidas frequentes", b.faq || ""],
    ["O que os clientes elogiam", b.praises || ""],
    ["Slogan", b.slogan || ""],
  ];
  briefingFields.forEach(([label, val]) => { if (val) lines.push(`${label}: ${val}`); });
  if (estrategia.estrategia) lines.push("\n── ESTRATÉGIA PDL ──\n" + estrategia.estrategia.slice(0, 1500));
  if (estrategia.discussao) lines.push("\n── AJUSTES/DECISÕES ──\n" + estrategia.discussao.slice(0, 800));
  return lines.join("\n");
}

// ─── AI Callers ──────────────────────────────────────────────────────────────

async function callGPT(prompt: string): Promise<string> {
  const key = localStorage.getItem("OPENAI_API_KEY") || "";
  if (!key) throw new Error("Chave OpenAI não configurada em Configurações.");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 4096 }),
  });
  if (!res.ok) { const e: any = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
  const d = await res.json();
  return d.choices?.[0]?.message?.content || "";
}

async function callGemini(prompt: string): Promise<string> {
  const key = localStorage.getItem("GEMINI_API_KEY") || "";
  if (!key) throw new Error("Chave Gemini não configurada em Configurações.");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 4096 } }),
  });
  if (!res.ok) { const e: any = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `HTTP ${res.status}`); }
  const d = await res.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function uid() { return Math.random().toString(36).slice(2, 9); }

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GeradorWP() {
  const openAiKey = localStorage.getItem("OPENAI_API_KEY") || "";
  const geminiKey = localStorage.getItem("GEMINI_API_KEY") || "";
  const activeKey = openAiKey ? "openai" : geminiKey ? "gemini" : null;

  const [aiModel, setAiModel] = useState<"openai" | "gemini">(openAiKey ? "openai" : "gemini");
  const [wpConfig, setWPConfig] = useState<WPConfig>(loadWPConfig);
  const [wpCategories, setWPCategories] = useState<WPCategory[]>([]);
  const [fetchingCats, setFetchingCats] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showWPPass, setShowWPPass] = useState(false);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [estrategia, setEstrategia] = useState<EstrategiaData>({});
  const [loadingClient, setLoadingClient] = useState(false);

  const [queues, setQueues] = useState<Record<Section, QueueItem[]>>({ artigos: [], servicos: [], sobre: [] });
  const [activeSection, setActiveSection] = useState<Section>("artigos");
  const [generating, setGenerating] = useState<string | null>(null); // itemId being generated

  const [publishLog, setPublishLog] = useState<{ text: string; type: "info" | "ok" | "err" }[]>([]);
  const [publishing, setPublishing] = useState(false);

  const [editItem, setEditItem] = useState<{ section: Section; id: string } | null>(null);
  const [editContent, setEditContent] = useState("");

  const [estrategiaExpanded, setEstrategiaExpanded] = useState(false);

  // Load all clients
  useEffect(() => {
    supabase.from("clients")
      .select("id,name,company_name,site_url,segment,notes,briefing_data")
      .order("name")
      .then(({ data }) => { if (data) setClients(data as ClientRow[]); });
  }, []);

  // When client changes: load blog_articles + parse estrategia
  async function selectClient(c: ClientRow) {
    setLoadingClient(true);
    setSelectedClient(c);
    setQueues({ artigos: [], servicos: [], sobre: [] });

    // Parse strategy from notes
    const est = parseEstrategia(c.notes);
    setEstrategia(est);

    // Load blog_articles from Supabase
    const { data: articles } = await supabase
      .from("blog_articles")
      .select("*")
      .eq("client_id", c.id)
      .order("position");

    if (articles && articles.length > 0) {
      const items: QueueItem[] = (articles as BlogArticle[]).map(a => ({
        id: uid(),
        articleId: a.id,
        title: a.title,
        keyword: a.keyword,
        intent: a.intent,
        format: a.format,
        status: "aguardando",
        content: a.content || "",
        categories: wpConfig.defaultCats,
      }));
      setQueues(prev => ({ ...prev, artigos: items }));
    }

    // Pre-populate Serviços and Sobre from briefing data
    const b: BriefingData = c.briefing_data ?? {};
    const servicos: string[] = [];
    if (b.main_service) servicos.push(b.main_service);
    if (b.other_services) {
      b.other_services.split(/[,;\n]/).map(s => s.trim()).filter(Boolean).forEach(s => servicos.push(s));
    }
    const servicoItems: QueueItem[] = servicos.slice(0, 8).map(title => ({
      id: uid(), title, status: "aguardando", content: "", categories: wpConfig.defaultCats,
    }));

    const sobreItems: QueueItem[] = [
      { id: uid(), title: `Sobre ${c.company_name || c.name}`, status: "aguardando", content: "", categories: wpConfig.defaultCats },
    ];

    if (c.site_url) {
      const cfg = { ...wpConfig, wpUrl: c.site_url.replace(/\/$/, "") };
      setWPConfig(cfg);
      localStorage.setItem(WP_CONFIG_KEY, JSON.stringify(cfg));
    }

    setQueues(prev => ({ ...prev, servicos: servicoItems, sobre: sobreItems }));
    setLoadingClient(false);
    toast.success(`Cliente "${c.company_name || c.name}" carregado!`);
  }

  const callAI = useCallback((prompt: string) => {
    return aiModel === "openai" ? callGPT(prompt) : callGemini(prompt);
  }, [aiModel]);

  // Generate single item
  async function generateOne(section: Section, itemId: string) {
    if (!selectedClient) { toast.error("Selecione um cliente primeiro!"); return; }
    if (!activeKey) { toast.error("Configure uma chave de IA em Configurações!"); return; }

    const item = queues[section].find(i => i.id === itemId);
    if (!item) return;

    setGenerating(itemId);
    setQueues(prev => ({ ...prev, [section]: prev[section].map(i => i.id === itemId ? { ...i, status: "gerando" } : i) }));

    const ctx = buildClientContext(selectedClient, estrategia);
    const rules = section === "artigos" ? wpConfig.rulesArtigos : section === "servicos" ? wpConfig.rulesServicos : wpConfig.rulesSobre;
    const sectionLabel = section === "artigos" ? "artigo de blog SEO" : section === "servicos" ? "página de serviço" : "página Sobre";

    const keywordLine = item.keyword ? `\nPALAVRA-CHAVE PRINCIPAL: "${item.keyword}"` : "";
    const intentLine = item.intent ? `\nINTENÇÃO DE BUSCA: ${item.intent}` : "";
    const formatLine = item.format ? `\nFORMATO: ${item.format}` : "";

    const prompt = `Você é um redator especialista em SEO Local e marketing digital para pequenas empresas brasileiras.

CONTEXTO DO CLIENTE:
${ctx}

TAREFA: Gere o conteúdo completo para o seguinte ${sectionLabel}:
TÍTULO: "${item.title}"${keywordLine}${intentLine}${formatLine}

REGRAS DE FORMATAÇÃO:
${rules}

IMPORTANTE: Use os dados reais do cliente acima. Mencione o nome da empresa, cidade, serviços específicos e diferenciais reais. Não seja genérico.

Retorne APENAS o HTML do conteúdo, sem explicações ou markdown.`;

    try {
      const content = await callAI(prompt);

      // Suggest categories with AI
      let categories = wpConfig.defaultCats;
      if (wpCategories.length && wpConfig.aiSuggestCats && content) {
        try {
          const catList = wpCategories.map(c => `${c.id}:${c.name}`).join(", ");
          const catPrompt = `Dado o título: "${item.title}"\nCategorias WP disponíveis: ${catList}\nRetorne APENAS os IDs mais relevantes (máximo 3), separados por vírgula. Apenas números.`;
          const raw = await callAI(catPrompt);
          const ids = raw.match(/\d+/g)?.map(Number).slice(0, 3) || [];
          if (ids.length) categories = ids;
        } catch { /* keep defaults */ }
      }

      // Update blog_article content in Supabase if linked
      if (item.articleId && content) {
        await supabase.from("blog_articles").update({ content, status: "in_review" }).eq("id", item.articleId);
      }

      setQueues(prev => ({
        ...prev,
        [section]: prev[section].map(i => i.id === itemId ? { ...i, status: "pronto", content, categories } : i)
      }));
    } catch (e: any) {
      setQueues(prev => ({
        ...prev,
        [section]: prev[section].map(i => i.id === itemId ? { ...i, status: "erro", error: e.message } : i)
      }));
      toast.error(e.message);
    }
    setGenerating(null);
  }

  async function generateAll(section: Section) {
    const pending = queues[section].filter(i => i.status === "aguardando" || i.status === "erro");
    if (!pending.length) { toast.info("Nenhum item aguardando!"); return; }
    for (const item of pending) {
      await generateOne(section, item.id);
      await sleep(500);
    }
    toast.success(`Todos os itens de "${section}" gerados!`);
  }

  function updateTitle(section: Section, id: string, title: string) {
    setQueues(prev => ({ ...prev, [section]: prev[section].map(i => i.id === id ? { ...i, title } : i) }));
  }

  function addCustomItem(section: Section) {
    const title = prompt(`Título para novo item de ${section}:`);
    if (!title?.trim()) return;
    setQueues(prev => ({
      ...prev,
      [section]: [...prev[section], { id: uid(), title: title.trim(), status: "aguardando", content: "", categories: wpConfig.defaultCats }]
    }));
  }

  function removeItem(section: Section, id: string) {
    setQueues(prev => ({ ...prev, [section]: prev[section].filter(i => i.id !== id) }));
  }

  // WP Config
  function saveWPConfig(cfg: WPConfig) {
    setWPConfig(cfg);
    localStorage.setItem(WP_CONFIG_KEY, JSON.stringify(cfg));
    toast.success("Configurações WordPress salvas!");
  }

  async function fetchCategories() {
    if (!wpConfig.wpUrl || !wpConfig.wpUser || !wpConfig.wpPass) {
      toast.error("Configure URL e credenciais WordPress!"); return;
    }
    setFetchingCats(true);
    try {
      const creds = btoa(`${wpConfig.wpUser}:${wpConfig.wpPass}`);
      const res = await fetch(`${wpConfig.wpUrl}/wp-json/wp/v2/categories?per_page=100`, { headers: { Authorization: `Basic ${creds}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cats: any[] = await res.json();
      setWPCategories(cats.map(c => ({ id: c.id, name: c.name, count: c.count })));
      toast.success(`${cats.length} categorias carregadas!`);
    } catch (e: any) { toast.error("Erro: " + e.message); }
    finally { setFetchingCats(false); }
  }

  // Publish
  async function publishItem(section: Section, item: QueueItem) {
    const { wpUrl, wpUser, wpPass, wpStatus } = wpConfig;
    if (!wpUrl || !wpUser || !wpPass) {
      setPublishLog(l => [...l, { text: "Configure o WordPress primeiro!", type: "err" }]); return;
    }
    const creds = btoa(`${wpUser}:${wpPass}`);
    const postType = section === "artigos" ? "posts" : "pages";
    const body: any = { title: item.title, content: item.content, status: wpStatus || "draft" };
    if (section === "artigos" && item.categories.length) body.categories = item.categories;
    try {
      const res = await fetch(`${wpUrl}/wp-json/wp/v2/${postType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${creds}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const d = await res.json();
        setQueues(prev => ({ ...prev, [section]: prev[section].map(i => i.id === item.id ? { ...i, wpId: d.id, wpLink: d.link } : i) }));
        // Mark as published in Supabase if linked article
        if (item.articleId) {
          await supabase.from("blog_articles").update({ status: "published", published_url: d.link }).eq("id", item.articleId);
        }
        setPublishLog(l => [...l, { text: `✓ "${item.title}" publicado (ID ${d.id})`, type: "ok" }]);
      } else {
        const e: any = await res.json().catch(() => ({}));
        setPublishLog(l => [...l, { text: `✗ "${item.title}": ${e?.message || "Erro " + res.status}`, type: "err" }]);
      }
    } catch (e: any) { setPublishLog(l => [...l, { text: `✗ "${item.title}": ${e.message}`, type: "err" }]); }
  }

  async function publishSection(section: Section) {
    const ready = queues[section].filter(i => i.status === "pronto");
    if (!ready.length) { toast.error("Nenhum item pronto nesta seção!"); return; }
    setPublishing(true);
    setPublishLog([{ text: `🚀 Publicando ${ready.length} item(ns) de ${section}...`, type: "info" }]);
    for (const item of ready) { await publishItem(section, item); await sleep(400); }
    setPublishLog(l => [...l, { text: "✓ Concluído!", type: "ok" }]);
    setPublishing(false);
  }

  // Stats
  const readyCount = (s: Section) => queues[s].filter(i => i.status === "pronto").length;
  const totalReady = (["artigos", "servicos", "sobre"] as Section[]).reduce((a, s) => a + readyCount(s), 0);
  const hasEstrategia = !!(estrategia.estrategia || estrategia.execucao);

  const sectionConfig: Record<Section, { label: string; icon: React.ReactNode; color: string }> = {
    artigos: { label: "Artigos de Blog", icon: <BookOpen className="h-4 w-4" />, color: "text-blue-600" },
    servicos: { label: "Páginas de Serviço", icon: <Package className="h-4 w-4" />, color: "text-purple-600" },
    sobre: { label: "Página Sobre", icon: <Info className="h-4 w-4" />, color: "text-emerald-600" },
  };

  return (
    <div className="p-6 space-y-5 max-w-5xl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" /> Gerador WP
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gere e publique conteúdo WordPress com IA — títulos e estratégia puxados do PDL FLOW
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {activeKey ? (
            <Badge variant="secondary" className="gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {aiModel === "openai" ? "GPT-4o-mini" : "Gemini 2.5 Flash"}
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1 text-xs">
              <XCircle className="h-3 w-3" /> Sem chave de IA
            </Badge>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowConfig(v => !v)}>
            <Settings className="h-4 w-4" /> WordPress
          </Button>
        </div>
      </div>

      {/* ── No API key warning ─────────────────────────────────────────── */}
      {!activeKey && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-3 flex items-center gap-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <span>Configure sua chave <strong>OpenAI</strong> ou <strong>Gemini</strong> em <strong>Configurações</strong> para usar o Gerador WP.</span>
          </CardContent>
        </Card>
      )}

      {/* ── Client Selector ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Selecionar Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Cliente PDL</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={selectedClient?.id || ""}
                onChange={e => {
                  const c = clients.find(x => x.id === e.target.value);
                  if (c) selectClient(c);
                }}
              >
                <option value="">— Selecione um cliente —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.company_name || c.name}{c.segment ? ` · ${c.segment}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Modelo de IA</Label>
              <div className="flex gap-2">
                {[
                  { value: "openai", label: "GPT-4o-mini", disabled: !openAiKey },
                  { value: "gemini", label: "Gemini 2.5 Flash", disabled: !geminiKey },
                ].map(m => (
                  <button
                    key={m.value}
                    disabled={m.disabled}
                    onClick={() => setAiModel(m.value as any)}
                    className={`flex-1 px-3 py-2 rounded-md text-sm border transition-colors ${
                      aiModel === m.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : m.disabled
                        ? "border-border text-muted-foreground opacity-50 cursor-not-allowed"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loadingClient && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando dados do cliente...
            </div>
          )}

          {selectedClient && !loadingClient && (
            <div className="flex flex-wrap gap-3 pt-1">
              {selectedClient.site_url && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Globe className="h-3 w-3" /> {selectedClient.site_url}
                </Badge>
              )}
              {selectedClient.segment && (
                <Badge variant="outline" className="gap-1 text-xs">{selectedClient.segment}</Badge>
              )}
              <Badge variant={hasEstrategia ? "default" : "secondary"} className="gap-1 text-xs">
                <Sparkles className="h-3 w-3" />
                {hasEstrategia ? "Estratégia carregada" : "Sem estratégia gerada"}
              </Badge>
              <Badge variant={queues.artigos.length > 0 ? "default" : "secondary"} className="gap-1 text-xs">
                <BookOpen className="h-3 w-3" />
                {queues.artigos.length > 0 ? `${queues.artigos.length} artigos na pauta` : "Sem pauta de artigos"}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Strategy Panel ─────────────────────────────────────────────── */}
      {selectedClient && hasEstrategia && (
        <Card className="border-primary/20 bg-primary/3">
          <CardHeader
            className="pb-2 cursor-pointer"
            onClick={() => setEstrategiaExpanded(v => !v)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Estratégia PDL — Contexto usado na geração
                <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">Ativo</Badge>
              </CardTitle>
              {estrategiaExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
            <p className="text-xs text-muted-foreground">
              A IA usará a estratégia e o briefing do cliente para gerar conteúdo personalizado e preciso.
            </p>
          </CardHeader>
          {estrategiaExpanded && (
            <CardContent className="space-y-3 border-t pt-3">
              {estrategia.estrategia && (
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estratégia</Label>
                  <pre className="mt-1 text-xs whitespace-pre-wrap bg-background border rounded p-3 max-h-48 overflow-y-auto font-sans leading-relaxed">
                    {estrategia.estrategia}
                  </pre>
                </div>
              )}
              {estrategia.discussao && (
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ajustes / Decisões</Label>
                  <pre className="mt-1 text-xs whitespace-pre-wrap bg-background border rounded p-3 max-h-32 overflow-y-auto font-sans leading-relaxed">
                    {estrategia.discussao}
                  </pre>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      {selectedClient && (
        <div className="grid grid-cols-3 gap-3">
          {(["artigos", "servicos", "sobre"] as Section[]).map(s => (
            <Card key={s} className="text-center py-3 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setActiveSection(s)}>
              <div className={`text-2xl font-bold ${sectionConfig[s].color}`}>{readyCount(s)}/{queues[s].length}</div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                {sectionConfig[s].icon} {s}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Content Tabs ───────────────────────────────────────────────── */}
      {selectedClient ? (
        <Tabs value={activeSection} onValueChange={v => setActiveSection(v as Section)}>
          <TabsList className="w-full">
            {(["artigos", "servicos", "sobre"] as Section[]).map(s => (
              <TabsTrigger key={s} value={s} className="flex-1 gap-1.5 text-xs sm:text-sm">
                {sectionConfig[s].icon} {sectionConfig[s].label}
                {queues[s].length > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{queues[s].length}</Badge>}
              </TabsTrigger>
            ))}
          </TabsList>

          {(["artigos", "servicos", "sobre"] as Section[]).map(section => (
            <TabsContent key={section} value={section} className="mt-4 space-y-3">
              {/* Section header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="font-semibold text-sm">{sectionConfig[section].label}</h2>
                  {section === "artigos" && queues.artigos.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Nenhum artigo encontrado. Os artigos são definidos pelos Agentes IA na aba Site & Blog do cliente.
                    </p>
                  )}
                  {section === "artigos" && queues.artigos.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Títulos puxados da pauta definida pelos Agentes. Edite se necessário.
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => addCustomItem(section)}>
                    + Adicionar título
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => generateAll(section)}
                    disabled={!queues[section].some(i => i.status === "aguardando" || i.status === "erro") || !!generating}
                  >
                    <Zap className="h-3.5 w-3.5" /> Gerar todos
                  </Button>
                  {readyCount(section) > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs text-green-600 border-green-500/50"
                      onClick={() => publishSection(section)}
                      disabled={publishing}
                    >
                      <Send className="h-3.5 w-3.5" /> Publicar prontos
                    </Button>
                  )}
                </div>
              </div>

              {/* Queue list */}
              {queues[section].length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-10 text-center text-muted-foreground">
                    <div className="text-4xl mb-2 opacity-30">{section === "artigos" ? "📰" : section === "servicos" ? "📦" : "👤"}</div>
                    <p className="text-sm">
                      {section === "artigos"
                        ? "Nenhuma pauta de artigos definida para este cliente ainda."
                        : section === "servicos"
                        ? "Nenhum serviço encontrado no briefing. Adicione manualmente."
                        : "Nenhum item. Adicione manualmente."}
                    </p>
                    <Button size="sm" variant="outline" className="mt-3 gap-1" onClick={() => addCustomItem(section)}>
                      + Adicionar item
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {queues[section].map(item => (
                    <QueueCard
                      key={item.id}
                      item={item}
                      categories={wpCategories}
                      isGenerating={generating === item.id}
                      onTitleChange={(t) => updateTitle(section, item.id, t)}
                      onGenerate={() => generateOne(section, item.id)}
                      onRemove={() => removeItem(section, item.id)}
                      onEdit={() => { setEditItem({ section, id: item.id }); setEditContent(item.content); }}
                      onCopy={() => { navigator.clipboard.writeText(item.content); toast.success("Copiado!"); }}
                      onPublish={() => { setPublishLog([]); publishItem(section, item); }}
                    />
                  ))}
                </div>
              )}

              {/* Publish log */}
              {publishLog.length > 0 && (
                <div className="rounded-md bg-background border p-3 space-y-1 max-h-40 overflow-y-auto font-mono text-xs">
                  {publishLog.map((l, i) => (
                    <div key={i} className={l.type === "ok" ? "text-green-600" : l.type === "err" ? "text-destructive" : "text-muted-foreground"}>
                      {l.text}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
            <Wand2 className="h-12 w-12 opacity-20" />
            <div>
              <p className="font-medium">Selecione um cliente para começar</p>
              <p className="text-sm mt-1 opacity-70">O gerador puxará automaticamente os artigos da pauta, serviços do briefing e a estratégia dos Agentes IA.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Publish All ────────────────────────────────────────────────── */}
      {totalReady > 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Publicar tudo no WordPress</p>
              <p className="text-xs text-muted-foreground">{totalReady} item(ns) pronto(s) em todas as seções</p>
            </div>
            <Button
              onClick={async () => {
                setPublishing(true);
                setPublishLog([{ text: `🚀 Publicando ${totalReady} item(ns)...`, type: "info" }]);
                for (const s of ["artigos", "servicos", "sobre"] as Section[]) {
                  for (const item of queues[s].filter(i => i.status === "pronto")) {
                    await publishItem(s, item); await sleep(400);
                  }
                }
                setPublishLog(l => [...l, { text: "✓ Tudo publicado!", type: "ok" }]);
                setPublishing(false);
              }}
              disabled={publishing}
              className="gap-2 bg-green-600 hover:bg-green-700 shrink-0"
            >
              <Send className="h-4 w-4" /> {publishing ? "Publicando..." : "Publicar tudo"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── WordPress Config Panel ─────────────────────────────────────── */}
      {showConfig && (
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4" /> Configurações WordPress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">URL do WordPress</Label>
                <Input placeholder="https://seusite.com.br" value={wpConfig.wpUrl} onChange={e => setWPConfig(p => ({ ...p, wpUrl: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status de publicação</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={wpConfig.wpStatus} onChange={e => setWPConfig(p => ({ ...p, wpStatus: e.target.value }))}>
                  <option value="draft">Rascunho</option>
                  <option value="publish">Publicado</option>
                  <option value="private">Privado</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Usuário WordPress</Label>
                <Input placeholder="admin" value={wpConfig.wpUser} onChange={e => setWPConfig(p => ({ ...p, wpUser: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Application Password</Label>
                <div className="flex gap-2">
                  <Input type={showWPPass ? "text" : "password"} placeholder="xxxx xxxx xxxx xxxx" value={wpConfig.wpPass} onChange={e => setWPConfig(p => ({ ...p, wpPass: e.target.value }))} />
                  <Button variant="ghost" size="icon" onClick={() => setShowWPPass(v => !v)}>
                    {showWPPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Regras de geração por seção</Label>
              {(["artigos", "servicos", "sobre"] as Section[]).map(s => (
                <div key={s} className="space-y-1">
                  <Label className="text-xs">{sectionConfig[s].label}</Label>
                  <Textarea
                    rows={2}
                    value={s === "artigos" ? wpConfig.rulesArtigos : s === "servicos" ? wpConfig.rulesServicos : wpConfig.rulesSobre}
                    onChange={e => {
                      const field = s === "artigos" ? "rulesArtigos" : s === "servicos" ? "rulesServicos" : "rulesSobre";
                      setWPConfig(p => ({ ...p, [field]: e.target.value }));
                    }}
                    className="text-xs"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => saveWPConfig(wpConfig)} className="gap-2">
                <CheckCircle2 className="h-4 w-4" /> Salvar configurações
              </Button>
              <Button variant="outline" onClick={fetchCategories} disabled={fetchingCats} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${fetchingCats ? "animate-spin" : ""}`} />
                {fetchingCats ? "Buscando..." : "Buscar categorias WP"}
              </Button>
            </div>

            {wpCategories.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">Categorias padrão</Label>
                <div className="flex flex-wrap gap-1.5">
                  {wpCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        const next = wpConfig.defaultCats.includes(cat.id)
                          ? wpConfig.defaultCats.filter(id => id !== cat.id)
                          : [...wpConfig.defaultCats, cat.id];
                        setWPConfig(p => ({ ...p, defaultCats: next }));
                      }}
                      className={`px-2 py-0.5 rounded text-xs border transition-colors ${wpConfig.defaultCats.includes(cat.id) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}
                    >
                      {cat.name} ({cat.count})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Edit Modal ─────────────────────────────────────────────────── */}
      {editItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditItem(null)}>
          <div className="bg-background rounded-lg border shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <PenLine className="h-4 w-4 text-primary" />
                Editar conteúdo HTML
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setEditItem(null)}>✕</Button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <Textarea className="min-h-[50vh] font-mono text-xs leading-relaxed" value={editContent} onChange={e => setEditContent(e.target.value)} />
            </div>
            <div className="p-4 border-t flex gap-2 justify-between items-center">
              <p className="text-xs text-muted-foreground">{editContent.length} caracteres</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
                <Button onClick={() => {
                  setQueues(prev => ({
                    ...prev,
                    [editItem.section]: prev[editItem.section].map(i => i.id === editItem.id ? { ...i, content: editContent } : i)
                  }));
                  setEditItem(null);
                  toast.success("Conteúdo salvo!");
                }}>Salvar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QueueCard ────────────────────────────────────────────────────────────────

interface QueueCardProps {
  item: QueueItem;
  categories: WPCategory[];
  isGenerating: boolean;
  onTitleChange: (t: string) => void;
  onGenerate: () => void;
  onRemove: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onPublish: () => void;
}

function QueueCard({ item, categories, isGenerating, onTitleChange, onGenerate, onRemove, onEdit, onCopy, onPublish }: QueueCardProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(item.title);
  const [expanded, setExpanded] = useState(false);

  const statusMap = {
    aguardando: { label: "Aguardando", icon: <Clock className="h-3 w-3" />, cls: "text-muted-foreground" },
    gerando: { label: "Gerando...", icon: <Loader2 className="h-3 w-3 animate-spin" />, cls: "text-yellow-600" },
    pronto: { label: "Pronto", icon: <CheckCircle2 className="h-3 w-3" />, cls: "text-green-600" },
    erro: { label: "Erro", icon: <XCircle className="h-3 w-3" />, cls: "text-destructive" },
  }[item.status];

  const catNames = item.categories.map(id => categories.find(c => c.id === id)?.name).filter(Boolean);

  return (
    <Card className={`transition-all ${item.status === "pronto" ? "border-green-500/30" : item.status === "erro" ? "border-destructive/30" : item.status === "gerando" ? "border-yellow-500/30" : ""}`}>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-1">
            {/* Title — editable */}
            <div className="flex items-center gap-2">
              {editingTitle ? (
                <Input
                  autoFocus
                  value={localTitle}
                  onChange={e => setLocalTitle(e.target.value)}
                  onBlur={() => { onTitleChange(localTitle); setEditingTitle(false); }}
                  onKeyDown={e => { if (e.key === "Enter") { onTitleChange(localTitle); setEditingTitle(false); } }}
                  className="h-7 text-sm font-medium"
                />
              ) : (
                <button
                  className="text-sm font-medium text-left hover:text-primary transition-colors flex items-center gap-1 group"
                  onClick={() => { setLocalTitle(item.title); setEditingTitle(true); }}
                  title="Clique para editar o título"
                >
                  {item.title}
                  <FileText className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                </button>
              )}
              <span className={`flex items-center gap-1 text-xs shrink-0 ${statusMap.cls}`}>
                {statusMap.icon} {statusMap.label}
              </span>
            </div>

            {/* Keyword + meta */}
            {(item.keyword || item.intent || item.format) && (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {item.keyword && <span className="flex items-center gap-0.5">🔍 {item.keyword}</span>}
                {item.intent && <span>· {item.intent}</span>}
                {item.format && <span>· {item.format}</span>}
              </div>
            )}

            {/* Categories */}
            {catNames.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {catNames.map(n => <span key={n} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded">{n}</span>)}
              </div>
            )}

            {/* WP link */}
            {item.wpLink && (
              <a href={item.wpLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                ✓ Publicado no WordPress ↗
              </a>
            )}

            {/* Error */}
            {item.status === "erro" && item.error && (
              <p className="text-xs text-destructive">⚠️ {item.error}</p>
            )}

            {/* Preview */}
            {expanded && item.content && (
              <div
                className="mt-2 text-xs border rounded p-3 bg-muted/30 max-h-48 overflow-y-auto prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            {item.status !== "gerando" && !isGenerating && (
              <Button size="sm" variant={item.status === "pronto" ? "outline" : "default"} className="h-7 text-xs gap-1" onClick={onGenerate}>
                <Zap className="h-3 w-3" /> {item.status === "pronto" ? "Re-gerar" : "Gerar"}
              </Button>
            )}
            {item.status === "gerando" && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled>
                <Loader2 className="h-3 w-3 animate-spin" /> Gerando...
              </Button>
            )}
            {item.status === "pronto" && (
              <>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onEdit} title="Editar HTML">✏️</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onCopy} title="Copiar HTML">
                  <Copy className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-600 border-green-500/40 hover:bg-green-50 dark:hover:bg-green-950/20" onClick={onPublish} title="Publicar no WP">
                  <Send className="h-3 w-3" /> WP
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setExpanded(v => !v)}>
                  {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={onRemove}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
