# 项目上下文

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
├── src/
│   ├── app/
│   │   ├── api/            # 后端 API 路由
│   │   │   ├── admin/login/  # 管理后台登录
│   │   │   ├── attendees/    # 参会人 CRUD
│   │   │   ├── checkin/      # 签到核验
│   │   │   ├── export/       # 数据导出
│   │   │   ├── meetings/     # 会议管理
│   │   │   ├── qrcode/       # 二维码生成
│   │   │   └── stats/        # 签到统计
│   │   ├── admin/          # 后台管理页面
│   │   │   ├── dashboard/    # 签到看板（实时）
│   │   │   ├── meetings/     # 会议管理
│   │   │   ├── attendees/    # 参会名单（Excel 导入）
│   │   │   ├── qrcodes/      # 二维码生成（PDF 下载）
│   │   │   └── export/       # 数据导出
│   │   ├── page.tsx        # 前台扫码核验页（/）
│   │   ├── layout.tsx      # 根布局
│   │   └── globals.css     # 全局样式（含品牌色）
│   ├── components/ui/      # shadcn/ui 组件库
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库
│   └── storage/database/   # Supabase 客户端与 Schema
├── package.json
└── tsconfig.json
```

## 包管理规范

**仅允许使用 pnpm** 作为包管理器。

## 核心功能

### 前台扫码核验页（/）
- 移动端优先，html5-qrcode 调摄像头扫码
- 扫码后调用 /api/checkin 核验
- 成功/重复/失败三种结果，3 秒自动恢复

### 后台管理端（/admin）
- 密码登录（环境变量 ADMIN_PASSWORD，默认 admin123）
- 会议管理：创建/编辑/删除/激活会议
- 参会名单：Excel 批量导入（xlsx 库解析）
- 二维码生成：qrcode 库生成，jspdf+html2canvas 导出 PDF
- 签到看板：实时统计，5 秒轮询刷新
- 数据导出：xlsx 库生成 Excel

## 数据库表

- `meetings` - 会议表
- `attendees` - 参会人表（含 signin_code 签到码）
- `checkins` - 签到记录表

## 环境变量

- `ADMIN_PASSWORD` - 管理后台密码（默认 admin123）
