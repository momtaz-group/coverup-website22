import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/utils/store-db";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { rateLimit } from "@/utils/rate-limit";

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB

function cleanText(value, limit = 200) {
  return String(value || "").trim().slice(0, limit);
}

export async function POST(request) {
  try {
    // Rate limit: max 20 uploads per minute per IP
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    if (!rateLimit(`upload:${ip}`, { maxRequests: 20, windowMs: 60000 })) {
      return NextResponse.json({ message: "تم تجاوز الحد المسموح من الرفع. يرجى المحاولة لاحقاً." }, { status: 429 });
    }

    const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL } = process.env;
    
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      return NextResponse.json({ message: "Cloudflare R2 is not configured in environment variables." }, { status: 501 });
    }

    const s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });

    const body = await request.json().catch(() => ({}));
    const kind = cleanText(body.kind, 40);
    const productName = cleanText(body.productName, 100).replace(/\s+/g, "-").replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "coverup";
    const dataUrl = body.dataUrl;

    if (!dataUrl) {
      return NextResponse.json({ message: "الصورة غير مكتملة." }, { status: 400 });
    }

    // Validate file size (check base64 size)
    const base64Size = Math.ceil((dataUrl.length * 3) / 4);
    if (base64Size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ message: "حجم الملف يتجاوز الحد المسموح (10MB)." }, { status: 413 });
    }

    if (kind === "product") {
      const adminCheck = requireAdmin(request);
      if (!adminCheck.authorized) {
        return NextResponse.json({ message: adminCheck.message }, { status: adminCheck.status });
      }

      // Convert Base64 to Buffer
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Process with sharp (convert to WebP, 80% quality)
      const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();

      const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}.webp`;
      const path = `${productName}/${fileName}`;
      const bucketName = R2_BUCKET_NAME || "coverup";

      try {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: path,
            Body: webpBuffer,
            ContentType: "image/webp",
          })
        );

        const publicUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL.replace(/\/$/, "")}/${path}` : `https://pub-${R2_ACCOUNT_ID}.r2.dev/${path}`;
        return NextResponse.json({ url: publicUrl, path });
      } catch (r2Error) {
        console.warn("R2 upload failed, falling back to local storage:", r2Error);
        
        const fs = require("node:fs");
        const pathModule = require("node:path");
        
        const uploadsDir = pathModule.join(process.cwd(), "public", "uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const localFileName = `${Date.now()}-${randomUUID().slice(0, 8)}.webp`;
        const localFilePath = pathModule.join(uploadsDir, localFileName);
        
        fs.writeFileSync(localFilePath, webpBuffer);
        
        const localUrl = `/uploads/${localFileName}`;
        return NextResponse.json({ url: localUrl, path: `local/${localFileName}`, note: "Fallback to local storage due to R2 upload failure." });
      }
    }

    if (kind === "payment") {
      const adminCheck = requireAdmin(request);
      if (!adminCheck.authorized) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const orderId = cleanText(body.orderId, 60).replace(/[^a-z0-9_-]/gi, "");
      const method = cleanText(body.method, 40).replace(/[^a-z0-9_-]/gi, "") || "generic";

      if (!orderId) {
        return NextResponse.json({ message: "رقم الطلب مطلوب لرفع صورة التحويل." }, { status: 400 });
      }

      // Convert Base64 to Buffer
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Process with sharp (convert to WebP, 80% quality)
      const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();

      const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}.webp`;
      const path = `payments/${method}/${orderId}/${fileName}`;
      const bucketName = R2_BUCKET_NAME || "coverup";

      try {
        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: path,
            Body: webpBuffer,
            ContentType: "image/webp",
          })
        );

        const publicUrl = R2_PUBLIC_URL ? `${R2_PUBLIC_URL.replace(/\/$/, "")}/${path}` : `https://pub-${R2_ACCOUNT_ID}.r2.dev/${path}`;
        return NextResponse.json({ url: publicUrl, path });
      } catch (r2Error) {
        console.warn("R2 payment upload failed, falling back to local storage:", r2Error);
        
        const fs = require("node:fs");
        const pathModule = require("node:path");
        
        // Save locally to public/uploads/payments/{method}/{orderId}
        const uploadsDir = pathModule.join(process.cwd(), "public", "uploads", "payments", method, orderId);
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const localFilePath = pathModule.join(uploadsDir, fileName);
        fs.writeFileSync(localFilePath, webpBuffer);
        
        const localUrl = `/uploads/payments/${method}/${orderId}/${fileName}`;
        return NextResponse.json({ url: localUrl, path: `local/${path}`, note: "Fallback to local storage due to R2 upload failure." });
      }
    }

    return NextResponse.json({ message: "نوع الرفع غير مدعوم." }, { status: 400 });
  } catch (error) {
    console.error("R2 Upload Error:", error);
    return NextResponse.json({ message: "حدث خطأ أثناء رفع الملف." }, { status: 500 });
  }
}
