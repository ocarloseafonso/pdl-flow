import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Shield, Users, KeyRound, RefreshCw, Database } from "lucide-react";

const ADMIN_EMAILS = [
  "ceafonso.solucoesdigitais@gmail.com",
  "contato@ceafonso.com.br",
];

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwqXS_Ejx9gF2VpOnN4T43kpl1FpvVLF4IVH2cbq9xPx1DV6gBIjeLnDc4Gyf7mOxAj6w/exec";

export default function Config() {
  // Invite state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [skipConfirm, setSkipConfirm] = useState(true);
  const [busy, setBusy] = useState(false);

  // Change password state
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // OpenAI Settings
  const [openAiKey, setOpenAiKey] = useState(() => localStorage.getItem("OPENAI_API_KEY") || "");

  function saveOpenAiKey() {
    localStorage.setItem("OPENAI_API_KEY", openAiKey);
    toast.success("Chave da OpenAI salva com sucesso no navegador!");
  }

  async function syncFromSheets() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=syncAllClients`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSyncResult(`✅ Sincronizado! ${data.synced ?? 0} cliente(s) importados/atualizados.`);
    } catch (err: any) {
      setSyncResult(`❌ Erro: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }

  async function inviteUser(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      toast.success(
        skipConfirm
          ? `Usuário ${email} criado! Ele já pode fazer login.`
          : `Convite enviado para ${email}. Ele precisará confirmar o e-mail.`
      );
      setEmail("");
      setPassword("");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar usuário");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPass.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (newPass !== confirmPass) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setChangingPass(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPass });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      setNewPass("");
      setConfirmPass("");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao alterar senha");
    } finally {
      setChangingPass(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerenciamento de equipe e ajustes da operação.</p>
      </div>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            Alterar minha senha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-pass">Nova senha</Label>
                <Input
                  id="new-pass"
                  type="password"
                  required
                  minLength={6}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pass">Confirmar nova senha</Label>
                <Input
                  id="confirm-pass"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Repita a senha"
                />
              </div>
            </div>
            <Button type="submit" variant="outline" disabled={changingPass} className="gap-2">
              <KeyRound className="h-4 w-4" />
              {changingPass ? "Alterando…" : "Alterar senha"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Admin Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Administradores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ADMIN_EMAILS.map((adminEmail) => (
            <div key={adminEmail} className="flex items-center justify-between p-3 rounded-md bg-accent/30 border">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 grid place-items-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium">{adminEmail}</div>
                  <div className="text-xs text-muted-foreground">Administrador</div>
                </div>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">Admin</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Invite Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            Convidar novo usuário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={inviteUser} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="inv-email">E-mail do usuário</Label>
                <Input
                  id="inv-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inv-pass">Senha temporária</Label>
                <Input
                  id="inv-pass"
                  type="text"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-md bg-accent/30 border">
              <div>
                <div className="text-sm font-medium">Acesso imediato (sem confirmação por e-mail)</div>
                <div className="text-xs text-muted-foreground">
                  {skipConfirm
                    ? "O usuário poderá entrar assim que criado."
                    : "O usuário precisará confirmar o e-mail antes de entrar."}
                </div>
              </div>
              <Switch checked={skipConfirm} onCheckedChange={setSkipConfirm} />
            </div>

            {!skipConfirm && (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md">
                ⚠️ Para a confirmação por e-mail funcionar, verifique se o Supabase está configurado para enviar e-mails.
                Vá em <strong>Authentication &gt; Email Templates</strong> no painel do Supabase.
              </p>
            )}

            <Button type="submit" disabled={busy} className="gap-2">
              <UserPlus className="h-4 w-4" />
              {busy ? "Criando…" : "Criar usuário"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Capacity */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Capacidade
        </CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Capacidade configurada: <strong>10 clientes ativos em paralelo</strong>.</p>
          <p>Estimativa de entrega: ~3 a 4 semanas por cliente (~10 a 12h de trabalho ativo).</p>
        </CardContent>
      </Card>

      {/* OpenAI Settings */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" />
          Configuração de IA (OpenAI)
        </CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            A chave da OpenAI é necessária para a geração automática de estratégias e material de execução.
            Essa chave ficará salva apenas neste navegador (não vai para o banco de dados).
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="sk-proj-..."
              value={openAiKey}
              onChange={(e) => setOpenAiKey(e.target.value)}
              className="max-w-md"
            />
            <Button onClick={saveOpenAiKey} variant="secondary">
              Salvar Chave
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Google Sheets Sync */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          Sincronizar com Google Sheets
        </CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Importa/atualiza todos os clientes da sua planilha diretamente para o PDL Flow. Use sempre que adicionar novos clientes na planilha.
          </p>
          <Button onClick={syncFromSheets} disabled={syncing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando…" : "Sincronizar agora"}
          </Button>
          {syncResult && (
            <p className="text-sm mt-2 p-3 rounded-md bg-accent/30 border">{syncResult}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
