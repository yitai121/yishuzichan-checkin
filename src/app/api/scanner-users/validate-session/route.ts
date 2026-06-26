import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/scanner-users/validate-session - Validate session token
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.headers.get('X-Session-Token');
    
    if (!sessionToken) {
      return NextResponse.json({ success: false, error: 'Missing session token' }, { status: 401 });
    }

    const supabase = await createClient();
    
    // Find user with matching session token
    const { data: user, error } = await supabase
      .from('scanner_users')
      .select('id, username')
      .eq('session_token', sessionToken)
      .eq('is_active', true)
      .single();
    
    if (error || !user) {
      return NextResponse.json({ success: false, error: 'Session invalid' }, { status: 401 });
    }
    
    return NextResponse.json({ success: true, username: user.username });
  } catch (err) {
    console.error('Validate session error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
