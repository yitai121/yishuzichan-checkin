import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body as { password?: string };
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (password === adminPassword) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: '密码错误' }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: '请求失败' }, { status: 500 });
  }
}
