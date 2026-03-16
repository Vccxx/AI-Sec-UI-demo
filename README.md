# AI 运营研判中心原型

这是一个基于 React + Vite 的安全运营可视化原型，包含：

- 高危事件队列（状态统计、滚动列表、事件联动）
- 关联分析（攻击者、系统与主机关系、原始流量、设备日志）
- AI 推理实录（打字机输出、攻击路径取证分析、追问对话）
- 报告中心（模板选择/新建、查看编辑保存、下载）

## 技术栈

- React 18
- Vite 5
- Lucide React
- Recharts

## 目录结构

```text
.
├── App.jsx
├── App.css
├── main.jsx
├── index.html
├── components/
├── data/
└── operation-instruction.txt
```

## 环境要求

- Node.js 18+（推荐 20+）
- npm 9+

## 安装与运行

1) 安装依赖

```bash
npm install
```

2) 启动开发环境

```bash
npm run dev -- --host 0.0.0.0 --port 4173
```

3) 浏览器访问

- 本机：`http://localhost:4173`
- 局域网：`http://<你的IP>:4173`

## 构建产物

```bash
npm run build
```

构建结果输出到 `dist/`。

## 一键同步到 GitHub

项目内置本地同步脚本：`scripts/sync-push.sh`

- 用途：将当前分支推送到远程 `origin`
- 凭据：读取本地 `.local-secrets/github_user.txt` 和 `.local-secrets/github_pat.txt`
- 安全：`.local-secrets/` 已加入 `.gitignore`，不会被提交到远程仓库

执行方式：

```bash
./scripts/sync-push.sh
```

说明：脚本会临时使用带认证的远程地址进行 push，完成后自动恢复为不带 token 的安全远程地址。

## 公网服务器一键部署

### 方式一：Docker 部署（推荐）

适用于任何 Linux 发行版，完全避免系统兼容性问题。

```bash
# 安装 Docker（如未安装）
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 重新登录后执行部署
chmod +x scripts/deploy_docker.sh
./scripts/deploy_docker.sh
```

可选参数：

```bash
PORT=8080 BRANCH=main ./scripts/deploy_docker.sh
```

### 方式二：原生部署

脚本 `scripts/deploy_server.sh`（支持 Ubuntu/Debian/CentOS/RHEL）

默认行为：

- 拉取/更新仓库代码（`main`）
- 安装 Node.js、依赖、PM2
- 构建并以 `preview` 模式启动服务
- 监听 `0.0.0.0:4173`

直接执行：

```bash
chmod +x scripts/deploy_server.sh
./scripts/deploy_server.sh
```

可选参数示例：

```bash
APP_NAME=sec-ui APP_DIR=/srv/sec-ui PORT=8080 MODE=preview BRANCH=main ./scripts/deploy_server.sh
```

若你要直接跑开发模式：

```bash
MODE=dev PORT=4173 ./scripts/deploy_server.sh
```

## 常见问题

- 页面空白/样式未更新：先强制刷新（Ctrl+F5）。
- 端口冲突：更换端口启动，如 `npm run dev -- --port 5174`。
- 依赖安装慢：检查网络代理或切换 npm 镜像。

## 说明

- 项目内置了 10+ 条高危事件样例数据与 10+ 条报告样例数据，便于直接演示联动与交互。
- 所有联动逻辑均基于 React `useState` 完成，不依赖后端接口。
