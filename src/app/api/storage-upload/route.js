import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdmin, storageConfigured, uploadStorageObjectFromDataUrl } from "@/utils/store-db";

function cleanText(value, limit = 200) {
  return String(value || "").trim().slice(0, limit);
}

export async function POST(request) {
  try {
    if (!storageConfigured()) {
      return NextResponse.json({ message: "Supabase storage is not configured." }, { status: 501 });
    }

    const body = await request.json().catch(() => ({}));
    const kind = cleanText(body.kind, 40);
    const fileName = cleanText(body.fileName, 160)
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9._-]/gi, "")
      .toLowerCase();
    const dataUrl = body.dataUrl;

    if (!dataUrl || !fileName) {
      return NextResponse.json({ message: "الصورة غير مكتملة." }, { status: 400 });
    }

    if (kind === "product") {
      const adminCheck = requireAdmin(request);
      if (!adminCheck.authorized) {
        return NextResponse.json({ message: adminCheck.message }, { status: adminCheck.status });
      }

      const path = `products/${Date.now()}-${randomUUID()}-${fileName}`;
      const uploaded = await uploadStorageObjectFromDataUrl({
        bucket: "product-images",
        path,
        dataUrl,
      });

      return NextResponse.json(uploaded);
    }

    return NextResponse.json({ message: "نوع الرفع غير مدعوم." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Upload error" }, { status: 500 });
  }
}
