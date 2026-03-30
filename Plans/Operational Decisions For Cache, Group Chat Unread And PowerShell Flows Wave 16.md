# Operational Decisions For Cache, Group Chat Unread And PowerShell Flows Wave 16

## Summary
- Goal: close the remaining low-risk operational decisions that were still open in `Project_todos.md` around cache policy, group-chat unread behavior and Windows PowerShell command conventions.
- Scope: documentation and repo-policy updates only; no API or UI contract breakage in this wave.
- Constraints: keep the current runtime behavior stable, avoid introducing risky production behavior changes, and document decisions in the owner/developer facing docs already used as source-of-truth.

## Key Changes
- Keep the current live cache contract for now: `HTML` remains `no-store`, while versioned brochure assets stay cached and are not moved back to `no-store` during active iteration.
- Keep project/group chat on the current lightweight unread model for now: latest-message preview and message counts remain the source of truth, while per-member unread tracking stays deferred until product pressure justifies the added state complexity.
- Codify `npm.cmd` as the canonical local command path for Windows PowerShell 5.1 in repo docs, while leaving the separate execution-policy fix as an open environment issue.

## Test Plan
- Manual: verify the updated policy text is reflected in `README.md`, `Docs/Level Lines - Architektura Techniczna.md` and `Project_todos.md`.
- Automated: run `git diff --check` after the doc-only wave.

## Assumptions
- The current asset versioning plus conservative cache window is good enough until hashed filenames/manifest-driven immutable caching is introduced later.
- Group/project chat does not yet need per-member unread state to stay usable because thread previews and message counts already cover the current workflow.
- The Windows execution-policy blocker is an environment issue, not something this repo can safely solve in code.
