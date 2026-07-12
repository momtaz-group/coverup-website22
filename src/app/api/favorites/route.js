import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/utils/server-auth";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });

  const client = getAdminClient();
  if (!client) return NextResponse.json({ message: "Supabase client not configured." }, { status: 500 });

  // Get favorites
  const { data: favs, error: favsError } = await client
    .from("favorites")
    .select("product_id")
    .eq("user_id", user.id);

  if (favsError) {
    return NextResponse.json({ message: favsError.message }, { status: 500 });
  }

  if (!favs || favs.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const productIds = favs.map(f => f.product_id);

  // Fetch full details of products
  // We can query public.products for these IDs
  // Since postgrest allows in.() filtering:
  const { data: products, error: prodError } = await client
    .from("products")
    .select("*")
    .in("id", productIds);

  if (prodError) {
    return NextResponse.json({ message: prodError.message }, { status: 500 });
  }

  return NextResponse.json({ products: products || [] });
}

export async function POST(request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });

  const client = getAdminClient();
  if (!client) return NextResponse.json({ message: "Supabase client not configured." }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const { productId } = body;
  if (!productId) return NextResponse.json({ message: "Product ID is required." }, { status: 400 });

  const { data, error } = await client
    .from("favorites")
    .upsert({ user_id: user.id, product_id: productId }, { onConflict: "user_id,product_id" })
    .select("*");

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

export async function DELETE(request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ message: "Authentication is required." }, { status: 401 });

  const client = getAdminClient();
  if (!client) return NextResponse.json({ message: "Supabase client not configured." }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");

  if (!productId) return NextResponse.json({ message: "Product ID is required." }, { status: 400 });

  const { error } = await client
    .from("favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("product_id", productId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
