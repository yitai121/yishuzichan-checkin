import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// In-memory cache for stats (reduces DB load for concurrent requests)
const statsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2000; // 2 seconds cache

export async function GET(_req: NextRequest, { params }: { params: Promise<{ meetingId: string }> }) {
  try {
    const { meetingId } = await params;
    
    // Check cache first
    const cached = statsCache.get(meetingId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, data: cached.data });
    }
    
    const client = getSupabaseClient();

    // Use COUNT queries instead of fetching all records (much faster for 8000+ attendees)
    const [totalResult, checkedInResult] = await Promise.all([
      client.from('attendees').select('*', { count: 'exact', head: true }).eq('meeting_id', meetingId),
      client.from('checkins').select('*', { count: 'exact', head: true }).eq('meeting_id', meetingId),
    ]);

    if (totalResult.error) throw new Error(`统计失败: ${totalResult.error.message}`);
    if (checkedInResult.error) throw new Error(`查询签到记录失败: ${checkedInResult.error.message}`);

    const total = totalResult.count || 0;
    const checkedInCount = checkedInResult.count || 0;
    const rate = total > 0 ? Math.round((checkedInCount / total) * 100) : 0;

    // Only fetch recent 10 check-ins for display (not all records)
    const { data: recentCheckins, error: recentError } = await client
      .from('checkins')
      .select('id, attendee_id, checkin_at, attendees:attendee_id(name, company, phone)')
      .eq('meeting_id', meetingId)
      .order('checkin_at', { ascending: false })
      .limit(10);
    
    if (recentError) throw new Error(`查询最近签到失败: ${recentError.message}`);

    const result = {
      total,
      checked_in: checkedInCount,
      rate,
      recent: (recentCheckins || []).map((c: any) => ({
        name: c.attendees?.name || '未知',
        company: c.attendees?.company || '',
        checkin_at: c.checkin_at,
      })),
    };

    // Update cache
    statsCache.set(meetingId, { data: result, timestamp: Date.now() });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
