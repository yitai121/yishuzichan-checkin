import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ meetingId: string }> }) {
  try {
    const { meetingId } = await params;
    const client = getSupabaseClient();

    // Get total attendees count
    const { count: totalCount, error: totalError } = await client
      .from('attendees')
      .select('*', { count: 'exact', head: true })
      .eq('meeting_id', meetingId);
    if (totalError) throw new Error(`统计失败: ${totalError.message}`);

    // Get checked-in count and records
    const { data: checkins, error: checkinError } = await client
      .from('checkins')
      .select('id, attendee_id, checkin_at, attendees:attendee_id(name, position, company, phone)')
      .eq('meeting_id', meetingId)
      .order('checkin_at', { ascending: false });
    if (checkinError) throw new Error(`查询签到记录失败: ${checkinError.message}`);

    // Get meeting info for start time
    const { data: meeting, error: meetingError } = await client
      .from('meetings')
      .select('id, name, start_at')
      .eq('id', meetingId)
      .maybeSingle();
    if (meetingError) throw new Error(`查询会议失败: ${meetingError.message}`);

    const checkedInCount = checkins?.length || 0;
    const total = totalCount || 0;
    const rate = total > 0 ? Math.round((checkedInCount / total) * 100) : 0;

    // Calculate average checkin time (time from meeting start to checkin)
    let avgMinutes: number | null = null;
    if (meeting?.start_at && checkins && checkins.length > 0) {
      const startMs = new Date(meeting.start_at).getTime();
      const diffs = checkins
        .map((c) => new Date(c.checkin_at).getTime() - startMs)
        .filter((d) => d > 0);
      if (diffs.length > 0) {
        avgMinutes = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length / 60000);
      }
    }

    // Build time buckets (10-min intervals)
    const buckets: Array<{ time: string; count: number }> = [];
    if (checkins && checkins.length > 0) {
      const sorted = [...checkins].sort(
        (a, b) => new Date(a.checkin_at).getTime() - new Date(b.checkin_at).getTime()
      );
      const firstTime = new Date(sorted[0].checkin_at).getTime();
      const lastTime = new Date(sorted[sorted.length - 1].checkin_at).getTime();
      const bucketSize = 10 * 60 * 1000; // 10 minutes
      let bucketStart = Math.floor(firstTime / bucketSize) * bucketSize;

      while (bucketStart <= lastTime) {
        const bucketEnd = bucketStart + bucketSize;
        const count = checkins.filter((c) => {
          const t = new Date(c.checkin_at).getTime();
          return t >= bucketStart && t < bucketEnd;
        }).length;
        const d = new Date(bucketStart);
        const label = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        buckets.push({ time: label, count });
        bucketStart = bucketEnd;
      }
    }

    // Get attendees who haven't checked in
    const checkedInIds = new Set(checkins?.map((c) => c.attendee_id) || []);
    const { data: allAttendees, error: attendeesError } = await client
      .from('attendees')
      .select('id, name, position, company, phone')
      .eq('meeting_id', meetingId)
      .order('name');
    if (attendeesError) throw new Error(`查询参会人失败: ${attendeesError.message}`);

    const notCheckedIn = (allAttendees || []).filter((a) => !checkedInIds.has(a.id));

    return NextResponse.json({
      success: true,
      data: {
        total,
        checked_in: checkedInCount,
        rate,
        avg_minutes: avgMinutes,
        recent_checkins: checkins?.slice(0, 50) || [],
        not_checked_in: notCheckedIn,
        buckets,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
