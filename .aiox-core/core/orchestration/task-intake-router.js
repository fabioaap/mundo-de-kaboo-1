'use strict';

const { evaluateFastPath } = require('./fast-path-gate');

const TASK_ROUTES = Object.freeze({
  QUICK: 'quick',
  STANDARD: 'standard',
  FULL: 'full',
});

const DEFAULT_TASK_INTAKE_CONFIG = Object.freeze({
  enabled: true,
  maxQuickFiles: 3,
  requireKnownTargets: true,
  fallbackRoute: TASK_ROUTES.STANDARD,
});

const QUICK_PATTERNS = Object.freeze([
  { id: 'copy', pattern: /\b(copy|text|wording|label|title|subtitle|placeholder|typo|spelling)\b/i },
  { id: 'visual-style', pattern: /\b(spacing|padding|margin|gap|color|colour|font|icon|border|radius|shadow|css|class(?:name)?)\b/i },
  { id: 'localized-fix', pattern: /\b(small fix|quick fix|minor fix|adjust|tweak|align|resize|reposition)\b/i },
  { id: 'mechanical-code', pattern: /\b(import|lint|format|formatting|rename variable|rename constant)\b/i },
]);

const FULL_ROUTE_PATTERNS = Object.freeze([
  { id: 'architecture', pattern: /\b(architecture|architectural|adr|design decision|system design)\b/i },
  { id: 'security', pattern: /\b(security|secret|token|credential|pii|sensitive data)\b/i },
  { id: 'authentication', pattern: /\b(auth|authentication|authorization|permission|role|rls)\b/i },
  { id: 'database', pattern: /\b(database|schema|migration|migrate|table|column|index|stored procedure)\b/i },
  { id: 'api-contract', pattern: /\b(api contract|contract change|breaking change|public api|webhook contract)\b/i },
  { id: 'production', pattern: /\b(production|prod|release|deploy|deployment|infrastructure|billing|payment)\b/i },
  { id: 'destructive', pattern: /\b(delete data|drop table|reset database|rewrite history|destructive)\b/i },
]);

const ROUTE_GATES = Object.freeze({
  [TASK_ROUTES.QUICK]: Object.freeze([
    'scope_and_risk',
    'diff_review',
    'targeted_validation',
  ]),
  [TASK_ROUTES.STANDARD]: Object.freeze([
    'story_scope',
    'implementation_validation',
    'qa_gate',
  ]),
  [TASK_ROUTES.FULL]: Object.freeze([
    'requirements_gate',
    'complexity_gate',
    'spec_gate',
    'plan_gate',
    'implementation_gate',
    'qa_gate',
  ]),
});

function parseBoolean(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
}

function normalizePositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(1, Math.floor(number)) : fallback;
}

function normalizeRoute(value, fallback = null) {
  const route = String(value || '').trim().toLowerCase();
  return Object.values(TASK_ROUTES).includes(route) ? route : fallback;
}

function normalizeConfig(config = {}) {
  return {
    enabled: parseBoolean(config.enabled, DEFAULT_TASK_INTAKE_CONFIG.enabled),
    maxQuickFiles: normalizePositiveInteger(
      config.maxQuickFiles ?? config.max_quick_files,
      DEFAULT_TASK_INTAKE_CONFIG.maxQuickFiles,
    ),
    requireKnownTargets: parseBoolean(
      config.requireKnownTargets ?? config.require_known_targets,
      DEFAULT_TASK_INTAKE_CONFIG.requireKnownTargets,
    ),
    fallbackRoute: normalizeRoute(
      config.fallbackRoute ?? config.fallback_route,
      DEFAULT_TASK_INTAKE_CONFIG.fallbackRoute,
    ),
    fastPath: config.fastPath || config.fast_path || {},
  };
}

function normalizeTask(input = {}) {
  const task = input.task || input;
  return {
    description: String(task.description || task.summary || task.title || '').trim(),
    files: Array.isArray(task.files) ? task.files.filter(Boolean).map(String) : [],
    acceptanceCriteria: Array.isArray(task.acceptanceCriteria)
      ? task.acceptanceCriteria.map(String)
      : Array.isArray(task.acceptance_criteria)
        ? task.acceptance_criteria.map(String)
        : [],
    itemCount: Number.isFinite(task.itemCount)
      ? task.itemCount
      : Number.isFinite(task.item_count)
        ? task.item_count
        : null,
    explicitRoute: normalizeRoute(task.route || task.explicitRoute || task.explicit_route),
  };
}

function collectSignals(patterns, text) {
  return patterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ id }) => id);
}

function getTaskText(task) {
  return [task.description, ...task.acceptanceCriteria, ...task.files].join('\n');
}

function buildActions(route, fastPathResult) {
  if (route === TASK_ROUTES.QUICK) {
    return [
      'Confirm the target files and acceptance criteria before editing.',
      fastPathResult?.passed
        ? `Execute using fast-path mode: ${fastPathResult.mode}.`
        : 'Apply the smallest localized change without creating a full spec.',
      'Review the complete diff and run targeted validation before handoff.',
    ];
  }

  if (route === TASK_ROUTES.FULL) {
    return [
      'Run the Spec Pipeline before implementation.',
      'Execute the implementation plan through the standard development workflow.',
      'Require the full QA gate before completion.',
    ];
  }

  return [
    'Use the Story Development Cycle without requiring the full Spec Pipeline.',
    'Validate implementation scope and run the standard QA gate.',
  ];
}

function routeTaskIntake(input = {}) {
  const config = normalizeConfig(input.config || input.routing || {});
  const task = normalizeTask(input);
  const text = getTaskText(task);
  const quickSignals = collectSignals(QUICK_PATTERNS, text);
  const fullRiskSignals = collectSignals(FULL_ROUTE_PATTERNS, text);
  const fastPathResult = evaluateFastPath({
    task,
    config: config.fastPath,
    externalExecutorsEnabled: false,
  });

  let route = config.fallbackRoute;
  const reasons = [];

  if (!config.enabled) {
    reasons.push('task intake routing disabled by configuration');
  } else if (task.explicitRoute === TASK_ROUTES.FULL) {
    route = TASK_ROUTES.FULL;
    reasons.push('full route explicitly requested');
  } else if (fullRiskSignals.length > 0) {
    route = TASK_ROUTES.FULL;
    reasons.push(...fullRiskSignals.map((signal) => `full-route risk: ${signal}`));
  } else if (task.explicitRoute === TASK_ROUTES.STANDARD) {
    route = TASK_ROUTES.STANDARD;
    reasons.push('standard route explicitly requested');
  } else {
    const targetsKnown = !config.requireKnownTargets || task.files.length > 0;
    const localizedQuick = (
      quickSignals.length > 0 &&
      targetsKnown &&
      task.files.length <= config.maxQuickFiles
    );
    const deterministicQuick = fastPathResult.passed;

    if (task.explicitRoute === TASK_ROUTES.QUICK && targetsKnown) {
      route = TASK_ROUTES.QUICK;
      reasons.push('quick route explicitly requested with known targets');
    } else if (deterministicQuick) {
      route = TASK_ROUTES.QUICK;
      reasons.push(`fast-path gate passed in ${fastPathResult.mode} mode`);
    } else if (localizedQuick) {
      route = TASK_ROUTES.QUICK;
      reasons.push(...quickSignals.map((signal) => `localized quick signal: ${signal}`));
    } else {
      route = TASK_ROUTES.STANDARD;
      if (!targetsKnown && quickSignals.length > 0) {
        reasons.push('quick intent detected but target files are not known');
      } else {
        reasons.push('task requires standard development workflow');
      }
    }
  }

  const gates = [...ROUTE_GATES[route]];
  const confidence = route === TASK_ROUTES.FULL
    ? Math.min(1, 0.7 + fullRiskSignals.length * 0.08)
    : route === TASK_ROUTES.QUICK
      ? Math.max(fastPathResult.confidence || 0, Math.min(0.95, 0.62 + quickSignals.length * 0.08))
      : 0.6;

  return {
    route,
    confidence,
    requiresSpecPipeline: route === TASK_ROUTES.FULL,
    gates,
    reasons,
    evidence: {
      quickSignals,
      fullRiskSignals,
      fileCount: task.files.length,
      targetsKnown: task.files.length > 0,
      fastPath: fastPathResult,
    },
    actions: buildActions(route, fastPathResult),
  };
}

module.exports = {
  TASK_ROUTES,
  ROUTE_GATES,
  DEFAULT_TASK_INTAKE_CONFIG,
  routeTaskIntake,
  normalizeConfig,
  normalizeTask,
};
