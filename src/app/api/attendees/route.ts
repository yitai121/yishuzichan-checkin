import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { sanitizeString, isValidUUID } from '@/lib/validation';
import { generateSigninCode } from '@/lib/crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meeting_id');
    if (!meetingId || !isValidUUID(meetingId)) {
      return NextResponse.json({ success: false, error: '缺少有效的 meeting_id 参数' }, { status: 400 });
    }
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('attendees')
      .select('id, meeting_id, name, phone, company, signin_code, created_at')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: true });
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
    const { meeting_id, attendees: attendeeList } = body as {
      meeting_id?: string;
      attendees?: Array<{
        name: string;
        phone?: string;
        company?: string;
      }>;
    };

    if (!meeting_id || !isValidUUID(meeting_id)) {
      return NextResponse.json({ success: false, error: '缺少有效的 meeting_id' }, { status: 400 });
    }
    if (!attendeeList || !Array.isArray(attendeeList) || attendeeList.length === 0) {
      return NextResponse.json({ success: false, error: '参会人列表不能为空' }, { status: 400 });
    }

    // Limit batch size
    if (attendeeList.length > 1000) {
      return NextResponse.json({ success: false, error: '单次导入不能超过1000人' }, { status: 400 });
    }

    const client = getSupabaseClient();
    
    // Validation and deduplication
    const validRecords: Array<{
      meeting_id: string;
      name: string;
      phone: string | null;
      company: string | null;
      signin_code: string;
      row: number;
    }> = [];
    const errors: Array<{ row: number; name: string; error: string }> = [];
    const skipped: Array<{ row: number; name: string; phone: string; reason: string }> = [];
    const seenPhones = new Set<string>();

    for (let i = 0; i < attendeeList.length; i++) {
      const a = attendeeList[i];
      const row = i + 1;
      const name = sanitizeString(a.name, 100);
      
      // Validate name
      if (!name) {
        errors.push({ row, name: a.name || '(空)', error: '姓名为空' });
        continue;
      }

      // Validate phone
      let phone: string | null = sanitizeString(a.phone, 20);
      if (phone) {
        // Remove spaces and dashes
        phone = phone.replace(/[\s-]/g, '');
        // Check if 11 digits
        if (!/^\d{11}$/.test(phone)) {
          errors.push({ row, name, error: `手机号格式错误: ${a.phone}` });
          continue;
        }
      }

      // Check duplicate phone
      if (phone && seenPhones.has(phone)) {
        skipped.push({ row, name, phone, reason: '手机号重复' });
        continue;
      }
      if (phone) seenPhones.add(phone);

      validRecords.push({
        meeting_id,
        name,
        phone,
        company: sanitizeString(a.company, 100) || null,
        signin_code: generateSigninCode(),
        row,
      });
    }

    // Check for existing phones in database
    if (validRecords.length > 0) {
      const phonesToCheck = validRecords.filter(r => r.phone).map(r => r.phone!);
      if (phonesToCheck.length > 0) {
        const { data: existing } = await client
          .from('attendees')
          .select('phone')
          .eq('meeting_id', meeting_id)
          .in('phone', phonesToCheck);
        
        if (existing && existing.length > 0) {
          const existingPhones = new Set(existing.map(e => e.phone));
          const finalRecords = [];
          for (const r of validRecords) {
            if (r.phone && existingPhones.has(r.phone)) {
              skipped.push({ row: r.row, name: r.name, phone: r.phone, reason: '手机号已存在' });
            } else {
              finalRecords.push(r);
            }
          }
          validRecords.length = 0;
          validRecords.push(...finalRecords);
        }
      }
    }

    // Insert valid records
    let insertedCount = 0;
    if (validRecords.length > 0) {
      const recordsToInsert = validRecords.map(({ row, ...r }) => r);
      const { data, error } = await client
        .from('attendees')
        .insert(recordsToInsert)
        .select('id');
      if (error) throw new Error(`导入失败: ${error.message}`);
      insertedCount = data?.length || 0;
    }

    return NextResponse.json({
      success: true,
      data: {
        imported: insertedCount,
        skipped: skipped.length,
        failed: errors.length,
        skippedDetails: skipped,
        errorDetails: errors,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
