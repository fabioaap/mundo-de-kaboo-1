# Task Intake Routing Gate

## Purpose

Classify every development request before implementation so small safe adjustments do not run the full Spec Pipeline, while risky changes cannot bypass it.

## Required inputs

Provide the task description, known target files, acceptance criteria, optional item count, and any explicit route requested by the user.

## Execution

1. Identify the intended files before choosing the quick route.
2. Run `.aiox-core/scripts/route-task-intake.js` with a JSON payload.
3. Record the returned `route`, `confidence`, `reasons`, `gates`, and `actions`.
4. Follow the selected route.

### Quick

Use for localized low risk changes with known targets, or safe deterministic batch work accepted by the Fast Path Gate.

Required gates:

1. Scope and risk
2. Complete diff review
3. Targeted validation

Do not generate a full spec for this route.

### Standard

Use for ordinary functional fixes and bounded implementation work that is not architectural or security sensitive.

Required gates:

1. Story scope
2. Implementation validation
3. QA gate

The full Spec Pipeline is optional unless scope expands.

### Full

Use whenever the request affects architecture, security, authentication, authorization, database schema, migrations, API contracts, infrastructure, production, billing, payments, destructive operations, or breaking changes.

Required gates:

1. Requirements gate
2. Complexity gate
3. Spec gate
4. Plan gate
5. Implementation gate
6. QA gate

## Fail safe behavior

If routing fails, targets are unknown, or evidence is ambiguous, use the standard route. Any detected full route risk overrides quick or standard requests.

## Example

```bash
printf '%s' '{"description":"Adjust button spacing","files":["src/components/Button.tsx"]}' \
  | node .aiox-core/scripts/route-task-intake.js
```

## Acceptance criteria

1. Every implementation records one route before editing.
2. Full route risks cannot be downgraded by an explicit quick request.
3. Quick work always includes diff review and targeted validation.
4. Routing failure never silently selects quick.
