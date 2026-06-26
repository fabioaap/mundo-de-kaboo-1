#!/usr/bin/env node
'use strict';

/**
 * Claude Code PreToolUse hook — deterministic SQL governance.
 *
 * Blocks destructive SQL regardless of the path used to issue it:
 *   - Bash:  psql / supabase db push|reset / any command carrying SQL
 *   - Supabase MCP:  execute_sql / apply_migration (tool_input.query)
 *
 * Destructive = DROP TABLE/SCHEMA/DATABASE, TRUNCATE, DELETE/UPDATE without WHERE.
 * These are denied outright; the human must run them deliberately with
 * explicit authorization (prod writes require Fábio's explicit sign-off).
 *
 * Dependency-free so it runs on macOS, Linux, WSL, and Windows.
 */

const fs = require('fs');

const BLOCK_PATTERNS = [
  { re: /\bDROP\s+(?:TABLE|SCHEMA|DATABASE)\b/i, op: 'DROP TABLE/SCHEMA/DATABASE' },
  { re: /\bTRUNCATE\b/i, op: 'TRUNCATE' },
  { re: /\bsupabase\s+db\s+reset\b/i, op: 'supabase db reset (drops the database)' },
];

// Per-statement check for DELETE/UPDATE without WHERE (backtracking-safe).
function scanStatements(sql) {
  for (const stmt of sql.split(';')) {
    if (/\bDELETE\s+FROM\b/i.test(stmt) && !/\bWHERE\b/i.test(stmt)) return 'DELETE without WHERE';
    if (/\bUPDATE\s+\S+\s+SET\b/i.test(stmt) && !/\bWHERE\b/i.test(stmt)) return 'UPDATE without WHERE';
  }
  return null;
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function emitDecision(permissionDecision, permissionDecisionReason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision,
        permissionDecisionReason,
      },
    }),
  );
}

function collectText(toolInput) {
  if (!toolInput || typeof toolInput !== 'object') return '';
  // Common carriers across Bash and Supabase MCP tools.
  return [toolInput.command, toolInput.query, toolInput.sql]
    .filter((v) => typeof v === 'string')
    .join('\n');
}

function stripSqlComments(sql) {
  return sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function main() {
  let input;
  try {
    input = JSON.parse(readStdin() || '{}');
  } catch {
    return; // can't parse → stay silent, other hooks/permissions still apply
  }

  const text = collectText(input.tool_input);
  if (!text) return;

  const sql = stripSqlComments(text);
  const patternHit = BLOCK_PATTERNS.find(({ re }) => re.test(sql));
  const op = patternHit ? patternHit.op : scanStatements(sql);
  if (!op) return;

  emitDecision(
    'deny',
    `Destructive SQL blocked by sql-governance hook: ${op}. ` +
      `Run this deliberately yourself with explicit authorization — prod writes require Fábio's sign-off. ` +
      `Migrations must be reviewed; see docs/qa/HOOKS-PLAN-2026-06-25.md.`,
  );
}

if (require.main === module) {
  main();
}

module.exports = { BLOCK_PATTERNS, collectText, stripSqlComments, scanStatements };
