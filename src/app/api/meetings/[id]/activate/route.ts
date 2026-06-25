import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// PATCH /api/meetings/[id]/activate - Activate a meeting (deactivate all others)
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();

    // First, deactivate all meetings
    const { error: deactivateError } = await client
      .from('meetings')
      .update({ is_active: false })
      .neq('id', id);

    if (deactivateError) {
      throw new Error(` deactivate meetings failed: ${deactivateError.message}`);
    }

    // Then, activate the target meeting
    const { data: meeting, error: activateError } = await client
      .from('meetings')
      .update({ is_active: true })
      .eq('id', id)
      .select('id, name, is_active')
      .single();

    if (activateError) {
      throw new Error(`activate meeting failed: ${activateError.message}`);
    }

    if (!meeting) {
      return NextResponse.json({ success: false, error: '会议不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: meeting });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
