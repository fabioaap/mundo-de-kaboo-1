#!/usr/bin/env node
// Deterministic gate: secret scan (all selected files) + destructive-SQL guard
// (only on NEW/CHANGED migrations — never re-flags historical ones).
// Dependency-free, cross-platform (Windows Git Bash / macOS / Linux / CI).
// Exit 0 = clean. Exit 1 = violation (blocks commit/CI).
//
//   npm run qa:check                 staged files (pre-commit)
//   npm run qa:check -- --base=main  files changed vs <ref> (CI PR)
//   npm run qa:check -- --all        whole tree: secret-scan blocks,
//                                    destructive-SQL only WARNS (historical)

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';

const argv = process.argv.slice(2);
const ALL = argv.includes('--all');
const baseArg = argv.find((a) => a.startsWith('--base'));
const BASE = baseArg ? (baseArg.split('=')[1] || argv[argv.indexOf(baseArg) + 1] || '') : '';
// In --all mode, destructive SQL across the whole history is informational, not blocking.
const SQL_BLOCKS = !ALL;

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function splitLines(out) {
  return out ? out.split(/\r?\n/).filter(Boolean) : [];
}

function selectFiles() {
  if (ALL) return splitLines(git('ls-files'));
  if (BASE) return splitLines(git(`diff --name-only --diff-filter=ACM ${BASE}...HEAD`));
  return splitLines(git('diff --cached --name-only --diff-filter=ACM'));
}

// Only scan source-like files; skip generated reports, binaries, vendored trees.
const SKIP_DIR = /(^|\/)(node_modules|dist|build|coverage|playwright-report|test-results|public|assets|\.git)\//;
const SCAN_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|sql|ya?ml|md|sh|env|html|css|toml)$|(^|\/)\.env(\.|$)/;
const MAX_BYTES = 256 * 1024;

const files = selectFiles().filter((f) => {
  if (!existsSync(f)) return false;
  if (SKIP_DIR.test(f)) return false;
  if (!SCAN_EXT.test(f)) return false;
  try {
    if (statSync(f).size > MAX_BYTES) return false;
  } catch {
    return false;
  }
  return true;
});

const violations = [];
const warnings = [];

// ── 1. Secret patterns ────────────────────────────────────────────────
// always:true → block even in docs/templates (these shapes are never OK).
// always:false → block only in source/config; warn in docs/templates (examples).
const SECRET_PATTERNS = [
  { re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/, msg: 'private key block', always: true },
  { re: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/, msg: 'AWS access key id', always: true },
  { re: /\bsk-[A-Za-z0-9]{20,}\b/, msg: 'OpenAI-style secret key', always: true },
  { re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/, msg: 'GitHub token', always: true },
  { re: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/, msg: 'JWT / Supabase token', always: false },
];

// Docs and framework templates legitimately show example env assignments → warn, don't block.
function isDocOrTemplate(file) {
  return /\.md$/.test(file) || /(^|\/)\.aiox-core\//.test(file) || /(^|\/)\.claude\/skills\//.test(file);
}
// .example files may legitimately contain placeholder shapes; only flag non-empty real-looking values there.
// Line-anchored (no leading `.*`) to stay linear on minified/large lines.
const ENV_ASSIGN = /^\s*(?:export\s+)?([A-Z][A-Z0-9_]*(?:SECRET|API_KEY|TOKEN|SERVICE_ROLE_KEY|ANON_KEY))\s*=\s*(.+)$/gm;

// ── 2. Destructive SQL patterns (only inside supabase/migrations) ──────
// Simple, backtracking-safe regexes. DELETE/UPDATE-without-WHERE is checked
// per-statement below (see scanSql) to avoid catastrophic backtracking.
const SQL_BLOCK = [
  { re: /\bDROP\s+(?:TABLE|SCHEMA|DATABASE)\b/i, msg: 'DROP TABLE/SCHEMA/DATABASE' },
  { re: /\bTRUNCATE\b/i, msg: 'TRUNCATE' },
  { re: /\bCREATE\s+INDEX\s+CONCURRENTLY\b/i, msg: 'CREATE INDEX CONCURRENTLY (fails inside a migration transaction)' },
];
const SQL_WARN = [
  { re: /\bDROP\s+(?:POLICY|FUNCTION|TRIGGER)\b/i, msg: 'DROP POLICY/FUNCTION/TRIGGER' },
  { re: /\bREVOKE\b/i, msg: 'REVOKE' },
  { re: /\bALTER\s+TABLE\b[^;]*\bDROP\s+COLUMN\b/i, msg: 'ALTER TABLE … DROP COLUMN' },
];

// Per-statement DELETE/UPDATE-without-WHERE detection (linear, safe).
function scanSql(sql) {
  const hits = [];
  for (const { re, msg } of SQL_BLOCK) if (re.test(sql)) hits.push(msg);
  for (const stmt of sql.split(';')) {
    if (/\bDELETE\s+FROM\b/i.test(stmt) && !/\bWHERE\b/i.test(stmt)) hits.push('DELETE without WHERE');
    if (/\bUPDATE\s+\S+\s+SET\b/i.test(stmt) && !/\bWHERE\b/i.test(stmt)) hits.push('UPDATE without WHERE');
  }
  return hits;
}

function isExample(file) {
  return /\.example$|\.sample$/.test(file);
}
function stripSqlComments(sql) {
  return sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

for (const file of files) {
  // Block staging .env / .env.local outright (even with git add -f)
  if (/(^|\/)\.env(\.local)?$/.test(file)) {
    violations.push(`${file}: tracked .env file — secrets must never be committed`);
    continue;
  }

  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue; // binary / unreadable
  }

  // Secret scan (skip lockfiles / minified to avoid false positives)
  if (!/package-lock\.json$|\.min\.(js|css)$/.test(file)) {
    const soft = isDocOrTemplate(file); // docs/templates → warn instead of block
    for (const { re, msg, always } of SECRET_PATTERNS) {
      if (re.test(content)) {
        (always || !soft ? violations : warnings).push(`${file}: possible ${msg}`);
      }
    }
    if (!isExample(file)) {
      let m;
      ENV_ASSIGN.lastIndex = 0;
      while ((m = ENV_ASSIGN.exec(content)) !== null) {
        const val = m[2].trim().replace(/^["']|["']$/g, '');
        // ignore obvious placeholders / interpolations
        if (val && !/^(\$\{|<|your-|changeme|placeholder|xxx|\.\.\.|""|'')/i.test(val) && val.length > 8) {
          (soft ? warnings : violations).push(`${file}: hardcoded value for ${m[1]} (move to .env, which is gitignored)`);
        }
      }
    }
  }

  // Destructive SQL — only in migrations
  if (/supabase\/migrations\/.*\.sql$/.test(file)) {
    const sql = stripSqlComments(content);
    for (const msg of scanSql(sql)) {
      (SQL_BLOCKS ? violations : warnings).push(`${file}: destructive SQL — ${msg}`);
    }
    for (const { re, msg } of SQL_WARN) {
      if (re.test(sql)) warnings.push(`${file}: review SQL — ${msg}`);
    }
  }
}

if (warnings.length) {
  console.warn('\n⚠️  QA gate warnings (review, not blocking):');
  for (const w of warnings) console.warn('   - ' + w);
}

if (violations.length) {
  console.error('\n❌ QA gate BLOCKED the commit — ' + violations.length + ' violation(s):');
  for (const v of violations) console.error('   - ' + v);
  console.error('\nFix the above, or if a match is a false positive, adjust scripts/qa/check-staged.mjs.');
  console.error('Destructive migrations need explicit review/authorization before committing.\n');
  process.exit(1);
}

console.log('✅ QA gate passed (' + files.length + ' file(s) scanned).');
process.exit(0);
