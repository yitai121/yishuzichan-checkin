import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signin_code, meeting_id, device_info } = body as {
      signin_code?: string;
      meeting_id?: string;
      device_info?: string;
    };
    if (!signin_code?.trim()) {
      return NextResponse.json({ success: false, error: '签到码不能为空', type: 'invalid' }, { status: 400 });
    }
    if (!meeting_id?.trim()) {
      return NextResponse.json({ success: false, error: '未选择会议', type: 'invalid' }, { status: 400 });
    }

    const client = getSupabaseClient();

    // Find attendee by signin_code and meeting_id
    const { data: attendee, error: attendeeError } = await client
      .from('attendees')
      .select('id, name, phone, position, company, signin_code')
      .eq('signin_code', signin_code.trim())
      .eq('meeting_id', meeting_id.trim())
      .maybeSingle();
    if (attendeeError) throw new Error(`查询失败: ${attendeeError.message}`);

    if (!attendee) {
      return NextResponse.json({ success: false, error: '签到码无效', type: 'invalid' }, { status: 200 });
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
    if (insertError) throw new Error(`签到失败: ${insertError.message}`);

    // Get today's checkin count for this meeting
    const { count, error: countError } = await client
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('meeting_id', meeting_id.trim());
    if (countError) throw new Error(`统计失败: ${countError.message}`);

    return NextResponse.json({
      success: true,
      type: 'success',
      data: {
        name: attendee.name,
        position: attendee.position,
        company: attendee.company,
        checkin_at: checkin.checkin_at,
        checkin_number: count,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message, type: 'error' }, { status: 500 });
  }
}
