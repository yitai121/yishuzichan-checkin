import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP, rateLimitKey } from '@/lib/rate-limit';

// 管理后台密码
const ADMIN_PASSWORD = 'etheric111';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: max 5 login attempts per minute per IP
    const ip = getClientIP(request);
    const rl = checkRateLimit(rateLimitKey(ip, 'admin-login'), 5, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: '登录尝试过于频繁，请60秒后再试' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const body = await request.json();
    const { password } = body as { password?: string };

    if (!password || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, error: '密码错误' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: '登录失败' },
      { status: 500 }
    );
  }
}
