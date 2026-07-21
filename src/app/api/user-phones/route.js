import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/utils/server-auth";

function isServiceRoleKey(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8"))?.role === "service_role";
  } catch {
    return false;
  }
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key || !isServiceRoleKey(key)) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function cleanText(value, limit = 120) {
  return String(value || "").trim().slice(0, limit);
}

function cleanDesignKey(value) {
  return ["pro", "dual", "triple", "ultra"].includes(value) ? value : "triple";
}

export async function GET(request) {
  const user = await getAuthenticatedUser(request);
  const client = getAdminClient();

  if (!user) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  if (!client) return NextResponse.json({ message: "A valid Supabase service role key is required on the server." }, { status: 503 });

  const { data, error } = await client
    .from("user_phones")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ phones: data || [] });
}

export async function POST(request) {
  const user = await getAuthenticatedUser(request);
  const client = getAdminClient();

  if (!user) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  if (!client) return NextResponse.json({ message: "A valid Supabase service role key is required on the server." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const phone = {
    user_id: user.id,
    phone_name: cleanText(body.phone_name, 80),
    brand: cleanText(body.brand, 80),
    model: cleanText(body.model, 120),
    design_key: cleanDesignKey(body.design_key),
  };

  if (!phone.phone_name || !phone.brand || !phone.model) {
    return NextResponse.json({ message: "Phone name, brand, and model are required." }, { status: 400 });
  }

  const { data, error } = await client
    .from("user_phones")
    .insert(phone)
    .select("*")
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ phone: data }, { status: 201 });
}

export async function PATCH(request) {
  const user = await getAuthenticatedUser(request);
  const client = getAdminClient();

  if (!user) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  if (!client) return NextResponse.json({ message: "A valid Supabase service role key is required on the server." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const id = cleanText(body.id, 80);
  const phone = {
    phone_name: cleanText(body.phone_name, 80),
    brand: cleanText(body.brand, 80),
    model: cleanText(body.model, 120),
    design_key: cleanDesignKey(body.design_key),
  };

  if (!id) return NextResponse.json({ message: "Phone id is required." }, { status: 400 });
  if (!phone.phone_name || !phone.brand || !phone.model) {
    return NextResponse.json({ message: "Phone name, brand, and model are required." }, { status: 400 });
  }

  const { data, error } = await client
    .from("user_phones")
    .update(phone)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ message: "Phone was not found." }, { status: 404 });
  return NextResponse.json({ phone: data });
}

export async function DELETE(request) {
  const user = await getAuthenticatedUser(request);
  const client = getAdminClient();

  if (!user) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  if (!client) return NextResponse.json({ message: "A valid Supabase service role key is required on the server." }, { status: 503 });

  const id = cleanText(new URL(request.url).searchParams.get("id"), 80);
  if (!id) return NextResponse.json({ message: "Phone id is required." }, { status: 400 });

  const { data, error } = await client
    .from("user_phones")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ message: "Phone was not found." }, { status: 404 });
  return NextResponse.json({ id: data.id });
}
