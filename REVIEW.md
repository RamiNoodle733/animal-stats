# Full Backend Code Review

# Part 1: Library Code Review (`/workspace/lib/`)

## Summary

Reviewed all library files and Mongoose models. Found **30 issues** across security, correctness, performance, and code quality. The most critical issues were a hardcoded JWT secret fallback (now fixed), regex injection in `Animal.findByName` (now fixed), and a race condition in `SiteStats.recordVisit` (now fixed).

**Severity Legend:**
- CRITICAL: Exploitable security vulnerability or data-loss bug
- HIGH: Significant bug or security concern
- MEDIUM: Non-trivial issue that should be fixed
- LOW: Code quality or minor concern

---

## File: `lib/auth.js`

### Issue L1 — CRITICAL (FIXED): Hardcoded JWT secret fallback (Line 8)
**Was:** `const JWT_SECRET = process.env.JWT_SECRET || 'animal-stats-secret-key-change-in-production';`
If `JWT_SECRET` was not set in the environment, the application silently fell back to a publicly-visible secret baked into source code. Any attacker who reads the source could forge arbitrary JWT tokens. The same hardcoded fallback was duplicated in `api/auth.js` line 25.
**Fix applied:** Removed the fallback — now throws at startup if `JWT_SECRET` is missing, matching how `mongodb.js` handles `MONGODB_URI`. Also deduplicated: `api/auth.js` now imports `JWT_SECRET` from `lib/auth.js`.

### Issue L2 — MEDIUM: `JWT_SECRET` is exported (Line 64)
`JWT_SECRET` is exported in `module.exports`, which means any module that imports `lib/auth.js` gets access to sign tokens, not just verify them. This violates the principle of least privilege. Only verification helpers should be exported; signing should be done through a dedicated `createToken()` function.

### Issue L3 — LOW: No error discrimination in `verifyToken` (Lines 19-29)
`verifyToken` returns `null` for all errors (expired, malformed, wrong algorithm) without distinguishing them. Callers cannot tell the difference between "token expired, re-login" and "token is forged."

---

## File: `lib/mongodb.js`

### Issue L4 — LOW: Connection state can go stale (Lines 32-34)
Once `cached.conn` is set, it's never checked for liveness. If the MongoDB connection drops, all subsequent calls return the dead connection. Consider checking `mongoose.connection.readyState` before returning the cached connection.

### Issue L5 — LOW: Console logging in production (Line 45)
`console.log('MongoDB connected successfully')` runs on every cold start. In high-traffic serverless environments, this pollutes logs.

---

## File: `lib/discord.js`

### Issue L6 — LOW: No rate limiting on Discord webhook calls (Line 125)
Discord rate limits webhooks to ~30 requests per 60 seconds. High-traffic events (votes, site visits) could hit rate limits causing silent failures.

### Issue L7 — LOW: Inconsistent emoji usage (Lines 323-327)
Some embed fields use raw emoji literals (`📐`, `🌐`) while the rest of the file uses the `EMOJI` constant map.

---

## File: `lib/xpSystem.js`

### Issue L8 — MEDIUM: Division by Infinity in `buildProgressionPayload` (Line 185)
When `user.level >= 100`, `xpToNext(100)` returns `Infinity`. `user.xp / Infinity` gives `0`, so `xpPercent` will always be `0` at level 100, even though the user has "completed" leveling. This is misleading.

### Issue L9 — LOW: XP clamping at level 100 discards overflow (Line 125)
`xp = Math.min(xp, xpToNext(99))` caps overflow XP to the level 99→100 requirement. If a large XP award spans multiple levels, the excess is silently lost.

---

## File: `lib/models/Animal.js`

### Issue L10 — CRITICAL (FIXED): Regex injection in `findByName` (Line 145)
**Was:** `return this.findOne({ name: new RegExp('^${name}$', 'i') });`
The `name` parameter was interpolated directly into a regex without escaping. Used from `api/animals/[id].js` with URL params, enabling ReDoS and unintended match behavior (e.g., `name = ".*"` matches any animal).
**Fix applied:** Now escapes regex metacharacters before interpolation.

### Issue L11 — MEDIUM (FIXED): Redundant `index: true` on `name` field (Lines 41-42)
`name` had both `unique: true` and `index: true`. The `unique` constraint already creates an index.
**Fix applied:** Removed redundant `index: true`.

### Issue L12 — MEDIUM: Over-indexing on stat fields (Lines 89-94)
Six individual indexes on `attack`, `defense`, `agility`, `stamina`, `intelligence`, and `special_attack`. For a collection of hundreds of animals, these indexes add write overhead without meaningful query benefit. The compound index `{ attack: -1, defense: -1 }` partially overlaps with the individual `attack` index.

---

## File: `lib/models/BattleStats.js`

### Issue L13 — MEDIUM (FIXED): Redundant `index: true` on `animalName` (Lines 13-15)
Same as Animal.js — `unique: true` already creates an index.
**Fix applied:** Removed redundant `index: true`.

### Issue L14 — LOW: Missing index on `battleRating`
If the application sorts by `battleRating` for leaderboards, there should be an index on this field.

---

## File: `lib/models/ChatMessage.js`

### Issue L15 — MEDIUM: Conflicting timestamp definitions (Lines 50-54 and 65)
The schema both explicitly defines `createdAt` with `Date.now` and enables `timestamps: true`. Mongoose uses the `timestamps` option, making the explicit `default: Date.now` dead code. The explicit definition does serve the purpose of adding the index.

### Issue L16 — MEDIUM: `pre('find')` / `pre('findOne')` middleware hides deleted messages globally (Lines 80-86)
This automatically filters out deleted messages on every query. Admin/moderation queries cannot retrieve deleted messages without bypassing the model entirely.

### Issue L17 — LOW: Unbounded array growth on `upvotes`/`downvotes` (Lines 41-48)
Voter IDs stored as embedded arrays mean each message document grows with every vote, risking the 16MB document limit.

---

## File: `lib/models/Comment.js`

### Issue L18 — MEDIUM: `voteScore` can become inconsistent (Lines 68-71 and 140-143)
`voteScore` is a denormalized field that must be manually updated via `updateVoteScore()`. No pre-save hook keeps it in sync if upvotes/downvotes are modified without calling `updateVoteScore()`.

### Issue L19 — LOW: No `minlength` validation on `content` (Line 34)
Comments can be empty strings (after trimming) since there's only `maxlength` but no `minlength`.

### Issue L20 — LOW: Same unbounded array issue on `upvotes`/`downvotes` as ChatMessage.

---

## File: `lib/models/RankHistory.js`

### Issue L21 — MEDIUM: Missing index on `rankings.animalName` (Line 18)
If the application queries rank history by animal name, there's no index to support that query efficiently.

### Issue L22 — LOW: No TTL or cleanup mechanism
Rank history entries accumulate indefinitely with no TTL index or pruning.

### Issue L23 — LOW: Redundant index (Lines 12 and 30)
`date` has `index: true` on the field AND a separate `{ unique: true }` index. The unique index supersedes the simple one.

---

## File: `lib/models/SiteStats.js`

### Issue L24 — HIGH (FIXED): Race condition in `recordVisit` (Lines 75-117)
**Was:** Read-modify-write pattern (`findOne` → modify in memory → `save`) not atomic. Under concurrent serverless requests, two requests could read the same state and one would overwrite the other's changes, losing visit counts.
**Fix applied:** Rewrote to use atomic MongoDB operations (`$addToSet`, `$inc`, `$pull`) instead of in-memory modification.

### Issue L25 — HIGH: Unbounded array growth in `dailyVisits[].uniqueIps` (Line 35)
Every unique visitor's IP hash is stored in an array. On a busy site, 7 days × thousands of IPs in a single document can approach the 16MB limit. The `includes()` check was also O(n).

### Issue L26 — MEDIUM: IP hashes stored without hashing verification
The parameter is named `ipHash` but nothing verifies the caller actually hashed the IP. If raw IPs are passed, they're stored in plain text (privacy/GDPR concern).

### Issue L27 — LOW: `recordVisit` is dead code
`recordVisit` is defined but never invoked anywhere in the codebase.

---

## File: `lib/models/User.js`

### Issue L28 — MEDIUM (FIXED): `comparePassword` could fail silently (Lines 126-128)
If a caller forgot `.select('+password')`, `this.password` would be `undefined` and `bcrypt.compare` would throw a cryptic error.
**Fix applied:** Added defensive check that throws a clear error message.

### Issue L29 — MEDIUM: Unbounded array growth on `votes` and `fightVotes` (Lines 48-60)
User voting history embedded as arrays in the User document. Active users accumulating thousands of votes will bloat the document and impact every query fetching the user.

### Issue L30 — LOW: `createdAt` defined both explicitly and via `timestamps` (Lines 100-103, 109)
Same issue as ChatMessage.

### Issue L31 — LOW: Weak password policy (Line 29)
Minimum 6 characters with no complexity requirements.

### Issue L32 — LOW: `usernameChanges` array grows forever (Lines 95-99)
Old username change records are never pruned.

---

## File: `lib/models/Vote.js`

### Issue L33 — MEDIUM (FIXED): `getVoteCounts` made two separate queries (Lines 56-60)
**Was:** Two `countDocuments` calls for upvotes and downvotes.
**Fix applied:** Replaced with a single aggregation query, halving database round trips.

### Issue L34 — LOW: Redundant `animalId` index (Line 14)
Individual index on `animalId` is redundant with the compound unique index `{ animalId, votedBy, voteDate }` since `animalId` is the leftmost prefix.

---

## File: `lib/models/XpClaim.js`

### Issue L35 — LOW: `getDayKey` trusts client-provided timezone (Lines 55-71)
A user could send extreme timezones (e.g., UTC+14 vs UTC-11) to claim XP for dates not yet reached in UTC.

---

## Fixes Applied Summary

| File | Issue | Fix |
|------|-------|-----|
| `lib/auth.js` | Hardcoded JWT fallback | Throws if missing |
| `api/auth.js` | Duplicated JWT_SECRET | Now imports from `lib/auth.js` |
| `api/auth.js` | Regex injection in username lookups | Escapes metacharacters |
| `lib/models/Animal.js` | Regex injection in `findByName` | Escapes metacharacters |
| `lib/models/Animal.js` | Redundant index on `name` | Removed `index: true` |
| `lib/models/BattleStats.js` | Redundant index on `animalName` | Removed `index: true` |
| `lib/models/SiteStats.js` | Race condition in `recordVisit` | Uses atomic MongoDB ops |
| `lib/models/User.js` | `comparePassword` no defensive check | Throws clear error |
| `lib/models/Vote.js` | Two queries in `getVoteCounts` | Single aggregation |

---
---

# Part 2: API Code Review (`/workspace/api/`)

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
