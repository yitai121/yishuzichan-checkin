import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('meetings')
      .select('id, name, location, start_at, is_active, created_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!data) return NextResponse.json({ success: false, error: '会议不存在' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, location, start_at, is_active } = body as {
      name?: string;
      location?: string;
      start_at?: string;
      is_active?: boolean;
    };
    const client = getSupabaseClient();

    // If activating this meeting, deactivate all others first
    if (is_active === true) {
      const { error: deactivateError } = await client
        .from('meetings')
        .update({ is_active: false })
        .neq('id', id);
      if (deactivateError) throw new Error(`切换失败: ${deactivateError.message}`);
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (location !== undefined) updateData.location = location.trim() || null;
    if (start_at !== undefined) updateData.start_at = start_at || null;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await client
      .from('meetings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`更新失败: ${error.message}`);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const client = getSupabaseClient();
    const { error } = await client.from('meetings').delete().eq('id', id);
    if (error) throw new Error(`删除失败: ${error.message}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
