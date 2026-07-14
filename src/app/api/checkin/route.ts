import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyQRToken } from '@/lib/crypto';
import { checkRateLimit, getClientIP, rateLimitKey } from '@/lib/rate-limit';

// Session token cache (reduces DB queries for session validation)
const sessionCache = new Map<string, { userId: string; timestamp: number }>();
const SESSION_CACHE_TTL = 30000; // 30 seconds cache for session validation

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: max 600 checkin attempts per minute per IP (support 10-20 devices on same network)
    const ip = getClientIP(request);
    const rl = checkRateLimit(rateLimitKey(ip, 'checkin'), 600, 60 * 1000);
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

    // Validate session token (single device login)
    const sessionToken = request.headers.get('X-Session-Token');
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: '登录已失效，请重新登录', status: 'error', message: '登录已失效，请重新登录' },
        { status: 401 }
      );
    }

    // Check session cache first (reduces DB queries for high-frequency scanning)
    const cachedSession = sessionCache.get(sessionToken);
    let sessionUserId: string | null = null;
    
    if (cachedSession && Date.now() - cachedSession.timestamp < SESSION_CACHE_TTL) {
      sessionUserId = cachedSession.userId;
    } else {
      // Verify session token is still valid (not replaced by another login)
      const supabase = getSupabaseClient();
      const { data: sessionUser } = await supabase
        .from('scanner_users')
        .select('id')
        .eq('session_token', sessionToken)
        .maybeSingle();

      if (!sessionUser) {
        return NextResponse.json(
          { success: false, error: '登录已失效，请重新登录', status: 'error', message: '登录已失效，请重新登录' },
          { status: 401 }
        );
      }
      
      sessionUserId = sessionUser.id;
      sessionCache.set(sessionToken, { userId: sessionUser.id, timestamp: Date.now() });
    }

    const body = await request.json();
    const { token, signin_code, meeting_id, device_info, day } = body as {
      token?: string;
      signin_code?: string;
      meeting_id?: string;
      device_info?: string;
      day?: string; // Format: YYYY-MM-DD, defaults to today
    };

    // Determine check-in date (default to today)
    const checkinDate = day?.trim() || new Date().toISOString().split('T')[0];

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

    // Find attendee - use ID from token if available (faster), otherwise by signin_code
    let attendee: { id: string; name: string; phone: string | null; position: string | null; company: string | null; signin_code: string } | null = null;
    
    if (resolvedAttendeeId) {
      // Direct ID lookup (faster, from encrypted token)
      const { data, error } = await client
        .from('attendees')
        .select('id, name, phone, position, company, signin_code')
        .eq('id', resolvedAttendeeId)
        .eq('meeting_id', meeting_id.trim())
        .maybeSingle();
      if (error) throw new Error(`查询失败: ${error.message}`);
      // Verify signin_code matches if both are available
      if (data && data.signin_code !== resolvedCode) {
        return NextResponse.json({ success: false, error: '签到码与参会人不匹配', type: 'invalid' }, { status: 200 });
      }
      attendee = data;
    } else {
      // Lookup by signin_code (fallback)
      const { data, error } = await client
        .from('attendees')
        .select('id, name, phone, position, company, signin_code')
        .eq('signin_code', resolvedCode)
        .eq('meeting_id', meeting_id.trim())
        .maybeSingle();
      if (error) throw new Error(`查询失败: ${error.message}`);
      attendee = data;
    }

    if (!attendee) {
      return NextResponse.json({ success: false, error: '签到码无效', type: 'invalid' }, { status: 200 });
    }

    // Check if already checked in for this day
    const { data: existingCheckin, error: checkError } = await client
      .from('checkins')
      .select('id, checkin_at, checkin_date')
      .eq('attendee_id', attendee.id)
      .eq('meeting_id', meeting_id.trim())
      .eq('checkin_date', checkinDate)
      .maybeSingle();
    if (checkError) throw new Error(`查询签到记录失败: ${checkError.message}`);

    if (existingCheckin) {
      return NextResponse.json({
        success: false,
        error: `今天(${checkinDate})已签到`,
        type: 'duplicate',
        data: {
          name: attendee.name,
          position: attendee.position,
          company: attendee.company,
          checkin_at: existingCheckin.checkin_at,
          checkin_date: existingCheckin.checkin_date,
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
        checkin_date: checkinDate,
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

    return NextResponse.json({
      success: true,
      data: {
        name: attendee.name,
        position: attendee.position,
        company: attendee.company,
        checkin_at: checkin.checkin_at,
        checkin_date: checkin.checkin_date,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '签到服务异常';
    return NextResponse.json({ success: false, error: message, type: 'error' }, { status: 500 });
  }
}
