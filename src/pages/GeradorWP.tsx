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
  FileText, Package, Info, Eye, EyeOff, BookOpen
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Section = "artigos" | "servicos" | "sobre";

interface QueueItem {
  id: string;
  title: string;
  status: "aguardando" | "gerando" | "pronto" | "erro";
  content: string;
  error?: string;
  imageData?: string;
  imageMime?: string;
  categories: number[];
  wpId?: number;
  wpLink?: string;
}

interface WPCategory {
  id: number;
  name: string;
  count: number;
}

interface WPConfig {
  wpUrl: string;
  wpUser: string;
  wpPass: string;
  wpStatus: string;
  genImage: boolean;
  aiSuggestCats: boolean;
  defaultCats: number[];
  rulesArtigos: string;
  rulesServicos: string;
  rulesSobre: string;
}

interface ClientRow {
  id: string;
  name: string;
  company_name: string | null;
  site_url: string | null;
  segment: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function uid() { return Math.random().toString(36).slice(2); }

const SECTION_LABELS: Record<Section, string> = {
  artigos: "Artigo de Blog",
  servicos: "Página de Serviço",
  sobre: "Seção Sobre",
};

const SECTION_ICONS: Record<Section, React.ReactNode> = {
  artigos: <BookOpen className="h-4 w-4" />,
  servicos: <Package className="h-4 w-4" />,
  sobre: <Info className="h-4 w-4" />,
};

const WP_CONFIG_KEY = "pdl_wpforge_config";

function loadWPConfig(): WPConfig {
  try {
    const raw = localStorage.getItem(WP_CONFIG_KEY);
    return raw ? JSON.parse(raw) : {
      wpUrl: "", wpUser: "", wpPass: "", wpStatus: "draft",
      genImage: false, aiSuggestCats: true, defaultCats: [],
      rulesArtigos: "Formato HTML (sem html/head/body). Use H2, parágrafos, listas. SEO otimizado. Português do Brasil.",
      rulesServicos: "Formato HTML. Descreva o serviço, benefícios, diferenciais e CTA. Português do Brasil.",
      rulesSobre: "Formato HTML. Tom profissional e humanizado. Destaque história e autoridade. Português do Brasil.",
    };
  } catch { return { wpUrl: "", wpUser: "", wpPass: "", wpStatus: "draft", genImage: false, aiSuggestCats: true, defaultCats: [], rulesArtigos: "", rulesServicos: "", rulesSobre: "" }; }
}

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 4096 } }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.error?.message || `HTTP ${res.status}`); }
  const d = await res.json();
  return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callGPT(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 4096 }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any)?.error?.message || `HTTP ${res.status}`); }
  const d = await res.json();
  return d.choices?.[0]?.message?.content || "";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GeradorWP() {
  // API keys from PDL FLOW Config
  const openAiKey = localStorage.getItem("OPENAI_API_KEY") || "";
  const geminiKey = localStorage.getItem("GEMINI_API_KEY") || "";

  const [aiModel, setAiModel] = useState<"openai" | "gemini">(openAiKey ? "openai" : "gemini");
  const [wpConfig, setWPConfig] = useState<WPConfig>(loadWPConfig);
  const [wpCategories, setWPCategories] = useState<WPCategory[]>([]);
  const [fetchingCats, setFetchingCats] = useState(false);

  const [queues, setQueues] = useState<Record<Section, QueueItem[]>>({ artigos: [], servicos: [], sobre: [] });
  const [titleInputs, setTitleInputs] = useState<Record<Section, string>>({ artigos: "", servicos: "", sobre: "" });
  const [activeSection, setActiveSection] = useState<Section>("artigos");

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [showWPPass, setShowWPPass] = useState(false);

  const [publishLog, setPublishLog] = useState<{ text: string; type: "info" | "ok" | "err" }[]>([]);
  const [publishing, setPublishing] = useState(false);

  const [editItem, setEditItem] = useState<{ section: Section; id: string } | null>(null);
  const [editContent, setEditContent] = useState("");

  const [showConfig, setShowConfig] = useState(false);

  // Load clients from Supabase
  useEffect(() => {
    supabase.from("clients").select("id,name,company_name,site_url,segment").order("name")
      .then(({ data }) => { if (data) setClients(data as ClientRow[]); });
  }, []);

  // Save WP config
  const saveWPConfig = useCallback((cfg: WPConfig) => {
    setWPConfig(cfg);
    localStorage.setItem(WP_CONFIG_KEY, JSON.stringify(cfg));
    toast.success("Configurações salvas!");
  }, []);

  // Apply client data to WP URL
  function applyClient(c: ClientRow) {
    setSelectedClient(c);
    if (c.site_url) {
      const cfg = { ...wpConfig, wpUrl: c.site_url.replace(/\/$/, "") };
      setWPConfig(cfg);
      localStorage.setItem(WP_CONFIG_KEY, JSON.stringify(cfg));
    }
    toast.success(`Cliente "${c.company_name || c.name}" selecionado.`);
  }

  // Fetch WP categories
  async function fetchCategories() {
    if (!wpConfig.wpUrl || !wpConfig.wpUser || !wpConfig.wpPass) {
      toast.error("Configure URL e credenciais do WordPress primeiro!"); return;
    }
    setFetchingCats(true);
    try {
      const creds = btoa(`${wpConfig.wpUser}:${wpConfig.wpPass}`);
      const res = await fetch(`${wpConfig.wpUrl}/wp-json/wp/v2/categories?per_page=100`, {
        headers: { Authorization: `Basic ${creds}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const cats: any[] = await res.json();
      setWPCategories(cats.map(c => ({ id: c.id, name: c.name, count: c.count })));
      toast.success(`${cats.length} categorias carregadas!`);
    } catch (e: any) {
      toast.error("Erro ao buscar categorias: " + e.message);
    } finally { setFetchingCats(false); }
  }

  // Load titles from textarea
  function loadTitles(section: Section) {
    const lines = titleInputs[section].split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast.error("Cole pelo menos um título!"); return; }
    setQueues(prev => {
      const existing = prev[section].map(i => i.title);
      const newItems: QueueItem[] = lines
        .filter(t => !existing.includes(t))
        .map(t => ({ id: uid(), title: t, status: "aguardando", content: "", categories: wpConfig.defaultCats }));
      return { ...prev, [section]: [...prev[section], ...newItems] };
    });
    setTitleInputs(prev => ({ ...prev, [section]: "" }));
    toast.success(`${lines.length} título(s) adicionado(s)!`);
  }

  // Generate single item
  async function generateOne(section: Section, itemId: string) {
    const apiKey = aiModel === "openai" ? openAiKey : geminiKey;
    if (!apiKey) {
      toast.error(`Configure a chave ${aiModel === "openai" ? "OpenAI" : "Gemini"} em Configurações!`);
      return;
    }

    setQueues(prev => ({
      ...prev,
      [section]: prev[section].map(i => i.id === itemId ? { ...i, status: "gerando" } : i)
    }));

    const item = queues[section].find(i => i.id === itemId);
    if (!item) return;

    const rules = wpConfig[`rules${section.charAt(0).toUpperCase() + section.slice(1)}` as keyof WPConfig] as string;
    const clientCtx = selectedClient ? `\nCliente: ${selectedClient.company_name || selectedClient.name}${selectedClient.segment ? ` | Segmento: ${selectedClient.segment}` : ""}` : "";
    const prompt = `Você é um redator profissional em português do Brasil.${clientCtx}\n\nGere o conteúdo completo para o seguinte ${SECTION_LABELS[section]}:\nTÍTULO: "${item.title}"\n\nREGRAS:\n${rules || "Formato HTML, H2, parágrafos e listas. Português do Brasil."}\n\nRetorne APENAS o HTML do conteúdo, sem explicações.`;

    try {
      const content = aiModel === "openai" ? await callGPT(apiKey, prompt) : await callGemini(apiKey, prompt);

      // Suggest categories if WP cats loaded
      let categories = wpConfig.defaultCats;
      if (wpCategories.length && wpConfig.aiSuggestCats) {
        try {
          const catList = wpCategories.map(c => `${c.id}:${c.name}`).join(", ");
          const catPrompt = `Dado o título: "${item.title}"\nCategorias disponíveis: ${catList}\nRetorne APENAS os IDs mais relevantes (máximo 3), separados por vírgula. Exemplo: 1,5,12`;
          const raw = aiModel === "openai" ? await callGPT(apiKey, catPrompt) : await callGemini(apiKey, catPrompt);
          const ids = raw.match(/\d+/g)?.map(Number).slice(0, 3) || [];
          if (ids.length) categories = ids;
        } catch { /* keep defaults */ }
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
    }
  }

  async function generateAll(section: Section) {
    const pending = queues[section].filter(i => i.status === "aguardando" || i.status === "erro");
    if (!pending.length) { toast.info("Nenhum item aguardando!"); return; }
    for (const item of pending) {
      await generateOne(section, item.id);
      await sleep(600);
    }
  }

  function removeItem(section: Section, id: string) {
    setQueues(prev => ({ ...prev, [section]: prev[section].filter(i => i.id !== id) }));
  }

  function clearQueue(section: Section) {
    if (!confirm(`Limpar toda a fila de ${section}?`)) return;
    setQueues(prev => ({ ...prev, [section]: [] }));
  }

  // Publish to WP
  async function publishItem(section: Section, item: QueueItem) {
    const { wpUrl, wpUser, wpPass, wpStatus } = wpConfig;
    if (!wpUrl || !wpUser || !wpPass) {
      setPublishLog(l => [...l, { text: "Configure o WordPress nas configurações!", type: "err" }]);
      return;
    }
    const creds = btoa(`${wpUser}:${wpPass}`);
    const postType = section === "artigos" ? "posts" : "pages";
    const body: any = {
      title: item.title,
      content: item.content,
      status: wpStatus || "draft",
    };
    if (section === "artigos" && item.categories.length) body.categories = item.categories;

    try {
      const res = await fetch(`${wpUrl}/wp-json/wp/v2/${postType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${creds}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const d = await res.json();
        setQueues(prev => ({
          ...prev,
          [section]: prev[section].map(i => i.id === item.id ? { ...i, wpId: d.id, wpLink: d.link } : i)
        }));
        setPublishLog(l => [...l, { text: `✓ "${item.title}" publicado (ID ${d.id})`, type: "ok" }]);
      } else {
        const e = await res.json().catch(() => ({}));
        setPublishLog(l => [...l, { text: `✗ "${item.title}": ${(e as any)?.message || "Erro " + res.status}`, type: "err" }]);
      }
    } catch (e: any) {
      setPublishLog(l => [...l, { text: `✗ "${item.title}": ${e.message}`, type: "err" }]);
    }
  }

  async function publishAll() {
    const allReady: { section: Section; item: QueueItem }[] = [];
    (["artigos", "servicos", "sobre"] as Section[]).forEach(s =>
      queues[s].filter(i => i.status === "pronto").forEach(item => allReady.push({ section: s, item }))
    );
    if (!allReady.length) { toast.error("Nenhum conteúdo pronto para publicar!"); return; }
    setPublishing(true);
    setPublishLog([{ text: `🚀 Publicando ${allReady.length} item(ns)...`, type: "info" }]);
    for (const { section, item } of allReady) {
      await publishItem(section, item);
      await sleep(400);
    }
    setPublishLog(l => [...l, { text: "✓ Publicação concluída!", type: "ok" }]);
    setPublishing(false);
  }

  // Stats
  const stats = {
    artigos: queues.artigos.filter(i => i.status === "pronto").length,
    servicos: queues.servicos.filter(i => i.status === "pronto").length,
    sobre: queues.sobre.filter(i => i.status === "pronto").length,
    total: (["artigos", "servicos", "sobre"] as Section[]).reduce((a, s) => a + queues[s].length, 0),
  };

  const activeKey = openAiKey ? "openai" : geminiKey ? "gemini" : null;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" /> Gerador WP
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gere e publique conteúdo WordPress com IA — integrado ao PDL FLOW
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {activeKey ? (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {activeKey === "openai" ? "OpenAI" : "Gemini"} configurado
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <XCircle className="h-3 w-3" /> Sem chave de IA — vá em Configurações
            </Badge>
          )}
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowConfig(v => !v)}>
            <Settings className="h-4 w-4" /> {showConfig ? "Fechar" : "WordPress"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total na fila", value: stats.total, color: "text-foreground" },
          { label: "Artigos prontos", value: stats.artigos, color: "text-green-600" },
          { label: "Serviços prontos", value: stats.servicos, color: "text-blue-600" },
          { label: "Sobre prontos", value: stats.sobre, color: "text-purple-600" },
        ].map(s => (
          <Card key={s.label} className="text-center py-3">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Client Selector */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> Selecionar Cliente PDL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {clients.length === 0 && (
              <span className="text-sm text-muted-foreground">Nenhum cliente encontrado.</span>
            )}
            {clients.map(c => (
              <button
                key={c.id}
                onClick={() => applyClient(c)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  selectedClient?.id === c.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary hover:text-primary"
                }`}
              >
                {c.company_name || c.name}
                {c.segment && <span className="ml-1 opacity-60 text-xs">· {c.segment}</span>}
              </button>
            ))}
          </div>
          {selectedClient?.site_url && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Globe className="h-3 w-3" /> URL aplicada: <span className="font-mono">{selectedClient.site_url}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* WP Config Panel */}
      {showConfig && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="h-4 w-4" /> Configurações WordPress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">URL do WordPress</Label>
                <Input
                  placeholder="https://seusite.com.br"
                  value={wpConfig.wpUrl}
                  onChange={e => setWPConfig(prev => ({ ...prev, wpUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status de publicação</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={wpConfig.wpStatus}
                  onChange={e => setWPConfig(prev => ({ ...prev, wpStatus: e.target.value }))}
                >
                  <option value="draft">Rascunho</option>
                  <option value="publish">Publicado</option>
                  <option value="private">Privado</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Usuário WordPress</Label>
                <Input
                  placeholder="admin"
                  value={wpConfig.wpUser}
                  onChange={e => setWPConfig(prev => ({ ...prev, wpUser: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Application Password</Label>
                <div className="flex gap-2">
                  <Input
                    type={showWPPass ? "text" : "password"}
                    placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                    value={wpConfig.wpPass}
                    onChange={e => setWPConfig(prev => ({ ...prev, wpPass: e.target.value }))}
                  />
                  <Button variant="ghost" size="icon" onClick={() => setShowWPPass(v => !v)}>
                    {showWPPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Modelo de IA</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAiModel("openai")}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${aiModel === "openai" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}
                >
                  OpenAI (GPT-4o-mini)
                </button>
                <button
                  onClick={() => setAiModel("gemini")}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${aiModel === "gemini" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}
                >
                  Gemini 2.0 Flash
                </button>
              </div>
              {!openAiKey && !geminiKey && (
                <p className="text-xs text-destructive">⚠️ Nenhuma chave configurada. Vá em Configurações → Chave de IA.</p>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Regras de geração por seção</Label>
              {(["artigos", "servicos", "sobre"] as Section[]).map(s => (
                <div key={s} className="space-y-1">
                  <Label className="text-xs capitalize">{s}</Label>
                  <Textarea
                    rows={2}
                    value={wpConfig[`rules${s.charAt(0).toUpperCase() + s.slice(1)}` as keyof WPConfig] as string}
                    onChange={e => setWPConfig(prev => ({ ...prev, [`rules${s.charAt(0).toUpperCase() + s.slice(1)}`]: e.target.value }))}
                    className="text-xs"
                  />
                </div>
              ))}
            </div>

            <Button onClick={() => saveWPConfig(wpConfig)} className="gap-2">
              <CheckCircle2 className="h-4 w-4" /> Salvar Configurações
            </Button>

            {/* WP Categories */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Categorias WordPress</Label>
                <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={fetchCategories} disabled={fetchingCats}>
                  <RefreshCw className={`h-3 w-3 ${fetchingCats ? "animate-spin" : ""}`} />
                  {fetchingCats ? "Buscando..." : "Buscar do WP"}
                </Button>
              </div>
              {wpCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {wpCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        const next = wpConfig.defaultCats.includes(cat.id)
                          ? wpConfig.defaultCats.filter(id => id !== cat.id)
                          : [...wpConfig.defaultCats, cat.id];
                        setWPConfig(prev => ({ ...prev, defaultCats: next }));
                      }}
                      className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                        wpConfig.defaultCats.includes(cat.id)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary"
                      }`}
                    >
                      {cat.name} ({cat.count})
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Tabs */}
      <Tabs value={activeSection} onValueChange={v => setActiveSection(v as Section)}>
        <TabsList>
          {(["artigos", "servicos", "sobre"] as Section[]).map(s => (
            <TabsTrigger key={s} value={s} className="gap-1.5">
              {SECTION_ICONS[s]}
              <span className="capitalize">{s}</span>
              {queues[s].length > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">{queues[s].length}</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {(["artigos", "servicos", "sobre"] as Section[]).map(section => (
          <TabsContent key={section} value={section} className="space-y-4 mt-4">
            {/* Title Input */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Carregar Títulos — {SECTION_LABELS[section]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  rows={4}
                  placeholder={`Cole os títulos aqui, um por linha...\nEx: Como escolher o melhor serviço de contabilidade\nContabilidade para MEI: guia completo`}
                  value={titleInputs[section]}
                  onChange={e => setTitleInputs(prev => ({ ...prev, [section]: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button onClick={() => loadTitles(section)} className="gap-2">
                    <FileText className="h-4 w-4" /> Carregar títulos
                  </Button>
                  <Button variant="outline" onClick={() => generateAll(section)} className="gap-2" disabled={!queues[section].some(i => i.status === "aguardando" || i.status === "erro")}>
                    <Zap className="h-4 w-4" /> Gerar todos
                  </Button>
                  {queues[section].length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => clearQueue(section)} className="ml-auto text-destructive gap-1">
                      <Trash2 className="h-3.5 w-3.5" /> Limpar fila
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Queue */}
            {queues[section].length > 0 && (
              <div className="space-y-2">
                {queues[section].map(item => (
                  <QueueCard
                    key={item.id}
                    item={item}
                    categories={wpCategories}
                    onGenerate={() => generateOne(section, item.id)}
                    onRemove={() => removeItem(section, item.id)}
                    onEdit={() => { setEditItem({ section, id: item.id }); setEditContent(item.content); }}
                    onCopy={() => { navigator.clipboard.writeText(item.content); toast.success("Copiado!"); }}
                    onPublish={() => { setPublishLog([]); publishItem(section, item); }}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Publish All */}
      {stats.total > 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-sm">Publicar no WordPress</p>
              <p className="text-xs text-muted-foreground">
                {stats.artigos + stats.servicos + stats.sobre} item(ns) pronto(s) para publicar
              </p>
            </div>
            <Button onClick={publishAll} disabled={publishing || (stats.artigos + stats.servicos + stats.sobre) === 0} className="gap-2 bg-green-600 hover:bg-green-700">
              <Send className="h-4 w-4" /> {publishing ? "Publicando..." : "Publicar tudo"}
            </Button>
          </CardContent>
          {publishLog.length > 0 && (
            <CardContent className="pt-0">
              <div className="rounded-md bg-background border p-3 space-y-1 max-h-48 overflow-y-auto font-mono text-xs">
                {publishLog.map((l, i) => (
                  <div key={i} className={l.type === "ok" ? "text-green-600" : l.type === "err" ? "text-destructive" : "text-muted-foreground"}>
                    {l.text}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditItem(null)}>
          <div className="bg-background rounded-lg border shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-sm">✏️ Editar conteúdo</h2>
              <Button variant="ghost" size="sm" onClick={() => setEditItem(null)}>✕</Button>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <Textarea
                className="min-h-[40vh] font-mono text-xs"
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
              />
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
              <Button onClick={() => {
                setQueues(prev => ({
                  ...prev,
                  [editItem.section]: prev[editItem.section].map(i =>
                    i.id === editItem.id ? { ...i, content: editContent } : i
                  )
                }));
                setEditItem(null);
                toast.success("Conteúdo salvo!");
              }}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QueueCard Sub-component ──────────────────────────────────────────────────

function QueueCard({
  item, categories, onGenerate, onRemove, onEdit, onCopy, onPublish
}: {
  item: QueueItem;
  categories: WPCategory[];
  onGenerate: () => void;
  onRemove: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onPublish: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    aguardando: { label: "Aguardando", icon: <Clock className="h-3 w-3" />, cls: "text-muted-foreground" },
    gerando: { label: "Gerando...", icon: <RefreshCw className="h-3 w-3 animate-spin" />, cls: "text-yellow-600" },
    pronto: { label: "Pronto", icon: <CheckCircle2 className="h-3 w-3" />, cls: "text-green-600" },
    erro: { label: "Erro", icon: <XCircle className="h-3 w-3" />, cls: "text-destructive" },
  }[item.status];

  const catNames = item.categories
    .map(id => categories.find(c => c.id === id)?.name)
    .filter(Boolean);

  return (
    <Card className={`transition-all ${item.status === "pronto" ? "border-green-500/30" : item.status === "erro" ? "border-destructive/30" : ""}`}>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium truncate">{item.title}</span>
              <span className={`flex items-center gap-1 text-xs ${statusConfig.cls}`}>
                {statusConfig.icon} {statusConfig.label}
              </span>
              {item.wpLink && (
                <a href={item.wpLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                  Ver no WP ↗
                </a>
              )}
            </div>
            {catNames.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {catNames.map(n => (
                  <span key={n} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded">{n}</span>
                ))}
              </div>
            )}
            {item.status === "erro" && item.error && (
              <p className="text-xs text-destructive mt-1">Erro: {item.error}</p>
            )}
            {expanded && item.content && (
              <div
                className="mt-2 text-xs border rounded p-2 bg-muted/30 max-h-48 overflow-y-auto prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            {item.status !== "gerando" && (
              <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={onGenerate}>
                <Zap className="h-3 w-3" /> {item.status === "pronto" ? "Re-gerar" : "Gerar"}
              </Button>
            )}
            {item.status === "pronto" && (
              <>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onEdit}>
                  ✏️ Editar
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onCopy}>
                  <Copy className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-green-600 border-green-500/50 hover:bg-green-50" onClick={onPublish}>
                  <Send className="h-3 w-3" /> WP
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setExpanded(v => !v)}>
                  {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={onRemove}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
