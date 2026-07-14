import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const dynamic = 'force-dynamic';

// In-memory cache for screen data (reduces DB load when multiple screens poll)
const screenCache: { data: any; timestamp: number } = { data: null, timestamp: 0 };
const CACHE_TTL = 2000; // 2 seconds cache

export async function GET() {
  try {
    // Check cache first
    if (screenCache.data && Date.now() - screenCache.timestamp < CACHE_TTL) {
      return NextResponse.json({ success: true, data: screenCache.data });
    }

    const supabase = await getSupabaseClient();
    
    // Get active meeting
    const { data: activeMeeting } = await supabase
      .from('meetings')
      .select('id')
      .eq('is_active', true)
      .single();
    
    if (!activeMeeting) {
      const emptyData = { count: 0, total: 0, recent: [] };
      screenCache.data = emptyData;
      screenCache.timestamp = Date.now();
      return NextResponse.json({ success: true, data: emptyData });
    }
    
    // Use parallel COUNT queries (much faster than fetching all records)
    const [totalResult, countResult, recentResult] = await Promise.all([
      supabase.from('attendees').select('*', { count: 'exact', head: true }).eq('meeting_id', activeMeeting.id),
      supabase.from('checkins').select('*', { count: 'exact', head: true }).eq('meeting_id', activeMeeting.id),
      supabase
        .from('checkins')
        .select(`id, created_at, attendees!inner(name, company, position)`)
        .eq('meeting_id', activeMeeting.id)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    
    const result = {
      count: countResult.count || 0,
      total: totalResult.count || 0,
      recent: (recentResult.data || []).map((c: any) => ({
        n: c.attendees?.name || '未知',
        o: c.attendees?.company || c.attendees?.position || '',
        t: c.created_at
      })),
    };

    // Update cache
    screenCache.data = result;
    screenCache.timestamp = Date.now();
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Screen API error:', error);
    return NextResponse.json({ success: true, data: { count: 0, total: 0, recent: [] } });
  }
}
