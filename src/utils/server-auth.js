import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export async function getAuthenticatedUser(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey && request?.cookies?.getAll) {
    const cookieClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data: { user } } = await cookieClient.auth.getUser();
    if (user) return user;
  }

  const authHeader = request.headers.get("Authorization") || request.headers.get("authorization");
  if (!authHeader) return null;

  const token = authHeader.split(" ")[1];
  if (!token) return null;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: { user }, error } = await client.auth.getUser(token);
  if (error || !user) {
    return null;
  }
  return user;
}

export async function getAuthenticatedCustomer(request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  const client = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: customer } = await client
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return customer
    ? {
        ...customer,
        name: customer.full_name || customer.name || "",
        email_verified_at: customer.email_confirmed_at || customer.email_verified_at,
      }
    : null;
}
