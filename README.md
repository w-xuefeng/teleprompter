# Teleprompter

一个由 HTML + CSS + JavaScript 编写的高颜值浏览器端提词器，无需安装，打开即用。支持局域网远程控制，手机即可当遥控器。

## 功能

- **样式自定义**：支持调整字体大小、字体颜色、背景颜色等样式
- **滚动方向切换**：支持从下往上、从上往下、从左往右、从右往左四种滚动方向
- **速度控制**：支持实时调整滚动速度（10-500 px/s），快慢随心
- **进度控制**：支持通过滑块手动调整播放位置，暂停后可从任意位置继续播放
- **全屏显示**：支持一键全屏，沉浸式提词体验；切换全屏时自动保留播放进度
- **全屏自动隐藏**：全屏模式下工具栏可自动隐藏，鼠标移到顶部时呼出
- **文本导入**：支持导入本地文本文件（.txt），快速加载提词内容
- **文本编辑**：支持在页面中直接编辑和粘贴提词内容，编辑器可折叠
- **播放控制**：支持开始、暂停、重置等播放控制，支持普通/全屏两种播放模式
- **预设管理**：支持保存/加载/删除预设配置（字号、颜色、方向、速度）
- **键盘快捷键**：空格键切换播放/暂停，方向键调节速度和字号，Esc 退出全屏
- **PWA 支持**：可添加到主屏幕，支持离线使用
- **局域网远程控制**：手机打开遥控页面配对后，可远程控制播放、暂停、速度、方向、字号、颜色、文本编辑等全部功能

## 适用场景

- 演讲 / 发布会提词
- 直播 / 录播提词
- 视频拍摄提词
- 在线会议 / 演示提词
- 课堂讲课辅助

## 技术栈

- HTML5
- CSS3
- 原生 JavaScript（ES6+）
- Service Worker（离线缓存）
- Web App Manifest（PWA）
- Node.js + WebSocket（远程控制服务端）

无任何外部框架依赖，主页面为纯静态，可直接在浏览器中打开使用。图标使用 Lucide 图标库（CDN 加载）。

## 使用方法

### 基本使用

1. 直接访问在线地址：[w-xuefeng.github.io/teleprompter](https://w-xuefeng.github.io/teleprompter)
2. 在文本区域粘贴或编辑提词内容（也可通过「导入」按钮加载本地 .txt 文件）
3. 调整字体大小、颜色、滚动速度等参数
4. 点击「开始」启动滚动，即可开始提词
5. 暂停后可拖动进度滑块调整播放位置，再次开始从该位置继续

> 也可克隆项目或下载源代码，直接用浏览器打开 `index.html` 使用。

### 远程控制

1. 启动 WebSocket 服务端：
   ```bash
   cd server && npm start
   ```
   默认端口 3456，可通过 `PORT` 环境变量修改。

2. 电脑端打开 `index.html`，点击工具栏的手机图标，获取房间代码。

3. 手机端打开遥控器页面，输入电脑的局域网 IP + 房间代码，点击连接即可遥控。
   - 在线地址：[w-xuefeng.github.io/teleprompter/remote-control.html](https://w-xuefeng.github.io/teleprompter/remote-control.html)
   - 快捷地址：[w-xuefeng.github.io/teleprompter/ctrl.html](https://w-xuefeng.github.io/teleprompter/ctrl.html)

## 键盘快捷键

| 按键 | 功能 |
|------|------|
| 空格 | 切换播放 / 暂停 |
| ↑ | 增加速度 |
| ↓ | 减小速度 |
| ← | 缩小字号 |
| → | 放大字号 |
| Esc | 退出全屏 |

## 浏览器兼容性

支持所有现代浏览器（Chrome、Firefox、Safari、Edge）。

## 项目结构

```
teleprompter/
├── index.html              # 主页面
├── remote-control.html     # 移动端遥控器页面
├── ctrl.html               # 遥控器快捷重定向
├── sw.js                   # Service Worker（离线缓存）
├── manifest.json           # 主页面 PWA 清单
├── remote-manifest.json    # 遥控器 PWA 清单
├── icon.svg                # 主页面图标
├── controller-icon.svg     # 遥控器图标
├── lucide-loader.js        # 图标库加载器
├── server/
│   ├── server.js           # WebSocket 消息转发服务
│   ├── package.json
│   └── node_modules/
└── README.md
```

## 许可

MIT License
