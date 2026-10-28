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
