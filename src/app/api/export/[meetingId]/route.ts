import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ meetingId: string }> }) {
  try {
    const { meetingId } = await params;
    const client = getSupabaseClient();

    // Get meeting info
    const { data: meeting, error: meetingError } = await client
      .from('meetings')
      .select('id, name')
      .eq('id', meetingId)
      .maybeSingle();
    if (meetingError) throw new Error(`查询会议失败: ${meetingError.message}`);
    if (!meeting) return NextResponse.json({ success: false, error: '会议不存在' }, { status: 200 });

    // Get all attendees with checkin status
    const { data: attendees, error: attendeesError } = await client
      .from('attendees')
      .select('id, name, phone, company, signin_code')
      .eq('meeting_id', meetingId)
      .order('name');
    if (attendeesError) throw new Error(`查询参会人失败: ${attendeesError.message}`);

    // Get all checkins
    const { data: checkins, error: checkinsError } = await client
      .from('checkins')
      .select('attendee_id, checkin_at')
      .eq('meeting_id', meetingId);
    if (checkinsError) throw new Error(`查询签到记录失败: ${checkinsError.message}`);

    const checkinMap = new Map<string, string>();
    for (const c of checkins || []) {
      checkinMap.set(c.attendee_id, c.checkin_at);
    }

    const rows = (attendees || []).map((a) => ({
      '姓名': a.name,
      '电话': a.phone || '',
      '所属分公司': a.company || '',
      '签到状态': checkinMap.has(a.id) ? '已签到' : '未签到',
      '签到时间': checkinMap.has(a.id)
        ? new Date(checkinMap.get(a.id)!).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        : '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '\u7B7E\u5230\u8BB0\u5F55');

    ws['!cols'] = [
      { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 20 },
    ];

    // Generate as base64 string
    const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    // Return as JSON with base64 data for client-side download
    return NextResponse.json({
      success: true,
      data: {
        filename: `${meeting.name}-签到记录.xlsx`,
        content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        base64: b64,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    console.error('Export error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
