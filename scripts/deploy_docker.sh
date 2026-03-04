#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-ai-sec-ui-demo}"
REPO_URL="${REPO_URL:-https://github.com/Sam20180103/AI-Sec-UI-demo.git}"
APP_DIR="${APP_DIR:-/opt/${APP_NAME}}"
BRANCH="${BRANCH:-main}"
PORT="${PORT:-4173}"

log() {
  printf "\n[deploy] %s\n" "$1"
}

error() {
  printf "\n[ERROR] %s\n" "$1" >&2
}

SUDO=""
if [[ "${EUID}" -ne 0 ]]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    error "Need root or sudo"
    exit 1
  fi
fi

log "Checking Docker installation"
if ! command -v docker >/dev/null 2>&1; then
  error "Docker not installed. Install with:"
  echo "  curl -fsSL https://get.docker.com | ${SUDO} sh"
  echo "  ${SUDO} usermod -aG docker \$USER"
  exit 1
fi

if ! command -v docker compose >/dev/null 2>&1 && ! command -v docker-compose >/dev/null 2>&1; then
  error "Docker Compose not installed. Install with:"
  echo "  ${SUDO} curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
  echo "  ${SUDO} chmod +x /usr/local/bin/docker-compose"
  exit 1
fi

DOCKER_COMPOSE="docker compose"
if ! command -v docker compose >/dev/null 2>&1; then
  DOCKER_COMPOSE="docker-compose"
fi

log "Syncing repository"
if [[ -d "${APP_DIR}/.git" ]]; then
  git -C "${APP_DIR}" remote set-url origin "${REPO_URL}"
  git -C "${APP_DIR}" fetch origin
  git -C "${APP_DIR}" checkout "${BRANCH}"
  git -C "${APP_DIR}" pull --ff-only origin "${BRANCH}" || {
    log "Pull failed, attempting rebase..."
    git -C "${APP_DIR}" rebase origin "${BRANCH}"
  }
else
  ${SUDO} mkdir -p "${APP_DIR}"
  ${SUDO} chown -R "${USER}:${USER}" "${APP_DIR}"
  git clone --branch "${BRANCH}" --depth 1 "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}"

log "Building and starting container"
PORT=${PORT} ${DOCKER_COMPOSE} up -d --build

HOST_IP="$(hostname -I | awk '{print $1}' || echo "localhost")"
log "Done"
echo
echo "App name : ${APP_NAME}"
echo "Port     : ${PORT}"
echo "URL      : http://${HOST_IP}:${PORT}"
echo
echo "Useful commands:"
echo "  cd ${APP_DIR}"
echo "  ${DOCKER_COMPOSE} logs -f"
echo "  ${DOCKER_COMPOSE} restart"
echo "  ${DOCKER_COMPOSE} down"
