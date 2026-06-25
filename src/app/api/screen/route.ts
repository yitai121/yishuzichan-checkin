import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await getSupabaseClient();
    
    // Get active meeting
    const { data: activeMeeting } = await supabase
      .from('meetings')
      .select('id')
      .eq('is_active', true)
      .single();
    
    if (!activeMeeting) {
      return NextResponse.json({
        success: true,
        data: { count: 0, total: 0, recent: [] }
      });
    }
    
    // Get total attendees
    const { count: total } = await supabase
      .from('attendees')
      .select('*', { count: 'exact', head: true })
      .eq('meeting_id', activeMeeting.id);
    
    // Get checked-in count
    const { count } = await supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true })
      .eq('meeting_id', activeMeeting.id);
    
    // Get recent check-ins (last 20)
    const { data: recentCheckins } = await supabase
      .from('checkins')
      .select(`
        id,
        created_at,
        attendees!inner(name, company, position)
      `)
      .eq('meeting_id', activeMeeting.id)
      .order('created_at', { ascending: false })
      .limit(20);
    
    const recent = (recentCheckins || []).map((c: any) => ({
      n: c.attendees?.name || '未知',
      o: c.attendees?.company || c.attendees?.position || '',
      t: c.created_at
    }));
    
    return NextResponse.json({
      success: true,
      data: {
        count: count || 0,
        total: total || 0,
        recent
      }
    });
  } catch (error) {
    console.error('Screen API error:', error);
    return NextResponse.json({
      success: true,
      data: { count: 0, total: 0, recent: [] }
    });
  }
}
