# Threat model (Phase 1 draft)

## Assets
Account credentials, session tokens, email addresses, private-account content, moderation records.

## Initial threats and planned controls
| Threat | Control | Test planned |
|---|---|---|
| Password database theft | Argon2id hashes, never returned by the API | Response never contains hash fields |
| Credential stuffing / brute force | Per-IP and per-account rate limits | Limit returns 429 |
| Account enumeration (register, login, reset) | Same response and similar timing for known and unknown emails | Responses compared |
| Session theft | HttpOnly, Secure, SameSite cookies; server-side session records; revocation on password change | Revoked session is rejected |
| CSRF | SameSite plus CSRF token on state-changing requests | Request without token is rejected |
| Broken object-level authorization | Author and owner always derived from the session | Cross-user access returns 403/404 |
| Mass assignment | Zod allowlists on every body | Extra fields rejected |
| Secrets in logs | pino redaction of authorization and cookie headers | Log output checked |
