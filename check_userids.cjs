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

// Usar a service role key se disponível, ou a anon key
const supabaseKey = env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Busca o user_id de um cliente que já existe corretamente (Jaqueline)
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, user_id, briefing_token')
    .order('name');

  if (error) {
    console.error("Erro:", error.message);
    return;
  }

  console.log("=== USER_IDs DOS CLIENTES ===");
  data.forEach(c => {
    console.log(`${c.name} | user_id: ${c.user_id} | token: ${c.briefing_token}`);
  });
}

run();
