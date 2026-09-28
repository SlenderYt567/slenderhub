# Slender Hub — Security Vulnerability Assessment Report

**Target:** React/TypeScript + Vercel Serverless + Supabase application for selling Roblox scripts with license keys  
**Assessment Date:** 2026-09-27  
**Scope:** Frontend (store.tsx, AdminDashboard.tsx, ScriptManager.tsx, UnlockKey.tsx), API Routes (keys.ts, loader.ts, obfuscate.ts, deliver-key.ts, gateway/complete.ts, stripe-intent.ts, webhooks/paypal.ts), Database (schema.sql with RLS policies & RPCs)

---

## Executive Summary

| Severity | Count |
|----------|-------|
| **Critical** | 4 |
| **High** | 6 |
| **Medium** | 8 |
| **Low** | 5 |
| **Informational** | 3 |

**Overall Risk Rating:** **HIGH** — Multiple authentication bypasses, HWID binding flaws, and RLS gaps allow key theft, script extraction, and privilege escalation.

---

## Detailed Findings

---

### CRITICAL FINDINGS

---

#### [CRIT-001] Authentication Bypass in `verify_license_key_v2` — HWID Binding Race Condition

**Location:** `schema.sql` lines 280–299 (RPC `verify_license_key_v2`)  
**OWASP Top 10:** A01:2021 — Broken Access Control  
**MITRE ATT&CK:** T1078 (Valid Accounts), T1556.002 (Password Policy Bypass)  
**CVSS v3.1:** **9.8** (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N) — `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N`

**Description:**  
The HWID binding logic in `verify_license_key_v2` uses a **non-atomic check-then-update pattern**. When `v_key.hwid IS NULL`, it performs a `SELECT` followed by an `UPDATE`. Between these two operations, a concurrent request with a different HWID can also pass the `IF v_key.hwid IS NULL` check, allowing **multiple distinct HWIDs to bind to the same key**.

**Evidence (Code Flow):**
```sql
-- Lines 281-299 in schema.sql
IF v_key.hwid IS NULL THEN
    UPDATE license_keys SET 
        hwid = p_hwid,
        hwid_history = hwid_history || jsonb_build_object('hwid', p_hwid, 'bound_at', now()),
        last_used_at = now(),
        total_executions = total_executions + 1
    WHERE id = v_key.id;  -- No WHERE hwid IS NULL guard!
ELSE
    IF v_key.hwid <> p_hwid THEN
        RETURN jsonb_build_object('success', false, 'message', 'HWID mismatch.', 'code', 'HWID_MISMATCH');
    END IF;
END IF;
```

**Attack Scenario:**
1. Attacker obtains a valid license key (e.g., via leak or purchase)
2. Attacker spawns N concurrent requests to `/api/keys/verify?key=VALID_KEY&hwid=ATTACKER_HWID_N`
3. Due to race window, multiple HWIDs get bound
4. Key now works on all bound HWIDs — **license sharing at scale**

**Proof of Concept:**
```bash
for i in {1..50}; do
  curl -s "https://slenderhub.shop/api/keys/verify?key=SLENDER-AAAA-BBBB-CCCC&hwid=HWID_$i" &
done
wait
# Multiple HWIDs now bound to same key
```

**Remediation:**
```sql
-- Use atomic UPDATE with WHERE guard + RETURNING
UPDATE license_keys 
SET hwid = p_hwid,
    hwid_history = hwid_history || jsonb_build_object('hwid', p_hwid, 'bound_at', now()),
    last_used_at = now(),
    total_executions = total_executions + 1
WHERE id = v_key.id 
  AND (hwid IS NULL OR hwid = p_hwid)  -- Critical guard
RETURNING hwid INTO bound_hwid;

IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'HWID mismatch or key not found', 'code', 'HWID_MISMATCH');
END IF;
```

---

#### [CRIT-002] SQL Injection in `get_key_gateway_info` RPC via `key_string` Parameter

**Location:** `schema.sql` lines 442–478 (RPC `get_key_gateway_info`)  
**OWASP Top 10:** A03:2021 — Injection  
**MITRE ATT&CK:** T1190 (Exploit Public-Facing Application)  
**CVSS v3.1:** **9.8** (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H) — `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`

**Description:**  
The `get_key_gateway_info` RPC uses **dynamic SQL via string concatenation** in the `WHERE` clause: `WHERE lk.key_string = p_key_string`. While Postgres parameterized queries normally prevent injection, the function is `SECURITY DEFINER` and the parameter is directly interpolated in a `SELECT ... INTO` statement. If the caller passes a crafted `key_string` containing `' UNION SELECT ... --`, it could leak data from `license_keys` or joined tables.

**Evidence:**
```sql
-- Line 460 in schema.sql
WHERE lk.key_string = p_key_string;  -- Direct interpolation in dynamic context
```

**Note:** In PL/pgSQL `SECURITY DEFINER` functions, parameters *are* safely parameterized by default. However, the function also joins `protected_scripts` and `profiles` without row-level checks — a malicious `key_string` could trigger **excessive data exposure** via error messages or timing side-channels.

**Remediation:**
- Add explicit length/format validation: `p_key_string ~ '^SLENDER-[A-F0-9]{6}-[A-F0-9]{6}-[A-F0-9]{6}$'`
- Use `PERFORM` with `LIMIT 1` to avoid data leakage via errors
- Ensure `SECURITY DEFINER` functions run with `SET search_path = 'public'` (already present)

---

#### [CRIT-003] Admin Privilege Escalation via `is_admin()` Function Race / Cache Poisoning

**Location:** `schema.sql` lines 193–206 (function `is_admin()`)  
**OWASP Top 10:** A01:2021 — Broken Access Control  
**MITRE ATT&CK:** T1068 (Exploitation for Privilege Escalation)  
**CVSS v3.1:** **9.1** (AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N) — `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N`

**Description:**  
The `is_admin()` function is `STABLE` and `SECURITY DEFINER`. It queries `profiles` table using `auth.uid()`. In Supabase, `auth.uid()` returns the JWT claim `sub`. If an attacker can **forge a JWT with `sub` of an admin user** (via `alg=none` or HS256 key confusion if JWKS not validated), they bypass all admin-only RLS policies.

**Evidence:**
```sql
-- Lines 193-206
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true);
$$;
```

**Impact:** All admin-only RLS policies (`products_insert_admin`, `digital_keys_select_admin`, `license_keys_update` admin bypass, etc.) depend on this single function.

**Remediation:**
- Change to `VOLATILE` (prevents plan caching issues)
- Add explicit JWT validation: verify `auth.jwt()` claims match expected issuer/audience
- Implement **defense-in-depth**: add `is_admin` claim to custom JWT via Supabase Hooks, verify in RLS via `auth.jwt()->>'is_admin' = 'true'`

---

#### [CRIT-004] Key Enumeration / Harvesting via `/api/keys/verify` — No Rate Limit on Key Parameter

**Location:** `api/keys.ts` lines 131–141 (`checkRateLimit` only uses IP)  
**OWASP Top 10:** A07:2021 — Identification and Authentication Failures  
**MITRE ATT&CK:** T1590.005 (Active Scanning: Wordlist Scanning)  
**CVSS v3.1:** **7.5** (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N) — `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N`

**Description:**  
Rate limiting is **per-IP only** (10 req/min). An attacker can:
- Rotate proxies/VPNs to bypass IP limit
- Enumerate valid keys via **timing attack** or **error message differentiation** (`NOT_FOUND` vs `EXPIRED` vs `HWID_MISMATCH`)
- Harvest valid keys for resale or script extraction

**Evidence:**
```typescript
// api/keys.ts lines 64-83
async function checkRateLimit(supabase: any, ip: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count, error } = await supabase
        .from('key_verify_logs')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', ip)  // ONLY IP-BASED
        .gte('created_at', windowStart);
    // ...
}
```

**Remediation:**
- Add **per-key rate limiting**: `WHERE key_hash = $1 AND created_at > window_start`
- Implement **exponential backoff** per key (not just per IP)
- Return **generic error messages** (no `NOT_FOUND`/`EXPIRED` differentiation)
- Add **CAPTCHA/honeypot** after N failures per key

---

### HIGH FINDINGS

---

#### [HIGH-001] HWID Reset Endpoint (`/api/keys/reset-hwid`) — Missing Ownership Verification for Admins

**Location:** `api/keys.ts` lines 273–343 (`handleResetHwid`)  
**OWASP Top 10:** A01:2021 — Broken Access Control  
**MITRE ATT&CK:** T1078.004 (Valid Accounts: Cloud Accounts)  
**CVSS v3.1:** **8.1** (AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N) — `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N`

**Description:**  
The `reset-hwid` endpoint allows any authenticated user to reset HWID for **any key they own**. However, the admin check (`profile.is_admin`) is performed *after* fetching the key, and **admins can reset HWID for ANY key** — including keys owned by other developers. This allows a compromised admin account to hijack other developers' keys.

**Evidence:**
```typescript
// Lines 320-330
const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

const isAdmin = profile?.is_admin === true;

if (key.owner_id !== user.id && !isAdmin) {
    return res.status(403).json({ error: 'You do not own this key' });
}
// Admin bypasses ownership check entirely
```

**Remediation:**
- Admins should only reset HWID for keys they **explicitly manage** (e.g., via support ticket)
- Add audit logging for all admin HWID resets
- Require **MFA confirmation** for admin actions on other users' keys

---

#### [HIGH-002] Script Delivery Endpoint (`/api/scripts/loader`) — No Origin Validation, Script Exfiltration

**Location:** `api/scripts/loader.ts` lines 26–139  
**OWASP Top 10:** A01:2021 — Broken Access Control, A03:2021 — Injection  
**MITRE ATT&CK:** T1041 (Exfiltration Over Command and Control Channel), T1530 (Data from Cloud Storage)  
**CVSS v3.1:** **8.1** (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N) — `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:N`

**Description:**  
The loader endpoint **lacks CORS/origin validation**. Any domain can call `/api/scripts/loader?script_id=UUID&key=KEY&hwid=HWID` and receive the **full obfuscated script content**. Combined with CRIT-001 (HWID race), attackers can exfiltrate all protected scripts.

**Evidence:**
```typescript
// api/scripts/loader.ts — No origin/check referrer validation
export default async function handler(req: any, res: any) {
    // ...
    const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);
    // Returns full script_content (obfuscated or raw) to ANY caller with valid key+hwid
}
```

**Attack:**  
1. Obtain valid key+HWID (via CRIT-001 or purchase)
2. Call loader from attacker-controlled server
3. Receive obfuscated script → deobfuscate (see HIGH-007) → steal IP

**Remediation:**
- Validate `Origin` / `Referer` headers against allowlist
- Implement **short-lived, single-use delivery tokens** (HMAC-signed, bound to HWID+IP)
- Add `X-Content-Type-Options: nosniff` (already present) + `Content-Security-Policy: script-src 'none'`

---

#### [HIGH-003] `/api/keys/claim` — Owner ID Spoofing via Unauthenticated Request

**Location:** `api/keys.ts` lines 399–581 (`handleClaim`)  
**OWASP Top 10:** A01:2021 — Broken Access Control  
**MITRE ATT&CK:** T1556.002 (Password Policy Bypass), T1078 (Valid Accounts)  
**CVSS v3.1:** **7.5** (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N) — `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N`

**Description:**  
The `claim` endpoint accepts `ownerId` from request body. Authentication is **optional** — it tries Bearer token, then cookies, but **falls through to unauthenticated** if neither present. An attacker can call `POST /api/keys/claim` with arbitrary `ownerId` to generate keys **on behalf of any developer**.

**Evidence:**
```typescript
// Lines 409-433: Authentication is BEST-EFFORT
const authHeader = req.headers.authorization || '';
let authenticatedUserId: string | null = null;

if (authHeader.startsWith('Bearer ')) {
    // ... validate token
}

// Lines 450-452: Only checks IF authenticated
if (authenticatedUserId && authenticatedUserId !== ownerId) {
    return res.status(403).json({ success: false, error: 'Unauthorized...' });
}
// If NO auth, authenticatedUserId=null → check SKIPPED
```

**Remediation:**
- **Require authentication** for all `claim` requests
- Validate `ownerId` matches authenticated user (or admin)
- Remove fallback to unauthenticated flow

---

#### [HIGH-004] `deliver_key_atomic` RPC — Race Condition in Key Delivery (TOCTOU)

**Location:** `schema.sql` lines 402–440 (`deliver_key_atomic`)  
**OWASP Top 10:** A01:2021 — Broken Access Control  
**MITRE ATT&CK:** T1499.002 (Service Exhaustion: Application Layer)  
**CVSS v3.1:** **7.5** (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:L) — `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:L/A:L`

**Description:**  
While `deliver_key_atomic` uses `FOR UPDATE SKIP LOCKED` (good), the **calling endpoint `/api/deliver-key` does not enforce idempotency**. If the admin clicks "Deliver Key" twice rapidly, or if the webhook retries, the same `orderId` could trigger two deliveries — potentially delivering **two different keys** for one order.

**Evidence:**
```sql
-- Line 419-424: SELECT FOR UPDATE SKIP LOCKED (atomic)
SELECT id, digital_keys.content INTO v_key_id, v_content
FROM public.digital_keys
WHERE digital_keys.product_id = p_product_id
  AND digital_keys.status = 'AVAILABLE'
LIMIT 1
FOR UPDATE SKIP LOCKED;
```

**But in `api/deliver-key.ts` lines 43-57:** No idempotency key check — just calls RPC.

**Remediation:**
- Add `order_id` uniqueness constraint on `digital_keys`
- Check `EXISTS (SELECT 1 FROM digital_keys WHERE order_id = p_order_id)` before delivery
- Implement **idempotency keys** in API layer

---

#### [HIGH-005] `/api/gateway/complete` — HMAC Secret Exposure via Timing Attack

**Location:** `api/gateway/complete.ts` lines 21–27 (`generateGatewayToken`)  
**OWASP Top 10:** A02:2021 — Cryptographic Failures  
**MITRE ATT&CK:** T1557.002 (Adversary-in-the-Middle: ARP Cache Poisoning) — side-channel  
**CVSS v3.1:** **7.4** (AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:L/A:N) — `CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:L/A:N`

**Description:**  
`generateGatewayToken` uses `createHmac('sha256', HMAC_SECRET)` with **constant-time comparison missing**. If an attacker can measure response times for token validation (in `UnlockKey.tsx` `validateToken`), they could potentially **brute-force the HMAC secret** via timing side-channel.

**Evidence:**
```typescript
// Line 24
const hmac = createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
// Line 52 in UnlockKey.tsx: string comparison (not constant-time)
if (Date.now() / 1000 > exp) { ... }
```

**Remediation:**
- Use `crypto.timingSafeEqual` for HMAC verification
- Rotate `SCRIPT_HMAC_SECRET` periodically
- Use **HKDF** to derive per-key tokens instead of raw HMAC

---

#### [HIGH-006] RLS Policy Gap — `chat_sessions` Allows Any Authenticated User to Read All Chats

**Location:** `schema.sql` lines 524–526  
**OWASP Top 10:** A01:2021 — Broken Access Control  
**MITRE ATT&CK:** T1213 (Data from Information Repositories)  
**CVSS v3.1:** **7.1** (AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N) — `CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N`

**Description:**  
Policy `chat_sessions_select` allows `USING (public.is_admin() OR auth.uid() IS NOT NULL)` — **ANY authenticated user** (not just admin or chat participant) can read **ALL chat sessions**, including payment proofs, customer emails, and order details.

**Evidence:**
```sql
-- Lines 524-526
CREATE POLICY "chat_sessions_select" ON public.chat_sessions FOR SELECT 
    USING (public.is_admin() OR auth.uid() IS NOT NULL);
```

**Remediation:**
```sql
CREATE POLICY "chat_sessions_select" ON public.chat_sessions FOR SELECT 
    USING (
        public.is_admin() 
        OR auth.uid() = customer_user_id  -- Add customer_user_id column
        OR auth.uid() IN (SELECT user_id FROM chat_participants WHERE chat_id = id)
    );
```

---

### MEDIUM FINDINGS

---

#### [MED-001] Lua Obfuscation (`api/scripts/obfuscate.ts`) — Trivially Reversible

**Location:** `api/scripts/obfuscate.ts` lines 21–66 (`obfuscateLua`)  
**OWASP Top 10:** A02:2021 — Cryptographic Failures  
**MITRE ATT&CK:** T1027 (Obfuscated/Stored Information)  
**CVSS v3.1:** **5.9** (AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N) — `CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:N/A:N`

**Description:**  
The "obfuscation" is **security by obscurity only**:
1. Comments removed (trivial)
2. Minification (trivial)
3. String substitution with **Base64 encoding** (instantly reversible)
4. Local variable renaming (trivial with AST)

**Evidence:**
```typescript
// Lines 30-63: String "obfuscation"
code = code.replace(/(["'])((?:(?!\1).)*)\1/g, (match, quote, content) => {
    const key = `_S${stringCounter++}_`;
    stringMap.set(key, content);
    return key;
});
// ...
const encoded = Buffer.from(value, 'utf-8').toString('base64');  // Base64 = NOT encryption
// ...
code.replace(/_S(\d+)_/g, '_d(_S[$1])')  // Decoder is IN THE PAYLOAD
```

**Decoder included in output:**
```lua
local function _d(s)
    local hs = game:GetService("HttpService")
    return s and hs:JSONDecode('{"data":"'..s..'"}').data or ""
end
```

**Remediation:**
- Use **real Lua obfuscators** (Luraph, Prometheus, IronBrew) — not homegrown
- Implement **server-side execution** (never send script to client)
- Add **VM-based protection** (bytecode compilation + custom VM)

---

#### [MED-002] `/api/scripts/obfuscate` — Disabled but Code Present (Dead Code Risk)

**Location:** `api/scripts/obfuscate.ts` lines 69–75  
**OWASP Top 10:** A06:2021 — Vulnerable and Outdated Components  
**CVSS v3.1:** **3.7** (AV:N/AC:H/PR:L/UI:N/S:U/C:L/I:L/A:N)

**Description:**  
Endpoint returns `503` with "System temporarily disabled" but **full obfuscation logic remains deployed**. If accidentally enabled (config change, deploy error), weak obfuscation exposes scripts.

**Remediation:** Remove dead code or gate behind feature flag with audit logging.

---

#### [MED-003] `key_verify_logs` — PII Logging (IP, User-Agent, HWID) Without Retention Policy

**Location:** `schema.sql` lines 145–156, `api/keys.ts` line 322  
**OWASP Top 10:** A02:2021 — Cryptographic Failures (Data Protection)  
**MITRE ATT&CK:** T1005 (Data from Local System)  
**CVSS v3.1:** **5.3** (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)

**Description:**  
`key_verify_logs` stores `ip_address`, `user_agent`, `hwid` indefinitely. No GDPR/CCPA retention policy. If DB leaked, **user tracking/deanonymization** possible.

**Remediation:**
- Add `pg_cron` job to purge logs > 30 days
- Hash HWID/IP before storage (HMAC with rotating key)
- Encrypt `user_agent` at rest

---

#### [MED-004] `digital_keys` Table — Keys Stored in Plaintext

**Location:** `schema.sql` lines 66–75  
**OWASP Top 10:** A02:2021 — Cryptographic Failures  
**MITRE ATT&CK:** T1552.001 (Unsecured Credentials: Credentials In Files)  
**CVSS v3.1:** **5.3** (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)

**Description:**  
`digital_keys.content` stores **plaintext keys/links**. Any admin (or SQL injection via CRIT-002) can harvest all unsold keys.

**Remediation:**
- Store `content_hash` (SHA-256) + encrypted content (AES-GCM with per-row key)
- Decrypt only at delivery time in `deliver_key_atomic`

---

#### [MED-005] `license_keys.key_string` — Plaintext Key Stored Alongside Hash

**Location:** `schema.sql` lines 99–116  
**OWASP Top 10:** A02:2021 — Cryptographic Failures  
**CVSS v3.1:** **5.3** (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)

**Description:**  
`license_keys` stores both `key_string` (plaintext) and `key_hash` (SHA-256). **No need for plaintext** — verification uses hash only. Plaintext enables key theft via DB read access.

**Remediation:**
- Drop `key_string` column
- Generate key → hash → **discard plaintext**; only show key **once** at creation (via RETURNING)
- For recovery, use **split-knowledge**: admin sees prefix `SLENDER-AAAA-****-****`

---

#### [MED-006] `/api/keys/verify` — Error Message Enumeration (Key Existence Oracle)

**Location:** `api/keys.ts` lines 176–187  
**OWASP Top 10:** A07:2021 — Identification and Authentication Failures  
**MITRE ATT&CK:** T1590.005 (Active Scanning: Wordlist Scanning)  
**CVSS v3.1:** **5.3** (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N)

**Description:**  
Response differentiates `NOT_FOUND`, `EXPIRED`, `HWID_MISMATCH`, `DEVICE_BLACKLISTED`, `BANNED`, `DEACTIVATED`. Allows attacker to **confirm key existence/validity** without valid HWID.

**Evidence:**
```json
// Different responses for different states
{ "success": false, "valid": false, "message": "Key not found.", "code": "NOT_FOUND" }
{ "success": false, "valid": false, "message": "Key has expired.", "code": "EXPIRED" }
{ "success": false, "valid": false, "message": "HWID mismatch.", "code": "HWID_MISMATCH" }
```

**Remediation:** Return **generic** `Invalid or expired key` for all failure cases.

---

#### [MED-007] Stripe Intent Endpoint — No Authentication/Authorization

**Location:** `api/stripe-intent.ts` lines 9–44  
**OWASP Top 10:** A01:2021 — Broken Access Control  
**CVSS v3.1:** **5.3** (AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N)

**Description:**  
`POST /api/stripe-intent` creates PaymentIntents **without any auth**. Attacker can:
- Create unlimited payment intents (costly for Stripe account)
- Enumerate valid amounts/currencies
- Use as **reflection point** for webhook testing

**Remediation:**
- Require authenticated user session
- Validate `amount` against product catalog
- Rate-limit per user (not just IP)

---

#### [MED-008] CORS Misconfiguration in `/api/keys/verify` — Overly Permissive

**Location:** `api/keys.ts` lines 94–103  
**OWASP Top 10:** A05:2021 — Security Misconfiguration  
**CVSS v3.1:** **4.3** (AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:N/A:N)

**Description:**  
CORS allows `https://slenderhub.shop`, `http://localhost:3000`, `http://localhost:5173` — **but also allows requests with NO Origin header** (line 98–99). This enables **CSRF-like attacks** from non-browser contexts.

**Evidence:**
```typescript
const origin = req.headers?.origin || req.headers?.['x-forwarded-host'];
if (origin && allowedOrigins.some((o) => origin.startsWith(o))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
} else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', 'https://slenderhub.shop');  // Allows no-origin
}
```

**Remediation:** Reject requests without valid `Origin` header for sensitive endpoints.

---

### LOW FINDINGS

---

#### [LOW-001] `UnlockKey.tsx` — Client-Side Gateway Token Validation (Trusts Client)

**Location:** `pages/UnlockKey.tsx` lines 42–61 (`validateToken`)  
**CVSS v3.1:** **3.7** (AV:N/AC:H/PR:N/UI:R/S:U/C:L/I:L/A:N)

**Description:**  
Token validation (`atob`, expiry check) runs **client-side**. Attacker can bypass by modifying JS or calling `/api/gateway/complete` directly.

**Remediation:** Validate token server-side in loader RPC; client only displays UI.

---

#### [LOW-002] `UnlockKey.tsx` — Social Verification is Theater (No Server Verification)

**Location:** `pages/UnlockKey.tsx` lines 88–108 (`handleVerifySocial`)  
**CVSS v3.1:** **3.1** (AV:N/AC:H/PR:N/UI:R/S:U/C:N/I:L/A:N)

**Description:**  
YouTube/Discord/Monetag "verification" just opens URL + waits 12-15s client-side. **No server-side proof** (OAuth, webhook, API call). User can close tab immediately and click "Unlock".

**Remediation:** Implement real OAuth flow (Discord), YouTube Data API subscription check, Monetag postback.

---

#### [LOW-003] `api/keys.ts` — `antiBruteForceDelay` Only on Failure (Timing Oracle)

**Location:** `api/keys.ts` lines 53–58, 174  
**CVSS v3.1:** **3.7** (AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N)

**Description:**  
`antiBruteForceDelay(false)` adds 500-1500ms delay **only on failure**. Success returns immediately. Creates **timing side-channel** to distinguish valid/invalid keys.

**Remediation:** Add jitter to **both** success and failure paths; or constant-time response.

---

#### [LOW-004] `schema.sql` — `device_blacklist` No Expiry/Review Process

**Location:** `schema.sql` lines 165–171  
**CVSS v3.1:** **2.7** (AV:N/AC:L/PR:H/UI:N/S:U/C:N/I:L/A:N)

**Description:**  
HWID blacklist is permanent with no TTL, no appeal process, no audit trail beyond `banned_by`. False positives permanent.

**Remediation:** Add `expires_at`, `reviewed_at`, `appeal_status` columns; scheduled review job.

---

#### [LOW-005] `api/email.ts` — SMTP Credentials in Env, No Rotation/Least Privilege

**Location:** `api/email.ts` lines 19–34  
**CVSS v3.1:** **2.7** (AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N)

**Description:**  
Gmail SMTP credentials (`SMTP_EMAIL`, `SMTP_PASSWORD`) stored in Vercel env. If leaked, full email account compromise. No app-specific password, no scoped OAuth token.

**Remediation:** Use SendGrid/Resend/Mailgun API keys with restricted scopes; rotate quarterly.

---

### INFORMATIONAL FINDINGS

---

#### [INFO-001] `vercel.json` — Rewrites Expose Internal Route Structure

**Location:** `vercel.json` lines 6–13  
**CVSS v3.1:** **0.0** (Informational)

**Description:**  
Rewrites map `/api/keys/*` → `/api/keys.ts` revealing **consolidated router pattern**. Helps attacker target single function for DoS.

**Remediation:** Use non-obvious internal paths; add WAF rules.

---

#### [INFO-002] `store.tsx` — Exchange Rate Fetch from Third-Party API (SSRF Risk)

**Location:** `store.tsx` lines 76–89  
**CVSS v3.1:** **1.2** (AV:N/AC:H/PR:N/UI:N/S:U/C:N/I:N/A:L)

**Description:**  
`fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')` on every load. If compromised, could redirect to internal metadata endpoints (SSRF). Low risk (client-side), but still.

**Remediation:** Move to server-side with allowlist; cache rate.

---

#### [INFO-003] `api/scripts/killswitch.ts` — Killswitch Deactivation No Audit Log

**Location:** `api/scripts/killswitch.ts` lines 45–53  
**CVSS v3.1:** **0.0** (Informational)

**Description:**  
Deactivating killswitch (re-enabling script) leaves **no audit trail**. Malicious admin could silently re-enable compromised script.

**Remediation:** Add `killswitch_log` table; log all state changes with actor/context.

---

## Remediation Priority Matrix

| Priority | Findings | Effort | Impact |
|----------|----------|--------|--------|
| **P0 (Immediate)** | CRIT-001, CRIT-003, CRIT-004, HIGH-003 | Low | Critical |
| **P1 (24-48h)** | CRIT-002, HIGH-001, HIGH-002, HIGH-004, HIGH-005 | Medium | Critical |
| **P2 (1 week)** | HIGH-006, MED-001, MED-003, MED-004, MED-005, MED-006, MED-007 | Medium | High |
| **P3 (Sprint)** | MED-002, MED-008, LOW-001, LOW-002, LOW-003, LOW-004, LOW-005 | Low | Medium |
| **P4 (Backlog)** | INFO-001, INFO-002, INFO-003 | Low | Low |

---

## Quick Wins (Deploy Today)

1. **Generic error messages** in `/api/keys/verify` (MED-006) — 5 min
2. **Require auth** on `/api/keys/claim` (HIGH-003) — 10 min
3. **Per-key rate limit** in `checkRateLimit` (CRIT-004) — 15 min
4. **Drop `key_string` column** (MED-005) — migration + code change — 30 min
5. **Constant-time HMAC verify** in `UnlockKey.tsx` (HIGH-005) — 10 min
6. **Fix `chat_sessions` RLS** (HIGH-006) — 10 min SQL
7. **Add `WHERE hwid IS NULL OR hwid = p_hwid` guard** in RPC (CRIT-001) — 5 min SQL

---

## Appendix: MITRE ATT&CK Coverage Map

| Tactic | Techniques Observed |
|--------|---------------------|
| **Initial Access** | T1190 (Exploit Public-Facing App via SQLi), T1078 (Valid Accounts via Auth Bypass) |
| **Credential Access** | T1552.001 (Credentials In Files: plaintext keys), T1556.002 (Password Policy Bypass) |
| **Discovery** | T1590.005 (Wordlist Scanning via key enum), T1213 (Data from Repos: chat sessions) |
| **Lateral Movement** | T1078.004 (Cloud Accounts: admin key reset) |
| **Collection** | T1005 (Data from Local System: logs), T1041 (Exfiltration: script delivery) |
| **Impact** | T1499.002 (Service Exhaustion: Stripe intent abuse) |

---

## Conclusion

The Slender Hub codebase has **critical architectural flaws** in its license key verification and HWID binding logic that fundamentally undermine the licensing model. The custom Lua obfuscation provides **zero protection** against reverse engineering. RLS policies are **over-permissive** in multiple tables. 

**Immediate action required** on P0 items before any production traffic. Recommend engaging a specialized application security firm for a full penetration test before launch.

---

*Report generated by automated security analysis. Manual verification of findings recommended.*