## Summary

Describe the user or developer problem and the chosen solution.

## Security boundary

- [ ] No agent tool is exposed unintentionally.
- [ ] Authorization is enforced through `Nura.act` or an equivalent trusted boundary.
- [ ] Sensitive context and results are redacted or excluded.
- [ ] Destructive or irreversible operations have an explicit approval path.

## Verification

- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm test`
- [ ] `pnpm test:coverage` on Node.js 22+
- [ ] `pnpm smoke`
- [ ] Documentation and changeset updated when public behavior changes.

## Compatibility

List affected packages, runtimes, frameworks, and migration considerations.
