const els = {
  apiKeyStatus: document.getElementById("apiKeyStatus"),
  providerSelect: document.getElementById("providerSelect"),
  btnSaveProvider: document.getElementById("btnSaveProvider"),
  geminiKeyInput: document.getElementById("geminiKeyInput"),
  btnSaveGeminiKey: document.getElementById("btnSaveGeminiKey"),
  openaiKeyInput: document.getElementById("openaiKeyInput"),
  btnSaveOpenAIKey: document.getElementById("btnSaveOpenAIKey"),

  clientSelect: document.getElementById("clientSelect"),
  clientSummary: document.getElementById("clientSummary"),
  btnNewClient: document.getElementById("btnNewClient"),
  btnEditClient: document.getElementById("btnEditClient"),
  btnDeleteClient: document.getElementById("btnDeleteClient"),

  photosInput: document.getElementById("photosInput"),
  photosList: document.getElementById("photosList"),

  optAnalyzePhotos: document.getElementById("optAnalyzePhotos"),
  optWriteMetadata: document.getElementById("optWriteMetadata"),
  optGpsEnabled: document.getElementById("optGpsEnabled"),
  extraInstructions: document.getElementById("extraInstructions"),

  btnRun: document.getElementById("btnRun"),
  runStatus: document.getElementById("runStatus"),

  clientDialog: document.getElementById("clientDialog"),
  clientDialogTitle: document.getElementById("clientDialogTitle"),
  btnSaveClient: document.getElementById("btnSaveClient"),
  btnExtractBriefing: document.getElementById("btnExtractBriefing"),
  extractStatus: document.getElementById("extractStatus"),

  clientName: document.getElementById("clientName"),
  clientPrimaryCategory: document.getElementById("clientPrimaryCategory"),
  clientBusinessName: document.getElementById("clientBusinessName"),
  clientNeighborhood: document.getElementById("clientNeighborhood"),
  clientCity: document.getElementById("clientCity"),
  clientState: document.getElementById("clientState"),
  clientAddress: document.getElementById("clientAddress"),
  clientLat: document.getElementById("clientLat"),
  clientLon: document.getElementById("clientLon"),
  clientServices: document.getElementById("clientServices"),
  clientKeywords: document.getElementById("clientKeywords"),
  clientDoNotUse: document.getElementById("clientDoNotUse"),
  clientTone: document.getElementById("clientTone"),
  clientBriefing: document.getElementById("clientBriefing"),
  clientWarnings: document.getElementById("clientWarnings"),
};

let state = {
  clients: [],
  selectedClientId: "",
  editingClientId: null,
};

function splitCsv(text) {
  return String(text || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function api(path, { method = "GET", body, isForm = false } = {}) {
  const resp = await fetch(path, {
    method,
    headers: isForm ? undefined : { "Content-Type": "application/json" },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json?.error || "Falha na requisição.");
  return json;
}

function renderClients() {
  els.clientSelect.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "Selecione…";
  els.clientSelect.appendChild(opt0);

  for (const c of state.clients) {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    if (c.id === state.selectedClientId) opt.selected = true;
    els.clientSelect.appendChild(opt);
  }
  renderClientSummary();
}

function renderClientSummary() {
  const c = state.clients.find((x) => x.id === state.selectedClientId);
  if (!c) {
    els.clientSummary.textContent = "Nenhum cliente selecionado.";
    renderClientWarnings(null);
    return;
  }
  const p = c.profile || {};
  const gps = p.gps?.enabled ? `GPS: ${p.gps.latitude}, ${p.gps.longitude}` : "GPS: desligado";
  const pieces = [
    p.businessName ? `Negócio: ${p.businessName}` : null,
    p.primaryCategory ? `Categoria: ${p.primaryCategory}` : null,
    [p.neighborhood, p.city, p.state].filter(Boolean).join(" / ") || null,
    gps,
  ].filter(Boolean);
  els.clientSummary.textContent = pieces.join(" • ");
  renderClientWarnings(c);
}

function renderClientWarnings(client) {
  const el = document.getElementById("clientWarnings");
  if (!el) return;
  el.innerHTML = "";
  if (!client) return;

  const p = client.profile || {};

  // Define checks: each entry is { field label, severity, condition to trigger, tip }
  const checks = [
    {
      label: "Bairro vazio",
      severity: "error",
      missing: !p.neighborhood,
      tip: "O bairro é fundamental para SEO local. A IA não conseguirá gerar 'keywords de vizinhança' sem ele. <strong>Edite o cliente e preencha o campo Bairro.</strong>",
    },
    {
      label: "Cidade vazia",
      severity: "error",
      missing: !p.city,
      tip: "Sem cidade a IA não consegue gerar metadados de localização. <strong>Preencha o campo Cidade.</strong>",
    },
    {
      label: "Keywords de SEO ausentes",
      severity: "error",
      missing: !Array.isArray(p.keywords) || p.keywords.length === 0,
      tip: "Sem palavras-chave o sistema usará apenas termos genéricos. <strong>Adicione keywords no perfil do cliente.</strong>",
    },
    {
      label: "Nome do negócio ausente",
      severity: "error",
      missing: !p.businessName,
      tip: "O nome do negócio é usado no campo 'Creator' e 'Copyright' dos metadados IPTC. <strong>Preencha o campo Nome do Negócio.</strong>",
    },
    {
      label: "Categoria principal ausente",
      severity: "warn",
      missing: !p.primaryCategory,
      tip: "A categoria ajuda a IA a categorizar o tipo da foto (serviço, equipe, interior...). <strong>Preencha o campo Categoria Principal.</strong>",
    },
    {
      label: "Tom de voz não definido",
      severity: "warn",
      missing: !p.tone,
      tip: "Sem tom de voz a IA usa linguagem neutra. Defina se prefere 'formal', 'descontraído', 'técnico', etc. <strong>Preencha o campo Tom de Voz.</strong>",
    },
    {
      label: "Serviços não listados",
      severity: "warn",
      missing: !Array.isArray(p.services) || p.services.length === 0,
      tip: "Os serviços ajudam a IA a identificar o que está retratado na foto. <strong>Adicione pelo menos 2-3 serviços no perfil.</strong>",
    },
    {
      label: "GPS não configurado",
      severity: "info",
      missing: !p.gps?.enabled,
      tip: "Se desejar incorporar coordenadas GPS nas fotos, ative a opção GPS nas regras do lote e preencha Latitude/Longitude no perfil do cliente.",
    },
  ];

  const issues = checks.filter((c) => c.missing);
  if (issues.length === 0) {
    el.innerHTML = `<div class="warnBanner warnSuccess">✅ Perfil completo — todos os dados para SEO estão preenchidos.</div>`;
    return;
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warns  = issues.filter((i) => i.severity === "warn");
  const infos  = issues.filter((i) => i.severity === "info");

  let html = `<div class="warnBanner warnPanel">`;
  html += `<div class="warnHeader">⚠️ ${issues.length} campo(s) faltando para metadados completos</div>`;
  html += `<ul class="warnList">`;
  for (const issue of [...errors, ...warns, ...infos]) {
    const icon = issue.severity === "error" ? "🔴" : issue.severity === "warn" ? "🟡" : "🔵";
    html += `<li class="warnItem warnItem--${issue.severity}"><span>${icon} <strong>${issue.label}</strong></span><span class="warnTip">${issue.tip}</span></li>`;
  }
  html += `</ul>`;
  if (errors.length > 0) {
    html += `<div class="warnAction"><button class="btn" onclick="document.getElementById('btnEditClient').click()">✏️ Editar perfil do cliente agora</button></div>`;
  }
  html += `</div>`;
  el.innerHTML = html;
}

function renderPhotosList(files) {
  els.photosList.innerHTML = "";
  if (!files || files.length === 0) {
    els.photosList.textContent = "Nenhuma foto selecionada.";
    return;
  }
  for (const f of files) {
    const row = document.createElement("div");
    row.className = "listItem";
    const left = document.createElement("div");
    left.textContent = f.name;
    const right = document.createElement("div");
    right.className = "muted";
    right.textContent = `${Math.round(f.size / 1024)} KB`;
    row.appendChild(left);
    row.appendChild(right);
    els.photosList.appendChild(row);
  }
}

function fillClientDialog(client) {
  const c = client || {};
  const p = c.profile || {};
  els.clientName.value = c.name || "";
  els.clientPrimaryCategory.value = p.primaryCategory || "";
  els.clientBusinessName.value = p.businessName || "";
  els.clientNeighborhood.value = p.neighborhood || "";
  els.clientCity.value = p.city || "";
  els.clientState.value = p.state || "";
  els.clientAddress.value = p.address || "";
  els.clientLat.value = p.gps?.enabled ? p.gps.latitude : "";
  els.clientLon.value = p.gps?.enabled ? p.gps.longitude : "";
  els.clientServices.value = Array.isArray(p.services) ? p.services.join("\n") : "";
  els.clientKeywords.value = Array.isArray(p.keywords) ? p.keywords.join(", ") : "";
  els.clientDoNotUse.value = Array.isArray(p.doNotUse) ? p.doNotUse.join(", ") : "";
  els.clientTone.value = p.tone || "";
  els.clientBriefing.value = c.briefingText || "";
}

function readClientDialog() {
  const name = els.clientName.value.trim();
  const profile = {
    primaryCategory: els.clientPrimaryCategory.value.trim(),
    businessName: els.clientBusinessName.value.trim(),
    neighborhood: els.clientNeighborhood.value.trim(),
    city: els.clientCity.value.trim(),
    state: els.clientState.value.trim(),
    address: els.clientAddress.value.trim(),
    services: splitLines(els.clientServices.value),
    keywords: splitCsv(els.clientKeywords.value),
    doNotUse: splitCsv(els.clientDoNotUse.value),
    tone: els.clientTone.value.trim(),
    gps: {
      enabled: Boolean(els.clientLat.value && els.clientLon.value),
      latitude: Number(els.clientLat.value || 0),
      longitude: Number(els.clientLon.value || 0),
    },
  };
  const briefingText = els.clientBriefing.value || "";
  return { name, profile, briefingText, settings: {} };
}

async function refresh() {
  const health = await api("/api/health");
  const provider = health?.ai?.provider || "gemini";
  const effectivePresent = Boolean(health?.ai?.effective?.present);
  const label = provider === "openai" ? "OpenAI" : "Gemini";
  els.apiKeyStatus.textContent = effectivePresent ? `IA: ${label} pronta` : `IA: ${label} sem chave`;
  if (els.providerSelect) els.providerSelect.value = provider;

  if (els.geminiKeyInput) {
    if (health?.ai?.gemini?.present) {
      els.geminiKeyInput.placeholder = "Chave configurada (••••••••)";
    } else {
      els.geminiKeyInput.placeholder = "Cole sua chave aqui";
    }
  }
  if (els.openaiKeyInput) {
    if (health?.ai?.openai?.present) {
      els.openaiKeyInput.placeholder = "Chave configurada (••••••••)";
    } else {
      els.openaiKeyInput.placeholder = "Cole sua chave aqui";
    }
  }

  const { clients } = await api("/api/clients");
  state.clients = clients || [];
  if (!state.selectedClientId && state.clients.length) state.selectedClientId = state.clients[0].id;
  renderClients();
}

els.clientSelect.addEventListener("change", () => {
  state.selectedClientId = els.clientSelect.value;
  renderClientSummary();
});

els.photosInput.addEventListener("change", () => {
  renderPhotosList(els.photosInput.files);
});

els.btnSaveProvider.addEventListener("click", async () => {
  try {
    els.btnSaveProvider.disabled = true;
    const provider = els.providerSelect.value;
    await api("/api/settings/provider", { method: "POST", body: { provider } });
    await refresh();
  } catch (e) {
    alert(e.message);
  } finally {
    els.btnSaveProvider.disabled = false;
  }
});

els.btnSaveGeminiKey.addEventListener("click", async () => {
  try {
    els.btnSaveGeminiKey.disabled = true;
    const apiKey = els.geminiKeyInput.value.trim();
    await api("/api/settings/geminiKey", { method: "POST", body: { apiKey } });
    els.geminiKeyInput.value = "";
    await refresh();
  } catch (e) {
    alert(e.message);
  } finally {
    els.btnSaveGeminiKey.disabled = false;
  }
});

els.btnSaveOpenAIKey.addEventListener("click", async () => {
  try {
    els.btnSaveOpenAIKey.disabled = true;
    const apiKey = els.openaiKeyInput.value.trim();
    await api("/api/settings/openaiKey", { method: "POST", body: { apiKey } });
    els.openaiKeyInput.value = "";
    await refresh();
  } catch (e) {
    alert(e.message);
  } finally {
    els.btnSaveOpenAIKey.disabled = false;
  }
});

els.btnNewClient.addEventListener("click", () => {
  state.editingClientId = null;
  els.clientDialogTitle.textContent = "Novo cliente";
  fillClientDialog(null);
  els.extractStatus.textContent = "";
  els.clientDialog.showModal();
});

els.btnEditClient.addEventListener("click", () => {
  const c = state.clients.find((x) => x.id === state.selectedClientId);
  if (!c) return alert("Selecione um cliente.");
  state.editingClientId = c.id;
  els.clientDialogTitle.textContent = "Editar cliente";
  fillClientDialog(c);
  els.extractStatus.textContent = "";
  els.clientDialog.showModal();
});

els.btnDeleteClient.addEventListener("click", async () => {
  const c = state.clients.find((x) => x.id === state.selectedClientId);
  if (!c) return alert("Selecione um cliente.");
  if (!confirm(`Excluir \"${c.name}\"?`)) return;
  try {
    await api(`/api/clients/${c.id}`, { method: "DELETE" });
    state.selectedClientId = "";
    await refresh();
  } catch (e) {
    alert(e.message);
  }
});

els.btnExtractBriefing.addEventListener("click", async () => {
  const briefingText = els.clientBriefing.value || "";
  if (!briefingText.trim()) return alert("Cole o briefing primeiro.");

  try {
    els.btnExtractBriefing.disabled = true;
    els.extractStatus.textContent = "Extraindo…";
    const { extracted } = await api("/api/ai/extractProfile", { method: "POST", body: { briefingText } });

    els.clientPrimaryCategory.value = extracted.primaryCategory || "";
    els.clientBusinessName.value = extracted.businessName || "";
    els.clientNeighborhood.value = extracted.neighborhood || "";
    els.clientCity.value = extracted.city || "";
    els.clientState.value = extracted.state || "";
    els.clientAddress.value = extracted.address || "";
    els.clientServices.value = Array.isArray(extracted.services) ? extracted.services.join("\n") : "";
    els.clientKeywords.value = Array.isArray(extracted.keywords) ? extracted.keywords.join(", ") : "";
    els.clientDoNotUse.value = Array.isArray(extracted.doNotUse) ? extracted.doNotUse.join(", ") : "";
    els.clientTone.value = extracted.tone || "";
    if (extracted.gps?.enabled) {
      els.clientLat.value = extracted.gps.latitude;
      els.clientLon.value = extracted.gps.longitude;
    }

    els.extractStatus.textContent = "Pronto.";
  } catch (e) {
    els.extractStatus.textContent = "";
    alert(e.message);
  } finally {
    els.btnExtractBriefing.disabled = false;
  }
});

els.btnSaveClient.addEventListener("click", async (ev) => {
  ev.preventDefault();
  const payload = readClientDialog();
  if (!payload.name) return alert("Informe o nome do cliente.");
  try {
    els.btnSaveClient.disabled = true;
    if (state.editingClientId) {
      await api(`/api/clients/${state.editingClientId}`, { method: "PUT", body: payload });
      state.selectedClientId = state.editingClientId;
    } else {
      const { client } = await api("/api/clients", { method: "POST", body: payload });
      state.selectedClientId = client.id;
    }
    els.clientDialog.close();
    await refresh();
  } catch (e) {
    alert(e.message);
  } finally {
    els.btnSaveClient.disabled = false;
  }
});

els.btnRun.addEventListener("click", async () => {
  const clientId = state.selectedClientId;
  if (!clientId) return alert("Selecione um cliente.");
  const files = els.photosInput.files;
  if (!files || files.length === 0) return alert("Selecione as fotos.");

  const options = {
    ai: { analyzePhotos: Boolean(els.optAnalyzePhotos.checked) },
    writeMetadata: Boolean(els.optWriteMetadata.checked),
    renameFiles: true,
    gps: { enabled: Boolean(els.optGpsEnabled.checked) },
  };
  const extraInstructions = els.extraInstructions.value || "";

  const fd = new FormData();
  fd.append("clientId", clientId);
  fd.append("options", JSON.stringify(options));
  fd.append("extraInstructions", extraInstructions);
  for (const f of files) fd.append("photos", f, f.name);

  try {
    els.btnRun.disabled = true;
    els.runStatus.textContent = "Processando… (pode demorar)";

    const resp = await fetch("/api/process", { method: "POST", body: fd });
    if (!resp.ok) {
      const json = await resp.json().catch(() => ({}));
      throw new Error(json?.error || "Falha no processamento.");
    }
    const blob = await resp.blob();
    const cd = resp.headers.get("content-disposition") || "";
    const m = /filename=\"([^\"]+)\"/.exec(cd);
    const filename = m ? m[1] : "resultado.zip";

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    els.runStatus.textContent = "Pronto. Baixando .zip…";
  } catch (e) {
    els.runStatus.textContent = "";
    alert(e.message);
  } finally {
    els.btnRun.disabled = false;
    setTimeout(() => (els.runStatus.textContent = ""), 2500);
  }
});

refresh().catch((e) => alert(e.message));
