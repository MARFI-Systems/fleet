# MARFI Fleet email-link sign-in

Status: staged implementation, default OFF. This change has not been merged or deployed. Base: MARFI-Systems/fleet commit aefd54e46e081e2e805587c4ae7da2959fc1d85a.

## Scope

When `FLEET_AUTH_EMAIL_PASSWORDLESS_ENABLED=true`, normal non-SSO interactive users request an email link instead of entering a password. `/login/forgot` redirects to sign-in. SSO remains available. Existing API-only credentials and administrative forced-password-reset flows are preserved. Existing password hashes are not deleted, so rollback remains possible. Invitation and account-management password controls are not removed by this change.

Recovery administrators use `/login?recovery=1`. This only selects the UI; the server separately requires a local global administrator whose email appears in `FLEET_AUTH_EMAIL_PASSWORDLESS_RECOVERY_EMAILS` (comma-separated, default empty). Never publish those identities or put recovery passwords in source control. Verify two dedicated recovery administrators before activation. A named human or an API-only account is not a substitute.

## Resend is required for the MARFI deployment

Use the existing MARFI Systems Resend workspace and its verified `marfi.app` domain. Use a dedicated Fleet key with **Sending access**, restricted to **marfi.app**. Do not reuse another application's key or a full-access key.

Configure Fleet's existing SMTP mail transport:

| Fleet SMTP field | Value |
| --- | --- |
| enable_smtp | true |
| sender_address | fleet@marfi.app |
| server | smtp.resend.com |
| port | 465 |
| authentication_type | authtype_username_password |
| authentication_method | authmethod_plain |
| user_name | resend |
| enable_ssl_tls | true |
| enable_start_tls | false |
| verify_ssl_certs | true |
| domain | marfi.app |

Set the SMTP password using the dedicated Resend key through approved secret storage or the authenticated configuration UI. No key is included in this patch. Do not send it in chat, commit it, save it in an Obsidian note, or put it in command-line arguments/logs. Keep click/open tracking off for authentication mail; check the shared domain's current tracking settings and coordinate any domain-wide change before saving it.

Official references: https://resend.com/docs/send-with-smtp and https://resend.com/docs/create-an-api-key.

## Authentication contract

- `GET /api/v1/fleet/sso` exposes `email_passwordless_enabled` and `email_passwordless_available`.
- `POST /api/v1/fleet/login/email` accepts an email. Unknown, ineligible, cooldown-limited, or undeliverable accounts receive the same generic 202 response. IP rate limits can return 429.
- Links expire after the existing 15-minute verification-token TTL. Issuance is limited to once a minute per user while a recent token exists.
- Links use `/login/email#token=...`. The UI removes the fragment from browser history on mount and waits for an explicit confirmation click before POSTing to the existing sessions endpoint.
- Passwordless tokens use a separate prefix. Redemption rechecks eligibility and soft deletion, locks the token/user rows, deletes the token, and creates the session in one transaction.
- A failed mail send attempts to delete its issued token. Mail unavailability does not reopen ordinary password login.

## Required verification before production

1. Run full Fleet Go compilation, unit tests, MySQL/Redis-backed authentication tests, TypeScript type-check, existing Jest tests, and an end-to-end browser test against a complete checkout. Review the security-sensitive authentication changes. Local isolated UI checks and gofmt are not substitutes.
2. Build and test a MARFI fork image from the reviewed commit. The last recorded production setup uses stock `fleetdm/fleet`; changing this repository alone does not change production. Verify the current deployed image and runtime version again before release.
3. Create the scoped Resend key and save it securely. Verify an authorized test message appears as delivered in Resend and arrives in the recipient's inbox. Verify the From address and TLS settings.
4. Verify two dedicated local recovery admins, preserve an active admin session, and test a recovery login in an isolated browser session. Configure their exact emails in the recovery allowlist. Do not activate if these checks are unavailable.
5. Take a database backup and record the current image/configuration. Open the required SOC2 change record. Obtain separate approval for production authentication activation.
6. In staging, verify valid, expired, replayed, unknown-account, deleted-account, changed-to-SSO, API-only, forced-reset, concurrent-redemption, provider-failure, rate-limit, URL-prefix, and mail-scanner cases. Verify normal password login is rejected even if a client submits a password directly.
7. After approved activation, test new normal and recovery sign-ins immediately. Verify no passwordless token is captured by frontend monitoring or proxy logging. Keep recovery independent of Resend and routine email delivery.

## Rollback

Disable `FLEET_AUTH_EMAIL_PASSWORDLESS_ENABLED` and restart using the existing deployment process, or restore the previously recorded image/configuration. No schema migration or password-hash deletion is introduced. Verify normal and recovery sign-in after rollback. Restore nginx branding if Elestio regenerated the proxy configuration. No automatic production rollback is authorized by this document.

## Local verification record

- 7 isolated login-form behavior checks passed with Fleet visual components mocked.
- 5 isolated callback checks passed: no exchange on page load, fragment removal, explicit exchange, missing/failed token handling, and duplicate-click protection.
- 8 modified TypeScript/TSX files passed transpilation syntax checks, not a complete type-check.
- 15 modified Go files parsed and formatted with official Go 1.27.1 gofmt in an isolated task directory.
- Full Fleet build, backend/database tests, native Jest suite, and Resend end-to-end delivery have not run. Production must remain unchanged until the required checks pass.
