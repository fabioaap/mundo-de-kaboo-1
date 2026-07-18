'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  TASK_ROUTES,
  routeTaskIntake,
} = require('../task-intake-router');

test('routes a localized visual adjustment to quick when targets are known', () => {
  const result = routeTaskIntake({
    description: 'Adjust button spacing',
    files: ['src/components/Button.tsx'],
  });

  assert.equal(result.route, TASK_ROUTES.QUICK);
  assert.deepEqual(result.gates, [
    'scope_and_risk',
    'diff_review',
    'targeted_validation',
  ]);
});

test('routes an ordinary functional fix to standard', () => {
  const result = routeTaskIntake({
    description: 'Fix commission calculation bug',
    files: ['src/domain/commission.ts'],
  });

  assert.equal(result.route, TASK_ROUTES.STANDARD);
  assert.equal(result.requiresSpecPipeline, false);
});

test('routes authentication work to full', () => {
  const result = routeTaskIntake({
    description: 'Change authentication permissions',
    files: ['src/auth/permissions.ts'],
  });

  assert.equal(result.route, TASK_ROUTES.FULL);
  assert.equal(result.requiresSpecPipeline, true);
  assert.ok(result.evidence.fullRiskSignals.includes('authentication'));
});

test('routes database migrations to full even when described as quick', () => {
  const result = routeTaskIntake({
    description: 'Quick migration to add a customer column',
    files: ['supabase/migrations/20260717_add_customer.sql'],
    route: 'quick',
  });

  assert.equal(result.route, TASK_ROUTES.FULL);
});

test('routes a safe batch transformation to quick through fast path', () => {
  const result = routeTaskIntake({
    description: 'Bulk normalize YAML fields',
    files: ['config/a.yml', 'config/b.yml', 'config/c.yml'],
    itemCount: 3,
  });

  assert.equal(result.route, TASK_ROUTES.QUICK);
  assert.equal(result.evidence.fastPath.passed, true);
});

test('falls back to standard when quick intent has unknown targets', () => {
  const result = routeTaskIntake({
    description: 'Fix text typo',
  });

  assert.equal(result.route, TASK_ROUTES.STANDARD);
  assert.ok(result.reasons.includes('quick intent detected but target files are not known'));
});

test('supports explicit full route', () => {
  const result = routeTaskIntake({
    description: 'Review a feature request',
    files: ['src/feature.ts'],
    route: 'full',
  });

  assert.equal(result.route, TASK_ROUTES.FULL);
  assert.ok(result.reasons.includes('full route explicitly requested'));
});
