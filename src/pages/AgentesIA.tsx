import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/lib/types";
import {
  AGENTS, PIPELINE, AllAgentState, AgentState, Message,
  makeInitialState, loadSession, saveSession, clearSession,
  buildClientContext, getSystemPrompt, getVisionSystemPrompt, buildContextMessages, getAgent1ConversationalPrompt,
  callRegularAgent, callSeniorAgent, callVisionAgent, callConversationalAgent,
  PARENT_AGENT, detectMissingInfo, parseStrategySections, STRATEGY_SECTIONS,
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
  Palette, ImagePlus, X, Info, Link, ScanSearch, RefreshCw, XCircle, AlertTriangle,
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
  // Engineer of Prompt agent (id=7) — segmented copy states
  const [copiedPrompt, setCopiedPrompt] = useState<Record<string, boolean>>({});
  const [copiedAll, setCopiedAll] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // UX Designer agent (id=8) state
  const [refImages, setRefImages] = useState<Array<{ name: string; base64: string }>>([]);
  const [designMode, setDesignMode] = useState<"identical" | "modeled" | "elements" | "inspiration">("modeled");
  const [designNotes, setDesignNotes] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Missing info warning
  const [missingInfoLines, setMissingInfoLines] = useState<string[]>([]);
  const [missingInfoState, setMissingInfoState] = useState<"none"|"warning"|"approved"|"blocked">("none");
  // Refresh
  const [refreshing, setRefreshing] = useState(false);
  // Strategy section active tab
  const [activeSection, setActiveSection] = useState(0);
  // Strategy sequential generation state
  const [sectionOutputs, setSectionOutputs] = useState<string[]>([]);
  const [generatingSection, setGeneratingSection] = useState<number | null>(null);
  const [sectionsComplete, setSectionsComplete] = useState(false);
  // Scraper mode state
  const [scraperMode, setScraperMode] = useState<"images" | "url">("url");
  const [scraperUrl, setScraperUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState<{
    url: string; title?: string; markdown: string; screenshot?: string;
  } | null>(null);

  /* ── fetch clients once ── */
  useEffect(() => {
    supabase.from("clients").select("*").order("name").then(({ data }) => {
      if (data) setClients(data as unknown as Client[]);
    });
  }, []);

  /* ── load saved session when client changes ── */
  useEffect(() => {
    if (!selectedClientId) return;
    
    const client = clients.find(c => c.id === selectedClientId);
    let saved = loadSession(selectedClientId);
    
    // Fallback to database notes if no localStorage session
    if (!saved && client?.notes?.startsWith("__AGENT_SESSION__\n")) {
      try {
        const rawJson = client.notes.substring("__AGENT_SESSION__\n".length);
        const parsed = JSON.parse(rawJson) as AllAgentState;
        
        const fresh = makeInitialState();
        const merged: AllAgentState = { ...fresh };
        PIPELINE.forEach((id) => {
          if (parsed[id] !== undefined) {
            merged[id] = parsed[id];
          }
        });
        saved = merged;
        saveSession(selectedClientId, merged);
      } catch (err) {
        console.error("Erro ao analisar sessão em clients.notes:", err);
      }
    }

    if (saved) {
      setAgentState(saved);
      // find the last active/unlocked agent
      const lastActive = PIPELINE.find(id => saved[id]?.status === "active") ?? PIPELINE[0];
      setActiveAgent(lastActive);
      toast.info("Sessão anterior carregada da nuvem/local. Continue de onde parou.");
    } else {
      const fresh = makeInitialState();
      setAgentState(fresh);
      setActiveAgent(PIPELINE[0]);
    }
    setMissingInfoLines([]);
    setMissingInfoState("none");
    setActiveSection(0);
    setSectionOutputs([]);
    setGeneratingSection(null);
    setSectionsComplete(false);
  }, [selectedClientId]);

  /* ── auto-scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentState[activeAgent]?.messages]);

  const selectedClient = clients.find(c => c.id === selectedClientId) ?? null;
  const agentDef = AGENTS.find(a => a.id === activeAgent)!;
  const currentState = agentState[activeAgent];

  /* ── persist whenever state changes ── */
  const persist = useCallback(async (newState: AllAgentState) => {
    if (!selectedClientId) return;
    saveSession(selectedClientId, newState);
    const payload = "__AGENT_SESSION__\n" + JSON.stringify(newState);
    
    // Update local state to ensure it is immediately available
    setClients(prev => prev.map(c => c.id === selectedClientId ? { ...c, notes: payload } : c));
    
    try {
      await supabase
        .from("clients")
        .update({ notes: payload })
        .eq("id", selectedClientId);
    } catch (err) {
      console.error("Erro ao sincronizar sessão na nuvem:", err);
    }
  }, [selectedClientId]);

  /* -- Sequential strategy generation for Agent 1 -- */
  async function generateStrategySections(
    messages: Message[],
    key: string,
    baseSystemPrompt: string,
    contextMessages: Message[],
    currentS1: AllAgentState,
    updatedMsgs: Message[]
  ) {
    const newSectionOutputs: string[] = [];
    setSectionOutputs([]);
    setSectionsComplete(false);

    for (let i = 0; i < STRATEGY_SECTIONS.length; i++) {
      setGeneratingSection(i);
      setActiveSection(i);

      const prevCtx = newSectionOutputs.length > 0
        ? "\n\n== SECOES JA GERADAS (use para coerencia e nao repita) ==\n" +
          newSectionOutputs.map((o, j) => "--- " + STRATEGY_SECTIONS[j].label + " ---\n" + o).join("\n\n")
        : "";

      const sectionSystemPrompt = baseSystemPrompt +
        "\n\n== INSTRUCAO DESTA CHAMADA ==" +
        "\nVoce esta gerando APENAS a secao \"" + STRATEGY_SECTIONS[i].label + "\"." +
        "\n\n" + STRATEGY_SECTIONS[i].focus +
        prevCtx +
        "\n\n== REGRA ABSOLUTA ==" +
        "\nNao gere outras secoes. Nao resuma. Maximo detalhamento para esta secao especifica. Comece diretamente pelo conteudo da secao, sem introducao.";

      try {
        const sectionReply = await callRegularAgent(messages, contextMessages, sectionSystemPrompt, key);
        newSectionOutputs.push(sectionReply);
        setSectionOutputs(prev => { const n = [...prev]; n[i] = sectionReply; return n; });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Erro na API";
        newSectionOutputs.push("[ERRO ao gerar esta secao: " + errMsg + "]");
        setSectionOutputs(prev => { const n = [...prev]; n[i] = newSectionOutputs[i]; return n; });
      }
    }

    setGeneratingSection(null);
    setSectionsComplete(true);
    setActiveSection(0);

    const fullOutput = STRATEGY_SECTIONS.map((s, i) =>
      "## " + s.label + "\n\n" + (newSectionOutputs[i] ?? "")
    ).join("\n\n---\n\n");

    const s2: AllAgentState = {
      ...currentS1,
      [1]: {
        ...currentS1[1],
        messages: [...updatedMsgs, { role: "assistant" as const, content: fullOutput }],
        output: fullOutput,
      },
    };
    setAgentState(s2);
    persist(s2);

    const gaps = detectMissingInfo(fullOutput);
    if (gaps.length > 0) { setMissingInfoLines(gaps); setMissingInfoState("warning"); }
    else { setMissingInfoLines([]); setMissingInfoState("none"); }
  }

  async function refreshClient() {
    if (!selectedClientId) return;
    setRefreshing(true);
    try {
      const { data } = await supabase.from("clients").select("*").eq("id", selectedClientId).single();
      if (data) {
        setClients(prev => prev.map(cl => cl.id === selectedClientId ? data as unknown as Client : cl));
        
        // Sync agent session if present in notes
        if (data.notes?.startsWith("__AGENT_SESSION__\n")) {
          try {
            const rawJson = data.notes.substring("__AGENT_SESSION__\n".length);
            const parsed = JSON.parse(rawJson) as AllAgentState;
            const fresh = makeInitialState();
            const merged: AllAgentState = { ...fresh };
            PIPELINE.forEach((id) => {
              if (parsed[id] !== undefined) {
                merged[id] = parsed[id];
              }
            });
            setAgentState(merged);
            saveSession(selectedClientId, merged);
            // find the last active/unlocked agent
            const lastActive = PIPELINE.find(id => merged[id]?.status === "active") ?? PIPELINE[0];
            setActiveAgent(lastActive);
          } catch (err) {
            console.error("Erro ao analisar notes após refresh:", err);
          }
        }
        
        toast.success("Briefing e sessão atualizados! Envie nova mensagem para o agente usar os dados novos.");
      }
    } catch { toast.error("Erro ao atualizar."); }
    finally { setRefreshing(false); }
  }

  /* ── Firecrawl scraping ── */
  async function scrapeUrl() {
    if (!scraperUrl.trim()) { toast.error("Digite uma URL válida."); return; }
    if (!/^https?:\/\//.test(scraperUrl)) { toast.error("URL deve começar com https://"); return; }
    const fcKey = localStorage.getItem("FIRECRAWL_API_KEY");
    if (!fcKey) { toast.error("Configure sua chave Firecrawl em Configurações."); return; }
    setScraping(true);
    setScrapedData(null);
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${fcKey}` },
        body: JSON.stringify({ url: scraperUrl.trim(), formats: ["markdown", "screenshot"] }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Firecrawl [${res.status}]: ${errText.slice(0, 200)}`);
      }
      const json = await res.json();
      const data = json?.data ?? json;
      setScrapedData({
        url: scraperUrl.trim(),
        title: data?.metadata?.title ?? data?.metadata?.ogTitle,
        markdown: data?.markdown ?? "",
        screenshot: data?.screenshot,
      });
      toast.success("✅ Site analisado! Escolha o nível de fidelidade e envie.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro no scraping");
    } finally {
      setScraping(false);
    }
  }

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

    // Defensive: if currentState is undefined (agent added after session was saved),
    // initialize it on the fly and unlock it so the user can proceed.
    const safeState: AgentState = currentState ?? { status: "active", output: "", messages: [] };
    if (safeState.status === "locked") {
      // Auto-unlock — this agent was locked because the session predates it
      const unlocked = { ...agentState, [activeAgent]: { ...safeState, status: "active" as const } };
      setAgentState(unlocked);
      persist(unlocked);
    }

    // Build user content depending on mode
    let userContent = input.trim();
    if (activeAgent === 8 && safeState.messages.length === 0) {
      const modeLabel = { identical: "IDÊNTICO", modeled: "MODELADO", elements: "ELEMENTOS ESPECÍFICOS", inspiration: "APENAS INSPIRAÇÃO" }[designMode];
      if (scraperMode === "url" && scrapedData) {
        // URL mode: inject scraped content as text
        const mdTrunc = scrapedData.markdown.slice(0, 6000);
        userContent = `NÍVEL DE FIDELIDADE ÀS REFERÊNCIAS: ${modeLabel}\n\nSITE RASPADO: ${scrapedData.url}\nTÍTULO: ${scrapedData.title ?? "(sem título)"}\n\n${designNotes ? `INSTRUÇÕES DO USUÁRIO:\n${designNotes}\n\n` : ""}CONTEÚDO DO SITE (markdown, truncado em 6000 chars):\n${mdTrunc}\n\nSOLICITAÇÃO: ${input.trim() || "Analise este site e gere o documento de design completo conforme as instruções."}` ;
        // Add screenshot as vision image if available
        if (scrapedData.screenshot) {
          setRefImages([{ name: "screenshot.png", base64: scrapedData.screenshot }]);
        }
      } else {
        userContent = `NÍVEL DE FIDELIDADE ÀS REFERÊNCIAS: ${modeLabel}\n\n${designNotes ? `INSTRUÇÕES ESPECÍFICAS DO USUÁRIO:\n${designNotes}\n\n` : ""}SOLICITAÇÃO: ${input.trim()}`;
      }
    }

    const userMsg: Message = { role: "user", content: userContent };
    setInput("");
    const updatedMsgs = [...safeState.messages, userMsg];

    const s1 = { ...agentState, [activeAgent]: { ...safeState, status: "active" as const, messages: updatedMsgs } };
    setAgentState(s1);
    setLoading(true);

    try {
      let systemPrompt: string;
      let contextMessages: Message[];
      if (activeAgent === 8) {
        // Vision agent: use lean prompt (no GMN_KNOWLEDGE, truncated history)
        // and NO extra context messages — keep tokens minimal for image processing
        systemPrompt = getVisionSystemPrompt(buildClientContext(selectedClient), agentState);
        contextMessages = [];
      } else {
        systemPrompt = getSystemPrompt(activeAgent, buildClientContext(selectedClient), agentState);
        contextMessages = buildContextMessages(agentState, activeAgent);
      }

      // Agent 1: first run = no assistant messages yet in history AND no strategy output saved
      // This is more robust than just checking output, because output could be stale from a previous session
      const hasAssistantReply = safeState.messages.some(m => m.role === "assistant");
      const isAgent1FirstRun = activeAgent === 1 && !hasAssistantReply && !safeState.output;
      if (isAgent1FirstRun) {
        await generateStrategySections([userMsg], key, systemPrompt, contextMessages, s1, updatedMsgs);
      } else {
        let reply: string;
        if (activeAgent === 8) {
          reply = await callVisionAgent(updatedMsgs, refImages, contextMessages, systemPrompt, key);
        } else if (agentDef.isSenior) {
          reply = await callSeniorAgent(updatedMsgs, contextMessages, systemPrompt, key);
        } else {
          if (activeAgent === 1) {
            // CONVERSATIONAL MODE: lean history + capped tokens (max 1200)
            // Compress all long assistant messages (strategy sections) into a short placeholder
            // so GPT doesn't try to mimic the strategy format
            const convPrompt = getAgent1ConversationalPrompt(buildClientContext(selectedClient));
            const leanMsgs: Message[] = updatedMsgs.map(m => {
              if (m.role === "assistant" && m.content.length > 600) {
                return { role: "assistant" as const, content: "[Estratégia completa já gerada nas 9 seções. Agora estamos em modo de conversa. Responda de forma breve e direta.]" };
              }
              return m;
            });
            reply = await callConversationalAgent(leanMsgs, convPrompt, key);
          } else {
            reply = await callRegularAgent(updatedMsgs, contextMessages, systemPrompt, key);
          }
        }

        // For Agent 1 in conversational mode: PRESERVE the strategy output, only append messages
        // This ensures isAgent1FirstRun stays false and the strategy tabs keep working
        const existingOutput = s1[activeAgent]?.output ?? "";
        const shouldPreserveOutput = activeAgent === 1 && existingOutput.length > 600;
        const s2: AllAgentState = {
          ...s1,
          [activeAgent]: {
            ...s1[activeAgent],
            messages: [...updatedMsgs, { role: "assistant", content: reply }],
            output: shouldPreserveOutput ? existingOutput : reply,
          },
        };
        setAgentState(s2);
        persist(s2);
        if (activeAgent === 1 && !shouldPreserveOutput) {
          const gaps = detectMissingInfo(reply);
          if (gaps.length > 0) { setMissingInfoLines(gaps); setMissingInfoState("warning"); }
          else { setMissingInfoLines([]); setMissingInfoState("none"); }
          setActiveSection(0);
        }
      }
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
      const nextDef = AGENTS.find(a => a.id === nextId);
      const nextLabel = nextId === 11 ? "🔎 Auditor de Cenário ativado."
        : nextId === 12 ? "⚖️ Decisor de Estratégia ativado."
        : nextDef?.isSenior ? "🎓 Revisor Sênior ativado."
        : "Próximo agente desbloqueado.";
      toast.success(nextWasLocked
        ? `Aprovado! ${nextLabel}`
        : "Aprovado! Próximo agente já estava disponível.");
    } else {
      toast.success("Pipeline completo!");
    }
  }

  /* -- Reject and return -- */
  async function rejectAndReturn() {
    if (!currentState?.output || loading) return;
    const parentId = PARENT_AGENT[activeAgent];
    if (parentId === undefined) { toast.error("Este agente nao tem um agente anterior para corrigir."); return; }
    const key = localStorage.getItem("OPENAI_API_KEY");
    if (!key || !selectedClient) return;
    const parentState = agentState[parentId];
    if (!parentState) return;
    const criticLabel = AGENTS.find(a => a.id === activeAgent)?.label ?? ("Agente " + activeAgent);
    const rejectionMsg = {
      role: "user" as const,
      content: "O " + criticLabel + " identificou falhas na sua entrega anterior:\n\n" + currentState.output + "\n\n---\nCorriga APENAS as secoes marcadas com FALHA ou ATENCAO. As aprovadas devem ser mantidas como estao. Entregue a versao corrigida completa.",
    };
    const updatedParentMsgs = [...parentState.messages, rejectionMsg];
    const s1 = { ...agentState, [activeAgent]: { ...currentState, status: "active" as const }, [parentId]: { ...parentState, status: "active" as const, messages: updatedParentMsgs } };
    setAgentState(s1);
    persist(s1);
    setActiveAgent(parentId);
    setActiveSection(0);
    setLoading(true);
    toast.info("Enviando criticas ao agente anterior...");
    try {
      const systemPrompt = getSystemPrompt(parentId, buildClientContext(selectedClient), agentState);
      const contextMessages = buildContextMessages(agentState, parentId);
      const parentDef = AGENTS.find(a => a.id === parentId);
      const reply = parentDef?.isSenior
        ? await callSeniorAgent(updatedParentMsgs, contextMessages, systemPrompt, key)
        : await callRegularAgent(updatedParentMsgs, contextMessages, systemPrompt, key);
      const s2 = { ...s1, [parentId]: { ...s1[parentId], messages: [...updatedParentMsgs, { role: "assistant" as const, content: reply }], output: reply } };
      setAgentState(s2);
      persist(s2);
      if (parentId === 1) {
        const gaps = detectMissingInfo(reply);
        setMissingInfoLines(gaps);
        setMissingInfoState(gaps.length > 0 ? "warning" : "none");
      }
      toast.success("Versao corrigida gerada! Revise e aprove ou reprove novamente.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na API");
    } finally { setLoading(false); }
  }

  /* -- Re-generate strategy with conversation context -- */
  async function regenerateStrategy() {
    if (!selectedClient || loading) return;
    const key = localStorage.getItem("OPENAI_API_KEY");
    if (!key) { toast.error("Configure sua chave OpenAI."); return; }
    const safeState = agentState[1] ?? { status: "active" as const, output: "", messages: [] };
    if (!safeState.messages.length) { toast.error("Nenhuma conversa para re-gerar."); return; }

    // ── Build a CLEAN message set for re-generation ──────────────────────────
    // Instead of passing the full conversational history (which contains
    // compressed placeholder messages that confuse section generation),
    // we extract the agreed changes summary and build a single fresh directive.

    // 1. Find the last assistant message containing the agreed changes summary
    const lastSummaryMsg = [...safeState.messages]
      .reverse()
      .find(m => m.role === "assistant" && m.content.includes("RESUMO DAS ALTERAÇÕES ACORDADAS"));

    // 2. Also collect any user messages that describe the desired changes
    //    (in case the summary is in user text, not assistant)
    const lastUserSummaryMsg = [...safeState.messages]
      .reverse()
      .find(m => m.role === "user" && m.content.includes("RESUMO DAS ALTERAÇÕES ACORDADAS"));

    const summaryBlock = lastSummaryMsg?.content ?? lastUserSummaryMsg?.content ?? null;

    // 3. Extract changes text — take only the summary portion if present
    const changesContext = summaryBlock
      ? `\n\n== ALTERAÇÕES ACORDADAS NA REVISÃO (APLICAR OBRIGATORIAMENTE) ==\n${summaryBlock}`
      : "\n\nRegenere a estratégia aplicando todas as alterações discutidas na conversa anterior. Mantenha toda a profundidade e detalhamento da versão original.";

    // 4. Use the original first user message as briefing base (clean, no chat noise)
    const firstUserMsg = safeState.messages.find(m => m.role === "user");
    const baseContent = (firstUserMsg?.content?.length ?? 0) > 600
      ? firstUserMsg!.content   // original full trigger with briefing context
      : "Gere a estratégia completa para este cliente com base no briefing fornecido.";

    const regenerateMsg: Message = {
      role: "user",
      content: `${baseContent}${changesContext}\n\nGere a estratégia COMPLETA com as 9 seções, aplicando todas as alterações acordadas acima.`,
    };

    const cleanMessages: Message[] = [regenerateMsg];

    const systemPrompt = getSystemPrompt(1, buildClientContext(selectedClient), agentState);
    const contextMessages = buildContextMessages(agentState, 1);
    setSectionOutputs([]);
    setSectionsComplete(false);
    setGeneratingSection(null);
    setLoading(true);
    toast.info("Re-gerando estratégia com as alterações acordadas...");
    try {
      await generateStrategySections(cleanMessages, key, systemPrompt, contextMessages, agentState, cleanMessages);
      toast.success("Estratégia re-gerada com as alterações aplicadas!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na API");
    } finally {
      setLoading(false);
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
    if (id === 1) { setSectionOutputs([]); setGeneratingSection(null); setSectionsComplete(false); setMissingInfoState("none"); }
  }

  /* ── Clear entire session ── */
  async function clearAll() {
    if (!selectedClientId) return;
    clearSession(selectedClientId);
    const fresh = makeInitialState();
    setAgentState(fresh);
    setActiveAgent(PIPELINE[0]);
    
    // Clear in local state
    setClients(prev => prev.map(c => c.id === selectedClientId ? { ...c, notes: null } : c));
    
    // Clear in Supabase
    try {
      await supabase
        .from("clients")
        .update({ notes: null })
        .eq("id", selectedClientId);
      toast.success("Sessão resetada localmente e na nuvem.");
    } catch (err) {
      console.error("Erro ao resetar sessão na nuvem:", err);
      toast.success("Sessão resetada localmente.");
    }
  }

  async function copyOutput() {
    if (!currentState.output) return;
    await navigator.clipboard.writeText(currentState.output);
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  }

  /** Splits Engenheiro de Prompt output into labelled sections */
  function parseEngPrompts(output: string): Array<{ label: string; content: string }> {
    const regex = /===(.*?)===([\s\S]*?)(?=(?:===|--- FIM DO PROMPT))/g;
    const sections: Array<{ label: string; content: string }> = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(output)) !== null) {
      const label = match[1].trim();
      const body = match[2].trim();
      if (label && body) sections.push({ label, content: body });
    }
    // fallback: split by --- FIM DO PROMPT [X] ---
    if (sections.length === 0) {
      const parts = output.split(/---\s*FIM DO PROMPT\s*[A-E]\s*---/i);
      const headers = [...output.matchAll(/===\s*PROMPT\s+([A-E][^\n=]*)===/gi)];
      parts.forEach((part, i) => {
        const trimmed = part.trim();
        if (!trimmed) return;
        const label = headers[i]
          ? headers[i][0].replace(/===/g, '').trim()
          : `Bloco ${i + 1}`;
        sections.push({ label, content: trimmed });
      });
    }
    return sections.length > 1 ? sections : [];
  }

  async function copyPromptSection(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedPrompt(p => ({ ...p, [key]: true }));
    setTimeout(() => setCopiedPrompt(p => ({ ...p, [key]: false })), 2000);
  }

  async function copyAllPrompts(text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
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
          <div className="flex gap-1 items-start">
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
            <button onClick={refreshClient} disabled={refreshing} title="Atualizar briefing do cliente" className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md border hover:bg-accent/50 transition-colors disabled:opacity-50">
              <RefreshCw className={"h-3 w-3" + (refreshing ? " animate-spin" : "")} />
            </button>
          )}
          </div>
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
            {activeAgent === 1 && currentState?.messages.length > 0 && currentState?.status !== "done" && (
              <Button size="sm" variant="outline" className="gap-1 text-xs h-7 text-blue-600 border-blue-400/50 hover:bg-blue-500/10" onClick={regenerateStrategy} disabled={loading} title="Re-gerar as 9 seções aplicando as alterações discutidas">
                <RefreshCw className="h-3 w-3" /> Re-gerar estratégia
              </Button>
            )}
            {currentState?.output && currentState?.status !== "done" && PARENT_AGENT[activeAgent] !== undefined && (
              <Button size="sm" variant="outline" className="gap-1 text-xs h-7 text-rose-600 border-rose-400/50 hover:bg-rose-500/10" onClick={rejectAndReturn} disabled={loading} title="Reprovar e enviar correcões ao agente anterior">
                <XCircle className="h-3 w-3" /> Reprovar
              </Button>
            )}
            {currentState?.output && currentState?.status !== "done" && (
              <Button size="sm" className="gap-1 text-xs h-7" onClick={approveAndAdvance} disabled={missingInfoState === "blocked" || loading}>
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

        {/* Senior / Auditor agent notice */}
        {agentDef.isSenior && (
          <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 flex items-center gap-2 shrink-0">
            <GraduationCap className="h-3.5 w-3.5 shrink-0" />
            {activeAgent === 11
              ? "Auditor de Cenário — avalia a estratégia do Estrategista PDL com critérios fixos e pesquisa na web. O parecer será encaminhado ao Decisor."
              : "Agente Sênior — acessa internet, raciocina profundamente e valida o output do agente anterior antes de você aprovar."}
          </div>
        )}

        {/* Missing info banners - Agent 1 */}
        {activeAgent === 1 && missingInfoState === "warning" && (
          <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/30 shrink-0 space-y-2">
            <div className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs"><p className="font-semibold mb-1">Informacoes insuficientes detectadas:</p><ul className="list-disc list-inside text-[11px] opacity-80 space-y-0.5">{missingInfoLines.map((l,i)=><li key={i}>{l}</li>)}</ul></div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={()=>setMissingInfoState("approved")} className="text-[11px] px-3 py-1.5 rounded-md bg-amber-500 text-white hover:bg-amber-600 font-medium">Prosseguir mesmo assim</button>
              <button onClick={()=>setMissingInfoState("blocked")} className="text-[11px] px-3 py-1.5 rounded-md border border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 font-medium">Aguardar informacao</button>
            </div>
          </div>
        )}
        {activeAgent === 1 && missingInfoState === "blocked" && (
          <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/30 text-[11px] text-rose-700 dark:text-rose-400 flex items-center gap-2 shrink-0">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">Aprovacao bloqueada. Atualize o briefing (botao refresh) ou adicione a informacao no chat e clique em Aprovar.</span>
            <button onClick={()=>setMissingInfoState("approved")} className="shrink-0 text-[10px] px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 font-medium">Desbloquear</button>
          </div>
        )}
        {activeAgent === 1 && missingInfoState === "approved" && (
          <div className="px-4 py-1.5 bg-green-500/10 border-b border-green-500/20 text-[11px] text-green-700 dark:text-green-400 flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="h-3 w-3" /> Aprovado com informacoes pendentes.
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

                  {/* Mode toggle */}
                  <div className="flex rounded-lg border overflow-hidden text-xs font-medium">
                    <button
                      onClick={() => { setScraperMode("url"); setScrapedData(null); }}
                      className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 transition-all",
                        scraperMode === "url" ? "bg-purple-600 text-white" : "hover:bg-accent/50")}
                    ><ScanSearch className="h-3.5 w-3.5" /> URL (Scraping automático)
                    </button>
                    <button
                      onClick={() => setScraperMode("images")}
                      className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 transition-all",
                        scraperMode === "images" ? "bg-purple-600 text-white" : "hover:bg-accent/50")}
                    ><ImagePlus className="h-3.5 w-3.5" /> Prints manuais
                    </button>
                  </div>

                  {/* URL mode */}
                  {scraperMode === "url" && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input
                            type="url"
                            placeholder="https://site-de-referencia.com.br"
                            value={scraperUrl}
                            onChange={e => setScraperUrl(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && scrapeUrl()}
                            className="w-full pl-8 pr-3 py-2 text-xs border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={scrapeUrl}
                          disabled={scraping || !scraperUrl.trim()}
                          className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                        >
                          {scraping ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Raspando…</> : <><ScanSearch className="h-3.5 w-3.5" />Analisar site</>}
                        </Button>
                      </div>

                      {scraping && (
                        <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-500/10 rounded-lg p-3">
                          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                          Raspando o site com Firecrawl — extraindo estrutura, conteúdo e screenshot…
                        </div>
                      )}

                      {scrapedData && (
                        <div className="rounded-xl border border-purple-500/30 overflow-hidden bg-purple-500/5">
                          <div className="flex items-center gap-2 px-3 py-2 border-b border-purple-500/20 bg-purple-500/10">
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            <span className="text-xs font-medium truncate">{scrapedData.title ?? scrapedData.url}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground shrink-0">{(scrapedData.markdown.length / 1000).toFixed(1)}k chars</span>
                          </div>
                          {scrapedData.screenshot && (
                            <img src={scrapedData.screenshot} alt="Screenshot" className="w-full max-h-40 object-cover object-top" />
                          )}
                          <p className="text-[10px] text-muted-foreground px-3 py-2">
                            ✅ Conteúdo extraído. Defina o nível de fidelidade abaixo e envie.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Images mode */}
                  {scraperMode === "images" && (
                    <div className="space-y-3">
                      <div
                        className="border-2 border-dashed border-purple-500/30 rounded-xl p-5 text-center cursor-pointer hover:bg-purple-500/5 transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={e => e.preventDefault()}
                        onDrop={e => { e.preventDefault(); handleImageFiles(e.dataTransfer.files); }}
                      >
                        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                          onChange={e => handleImageFiles(e.target.files)} />
                        <ImagePlus className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Arraste prints aqui ou clique para selecionar</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">PNG, JPG, WebP • máx. 5 imagens</p>
                      </div>
                      {refImages.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {refImages.map((img, i) => (
                            <div key={i} className="relative group">
                              <img src={img.base64} alt={img.name} className="h-20 w-28 object-cover rounded-lg border" />
                              <button onClick={() => setRefImages(prev => prev.filter((_, idx) => idx !== i))}
                                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white hidden group-hover:flex items-center justify-center"
                              ><X className="h-3 w-3" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Fidelity options */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nível de fidelidade à referência</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { id: "identical", label: "🔁 Idêntico", desc: "Replicar exatamente" },
                        { id: "modeled", label: "🧩 Modelado", desc: "Mesma estrutura, adaptado à marca" },
                        { id: "elements", label: "🎯 Elementos específicos", desc: "Definir o que copiar" },
                        { id: "inspiration", label: "💡 Apenas inspiração", desc: "Conceito geral, livre criação" },
                      ] as const).map(opt => (
                        <button key={opt.id} onClick={() => setDesignMode(opt.id)}
                          className={cn("p-2.5 rounded-lg border text-left text-xs transition-all",
                            designMode === opt.id ? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300" : "border-border hover:bg-accent/50")}
                        >
                          <div className="font-medium">{opt.label}</div>
                          <div className="text-muted-foreground text-[10px]">{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Instruções específicas (opcional)</Label>
                    <Textarea className="text-xs min-h-[60px] resize-none"
                      placeholder="Ex: Manter a estrutura do hero, adaptar cores para a paleta da marca. Menu diferente — mais clean..."
                      value={designNotes} onChange={e => setDesignNotes(e.target.value)} />
                  </div>

                  {scraperMode === "url" && !scrapedData && !scraping && (
                    <div className="flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-lg p-2.5">
                      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      Cole a URL do site de referência e clique em "Analisar site" antes de enviar.
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="text-4xl">{agentDef.emoji}</div>
                  <p className="font-semibold text-sm">{agentDef.label}</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    {activeAgent === 11
                      ? `Diga "Auditar agora" para o Auditor avaliar a estratégia do Estrategista com pesquisa na web.`
                      : activeAgent === 12
                      ? `Diga "Pode decidir. Analise a estratégia e o parecer do Auditor e gere a versão final."`
                      : agentDef.isSenior
                      ? `Diga "Revisar agora" para o Revisor Sênior analisar o output do agente anterior com pesquisa na web.`
                      : `Diga "Pode começar" para iniciar com base nos dados de ${selectedClient.name}.`}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1 text-xs"
                    onClick={() => setInput(
                      activeAgent === 11 ? "Auditar agora."
                      : activeAgent === 12 ? "Pode decidir. Analise a estratégia e o parecer do Auditor e gere a versão final."
                      : agentDef.isSenior ? "Revisar agora."
                      : "Pode começar."
                    )}
                  >
                    Usar sugestão
                  </Button>
                </>
              )}
            </div>

          ) : (
            <div className="space-y-4 pb-4">
              {currentState.messages.map((msg, i) => {
                // -- Agent 1 multi-section tabs --
                if (activeAgent === 1 && msg.role === "assistant" && i === currentState.messages.length - 1) {
                  // Use sectionOutputs (sequential) if available, else parse from text (legacy)
                  const useSectionOutputs = sectionOutputs.length > 0;
                  const secs = useSectionOutputs
                    ? STRATEGY_SECTIONS.map((s, si) => ({ label: s.label, content: sectionOutputs[si] ?? "" }))
                    : parseStrategySections(msg.content);
                  if (secs.length >= 2) {
                    return (
                      <div key={i} className="space-y-3 w-full">
                        {/* Progress indicator when generating */}
                        {generatingSection !== null && (
                          <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                            <span>Gerando seção {generatingSection + 1}/{STRATEGY_SECTIONS.length}: <strong>{STRATEGY_SECTIONS[generatingSection]?.label}</strong></span>
                          </div>
                        )}
                        {sectionsComplete && (
                          <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400 bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>Todas as {STRATEGY_SECTIONS.length} seções geradas. Revise e aprove para enviar ao Auditor.</span>
                          </div>
                        )}
                        {/* Section tabs */}
                        <div className="flex flex-wrap gap-1 px-1">
                          {secs.map((s,si)=>(
                            <button key={si} onClick={()=>setActiveSection(si)}
                              className={"text-[10px] px-2.5 py-1 rounded-full border font-medium transition-all flex items-center gap-1 " +
                                (activeSection===si?"bg-primary text-primary-foreground border-primary":"border-border hover:bg-accent/50") +
                                (generatingSection===si?" animate-pulse":"") +
                                (useSectionOutputs && !sectionOutputs[si]?" opacity-40":"")
                              }
                            >
                              {generatingSection===si && <Loader2 className="h-2.5 w-2.5 animate-spin"/>}
                              {useSectionOutputs && sectionOutputs[si] && generatingSection!==si && <CheckCircle2 className="h-2.5 w-2.5 text-green-500"/>}
                              {si+1}
                            </button>
                          ))}
                          <button onClick={()=>setActiveSection(-1)} className={"text-[10px] px-2.5 py-1 rounded-full border font-medium transition-all "+(activeSection===-1?"bg-muted text-foreground":"border-border text-muted-foreground hover:bg-accent/50")}>Tudo</button>
                        </div>
                        {/* Active section content */}
                        <Card className="border-primary/20 bg-primary/5 overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2 border-b border-primary/15 bg-primary/10">
                            <span className="text-xs font-bold text-primary">{activeSection===-1?"Estrategia Completa":secs[activeSection]?.label}</span>
                            <button onClick={async()=>{
                              const text = activeSection===-1?msg.content:(secs[activeSection]?.content??"");
                              await navigator.clipboard.writeText(text);
                              toast.success("Copiado!");
                            }} className="text-[11px] flex items-center gap-1 px-2 py-0.5 rounded border border-primary/20 hover:bg-primary/10">
                              <Copy className="h-2.5 w-2.5"/>Copiar
                            </button>
                          </div>
                          <div className="px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed text-foreground/90 max-h-[60vh] overflow-y-auto">
                            {activeSection===-1 ? msg.content : (secs[activeSection]?.content || (generatingSection!==null?"Gerando...":""))}
                          </div>
                        </Card>
                      </div>
                    );
                  }
                }

                // ── Special rendering for Engenheiro de Prompt (agent 7) assistant messages ──
                if (activeAgent === 7 && msg.role === "assistant") {
                  const sections = parseEngPrompts(msg.content);
                  if (sections.length > 1) {
                    return (
                      <div key={i} className="space-y-3 w-full">
                        {/* Header bar */}
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2 text-xs font-semibold text-violet-700 dark:text-violet-400">
                            <span className="text-base">{agentDef.emoji}</span>
                            Prompts gerados — copie individualmente ou todos juntos
                          </div>
                          <button
                            onClick={() => copyAllPrompts(msg.content)}
                            className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-md border border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300 hover:bg-violet-500/20 transition-colors"
                          >
                            {copiedAll ? <><CheckCheck className="h-3 w-3 text-green-500" /> Copiado!</> : <><Copy className="h-3 w-3" /> Copiar tudo</>}
                          </button>
                        </div>

                        {/* Individual prompt cards */}
                        {sections.map((sec, si) => (
                          <Card key={si} className="border-violet-500/20 bg-violet-500/5 overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2 border-b border-violet-500/15 bg-violet-500/10">
                              <span className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wide">
                                {sec.label}
                              </span>
                              <button
                                onClick={() => copyPromptSection(`${i}-${si}`, sec.content)}
                                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded border border-violet-500/30 bg-white/50 dark:bg-white/5 text-violet-700 dark:text-violet-300 hover:bg-violet-500/20 transition-colors"
                              >
                                {copiedPrompt[`${i}-${si}`]
                                  ? <><CheckCheck className="h-3 w-3 text-green-500" /> Copiado</>
                                  : <><Copy className="h-3 w-3" /> Copiar</>}
                              </button>
                            </div>
                            <div className="px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed text-foreground/90 max-h-[340px] overflow-y-auto">
                              {sec.content}
                            </div>
                          </Card>
                        ))}
                      </div>
                    );
                  }
                }

                // ── Default message rendering ──
                return (
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
                );
              })}
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
                    {agentDef.isSenior ? "Pesquisando e analisando profundamente…" : activeAgent === 1 && agentState[1]?.messages?.filter(m => m.role === "assistant").length > 0 ? "Analisando e respondendo..." : "Processando…"}
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
