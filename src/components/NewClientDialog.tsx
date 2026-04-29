import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Copy } from "lucide-react";

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
  const [busy, setBusy] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  function reset() {
    setName(""); setCompany(""); setSegment(""); setCreatedToken(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("clients")
        .insert({ user_id: user.id, name, company_name: company || null, segment: segment || null })
        .select("briefing_token")
        .single();
      if (error) throw error;
      setCreatedToken(data.briefing_token);
      onCreated();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  const link = createdToken ? `${window.location.origin}/briefing/${createdToken}` : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{createdToken ? "Cliente criado!" : "Novo cliente"}</DialogTitle>
        </DialogHeader>
        {createdToken ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Envie este link ao cliente para preencher o briefing. Quando ele enviar, você verá no Kanban.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={link} className="text-xs" />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(link);
                  toast.success("Link copiado");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do cliente *</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Nome da empresa</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="segment">Segmento / nicho</Label>
              <Input id="segment" value={segment} onChange={(e) => setSegment(e.target.value)} placeholder="Ex: salão de beleza" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={busy || !name}>
                {busy ? "Criando…" : "Criar e gerar briefing"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
