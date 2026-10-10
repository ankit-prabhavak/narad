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

## Added in slice 1d
| Threat | Control | Test |
|---|---|---|
| Stolen or guessed reset/verify link | 256-bit random token, only the SHA-256 hash stored; 1 h (reset) and 24 h (verify) expiry; single use via atomic claim | Replayed and expired tokens return 400 |
| Account takeover persisting after reset | Reset revokes all sessions | Old session returns 401 after reset |
| Reset-request enumeration | Always 202 with the same body; mail sent in the background; per-IP and per-email limits | Unknown and known emails give identical responses |
| Reset-link flooding | 3 per hour per email, 10 per hour per IP | 429 after the limit |
| Reset links leaking into production logs | Console mailer refuses to start in production | App fails to boot without a real mailer |

## Known gap (fix before beta)
Registration returns 409 for an existing email, which reveals that the account exists. Planned fix: always answer 202 and email the owner.
