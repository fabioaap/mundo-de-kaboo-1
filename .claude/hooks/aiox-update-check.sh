#!/bin/bash
# SessionStart hook: warns if the AIOX Core framework installed in this
# project is behind the latest aiox-core release on npm.
# Read-only and best-effort: never blocks the session, never modifies files.
set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
VERSION_FILE="$PROJECT_DIR/.aiox-core/version.json"

# Not an AIOX project (or AIOX not installed here) - nothing to check.
if [ ! -f "$VERSION_FILE" ]; then
  exit 0
fi

INSTALLED=$(node -pe "require('$VERSION_FILE').version" 2>/dev/null || true)
if [ -z "$INSTALLED" ]; then
  exit 0
fi

# Best-effort network check; stay silent if offline or the registry is slow.
LATEST=$(timeout 5 npm view aiox-core version 2>/dev/null || true)
if [ -z "$LATEST" ] || [ "$LATEST" = "$INSTALLED" ]; then
  exit 0
fi

cat <<EOF
AIOX Core desatualizado neste projeto: instalado v$INSTALLED, disponivel v$LATEST no npm.
Rode "npx aiox-core update" para atualizar o framework de agentes (.aiox-core/, .claude/, AGENTS.md, .cursor/, .github/agents/).
EOF
