import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { generateQRToken } from '@/lib/crypto';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ attendeeId: string }> }) {
  try {
    const { attendeeId } = await params;
    const { searchParams } = new URL(_req.url);
    const signinCode = searchParams.get('code');

    if (!signinCode) {
      return NextResponse.json({ success: false, error: '缺少签到码' }, { status: 400 });
    }

    // Generate encrypted QR token
    const encryptedToken = generateQRToken(signinCode, attendeeId);

    // Generate QR code with encrypted data
    const dataUrl = await QRCode.toDataURL(encryptedToken, {
      width: 300,
      margin: 2,
      color: { dark: '#111827', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    });

    return NextResponse.json({
      success: true,
      data: {
        qr_data_url: dataUrl,
        signin_code: signinCode,
        token: encryptedToken,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
