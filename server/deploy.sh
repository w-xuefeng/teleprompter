#!/usr/bin/env bash

set -euo pipefail

# ── 颜色 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()    { printf "${CYAN}  → %s${NC}\n" "$1"; }
success() { printf "${GREEN}  ✓ %s${NC}\n" "$1"; }
warn()    { printf "${YELLOW}  ⚠ %s${NC}\n" "$1"; }
error()   { printf "${RED}  ✗ %s${NC}\n" "$1"; }
step()    { printf "\n${CYAN}▸ %s${NC}\n" "$1"; }

cleanup() {
  if [ -f "${tar_file:-}" ]; then
    rm -f "$tar_file"
    info "已清理本地临时文件"
  fi
}
trap cleanup EXIT

# ── 读取配置 ──
server_user=$(lod get teleprompter/server-user)
server_host=$(lod get teleprompter/server-host)
server_path=$(lod get teleprompter/server-path)

if [ -z "$server_user" ] || [ -z "$server_host" ] || [ -z "$server_path" ]; then
  error "缺少部署配置，请确认 lod 中已设置 server-user、server-host、server-path"
  exit 1
fi

echo ""
printf "${GREEN}╭─────────────────────────────────────────╮${NC}\n"
printf "${GREEN}│     Teleprompter Server Deploy          │${NC}\n"
printf "${GREEN}╰─────────────────────────────────────────╯${NC}\n"
echo ""
info "目标: ${server_user}@${server_host}:${server_path}"

# ── 1. 打包 ──
step "[1/4] 打包 server 目录"

script_dir="$(cd "$(dirname "$0")" && pwd)"
tar_file="/tmp/teleprompter-server-$(date +%Y%m%d%H%M%S).tar.gz"

cd "$script_dir"
tar czf "$tar_file" \
  --exclude=node_modules \
  --exclude=deploy.sh \
  . || { error "打包失败"; exit 1; }

tar_size=$(du -h "$tar_file" | cut -f1)
success "打包完成 ($tar_size)"

# ── 2. 上传 ──
step "[2/4] 上传到服务器"

info "创建远程目录..."
ssh -o ConnectTimeout=10 "$server_user@$server_host" "mkdir -p $server_path" || {
  error "无法连接服务器，请检查网络和 SSH 配置"
  exit 1
}

info "上传文件..."
scp -q "$tar_file" "$server_user@$server_host:$server_path/" || {
  error "上传失败"
  exit 1
}

success "上传完成"

# ── 3. 远程部署 ──
step "[3/4] 服务端部署"

ssh -o ConnectTimeout=10 "$server_user@$server_host" bash -s << REMOTE
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
info()    { printf "\${CYAN}  → %s\${NC}\n" "\$1"; }
success() { printf "\${GREEN}  ✓ %s\${NC}\n" "\$1"; }
warn()    { printf "\${YELLOW}  ⚠ %s\${NC}\n" "\$1"; }
error()   { printf "\${RED}  ✗ %s\${NC}\n" "\$1"; }

cd $server_path

info "解压文件..."
tar xzf ./*.tar.gz
rm -f ./*.tar.gz
success "解压完成"

# ── 环境准备 ──
info "检查运行环境..."

ensure_nvm() {
  if [ ! -s "\$HOME/.nvm/nvm.sh" ]; then
    info "安装 nvm..."
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
    success "nvm 安装完成"
  fi
  export NVM_DIR="\$HOME/.nvm"
  [ -s "\$NVM_DIR/nvm.sh" ] && . "\$NVM_DIR/nvm.sh"
}

ensure_node() {
  if ! command -v node >/dev/null 2>&1; then
    info "安装 Node.js..."
    nvm install node
    success "Node.js 安装完成"
  fi
  nvm use node >/dev/null 2>&1 || true
}

ensure_pm2() {
  if ! command -v pm2 >/dev/null 2>&1; then
    info "安装 pm2..."
    npm install -g pm2
    success "pm2 安装完成"
  fi
}

ensure_nvm
ensure_node
ensure_pm2

node_ver=\$(node --version)
npm_ver=\$(npm --version)
success "Node \$node_ver, npm \$npm_ver"

# ── 安装依赖 ──
info "安装依赖..."
npm install --production
success "依赖安装完成"

# ── 重启服务 ──
info "重启服务..."
pm2 stop teleprompter 2>/dev/null || true
pm2 start server.js -n teleprompter
success "服务已启动"

echo ""
printf "\${GREEN}╭─────────────────────────────────────────╮\${NC}\n"
printf "\${GREEN}│     部署完成 ✓                          │\${NC}\n"
printf "\${GREEN}╰─────────────────────────────────────────╯\${NC}\n"
REMOTE

# ── 4. 清理 ──
step "[4/4] 清理"
cleanup
success "全部完成"
echo ""
