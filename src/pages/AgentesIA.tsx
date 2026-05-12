import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/lib/types";
import {
  AGENTS, PIPELINE, AllAgentState, Message,
  makeInitialState, loadSession, saveSession, clearSession,
  buildClientContext, getSystemPrompt, buildContextMessages,
  callRegularAgent, callSeniorAgent, callVisionAgent,
} from "@/lib/agentConfig";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  BrainCircuit, Send, CheckCircle2, Lock, Loader2,
  ChevronRight, RotateCcw, Copy, CheckCheck, User, Trash2, GraduationCap,
  Palette, ImagePlus, X, Info,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AgentesIA() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [activeAgent, setActiveAgent] = useState(PIPELINE[0]);
  const [agentState, setAgentState] = useState<AllAgentState>(makeInitialState());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // UX Designer agent (id=8) state
  const [refImages, setRefImages] = useState<Array<{ name: string; base64: string }>>([]);
  const [designMode, setDesignMode] = useState<"identical" | "modeled" | "elements" | "inspiration">("modeled");
  const [designNotes, setDesignNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── fetch clients once ── */
  useEffect(() => {
    supabase.from("clients").select("*").order("name").then(({ data }) => {
      if (data) setClients(data as unknown as Client[]);
    });
  }, []);

  /* ── load saved session when client changes ── */
  useEffect(() => {
    if (!selectedClientId) return;
    const saved = loadSession(selectedClientId);
    if (saved) {
      setAgentState(saved);
      // find the last active/unlocked agent
      const lastActive = PIPELINE.find(id => saved[id]?.status === "active") ?? PIPELINE[0];
      setActiveAgent(lastActive);
      toast.info("Sessão anterior carregada. Continue de onde parou.");
    } else {
      const fresh = makeInitialState();
      setAgentState(fresh);
      setActiveAgent(PIPELINE[0]);
    }
  }, [selectedClientId]);

  /* ── auto-scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentState[activeAgent]?.messages]);

  const selectedClient = clients.find(c => c.id === selectedClientId) ?? null;
  const agentDef = AGENTS.find(a => a.id === activeAgent)!;
  const currentState = agentState[activeAgent];

  /* ── persist whenever state changes ── */
  const persist = useCallback((newState: AllAgentState) => {
    if (selectedClientId) saveSession(selectedClientId, newState);
  }, [selectedClientId]);

  /* ── Image upload for UX Designer ── */
  function handleImageFiles(files: FileList | null) {
    if (!files) return;
    const allowed = Array.from(files).filter(f => f.type.startsWith("image/")).slice(0, 5);
    allowed.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setRefImages(prev => {
          if (prev.length >= 5) { toast.warning("Máximo 5 imagens de referência."); return prev; }
          return [...prev, { name: file.name, base64 }];
        });
      };
      reader.readAsDataURL(file);
    });
  }

  /* ── Send message ── */
  async function sendMessage() {
    if (!input.trim() || loading) return;
    if (!selectedClient) { toast.error("Selecione um cliente."); return; }
    const key = localStorage.getItem("OPENAI_API_KEY");
    if (!key) { toast.error("Configure sua chave OpenAI em Configurações."); return; }

    // For agent 8, build message with design mode + notes
    let userContent = input.trim();
    if (activeAgent === 8 && currentState.messages.length === 0) {
      const modeLabel = { identical: "IDÊNTICO", modeled: "MODELADO", elements: "ELEMENTOS ESPECÍFICOS", inspiration: "APENAS INSPIRAÇÃO" }[designMode];
      userContent = `NÍVEL DE FIDELIDADE ÀS REFERÊNCIAS: ${modeLabel}\n\n${designNotes ? `INSTRUÇÕES ESPECÍFICAS DO USUÁRIO:\n${designNotes}\n\n` : ""}SOLICITAÇÃO: ${input.trim()}`;
    }

    const userMsg: Message = { role: "user", content: userContent };
    setInput("");
    const updatedMsgs = [...currentState.messages, userMsg];

    const s1 = { ...agentState, [activeAgent]: { ...currentState, messages: updatedMsgs } };
    setAgentState(s1);
    setLoading(true);

    try {
      const systemPrompt = getSystemPrompt(activeAgent, buildClientContext(selectedClient), agentState);
      const contextMessages = buildContextMessages(agentState, activeAgent);

      let reply: string;
      if (activeAgent === 8) {
        reply = await callVisionAgent(updatedMsgs, refImages, contextMessages, systemPrompt, key);
      } else if (agentDef.isSenior) {
        reply = await callSeniorAgent(updatedMsgs, contextMessages, systemPrompt, key);
      } else {
        reply = await callRegularAgent(updatedMsgs, contextMessages, systemPrompt, key);
      }

      const s2: AllAgentState = {
        ...s1,
        [activeAgent]: { ...s1[activeAgent], messages: [...updatedMsgs, { role: "assistant", content: reply }], output: reply },
      };
      setAgentState(s2);
      persist(s2);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro na API");
    } finally {
      setLoading(false);
    }
  }

  /* ── Approve and advance ── */
  function approveAndAdvance() {
    if (!currentState.output) { toast.error("Nenhum output para aprovar."); return; }
    const currentIdx = PIPELINE.indexOf(activeAgent);
    const nextId = PIPELINE[currentIdx + 1];

    const newState: AllAgentState = {
      ...agentState,
      [activeAgent]: { ...currentState, status: "done" },
      // Only unlock next agent if it's still locked — don't touch already active/done agents
      ...(nextId && agentState[nextId]?.status === "locked"
        ? { [nextId]: { ...agentState[nextId], status: "active" } }
        : {}),
    };
    setAgentState(newState);
    persist(newState);
    if (nextId) {
      setActiveAgent(nextId);
      const nextWasLocked = agentState[nextId]?.status === "locked";
      toast.success(nextWasLocked
        ? `Aprovado! ${nextId >= 100 ? "🎓 Revisor Sênior ativado." : "Próximo agente desbloqueado."}`
        : "Aprovado! Próximo agente já estava disponível.");
    } else {
      toast.success("Pipeline completo!");
    }
  }

  /* ── Reopen agent — unlock without clearing anything ── */
  function reopenAgent(id: number) {
    const newState: AllAgentState = {
      ...agentState,
      [id]: { ...agentState[id], status: "active" },
    };
    setAgentState(newState);
    persist(newState);
    setActiveAgent(id);
    toast.info("Agente reaberto. Histórico preservado — envie novas mensagens ou reaplique.");
  }

  /* ── Reset single agent ── */
  function resetAgent(id: number) {
    const idx = PIPELINE.indexOf(id);
    const newState = { ...agentState };
    // reset this agent and lock all after it
    PIPELINE.slice(idx).forEach((pid, i) => {
      newState[pid] = { status: i === 0 ? "active" : "locked", output: "", messages: [] };
    });
    setAgentState(newState);
    persist(newState);
    setActiveAgent(id);
  }

  /* ── Clear entire session ── */
  function clearAll() {
    if (!selectedClientId) return;
    clearSession(selectedClientId);
    const fresh = makeInitialState();
    setAgentState(fresh);
    setActiveAgent(PIPELINE[0]);
    toast.success("Sessão resetada.");
  }

  async function copyOutput() {
    if (!currentState.output) return;
    await navigator.clipboard.writeText(currentState.output);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  const pipelineIdx = PIPELINE.indexOf(activeAgent);
  const doneCount = PIPELINE.filter(id => agentState[id]?.status === "done").length;

  return (
    <div className="flex h-full min-h-0" style={{ height: "calc(100vh - 40px)" }}>

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-64 shrink-0 border-r flex flex-col bg-sidebar overflow-hidden">

        {/* Client selector */}
        <div className="p-3 border-b space-y-2 shrink-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Cliente ativo</p>
          <Select
            value={selectedClientId}
            onValueChange={v => { setSelectedClientId(v); setInput(""); }}
          >
            <SelectTrigger className="w-full text-xs h-8">
              <SelectValue placeholder="Selecionar cliente…" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.name}{c.company_name ? ` — ${c.company_name}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedClient && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {doneCount}/{PIPELINE.length} etapas concluídas
              </span>
              <button onClick={clearAll} className="text-[10px] text-destructive/70 hover:text-destructive flex items-center gap-0.5">
                <Trash2 className="h-2.5 w-2.5" /> resetar
              </button>
            </div>
          )}
          {/* Progress bar */}
          {selectedClient && (
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${(doneCount / PIPELINE.length) * 100}%` }}
              />
            </div>
          )}
        </div>

        {/* Pipeline list */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-1">Esteira PDL</p>
            {PIPELINE.map((id) => {
              const def = AGENTS.find(a => a.id === id)!;
              const st = agentState[id]?.status ?? "locked";
              const isActive = id === activeAgent;
              return (
                <div key={id} className={cn("group relative", def.isSenior && "ml-3")}>
                  <button
                    disabled={st === "locked"}
                    onClick={() => st !== "locked" && setActiveAgent(id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all pr-7",
                      isActive && (def.isSenior ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold" : "bg-primary/10 text-primary font-semibold"),
                      !isActive && st === "done" && "text-green-600 dark:text-green-400 hover:bg-green-500/10",
                      !isActive && st === "active" && !def.isSenior && "text-foreground hover:bg-accent/50",
                      !isActive && st === "active" && def.isSenior && "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10",
                      st === "locked" && "opacity-30 cursor-not-allowed",
                    )}
                  >
                    <span className={cn("text-sm shrink-0", def.isSenior && "text-amber-500")}>
                      {def.emoji}
                    </span>
                    <span className="flex-1 leading-tight text-[11px] truncate">{def.label}</span>
                    {st === "done" && <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />}
                    {st === "locked" && <Lock className="h-2.5 w-2.5 shrink-0" />}
                    {st === "active" && isActive && <ChevronRight className="h-3 w-3 shrink-0" />}
                  </button>
                  {/* Reabrir button — only for done agents, appears on hover */}
                  {st === "done" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); reopenAgent(id); }}
                      title="Reabrir agente (preserva histórico)"
                      className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity h-5 px-1 rounded text-[9px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 flex items-center gap-0.5"
                    >
                      ↩
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="p-2 border-t text-[9px] text-muted-foreground leading-relaxed shrink-0">
          💾 Sessão salva automaticamente. Saia e volte sem perder o progresso.
        </div>
      </aside>

      {/* ── MAIN CHAT ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Header */}
        <div className={cn(
          "border-b px-4 py-2.5 flex items-center justify-between shrink-0",
          agentDef.isSenior && "bg-amber-500/5 border-amber-500/20"
        )}>
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "h-8 w-8 rounded-lg grid place-items-center text-base shrink-0",
              agentDef.isSenior ? "bg-amber-500/15" : "bg-primary/10"
            )}>
              {agentDef.emoji}
            </div>
            <div>
              <div className="font-semibold text-sm flex items-center gap-1.5">
                {agentDef.label}
                {agentDef.isSenior && (
                  <Badge className="text-[9px] h-4 bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-0.5">
                    <GraduationCap className="h-2.5 w-2.5" /> SÊNIOR · Web Search
                  </Badge>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {selectedClient
                  ? `${selectedClient.name}${selectedClient.company_name ? ` · ${selectedClient.company_name}` : ""}`
                  : "Nenhum cliente selecionado"}
                {selectedClient && ` · Etapa ${pipelineIdx + 1}/${PIPELINE.length}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {currentState?.output && (
              <Button size="sm" variant="ghost" className="gap-1 text-xs h-7" onClick={copyOutput}>
                {copiedOutput ? <><CheckCheck className="h-3 w-3 text-green-500" />Copiado</> : <><Copy className="h-3 w-3" />Copiar</>}
              </Button>
            )}
            {currentState?.messages.length > 0 && currentState?.status !== "done" && (
              <Button size="sm" variant="ghost" className="gap-1 text-xs h-7" onClick={() => resetAgent(activeAgent)}>
                <RotateCcw className="h-3 w-3" /> Reiniciar
              </Button>
            )}
            {currentState?.output && currentState?.status !== "done" && (
              <Button size="sm" className="gap-1 text-xs h-7" onClick={approveAndAdvance}>
                <CheckCircle2 className="h-3 w-3" /> Aprovar e avançar
              </Button>
            )}
            {currentState?.status === "done" && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-xs h-7 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                  onClick={() => reopenAgent(activeAgent)}
                  title="Reabrir para continuar (histórico preservado)"
                >
                  ↩ Reabrir
                </Button>
                <Badge variant="outline" className="text-green-600 border-green-500/40 bg-green-500/5 gap-1 text-xs">
                  <CheckCircle2 className="h-3 w-3" /> Aprovado
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Senior agent notice */}
        {agentDef.isSenior && (
          <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-2 shrink-0">
            <GraduationCap className="h-3.5 w-3.5 shrink-0" />
            Agente Sênior — acessa internet, raciocina profundamente e valida o output do agente anterior antes de você aprovar.
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-auto px-5 py-4">
          {!selectedClient ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center gap-3 text-muted-foreground">
              <BrainCircuit className="h-10 w-10 opacity-20" />
              <p className="text-sm">Selecione um cliente para iniciar ou retomar a esteira.</p>
            </div>
          ) : !currentState?.messages.length ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center gap-3">

              {/* ── UX Designer special panel ── */}
              {activeAgent === 8 ? (
                <div className="w-full max-w-2xl space-y-4 text-left">
                  <div className="flex items-center gap-2 justify-center">
                    <Palette className="h-6 w-6 text-purple-500" />
                    <p className="font-semibold text-base">UX/UI Designer</p>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Envie até 5 prints de sites de referência e defina como quer usar cada um.
                  </p>

                  {/* Image drop zone */}
                  <div
                    className="border-2 border-dashed border-purple-500/30 rounded-xl p-5 text-center cursor-pointer hover:bg-purple-500/5 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handleImageFiles(e.dataTransfer.files); }}
                  >
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                      onChange={e => handleImageFiles(e.target.files)} />
                    <ImagePlus className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Arraste imagens aqui ou clique para selecionar</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">PNG, JPG, WebP • máx. 5 imagens</p>
                  </div>

                  {/* Image previews */}
                  {refImages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {refImages.map((img, i) => (
                        <div key={i} className="relative group">
                          <img src={img.base64} alt={img.name} className="h-20 w-28 object-cover rounded-lg border" />
                          <button
                            onClick={() => setRefImages(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white hidden group-hover:flex items-center justify-center"
                          ><X className="h-3 w-3" /></button>
                          <p className="text-[9px] text-muted-foreground truncate max-w-[112px] mt-0.5">{img.name}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Design mode */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nível de fidelidade às referências</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { id: "identical", label: "🔁 Idêntico", desc: "Replicar exatamente" },
                        { id: "modeled", label: "🧩 Modelado", desc: "Mesma estrutura, adaptado à marca" },
                        { id: "elements", label: "🎯 Elementos específicos", desc: "Definir o que copiar" },
                        { id: "inspiration", label: "💡 Apenas inspiração", desc: "Conceito geral, livre criação" },
                      ] as const).map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setDesignMode(opt.id)}
                          className={cn(
                            "p-2.5 rounded-lg border text-left text-xs transition-all",
                            designMode === opt.id
                              ? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                              : "border-border hover:bg-accent/50"
                          )}
                        >
                          <div className="font-medium">{opt.label}</div>
                          <div className="text-muted-foreground text-[10px]">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Design notes */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Instruções específicas (opcional)</Label>
                    <Textarea
                      className="text-xs min-h-[70px] resize-none"
                      placeholder="Ex: Quero o hero igual ao da referência 1, mas com as cores da marca. O menu deve ser igual ao da referência 2. Cards de serviços devem ser completamente diferentes — mais modernos..."
                      value={designNotes}
                      onChange={e => setDesignNotes(e.target.value)}
                    />
                  </div>

                  {refImages.length === 0 && (
                    <div className="flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-lg p-2.5">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      Você pode continuar sem imagens — o agente criará o design baseado no posicionamento e copy aprovados.
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="text-4xl">{agentDef.emoji}</div>
                  <p className="font-semibold text-sm">{agentDef.label}</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    {agentDef.isSenior
                      ? `Diga "Revisar agora" para o Revisor Sênior analisar o output do agente anterior com pesquisa na web.`
                      : `Diga "Pode começar" para iniciar com base nos dados de ${selectedClient.name}.`}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1 text-xs"
                    onClick={() => setInput(agentDef.isSenior ? "Revisar agora." : "Pode começar.")}
                  >
                    Usar sugestão
                  </Button>
                </>
              )}
            </div>

          ) : (
            <div className="space-y-4 pb-4">
              {currentState.messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-2.5", msg.role === "user" && "flex-row-reverse")}>
                  <div className={cn(
                    "h-6 w-6 rounded-full shrink-0 grid place-items-center text-xs",
                    msg.role === "assistant"
                      ? (agentDef.isSenior ? "bg-amber-500/15" : "bg-primary/10")
                      : "bg-muted"
                  )}>
                    {msg.role === "assistant" ? agentDef.emoji : <User className="h-3 w-3" />}
                  </div>
                  <Card className={cn(
                    "max-w-[82%] px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed",
                    msg.role === "user" && "bg-primary/5 border-primary/20",
                    msg.role === "assistant" && agentDef.isSenior && "border-amber-500/20 bg-amber-500/5"
                  )}>
                    {msg.content}
                  </Card>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2.5">
                  <div className={cn(
                    "h-6 w-6 rounded-full shrink-0 grid place-items-center text-xs",
                    agentDef.isSenior ? "bg-amber-500/15" : "bg-primary/10"
                  )}>
                    {agentDef.emoji}
                  </div>
                  <Card className={cn(
                    "px-4 py-3 text-xs flex items-center gap-2 text-muted-foreground",
                    agentDef.isSenior && "border-amber-500/20"
                  )}>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {agentDef.isSenior ? "Pesquisando e analisando profundamente…" : "Processando…"}
                  </Card>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        {currentState?.status !== "locked" && currentState?.status !== "done" && (
          <div className="border-t px-4 py-3 shrink-0 flex gap-2 items-end">
            <Textarea
              className="flex-1 min-h-[56px] max-h-[120px] resize-none text-sm"
              placeholder={
                !selectedClient
                  ? "Selecione um cliente primeiro…"
                  : agentDef.isSenior
                  ? "Digite ou use a sugestão acima para iniciar a revisão…"
                  : "Digite sua mensagem (Enter = enviar, Shift+Enter = nova linha)…"
              }
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={!selectedClient || loading}
            />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={sendMessage}
              disabled={!input.trim() || loading || !selectedClient}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}

        {currentState?.status === "done" && (
          <div className="border-t px-4 py-2.5 bg-green-500/5 text-xs text-green-700 dark:text-green-400 flex items-center gap-2 shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Output aprovado e salvo. Clique no próximo agente no painel lateral para continuar.
          </div>
        )}
      </div>
    </div>
  );
}
