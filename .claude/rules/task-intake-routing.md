# Task intake routing

Before any development edit, classify the request using `.aiox-core/development/tasks/route-task-intake.md`.

When the task description and target files are known, run:

```bash
printf '%s' '<task-json>' | node .aiox-core/scripts/route-task-intake.js
```

Follow the returned route:

1. `quick` for localized low risk work with known targets. Run scope and risk review, complete diff review, and targeted validation.
2. `standard` for bounded functional work. Use the Story Development Cycle and standard QA gate.
3. `full` for architecture, security, authentication, authorization, database, migration, API contract, infrastructure, production, billing, payment, destructive, or breaking changes. Run the Spec Pipeline before implementation and complete all gates.

A full route risk always overrides an explicit quick request. If routing fails or target files are unknown, use `standard`.
