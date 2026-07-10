import { NextResponse } from "next/server";
import {
  createVerifiedReview,
  getPublicProductReviews,
  supabaseConfigured,
} from "@/utils/store-db";

function cleanText(value, limit = 500) {
  return String(value || "").trim().slice(0, limit);
}

export async function GET(request) {
  try {
    if (!supabaseConfigured(true)) {
      return NextResponse.json({ message: "Supabase service role is not configured." }, { status: 501 });
    }

    const { searchParams } = new URL(request.url);
    const productId = cleanText(searchParams.get("productId"), 120);

    const reviews = await getPublicProductReviews(productId);
    return NextResponse.json({ reviews });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!supabaseConfigured(true)) {
      return NextResponse.json({ message: "Supabase service role is not configured." }, { status: 501 });
    }

    const body = await request.json().catch(() => ({}));
    const review = await createVerifiedReview({
      orderId: cleanText(body.orderId, 120),
      productId: cleanText(body.productId, 120),
      phone: cleanText(body.phone, 60),
      rating: body.rating,
      message: cleanText(body.message, 1000),
    });

    return NextResponse.json({ review });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Review error" }, { status: 400 });
  }
}
