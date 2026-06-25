import { createClient, SupabaseClient } from '@supabase/supabase-js';

let envLoaded = false;

interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

function loadEnv(): void {
  if (envLoaded) return;

  // In production (Vercel), env vars are set directly via platform settings
  // Just check if they exist
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    envLoaded = true;
    return;
  }

  // In coze sandbox, try to load from coze platform
  if (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY) {
    // Map COZE_ prefixed vars to standard names
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.COZE_SUPABASE_URL;
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.COZE_SUPABASE_ANON_KEY;
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.COZE_SUPABASE_SERVICE_ROLE_KEY) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
    }
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

    // Map COZE_ prefixed vars to standard names
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.COZE_SUPABASE_URL) {
      process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.COZE_SUPABASE_URL;
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.COZE_SUPABASE_ANON_KEY) {
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.COZE_SUPABASE_ANON_KEY;
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.COZE_SUPABASE_SERVICE_ROLE_KEY) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
    }

    envLoaded = true;
  } catch {
    // Not in coze sandbox, env vars should be set directly
    envLoaded = true;
  }
}

function getSupabaseCredentials(): SupabaseCredentials {
  loadEnv();

  // Prefer COZE_ prefixed vars (coze platform's database with tables already created)
  // Fall back to NEXT_PUBLIC_ prefixed vars (user's configured Supabase)
  const url = process.env.COZE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.COZE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error('Supabase URL not configured. Set NEXT_PUBLIC_SUPABASE_URL in environment variables.');
  }
  if (!anonKey) {
    throw new Error('Supabase anon key not configured. Set NEXT_PUBLIC_SUPABASE_ANON_KEY in environment variables.');
  }

  return { url, anonKey };
}

function getSupabaseServiceRoleKey(): string | undefined {
  loadEnv();
  return process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function getSupabaseClient(token?: string): SupabaseClient {
  const { url, anonKey } = getSupabaseCredentials();

  let key: string;
  if (token) {
    key = anonKey;
  } else {
    const serviceRoleKey = getSupabaseServiceRoleKey();
    key = serviceRoleKey ?? anonKey;
  }

  // Try to set up reporting (coze sandbox only, safe to fail in production)
  let customFetch: any;
  try {
    const { getReportBuffer, createWrappedFetch } = require('coze-coding-dev-sdk');
    const buffer = getReportBuffer();
    if (buffer) {
      customFetch = createWrappedFetch(buffer, 'supabase');
    }
  } catch {
    // Not in coze sandbox, use default fetch
  }

  return createClient(url, key, {
    global: customFetch ? { fetch: customFetch } : {},
    db: {
      timeout: 60000,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export { loadEnv, getSupabaseCredentials, getSupabaseServiceRoleKey, getSupabaseClient };
