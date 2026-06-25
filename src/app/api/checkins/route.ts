import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const meetingId = searchParams.get('meeting_id');
  const startTime = searchParams.get('start_time');
  const endTime = searchParams.get('end_time');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');

  if (!meetingId) {
    return NextResponse.json({ success: false, error: '缺少会议ID' }, { status: 400 });
  }

  const supabase = await getSupabaseClient();

  let query = supabase
    .from('checkins')
    .select(`
      *,
      attendees (
        id,
        name,
        phone,
        company,
        position
      )
    `, { count: 'exact' })
    .eq('meeting_id', meetingId)
    .order('checkin_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (startTime) {
    query = query.gte('checkin_at', startTime);
  }
  if (endTime) {
    query = query.lte('checkin_at', endTime);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    data: data || [],
    total: count || 0,
  });
}
