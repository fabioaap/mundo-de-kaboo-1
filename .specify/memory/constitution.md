<!--
Sync Impact Report

- Version change: template -> 1.0.0
- Modified principles: [PRINCIPLE_1_NAME] -> Spec‑First Development, [PRINCIPLE_2_NAME] -> Test‑First (NON‑NEGOTIABLE), [PRINCIPLE_3_NAME] -> Security & Privacy (NON‑NEGOTIABLE), [PRINCIPLE_4_NAME] -> Observability & Error‑Handling, [PRINCIPLE_5_NAME] -> Incremental Delivery & Versioning
- Added sections: explicit Security & Privacy guidance and Development Workflow rules
- Removed sections: none
- Templates requiring updates: .specify/templates/plan-template.md ✅ updated, .specify/templates/spec-template.md ✅ updated, .specify/templates/tasks-template.md ⚠ pending review
- Follow-up TODOs: Verify `.specify/memory/` is added to `.gitignore` to avoid leaking agent memory
-->

# Adsmagic-First-AI Constitution

## Core Principles

### Spec‑First Development
Every feature, change or fix in this repository MUST be driven by a written specification. Specifications are the single source of truth for what will be built, why it is valuable, and how success will be measured. The `specs/` directory (or the feature spec produced by `/speckit.specify`) MUST contain: a short name, prioritized user journeys (P1/P2/P3), independently testable acceptance criteria, and measurable success criteria.

Rationale: a spec-driven flow prevents scope drift, improves communication with stakeholders, and enables automatic task generation and validation through the Spec Kit tooling.
<!-- Example: Every feature starts as a standalone library; Libraries must be self-contained, independently testable, documented; Clear purpose required - no organizational-only libraries -->

### Test‑First (NON‑NEGOTIABLE)
Tests are not optional: for any user-facing behavior or public contract change, tests MUST be written before implementation. Tests MUST include unit tests and, where applicable, integration or contract tests. Each spec MUST define the acceptance tests needed to prove success; the implementation phase MUST create tests that fail before code is written and pass after code is implemented.

Rationale: Test‑first prevents regressions, provides executable documentation and enables safe, incremental changes.
<!-- Example: Every library exposes functionality via CLI; Text in/out protocol: stdin/args → stdout, errors → stderr; Support JSON + human-readable formats -->

### Security & Privacy (NON‑NEGOTIABLE)
Security and privacy considerations MUST be explicit in the specification and enforced throughout implementation and review. Secrets, tokens, credentials, and PII MUST never be committed to the repository or agent memory. The repository MUST include a secrets scanning process in CI and `.gitignore` MUST exclude runtime and agent memory locations (for example `.specify/memory/`).

Rationale: This project handles OAuth and user data; establishing strict rules around secret handling and privacy reduces risk and ensures compliance with best practices.
<!-- Example: TDD mandatory: Tests written → User approved → Tests fail → Then implement; Red-Green-Refactor cycle strictly enforced -->

### Observability & Error‑Handling
All services and scripts MUST include structured logging, meaningful error messages, and sufficient telemetry to diagnose failures in production. Specifications should identify the monitoring and tracing requirements for the feature (metrics, expected alerts, and the minimum telemetry necessary to confirm success criteria).

Rationale: Clear observability requirements reduce time to diagnose incidents, improve reliability, and make it safe to iterate quickly.
<!-- Example: Focus areas requiring integration tests: New library contract tests, Contract changes, Inter-service communication, Shared schemas -->

### Incremental Delivery & Versioning
Work MUST be delivered in small, verifiable increments. Features MUST be designed to deliver measurable value per user story. Releases and breaking changes follow semantic versioning (MAJOR.MINOR.PATCH). Breaking changes to public contracts or APIs MUST be coordinated, documented in the spec, and bumped to a new MAJOR version.

Rationale: Incremental delivery reduces risk, improves the feedback loop, and keeps the codebase maintainable and predictable.
<!-- Example: Text I/O ensures debuggability; Structured logging required; Or: MAJOR.MINOR.BUILD format; Or: Start simple, YAGNI principles -->

## Additional Constraints & Security Requirements

- Secrets and credentials MUST never be stored in the repository or in `.specify/memory/`. If the agent system stores runtime state or credentials, add that path to `.gitignore` and treat it as sensitive.
- All third‑party integrations (OAuth clients, cloud provider roles, external APIs) MUST use least privilege principals and be documented in the relevant spec and the `security/` or `docs/` area where appropriate.
- Any collection or storage of personal data MUST be justified in the spec with a retention policy, the legal basis for the data, and a purge strategy.
- Dependency changes that affect security, licensing, or runtime behavior MUST be reviewed explicitly and called out in the implementation plan.
<!-- Example: Technology stack requirements, compliance standards, deployment policies, etc. -->

## Development Workflow & Review Process

- Branching and task naming: follow the project's feature-branch pattern (numeric prefix and short-name), e.g., `012-oauth-integration`. Branch names MUST map to specs in `specs/[###-short-name]/`.
- Pull requests MUST include a link to the feature spec and testing checklist, expose the acceptance tests and list explicit QA steps. PR reviewers MUST verify constitution compliance for any changes affecting required governance rules.
- Quality gates: every PR changing product behavior MUST pass the checklist derived from its spec, include passing unit/integration/contract tests, and pass CI security scans (including secret scanning and dependency scanning). PRs that violate the constitution MUST be rejected or require a constitution amendment.
- Deliverables: specs, plan, tasks, and acceptance tests MUST accompany feature PRs and be kept in-sync during the work lifecycle.
<!-- Example: Code review requirements, testing gates, deployment approval process, etc. -->

## Governance

This constitution is the authoritative guidance for project-level engineering norms and is non‑negotiable for features, specs, plans, or tasks unless explicitly amended following the process below.

Amendment procedure:

1. Propose changes by opening an issue titled "Constitution Amendment: short description".
2. Draft the amendment and add a short explanation of why it is needed and its impact on existing specs/plans.
3. Submit a PR updating `.specify/memory/constitution.md` and reference the issue. The PR MUST include a Sync Impact Report (like this one) describing changes and templates affected.
4. At least two approvers from the engineering team (or listed code owners) MUST approve the amendment. If changes are governance-critical (security, compliance, or public contract changes), three approvers are recommended including one security reviewer.
5. The author of the amendment MUST provide a migration plan if the change requires code or spec updates.

Versioning policy for constitution changes:

- MAJOR: Any change that redefines or removes a principle, or changes the project's binding governance rules.
- MINOR: New principle or material expansion of existing principle guidance that affects templates or expected deliverables.
- PATCH: Clarifications, typo fixes, or non‑semantic refinements.

Compliance checks:

- The `/speckit.plan` command and plan template MUST surface a "Constitution Check" gate — a checklist validating key principles (spec exists, tests defined, security review noted, observability defined, branch/versioning rules followed).
- Violations of MUSTs are CRITICAL and block merging; violations of SHOULDs require justification in the plan's Complexity Tracking section.

**Version**: 1.0.0 | **Ratified**: 2025-11-29 | **Last Amended**: 2025-11-29
<!-- Example: Version: 2.1.1 | Ratified: 2025-06-13 | Last Amended: 2025-07-16 -->
