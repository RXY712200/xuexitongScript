# Positive-range reader and native opening

PARTIAL. Authenticated evidence: manual knowledge-map scrollbar movement produced
platform credit; programmatic equivalence is not established. Recorded native card
opened a playable zhibo tab manually despite nonstandard openUrl policy.

Reader candidates now require positive range before nested ancestry preference.
A zero-range descendant cannot displace the owned positive-range viewport. The
reader rejects lost/negligible range instead of reporting 100% or local completion.
Existing gradual native scroll, reader identity and platform credit checks remain.
No synthetic scroll events or server-completion calls added.

Native card recognition treats an unapproved/placeholder openUrl destination as
unresolved policy, not missing card. Automatic handling attempts its original
click once per card element; explicit manual controls provide a retry. Popup outcome
is unverified, and the notice requires manual return and credit confirmation.

NOT IMPLEMENTED: binding a newly native-opened child without a captured WindowProxy,
new session handshake, automatic close/closure confirmation, one-time refresh and
automatic return. Existing child/owned-popup/companion protocols were not changed;
no claim is made that arbitrary native-opened replay tabs join those sessions or
receive automatic playback recovery. Missing opener stays a manual workflow.
This is an incomplete delivery of the requested live lifecycle, not a live PASS.

Five targeted simulated cases pass: positive reader vs zero descendant, zero-range
failure, document credit gating, owned video credit, native opening/manual retry.
Build/verify/customization/syntax/diff checks passed. Real reader geometry changes,
programmatic scrolling credit and native popup behavior still require user retest.

## Positive HTML/BODY follow-up (baseline 00ebfc5)

Authenticated trace read the outer 34px shell while the nested owned reader
remained at zero with 1789px range. Candidate elimination previously happened
before positive-range filtering: fitting BODY could eliminate scrollable HTML.
Require positive range before innermost selection; admit actual HTML/BODY roots
without requiring CSS overflow:auto. Owned iframe ancestry still excludes outer
shells. Pending src/srcdoc initialization delays commitment. New default document
pauses are 300–1000ms; native 40–120px steps and saved custom settings remain.

Five targeted simulated cases pass, including real nested HTML/BODY geometry,
zero-range rejection, document credit gating, delayed rendering and owned credit.
Build/verify/customization/syntax/diff checks pass. Real-site credit remains untested.

GM lifecycle NOT IMPLEMENTED. The current artifact remains @grant none with its
page globals and existing manual replay fallback intact. Its headless page-world
harness cannot validate the required Tampermonkey isolated-world/page-global
integration. No GM APIs, grants, claim/ack protocol, close confirmation or refresh
path were added or simulated. This is a partial delivery, not completion of task B.
A verified single-userscript sandbox integration is still needed before claiming
no-opener session playback/closing/return works. Existing evidence is preserved.

## GM native replay lifecycle implementation (baseline 0c07d13)

The previous unimplemented status remains historical; this iteration adds the
main-script lifecycle. One generated userscript now requests @sandbox raw,
unsafeWindow, GM value/listener APIs and window.close. Official semantics checked:
https://www.tampermonkey.net/documentation.php?locale=zh.+CN&q=sandbox
https://www.tampermonkey.net/documentation.php?ext=dhdg&q=grant&version=5.1.0
The wrapper explicitly uses unsafeWindow for page globals and the page jQuery
function. GM operations remain lexical capabilities; no general message-to-GM
RPC or global window.open interception was added. Missing GM capabilities retain
ordinary app initialization/manual fallback. Real Tampermonkey raw/sandbox behavior
and userscript-manager closing permission still require authenticated testing.

One pending GM record precedes native clicking. Random session/nonce, generation,
course/lesson identifiers, optional class, 120-second claim deadline and four-hour
safe expiry govern claim/parent-ack. Strictly equal course AND chapter/knowledge
URL identifiers are required on both pages; missing identifiers do not permit
pairing by domain or proximity alone. One claim is acknowledged; duplicates,
unrelated URLs, stale generations and expired sessions cannot become completion.
Only whitelisted URL identifiers are stored, never cookies/full/signed URLs.

Positively recognized recorded Video.js pages can initialize without opener.
After ack: native 1.0x play, pause/stall recovery according to background settings,
actual progress plus a subsequent native ended event are required. Already-ended
players, pagehide and early closing are not completion. Parent heartbeats guard
orphaned sessions; lost communication stops control instead of inventing success.
The optional companion protocol is not used or modified by this workflow.

One ended result precedes a delayed self-close attempt. A surviving replay shows
manual-close instructions; neither calling close nor pagehide proves closure.
The parent independently checks credit after settling, permits one persisted
session-bound refresh, restores verification only and never reopens that session.
Absent credit after refresh stays on the lesson; actual credit enters the existing
completion-first/five-second navigation pipeline. No server progress is fabricated.

Checks: node tests/gm-live-v3.mjs: four focused mocked-GM scenarios pass (no opener,
claim/ack, duplicate/expired/unrelated rejection, ended, early exit, denied close,
credit gating and single refresh). Six filtered Chrome navigation cases pass,
including GM-capability/page-global initialization and frozen audio/document/video
behavior. Build, verify-v3, customization-v3, syntax/diff checks pass. A direct source
comparison confirms frozen reader/audio/recovery/credit/rebinding/navigation method
bodies unchanged. No full historical suite run or authenticated PASS claimed.

Retest real URL identifier availability, Tampermonkey GM raw integration, popup
policy, Video.js recognition, natural end/credit propagation, self-close permission,
background throttling and guarded reload. Closure cannot be independently proven
without a retained child reference; the course relies on ended plus platform credit.

## Session recovery correction (baseline 7389916)

Cancelled/expired attempts and timed-out pending attempts are recoverable only by
explicit retry. A new random session/nonce replaces the inactive attempt and clears
stale claim/pulse keys. Active matched children are protected before manual task
cancellation changes generation. Completed/verify/done states retain their return
and single-refresh guards, including after expiry; they never become replay retries.

Child heartbeats use a separate per-session value (nonce, child, timestamp, sequence),
not the parent's heartbeat. Three minutes without a valid child pulse cancels the
attempt without credit. Pending pairing still times out after two minutes. Recovery
releases the manual-busy lock; it does not automatically reopen any replay. Parent
notices now describe GM pairing rather than unconditionally demanding manual return.

Seven focused GM scenarios pass, including blocked-popup retry, pending timeout,
missing child, protected active child, expiry replacement, terminal guards and the
existing claim/ack/natural-ended/close/refresh sequence. Mocked timers/storage do
not prove real tab closure or Tampermonkey background heartbeat behavior. Browser
throttling beyond the liveness bound can cause a conservative cancellation, never
successful completion. No reader/audio/video/catalog/navigation implementation was
changed; only the live retry guard and live notices accompany the GM state changes.

## Bounded unattended startup recovery (baseline 9fa73c7)

Authenticated passes now include native opening, no-opener GM pairing, 1.0x replay,
ended detection, self-close and parent refresh. The end test used manual seeking;
it proves technical lifecycle only, not full-duration credit. No seeking was added.

Parent startup now replaces only safely stale cancelled/expired/abandoned attempts
automatically, with one durable GM recovery allowance per course/lesson in a
10-minute startup cycle. Fresh pending/claims and active children are retained.
Repeated run/reload may adopt the same parent session identity without reopening;
a parent-instance token retires old watchers instead of cancelling the adopted
session. Manual retry remains possible after the allowance is spent. Completed,
verify and done records retain existing terminal and refreshUsed protections.

GM-authorized opening is once per new session rather than blocked by the old
per-DOM-element open cache. Missing matching identifiers still requires explicit
manual action. Notices distinguish recovery, requested opening, pending pairing,
claim timeout and possible popup restrictions without asserting a popup was blocked.

Eight focused GM scenarios pass, including reinjection/generation adoption,
first startup, single automatic stale recovery, pending/active preservation,
manual fallback, terminals and existing natural-end/credit/refresh paths. Build,
verify/customization/syntax/diff checks pass. Replay controller, claim/ack matching,
closing, return-credit/refresh, audio/document/video/navigation bodies are frozen.
Authenticated unattended startup and Chrome popup policy still need retesting.


## Randomized task pacing and periodic rest (2026-10-29)

Baseline: `4a12681af987e1d73ae57c219835db98949a2443`. Overall status remains **PARTIAL** pending authenticated testing.

### Stage 1 — Configuration and scheduling

- Canonical `nextContent`: 3000–7000ms; `nextLesson`: 2000–8000ms; `nextChapter`: 3000–8000ms, inclusive integer samples.
- Removed fixed 5000ms navigation override. Preview receives the scheduler's exact absolute deadline; no separate preview wait. Assessment deferral uses actual chapter routing once; verified GM return uses the same lesson/chapter route.
- `nextVideo`/`nextAudio`/`nextDocument` delay aliases resolve to `nextContent`; their duplicate range fields are hidden. Their existing feature switches remain. Document scroll intervals remain unchanged and are reading operations, not another transition delay.
- Settings key remains `xuexitong.v3.action-settings.v1`. One-time `pacingVersion:1` migration updates the three approved ranges, adds independently enabled rest defaults, preserves unrelated feature/range preferences and selects `custom` so the old legacy override cannot defeat migration. Users may explicitly select legacy afterward.
- Rest settings: enabled; task target 3–6; duration 300000–420000ms. Changes cancel affected pending execution; explicit rediscovery resumes. Active deadlines are not rerolled when ranges change. Disabling short delays removes remaining ordinary waiting after rediscovery but leaves rest intact. Disabling rest ends that pending rest and resets the work cycle on explicit resumption. Restore Defaults resets preferences, not completion history/deadlines.

### Stage 2 — Isolated coordinator

`createTaskPacingCoordinator` owns count, quota, course-local completion ledger, pending boundary, consumed marker and absolute rest deadline. Execution, cancellation, page watches and revalidation remain in the existing action scheduler. Completed deadlines have one-shot consumption; Stop does not delete accounting or schedule automatic resumption.

Storage is namespaced by course ID. It contains course/lesson IDs, content kind and verified inventory ordinal, or GM session ID; no titles, full URLs, signed media URLs, cookies or account information. Owned inventory recognition is reused, without changing player selection. Unidentifiable content is not counted; changed recorded inventory stops pacing for manual review. Ledger is capped at 4096 entries with explicit local cleanup, rather than eviction that could recount replayed content. Corrupt storage or failed writes stop automatic paced transitions with a diagnostic. Cleanup is an explicit stopped-user action and intentionally removes deduplication history.

### Stage 3 — Minimal hooks

- Owned, context-validated natural video/audio ended: records once before existing verification.
- Owned document's existing verified-bottom callback: records local reading only, without inventing platform credit.
- GM parent `returnCredit`: records session only after the existing natural-ended terminal path and positive platform proof. Child pairing/playback/close implementation is unchanged.
- Within-lesson starts pass one content gate; navigation passes one lesson/chapter gate. Due rest replaces ordinary delay. Refresh/reinjection restores the deadline; an elapsed rest resumes without a short delay. Reconstructed identities are rediscovered and validated, not used to restore old closures.
- Platform-controlled content already playing is not paused; notice explicitly says that transition was not delayed, with rest preserved for a later controlled boundary.
- Existing Chinese notice shows count, exact three-decimal waiting time or absolute rest countdown. Timer throttling can delay execution; millisecond sampling does not guarantee millisecond execution accuracy.

### Stage 4 — Focused evidence

Commands actually executed:

```text
node scripts/build-userscript.mjs
node tests/verify-v3.mjs
node --check v3_optimized.js
node --check tests/task-pacing-v3.mjs
node tests/task-pacing-v3.mjs
  RESULT: 6 focused synthetic pacing groups passed
node tests/customization-v3.mjs
  PASS: fixed 1.0x configuration, assessment detection, unknown-content safety
node tests/gm-live-v3.mjs
  RESULT: 8 focused GM lifecycle checks passed
TEST_FILTER="^pacing|^GM raw|^audio bounded|^knowledge map real|^controls owned document"
node tests/navigation-v3.mjs
  RESULT: 8 passed, 0 failed; Chrome 156, headless, simulated media/timers, network blocked
```

Tests cover sampled bounds, five independent contents, skipped/duplicate evidence, reload/deadline recovery, no stacked rest delay, live-session deduplication, settings migration, Stop/stale timers, actual natural-ended integration and preview/action deadline agreement. The existing GM raw browser case now runs on its synthetic HTTPS origin: `crypto.randomUUID()` is unavailable on the prior insecure blank page. No GM production logic was changed to satisfy that test.

Exact baseline body comparisons also passed for audio rejection/fallback, pause/stall/background guards, document-context validation, attachment credit, navigation eligibility, native opening, catalog navigation and the entire GM child implementation. Full historical suites were not run.

Authenticated acceptance still needed: actual 3–6 task cycles across mixed attachments, long rest through refresh and live return, settings changes while resting and platform-controlled autoplay timing. Ordinal deduplication relies on the unchanged owned inventory; identity-ambiguous layouts fail conservatively. Pacing data is local to the course origin/browser profile, not synchronized across unrelated origins or browser profiles. Multiple simultaneously automated course tabs are not a supported pacing coordination mode.


### Stable native-live pacing identity correction (2026-10-29)

Baseline: `7faceb2858e0e08cd674ddf6cb079f7d23dea3a9`. `_recordPacedLive` now reuses the existing native-card discovery/ownership validator on the current course-card document. Counting requires matching course and unique catalog lesson, a valid owned scope and exactly one native-live task. Its persistent content key is `{course, lesson, kind:"live", inventory:"live", ordinal:0}`; random GM attempt IDs remain exclusively in the unchanged lifecycle protocol. Multiple or unverifiable cards do not contribute a task. If the platform removes the card before credit verification, accounting conservatively omits the item and reports that limitation rather than guessing.

The hook remains exclusively inside the existing positive platform-credit branch after the terminal replay lifecycle. No pairing, playback, close, refresh, popup, delay or navigation logic changed. Previously counted legacy live/session entries in the same now-verified unique-card lesson suppress recounting after upgrade; historical overcounts are not retroactively subtracted.

Focused verification: `node tests/gm-live-v3.mjs` — 9 passed, including two distinct naturally ended/credited GM sessions counting once, a different unique lesson counting separately, media-kind separation, ambiguous/invalid scope rejection and legacy-record suppression. `node tests/task-pacing-v3.mjs` — 6 groups passed. Build and `node tests/verify-v3.mjs` passed with synchronized generated payload. These are synthetic/mocked results, not authenticated platform acceptance. Overall status remains PARTIAL pending user testing.


### Prior-completion catalog reconstruction repair (2026-10-29)

Baseline `90f89a06135503bb1c169ac4fbcf379e8789dd0c`. Code and synthetic reproduction confirm that `_schedule` rejected detached prior-credit nodes before the task-specific verifier could run, and that the verifier rebound only a temporary clone. `_schedule` now accepts an optional task-specific validator, used only by the 250ms prior-platform-completion callback. Other callers retain the original stale-node guard. `_priorCompletionValid` validates a detached-node candidate completely before updating the original record and completion reference; it retains route, generation, topology, title, fresh credit and contradiction checks, requires the original content document, and rejects replacement of a connected chapter. `_checkPriorCompletion` consumes the rebound record rather than captured obsolete nodes.

Focused checks: 11 selected browser simulations passed (same/different/duplicate catalog identity, no new task count, unchanged pending deadline, pacing, audio, document/knowledge-map and ordinary video); 6 pacing groups and 9 GM lifecycle cases passed. Build/synchronization and syntax passed. Tests explicitly invoke the captured 250ms callback between DOM replacement and unrelated lifecycle callbacks. No reader, media, GM, pacing or eligibility implementation was changed. Authenticated DOM replacement remains a supported hypothesis; actual lesson navigation requires user retesting. STATUS PARTIAL.


### Completed live and attachment readiness repair (2026-10-29)

Baseline `24c7d3b9b578730c9616280902a4a4ffc4923adb`. Positive platform credit on a matching done GM session now releases startup to ordinary prior-completion handling without stopping, reopening, counting or refreshing. Missing credit stops with an inconsistency notice. begin's fresh terminal branch re-enters the existing prior-credit check, not a recursive run.

Added `_classifyAttachmentReadiness` and `_waitForAttachmentReadiness`: only pending recognized attachment iframes with observable loading/initial about:blank evidence qualify, with a 10-second limit and existing generation/identity cancellation. Unsupported/inaccessible or unknown reason combinations remain blocked; no assumption that access failures are temporary. Prior-credit processing defers while that positive loading evidence exists, then resumes existing play/prior-completion checks. This deliberately does not claim to fix unidentified authenticated unsupported/inaccessible reasons.

Evidence: 12 selected browser simulations, 10 GM lifecycle checks and 6 pacing groups passed; build/synchronization passed. The new readiness test covers classification, not a complete authenticated loading-to-credit transition or every timeout/cancellation scenario. Frozen reader/media/pacing/GM-child implementations were not edited. STATUS PARTIAL: real completed-live continuation and document failure require user retesting, preferably with actual media reasons when still blocked.


### Follow-up terminal routing and document-only readiness (2026-10-29)

Baseline `38c656987f7495b9618094da9c6dab183757065a`. The FIRST reachable GM begin terminal branch now delegates fresh done+credit to the existing prior-completion verifier, with safe stopping if it remains inconclusive. restore still releases ordinary startup; no replay, recount or second refresh. The earlier duplicate terminal block remains unchanged to avoid altering pending/active recovery paths.

Document-only loading no longer depends on media.pending. Classification uses platformTaskAdapter scope validation and documentViewer loading on recognized owned PDF boundaries. Unknown unsupported/inaccessible reasons remain blocked. WAITING_ATTACHMENT is included in play's waiting guard. Attachment failure notices include up to five restricted-format reason codes, never URLs or page data.

Executed: 10 GM lifecycle cases (including restore AND begin done routing), 6 pacing groups, 12 selected browser cases plus 3 Stop/route/timeout readiness cases passed. The classifier fixture now uses an actual native PDF boundary and loading inner document, pending=false. Build/source synchronization and syntax passed. Remaining test limitation: completed loading-to-credit and incomplete loading-to-reader are not newly covered end-to-end; existing completed-credit and actual document reading cases pass separately. The authenticated underlying media reasons remain unknown, so real-world coverage is PARTIAL. Frozen scrolling/media/GM child/pacing implementations were not edited.


### Document entry-credit and observation lifecycle (2026-10-29)

Baseline `10363532f5cb1dd05500e17cf4df8612ab8f807c`. `_observeCredit` now supplies its own stable route/ID/title/chapter/topology/document validator to `_schedule`, rebinding its actual observation node only when the original is detached and the replacement unique. Generic timer guards remain unchanged. `playCurrentIndex` captures the target's pre-click authoritative status; `_checkPriorCompletion` defers historical skipping for matching non-completed entry snapshots with owned unprocessed documents. Actual reading and genuine bottom callbacks remain unchanged. Historical already-green lessons retain normal skipping. Snapshots are in-memory; a full reload without the pre-entry observation cannot establish the origin of historical credit.

Four new browser simulations passed: on-entry green positive-range document still reads; same/different/duplicate observation reconstruction. Eleven selected prior/media/pacing browser regressions and ten GM lifecycle checks passed; six pacing groups and build/synchronization passed. Exact reader/pacing/GM-child source comparisons passed. New document test verifies reading starts and advances, but is not an authenticated full-bottom session; the existing bottom tests remain separate. STATUS PARTIAL pending actual platform retest. The authenticated catalog replacement event remains a hypothesis, while the scheduled-node defect is reproducible synthetically.


### Unattended-recovery request: partial click-cancellation correction (2026-10-29)

Baseline `a3099858781b1f3d550a9b6400389dfda3f3247e`. The pending-action click watcher now requires event.isTrusted before treating a click as user cancellation. Programmatic clicks do not themselves cancel; existing mutation/context and route validation remain unchanged. Seven selected browser simulations passed, including a generated click preserving the deadline followed by an actual trusted mouse click cancelling. Six pacing groups and build/synchronization passed.

This is only the source-backed false-click fix. The requested three-attempt recovery coordinator, durable tab-scoped budget, guarded reload, sustained-progress reset and persisted Stop/Resume protocol ARE NOT IMPLEMENTED. Existing failures can still require manual recovery. No unattended-recovery acceptance is claimed; the task remains incomplete and PARTIAL. No playback, GM, reader, pacing or credit implementation was changed.


### Bounded unattended recovery implementation (2026-10-29)

Baseline `2b444b2c4f81d9ec65bf2b4593f83bd654770806`. Added isolated createUnattendedRecoveryCoordinator and typed action cancellation. Watchers distinguish trusted user interaction, stale context, frame replacement, route and unload. Generated clicks remain non-cancelling; mutations cancel only on existing validation failure. Scheduler stale-fire cancellation is typed context-stale.

Session key xuexitong.v3.unattended-recovery.v1 stores version, verified course/class/lesson context (plus title/topology/route path), attempts, stage, reloadUsed, safe reason, stopped and cycle. No media URL or credentials. Attempts are persisted before one-second stabilization/action. Stage 1 rediscovery uses play; stage 2 uses run; stage 3 reloads once. Fifteen-second unresolved observations authorize subsequent attempts, never unconditional chaining. Reload/reinjection does not reset attempts. Invalid state fails stopped. A changed lesson gets an independent sequence. Explicit Stop handlers persist the marker; internal stopAutomation does not. Resume clears the marker explicitly. Page/route events cancel timers; destruction disposes them.

Recovery is allowed only for typed stale/frame/readiness failures with current unique task context, no unsupported/inaccessible/assessment/verification evidence, no competing/active media, no active document/live, no rest/credit/navigation. Reload also refuses an entry-credit snapshot or external/platform completion record. If unsafe, no reload is attempted. Media progress requires the currently selected owned player advancing across 3–10 seconds, paused/seeking false and plausible rate; real document progress and genuine task completion also reset the sequence. Pacing algorithms are unchanged. Monitoring polls do not count tasks.

Executed: deterministic coordinator test covers attempts 1/2/3, no fourth attempt or second reload, reinjection budget, persisted Stop, Resume, rejected unsafe recovery and progress reset. Six pacing groups, ten GM cases and twelve selected browser regressions passed. Exact reader/pacing/GM-child body comparisons passed. Build/synchronization passed. Browser recovery stages with actual reload, long-running progress and Tampermonkey remain unverified; tests of coordinator policy are mocked. Overall authenticated acceptance remains PARTIAL.


### Recovery review control-flow correction (2026-10-29)

Baseline `93f17b8db65ddf51bb260832081f5d3709adb353`. Budget identity now contains only course/class/unique lesson. A separate route/title/chapter/topology fingerprint validates pending recovery execution; it does not renew the budget. Temporarily absent identity retains saved attempts. Restore validates additional persisted fields. During observation, a new safe failure cancels that observer and advances the same sequence; an already waiting attempt returns handled without duplicate scheduling. Terminal blocking cancels and persists terminal recovery state. Storage failure notification is reentrancy guarded. Initial scheduler validation uses context-stale consistently with later validation.

Actual-app regression now exercises initial failed video-start validation, stage-1 retry, a second failure while observation is active, retained budget after cloned catalog and terminal cancellation. Existing deterministic three-attempt/one-reload, persistence/Stop/progress test and six pacing groups passed; ten GM cases passed. Selected browser run passed 12 cases with one storage-error recursion failure; that failure was corrected and the document/recovery cases rerun successfully. Exact reader/pacing/GM-child comparisons passed; build/synchronization passed. Real application reload/reinjection and sustained progress acceptance remain unverified end-to-end, beyond isolated policy tests. STATUS PARTIAL pending authenticated testing.


### Terminal recovery startup and late-progress guard (2026-10-29)

Baseline `ff2592cf4df15037eb45cd07194e3d9a33e0574d`. Shared `_recoveryEntryAllowed` checks restored stopped AND terminal status before bootstrap GM restore/startup, run and play. It displays the requested terminal notice and keeps automatic work stopped. Explicit Resume is the existing reset path. confirmProgress now rejects disposed, terminal, stopped or identity-mismatched callbacks; valid active progress remains accepted. Missing identity retains terminal state; positively changed lesson restores a fresh budget through existing restore semantics.

Actual-app browser simulation persisted attempt-3 terminal state into a fresh page bootstrap, reinjected twice, exercised direct run/play, cloned catalog, late progress and the existing Resume button. Eight selected browser cases passed, including audio fallback, ordinary video, pacing/deadlines and trusted-click cancellation. Audio tests now use a storage-capable synthetic origin and explicitly resume their deliberate retry, consistent with the new terminal rule rather than implicitly bypassing it via app.run. Six pacing groups plus recovery policy and missing/different-identity tests passed; ten GM cases passed. Build/synchronization, syntax and exact reader/pacing/GM-child comparisons passed. Fresh-page simulation transfers stored bytes rather than using a real browser reload; authenticated/Tampermonkey acceptance remains PARTIAL.


### Adaptive per-document traversal (2026-10-29)

Baseline `ec0105633c6998583e00300f9c880702da12a08a`. Shared readDocument samples one integer 5000–7000ms when traversal starts and uses performance.now elapsed/duration against the current positive scroll range. Document-step scheduling uses the existing action scheduler with a 100ms override, independently of transition/rest pacing. Stable real bottom is rechecked after 250ms; blocked scrolling cannot complete on elapsed time alone. Dynamic extent is recalculated each increment. Timer throttling/rendering can exceed the target. No discovery changes or new panView support.

Deterministic tests passed for 80/800/80000px ranges at duration minimum, maximum and a millisecond sample (5382ms), intermediate positions and one draw/session, growing extent, Stop, stale context and unscrollable viewport. Six pacing groups, recovery policy tests, ten GM cases and eight selected browser regressions passed. Build/synchronization passed. Exact discovery/recovery/pacing/GM-child comparisons passed. Historical document tests using frozen wall clocks were not run; new reader tests advance the actual injected monotonic clock. Authenticated timing, lazy-rendered real documents and throttled tabs remain PARTIAL.


### Mixed native-audio module composition (2026-10-29)

Baseline `1f494175915bb17285769c722d5fc44498148c79`. Removed unconditional unsupported-mixed-attachments and primary-autoplay-attribute-only rejection. Actual competing playback remains blocked. `_processSupportedTask` now returns media dispatch for BOTH video and audio pending inventory items, preventing a later document from overtaking earlier audio. Ordered inventory and all ownership checks remain intact. No playback engines were changed.

The obsolete mixed-audio BLOCK expectation was replaced by six actual-dispatch browser scenarios: video/audio; audio/video; audio/document; document/audio; video/document/audio/document; audio/audio/video/document. These drive natural-ended callbacks and monotonic document traversal through successive attachments, retaining the current lesson without platform credit. Scenarios also check two genuinely active players block and inactive recognized autoplay siblings do not. Eight existing selected browser regressions, six pacing groups, recovery/reader tests and ten GM tests passed; build/synchronization and syntax passed. Exact discovery-reader/recovery/pacing/GM-child bodies remained unchanged apart from the intended media inventory policy.

Audio historical credit remains unknown: existing evidence establishes a video-specific wrapper adapter, not authenticated equivalent audio attachment markers. No speculative audio-credit skip was introduced. Thus an audio previously credited only through an unverified attachment icon is not skipped; same-run genuine natural-ended handling remains supported. Authenticated mixed-module acceptance and native audio historical completion evidence remain PARTIAL. No mixed-live support or panView adapter was added.


### Optional compatibility adapters — phases A/B/C (2026-10-29)

Baseline `706a8616981a006abe5ee615fb8dac9b6ebf49a9`. A1 inspected existing owned inventory, dispatcher, document viewer, scheduler, recovery and pacing contracts. A2 reference is OCS branch 5.0, commit da5c0775a9d055724149ff505eae75bd85d334f9, packages/scripts/src/projects/cx.ts (the requested master path is absent). No OCS code was imported or transplanted.

Evidence matrix (all candidate matches are PUBLICLY_REPORTED_STRUCTURE, not authenticated Chaoxing proof):

| Candidate | Public source evidence | Ownership requirement | Operation / completion |
| --- | --- | --- | --- |
| Book | cx.ts lines 81,215,414: insertbook, /readsvr/book/mooc, ReadWeb comment | accessible root-owned ans attachment, book metadata, Chaoxing HTTPS reader route, ReadWeb | Recognition only; native sequential controls and credit unknown |
| Timed reader | lines 376–406: reader, readerPager, pagejump, timing | root-owned attachment, approved reader route, all selectors, integer timing 1–86400s | Recognition only; observed native next-page control and dwell/credit unknown |
| Audio slideshow | lines 1619,2260–2273: swiper-container/swiper-slide and audio | one accessible owned attachment with both structures, no existing handler claim | Recognition only; association, page transition and dual completion unknown |
| Hyperlink | lines 1620,1750: hyperlink | accessible root-owned attachment with hyperlink UI | Recognition only; destinations parsed, unsafe schemes flagged, never opened |
| Flash | line 81: insertflash module | root-owned attachment with explicit module metadata | Unsupported legacy diagnostic; no runtime or credit |

Source: https://github.com/ocsjs/ocsjs/blob/da5c0775a9d055724149ff505eae75bd85d334f9/packages/scripts/src/projects/cx.ts . CONFIRMED_STRUCTURE applies only to inspecting this public source, not live platform DOM. Discussion/interactive categories remain UNVERIFIED_ASSUMPTION and research-only.

B1 adds inspectAdditionalAttachment reporting kind, exact boundary, document/lineage, position, confidence, executable=false, null operation target, diagnostic and scope validator. Existing video/audio/document handlers have priority. Multiple candidate matches return no claim. Recognized new items enter the same ordered inventory but block execution with a manual diagnostic; no new navigation/completion engine. B2–B5 are isolated recognition-only adapters because sequential native controls and platform completion are not evidenced. No guessed controls, page jumps, forced mute, APIs, arbitrary link opening or external runtimes were added. Existing accepted behavior is retained.

C1: one sanitized synthetic fixture and a focused browser group cover five positive structures, existing-handler exclusion, ownership scope and unsafe URL scheme. Fourteen selected browser cases passed including all six mixed dispatcher compositions, normal video/audio, pacing and terminal recovery. Six pacing groups, reader/recovery tests and ten GM cases passed. Build/synchronization and exact frozen reader/discovery/recovery/pacing/GM-child comparisons passed. New page/slide execution is unavailable by design: no transitions or completed tasks are claimed. Negative near-match/ordering matrices and authenticated new-type layouts are not exhaustively tested. STATUS PARTIAL pending actual platform evidence; no new executable reader type is claimed.


### Phase C1 actual discovery integration correction (2026-10-29)

Baseline `9037328c4d0bb44fb31a046c9d85a5b5d1856374`. New tests use actual iframe src attributes, same-origin routed HTTPS documents, and the real videoAdapter inventory/application run. Five adapter groups verify manual-specific diagnostics, no navigation/counting, existing video/audio/document siblings retaining ownership/order, missing required selectors, unrelated UI, invalid metadata, inaccessible documents, stale lesson and detached owner. The missing-selector case for selector-free legacy Flash instead removes required metadata. Network routes serve local synthetic markup under the course origin; this is not evidence that cross-origin live platform readers are accessible.

Tests exposed a concrete defect: additional task scope only validated owner/document, allowing the captured task to remain valid after lesson replacement. Production change is limited to wrapping that scope with captured lesson ID/node uniqueness and current course frame/document. Existing modules are unchanged. Thirteen selected existing browser cases passed; all five expanded integration groups passed after correcting a test-only Document/body insertBefore mistake. Six pacing groups, recovery/reader policy checks, ten GM cases, build/synchronization and syntax passed. Exact frozen discovery/reader/recovery/pacing/GM-child bodies compare equal. Recognition-only tasks create no operations or completion signals. Explicit replacement-owner and full cross-origin sandbox matrices remain limited to detached/unavailable scope cases; no authenticated compatibility claim. STATUS PARTIAL pending real-platform acceptance.


### First delivery batch: A1/A2/A3/C1 only (2026-10-30)

Baseline `9ab8a42cc642a964c7a5423e84f0773380586ac5`. PARTIAL EXECUTION IS NOT YET ENABLED. No active dispatcher or navigation gate was relaxed.

A1 audit: discover produces global unsupported/inaccessible/pending/navigationSafe; `_discoverMedia` additionally rejects inventory mutation. `_discoverAttachmentTask`, `_processSupportedTask`, play and `_getVideoEl` depend on that discovery; `_refreshVideoContext` retains selected player/frame identity. `_continueCompleted` and `_verifyExternal` reject unknown or unsafe inventory before existing progression. `_navigationEligible`/`_externalNavigationEligible` retain whole-lesson credit and complete required task checks. `_checkPriorCompletion`/`_priorCompletionValid` retain established authoritative historical credit. `_pacedIdentity` and recovery also reject unsafe media. These gates are intentionally untouched.

A2/A3: added read-only `_planningSnapshot()` backed by createLessonPlan. Original discover output remains authoritative; the planning view includes separately root-owned unknown frames without changing active inventory. Classes are EXECUTABLE_KNOWN, DEFERRED_RECOGNIZED, DEFERRED_UNKNOWN, LOADING and GLOBAL_UNSAFE. Unknown/manual reasons may be localized only in the planning view after accessible independent frame boundaries and stable lesson/course are verified; extra/unassigned frame documents, root non-attachment content, active media, verification and all other unsafe reasons yield global unsafe. The returned objects/arrays are frozen; DOM references are in-memory only. Scope invalidates on route/lesson/title/chapter/frame/document/owner/order changes, duplicate IDs, access failures and changed safety outcome. Executable means candidate eligibility for future integration, never authorization now.

C1: createDecisionJournal exposed internally as `_decisionJournal`; append/read/clear plus ephemeral reference(input). Stored format `{version:1,events:[...]}` contains timestamp, random session/opaque lesson refs, ordinal and allowlisted type/kind/reason/evidence only. References are random UUIDs, not raw or reversibly encoded IDs. Unrecognized fields and free-form text are rejected. Pruning filters age over 7 days and retains newest 200 within conservative UTF-16 128KiB cap. Consecutive equivalent polling events deduplicate. append returns durable only after write/readback confirmation; failure returns explicit false. No execution, completion or navigation logic reads journal history; no automatic logging/dispatcher crossing is enabled yet. Failure to initialize diagnostics is isolated from normal playback.

Tests: nineteen selected actual-browser integration/regression groups passed, including known video/audio/document classes, isolated unknown and recognized types, active-media/inaccessible global unsafe, lesson/owner/order invalidation and unchanged blocked runtime. Six pacing groups, recovery/reader tests, ten GM cases and journal reload/age/count/size/dedup/privacy/storage-failure tests passed. Synthetic pages only, not authenticated Chaoxing acceptance. Explicit UI and complete lifecycle/event emission are out of this batch. Conservative root ownership excludes layouts not yet provable; no new executor or completion authority.


### First-batch review corrections: classification continuity and journal provenance (2026-10-30)

Baseline `8c6574050eaaa6232c95a04e74f08de9c807a28f`. Only createLessonPlan and createDecisionJournal production bodies changed. Snapshot scope now compares refreshed kind, classification, execution eligibility, reason, relevant module/type metadata and selected media target; same-frame selector loss or recognition transitions invalidate old snapshots. Incidental text is not compared. Managed single media is allowed only with matching selected player, active app, lesson/player context, generation, player document and unchanged source. Seeking, unowned activation and competing players remain unsafe. Root wrappers are restricted to ans-attach-ct with exactly one owner and one ans-job-icon and no unexpected direct children/nested wrappers, matching existing verified wrapper fixtures.

Journal append rejects caller timestamp/session fields and assigns generated values after caller data. These are local provenance constraints, not cryptographic authenticity or protection against page/localStorage tampering.

Focused verification: 21 selected actual-browser simulated groups passed, including known managed video/audio paused-to-playing continuity, metadata mutation, verified/misleading wrappers, five recognized structures losing selectors/metadata in the SAME document, unknown/active/inaccessible classification and existing compositions/terminal recovery/pacing. Six pacing groups, reader/recovery/journal tests, reserved-field override tests and ten GM cases passed. Build/synchronization and syntax passed. Full source comparison outside the two factories is exact: no original execution/navigation gate changed. Unknown-to-known and all possible platform wrapper permutations are not exhaustively tested; layout support remains deliberately narrow. PARTIAL EXECUTION REMAINS DISABLED. Authenticated acceptance remains PARTIAL.


### Second batch B1/B2/B3/C3 partial-session integration (2026-10-31)

Baseline `e0c414497a2c091515a1356549d64870fbae5c07`. Added per-lesson `_partialSession`, `_partialSelect`, `_partialEvent`, `_waitPartialTasks` and internal `recheckCurrentLesson`. Sessions require a fully validated planning snapshot with deferred tasks, no global hazard and no pre-existing whole-lesson credit. Raw discovery unsupported flags are preserved. The local media view carries explicit `localExecutionEligible` only under validated session scope; execution/context/completion gates recognize that scoped exception while navigation has an independent unconditional session veto. Current completion context may be inspected after known tasks finish, but waiting state permits no new task start. Existing all-known behavior stays on its original path.

Selection traverses original ordinals. Every crossed deferred boundary requires durable TASK_DEFERRED confirmation before later known work; unknown stays unresolved. Decisions are remembered only in the in-memory session, never read back as completion. Known pending tasks remain ordered. Local pacing identity uses original inventory position, not filtered-list index. Deferred tasks add no rest completions. Managed audio startup is accepted by the planner only with its existing selected-player context, without changing audio playback implementation. Known loading does not become deferred; it is routed to existing bounded startup observation.

After all eligible known tasks, WAITING_MANUAL_TASKS cancels recovery observation and reports unresolved ordinals. nextUnit and both navigation eligibility paths reject active partial sessions. Opportunistic green credit cannot release that veto. Explicit recheck validates current plan; fresh authoritative whole-lesson credit releases the session to existing prior-completion navigation; without credit it stays waiting or processes remaining known work. Historical green lessons bypass partial-session creation. No per-unknown attachment credit is fabricated.

Journal events include inventory, recognition, durable deferral, continuation, task start, local completion, observed platform-credit skips, invalid context/global blocking, manual recheck and manual waiting. No URLs/text/account data are added to journal. Existing append allowlists/privacy/caps unchanged. Diagnostic clear does not modify completion sets. Stop revokes the session and suspends recreation until explicit run. A separate tab-local partial-pause marker records only course/lesson context (not DOM/local-ended evidence); startup after matching refresh pauses for explicit recheck rather than replaying journal history. Corrupt marker fails paused. This is a pause guard, not execution/completion authority. No diagnostic settings UI was added.

Focused evidence: 19 selected browser simulations passed: all requested ordered unknown patterns, recognized Flash handoff, six all-known compositions, no navigation without credit, no additional unknown task count, journal clear and manual recheck without/with simulated platform credit, required journal storage failure, audio fallback, ordinary video, pacing/rest and terminal recovery. Six pacing groups, adaptive reader/recovery/journal tests, ten GM cases, build/synchronization and syntax passed. Exact document discovery, shared reader, journal, recovery factory, pacing and GM-child comparisons passed. Existing positive-only recognition tests that expected global blocking are superseded in this batch only where safe partial sessions apply; a complete historical browser suite was not run.

Remaining verification: actual refresh/reinjection pause behavior for partial sessions, every owner-replacement/cross-origin/security combination and full deferred recovery event diagnostics are not exhaustively integrated-test covered. The C2 UI and D final acceptance remain out of scope. Scoped partial execution is enabled for verified independent accessible inventory only; authenticated platform acceptance remains PARTIAL. No new module executor, guessed completion API or direct catalog navigation was added.
