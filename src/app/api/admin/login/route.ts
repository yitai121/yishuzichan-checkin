import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP, rateLimitKey } from '@/lib/rate-limit';

let envLoaded = false;

function loadAdminPassword(): void {
  if (envLoaded || process.env.ADMIN_PASSWORD) {
    envLoaded = true;
    return;
  }

  // Try loading via coze workload identity (sandbox only)
  try {
    const { execSync } = require('child_process');
    const pythonCode = `
import os, sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        print(f"{env_var.key}={env_var.value}")
except Exception as e:
    print(f"# Error: {e}", file=sys.stderr)
`;
    const output = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const lines = output.trim().split('\n');
    for (const line of lines) {
      if (line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex);
        let value = line.substring(eqIndex + 1);
        if ((value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
    envLoaded = true;
  } catch {
    // Not in coze sandbox, ADMIN_PASSWORD should be set directly via env vars
    envLoaded = true;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: max 5 login attempts per minute per IP
    const ip = getClientIP(request);
    const rl = checkRateLimit(rateLimitKey(ip, 'admin-login'), 5, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: '登录尝试过于频繁，请60秒后再试' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    loadAdminPassword();
    const body = await request.json();
    const { password } = body as { password?: string };
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (!password || password !== adminPassword) {
      return NextResponse.json(
        { success: false, error: '密码错误' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: '登录失败' },
      { status: 500 }
    );
  }
}
