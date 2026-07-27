## Summary

<!-- What does this PR do, and why? Bullet points are fine. -->

-
-

## Related issue

<!-- e.g. "Closes #123" or "N/A" -->

## Security

<!-- Skim this even for small changes - most PRs will just check "N/A", but it's a repeatable prompt rather than relying on remembering to think about it. -->

- [ ] New/changed endpoints have the right auth (`protect`) and role/ownership checks (`authorize`/`authorizeGroup` + an ownership check where relevant)
- [ ] New/changed request bodies are validated (`validateRequest` + a schema in `validators/`)
- [ ] No secrets, tokens, or credentials are hardcoded or logged in plain text
- [ ] N/A - this change doesn't touch auth, data access, or user input

## Test plan

<!-- How did you verify this works? Check off what applies, add more as needed. -->

- [ ] `npm run lint` (or the scoped `lint:backend` / `lint:frontend` / `lint:mobile`)
- [ ] `npm test` (or the scoped `test:backend` / `test:frontend` / `test:mobile`)
- [ ] Ran the real-MongoDB integration tests (`TEST_MONGODB_URI=... npm run test:backend`), if you touched backend code
- [ ] Manually exercised the change (web browser / Expo app / API client), if it affects UI or a user-facing flow
- [ ] Added or updated tests covering this change

## Screenshots

<!-- If this is a UI change, a before/after screenshot or short clip is very helpful. Delete this section if not applicable. -->
