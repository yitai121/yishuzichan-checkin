import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, phone, position, company, note } = body as {
      name?: string;
      phone?: string;
      position?: string;
      company?: string;
      note?: string;
    };
    const client = getSupabaseClient();
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim() || null;
    if (position !== undefined) updateData.position = position.trim() || null;
    if (company !== undefined) updateData.company = company.trim() || null;
    if (note !== undefined) updateData.note = note.trim() || null;

    const { data, error } = await client
      .from('attendees')
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
    const { error } = await client.from('attendees').delete().eq('id', id);
    if (error) throw new Error(`删除失败: ${error.message}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
