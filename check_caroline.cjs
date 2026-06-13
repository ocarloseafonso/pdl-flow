const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    env[line.substring(0, idx).trim()] = line.substring(idx + 1).replace(/"/g, '').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL || "https://vntfebxbsipumjswimmo.supabase.co";
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Busca todos os clientes para ver quem está lá
  const { data: all, error: allErr } = await supabase
    .from('clients')
    .select('id, name, briefing_token, briefing_submitted_at, updated_at')
    .order('name');

  if (allErr) {
    console.error("Erro ao listar clientes:", allErr.message);
    return;
  }

  console.log("=== TODOS OS CLIENTES ===");
  all.forEach(c => {
    console.log(`Nome: ${c.name} | Token: ${c.briefing_token} | Submitted: ${c.briefing_submitted_at || 'VAZIO'}`);
  });

  // Busca Caroline especificamente
  const caroline = all.find(c => c.name.toLowerCase().includes('caroline'));
  if (!caroline) {
    console.log("\n Caroline não encontrada no banco!");
    return;
  }

  console.log("\n=== DADOS DA CAROLINE ===");
  console.log("ID:", caroline.id);
  console.log("Token:", caroline.briefing_token);

  const { data, error } = await supabase
    .from('clients')
    .select('briefing_data')
    .eq('id', caroline.id)
    .single();

  if (error) {
    console.error("Erro:", error.message);
    return;
  }

  console.log("briefing_data:", JSON.stringify(data.briefing_data, null, 2));
}

run();
