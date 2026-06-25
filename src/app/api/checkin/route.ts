import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyQRToken } from '@/lib/crypto';
import { checkRateLimit, getClientIP, rateLimitKey } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: max 30 checkin attempts per minute per IP
    const ip = getClientIP(request);
    const rl = checkRateLimit(rateLimitKey(ip, 'checkin'), 30, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: '操作过于频繁，请稍后再试', type: 'rate_limited' },
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
    const { token, signin_code, meeting_id, device_info } = body as {
      token?: string;
      signin_code?: string;
      meeting_id?: string;
      device_info?: string;
    };

    if (!meeting_id?.trim()) {
      return NextResponse.json({ success: false, error: '未选择会议', type: 'invalid' }, { status: 400 });
    }

    let resolvedCode: string;
    let resolvedAttendeeId: string | null = null;

    // Priority 1: Encrypted token (from QR code)
    if (token?.trim()) {
      const payload = verifyQRToken(token.trim());
      if (!payload) {
        return NextResponse.json({ success: false, error: '二维码无效或已过期', type: 'invalid' }, { status: 200 });
      }
      resolvedCode = payload.code;
      resolvedAttendeeId = payload.aid;
    }
    // Priority 2: Plain signin code (fallback for manual input)
    else if (signin_code?.trim()) {
      resolvedCode = signin_code.trim();
    } else {
      return NextResponse.json({ success: false, error: '签到码不能为空', type: 'invalid' }, { status: 400 });
    }

    const client = getSupabaseClient();

    // Find attendee by signin_code and meeting_id
    let query = client
      .from('attendees')
      .select('id, name, phone, position, company, signin_code')
      .eq('signin_code', resolvedCode)
      .eq('meeting_id', meeting_id.trim())
      .maybeSingle();

    const { data: attendee, error: attendeeError } = await query;
    if (attendeeError) throw new Error(`查询失败: ${attendeeError.message}`);

    if (!attendee) {
      return NextResponse.json({ success: false, error: '签到码无效', type: 'invalid' }, { status: 200 });
    }

    // If token provided, verify attendee_id matches
    if (resolvedAttendeeId && resolvedAttendeeId !== attendee.id) {
      return NextResponse.json({ success: false, error: '签到码与参会人不匹配', type: 'invalid' }, { status: 200 });
    }

    // Check if already checked in
    const { data: existingCheckin, error: checkError } = await client
      .from('checkins')
      .select('id, checkin_at')
      .eq('attendee_id', attendee.id)
      .eq('meeting_id', meeting_id.trim())
      .maybeSingle();
    if (checkError) throw new Error(`查询签到记录失败: ${checkError.message}`);

    if (existingCheckin) {
      return NextResponse.json({
        success: false,
        error: '已签到',
        type: 'duplicate',
        data: {
          name: attendee.name,
          position: attendee.position,
          company: attendee.company,
          checkin_at: existingCheckin.checkin_at,
        },
      });
    }

    // Create checkin record
    const { data: checkin, error: insertError } = await client
      .from('checkins')
      .insert({
        attendee_id: attendee.id,
        meeting_id: meeting_id.trim(),
        device_info: device_info || null,
      })
      .select()
      .single();

    // Handle unique constraint violation (race condition: duplicate checkin)
    if (insertError) {
      if (insertError.code === '23505') {
        const { data: existingCheckin2 } = await client
          .from('checkins')
          .select('id, checkin_at')
          .eq('attendee_id', attendee.id)
          .eq('meeting_id', meeting_id.trim())
          .maybeSingle();
        return NextResponse.json({
          success: false,
          error: '已签到',
          type: 'duplicate',
          data: {
            name: attendee.name,
            position: attendee.position,
            company: attendee.company,
            checkin_at: existingCheckin2?.checkin_at || new Date().toISOString(),
          },
        });
      }
      throw new Error(`签到失败: ${insertError.message}`);
    }

    // Get today's checkin count for this meeting
    const { count, error: countError } = await client
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('meeting_id', meeting_id.trim());
    if (countError) throw new Error(`统计失败: ${countError.message}`);

    return NextResponse.json({
      success: true,
      data: {
        name: attendee.name,
        position: attendee.position,
        company: attendee.company,
        checkin_at: checkin.checkin_at,
        checkin_number: count || 1,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '签到服务异常';
    return NextResponse.json({ success: false, error: message, type: 'error' }, { status: 500 });
  }
}
