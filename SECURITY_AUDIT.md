# Security & Code Audit — BJP Nalam Thittam Portal (Detailed)

**Scope:** `backend/` (Node.js + Express + MongoDB) and `frontend/` (React + Vite)
**Date:** 2026-07-29
**Type:** Full manual source-code review — every source file was read.
**Data at risk:** Tamil Nadu voter roll (names, EPIC IDs, mobile numbers, gender, district/assembly/booth) + welfare-scheme applications + admin accounts.

> How to read this document: each finding has **Location**, **What it is**, **What it means in plain words**, **How it can be abused**, and **Fix**. Severity legend: 🔴 Critical, 🟠 High, 🟡 Medium, ⚪ Low.
>
> This is a manual review. It is not a running-app penetration test and does not include a dependency-CVE scan (`npm audit`). Recommended tooling is at the end.

---

## 1. Methodology & files reviewed

I read the code and traced each request from route → middleware → controller → database, checking the standard OWASP categories: authentication, access control, injection, secret management, data exposure, transport/session handling, and configuration. Files reviewed:

**Backend**
- `server.js`, `config/db.js`, `.env.example`, `.eslintrc.json`, `package.json`
- `middleware/authMiddleware.js`
- `controllers/`: `authController.js`, `adminController.js`, `userChatController.js`, `voterController.js`, `schemeController.js`, `referralController.js`
- `models/`: `Admin.js`, `User.js`, `OtpSession.js`, `SchemeApplication.js`
- `routes/`: all 6 route files
- `services/`: `jurisdictionService.js`, `smsService.js`, `voterSearchService.js`
- `constants/schemes.js`

**Frontend**
- `index.html`, `.env.production`, `package.json`
- `src/main.jsx`, `src/App.jsx`
- `src/api/index.js`, `src/utils/api.js`
- `src/context/AuthContext.jsx`, `src/i18n/LanguageContext.jsx`
- `src/pages/*` (Chatbot, Onboarding, Home, Profile, Requests, Referrals, Referral, admin dashboards, AdminLoginPage)
- `src/components/*`

---

## 2. Findings summary

| # | Severity | Finding | Area |
|---|----------|---------|------|
| C-1 | 🔴 Critical | Universal admin backdoor password + predictable passcodes | Backend auth |
| C-2 | 🔴 Critical | Auto-seeded default admins (`admin`/`admin`) | Backend startup |
| C-3 | 🔴 Critical | Hardcoded JWT secret fallback (also in repo) | Backend auth |
| C-4 | 🔴 Critical | Hardcoded 2Factor SMS API key in source | Backend service |
| C-5 | 🔴 Critical | Universal OTP bypass `123456` in all environments | Backend auth |
| C-6 | 🔴 Critical | Entire chat/voter API is unauthenticated (PII exposure) | Backend routes |
| C-7 | 🔴 Critical | Jurisdiction-scope bypass via query params (cross-area data) | Backend access control |
| H-1 | 🟠 High | IDOR: any admin can edit any application's status | Backend access control |
| H-2 | 🟠 High | No rate limiting / brute-force protection anywhere | Backend |
| H-3 | 🟠 High | Overly permissive CORS (`origin: true` + credentials) | Backend config |
| H-4 | 🟠 High | Regex injection / ReDoS from user input | Backend queries |
| H-5 | 🟠 High | Unauthenticated write endpoint (`register-schemes`) | Backend |
| H-6 | 🟠 High | Verbose error messages leak internals | Backend |
| H-7 | 🟠 High | Long-lived, non-revocable JWTs (30d user / 7d admin) | Backend auth |
| M-1 | 🟡 Medium | JWTs + PII stored in `localStorage` (XSS-stealable) | Frontend |
| M-2 | 🟡 Medium | No security headers (no `helmet`) | Backend |
| M-3 | 🟡 Medium | No JSON body size limit (DoS) | Backend |
| M-4 | 🟡 Medium | OTP stored in plaintext | Backend |
| M-5 | 🟡 Medium | Root `/` endpoint leaks architecture details | Backend |
| M-6 | 🟡 Medium | EPIC search reveals partial registered mobile (enumeration) | Backend |
| M-7 | 🟡 Medium | Dead/divergent API client → CSRF logic never applied | Frontend |
| M-8 | 🟡 Medium | No CSP; CDN scripts loaded without SRI | Frontend |
| M-9 | 🟡 Medium | `getMemberReferrals` has no jurisdiction scoping | Backend |
| L-1 | ⚪ Low | `.env.example` ships a real-looking secret value | Repo |
| L-2 | ⚪ Low | No input-validation layer; mass-assignment | Backend |
| L-3 | ⚪ Low | Per-request `listCollections()` fan-out (perf/DoS) | Backend |
| L-4 | ⚪ Low | Secrets must be purged from git history + rotated | Repo/Ops |
| L-5 | ⚪ Low | Credential-list endpoints return plaintext passcodes | Backend |

**Totals:** 7 Critical · 7 High · 9 Medium · 5 Low.

**Bottom line:** Do not run this in production until all Critical and High items are fixed. C-1 through C-7 together allow an anonymous attacker to become an admin, read/modify the entire voter and scheme dataset, and harvest PII.

---

## 3. Critical findings

### 🔴 C-1. Universal admin backdoor password + predictable passcodes
**Location:** `backend/services/jurisdictionService.js → authenticateDynamicAdmin()`
**What it is:** For any booth/assembly/district admin, login succeeds if the password is `'admin'` or `'BJP@2026'` (also `'60227000'`/`'60228000'` for some). The "real" passcodes are simple arithmetic: booth = `60227680 + boothNo`, assembly = `60227000 + assemblyNo`, district = `60228001 + index`. Usernames follow fixed patterns (`<slug>_admin`, `<slug>_b1`).
**Plain words:** There's a master password (`admin`) that unlocks every jurisdictional admin account, and even the "real" passwords are just numbers you can calculate.
**Abuse:** An anonymous user submits username `thiruporur_admin` + password `admin` and receives a valid ASSEMBLY_ADMIN token. Repeat for any area.
**Fix:** Remove the `'admin'` / `'BJP@2026'` / static-number acceptance entirely. Store every admin as a DB record with a bcrypt-hashed, randomly generated password. Delete the arithmetic passcode scheme.

### 🔴 C-2. Auto-seeded default admin accounts
**Location:** `backend/server.js → seedDefaultAdmins()`
**What it is:** On every startup the server creates `admin/admin` (SUPER_ADMIN), `BJP/BJP@2026` (STATE_ADMIN), and sample district/assembly/booth admins with password `BJP@2026`.
**Plain words:** The most powerful account has username `admin` and password `admin`.
**Abuse:** Log in at `/admin` with `admin` / `admin` → full SUPER_ADMIN control.
**Fix:** Remove seeding from server boot. Provision the first admin via a one-off script that reads a strong password from an env var and forces a reset on first login.

### 🔴 C-3. Hardcoded JWT secret fallback (and committed to repo)
**Location:** `authMiddleware.js`, `authController.js`, `adminController.js`, `voterController.js`, `userChatController.js` (all previously used `process.env.JWT_SECRET || '<redacted-weak-default>'`); the same weak default was committed in `backend/.env.example`.
**What it is:** If `JWT_SECRET` is not set, a well-known hardcoded value is used to sign/verify all tokens.
**Plain words:** The secret used to prove "I'm logged in as admin" is printed in the source code.
**Abuse:** An attacker signs their own token `{ isAdmin: true, role: 'SUPER_ADMIN', id: '...' }` with the known secret and is accepted by `protectAdmin`. Total auth bypass.
**Fix:** Require `JWT_SECRET` at boot and exit if missing (no fallback). Rotate the secret. Put a placeholder (`change_me`) in `.env.example`.

### 🔴 C-4. Hardcoded third-party SMS API key
**Location:** `backend/services/smsService.js` — `process.env.SMS_API_KEY || 'a43191ff-...'`
**What it is:** A real-looking 2Factor API key is embedded as a fallback.
**Plain words:** The password to your SMS provider is in the code.
**Abuse:** Anyone with the repo can send SMS on your account (cost/abuse) or exhaust the quota to block real OTPs.
**Fix:** Remove the fallback, require the env var, and rotate the key with 2Factor since it's already exposed in git history.

### 🔴 C-5. Universal OTP bypass `123456`
**Location:** `backend/controllers/userChatController.js → verifyOtp()`
**What it is:** `123456` is accepted as a valid OTP for any mobile number, regardless of `NODE_ENV`. (`authController.verifyOtp` doesn't have this, but the chat route — which the app actually uses — does.) Additionally, `devOtp` is returned whenever `NODE_ENV !== 'production'`, which is the default when the variable is unset.
**Plain words:** Type `123456` and you're "verified" as any phone number.
**Abuse:** Attacker calls `/api/verify-otp` with any mobile + `123456`, gets a 30-day user JWT, and can register/act as that person; combined with C-6 they can harvest/modify data.
**Fix:** Remove the bypass, or gate it behind both `NODE_ENV !== 'production'` and an explicit `ALLOW_DEV_OTP` flag. Never return `devOtp` unless that flag is on.

### 🔴 C-6. Entire chat/voter API is unauthenticated (mass PII exposure)
**Location:** `backend/routes/userChatRoutes.js` (no `protectUser` on any route) and `voterRoutes.js`.
Exposed publicly:
- `POST /api/validate-epic`, `POST /api/voter/search-epic` → look up **any** voter by EPIC (name, district, assembly, booth, gender).
- `GET /api/profile/:epicNo` → full user record + all their scheme applications.
- `GET /api/member-status/:ntCode`, `GET /api/my-members/:ntCode` → member PII by referral code.
- `POST /api/register-schemes` → creates users/applications with no auth (see H-5).
**Plain words:** Anyone on the internet can look up any voter's personal details, no login needed.
**Abuse:** Scripted enumeration of EPIC numbers / referral codes → bulk download of the voter database. This is a serious privacy breach and likely a legal/compliance issue for electoral data.
**Fix:** Require `protectUser` on these routes and enforce that a caller can only read *their own* profile/members (compare token identity to the requested record). Add pagination caps and rate limiting.

### 🔴 C-7. Jurisdiction-scope bypass via query parameters
**Location:** `adminController.js → getApplicationsList`, `exportApplicationsCsv`, `exportApplicationsExcel`.
**What it is:** The admin's allowed scope is computed (`getAdminScopeQuery`), but then user-supplied query params **overwrite** the same keys:
```js
const appScopeFilter = { ...adminScope };          // e.g. { district: /^CHENGALPATTU$/i }
if (isValidFilterVal(district))
  appScopeFilter.district = new RegExp('^' + district.trim() + '$', 'i'); // attacker-controlled
```
In the export functions it's even more direct (`appScopeFilter.district = district`).
**Plain words:** A district/booth admin can just add `?district=OTHER_DISTRICT` to the URL and see or export data from areas they are not allowed to.
**Abuse:** A low-privilege booth admin (obtainable anonymously via C-1) requests `/api/admin/export-csv?district=CHENNAI` and downloads a district they have no rights to. Horizontal privilege escalation → statewide data exfiltration.
**Fix:** Never let request params replace scope keys. Apply the admin scope **last** and intersect (AND) filters within it — e.g. keep `adminScope.district` fixed and only allow narrowing to a value equal to or inside the admin's jurisdiction. Reject requests that reference an out-of-scope district/assembly/booth.

---

## 4. High findings

### 🟠 H-1. IDOR — any admin can modify any application
**Location:** `adminController.js → updateApplicationStatus` (route `PUT /api/admin/applications/:id/status`, only `protectAdmin`).
**What it is:** The handler does `SchemeApplication.findById(id)` and updates it with no check that the record is within the caller's jurisdiction and no role restriction.
**Plain words:** Any logged-in admin (even the lowest booth admin) can approve/reject/alter any application in the entire state by guessing/knowing its id.
**Abuse:** A booth admin approves applications statewide, or defaces records.
**Fix:** Load the application, verify it matches `getAdminScopeQuery(req.admin)`, and restrict who may change status by role. Return 404/403 otherwise.

### 🟠 H-2. No rate limiting / brute-force protection
**Location:** All routes; especially `admin/login`, `send-otp`, `verify-otp`, `validate-epic`, `search-epic`.
**Plain words:** There's no limit on how many times someone can try passwords, OTPs, or EPIC lookups.
**Abuse:** Brute-force the 6-digit OTP (no attempt cap in `verifyOtp`), spray admin passwords, or scrape voter data at high speed.
**Fix:** Add `express-rate-limit` (per-IP and per-mobile). Cap OTP verification attempts per session (e.g. 5 then invalidate). Add lockout/backoff on admin login.

### 🟠 H-3. Overly permissive CORS
**Location:** `server.js` — `cors({ origin: true, credentials: true })`.
**Plain words:** The API trusts requests coming from any website.
**Abuse:** Any origin can call the API with credentials; broadens CSRF/abuse surface.
**Fix:** Whitelist the known frontend origins explicitly; only enable credentials for those.

### 🟠 H-4. Regex injection / ReDoS from user input
**Location:** `getApplicationsList` (`new RegExp(search.trim(), 'i')`), `exportApplicationsCsv/Excel` (`new RegExp(search, 'i')`, `{ $regex: search }`), and the `getAdminScopeQuery`/filter regexes built from `district`, `assemblyName`, `status`.
**Plain words:** User text is turned directly into a search pattern; a crafted pattern can hang the server or match unintended data.
**Abuse:** A `search` value like `(a+)+$` causes catastrophic backtracking (CPU exhaustion / DoS).
**Fix:** Escape user input before building regexes (the scheme filter already has an escape helper — apply it everywhere) or use exact `$eq` matches. Add `maxTimeMS` to queries.

### 🟠 H-5. Unauthenticated write endpoint enables data pollution
**Location:** `userChatController.js → registerSchemes` (public route).
**What it is:** Creates `User` and `SchemeApplication` documents from arbitrary body fields, with defaults like `mobile: '0000000000'`, `epicNo: 'TEMP-...'`, and no OTP/auth binding.
**Plain words:** Anyone can create fake members and applications without proving anything.
**Abuse:** Flood the database with junk, skew dashboards, or impersonate registrations.
**Fix:** Require `protectUser` + a verified OTP session tied to the token; validate/whitelist fields; reject placeholder values.

### 🟠 H-6. Verbose error disclosure
**Location:** Nearly every `catch` returns `error: error.message` (all controllers).
**Plain words:** Server error details are sent back to the client.
**Abuse:** Leaks DB/driver/stack details that help an attacker.
**Fix:** Log details server-side; return a generic message + a correlation id.

### 🟠 H-7. Long-lived, non-revocable tokens
**Location:** `generateToken` (30 days, user), `generateAdminToken` (7 days, admin). Dynamic-admin tokens (`DYNAMIC_*`) embed role/jurisdiction in the JWT with **no DB record**.
**Plain words:** Tokens stay valid for a long time and can't be cancelled early — dynamic admins especially can't be revoked.
**Fix:** Shorten lifetimes; add refresh tokens; back admin identity with a revocable DB record / token version so a compromised token can be invalidated.

---

## 5. Medium findings

### 🟡 M-1. JWTs and PII in `localStorage`
**Location:** `AuthContext.jsx`, `utils/api.js`, `ChatbotPage.jsx` (stores tokens, `bjp_user_data`, applied schemes, epic, etc.).
**Plain words:** Login tokens and personal data live in browser storage that any injected script can read.
**Abuse:** A single XSS (see M-8) steals the admin token → full account takeover.
**Fix:** Prefer httpOnly + `SameSite=Strict` cookies for tokens; minimize PII kept client-side.

### 🟡 M-2. No security headers
**Location:** `server.js` (no `helmet`).
**Fix:** Add `helmet` (HSTS, X-Content-Type-Options, frame-ancestors, referrer-policy, etc.).

### 🟡 M-3. No JSON body size limit
**Location:** `server.js` — `express.json()` with no `limit`.
**Abuse:** Large-payload memory DoS (note `register-schemes` accepts a `photo` field).
**Fix:** `express.json({ limit: '100kb' })` (raise only where needed).

### 🟡 M-4. OTP stored in plaintext
**Location:** `models/OtpSession.js`.
**Fix:** Hash the OTP (or treat the collection as highly sensitive and short-TTL — TTL already exists).

### 🟡 M-5. Root endpoint leaks architecture
**Location:** `server.js` `GET /` returns DB names, full endpoint map, internal URLs.
**Fix:** Trim to a minimal status in production.

### 🟡 M-6. EPIC search reveals partial mobile
**Location:** `voterController.js → searchEpic` — "registered under mobile ending in …1234".
**Plain words:** Confirms which EPICs are registered and leaks 4 digits of the phone.
**Fix:** Return a generic "already registered" message without the mobile fragment.

### 🟡 M-7. Dead/divergent frontend API client → CSRF never applied
**Location:** `src/api/index.js` (cookie + CSRF, `/admin/api/...`, `/api/logout`, `/api/verify/...`) vs `src/utils/api.js` (Bearer, `/api/admin/...`). Every page imports `utils/api`; `api/index.js` is **unused** and targets endpoints the backend doesn't expose.
**Plain words:** There are two API layers. The one with CSRF protection is never used; the live one has no CSRF handling. This also makes the intended security model ambiguous.
**Fix:** Delete the unused client (or reconcile to one). Decide on the token model (Bearer vs cookie) and implement CSRF only if you move to cookies.

### 🟡 M-8. No CSP; CDN assets without SRI
**Location:** `frontend/index.html` loads Bootstrap CSS/JS and Bootstrap Icons from `cdn.jsdelivr.net` with `crossorigin` but **no `integrity` (SRI)** hash, and there is no Content-Security-Policy.
**Plain words:** If the CDN is compromised or MITM'd, malicious JS runs in your app; and there's no CSP to limit damage.
**Note on XSS:** `ChatbotPage.jsx` uses `dangerouslySetInnerHTML` in two places. One (line ~3233) correctly HTML-escapes before bolding — safe. The other (line ~403) injects a translated string; safe today because translations are static, but it's a fragile pattern.
**Fix:** Add SRI hashes to CDN tags (or self-host), add a CSP header/meta, and avoid `dangerouslySetInnerHTML` where possible.

### 🟡 M-9. `getMemberReferrals` has no jurisdiction scoping
**Location:** `adminController.js → getMemberReferrals`.
**Plain words:** Any admin can query any member's referral tree regardless of area.
**Fix:** Apply `getAdminScopeQuery` to the target lookup.

---

## 6. Low findings

- **⚪ L-1.** `backend/.env.example` ships a real-looking `JWT_SECRET` value instead of a placeholder (see C-3).
- **⚪ L-2.** No input-validation layer (`zod`/`express-validator`); validation is ad-hoc; `registerSchemes`/`confirmVoterRegistration` allow mass-assignment of fields.
- **⚪ L-3.** `voterSearchService.findVoterByEpic` and name-enrichment call `listCollections()` and fan out across ~234 collections per request — performance/DoS surface. Cache collection lists; ensure `EPIC_NO` is indexed.
- **⚪ L-4.** Rotate and **purge from git history** the exposed JWT secret (C-3) and SMS key (C-4) using `gitleaks`/`git filter-repo`. `.env` is correctly gitignored (good); `frontend/.env.production` only contains the public `VITE_API_URL=https://tnbjp.org` (safe).
- **⚪ L-5.** SUPER_ADMIN credential-list endpoints (`jurisdiction-*-credentials`) return plaintext passcodes. Access is correctly limited to SUPER_ADMIN, but the underlying scheme is the weak/deterministic one from C-1 and should be replaced.

---

## 7. What's already good

- Admin passwords in `models/Admin.js` are bcrypt-hashed with a pre-save hook.
- `.env` is gitignored; only `.env.example` and the (public) `.env.production` are tracked.
- `OtpSession` uses a TTL index (auto-expire after 5 minutes).
- SUPER_ADMIN-only routes use `authorizeRoles('SUPER_ADMIN')`.
- `eslint-plugin-security` is already configured in `.eslintrc.json` — just needs to run in CI.
- The referral controller masks the mobile number in its output; the CSV export escapes quotes.
- One of the two `dangerouslySetInnerHTML` sites correctly HTML-escapes user text first.

---

## 8. Step-by-step remediation roadmap

Work top-down; each step is independently shippable.

**Phase 1 — Stop the bleeding (auth takeover). Do first.**
1. Remove `authenticateDynamicAdmin` backdoor passwords and the arithmetic passcodes (C-1).
2. Remove `seedDefaultAdmins()` from `server.js`; provision admins via a gated script (C-2).
3. Make `JWT_SECRET` mandatory — throw on boot if missing; rotate it; fix `.env.example` (C-3, L-1).
4. Remove the `123456` OTP bypass and the default `devOtp` leak (C-5).
5. Move the SMS key fully to env, rotate it (C-4).

**Phase 2 — Lock down data access.**
6. Add `protectUser` + per-user authorization to all `userChatRoutes`/`voterRoutes`; cap and paginate (C-6, H-5).
7. Fix jurisdiction scoping so query params can only narrow *within* the admin's scope, never replace it, across list + both exports (C-7).
8. Add ownership/scope + role checks to `updateApplicationStatus` and `getMemberReferrals` (H-1, M-9).

**Phase 3 — Hardening.**
9. Add `express-rate-limit` on auth/OTP/search + OTP attempt cap (H-2).
10. Lock CORS to known origins (H-3).
11. Escape all regex input / use exact matches + `maxTimeMS` (H-4).
12. Replace `error: error.message` with generic messages + correlation ids (H-6).
13. Shorten token lifetimes; add revocation for admin tokens (H-7).
14. Add `helmet`, JSON body limit, trim root endpoint, hash OTP, remove mobile fragment from EPIC search (M-2..M-6).

**Phase 4 — Frontend & repo hygiene.**
15. Delete the unused `api/index.js` client; standardize on one API layer + token model (M-7).
16. Add SRI to CDN tags + a CSP; audit `dangerouslySetInnerHTML` usage (M-8, M-1).
17. Add input validation (`zod`/`express-validator`); index `EPIC_NO`; cache collection lists (L-2, L-3).
18. Purge exposed secrets from git history (L-4).

---

## 9. Recommended tooling / follow-up

| Tool | Where it helps here |
|------|---------------------|
| **Semgrep** | Best fit. Rulesets `p/javascript`, `p/nodejs`, `p/express`, `p/owasp-top-ten`, `p/secrets` will flag hardcoded secrets (C-3/C-4), missing-auth routes (C-6), and `new RegExp(userInput)` (H-4). Quick to add to CI. |
| **CodeQL** | Deep dataflow — traces query params → `new RegExp`/Mongo filters (H-4, C-7) and tainted input reaching DB calls. Use the `javascript-security-extended` pack. |
| **gitleaks / trufflehog** | Confirm and purge the leaked JWT secret and SMS key from **git history** (L-4) — SAST tools see current code, not history. |
| **SonarQube Community** | Broad quality + security-hotspot trends; useful for the dead/divergent client (M-7) and long-term maintainability. |
| **`eslint-plugin-security` (already configured)** | Turn it on in CI now — catches many of these Node patterns for free. |
| **npm audit / OSV-Scanner / Dependabot** | Dependency CVEs — not covered by this manual review; run it. |
| **Reviewdog** | Surface Semgrep/ESLint findings inline on pull requests. |
| **OWASP ZAP / Burp Suite** | Dynamic testing to confirm the auth-bypass, scope-bypass, and PII-exposure findings end-to-end against a running instance. |
| **PR-Agent / Qodo Merge, OpenRewrite** | Optional: automated PR review; OpenRewrite for the mechanical sweep of the `JWT_SECRET` fallback out of every file. |

**Suggested CI order:** gitleaks (block secrets) → npm audit (deps) → semgrep `--config auto` (SAST) → eslint via reviewdog (inline PR feedback) → CodeQL (scheduled deep scan) → SonarQube (quality gate/trends).
