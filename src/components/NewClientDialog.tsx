import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Copy, RefreshCw, ExternalLink } from "lucide-react";

const CHAT_URL = "https://novocliente.ceafonso.com.br/";

/** Gera um código simples: primeiras letras da empresa + 3 números */
function generateCode(name: string, company: string): string {
  const base = (company || name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 8)
    .toLowerCase();
  const nums = Math.floor(100 + Math.random() * 900);
  return `${base}${nums}`;
}

export function NewClientDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [segment, setSegment] = useState("");
  const [contractDate, setContractDate] = useState(new Date().toISOString().slice(0, 10));
  const [deadlineDays, setDeadlineDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ token: string; code: string } | null>(null);

  function reset() {
    setName(""); setCompany(""); setSegment(""); setResult(null); setContractDate(new Date().toISOString().slice(0, 10)); setDeadlineDays(30);
  }

  function regenCode() {
    if (!result) return;
    const newCode = generateCode(name, company);
    setResult({ ...result, code: newCode });
    // Salva o novo código no banco
    supabase.from("clients").update({ briefing_token: newCode }).eq("briefing_token", result.code);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const code = generateCode(name, company);
      const { error } = await supabase
        .from("clients")
        .insert({
          user_id: user.id,
          name,
          company_name: company || null,
          segment: segment || null,
          briefing_token: code,
          contract_start_date: contractDate || null,
          deadline_days: deadlineDays,
        });
      if (error) throw error;
      setResult({ token: code, code });
      onCreated();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  function copyCode() {
    if (!result) return;
    navigator.clipboard.writeText(result.code);
    toast.success("Código copiado!");
  }

  function copyMsg() {
    if (!result) return;
    const msg = `Olá! Para preencher seu cadastro, acesse o link abaixo e use o código de acesso:\n\n🔗 ${CHAT_URL}\n🔑 Código: ${result.code}`;
    navigator.clipboard.writeText(msg);
    toast.success("Mensagem copiada! É só colar no WhatsApp.");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{result ? "✅ Cliente criado!" : "Novo cliente"}</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Envie o <strong>código de acesso</strong> e o <strong>link</strong> abaixo para o seu cliente preencher o cadastro no chat.
            </p>

            {/* Código de acesso */}
            <div className="space-y-1.5">
              <Label>🔑 Código de acesso</Label>
              <div className="flex gap-2">
                <Input readOnly value={result.code} className="font-mono text-base font-bold tracking-widest" />
                <Button type="button" size="icon" variant="outline" onClick={copyCode} title="Copiar código">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button type="button" size="icon" variant="outline" onClick={regenCode} title="Gerar novo código">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Link do chat */}
            <div className="space-y-1.5">
              <Label>🔗 Link do chat</Label>
              <div className="flex gap-2">
                <Input readOnly value={CHAT_URL} className="text-xs" />
                <Button type="button" size="icon" variant="outline" asChild>
                  <a href={CHAT_URL} target="_blank" rel="noopener noreferrer" title="Abrir chat">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Botão copiar mensagem pronta */}
            <div className="rounded-lg border border-border bg-accent/20 p-3 text-sm space-y-2">
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Mensagem pronta para WhatsApp</p>
              <p className="text-sm leading-relaxed">
                Olá! Para preencher seu cadastro, acesse o link abaixo e use o código de acesso:<br />
                🔗 {CHAT_URL}<br />
                🔑 Código: <strong>{result.code}</strong>
              </p>
              <Button size="sm" variant="secondary" className="w-full gap-2" onClick={copyMsg}>
                <Copy className="h-3.5 w-3.5" /> Copiar mensagem
              </Button>
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nc-name">Nome do cliente *</Label>
              <Input id="nc-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="João Silva" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nc-company">Nome da empresa</Label>
              <Input id="nc-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Ex: Barbearia do João" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nc-segment">Segmento / nicho</Label>
              <Input id="nc-segment" value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="Ex: salão de beleza, clínica..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="nc-date">Data de fechamento</Label>
                <Input id="nc-date" type="date" value={contractDate} onChange={(e) => setContractDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nc-deadline">Prazo (dias)</Label>
                <Input id="nc-deadline" type="number" min={1} value={deadlineDays} onChange={(e) => setDeadlineDays(parseInt(e.target.value) || 30)} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={busy || !name}>
                {busy ? "Criando…" : "Criar e gerar código"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
