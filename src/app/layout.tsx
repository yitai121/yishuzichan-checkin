import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '亿数嘉年华签到系统',
    template: '%s | 亿数嘉年华签到系统',
  },
  description: '亿数嘉年华会议现场二维码签到系统，支持扫码核验、实时签到看板、批量二维码生成与数据导出。',
  keywords: ['签到系统', '会议签到', '二维码签到', '亿数嘉年华'],
  generator: 'Coze Code',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="zh-CN">
      <body className={`antialiased bg-[#FAFBFC] text-[#111827]`}>
        {isDev && <Inspector />}
        {children}
      </body>
    </html>
  );
}
