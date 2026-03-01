#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECRET_DIR="${ROOT_DIR}/.local-secrets"
USER_FILE="${SECRET_DIR}/github_user.txt"
PAT_FILE="${SECRET_DIR}/github_pat.txt"

if [[ ! -f "${USER_FILE}" || ! -f "${PAT_FILE}" ]]; then
  echo "Missing local credentials."
  echo "Create: ${USER_FILE} and ${PAT_FILE}"
  exit 1
fi

GITHUB_USER="$(tr -d '\n\r' < "${USER_FILE}")"
GITHUB_PAT="$(tr -d '\n\r' < "${PAT_FILE}")"
REMOTE_URL="$(git remote get-url origin)"

if [[ ! "${REMOTE_URL}" =~ ^https://github.com/(.+)\.git$ ]]; then
  echo "Origin must be https://github.com/<owner>/<repo>.git"
  exit 1
fi

REPO_PATH="${BASH_REMATCH[1]}"
SAFE_REMOTE="https://github.com/${REPO_PATH}.git"
AUTH_REMOTE="https://${GITHUB_USER}:${GITHUB_PAT}@github.com/${REPO_PATH}.git"

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

cleanup() {
  git remote set-url origin "${SAFE_REMOTE}" >/dev/null 2>&1 || true
}

trap cleanup EXIT

git remote set-url origin "${AUTH_REMOTE}"
git push -u origin "${CURRENT_BRANCH}"
echo "Push completed for branch: ${CURRENT_BRANCH}"
