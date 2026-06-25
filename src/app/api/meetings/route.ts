import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET() {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('meetings')
      .select('id, name, location, start_at, is_active, created_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`查询失败: ${error.message}`);
    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, location, start_at } = body as {
      name?: string;
      location?: string;
      start_at?: string;
    };
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: '会议名称不能为空' }, { status: 400 });
    }
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('meetings')
      .insert({ name: name.trim(), location: location?.trim() || null, start_at: start_at || null })
      .select()
      .single();
    if (error) throw new Error(`创建失败: ${error.message}`);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
