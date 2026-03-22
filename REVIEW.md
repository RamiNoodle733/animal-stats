# API Code Review: /workspace/api/

## Summary

Reviewed all 12 API endpoint files. Found **55+ issues** across security, bugs, error handling, input validation, and code quality. The most critical issues involve missing authentication on mutation endpoints, NoSQL/ReDoS injection via unescaped regex, a hardcoded JWT secret fallback, and mass assignment vulnerabilities.

**Severity Legend:**
- CRITICAL: Exploitable security vulnerability or data-loss bug
- HIGH: Significant bug or security concern
- MEDIUM: Non-trivial issue that should be fixed
- LOW: Code quality or minor concern

---

## File: `api/animals.js`

### Issue 1 — CRITICAL: NoSQL Injection / ReDoS via unescaped regex in search (Lines 162-166)
The `search` query parameter is interpolated directly into `$regex` without escaping regex special characters. An attacker can craft input like `.*` or `(a+)+b` to cause ReDoS (Regular Expression Denial of Service) or return unintended data.
```
query.$or = [
    { name: { $regex: search, $options: 'i' } },
    { scientific_name: { $regex: search, $options: 'i' } },
    { description: { $regex: search, $options: 'i' } }
];
```
**Fix:** Escape the search string: `search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` before using in `$regex`.

### Issue 2 — CRITICAL: NoSQL Injection / ReDoS via unescaped regex in biome filter (Line 183)
Same issue — `biome` is passed directly to `$regex`:
```
query.habitat = { $regex: biome, $options: 'i' };
```

### Issue 3 — CRITICAL: Missing authentication on POST /api/animals (Lines 238-265)
`handlePost` creates new animals with zero authentication. Any anonymous user can create arbitrary animals in the database.

### Issue 4 — HIGH: Sort order inverted for "total" stats aggregation (Line 201)
```
{ $sort: { totalStats: -sortOrder } }
```
`sortOrder` is `-1` for desc and `1` for asc (line 188). Negating it (`-sortOrder`) reverses the intended order: requesting `order=desc` actually sorts ascending, and vice versa. Should be `{ $sort: { totalStats: sortOrder } }`.

### Issue 5 — MEDIUM: No validation on `limit` and `skip` query params (Lines 203, 220)
`parseInt(skip)` and `parseInt(limit)` could return `NaN` for non-numeric input, causing MongoDB errors. No maximum cap on `limit` (default is 500 but a client can send `limit=999999`).

### Issue 6 — LOW: `diet` destructured but never used (Line 149)
`diet` is extracted from `req.query` but is never used to filter — dead code.

### Issue 7 — LOW: Notification handler silently swallows errors (Line 127)
`handleNotification` returns `200` even on error, masking failures silently.

---

## File: `api/animals/[id].js`

### Issue 8 — CRITICAL: Missing authentication on PUT and DELETE (Lines 97-152)
Both `handlePut` and `handleDelete` modify/destroy data with no authentication or authorization check. Any anonymous user can update or delete any animal.

### Issue 9 — CRITICAL: Mass assignment vulnerability in PUT handler (Lines 107-125)
```
const updateData = req.body;
delete updateData._id;
Object.assign(animal, updateData);
```
Only `_id` is protected. An attacker can overwrite any field including `createdAt`, `updatedAt`, or any internal/computed field. Should use an allowlist of permitted fields.

### Issue 10 — HIGH: NoSQL Injection / ReDoS in `findByName` (Line 72, via Animal model line 145)
`Animal.findByName(id)` uses `new RegExp('^${name}$', 'i')` in the Animal model without escaping. Since `id` comes directly from the URL path parameter, an attacker can inject regex metacharacters.

---

## File: `api/auth.js`

### Issue 11 — CRITICAL: Hardcoded JWT secret fallback (Line 25)
```
const JWT_SECRET = process.env.JWT_SECRET || 'animal-stats-secret-key-change-in-production';
```
If `JWT_SECRET` env var is unset, the application uses a well-known secret. Any attacker can forge valid JWT tokens. This is also duplicated in `lib/auth.js` line 8.

### Issue 12 — HIGH: ReDoS / NoSQL injection in public profile lookup (Line 651)
```
username: { $regex: new RegExp(`^${username}$`, 'i') }
```
The `username` query parameter for `?action=user` is used in a regex without escaping or validation. Unlike the profile update path (which validates format), this public endpoint accepts arbitrary input.

### Issue 13 — HIGH: Rewards endpoint allows self-service XP with custom values (Lines 498-500)
```
xpToAward = parseInt(customXp) || 0;
bpToAward = parseInt(customBp) || 0;
```
Any authenticated user can call `POST /api/auth?action=rewards` with `customXp=500` repeatedly. While individual amounts are capped (line 510), there's no rate limiting or cooldown, allowing unlimited XP farming.

### Issue 14 — MEDIUM: Missing `return` before `res.status(500)` in global catch (Line 89)
```
res.status(500).json({ success: false, error: 'Server error. Please try again.' });
```
Missing `return` keyword. While this doesn't cause a double-response (it's the last statement in the catch), it's inconsistent with other handlers and could cause issues if code is added after it.

### Issue 15 — MEDIUM: Inconsistent token verification patterns
`handleMe` (line 227), `handleGetProfile` (line 269), and `handleUpdateProfile` (line 322) manually decode JWT tokens, while `handleRewards` (line 469) and `handlePrestige` (line 588) use the `verifyToken` helper. This duplicated logic is error-prone — if the token format changes, multiple places need updating.

### Issue 16 — LOW: No email format validation on signup beyond Mongoose
The signup handler (line 159) doesn't validate email format. Relying solely on the Mongoose schema validator produces Mongoose error messages instead of user-friendly ones.

### Issue 17 — LOW: `xpToNext` and `xpPercentage` not included in `handleMe` response (Lines 247-265)
`handleMe` omits `xpToNext`, `xpPercentage`, `prestige`, and `lifetimeXp` fields that are returned by `handleGetProfile` and `handleLogin`. This inconsistency can cause client-side bugs.

---

## File: `api/battles.js`

### Issue 18 — CRITICAL: No authentication on `recordBattle` (POST /api/battles) (Lines 289-375)
Anyone can submit arbitrary battle results to manipulate ELO ratings. An attacker can repeatedly submit wins for a chosen animal to inflate its rating.

### Issue 19 — CRITICAL: No authentication on tournament completion/quit (Lines 161-282)
`handleTournamentComplete` and `handleTournamentQuit` accept unauthenticated requests. An attacker can fabricate tournament results, awarding fake placements to animals.

### Issue 20 — HIGH: No authentication or rate limiting on matchup votes (Lines 122-155)
`recordMatchupVote` has no auth check and no duplicate vote prevention per user. Any client can call this endpoint repeatedly to stuff the ballot for a given matchup.

### Issue 21 — HIGH: Race condition in matchup vote recording (Lines 134-142)
```
let matchup = await MatchupVote.findOne({ matchupKey });
// ...
matchup.animal1Votes += 1;
await matchup.save();
```
Between `findOne` and `save`, another request could modify the same document. This read-modify-write pattern is not atomic and can lose votes under concurrent load. Should use `$inc` with `findOneAndUpdate`.

### Issue 22 — HIGH: Race condition in battle stat updates (Lines 308-344)
Same read-modify-write pattern for `winnerStats` and `loserStats`. Two concurrent battle submissions could overwrite each other's rating changes.

### Issue 23 — MEDIUM: N+1 query problem in tournament completion (Lines 170-207)
Each animal placement calls `updateTournamentPlacement` and `incrementTournamentsPlayed` individually (each doing a `findOne` + `save`). For a tournament with many participants, this could be 16+ sequential DB operations. Should batch with `bulkWrite`.

### Issue 24 — LOW: MatchupVote model defined inline (Lines 25-40)
The Mongoose schema is defined inside the API route file rather than in `lib/models/`. This violates the project's own organizational pattern and makes it harder to reuse or test.

---

## File: `api/chat.js`

### Issue 25 — HIGH: Deleted messages not filtered from GET queries (Lines 213, 230)
```
let query = { parentId: null }; // Only get root messages
```
The query does not exclude messages with `isDeleted: true`. Soft-deleted messages will still appear in chat. Should add `isDeleted: { $ne: true }` to the query.

### Issue 26 — HIGH: Replies to deleted messages not filtered (Lines 230-233)
Replies are fetched without checking if the parent or the reply itself is deleted.

### Issue 27 — MEDIUM: No content sanitization / XSS prevention (Lines 282-310)
Chat message content is stored with only `.trim()`. No HTML stripping or script tag removal. While XSS mitigation is typically handled client-side (React auto-escapes), if content is ever rendered as raw HTML or used in emails/notifications, stored XSS is possible.

### Issue 28 — MEDIUM: Potential null reference in DELETE handler (Line 420)
```
const isOwner = message.authorId.toString() === user.id;
```
If `message.authorId` is null/undefined, calling `.toString()` will throw an uncaught exception within the try-catch, resulting in a 500 error instead of a proper message.

### Issue 29 — MEDIUM: No rate limiting on chat message posting
Authenticated users can spam messages with no cooldown or rate limit.

### Issue 30 — LOW: `handleGet` does not filter deleted messages when building the tree
`buildMessageTree` (line 57) processes all messages including deleted ones since the query doesn't filter them.

---

## File: `api/comments.js`

### Issue 31 — MEDIUM: Potential null reference crash in DELETE (Line 272)
```
if (comment.authorId.toString() !== user.id) {
```
If `comment.authorId` is null/undefined, this will throw `TypeError: Cannot read properties of null (reading 'toString')`.

### Issue 32 — MEDIUM: Variable shadowing in handlePatch (Lines 320-321)
```
const upvoteIndex = comment.upvotes.findIndex(id => id.toString() === userId);
const downvoteIndex = comment.downvotes.findIndex(id => id.toString() === userId);
```
The callback parameter `id` shadows the outer `id` from `req.query` (line 307). While functionally correct, this is confusing and could lead to bugs during refactoring.

### Issue 33 — MEDIUM: No admin/moderator override for comment deletion (Lines 272-274)
Unlike `chat.js` (line 421-422) which checks `user.role === 'admin' || user.role === 'moderator'`, comments can only be deleted by their author. This inconsistency means admins can moderate chat but not comments.

### Issue 34 — MEDIUM: Hard-deletes comments and all replies (Lines 285-286)
```
await Comment.deleteMany({ parentId: targetId });
await Comment.deleteOne({ _id: targetId });
```
Comments are hard-deleted rather than soft-deleted. This is inconsistent with the chat handler which uses soft-delete (`isDeleted: true`). Hard-deleted data cannot be recovered for moderation review.

### Issue 35 — LOW: Discord notification for upvotes/downvotes may be excessive
Every upvote and downvote triggers a Discord notification (lines 336, 355). On active pages this could flood the Discord channel.

---

## File: `api/community.js`

### Issue 36 — HIGH: Visit counter has no rate limiting (Lines 265-298)
`handleVisit` increments the site visit counter with no authentication, rate limiting, or deduplication. An attacker can send millions of requests to inflate the visit counter.

### Issue 37 — HIGH: In-memory presence store doesn't survive restarts or scale (Line 17)
```
const presenceStore = new Map();
```
If the server restarts or runs multiple instances (e.g., behind a load balancer), presence data is lost or inconsistent. Acknowledged in a comment, but worth flagging.

### Issue 38 — MEDIUM: Potential division by zero in leaderboard (Line 100)
```
xpProgress: Math.min(100, Math.round((xpProgress / xpNeeded) * 100)),
```
If `calculateXpForLevel` returns 0 (which it does for level 2: `100 + (2-2)*50 = 100`, OK, that's fine, but for level 1: `100 + (1-2)*50 = 50`), the division is safe. However, if the formula changes or a level produces 0, this would yield `Infinity`.

### Issue 39 — MEDIUM: Duplicate XP calculation formula (Lines 118-121)
```
function calculateXpForLevel(level) {
    return 100 + (level - 2) * 50;
}
```
This is a local copy of the formula that should come from `lib/xpSystem.js`. If the formula is updated in one place but not the other, rankings will show incorrect XP progress. Should import from the shared module.

### Issue 40 — LOW: `leaderboard` and `presence` endpoints don't enforce GET method
Unlike `ping` and `visit` which check `req.method`, `leaderboard` and `presence` respond to any HTTP method (POST, PUT, etc.).

---

## File: `api/rankings.js`

### Issue 41 — CRITICAL: No authentication on fight POST endpoint (Lines 30-51)
The fight notification and comparison count incrementing has no auth check. An attacker can inflate comparison counts for any animal.

### Issue 42 — HIGH: Wrong field name in select query — `special` vs `special_attack` (Line 62)
```
.select('name image attack defense agility stamina intelligence special scientific_name')
```
The Animal schema defines the field as `special_attack` (Animal.js line 94), not `special`. This means `animal.special` is always `undefined`, and the total stats calculation on line 141:
```
(animal.special || 0)
```
always evaluates to `0`, making total stats incorrect for display on the rankings page.

### Issue 43 — MEDIUM: No input validation on fight POST body (Line 31)
```
const { animal1, animal2, user } = req.body;
```
If `req.body` is undefined, or `animal1`/`animal2` are missing, the code proceeds to call `notifyDiscord` and database updates with `undefined` values. No validation before use.

### Issue 44 — MEDIUM: Fire-and-forget DB write with no error propagation (Lines 248-259)
Rank history is saved without `await`. While this is intentional for performance, if the save consistently fails (e.g., schema mismatch), trends will never work and the error is only logged, not surfaced.

---

## File: `api/random.js`

### Issue 45 — HIGH: NaN propagation for invalid `count` parameter (Line 33)
```
const numAnimals = Math.min(parseInt(count), 10);
```
If `count` is a non-numeric string like `"abc"`, `parseInt` returns `NaN`, and `Math.min(NaN, 10)` is `NaN`. This causes `$sample: { size: NaN }` which will throw a MongoDB error.
**Fix:** `const numAnimals = Math.min(parseInt(count) || 1, 10);`

### Issue 46 — MEDIUM: Possible `undefined` response when count=1 and no results (Line 55)
```
data: numAnimals === 1 ? animals[0] : animals
```
If no animals match (empty database or all excluded), `animals[0]` is `undefined`, and the response sends `{ success: true, count: 0, data: undefined }`. The `data` field will be omitted from JSON serialization, which may confuse clients. Should return `null` explicitly or handle the empty case.

---

## File: `api/search.js`

### Issue 47 — CRITICAL: NoSQL Injection / ReDoS via unescaped regex in search query (Lines 63-68)
```
{ name: { $regex: q, $options: 'i' } },
```
Same issue as `animals.js` — the search query `q` is used directly in `$regex` without escaping. This is exploitable for ReDoS attacks.

### Issue 48 — MEDIUM: No maximum limit enforcement (Line 55)
`limit` defaults to 50 but has no upper bound. A client can send `limit=1000000` to dump the entire database.

### Issue 49 — MEDIUM: No validation on `page` parameter (Line 132)
```
const skip = (parseInt(page) - 1) * parseInt(limit);
```
If `page=0` or `page=-5`, the skip value becomes negative, which MongoDB will treat as 0. If `page` is non-numeric, `NaN` propagation occurs.

### Issue 50 — LOW: Arbitrary sort field name (Line 128-129)
```
const sortField = sort === 'special' ? 'special_attack' : sort;
sortObj[sortField] = order === 'desc' ? -1 : 1;
```
The `sort` parameter is used as a MongoDB field name with minimal transformation. While Mongoose provides some protection, this allows sorting by any field including internal ones like `_id` or `__v`.

---

## File: `api/stats.js`

### Issue 51 — LOW: No issues of significant concern
This is a read-only GET endpoint with proper error handling, method validation, and CORS. Minor observation: no caching headers are set, so repeated calls hit the database every time. Adding short-lived caching (e.g., 60s) would improve performance.

---

## File: `api/votes.js`

### Issue 52 — MEDIUM: `voteType` not validated as required on POST (Line 136)
```
if (voteType && !['up', 'down', 'clear'].includes(voteType)) {
```
If `voteType` is `undefined` or `null`, the entire if-else chain (lines 155-217) falls through without creating, updating, or clearing a vote, but still queries the database and returns a misleading "success" response with `action: 'none'`.

### Issue 53 — LOW: Missing `animalId` format validation (Line 131)
`animalId` is not validated as a proper MongoDB ObjectId before being used in queries. If an invalid ID is provided, the database query may throw.

### Issue 54 — LOW: Extra blank line at end of file (Line 268)
Minor formatting issue.

---

## Cross-cutting Issues

### Issue 55 — CRITICAL: `Access-Control-Allow-Origin: *` on all endpoints
All 12 files set `Access-Control-Allow-Origin: *`. While acceptable for a public read-only API, this is problematic for mutation endpoints that use cookies or auth tokens. It means any website can make authenticated requests to your API if the user has a valid token stored client-side.

### Issue 56 — HIGH: No rate limiting on any endpoint
None of the 12 API files implement server-side rate limiting. Combined with missing auth on many endpoints, this makes the API vulnerable to abuse:
- Spamming animal creation
- Inflating battle ratings / matchup votes / visit counters
- Brute-forcing login credentials
- XP farming via the rewards endpoint

### Issue 57 — HIGH: Hardcoded JWT secret in two places
Both `api/auth.js` (line 25) and `lib/auth.js` (line 8) have the same hardcoded fallback: `'animal-stats-secret-key-change-in-production'`. If the env var is missing in production, tokens are trivially forgeable.

### Issue 58 — MEDIUM: No request body size limits
None of the endpoints enforce a maximum request body size. An attacker could send extremely large payloads (e.g., a 100MB JSON body in POST /api/animals) to exhaust server memory.

### Issue 59 — MEDIUM: Inconsistent error response format
Some endpoints return `{ success: false, error: '...' }`, others return `{ success: false, error: '...', message: '...' }`, and the global catch in some files includes `message: process.env.NODE_ENV === 'development' ? error.message : undefined` while others don't. This inconsistency makes client-side error handling unreliable.

### Issue 60 — MEDIUM: `Animal.findByName` uses unescaped regex (Animal.js line 145)
```
AnimalSchema.statics.findByName = function(name) {
    return this.findOne({ name: new RegExp(`^${name}$`, 'i') });
};
```
This shared utility is called from `animals.js`, `animals/[id].js`, and potentially other files. The `name` parameter is never escaped, making all callers vulnerable to regex injection.

---

## Priority Fix Order

1. **Hardcoded JWT secret** (Issues 11, 57) — Ensure `JWT_SECRET` env var is always set in production
2. **Missing auth on mutation endpoints** (Issues 3, 8, 18, 19, 41) — Add authentication checks
3. **NoSQL/ReDoS injection via unescaped regex** (Issues 1, 2, 10, 12, 47, 60) — Escape all user input used in regex
4. **Mass assignment in PUT /api/animals/[id]** (Issue 9) — Use field allowlist
5. **Sort order bug** (Issue 4) — Fix negated sort order
6. **Wrong field name in rankings** (Issue 42) — Change `special` to `special_attack`
7. **Deleted messages still shown** (Issues 25, 26) — Add `isDeleted` filter
8. **Race conditions** (Issues 21, 22) — Use atomic operations
9. **Add rate limiting** (Issue 56) — Implement at middleware level
10. **NaN propagation** (Issue 45) — Add input sanitization
