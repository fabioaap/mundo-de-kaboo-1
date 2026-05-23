#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="${ROOT_DIR}/dist"
PORT="${PAGES_LOCAL_SMOKE_PORT:-4173}"
HOST="127.0.0.1"
APP_URL="http://${HOST}:${PORT}/"
WIKI_URL="${APP_URL}wiki/index.html"
WIKI_FILE="${DIST_DIR}/wiki/index.html"
EXPECTED_TITLE="${PAGES_EXPECTED_TITLE:-Mundo de Kaboo}"
EXPECTED_WIKI_TEXT="${PAGES_EXPECTED_WIKI_TEXT:-Documentação da plataforma educacional Mundo de Kaboo para professores do Ensino Fundamental}"

if [[ ! -f "${DIST_DIR}/index.html" ]]; then
  echo "::error::Pages artifact missing ${DIST_DIR}/index.html"
  exit 1
fi

if [[ ! -f "${DIST_DIR}/wiki/index.html" ]]; then
  echo "::error::Pages artifact missing ${DIST_DIR}/wiki/index.html"
  exit 1
fi

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

python3 -m http.server "${PORT}" --bind "${HOST}" --directory "${DIST_DIR}" >/tmp/pages-artifact-smoke.log 2>&1 &
SERVER_PID=$!

for _ in {1..30}; do
  if curl -fsS "${APP_URL}" >/tmp/pages-artifact-home.html 2>/dev/null; then
    break
  fi
  sleep 1
done

if [[ ! -s /tmp/pages-artifact-home.html ]]; then
  echo "::error::Local Pages artifact server did not become ready at ${APP_URL}"
  [[ -f /tmp/pages-artifact-smoke.log ]] && sed -n '1,120p' /tmp/pages-artifact-smoke.log
  exit 1
fi

if ! grep -qi "<title>${EXPECTED_TITLE}</title>" /tmp/pages-artifact-home.html; then
  echo "::error::Local Pages artifact home does not contain expected title ${EXPECTED_TITLE}."
  exit 1
fi

if [[ ! -f "${WIKI_FILE}" ]]; then
  echo "::error::Local Pages artifact wiki file missing at ${WIKI_FILE}"
  exit 1
fi

if ! grep -qi "<title[^>]*>${EXPECTED_TITLE}</title>" "${WIKI_FILE}"; then
  echo "::error::Local Pages artifact wiki does not contain expected title ${EXPECTED_TITLE}."
  exit 1
fi

if ! grep -qi "${EXPECTED_WIKI_TEXT}" "${WIKI_FILE}"; then
  echo "::error::Local Pages artifact wiki does not contain expected text."
  exit 1
fi

echo "Local Pages artifact smoke check passed for ${APP_URL} and ${WIKI_URL}"
