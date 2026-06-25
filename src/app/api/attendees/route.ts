import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { sanitizeString, isValidUUID } from '@/lib/validation';
import { generateSigninCode } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meeting_id');
    if (!meetingId || !isValidUUID(meetingId)) {
      return NextResponse.json({ success: false, error: '缺少有效的 meeting_id 参数' }, { status: 400 });
    }
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('attendees')
      .select('id, meeting_id, name, phone, position, company, note, signin_code, created_at')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(`查询失败: ${error.message}`);
    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { meeting_id, attendees: attendeeList } = body as {
      meeting_id?: string;
      attendees?: Array<{
        name: string;
        phone?: string;
        position?: string;
        company?: string;
        note?: string;
      }>;
    };

    if (!meeting_id || !isValidUUID(meeting_id)) {
      return NextResponse.json({ success: false, error: '缺少有效的 meeting_id' }, { status: 400 });
    }
    if (!attendeeList || !Array.isArray(attendeeList) || attendeeList.length === 0) {
      return NextResponse.json({ success: false, error: '参会人列表不能为空' }, { status: 400 });
    }

    // Limit batch size
    if (attendeeList.length > 500) {
      return NextResponse.json({ success: false, error: '单次导入不能超过500人' }, { status: 400 });
    }

    const client = getSupabaseClient();
    const records = attendeeList.map((a) => ({
      meeting_id,
      name: sanitizeString(a.name, 100) || '未命名',
      phone: sanitizeString(a.phone, 20) || null,
      position: sanitizeString(a.position, 100) || null,
      company: sanitizeString(a.company, 100) || null,
      note: sanitizeString(a.note, 500) || null,
      signin_code: generateSigninCode(),
    }));

    const { data, error } = await client
      .from('attendees')
      .insert(records)
      .select('id, meeting_id, name, phone, position, company, note, signin_code, created_at');
    if (error) throw new Error(`导入失败: ${error.message}`);
    return NextResponse.json({ success: true, data: data || [], count: data?.length || 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
