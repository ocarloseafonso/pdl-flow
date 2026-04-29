import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

const FIELDS: { name: string; label: string; type?: string; rows?: number; help?: string }[] = [
  { name: "responsible_name", label: "Seu nome (como aparecerá no site)" },
  { name: "city_state", label: "Cidade e Estado" },
  { name: "phone", label: "Telefone / WhatsApp (com DDD)" },
  { name: "email", label: "E-mail" },
  { name: "company_name", label: "Nome da empresa" },
  { name: "segment", label: "Segmento da empresa" },
  { name: "opening_date", label: "Quando abriu sua empresa?", help: "Se não souber, coloque uma data aproximada" },
  { name: "areas", label: "Bairros, regiões ou cidades atendidas", rows: 2, help: "Liste locais reais. Evite 'atendo tudo'" },
  { name: "hours", label: "Horário de funcionamento", rows: 2, help: "Ex: seg a sex 8h-18h. Separar sáb/dom se diferente" },
  { name: "service_modes", label: "Forma de atendimento", help: "Local, delivery, casa do cliente, online (pode mais de uma)" },
  { name: "main_service", label: "Principal produto ou serviço" },
  { name: "other_services", label: "Outros produtos ou serviços", rows: 2 },
  { name: "problem_solved", label: "Que problema você resolve para o cliente?", rows: 2, help: "Evite 'qualidade' ou 'bom atendimento'" },
  { name: "audience", label: "Quem costuma comprar de você hoje?" },
  { name: "acquisition", label: "Como os clientes chegam até você?" },
  { name: "differentiator", label: "Por que escolhem você e não outro?", rows: 2 },
  { name: "praises", label: "O que seus clientes mais elogiam?", rows: 2 },
  { name: "competitors", label: "Principais concorrentes" },
  { name: "website", label: "Site (se tiver)" },
  { name: "socials", label: "Redes sociais (Instagram, Facebook, etc)", rows: 2 },
  { name: "whatsapp_response_time", label: "Quanto tempo demora para responder no WhatsApp?" },
  { name: "faq", label: "Principais dúvidas dos clientes antes de comprar", rows: 3 },
  { name: "restrictions", label: "O que você NÃO faz ou não atende?", help: "Ex: não atende domingo, não faz urgência" },
  { name: "team", label: "Trabalha sozinho ou com equipe? Quantas pessoas?" },
  { name: "daily_capacity", label: "Quantos atendimentos por dia?" },
  { name: "avg_duration", label: "Duração média do atendimento" },
  { name: "scheduling", label: "Agendamento ou ordem de chegada?" },
  { name: "walkin", label: "Atende sem agendamento?" },
  { name: "payment_methods", label: "Formas de pagamento aceitas" },
  { name: "promotions", label: "Faz promoções ou ofertas?" },
  { name: "parking", label: "Tem estacionamento?" },
  { name: "easy_access", label: "O local é de fácil acesso?" },
  { name: "accessibility", label: "Acessibilidade para pessoas com dificuldade de locomoção?" },
  { name: "restroom", label: "Banheiro disponível para clientes?" },
  { name: "ambient", label: "Ambiente é interno, externo ou ambos?" },
  { name: "covered", label: "Local coberto ou ao ar livre?" },
  { name: "wait_time", label: "O atendimento costuma ter espera?" },
  { name: "wifi", label: "Wi-fi disponível para clientes?" },
  { name: "kid_friendly", label: "Local bom para ir com crianças?" },
  { name: "bio", label: "Escreva 2 frases sobre você ou sua história com o negócio", rows: 3, help: "Ex: 'Sou cabeleireira há 10 anos no bairro X. Especialista em…'" },
  { name: "slogan", label: "Resuma o que você faz em uma frase curta", help: "Pode ser informal, a gente ajusta depois" },
];

export default function Briefing() {
  const { token } = useParams<{ token: string }>();
  const [client, setClient] = useState<{ name: string; company_name: string | null; submitted: boolean } | null>(null);
  const [data, setData] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    supabase.rpc("get_briefing_client", { _token: token }).then(({ data, error }) => {
      if (error || !data || (data as any[]).length === 0) {
        setClient(null);
      } else {
        const r = (data as any[])[0];
        setClient({ name: r.name, company_name: r.company_name, submitted: !!r.briefing_submitted_at });
      }
      setLoading(false);
    });
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    const { data: ok, error } = await supabase.rpc("submit_briefing", { _token: token, _data: data });
    setBusy(false);
    if (error || !ok) {
      toast.error("Erro ao enviar. Verifique o link e tente novamente.");
      return;
    }
    setDone(true);
  }

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">…</div>;
  if (!client) return (
    <div className="min-h-screen grid place-items-center px-4 text-center">
      <div>
        <h1 className="text-xl font-bold mb-2">Link inválido</h1>
        <p className="text-muted-foreground text-sm">Este link de briefing não foi encontrado.</p>
      </div>
    </div>
  );

  if (done || client.submitted) return (
    <div className="min-h-screen grid place-items-center px-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-6 space-y-3">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
          <h1 className="text-xl font-bold">Briefing recebido!</h1>
          <p className="text-sm text-muted-foreground">
            Obrigado, {client.name}. Em breve entraremos em contato pelo WhatsApp para a próxima etapa.
            Lembre-se de enviar as fotos do seu negócio também.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Briefing — {client.company_name || client.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Quanto mais detalhes, melhor seu site e perfil ficarão. Leva ~10 minutos.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {FIELDS.map((f) => (
                <div key={f.name} className="space-y-1.5">
                  <Label htmlFor={f.name}>{f.label}</Label>
                  {f.rows ? (
                    <Textarea
                      id={f.name}
                      rows={f.rows}
                      value={data[f.name] ?? ""}
                      onChange={(e) => setData({ ...data, [f.name]: e.target.value })}
                    />
                  ) : (
                    <Input
                      id={f.name}
                      type={f.type ?? "text"}
                      value={data[f.name] ?? ""}
                      onChange={(e) => setData({ ...data, [f.name]: e.target.value })}
                    />
                  )}
                  {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
                </div>
              ))}
              <div className="rounded-md bg-warning-soft p-3 text-sm">
                📷 <strong>Fotos:</strong> tem fotos do seu negócio, serviços ou produtos? Envie por WhatsApp depois de enviar este formulário. Se não tiver, tudo bem — começamos com fotos de banco.
              </div>
              <Button type="submit" disabled={busy} className="w-full">
                {busy ? "Enviando…" : "Enviar briefing"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
