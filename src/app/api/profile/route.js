import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/utils/server-auth";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key || !isServiceRoleKey(key)) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function isServiceRoleKey(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(payload, "base64").toString("utf8"))?.role === "service_role";
  } catch {
    return false;
  }
}

function cleanText(value, limit = 160) {
  return String(value || "").trim().slice(0, limit);
}

function isMissingProfilesTable(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("could not find the table 'public.profiles'") || message.includes("relation \"profiles\" does not exist");
}

function normalizeLocations(value) {
  if (!Array.isArray(value)) return [];
  const locations = value.slice(0, 3).map((item, index) => ({
    id: cleanText(item?.id, 80) || `location-${index + 1}`,
    label: cleanText(item?.label, 60) || `Address ${index + 1}`,
    recipientName: cleanText(item?.recipientName, 120),
    address1: cleanText(item?.address1, 180),
    address2: cleanText(item?.address2, 180),
    city: cleanText(item?.city, 100),
    state: cleanText(item?.state, 100),
    postalCode: cleanText(item?.postalCode, 30),
    phone: cleanText(item?.phone, 40),
    notes: cleanText(item?.notes, 180),
    isDefault: Boolean(item?.isDefault),
  }));
  const defaultIndex = locations.findIndex((item) => item.isDefault);
  if (locations.length && defaultIndex === -1) locations[0].isDefault = true;
  if (defaultIndex > -1) {
    locations.forEach((item, index) => {
      item.isDefault = index === defaultIndex;
    });
  }
  return locations;
}

function publicProfile(profile, user) {
  return {
    id: user.id,
    name: profile?.full_name || user.user_metadata?.name || "",
    email: user.email || profile?.email || "",
    phone: profile?.phone || user.user_metadata?.phone || "",
    location: normalizeLocations(profile?.location),
    roles: profile?.roles || "user",
  };
}

async function ensureProfileRow(client, user) {
  const payload = {
    id: user.id,
    email: user.email || "",
    full_name: cleanText(user.user_metadata?.name || user.user_metadata?.full_name, 120),
  };
  const { data, error } = await client
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();
  return { data, error };
}

export async function GET(request) {
  const user = await getAuthenticatedUser(request);
  const client = getAdminClient();
  if (!user) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  if (!client) return NextResponse.json({ message: "A valid Supabase service role key is required on the server." }, { status: 503 });

  const { data: profile, error } = await client.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) {
    if (isMissingProfilesTable(error)) {
      return NextResponse.json({
        profile: publicProfile(null, user),
        setupRequired: true,
        message: "Profile table is missing.",
      }, { status: 200 });
    }
    return NextResponse.json({ message: "حدث خطأ أثناء جلب البيانات." }, { status: 500 });
  }
  if (!profile) {
    const created = await ensureProfileRow(client, user);
    if (created.error) return NextResponse.json({ message: "حدث خطأ أثناء إنشاء الحساب." }, { status: 500 });
    return NextResponse.json({ profile: publicProfile(created.data, user) });
  }
  return NextResponse.json({ profile: publicProfile(profile, user) });
}

export async function PATCH(request) {
  const user = await getAuthenticatedUser(request);
  const client = getAdminClient();
  if (!user) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });
  if (!client) return NextResponse.json({ message: "A valid Supabase service role key is required on the server." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const updates = {};
  if (Object.prototype.hasOwnProperty.call(body, "name")) updates.full_name = cleanText(body.name, 120);
  if (Object.prototype.hasOwnProperty.call(body, "location")) updates.location = normalizeLocations(body.location);
  if (Object.prototype.hasOwnProperty.call(body, "phone")) updates.phone = cleanText(body.phone, 40);
  if (!Object.keys(updates).length) return NextResponse.json({ message: "No profile changes supplied." }, { status: 400 });

  const { data: profile, error } = await client
    .from("profiles")
    .upsert({ id: user.id, email: user.email, ...updates }, { onConflict: "id" })
    .select("*")
    .single();
  if (error) {
    if (isMissingProfilesTable(error)) {
      return NextResponse.json({
        message: "Profile table is missing.",
      }, { status: 503 });
    }
    return NextResponse.json({ message: "حدث خطأ أثناء حفظ البيانات." }, { status: 500 });
  }
  return NextResponse.json({ profile: publicProfile(profile, user) });
}
