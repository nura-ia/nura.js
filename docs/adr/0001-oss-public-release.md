# ADR 0001: Open Source Public Release

- **Status:** Accepted
- **Date:** 2025-02-15
- **Authors:** Nura.js Maintainers

## Context

Nura.js originated as an internal experiment with ad-hoc documentation, private tooling, and vendor-specific integrations. To grow community adoption we must prepare the codebase for public visibility while protecting sensitive information.

## Decision

We will publish the repository publicly under the MIT License with the following guardrails:

- Standardize community health files (Code of Conduct, Contributing, Security, Support, Governance).
- Remove proprietary or vendor-specific integrations (e.g., Vercel analytics) and secrets.
- Establish neutral CI pipelines for build, lint, and test using GitHub Actions.
- Adopt Conventional Commits, Semantic Versioning, and Changesets for release management.
- Provide onboarding documentation (README, getting started guide, architecture overview, roadmap).

## Consequences

- Contributors have a clear process for proposing changes and understanding governance.
- Public users can evaluate project direction via docs and roadmap.
- Automated release tooling enforces version discipline and changelog quality.
- Any future vendor integrations must be optional and documented to avoid lock-in.

## Follow-Up

- Generate API reference docs with Typedoc during release builds.
- Evaluate additional CI checks (playwright, accessibility) post-public launch.
- Expand governance to include a formal steering committee once the community grows.
