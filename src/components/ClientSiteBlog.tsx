import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BlogArticle, Client, PromptTemplate } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Wand2, FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { fillPrompt } from "@/lib/promptBuilder";

export function ClientSiteBlog({ client, onChange }: { client: Client; onChange: () => void }) {
  const [prompts, setPrompts] = useState<Record<string, PromptTemplate>>({});
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [pautaText, setPautaText] = useState("");
  const [openPromptFor, setOpenPromptFor] = useState<{ kind: string; title?: string; text: string } | null>(null);
  const [brand, setBrand] = useState({ colors: client.brand_colors ?? "", notes: client.brand_notes ?? "", siteUrl: client.site_url ?? "" });

  useEffect(() => {
    supabase.from("prompt_templates").select("*").then(({ data }) => {
      const map: Record<string, PromptTemplate> = {};
      (data as PromptTemplate[] ?? []).forEach((p) => (map[p.id] = p));
      setPrompts(map);
    });
    supabase.from("blog_articles").select("*").eq("client_id", client.id).order("position").then(({ data }) => {
      setArticles((data as BlogArticle[]) ?? []);
    });
  }, [client.id]);

  async function saveBrand() {
    await supabase.from("clients").update({
      brand_colors: brand.colors || null,
      brand_notes: brand.notes || null,
      site_url: brand.siteUrl || null,
    }).eq("id", client.id);
    toast.success("Identidade visual salva");
    onChange();
  }

  function generate(kind: "site" | "blog_pauta" | "blog_artigo", extras?: Record<string, string>, title?: string) {
    const idMap: Record<string, string> = {
      site: "site_generator",
      blog_artigo: "blog_generator"
    };
    
    let tpl = prompts[kind] || prompts[idMap[kind]];
    
    if (!tpl) {
      const fallbacks: Record<string, string> = {
        site: "Atue como um web designer e crie uma landing page responsiva em HTML/CSS para a empresa {{company_name}}. O segmento é {{segment}}. Foco em conversão local.",
        blog_pauta: "Atue como um especialista em SEO Local. Gere uma pauta com 9 artigos de blog para a empresa {{company_name}} do segmento {{segment}}. Devolva em formato de tabela (markdown) com o cabeçalho: Posição | Título | Palavra-chave | Intenção | Formato | Prioridade",
        blog_artigo: "Atue como um especialista em SEO Local. Escreva um artigo de blog de 800 palavras para a empresa {{company_name}} com o título: '{{article_title}}'. A palavra-chave principal é: {{article_keyword}}."
      };
      tpl = { id: kind, title: kind, content: fallbacks[kind] } as PromptTemplate;
    }

    const filled = fillPrompt(tpl.content, client, extras);
    setOpenPromptFor({ kind, title, text: filled });
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    toast.success("Prompt copiado para a área de transferência");
  }

  async function importPauta() {
    // Parse simples linha-a-linha "n | titulo | keyword | intencao | formato | prioridade"
    const lines = pautaText.split("\n").map((l) => l.trim()).filter((l) => l && l.includes("|"));
    const rows = lines
      .map((l) => l.split("|").map((s) => s.trim()))
      .filter((cols) => cols.length >= 2 && /^\d+$/.test(cols[0]))
      .slice(0, 9);

    if (rows.length === 0) {
      toast.error("Cole a tabela no formato: posição | título | palavra-chave | intenção | formato | prioridade");
      return;
    }

    // limpa anteriores
    await supabase.from("blog_articles").delete().eq("client_id", client.id);
    const inserts = rows.map((cols) => ({
      client_id: client.id,
      position: Number(cols[0]),
      title: cols[1] || "Sem título",
      keyword: cols[2] || null,
      intent: cols[3] || null,
      format: cols[4] || null,
      priority: cols[5] ? Number(cols[5]) || null : null,
      status: "todo" as const,
    }));
    const { data, error } = await supabase.from("blog_articles").insert(inserts).select();
    if (error) return toast.error(error.message);
    setArticles((data as BlogArticle[]) ?? []);
    setPautaText("");
    toast.success(`${rows.length} artigos importados`);
  }

  async function updateArticle(id: string, patch: Partial<BlogArticle>) {
    setArticles((as) => as.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    await supabase.from("blog_articles").update(patch).eq("id", id);
  }

  const publishedCount = articles.filter((a) => a.status === "published").length;

  return (
    <div className="space-y-6">
      {/* Bloco A: identidade visual */}
      <Card>
        <CardHeader><CardTitle className="text-base">A · Identidade visual (você define)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Cores da marca (HEX ou descrição)</Label>
              <Input value={brand.colors} onChange={(e) => setBrand({ ...brand, colors: e.target.value })} placeholder="#1a73e8, #fcfbf8 ou 'tons terrosos'" />
            </div>
            <div>
              <Label>URL do site publicado</Label>
              <Input value={brand.siteUrl} onChange={(e) => setBrand({ ...brand, siteUrl: e.target.value })} placeholder="https://…" />
            </div>
          </div>
          <div>
            <Label>Notas de estilo / referências</Label>
            <Textarea value={brand.notes} onChange={(e) => setBrand({ ...brand, notes: e.target.value })} rows={2} />
          </div>
          <Button size="sm" onClick={saveBrand}>Salvar identidade</Button>
        </CardContent>
      </Card>

      {/* Bloco B: site */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            B · Geração do Site (Prompt 1)
            {client.site_generated && <Badge className="bg-success text-success-foreground">Gerado</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-5">
            <li>Duplique a pasta do template e renomeie com o nome do cliente.</li>
            <li>Abra a pasta no Google Antigravity.</li>
            <li>Cole o prompt abaixo e envie.</li>
          </ol>
          <div className="flex gap-2">
            <Button onClick={() => generate("site")}>
              <Wand2 className="h-4 w-4" /> Gerar prompt do site
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                await supabase.from("clients").update({ site_generated: !client.site_generated }).eq("id", client.id);
                onChange();
              }}
            >
              Marcar como {client.site_generated ? "não gerado" : "gerado"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bloco C: blog */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            C · Blog ({publishedCount}/{articles.length || 9} publicados)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {articles.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Etapa 1: gere a pauta de 9 artigos.</p>
              <Button onClick={() => generate("blog_pauta")} variant="outline">
                <Wand2 className="h-4 w-4" /> Gerar prompt de pauta
              </Button>
              <div className="space-y-2 pt-2">
                <Label>Cole aqui a tabela devolvida pelo Antigravity</Label>
                <Textarea
                  value={pautaText}
                  onChange={(e) => setPautaText(e.target.value)}
                  rows={6}
                  placeholder={"1 | Como escolher salão em São Paulo | salão são paulo | comparativo | guia | 1\n2 | …"}
                />
                <Button size="sm" onClick={importPauta} disabled={!pautaText.trim()}>
                  <Plus className="h-4 w-4" /> Importar 9 artigos
                </Button>
              </div>
            </div>
          )}

          {articles.map((a) => (
            <div key={a.id} className="border border-border rounded-md p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-sm">
                  #{a.position}. {a.title}
                </div>
                <select
                  value={a.status}
                  onChange={(e) => updateArticle(a.id, { status: e.target.value as any })}
                  className="text-xs bg-background border border-border rounded px-2 py-1"
                >
                  <option value="todo">A fazer</option>
                  <option value="in_review">Em revisão</option>
                  <option value="published">Publicado</option>
                </select>
              </div>
              {a.keyword && <div className="text-xs text-muted-foreground">🔍 {a.keyword} · {a.format}</div>}
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    generate(
                      "blog_artigo",
                      {
                        article_title: a.title,
                        article_keyword: a.keyword ?? "",
                        article_format: a.format ?? "",
                      },
                      a.title,
                    )
                  }
                >
                  <Wand2 className="h-3 w-3" /> Gerar prompt deste artigo
                </Button>
                <Input
                  value={a.published_url ?? ""}
                  onChange={(e) => updateArticle(a.id, { published_url: e.target.value })}
                  placeholder="URL publicada"
                  className="flex-1 min-w-[200px] h-8 text-xs"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Modal de prompt gerado */}
      {openPromptFor && (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center p-4" onClick={() => setOpenPromptFor(null)}>
          <div className="bg-card rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Prompt pronto</div>
                {openPromptFor.title && <div className="text-xs text-muted-foreground">{openPromptFor.title}</div>}
              </div>
              <Button size="sm" onClick={() => copy(openPromptFor.text)}>
                <Copy className="h-4 w-4" /> Copiar
              </Button>
            </div>
            <pre className="p-4 overflow-auto text-xs whitespace-pre-wrap font-mono">{openPromptFor.text}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
