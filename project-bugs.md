# FoodFlow Client — Bug & Issue Report

**Repository:** `food_flow-client` (Next.js 16.3.1 / React 19 / Better Auth / MongoDB / Stripe)
**Branch reviewed:** `sourav-nath` @ `915ad3d`
**Scope:** 229 files, ~54,600 lines under `src/` — all App Router pages, API route handlers, `src/lib`, contexts, and components.
**Date:** 2026-09-17

---

## Summary

| Severity         | Count | Theme                                                                       |
| ---------------- | ----- | --------------------------------------------------------------------------- |
| 🔴 Critical      | 14    | Authentication bypass, payment bypass, privilege escalation, leaked secrets |
| 🟠 High          | 13    | Missing authorization, data leakage, financial correctness                  |
| 🟡 Medium        | 17    | Logic bugs, dead features, state/consistency problems                       |
| 🔵 Low / Quality | 16    | Lint debt, duplication, performance, DX                                     |

**Verified tooling status**

- `npx tsc --noEmit` → **passes** (only because `any` is used ~218 times; it is not evidence of type safety).
- `npx eslint src` → **550 problems (288 errors, 262 warnings)**:
  - 218 × `@typescript-eslint/no-explicit-any`
  - 210 × `@typescript-eslint/no-unused-vars`
  - 42 × `@next/next/no-img-element`
  - 8 × `react-hooks/exhaustive-deps`
  - 1 × `react-hooks/rules-of-hooks` (**real bug**, see M-1)
  - 1 × `@typescript-eslint/no-require-imports`
  - 1 × `@next/next/no-html-link-for-pages`

**The single most important structural finding:** almost every server route in `src/app/api/**` accepts identity from the **`x-user-id` / `x-user-email` request headers** or from **query-string / body parameters**, with the Better Auth session treated as an optional "nice to have". Those headers are entirely attacker-controlled. Combined with client-side-only `RoleGuard` and no `middleware.ts`, the application currently has **no enforceable access control**.

---

## 🔴 CRITICAL

### C-1. JWTs are signed in the browser with a hard-coded secret

**Files:** `src/lib/jwt.ts:3-6`, `src/lib/jwt.ts:58-79`, `src/components/auth/JwtTokenSync.tsx:24`

```ts
const JWT_SECRET =
  process.env.JWT_SECRET || // undefined in the browser (not NEXT_PUBLIC_)
  process.env.BETTER_AUTH_SECRET || // also undefined in the browser
  "Ermde6JRPK1BwSjUnCI4H7gBKmTdq6WU"; // <-- what actually gets used, client-side
```

`generateClientToken()` calls `jwt.sign()` **inside a client component** (`JwtTokenSync` is `"use client"`, and `@/lib/jwt` is imported by seven `src/lib/api/*.ts` modules that all run in the browser). Because neither `JWT_SECRET` nor `BETTER_AUTH_SECRET` carries the `NEXT_PUBLIC_` prefix, both are replaced with `undefined` at build time in the client bundle, so the literal fallback secret is what signs every token — and it is shipped to every visitor.

**Impact:** anyone can mint a token for `{"role":"Admin","email":"victim@…"}` and present it as `Authorization: Bearer …` to the Express API (`NEXT_PUBLIC_SERVER_API_URL`). Complete authentication and authorization bypass of the whole backend. The secret is also committed in plaintext in two files.

**Fix:** delete `generateClientToken`; issue tokens **only** server-side from a verified session; remove the fallback secret entirely and fail closed when `JWT_SECRET` is unset; never import `jsonwebtoken` from a client component.

---

### C-2. `/api/auth/jwt` mints a token for any identity, with no authentication

**File:** `src/app/api/auth/jwt/route.ts:9-38`

The handler takes `id`, `email`, `role`, `phone` straight from the request body and signs them. There is no session check, no password, no proof of ownership.

```
POST /api/auth/jwt  {"email":"anyone@x.com","role":"Admin"}  →  200 {token: <valid admin JWT>}
```

**Impact:** unauthenticated privilege escalation to Admin.

**Fix:** derive the payload exclusively from `auth.api.getSession({ headers: req.headers })`; return 401 when there is no session.

---

### C-3. Users can self-assign any role (including Admin) at sign-up

**Files:** `src/lib/auth.ts:41-53`, `src/app/auth/register/page.tsx:405-413`

```ts
user: { additionalFields: { role: { type: "string", required: false, defaultValue: "Customer" } } }
```

Better Auth additional fields are **client-writable unless `input: false` is set** (confirmed in `node_modules/better-auth/dist/db/field.d.mts:27-37` — `RemoveFieldsWithInputFalse` is how a field is withheld from clients). The registration form already passes `role` through `signUp.email()`, so the value is accepted verbatim.

```
POST /api/auth/sign-up/email {"email":…, "password":…, "name":…, "role":"Admin"}
```

**Impact:** anyone can register as an Admin and, via `RoleGuard`, reach `/dashboard/admin` plus every admin API.

**Fix:** set `input: false` on `role`; assign roles server-side only. Restaurant/Rider onboarding should create a _pending application_, approved by an admin.

---

### C-4. Stripe webhook accepts unsigned payloads

**File:** `src/app/api/orders/webhook/route.ts:6-40`

```ts
if (stripe && stripeWebhookSecret && signature) { …constructEvent… }
else { event = JSON.parse(rawBody); }   // unverified path
```

`STRIPE_WEBHOOK_SECRET` is **not present in `.env` nor in `.env.example`** (verified), so the unverified branch is the one that always runs.

**Impact:** anyone can `POST /api/orders/webhook` a fabricated `checkout.session.completed` naming any `client_reference_id` and have that order flipped to `paymentStatus: "Paid"`, `orderStatus: "Confirmed"` — free food, at scale.

**Fix:** require `STRIPE_WEBHOOK_SECRET`; return 400 when the signature is missing or invalid; never parse an unverified webhook body. Also verify `session.amount_total` against the stored order total before marking it paid.

---

### C-5. Adding `?session_id=anything` to an order GET marks it paid

**File:** `src/app/api/orders/[id]/route.ts:81-122`

```ts
let shouldMarkPaid = Boolean(sessionId);        // line 83 — trusts a query param
…
} else if (targetStripeSessionId || sessionId) {
  shouldMarkPaid = true;                        // line 100 — trusts it again
}
```

`shouldMarkPaid` starts as `true` whenever the caller supplies `session_id`. Even if the Stripe lookup runs and throws (bad key, network blip, unknown session), the earlier `true` is never reset.

**Repro:** place a STRIPE order → `GET /api/orders/FF-123456-7890?session_id=x` → order becomes `Paid` / `Preparing` without a cent changing hands.

**Fix:** initialise `shouldMarkPaid = false`; set it only when a successful `checkout.sessions.retrieve()` returns `payment_status === "paid"` **and** the session's `client_reference_id` matches the order. Better: stop mutating payment state in a GET handler at all and rely solely on the (verified) webhook.

---

### C-6. Same false-positive "Paid" logic in the orders list

**File:** `src/app/api/orders/route.ts:344-381`

```ts
} else if (order.stripeSessionId) {
  // If a Stripe session ID is associated with the order, set as Paid
  isPaidInStripe = true;   // line 358
}
```

That `else` runs whenever `stripeInstance` is `null` — i.e. whenever `STRIPE_SECRET_KEY` is missing, malformed, or fails the `isValidStripeSecretKey` check. **Every pending Stripe order in the database is then bulk-marked Paid + Confirmed** the next time a customer opens their orders page.

**Fix:** remove the `else` branch. No Stripe client means "cannot verify", which must mean "leave as Pending".

---

### C-7. Order totals and line-item prices are taken from the client

**Files:** `src/app/api/orders/route.ts:63-64, 100-139, 211-238`; `src/components/dashboardComponents/customerDashboard/CustomerCheckout.tsx:249-266`

```ts
const { items, …, subtotal, deliveryFee, discount, totalAmount } = body;
const numSubtotal = Number(subtotal) || 0;
const finalTotalAmount = totalAmount ? Number(totalAmount) : Math.max(0, calculatedTotal);
…
unit_amount: Math.round((item.discountPrice || item.price) * 100)   // client-supplied price
```

Nothing is re-priced against the database. The Stripe line items are built from the **same** client-supplied prices.

**Impact:** `{"items":[{"name":"Feast","price":0.01,"quantity":1}],"subtotal":0.01,"totalAmount":0.01}` produces a real order and a real Stripe session for one cent. It also lets `discount` be set arbitrarily, which directly reduces `adminNetProfit` in the settlement maths (line 131).

**Fix:** the server must load each `foodId` from the database, use the stored price, recompute subtotal/VAT/delivery/discount, and ignore every client-supplied money field. Validate the coupon server-side and recompute its discount there (see H-6).

---

### C-8. `/api/orders/refund` performs refunds with no authorization

**File:** `src/app/api/orders/refund/route.ts:10-18, 45, 64-68`

The session is read into `sessionUser` and then **used only to label the audit string** (`refundedBy`). No role check, no ownership check, no session requirement. `amount` comes from the body and is never capped at `order.totalAmount`.

```
POST /api/orders/refund {"orderId":"FF-123456-7890","amount":999999}
```

**Impact:** any anonymous caller can issue real Stripe refunds against any order, for any amount, repeatedly (no idempotency key), and force-cancel orders.

**Fix:** require an authenticated Admin session; clamp `amount` to the unrefunded balance; add an idempotency key; reject orders already in `Refunded`.

---

### C-9. `PATCH /api/orders/[id]` is completely unauthenticated

**File:** `src/app/api/orders/[id]/route.ts:146-472`

The handler resolves a session (lines 159-168) and then **never checks it**. Any caller can, for any order id:

- cancel it and trigger a Stripe refund (lines 188-280),
- soft-delete it (lines 284-299),
- generate and email a delivery OTP (lines 302-337),
- set `orderStatus: "Delivered"`, which also forces `paymentStatus: "Paid"` (lines 384-388),
- rewrite `riderInfo` to hijack a delivery (lines 390-396).

**Impact:** total control over every order in the system by anyone who can guess an order id — and ids are guessable (see H-2).

**Fix:** require a session; authorise per action — customer may cancel only their own un-dispatched order; restaurant may set `Preparing`/`Ready` only for its own items; rider may set `Out for Delivery`/`Delivered` only for orders assigned to them; only admin may refund.

---

### C-10. Delivery OTP is readable by anyone, defeating delivery verification

**Files:** `src/app/api/orders/[id]/route.ts:63-78, 133-136, 330-336`

`GET /api/orders/[id]` has **no ownership check at all** and returns the raw order document, `deliveryOtp` included. The OTP is stored in plaintext, never expires, and is returned again in the `PATCH` response.

**Impact:** anyone who knows an order id reads the OTP and then `PATCH`es `{"orderStatus":"Delivered","otp":"<stolen>"}` — the one control that proves a handover happened is bypassed. If `order.deliveryOtp` is unset the check is skipped entirely (line 341).

**Fix:** store a hash of the OTP; never return it to anyone but the order's customer; give it a TTL; require the OTP unconditionally on the `Delivered` transition.

---

### C-11. `PATCH /api/user/profile` lets anyone edit anyone's profile

**File:** `src/app/api/user/profile/route.ts:69-134`

No session check. The target is `identifier || userId || body.email` from the body, and the write is an `updateMany` across two collections:

```ts
userCol.updateMany({ $or: query }, { $set: updateDoc });
```

**Impact:** unauthenticated mass modification of names, phone numbers and avatars. The matching `GET` (lines 5-59) is equally open, turning the endpoint into an email-to-profile lookup oracle for scraping the user base.

**Secondary crash:** `name.trim()` / `phone.trim()` (lines 99-100) throw a 500 if a non-string is sent.

**Also:** lines 119-125 fire-and-forget the same update to `NEXT_PUBLIC_SERVER_API_URL/api/admin/users/…` with no auth header and no error handling. `res1`/`res2` on line 114 are assigned and never read.

**Fix:** require a session; the target is the session user (admins excepted); use `updateOne`; validate with Zod (already a dependency).

---

### C-12. Platform settings and coupons are writable by anyone

**Files:** `src/app/api/settings/route.ts:45-89`, `src/app/api/coupons/route.ts:80-256`

`PUT /api/settings` (VAT %, commission %, delivery fee, rider payout %) and `POST`/`PATCH`/`DELETE /api/coupons` have no authentication whatsoever.

**Impact:** an attacker can set `restaurantCommissionPercentage: 0`, or create `{"code":"FREE","discountType":"percentage","discountValue":100}` and — because the order route trusts the client's `discount` (C-7) — pay nothing. Coupons drive live financial settlement.

**Fix:** admin-only session check on every mutating method.

---

### C-13. `/api/admin/transactions` exposes the whole financial ledger to anyone

**File:** `src/app/api/admin/transactions/route.ts:8-13`

```ts
const session = await auth.api.getSession({ headers: req.headers });
// We can inspect user role if available          <-- the check was never written
```

`session` is assigned and never used (an ESLint `no-unused-vars` error flags it).

**Impact:** unauthenticated dump of every order — customer names, email addresses, amounts, payment methods, refund records, plus platform-wide revenue/commission/payout aggregates.

**Fix:** require `role === "Admin"` and return 403 otherwise.

---

### C-14. Live API key hard-coded in source and shipped to the browser

**Files:** `src/components/dashboardComponents/restaurantDashboard/AddFoodForm.tsx:62-63`, `src/app/api/upload/route.ts:23-26`

```ts
const IMGBB_API_KEY =
  process.env.NEXT_PUBLIC_IMGBB_API_KEY;
```

The key is committed to git, embedded in a client component, and duplicated as a server-side fallback. `NEXT_PUBLIC_IMGBB_API_KEY` is also, by definition, public — so the configured key leaks too (`CustomerProfile.tsx:116`).

**Fix:** rotate the ImgBB key now; remove every hard-coded fallback; upload only through `/api/upload` using a server-only `IMGBB_API_KEY`.

> **Related:** `src/lib/jwt.ts:6` and `src/app/api/auth/jwt/route.ts:7` contain the same hard-coded JWT secret. `.env` is correctly git-ignored, but any secret that has ever been in it should be rotated alongside these two.

---

## 🟠 HIGH

### H-1. `x-user-id` / `x-user-email` headers are treated as proof of identity

**Files:** `src/app/api/orders/route.ts:48-52`, `.../orders/[id]/route.ts:39, 157-158, 480`, `.../orders/restaurant-orders/route.ts:12, 48-49`, `.../orders/rider-orders/route.ts:11`, `.../orders/success-orders/route.ts:13-14`, `src/lib/actions/cart.ts:16-25`, `src/lib/jwt.ts:127-134`

The pattern throughout is "session if we can get one, otherwise whatever the caller claims". `src/lib/actions/cart.ts:17-19` even documents it as the mechanism: _"The server uses these to authenticate the caller"_. Headers are chosen by the client.

**Impact:** impersonation of any user against every endpoint listed, plus the external Express API which receives the same headers.

**Fix:** delete the header fallbacks. One `requireSession(req)` helper, used everywhere, returning 401 when absent.

---

### H-2. Order IDs are guessable and not unique

**File:** `src/app/api/orders/route.ts:141-143`

```ts
const orderId = `FF-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
```

Only ~10⁴ random values, over a 6-digit truncated timestamp that wraps roughly every 16 minutes. No unique index on `orderId` anywhere in the codebase.

**Impact:** order ids can be enumerated, which turns C-9/C-10 into a practical mass attack; collisions silently create two orders sharing an id, and `findOne({orderId})` then returns an arbitrary one.

**Fix:** `crypto.randomUUID()` or a checksummed sequence; add a unique index on `orderId`.

---

### H-3. Login OTP is decorative — it is never bound to the session

**Files:** `src/app/auth/login/page.tsx:444-506`, `src/app/api/auth/login-otp/verify/route.ts:51-53`

The client calls `/api/auth/login-otp/verify`, and if it returns `success` the client then calls `signIn.email({email, password})`. Better Auth knows nothing about the OTP. Anyone can skip the UI and call `signIn.email` directly.

Worse, the verify handler sets `record.verified = true` and **deletes the record on the very next line**, so the flag can never be read by anything.

**Impact:** the advertised 2FA provides no protection at all.

**Fix:** use Better Auth's `twoFactor` / `emailOTP` plugin so the session is only issued after OTP verification. If you keep the custom flow, the server must mint the session itself after verifying the OTP, and the password must not be held in React state across steps.

---

### H-4. OTP flows are brute-forceable and not rate-limited

**Files:** `src/app/api/auth/verify-otp/route.ts`, `src/app/api/auth/login-otp/verify/route.ts`, `src/app/api/auth/login-otp/send/route.ts`, `src/app/api/auth/send-otp/route.ts`

- No attempt counter: a 6-digit OTP falls to ~10⁶ requests, and there is no lockout.
- `Math.random()` (`send-otp:46`, `login-otp/send:98`) is not cryptographically secure — use `crypto.randomInt`.
- `/api/auth/login-otp/send` verifies the password on every call with no throttle, giving an **unlimited password-guessing oracle** that bypasses Better Auth's own rate limiting.
- `/api/auth/send-otp` is an unauthenticated email-sending endpoint (spam relay / mailbox flooding).
- OTPs are printed to the server log in production (`send-otp:161,169,181`, `login-otp/send:109`).

**Fix:** max 5 attempts then invalidate; per-IP and per-email rate limits; `crypto.randomInt`; never log OTPs outside development.

---

### H-5. Password-reset OTP state lives in process memory and never expires after verification

**Files:** `src/app/api/auth/send-otp/route.ts:6-13, 196-201`, `src/app/api/auth/verify-otp/route.ts:44`, `src/app/api/auth/reset-password/route.ts:25-37`

`verify-otp` sets `record.verified = true` and leaves the record in the map. `reset-password` checks `record.verified` but **never re-checks `record.expires`** — a verified record stays usable for as long as the process lives. The store is a module-level `Map` on `globalThis`, so on any multi-instance or serverless deployment the OTP is frequently sent by one instance and verified by another, which simply fails; and every restart drops all in-flight resets.

**Impact:** on a single long-lived instance, one verification is a permanent password-reset token; on a scaled deployment, the feature is unreliable.

**Fix:** persist OTPs in MongoDB with a TTL index; issue a short-lived single-use reset token on verification; re-validate expiry in `reset-password`.

---

### H-6. Coupon validation is advisory only

**Files:** `src/app/api/coupons/apply/route.ts:55-85`, `src/app/api/orders/route.ts:103-137`

`/api/coupons/apply` computes the discount correctly, but returns it to the client — and the order route then accepts whatever `discount` the client sends, only re-checking the `isFirstOrderOnly` flag. The first-order check in `apply` is skipped entirely when `userId` is absent (line 55), and `userId` comes from the request body.

Also: `usageCount` is initialised to `0` (`coupons/route.ts:111`) and **never incremented anywhere**, and no usage cap is enforced.

**Fix:** re-resolve and re-apply the coupon inside the order transaction from the authenticated user id; atomically `$inc` `usageCount` with a `usageLimit` guard.

---

### H-7. `GET /api/orders` and `success-orders` leak other users' orders

**Files:** `src/app/api/orders/route.ts:309-310`, `src/app/api/orders/success-orders/route.ts:13`

```ts
let userId = searchParams.get("userId") || req.headers.get("x-user-id");
```

`GET /api/orders?userId=<victim>` returns their full order history: addresses, phone numbers, items, amounts. `success-orders` accepts `?userId=` the same way.

Additionally `GET /api/orders` returns `{success: true, data: []}` when it cannot identify anyone (lines 325-330) instead of 401, masking the misconfiguration.

**Fix:** ignore the query parameter; scope every query to the session user.

---

### H-8. Regex injection / ReDoS from query parameters

**Files:** `src/app/api/orders/restaurant-orders/route.ts:75`, `src/app/api/orders/success-orders/route.ts:78`

```ts
orConditions.push({
  "items.restaurantName": { $regex: new RegExp(`^${rName.trim()}$`, "i") },
});
```

`rName` can come straight from `?restaurantName=`. `.*` matches every order; a catastrophic pattern such as `(a+)+$` stalls the Node event loop.

**Fix:** escape the input, or drop the regex and rely on the exact `$in` match already present on the preceding line.

---

### H-9. Refunds are recorded as successful even when Stripe fails

**Files:** `src/app/api/orders/refund/route.ts:71-101`, `src/app/api/orders/[id]/route.ts:223-254`

The Stripe error is swallowed with `console.warn`, then a synthetic id (`REF-STRIPE-123456`) is written and `paymentStatus` is set to `"Refunded"` with `status: "Completed"`. A refund confirmation email goes out.

**Impact:** the database and the customer both say "refunded" while the money never moved. Silent financial divergence.

**Fix:** on a Stripe failure, return an error and leave the order untouched (or mark `RefundFailed` for retry). Never synthesise a refund id for a card payment.

---

### H-10. Stripe charges the wrong amount, in the wrong currency

**File:** `src/app/api/orders/route.ts:211-254`

The Checkout session contains item prices and the delivery fee only — **VAT is never charged and the coupon discount is never applied**, while the order document stores `totalAmount = subtotal + VAT + delivery − discount`. The two numbers disagree on every order that has VAT or a coupon.

Separately, `currency: "usd"` is hard-coded while the entire UI, emails and invoices are denominated in Taka (`৳` / `Tk` — e.g. `CustomerCheckout.tsx:603,711`, `refund/route.ts:119`).

**Impact:** a ৳1,000 order is charged as **$1,000 USD** (~120× overcharge), and the amount charged never matches the amount recorded.

**Fix:** charge a single line item equal to the server-computed total (or add explicit VAT/discount lines); set `currency: "bdt"`; assert `amount_total === totalAmount` in the webhook.

---

### H-11. Unauthenticated file upload with no size limit and a base64 fallback into MongoDB

**File:** `src/app/api/upload/route.ts:3-94`

No session check, no size cap, no magic-byte validation (only the client-declared `file.type`). When ImgBB fails, line 75 returns a `data:` URI of the entire file, which callers then persist as a document field.

**Impact:** an open image-relay burning someone else's ImgBB quota; oversized base64 blobs that will breach MongoDB's 16 MB document limit and bloat every subsequent query response.

**Fix:** require a session; cap request size and count; sniff the actual content type; on upload failure return an error rather than an inline blob.

---

### H-12. `/api/ai-image-edit` is an unauthenticated paid-API proxy

**File:** `src/app/api/ai-image-edit/route.ts:318-389`

The SSRF hardening here is genuinely good (`isPrivateHostname`, per-redirect re-validation, size caps). What is missing is any authentication or quota: every call spends real OpenRouter credit.

**Impact:** an attacker can drain the account balance in minutes.

**Fix:** require a Restaurant-role session and add a per-user rate limit. (Minor: line 455 returns HTTP 200 for a failure result; and `GEMINI_API_KEY` / `GEMINI_MODEL` / `GEMINI_API_BASE` in `.env` are no longer read anywhere.)

---

### H-13. Route protection exists only in the browser

**Files:** `src/components/common/RoleGuard.tsx`, `src/app/dashboard/*/layout.tsx`; **no** `middleware.ts` / `proxy.ts` anywhere

`RoleGuard` is a `"use client"` component that decides access from `useSession()`. It controls what is _painted_, not what is _fetched_. With the API routes unguarded (C-8 … C-13), the guard is cosmetic.

Two concrete gaps even in the UI layer:

- There is no `src/app/dashboard/layout.tsx`, so `/dashboard/profile` (renders `CustomerProfile`) is unguarded, as are `/checkout`, `/order-success` and `/order-tracking/[orderId]` which sit outside `/dashboard` entirely.
- `isRoleAllowed` uses substring matching (`RoleGuard.tsx:47-50`): a user whose role is `"Restaurant Admin"` satisfies `admin`, and `"non-admin"` would too.

**Fix:** add `middleware.ts` for coarse redirects, enforce authorization in every route handler, and switch role matching to exact comparison against a closed enum.

---

## 🟡 MEDIUM

### M-1. React hook called inside a loop — Rules of Hooks violation

**File:** `src/components/stats/StatsCounter.tsx:148-154`

```tsx
{stats.map((stat) => {
  const animatedValue = useCountUp(stat.raw, 2000, inView);   // hook inside a callback
```

ESLint flags this as an error. It happens to work only because `stats` is a fixed-length module constant; the moment the array becomes dynamic (or is filtered), hook order changes between renders and React will throw or silently mix up state.

**Fix:** extract a `<StatCard stat={…} inView={…} />` component that calls the hook at its own top level.

---

### M-2. `DEFAULT_SETTINGS` is mutated by the Mongo driver, breaking the second insert

**File:** `src/app/api/settings/route.ts:4-22`

`insertOne(DEFAULT_SETTINGS)` mutates the passed object by attaching the generated `_id`. `DEFAULT_SETTINGS` is a module-level constant, so a second insert in the same process retries with the _same_ `_id` and fails with a duplicate-key error. `updatedAt` is also frozen at module-load time.

**Fix:** `insertOne({ ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() })`, and prefer an idempotent `updateOne(..., { upsert: true })`. Add a unique index on `key` — the current read-then-insert is a race that can create duplicate settings documents.

---

### M-3. A read endpoint performs writes on every request

**File:** `src/app/api/coupons/route.ts:12-28`

`GET /api/coupons` runs an unconditional `updateMany({code:"WELCOME30"}, …)` data migration on every single call.

**Fix:** run the migration once as a script; remove it from the request path.

---

### M-4. `sendEmail` reports success when nothing was sent

**File:** `src/lib/email.ts:171-178`

After every provider fails (or when none is configured), the function logs to the console and `return true`.

**Impact:** callers persist `confirmationEmailSent: true` (`orders/route.ts:183`, `orders/[id]/route.ts:128`) for emails that were never delivered, and the retry-on-next-fetch logic is permanently disabled for those orders.

**Fix:** return `false` on failure; only set the flag when a provider acknowledged the send.

---

### M-5. HTML injection into transactional emails

**File:** `src/lib/email.ts:233-248` (and the other ~8 templates in the file)

```ts
${item.name}
<span …>Store: ${item.restaurantName}</span>
```

Food names, restaurant names, customer names and addresses are interpolated into email HTML with no escaping. All of those originate from user input (restaurant owners create menu items; customers type addresses).

**Impact:** a menu item named `<a href="http://evil">Click</a>` produces a phishing link inside an email sent from your domain.

**Fix:** an `escapeHtml()` helper applied to every interpolated value.

---

### M-6. `freeDeliveryThreshold` is configurable but never applied

**Files:** `src/app/api/settings/route.ts:10`, `src/components/dashboardComponents/adminDashboard/AdminSettings.tsx:415`, `src/components/dashboardComponents/customerDashboard/CustomerCheckout.tsx:150`

The admin can set it and it is persisted, but the only delivery-fee calculation in the codebase is `activeSubtotal === 0 ? 0 : deliveryFeeBase`. The threshold is read by nothing.

**Fix:** apply it (server-side, per C-7) or remove the setting from the admin UI.

---

### M-7. Orders are created before payment and never reconciled

**File:** `src/app/api/orders/route.ts:173-254`

The order document is inserted _before_ the Checkout session exists. An abandoned checkout leaves a permanent `Placed` / `Pending` order.

**Impact:** the orders collection accumulates ghost orders; they count toward the first-order coupon check (`route.ts:111-115`), so abandoning one checkout silently burns the customer's welcome coupon.

**Fix:** create the order as `Draft`, promote it on webhook confirmation, and expire drafts on a schedule. Exclude non-confirmed orders from the first-order check.

---

### M-8. `DELETE /api/orders/[id]` fails open

**File:** `src/app/api/orders/[id]/route.ts:506-511`

```ts
if (userId && order.userId && order.userId !== userId) {
  return 403;
}
```

Omit the `x-user-id` header and have no session → `userId` is null → the guard is skipped and the delete proceeds.

**Fix:** `if (!userId || order.userId !== userId) return 403`.

---

### M-9. Read-modify-write races on order state

**Files:** `src/app/api/orders/[id]/route.ts:178-254, 399-400`, `.../refund/route.ts:36-102`

Every mutation is `findOne` → decide → `updateOne` → `findOne`, with no transaction, no optimistic-concurrency token and no status precondition in the update filter.

**Impact:** two concurrent cancels issue two refunds; a status can move backwards (`Delivered` → `Preparing`); a rider assignment can be overwritten mid-delivery.

**Fix:** `findOneAndUpdate` with the expected current status in the filter, and reject when the update matches nothing.

---

### M-10. Two independent MongoDB connection pools

**Files:** `src/lib/db.ts`, `src/lib/mongodb.ts`, plus a third client in `src/lib/auth.ts:15`

Three near-identical connection modules with two different global cache keys (`_mongoDbClientPromise` vs `_mongoClientPromise`). Routes mix them freely — `send-otp` uses `@/lib/mongodb`, `user/profile` uses `@/lib/db`.

Also `src/lib/auth.ts:16` hard-codes `client.db("food-delivery-platform")`, ignoring `DB_NAME`, while `db.ts`/`mongodb.ts` honour it. If `DB_NAME` is ever changed, Better Auth writes to one database and the rest of the app reads from another.

**Fix:** one connection module; one `DB_NAME` source of truth.

---

### M-11. `getDb()` retry logic can spawn unbounded clients

**Files:** `src/lib/db.ts:36-47`, `src/lib/mongodb.ts:38-48`

On failure the catch builds a brand-new `MongoClient` on every call without closing the previous one, and the caught `err` is discarded (ESLint `no-unused-vars` warning) so the real cause never reaches the logs.

**Fix:** log the error; use a single reconnect-with-backoff path; let the driver's own pool handle retries.

---

### M-12. `authClient` reads a server-only environment variable

**File:** `src/lib/auth-client.ts:3-5`

```ts
createAuthClient({ baseURL: process.env.BETTER_AUTH_URL });
```

`BETTER_AUTH_URL` has no `NEXT_PUBLIC_` prefix, so this is always `undefined` in the browser. It currently works only because Better Auth falls back to the page origin — but `NEXT_PUBLIC_BETTER_AUTH_URL` **is** defined in `.env` and is referenced exactly once in the codebase, which suggests the intent was to use it here.

**Fix:** `baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL`.

---

### M-13. `leaveOrderRoom` never tells the server

**File:** `src/lib/socket.ts:62-65`

It removes the id from the local `activeRooms` set but emits no `leave_room`. The server keeps the socket subscribed, so the client keeps receiving updates for orders it has navigated away from — and never stops until a full disconnect. There is also no auth handshake on the socket, and `joinOrderRoom` accepts any order id.

**Fix:** emit a leave event; authenticate the socket and authorise room joins server-side.

---

### M-14. `dns.setServers` is applied process-wide, in three places

**Files:** `src/lib/setup-dns.ts`, `src/lib/auth.ts:1-4`, `next.config.ts:1`

Forcing every DNS lookup in the Node process through `8.8.8.8` is a global side effect. It breaks split-horizon DNS, private VPC endpoints and any network where public resolvers are blocked — including most managed hosting. `auth.ts` duplicates the call inline _and_ imports the module that does the same thing.

**Fix:** remove it, or make it opt-in behind an env flag for local development only.

---

### M-15. Stale per-tenant data left in `localStorage` across logouts

**Files:** `src/components/dashboardComponents/restaurantDashboard/RestaurantAccessGuard.tsx:51-63`, and 12 other components

`foodflow_has_restaurant`, `foodflow_restaurant_data`, `restaurant_owner_email` (and similar keys elsewhere) are written but never cleared on sign-out.

**Impact:** on a shared device the next account briefly sees the previous owner's restaurant data.

**Fix:** clear all `foodflow_*` keys in the sign-out handler.

---

### M-16. Cross-route-module imports of in-memory state

**Files:** `src/app/api/auth/verify-otp/route.ts:2`, `src/app/api/auth/reset-password/route.ts:2`, `src/app/api/auth/login-otp/verify/route.ts:2`

Route modules import `getOtpStore` / `loginOtpStore` from _another route module_. Each route is bundled separately in production, so the module is instantiated more than once; only the `globalThis` shim keeps it working within a single process — and it cannot work at all across instances (see H-5).

**Fix:** move shared state into `src/lib/`, backed by the database.

---

### M-17. `isValidStripeSecretKey` gives a false sense of validation

**File:** `src/app/api/orders/route.ts:8-29`

The `trimmed.startsWith("sk_")` catch-all makes the preceding `sk_test_` / `sk_live_` checks redundant, and the placeholder heuristics (`includes("placeholder")`, `endsWith("here")`) are guesswork. Separately, the module-level `stripe` constant (line 27) is never used — every handler builds its own instance — so it is dead code that ESLint flags.

**Fix:** validate presence only, let Stripe reject bad keys, and reuse one module-level client.

---

## 🔵 LOW / CODE QUALITY

### L-1. 288 ESLint errors block a clean lint gate

218 `no-explicit-any` and 210 `no-unused-vars`. The `any` usage is concentrated in the API layer (`catch (error: any)`, `orderDoc: any`, `queryConditions: any[]`), which is exactly where Zod (already a dependency) should be validating instead.

### L-2. Internal error messages are returned to clients

`error.message` is echoed in ~20 handlers (`orders/route.ts:301`, `coupons/route.ts:74`, `user/profile/route.ts:63`, …), leaking Mongo/Stripe internals.

### L-3. No `error.tsx` or `global-error.tsx` anywhere

Zero error boundaries in `src/app`. Any render error in a Server Component shows the default Next.js error screen.

### L-4. `next/image` is never used

0 imports; 46 raw `<img>` tags (42 ESLint errors). `next.config.ts` has no `images.remotePatterns`, so adopting `next/image` needs config for ImgBB/Unsplash hosts first. Large, uncompressed food photography is the main payload on every page.

### L-5. Duplicate alias routes rendering identical components

`/dashboard/restaurant/{history,sales-history,sell-history}` → all three render `RestaurantSellHistory`; `/dashboard/rider/{history,delivery-history}`; `/dashboard/customer/{history,orders}`; `/checkout` vs `/dashboard/customer/checkout`; `/order-success`, `/order-tracking/[orderId]` duplicated in and out of `/dashboard`. The non-dashboard copies also bypass `RoleGuard` (see H-13). Only `/dashboard/address` does the right thing and `redirect()`s.

### L-6. `SERVER_BASE_URL` boilerplate copy-pasted into ~10 modules

Identical 6-line block in `lib/api/*.ts`, `lib/actions/*.ts`, `lib/socket.ts`, `components/ai/AIChatbot.tsx`. Extract to `src/lib/config.ts`.

### L-7. Dead code

- `src/app/api/orders/restaurant-orders/route.ts:31` — `const db = await getOrdersCollection().then((c) => c.dbName ? c : c);` is a no-op that costs an extra connection round-trip and is never read.
- `src/app/api/auth/send-otp/route.ts:2,64-72` — `nodemailer` is imported and a transporter built, then ignored in favour of `sendEmail`.
- `src/lib/api/order.ts:9` — `API_BASE_URL` unused.
- `src/lib/email.ts:875` — `formattedDate` unused.
- `src/components/auth/JwtTokenSync.tsx:5` — `getAuthToken` imported, never called.
- `src/app/layout.tsx:59` — `<Navbar session={null} cartItemCount={0} />` passes hardcoded props.
- `src/app/layout.tsx:1-2` — commented-out `dns` block.
- Duplicate `LoadingSpinner` in three places: `components/LoadingSpinner.tsx`, `components/common/LoadingSpinner.tsx`, and a `.tsx` file misplaced at `src/lib/api/LoadingSpinner.tsx` (which is what most components actually import).

### L-8. `require()` in a client component

`src/components/tracking/OrderTrackingMap.tsx:9` — `const L = typeof window !== "undefined" ? require("leaflet") : null;` eagerly bundles Leaflet, defeating the `next/dynamic` imports right below it. Use `await import("leaflet")` inside an effect.

### L-9. Unused / undocumented environment variables

- Set in `.env` but read by nothing: `JWT_EXPIRES_IN`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_API_BASE`.
- Read by code but absent from both `.env` and `.env.example`: **`STRIPE_WEBHOOK_SECRET`** (see C-4), `OPENROUTER_SITE_URL`, `IMGBB_API_KEY`.
- In `.env.example` but not `.env`: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`.
- `.env` carries ~60 lines of commented-out duplicate configuration.

### L-10. `/api/auth/send-otp` enumerates accounts

Returns a distinct 404 _"No account found with this email"_ (`send-otp/route.ts:32-40`) — and if the DB lookup throws, the error is swallowed (line 41) and an OTP is sent for a non-existent account anyway. Return an identical generic response in all cases.

### L-11. Full-collection scans in the request path

`admin/transactions/route.ts:21-24` loads **every** order into memory and filters/aggregates in JavaScript. `GET /api/orders:344` makes one Stripe API call per unpaid order in a loop. Neither will survive real volume. Use aggregation pipelines and pagination.

### L-12. `CartContext` value is not memoised

`src/contexts/CartContext.tsx:419-435` — a fresh object each render re-renders every consumer (navbar, sidebar, every food card). Wrap in `useMemo`. Also lines 136-162: `setIsLoading(false)` runs even on the `cancelled` path.

### L-13. `RoleGuard` + `CartProvider` + `LocationGuard` wrap the entire app

`src/app/layout.tsx:56-66` forces essentially every page into the client bundle, forfeiting Server Components and streaming for public marketing pages.

### L-14. 8 `react-hooks/exhaustive-deps` warnings

`register/page.tsx:436`, `restaurants/page.tsx:501`, `AdminTransactions.tsx:128,136`, `CustomerOrders.tsx:120`, `RestaurantMenu.tsx:268`, `RestaurantOrders.tsx:236`, `ActiveDelivery.tsx:360`. Each is a stale-closure bug waiting to surface — `ActiveDelivery` in particular reads `riderLocation` inside an interval.

### L-15. 179 `console.*` calls left in production code

Including OTPs (H-4) and full order payloads. Add a logger with levels.

### L-16. No tests, and `<a>` used for internal navigation

Zero test files in the repo — nothing pins the financial calculations in `orders/route.ts:128-139`, which is where regressions will hurt most. Also `HowItWorks.tsx:263` uses a raw `<a href="/restaurants/">` instead of `next/link`, forcing a full page reload.

---

## Recommended order of work

1. **Stop the bleeding (today).** Rotate the ImgBB key and both JWT secrets. Delete the hard-coded fallbacks. Delete `POST /api/auth/jwt` and client-side `jwt.sign` (C-1, C-2, C-14).
2. **Close the auth holes.** Add `input: false` to the `role` field (C-3). Write one `requireSession(req)` / `requireRole(req, roles)` helper and apply it to every handler in `src/app/api/**`. Remove every `x-user-id` fallback (C-8 … C-13, H-1, H-7).
3. **Fix the money path.** Set `STRIPE_WEBHOOK_SECRET` and require signature verification (C-4). Delete both "mark as paid without verification" branches (C-5, C-6). Re-price orders server-side from the database (C-7, H-6). Fix the currency and the charged amount (H-10). Make refunds fail loudly (H-9).
4. **Make the OTP flows real.** Move OTP state to MongoDB with a TTL, add attempt limits and rate limiting, hash delivery OTPs, and bind login OTP to session issuance (C-10, H-3, H-4, H-5).
5. **Then quality.** `middleware.ts`, Zod validation at every route boundary, error boundaries, remove the `any`/unused-vars debt, de-duplicate the alias routes and the three Mongo connection modules.

Item 1 and item 2 should land before this branch is deployed anywhere reachable from the internet.
