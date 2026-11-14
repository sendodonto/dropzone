#!/usr/bin/env node
// Grants the admin role to an existing account. Server-side only.
// Usage: npm run admin:grant -- someone@example.com
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment
// (e.g. `node --env-file=.env.local scripts/grant-admin.mjs ...`). The service key
// never ships to the browser and is not used by the web app.
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  console.error("Uso: npm run admin:grant -- email@dominio.com");
  process.exit(1);
}
if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (.env.local).");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await supabase.rpc("bootstrap_admin", { p_email: email });
if (error) {
  console.error("Falhou:", error.message);
  process.exit(1);
}
console.log(`Administrador concedido ao usuário ${data}.`);
