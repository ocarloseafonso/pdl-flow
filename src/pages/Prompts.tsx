import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PromptTemplate } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Prompts() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});

  async function load() {
    const { data } = await supabase.from("prompt_templates").select("*").order("id");
    
    const requiredPrompts = [
      {
        id: "site",
        title: "1. Gerador de Site",
        content: "Atue como um web designer e crie uma landing page responsiva em HTML/CSS para a empresa {{company_name}}. O segmento é {{segment}}. Foco em conversão local."
      },
      {
        id: "blog_pauta",
        title: "2. Gerador de Pauta de Blog (9 Artigos)",
        content: "Atue como um especialista em SEO Local. Gere uma pauta com 9 artigos de blog para a empresa {{company_name}} do segmento {{segment}}. Devolva em formato de tabela (markdown) usando EXATAMENTE o cabeçalho: Posição | Título | Palavra-chave | Intenção | Formato | Prioridade\nExemplo da primeira linha: 1 | Como escolher... | keyword | Informacional | Guia | 1"
      },
      {
        id: "blog_artigo",
        title: "3. Gerador de Artigo Específico",
        content: "Atue como um especialista em SEO Local. Escreva um artigo de blog de 800 palavras para a empresa {{company_name}} com o título: '{{article_title}}'. A palavra-chave principal é: {{article_keyword}}. O formato do artigo é: {{article_format}}."
      }
    ];

    const currentMap = new Set((data || []).map(p => p.id));
    const missing = requiredPrompts.filter(p => !currentMap.has(p.id));

    if (missing.length > 0) {
      await supabase.from("prompt_templates").insert(missing);
      const { data: newData } = await supabase.from("prompt_templates").select("*").order("id");
      setPrompts((newData as PromptTemplate[]) ?? []);
      return;
    }
    
    setPrompts((data as PromptTemplate[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function save(id: string) {
    const content = edits[id];
    if (content === undefined) return;
    const { error } = await supabase.from("prompt_templates").update({ content, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Prompt salvo");
    setEdits((e) => { const { [id]: _, ...rest } = e; return rest; });
    load();
  }

  return (
    <div className="p-6 max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Prompts & Templates</h1>
        <p className="text-sm text-muted-foreground">
          Edite os 3 prompts mestres usados para gerar o site e o blog. Use variáveis tipo <code className="text-xs bg-secondary px-1 rounded">{"{{company_name}}"}</code> — elas são substituídas automaticamente.
        </p>
      </div>

      {prompts.map((p) => (
        <Card key={p.id}>
          <CardHeader>
            <CardTitle className="text-base">{p.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Textarea
              value={edits[p.id] ?? p.content}
              onChange={(e) => setEdits({ ...edits, [p.id]: e.target.value })}
              rows={20}
              className="font-mono text-xs"
            />
            <div className="flex justify-end gap-2">
              {edits[p.id] !== undefined && (
                <Button variant="ghost" onClick={() => setEdits((e) => { const { [p.id]: _, ...rest } = e; return rest; })}>
                  Descartar
                </Button>
              )}
              <Button onClick={() => save(p.id)} disabled={edits[p.id] === undefined}>
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
