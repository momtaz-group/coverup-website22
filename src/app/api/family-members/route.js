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

function cleanNullableId(value) {
  const id = cleanText(value, 80);
  return id || null;
}

function cleanRelationship(value) {
  const allowed = new Set(["me", "father", "mother", "wife", "husband", "son", "daughter", "sister", "brother", "grandfather", "grandmother", "friend", "other"]);
  return allowed.has(value) ? value : "other";
}

function cleanAvatarKey(value) {
  const allowed = new Set(["me", "father", "mother", "wife", "sister", "brother", "friend", "other"]);
  return allowed.has(value) ? value : "other";
}

async function userOwnsPhone(client, userId, phoneId) {
  if (!phoneId) return true;
  const { data, error } = await client
    .from("user_phones")
    .select("id")
    .eq("id", phoneId)
    .eq("user_id", userId)
    .maybeSingle();
  return !error && Boolean(data);
}

async function selectMember(client, userId, id) {
  const { data, error } = await client
    .from("family_members")
    .select("*, phone:user_phones(id, phone_name, brand, model, design_key)")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  return { data, error };
}

export async function GET(request) {
  const user = await getAuthenticatedUser(request);
  const client = getAdminClient();

  if (!user) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  if (!client) return NextResponse.json({ message: "A valid Supabase service role key is required on the server." }, { status: 503 });

  const { data, error } = await client
    .from("family_members")
    .select("*, phone:user_phones(id, phone_name, brand, model, design_key)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ members: data || [] });
}

export async function POST(request) {
  const user = await getAuthenticatedUser(request);
  const client = getAdminClient();

  if (!user) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  if (!client) return NextResponse.json({ message: "A valid Supabase service role key is required on the server." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const phoneId = cleanNullableId(body.phone_id);
  if (!(await userOwnsPhone(client, user.id, phoneId))) {
    return NextResponse.json({ message: "Linked phone was not found." }, { status: 404 });
  }

  const member = {
    user_id: user.id,
    phone_id: phoneId,
    display_name: cleanText(body.display_name, 80),
    relationship: cleanRelationship(body.relationship),
    avatar_key: cleanAvatarKey(body.avatar_key || body.relationship),
    notes: cleanText(body.notes, 500) || null,
  };

  if (!member.display_name) {
    return NextResponse.json({ message: "Family member name is required." }, { status: 400 });
  }

  const { data, error } = await client
    .from("family_members")
    .insert(member)
    .select("id")
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  const selected = await selectMember(client, user.id, data.id);
  if (selected.error) return NextResponse.json({ message: selected.error.message }, { status: 500 });
  return NextResponse.json({ member: selected.data }, { status: 201 });
}

export async function PATCH(request) {
  const user = await getAuthenticatedUser(request);
  const client = getAdminClient();

  if (!user) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  if (!client) return NextResponse.json({ message: "A valid Supabase service role key is required on the server." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const id = cleanText(body.id, 80);
  const phoneId = cleanNullableId(body.phone_id);

  if (!id) return NextResponse.json({ message: "Family member id is required." }, { status: 400 });
  if (!(await userOwnsPhone(client, user.id, phoneId))) {
    return NextResponse.json({ message: "Linked phone was not found." }, { status: 404 });
  }

  const member = {
    phone_id: phoneId,
    display_name: cleanText(body.display_name, 80),
    relationship: cleanRelationship(body.relationship),
    avatar_key: cleanAvatarKey(body.avatar_key || body.relationship),
    notes: cleanText(body.notes, 500) || null,
  };

  if (!member.display_name) {
    return NextResponse.json({ message: "Family member name is required." }, { status: 400 });
  }

  const { data, error } = await client
    .from("family_members")
    .update(member)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ message: "Family member was not found." }, { status: 404 });

  const selected = await selectMember(client, user.id, data.id);
  if (selected.error) return NextResponse.json({ message: selected.error.message }, { status: 500 });
  return NextResponse.json({ member: selected.data });
}

export async function DELETE(request) {
  const user = await getAuthenticatedUser(request);
  const client = getAdminClient();

  if (!user) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  if (!client) return NextResponse.json({ message: "A valid Supabase service role key is required on the server." }, { status: 503 });

  const id = cleanText(new URL(request.url).searchParams.get("id"), 80);
  if (!id) return NextResponse.json({ message: "Family member id is required." }, { status: 400 });

  const { data, error } = await client
    .from("family_members")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ message: "Family member was not found." }, { status: 404 });
  return NextResponse.json({ id: data.id });
}
