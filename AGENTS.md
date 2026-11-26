# Download IT engineering rules

Work in this repository. Use CodeGraph first when the root contains its index. Sync it after source changes. Keep documentation and source in English and user interfaces in English and Spanish.

Use pnpm exclusively. Commit its lockfile, pin tools and dependencies, disable dependency lifecycle scripts and document runtime dependency provenance and licenses. Never use Zod. Use strict TypeScript and native boundary validators. Use only relevant typecheck, lint, build, existing fast unit checks, static inspection and diff review. Do not introduce test infrastructure, mocks, browser automation, containers or integration runs.

Model threats before changing trust boundaries. Accept explicit authorized downloads only. Enforce origin, message, network, storage, resource and subprocess restrictions at the component owning the resource. Disable unsupported paths. Never collect credentials, bypass access controls, run remote JavaScript, weaken TLS or add telemetry. Keep credentials OS-protected.

After each coherent functional change update project status, validate, review the diff and inspect staged files for secrets and personal data. Commit only related changes using a focused conventional commit and the configured human Git identity. Immediately run `git push -u origin master`, verify the remote head, then continue. Never force push, change remotes or SSH configuration, add AI attribution or remove legitimate human attribution. Never publish releases, deploy or change repository settings automatically. Exclude generated media, binaries, build products, signing material and local credentials.
