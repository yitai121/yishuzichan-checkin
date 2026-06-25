# DESIGN.md

## 项目与用户画像
- 产品：「亿数嘉年华签到系统」——会议现场二维码签到管理平台
- 用户：前台为现场工作人员（手机扫码），后台为活动管理员（桌面端操作）
- 场景：大型会议/嘉年华入场签到，追求快速、准确、专业

## 品牌与视觉方向
- 气质意象：高端科技峰会签到台——晨光透过落地玻璃洒在白色大理石台面，台面上只有一台轻薄笔记本和一块蓝紫色亚克力立牌，一切井然有序
- 关键词：克制、精准、高效、专业科技感
- 风格：浅色系高级白，蓝紫色点缀，留白充足，信息层次清晰

## Design Tokens

### 色彩
- 主色：#5B5FC7（亿数蓝紫），用于品牌标识、主要按钮、激活状态
- 主色 Hover：#6B6FD3
- 主色 Press：#4A4EB5
- 主色浅：#EEEDFB（极浅蓝紫），用于卡片高亮背景、选中行、侧边栏激活
- 成功色：#10B981（翠绿），签到成功状态
- 成功色浅底：#D1FAE5
- 警告色：#F59E0B（琥珀），重复签到提示
- 警告色浅底：#FEF3C7
- 错误色：#EF4444（红），签到失败/无效码
- 错误色浅底：#FEE2E2
- 页面背景：#F8F9FB（近白微灰）
- 卡片白：#FFFFFF
- 边框：#E5E7EB
- 表头背景：#F4F5F8
- 文字主色：#1A1D24
- 文字次级：#5A6171
- 文字辅助：#9CA3AF

### 字体
- 字体族：'PingFang SC', 'Microsoft YaHei', system-ui, -apple-system, sans-serif
- 数字/统计：tabular-nums
- 标题：font-weight 700, tracking-tight

### 间距与圆角
- 按钮圆角：10px
- 卡片圆角：16px
- 输入框圆角：8px
- 侧边栏导航项圆角：8px
- 内容区 padding：32px
- 内容区最大宽度：1440px

### 布局
- 侧边栏：240px 固定宽度，白色背景，右边框
- 顶栏：64px 高度，白色背景，下边框
- 统计卡片：4 列网格（桌面）/ 2 列（平板）/ 1 列（手机）

### 阴影
- 卡片默认：0 1px 3px rgba(15,23,42,0.04), 0 4px 24px rgba(91,95,199,0.06)
- 卡片 Hover：0 4px 12px rgba(15,23,42,0.08), 0 8px 32px rgba(91,95,199,0.12)
- 按钮 Hover：0 8px 24px rgba(91,95,199,0.32)

### 动效
- 页面进入：fade-in + 8px 上移，300ms cubic-bezier(0.4, 0, 0.2, 1)
- 列表项交错淡入：stagger-in，每项延迟 50ms
- 数字增长：number-grow，800ms ease-out
- 按钮 Hover：translateY(-1px) + 阴影加深
- 按钮 Active：scale(0.98)
- 卡片 Hover：translateY(-2px) + 阴影加深
- Toast 下落：toast-in，300ms
- 骨架屏：shimmer，1.5s ease-in-out infinite
- 签到光晕：glow-expand，600ms ease-out

### 按钮规范
- Primary：#5B5FC7 背景，白色文字，10px 圆角，hover 渐变+阴影+translateY(-1px)
- Secondary：白色背景，#1A1D24 文字，1px #E5E7EB 边框，hover 边框变主色
- Danger：白色背景，#EF4444 文字，#FCA5A5 边框，hover 填充红色

### 输入框规范
- 高度：40px
- 圆角：8px
- 边框：1px #E5E7EB
- Focus：#5B5FC7 边框 + 3px rgba(91,95,199,0.12) 外发光

### 表格规范
- 表头：#F4F5F8 背景，13px，#5A6171 文字，font-weight 500
- 行高：48px
- Hover：rgba(91,95,199,0.04) 浅紫底

### Badge 规范
- Success：rgba(16,185,129,0.12) 背景，#10B981 文字
- Warning：rgba(245,158,11,0.12) 背景，#F59E0B 文字
- Error：rgba(239,68,68,0.12) 背景，#EF4444 文字
- Brand：rgba(91,95,199,0.12) 背景，#5B5FC7 文字

## 侧边栏导航
- 导航项：flex items-center gap-12px，padding 10px 16px，8px 圆角
- 默认：#5A6171 文字
- Hover：rgba(91,95,199,0.06) 背景，#5B5FC7 文字，左侧 3px 主色竖条
- Active：#EEEDFB 背景，#5B5FC7 文字，左侧 3px 主色竖条

## 设计禁忌
- 不要使用渐变背景大色块
- 不要使用 emoji 作为图标（使用 lucide-react）
- 不要使用卡通风格头像
- 不要使用宋体/衬线字体
- 不要写"暂无数据"（使用具体引导文案）
- 不要使用超过 3 种颜色（主色+成功/警告/错误状态色）
- 不要使用大面积深色/暗色主题
