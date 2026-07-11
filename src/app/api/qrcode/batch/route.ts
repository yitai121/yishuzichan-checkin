import { NextRequest, NextResponse } from 'next/server';
import { generateQRToken } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { attendees } = body as {
      attendees: Array<{ id: string; signin_code: string }>;
    };

    if (!attendees || !Array.isArray(attendees)) {
      return NextResponse.json({ success: false, error: '参数无效' }, { status: 400 });
    }

    // Generate encrypted tokens for all attendees
    const tokens: Record<string, string> = {};
    for (const a of attendees) {
      if (a.id && a.signin_code) {
        tokens[a.id] = generateQRToken(a.signin_code, a.id);
      }
    }

    return NextResponse.json({
      success: true,
      data: { tokens },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '生成失败';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
