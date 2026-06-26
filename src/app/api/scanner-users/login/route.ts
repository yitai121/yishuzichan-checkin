import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { verifyPassword } from "@/lib/password";
import { sanitizeString } from "@/lib/validation";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { randomUUID } from "crypto";

// POST /api/scanner-users/login - Login for scanner users
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);
    const rateLimitResult = checkRateLimit(`scanner-login:${ip}`, 10, 60000); // 10 attempts per minute
    if (!rateLimitResult.allowed) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { success: false, error: "登录尝试过于频繁，请稍后再试" },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const supabase = getSupabaseClient();
    const body = await request.json();
    const { username, password } = body;

    const cleanUsername = sanitizeString(username, 50);
    if (!cleanUsername) {
      return NextResponse.json({ success: false, error: "请输入用户名" }, { status: 400 });
    }

    if (typeof password !== 'string' || !password) {
      return NextResponse.json({ success: false, error: "请输入密码" }, { status: 400 });
    }

    // Find user
    const { data: user, error } = await supabase
      .from("scanner_users")
      .select("id, username, password_hash, is_active")
      .eq("username", cleanUsername)
      .single();

    if (error || !user) {
      return NextResponse.json({ success: false, error: "用户名或密码错误" }, { status: 401 });
    }

    if (!user.is_active) {
      return NextResponse.json({ success: false, error: "账号已被禁用" }, { status: 403 });
    }

    // Verify password
    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ success: false, error: "用户名或密码错误" }, { status: 401 });
    }

    // Generate session token (single device login - invalidates any previous session)
    const sessionToken = randomUUID();
    await supabase
      .from("scanner_users")
      .update({ session_token: sessionToken })
      .eq("id", user.id);

    // Return user info with session token
    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        sessionToken,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
