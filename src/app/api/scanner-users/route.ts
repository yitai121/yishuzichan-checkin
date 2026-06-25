import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { hashPassword } from "@/lib/password";
import { sanitizeString } from "@/lib/validation";

// GET /api/scanner-users - List all scanner users
export async function GET() {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("scanner_users")
      .select("id, username, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/scanner-users - Create a scanner user
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { username, password } = body;

    // Validate username
    const cleanUsername = sanitizeString(username, 50);
    if (!cleanUsername) {
      return NextResponse.json({ success: false, error: "用户名不能为空" }, { status: 400 });
    }

    // Validate password
    if (typeof password !== 'string' || !password || password.length < 4) {
      return NextResponse.json({ success: false, error: "密码至少4位" }, { status: 400 });
    }

    // Check if username already exists
    const { data: existing } = await supabase
      .from("scanner_users")
      .select("id")
      .eq("username", cleanUsername)
      .single();

    if (existing) {
      return NextResponse.json({ success: false, error: "用户名已存在" }, { status: 409 });
    }

    // Hash password and create user
    const passwordHash = hashPassword(password);

    const { data, error } = await supabase
      .from("scanner_users")
      .insert({
        username: cleanUsername,
        password_hash: passwordHash,
        is_active: true,
      })
      .select("id, username, is_active, created_at")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
