/**
 * Input validation and sanitization utilities
 */

/**
 * Sanitize a string input - trim and limit length
 */
export function sanitizeString(input: unknown, maxLength: number = 500): string {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
}

/**
 * Validate UUID format
 */
export function isValidUUID(input: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);
}

/**
 * Validate phone number (China format)
 */
export function isValidPhone(input: string): boolean {
  return /^1[3-9]\d{9}$/.test(input.trim());
}

/**
 * Validate email format
 */
export function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}

/**
 * Check for SQL injection patterns (basic protection layer)
 * Note: Supabase parameterized queries are the primary defense
 */
export function containsSQLInjection(input: string): boolean {
  const patterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC)\b.*\b(FROM|INTO|TABLE|DATABASE|WHERE)\b)/i,
    /(--|;|\/\*|\*\/)/,
    /(\bOR\b\s+\d+\s*=\s*\d+)/i,
    /(\bAND\b\s+\d+\s*=\s*\d+)/i,
    /('|"|\bNULL\b)/i,
  ];
  return patterns.some((p) => p.test(input));
}

/**
 * Validate and sanitize meeting input
 */
export function validateMeetingInput(body: Record<string, unknown>): {
  valid: boolean;
  error?: string;
  data?: { name: string; location: string; start_at: string | null };
} {
  const name = sanitizeString(body.name, 200);
  if (!name) return { valid: false, error: '会议名称不能为空' };

  const location = sanitizeString(body.location, 200);
  if (!location) return { valid: false, error: '会议地点不能为空' };

  let start_at: string | null = null;
  if (body.start_at && typeof body.start_at === 'string') {
    const date = new Date(body.start_at);
    if (isNaN(date.getTime())) return { valid: false, error: '开始时间格式无效' };
    start_at = date.toISOString();
  }

  return { valid: true, data: { name, location, start_at } };
}

/**
 * Validate attendee input
 */
export function validateAttendeeInput(body: Record<string, unknown>): {
  valid: boolean;
  error?: string;
  data?: { name: string; phone: string; position: string; company: string };
} {
  const name = sanitizeString(body.name, 100);
  if (!name) return { valid: false, error: '姓名不能为空' };

  const phone = sanitizeString(body.phone, 20);
  const position = sanitizeString(body.position, 100);
  const company = sanitizeString(body.company, 100);

  return { valid: true, data: { name, phone, position, company } };
}
