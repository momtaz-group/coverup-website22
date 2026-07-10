import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rdxkrmcegrlgixnciyzz.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkeGtybWNlZ3JsZ2l4bmNpeXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMTk3ODMsImV4cCI6MjA5ODU5NTc4M30.oD9mNx2kZZ_wc2lR7oiHWd1LS3z11NNxbLCD42CKea4";

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

function jwtRole(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded?.role || "";
  } catch {
    return "";
  }
}

export function hasServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
  return Boolean(key && jwtRole(key) === "service_role");
}

export function getSupabaseServerClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://rdxkrmcegrlgixnciyzz.supabase.co";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
  
  if (!url || !serviceKey) {
    throw new Error("Supabase URL or Service Key is missing in server environment variables");
  }

  if (!hasServiceRoleKey()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY must be a real service_role key, not the public anon key.");
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
