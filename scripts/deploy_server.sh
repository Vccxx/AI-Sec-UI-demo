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

if [[ "${MODE}" != "preview" && "${MODE}" != "dev" ]]; then
  echo "MODE must be 'preview' or 'dev'"
  exit 1
fi

SUDO=""
if [[ "${EUID}" -ne 0 ]]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    echo "Need root or sudo to install packages and write ${APP_DIR}"
    exit 1
  fi
fi

log "Installing base packages"
${SUDO} apt-get update -y
${SUDO} apt-get install -y git curl ca-certificates

if ! command -v node >/dev/null 2>&1; then
  log "Installing Node.js ${NODE_MAJOR}"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | ${SUDO} -E bash -
  ${SUDO} apt-get install -y nodejs
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found after Node.js install"
  exit 1
fi

NODE_VERSION="$(node -v | sed 's/^v//')"
NODE_MAJOR_CURRENT="${NODE_VERSION%%.*}"
if [[ "${NODE_MAJOR_CURRENT}" -lt 18 ]]; then
  log "Upgrading Node.js to ${NODE_MAJOR} (current: ${NODE_VERSION})"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | ${SUDO} -E bash -
  ${SUDO} apt-get install -y nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  log "Installing PM2"
  ${SUDO} npm install -g pm2
fi

log "Syncing repository"
if [[ -d "${APP_DIR}/.git" ]]; then
  git -C "${APP_DIR}" fetch origin
  git -C "${APP_DIR}" checkout "${BRANCH}"
  git -C "${APP_DIR}" pull --ff-only origin "${BRANCH}"
else
  ${SUDO} mkdir -p "${APP_DIR}"
  ${SUDO} chown -R "${USER}:${USER}" "${APP_DIR}"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}"

log "Installing dependencies"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

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

if command -v ufw >/dev/null 2>&1; then
  if ufw status 2>/dev/null | grep -q "Status: active"; then
    log "Opening firewall port ${PORT}"
    ${SUDO} ufw allow "${PORT}/tcp" || true
  fi
fi

HOST_IP="$(hostname -I | awk '{print $1}')"
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
