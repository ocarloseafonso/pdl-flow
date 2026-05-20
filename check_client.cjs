const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts[1].replace(/"/g, '').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL || "https://vntfebxbsipumjswimmo.supabase.co";
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('clients')
    .select('briefing_data')
    .eq('id', '7f729f9d-15cd-4e20-a893-20c711da355d')
    .single();

  if (error) {
    console.error("Error fetching client:", error);
    return;
  }

  console.log("BRIEFING DATA KEYS AND VALUES:");
  console.log(JSON.stringify(data.briefing_data, null, 2));
}

run();
