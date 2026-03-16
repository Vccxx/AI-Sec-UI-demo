#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-ai-sec-ui-demo}"
REPO_URL="${REPO_URL:-https://github.com/Vccxx/AI-Sec-UI-demo.git}"
APP_DIR="${APP_DIR:-/opt/${APP_NAME}}"
BRANCH="${BRANCH:-main}"
PORT="${PORT:-4173}"
MODE="${MODE:-preview}"  # preview | dev
NODE_MAJOR="${NODE_MAJOR:-20}"

log() {
  printf "\n[deploy] %s\n" "$1"
}

error() {
  printf "\n[ERROR] %s\n" "$1" >&2
}

# Detect OS type
detect_os() {
  if [[ -f /etc/os-release ]]; then
    source /etc/os-release
    case "${ID}" in
      ubuntu|debian|linuxmint|pop)
        echo "debian"
        ;;
      centos|rhel|rocky|alma|fedora)
        echo "rhel"
        ;;
      *)
        echo "unknown"
        ;;
    esac
  elif [[ -f /etc/redhat-release ]]; then
    echo "rhel"
  elif [[ -f /etc/debian_version ]]; then
    echo "debian"
  else
    echo "unknown"
  fi
}

OS_TYPE="$(detect_os)"

if [[ "${OS_TYPE}" == "unknown" ]]; then
  error "Unsupported operating system"
  exit 1
fi

log "Detected OS: ${OS_TYPE}"

if [[ "${MODE}" != "preview" && "${MODE}" != "dev" ]]; then
  error "MODE must be 'preview' or 'dev'"
  exit 1
fi

SUDO=""
if [[ "${EUID}" -ne 0 ]]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    error "Need root or sudo to install packages and write ${APP_DIR}"
    exit 1
  fi
fi

# Install base packages based on OS
log "Installing base packages"
case "${OS_TYPE}" in
  debian)
    ${SUDO} apt-get update -y
    ${SUDO} apt-get install -y git curl ca-certificates gnupg
    ;;
  rhel)
    ${SUDO} yum install -y git curl ca-certificates
    # Install EPEL for firewalld on CentOS
    if ! rpm -q epel-release >/dev/null 2>&1; then
      ${SUDO} yum install -y epel-release
    fi
    ;;
esac

# Install Node.js
if ! command -v node >/dev/null 2>&1; then
  log "Installing Node.js ${NODE_MAJOR}"
  case "${OS_TYPE}" in
    debian)
      curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | ${SUDO} -E bash -
      ${SUDO} apt-get install -y nodejs
      ;;
    rhel)
      curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR}.x" | ${SUDO} -E bash -
      ${SUDO} yum install -y nodejs
      ;;
  esac
fi

if ! command -v npm >/dev/null 2>&1; then
  error "npm not found after Node.js install"
  exit 1
fi

NODE_VERSION="$(node -v | sed 's/^v//')"
NODE_MAJOR_CURRENT="${NODE_VERSION%%.*}"
if [[ "${NODE_MAJOR_CURRENT}" -lt 18 ]]; then
  log "Upgrading Node.js to ${NODE_MAJOR} (current: ${NODE_VERSION})"
  case "${OS_TYPE}" in
    debian)
      curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | ${SUDO} -E bash -
      ${SUDO} apt-get install -y nodejs
      ;;
    rhel)
      curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR}.x" | ${SUDO} -E bash -
      ${SUDO} yum install -y nodejs
      ;;
  esac
fi

# Install PM2
if ! command -v pm2 >/dev/null 2>&1; then
  log "Installing PM2"
  ${SUDO} npm install -g pm2
fi

# Sync repository
log "Syncing repository"
if [[ -d "${APP_DIR}/.git" ]]; then
  git -C "${APP_DIR}" fetch origin
  git -C "${APP_DIR}" checkout "${BRANCH}"
  git -C "${APP_DIR}" pull --ff-only origin "${BRANCH}" || {
    log "Pull failed, attempting rebase..."
    git -C "${APP_DIR}" rebase origin "${BRANCH}" || {
      error "Failed to update repository"
      exit 1
    }
  }
else
  ${SUDO} mkdir -p "${APP_DIR}"
  ${SUDO} chown -R "${USER}:${USER}" "${APP_DIR}"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}"

# Install dependencies
log "Installing dependencies"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

# Build and start
START_CMD=""
if [[ "${MODE}" == "preview" ]]; then
  log "Building project"
  npm run build
  START_CMD="npm run preview -- --host 0.0.0.0 --port ${PORT}"
else
  START_CMD="npm run dev -- --host 0.0.0.0 --port ${PORT}"
fi

log "Starting service with PM2"
pm2 delete "${APP_NAME}" >/dev/null 2>&1 || true
pm2 start "${START_CMD}" --name "${APP_NAME}"
pm2 save

# Configure firewall based on OS
log "Configuring firewall"
case "${OS_TYPE}" in
  debian)
    if command -v ufw >/dev/null 2>&1; then
      if ufw status 2>/dev/null | grep -q "Status: active"; then
        log "Opening firewall port ${PORT} (ufw)"
        ${SUDO} ufw allow "${PORT}/tcp" || true
      fi
    fi
    ;;
  rhel)
    # Try firewalld first, then iptables
    if command -v firewall-cmd >/dev/null 2>&1; then
      if systemctl is-active --quiet firewalld 2>/dev/null; then
        log "Opening firewall port ${PORT} (firewalld)"
        ${SUDO} firewall-cmd --permanent --add-port="${PORT}/tcp" || true
        ${SUDO} firewall-cmd --reload || true
      fi
    elif command -v iptables >/dev/null 2>&1; then
      log "Opening firewall port ${PORT} (iptables)"
      ${SUDO} iptables -I INPUT -p tcp --dport "${PORT}" -j ACCEPT || true
      # Save iptables rules (CentOS 7+)
      if [[ -f /etc/sysconfig/iptables ]] || command -v iptables-save >/dev/null 2>&1; then
        ${SUDO} service iptables save >/dev/null 2>&1 || true
      fi
    fi
    ;;
esac

# Also check if SELinux is blocking (CentOS/RHEL)
if command -v getenforce >/dev/null 2>&1; then
  SELINUX_STATUS=$(getenforce 2>/dev/null || echo "Disabled")
  if [[ "${SELINUX_STATUS}" == "Enforcing" ]]; then
    log "SELinux is Enforcing - you may need to run:"
    echo "  sudo semanage port -a -t http_port_t -p tcp ${PORT}"
  fi
fi

HOST_IP="$(hostname -I | awk '{print $1}' || echo "localhost")"
log "Done"
echo "App name : ${APP_NAME}"
echo "Mode     : ${MODE}"
echo "Port     : ${PORT}"
echo "URL      : http://${HOST_IP}:${PORT}"
echo
echo "Useful commands:"
echo "  pm2 logs ${APP_NAME}"
echo "  pm2 restart ${APP_NAME}"
echo "  pm2 status"
