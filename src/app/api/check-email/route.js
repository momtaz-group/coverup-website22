import { NextResponse } from "next/server";
import { findCustomerBy } from "@/utils/store-db";
import { getSupabaseServerClient } from "@/utils/supabase";

async function findAuthUserByEmail(email) {
  const adminClient = getSupabaseServerClient();
  const perPage = 1000;
  let page = 1;

  while (page <= 50) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data?.users || [];
    const foundUser = users.find(
      (user) => String(user.email || "").toLowerCase() === email
    );

    if (foundUser || users.length < perPage) {
      return foundUser || null;
    }

    page += 1;
  }

  return null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { exists: false, message: "البريد الإلكتروني مطلوب" },
        { status: 400 }
      );
    }

    let exists = false;
    let confirmed = false;
    let name = "";

    try {
      const foundUser = await findAuthUserByEmail(email);
      if (foundUser) {
        exists = true;
        confirmed = Boolean(foundUser.email_confirmed_at || foundUser.confirmed_at);
        name = foundUser.user_metadata?.name || foundUser.user_metadata?.full_name || "";
      }
    } catch (authErr) {
      return NextResponse.json(
        {
          exists: false,
          email,
          error: authErr.message,
          message: "لا يمكن التحقق من حسابات Supabase Auth بدون SUPABASE_SERVICE_ROLE_KEY صحيح.",
        },
        { status: 501 }
      );
    }

    if (exists) {
      try {
        const profile = await findCustomerBy("email", email, false);
        if (profile?.name) {
          name = profile.name;
        }
      } catch (profileErr) {
        // Auth is authoritative. Ignore profile lookup errors here.
      }
    }

    return NextResponse.json({
      exists,
      confirmed,
      email,
      name,
      message: exists
        ? confirmed
          ? "هذا البريد الإلكتروني مسجل ومؤكد بالفعل."
          : "هذا البريد الإلكتروني مسجل وينتظر التأكيد."
        : "هذا البريد الإلكتروني غير مسجل بعد.",
    });
  } catch (error) {
    return NextResponse.json(
      { exists: false, error: error.message },
      { status: 500 }
    );
  }
}
