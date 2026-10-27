# Unified compatibility review

**Current playback policy:** [PLAYBACK_POLICY_REVIEW.md](PLAYBACK_POLICY_REVIEW.md)
supersedes the historical strict media/auxiliary whitelist sections below. Prior
stage reports remain as history; the live bridge fail-closed boundary is unchanged.

Evidence boundary: all new execution evidence below is sanitized synthetic Chrome
DOM/media/timer simulation. User-reported authenticated successes are not replaced
by synthetic results. No new authenticated end-to-end result is claimed.

## Stage 1 — ordered attachments

Exact attachment classes partition a unique course-content document into an ordered
inventory with DOM references, owner, lineage, lesson identity, position and local
status. Four video attachments are sequential tasks, not competing visible panes.
The original discovery path and strict three-document auxiliary-audio predicate
remain unchanged for ordinary pages. The attachment path checks the same auxiliary
state, rejects unknown/inaccessible/ambiguous attachments and active siblings, and
invalidates the entire queue on attachment/document replacement. Playback remains
1.0x; genuine ended is deduplicated by the existing WeakSet. The original platform
completion marker remains necessary before lesson navigation.

A PDF attachment is retained as pending. With document automation disabled it
pauses; with it enabled, unsupported PDF internals stop safely. No PDF viewer DOM
or supported scrolling ownership evidence was supplied, so no PDF selector or
completion credit was invented. Stage 1 is PARTIAL for actual PDF processing.

Tests: `node tests/navigation-v3.mjs`: 291 passed, 0 failed (284 existing + 7
attachment cases). Cases cover ordered playback, duplicate ended, pending PDF,
unknown/inaccessible/duplicate players, unknown audio, active sibling and changed
inventory. Complete build, verification, customization, preservation, recorded-live
and native-entry suites run as delivery gates. Preservation snapshots explicitly
allow only the inventory integration; background recovery, completion/rebinding,
legacy popup protocol and legacy sources retain their previous comparisons.

## Stage 2 — native audio

A separate audio inventory requires a unique connected `audio_html5_api.vjs-tech`
inside a rendered Video.js container with a rendered control bar, visible iframe
ancestry and unique current lesson. Native audio rectangles need not be visible.
The secondary `audio1_html5_white` is accepted only inside its evidenced named
container when the entire container is hidden and the element is paused, at zero,
not autoplaying/seeking/errored. A rendered or active secondary is still unsupported.
Other audio, unknown tasks and inaccessible documents block. These are supported
structural restrictions, not a claim about the secondary's real business purpose.

The existing native-media recovery/completion coordinator now receives a selected
audio or video list; public discovery retains separate `videos` and `audios` fields.
No seeking/progress writes are introduced. Natural ended and platform confirmation
are required before leaving an audio lesson. Existing recovery guards are unchanged.

Chinese panel adds audio playback/next audio and audio-start/next-audio delays
(300–900ms / 500–1500ms). Version-1 migration supplies only absent audio fields,
retains all old values, honors legacy preset defaults and rejects malformed present
fields without replacing saved settings. Twelve synthetic cases cover recognition,
natural completion, marker absence/presence, immediate background recovery, startup,
disabled audio, unsafe secondary/auxiliary media and settings migration.

Authenticated audio-player wrapper/control markup and the secondary container's
actual hidden state still require user retesting. No blanket native-audio allowlist.

## Stage 3 — sidebar transitions

Capture catalog-name clicks and observe proven unique active-lesson ID changes.
One bounded WAITING_CATALOG gate cancels old work, detaches media events, increments
generation once, requires changed and stable card-document/media/task references,
then reuses startup readiness. It does not reload the page or repeatedly run the
application. Rapid new selections invalidate the previous gate. Same-ID catalog
clones/marker updates do not cause a restart. Script-initiated lesson navigation
owns its transition and updates the sidebar baseline before resuming playback.
Existing `.prev_white` handling is preserved verbatim after the catalog hook.

Six browser cases cover video→video, video→audio→attachments, stale ended and wait
callbacks, rapid selections, same-ID replacement, timeout/destruction, assessment
and native-live manual handling. Full previous suites remain required. DOM and
media events are simulated; sidebar operation on the authenticated site still
requires user retesting.

## Stage 4 at af56570 — superseded by targeted repair below (PARTIAL)

Install `xuexitong-live-bridge.user.js` separately alongside the unchanged-grant
core. Only the exact HTTPS course origin and replay origin match. Five GM storage
grants are used; no unsafeWindow, network grant, GM_openInTab or privileged page API
is exported. Script-scoped storage events carry ephemeral UUID/nonce/generation,
monotonic per-side sequences, document binding and a 24-hour cancellation expiry.
Only a salted exact-destination hash is stored; no signed URLs, course identity,
account or attendance records are persisted. Storage is deleted on parent cleanup.

The parent enters WAITING_LIVE and requests preparation. A trusted user must click
the existing native card, preserving its handler, then confirm pairing using the
platform-populated current `#openUrl`. The openerless child requires the explicit
temporary code, exact URL hash, replay flags 4/1 and one expected Video.js player.
Each direction validates its own sequence; outgoing messages cannot consume the
incoming sequence. The original legacy opener protocol remains byte-compared.

Only a trusted browser natural ended event reports completion. 99%, interruption,
elapsed time, pagehide and a core message alone do not. The core and companion both
re-read the platform completion marker. Native tabs are unowned: no automatic
closure is attempted. Child departure is labeled LEFT, not proof of closure.
After marker confirmation and departure, the parent asks the user to confirm that
the matching replay tab is closed; only then does the existing liveReturn delay
run once and revalidate navigation. This is **manual closure attestation**, not
automatic or independently verified tab closure. Missing companion retains the
previous manual-only native entry path. Missing/incorrect URL pairing stops safely.

Managed GM_openInTab opening and owned-tab automatic closure remain **disabled**:
there is no evidenced non-invasive route providing a current authorized URL before
native activation, and no owned tab handle. No synthetic profile is enabled to
pretend otherwise. Browser close-denial testing verifies that unowned tabs are
never targeted, not that managed closure works. Real Tampermonkey sandbox/storage
transport, signed-URL redirect equivalence and authenticated replay lifecycle are
not verified.

Bridge tests use two openerless Chrome pages on intercepted origins and mocked
script-scoped GM storage. One locally generated WAV exercises a genuine browser
ended event (not authenticated Chaoxing media); other media behavior is simulated.
Eighteen cases cover explicit pairing, wrong flags/URL, trusted activation,
duplicate preparation/completion, missing marker, one return delay, stale packets,
foreign origin/source/generation, two-hour waiting, interruption, expiry, replaced
player, parent cancellation and no unrelated closure. Managed automatic opening
has no positive compatibility test because that path is intentionally unavailable.

Final integration also refreshes the sidebar media baseline after a delayed boot
and admits a document-only inventory to readiness so disabled PDF tasks pause
instead of timing out. Both have dedicated regression cases.

## Reproduction commands and final results

With local Playwright and jQuery paths configured:

```
node scripts/build-userscript.mjs
node tests/verify-v3.mjs
node tests/customization-v3.mjs
node tests/preserved-v3.mjs
node tests/navigation-v3.mjs
node tests/recorded-live-v3.mjs
node tests/native-entry-v3.mjs
node tests/bridge-v3.mjs
node --check <each tracked .js/.mjs file>
git diff --check
git diff --cached --check
```

Stage gates: Stage 1 navigation 291/0; Stage 2 303/0; Stage 3 309/0.
Original af56570 gate: navigation 311/0; recorded-live 21/0; native-entry 19/0;
bridge 18/0. Build/verify/customization/preservation/syntax/diff gates passed.
No old behavioral test was deleted. UI field counts were
updated from 8/9 to 10/11 for the explicitly requested audio switches/categories;
historical source snapshots normalize only documented integration additions.

Authenticated retesting still required: four videos plus PDF stop, actual audio UI
and secondary-player state, delayed/sidebar transitions on real course pages,
natural completion/marker timing and complete native replay pairing/manual return
with the companion installed in Tampermonkey. Do not call this production-ready.

## Stage 4 targeted repair — discovery and terminal-message provenance

This correction supersedes the earlier Stage 4 automatic-return behavior. Stages
1–3 and the legacy owned-popup protocol are unchanged, enforced by a new literal
source comparison against af565701b82ac878c3a1a6467ed179e384161fd7 outside the
explicit bridge helper, native bridge selection and helper disposal boundary.

Root causes:

* The single constructor PING was lost when the companion had not yet installed
  its listener, and a global AVAILABLE latch did not bind capability to a task.
* Same-window origin/source, public session IDs and sequences identify a route;
  they cannot authenticate the isolated companion. A page script can observe the
  PREPARE payload and forge CLOSED. The baseline browser reproduction used a
  genuine ended event from local WAV playback and an observable completion marker;
  the forged CLOSED then caused ADVANCING and one next-lesson click.

Repair:

* Discovery now starts only for the current native-live controller, after its
  normal opening-action scheduler. It sends at most 20 probes, 250ms apart, with a
  five-second deadline. A fresh discovery UUID, task/session ID and generation are
  echoed in AVAILABLE. These are cancellation/correlation controls, **not sender
  authentication**. Exactly one response can activate exactly one PREPARE.
* Disposing the controller or support removes its listener and probe/session
  timers. Pagehide/beforeunload/history changes, app cancellation/destruction,
  settings changes and invalid task identity prevent stale activation. Lesson ID,
  unique node, card document and page address are captured separately from mutable
  DOM references. Missing or too-late companions require manual handling; only a
  new task/run can begin a fresh discovery session.
* The core bridge has **no onResult or return-scheduler call**. PAIRED/ENDED remain
  advisory, while the companion independently checks its own natural-ended state
  and the actual page marker. CLOSED stops the core and requests manual navigation;
  it cannot authorize completion, a return delay or lesson navigation. This also
  applies to a genuine companion/user closure message. No claim of authenticated
  same-window sender provenance is made. Stronger provenance would require an
  independently established trust channel, unavailable under this boundary.
* The companion still never opens/closes an unowned tab or rewrites the native
  platform handler. Its UI explicitly says to choose the next lesson manually.

Tests retain all prior cases, updating the former successful automatic-return
expectation to the required fail-closed behavior. Native fallback mock clocks now
expire discovery before asserting manual fallback; their safety assertions remain.
New cases cover both injection orders, delayed/missing companions, duplicate
availability, five discovery cleanup paths, replaced generations and a forged
same-window CLOSED **after genuine ended plus a completion marker**. The attack
now yields BLOCKED, zero next-lesson clicks and zero return actions. Real user
closure also yields no automatic action. Final commands/results are reported with
the published repair. Chrome/GM mocks are not Tampermonkey or authenticated
Chaoxing evidence; automatic native replay return remains deliberately unsupported.

Repair verification (all commands exited 0):

```
node scripts/build-userscript.mjs
node tests/verify-v3.mjs         # source/payload synchronized and syntactically valid
node tests/customization-v3.mjs  # fixed 1.0x / assessment / unknown-content smoke PASS
node tests/preserved-v3.mjs      # all historical checks + literal Stage 1–3 boundary PASS
node tests/navigation-v3.mjs    # RESULT: 311 passed, 0 failed
node tests/recorded-live-v3.mjs # RESULT: 21 passed; 0 failed
node tests/native-entry-v3.mjs  # RESULT: 19 passed; 0 failed
node tests/bridge-v3.mjs        # RESULT: 31 passed, 0 failed
node --check <all 16 .js/.mjs files> # PASS
git diff --check               # PASS
```

The original CLOSED reproducer failed against af56570 with ADVANCING and one next
click. It now passes with BLOCKED and zero clicks. A second forged ENDED+CLOSED
case cannot replace natural playback completion. The former automatic-return test
also verifies genuine user confirmation yields zero randomized return draws and
no automatic continuation. All private fixtures remain excluded from Git.

## Authenticated-regression repair from f587605 (PARTIAL)

Confirmed causes: attachment discovery ran before generic audio discovery, and
rejected the real `ans-insertaudio` class before looking inside it. Video attachment
classification rejected every form/input/object/embed/canvas even when a valid
player owned a control. The authenticated root auditionAudio also failed its
predicate, but the supplied diagnostic omitted several required properties. Its
individual failing condition cannot be inferred. The strict predicate is retained.

Exact scope:

* Exact audio attachments now enter bounded, attachment-scoped traversal and reuse
  the existing unique Video.js primary, rendered wrapper/control bar, visible
  iframe-lineage and secondary-audio checks. Missing primary media is pending,
  not a permanently unsupported attachment; readiness remains bounded to 40
  samples at 250ms. Unsupported or inaccessible media is never treated as done.
* Range inputs are allowed only inside the same Video.js wrapper/control bar as
  one native player, with aria-controls referring to its unique document-local ID,
  no name and no external form association. A control form must have no action,
  method, target, name, ID or inline submit handler, and contain only such linked
  controls. This is an explicit synthetic supported contract, not an assertion
  that the authenticated rejected controls have this shape. All other forms/inputs
  and all object/embed/canvas remain refused with specific redacted reason codes.
* Auxiliary audio retains its identity/class/DIV/controls/hidden/idle/error checks.
  New reason codes identify the actually observed failed checks (for example,
  auxiliary-audio-controls), without printing values, course IDs or URLs. No
  failure is guessed from the incomplete authenticated report.
* Public video/audio candidates and raw audio elements remain separate from the
  ordered native-player queue. Multiple verified audio attachments run sequentially
  using audioPlayback/nextAudio and audioStart/nextAudio delays. Unknown audio+video
  or audio+PDF mixtures block explicitly; they do not discard the video list or
  silently skip an attachment. Four-video/pending-PDF behavior is preserved.
* Incomplete inventories are not frozen during readiness. Once bound, changed
  kind/attachment/media/document references invalidate the task. Completion,
  marker confirmation, sidebar generations, assessment deferral, recovery, settings
  and the entire fail-closed live bridge remain unchanged from f587605, checked by
  literal source comparisons outside the four allowed coordinator integration
  methods and media adapter. No completion credit or seeking writes were added.

The two new diagnostic HTML fixtures state observed outer topology separately from
assumed inner controls, root-audio properties and secondary-wrapper visibility.
They are authored synthetic structures, not sanitized claims of complete captures.
Tests run the actual f587605 source as a negative control: the modeled video UI
blocks as unknown-attachment-content; the modeled audio attachment blocks as
unknown-attachment with only its root document traversed. They do not reproduce
the authenticated auxiliary predicate failure without its missing properties.

New regressions cover entry/reboot, delayed/missing primary media, inactive or
duplicate players, explicit control ownership versus independent forms/objects,
active/visible/ambiguous auxiliary audio, secondary audio, disabled audio, sequential
nextAudio switches/delays, genuine-ended simulation followed by delayed markers,
exactly one navigation, stale callbacks and conservative mixed-task rejection.
Previous sidebar, four-video/PDF, 1.0x/background and live security tests remain.

Remaining authenticated gaps: the exact rejected video control elements and their
player ownership, the omitted auditionAudio properties, and the current audio
wrapper/secondary-player state were not supplied. Those unverified structures
remain blocked. No authenticated retest was performed; this is PARTIAL, not a
claim that both real pages now play. Native replay auto-return stays disabled.

Final repair verification (exit 0 for every command):

```
node scripts/build-userscript.mjs
node tests/verify-v3.mjs         # synchronized payload and valid syntax
node tests/customization-v3.mjs  # PASS: fixed 1.0x / assessment / unknown-content smoke
node tests/preserved-v3.mjs      # PASS: unchanged runtime outside allowed media methods
node tests/navigation-v3.mjs    # RESULT: 360 passed, 0 failed (311 previous + 49 new)
node tests/recorded-live-v3.mjs # RESULT: 21 passed; 0 failed
node tests/native-entry-v3.mjs  # RESULT: 19 passed; 0 failed
node tests/bridge-v3.mjs        # RESULT: 31 passed, 0 failed
node --check <all 16 .js/.mjs files> # PASS
git diff --check               # PASS
```

No private HTML, authenticated address or account identifier was used in a new
fixture or staged for publication. All eight private fixtures remain ignored.

## Inactive root auxiliary error 4 repair from 06ca058

Authenticated evidence now identifies the rejected root auditionAudio state:
paused=true, autoplay=false, seeking=false, currentTime=0, error.code=4. These
values show that the blanket !audio.error term, not playback activity, caused
auxiliary-audio-not-idle. They do not establish src/currentSrc/srcObject or child
source declarations, nor prove that error 4 is safe for any actual lesson player.

The scoped exception preserves every independent uniqueness, root ownership,
empty-class, DIV-parent, controls, connection/hidden, paused/autoplay/seeking and
position condition. It accepts error 4 only in the unique current course-content
root after local checks confirm **no src attribute (including no empty src
attribute), currentSrc === '', srcObject === null and no source descendants**.
This is a conservative no-declared/selected-source case, not an exemption for
declared but unsupported URLs. Unobservable source state also remains blocked.
Error-free auxiliary behavior is retained; this new source rule applies only to
the code-4 exception. No source attribute, player position or error is cleared.

Diagnostics separate actual inactivity checks from error classification. An allowed
case emits neither unclassified-audio nor auxiliary-audio-not-idle. Refused error
codes emit auxiliary-audio-error-unsupported-code; declared/selected/stream or
unobservable sources emit auxiliary-audio-error-source-unverified. No source value
or authenticated URL is printed. The same error policy gates the legacy ordinary
video auxiliary exception, so that path cannot bypass the source/error boundary.

Primary video/audio media with any actual error now explicitly blocks discovery,
including code 4. Secondary audio retains its strict no-error rule. Unsupported
media and task ownership checks are unchanged. Literal source comparisons against
06ca058 limit runtime changes to the auxiliary policy/diagnostics and the explicit
failed-player refusals; completion, 1.0x/recovery, settings, attachment ordering,
pending PDF, sidebar, assessment and fail-closed live bridge remain unchanged.

Tests reuse the existing labeled synthetic fixtures, simulate MediaError fields,
and explicitly distinguish observed idle/error attributes from the unobserved
source state. Positive no-source fixtures are not evidence of real source values.
The actual 06ca058 source is run as a negative control for both native video and
audio: code 4 produces the original not-idle/unclassified refusal. Positive and
negative cases cover no error versus code 4, all independent state/identity guards,
other codes, source declarations/current source/streams/unreadable state, primary
and secondary failures, missing primary media, legacy scope and changes after
playback starts. Ended plus a delayed platform marker still gates navigation;
primary failure cannot convert an ended event into local completion.

Authenticated status remains PARTIAL until the user retests. In particular, the
newly supplied idle/error attributes alone cannot prove the real lesson satisfies
the source boundary. Source-bearing or otherwise unsupported cases deliberately
remain blocked; no authenticated playback or completion PASS is claimed.

Final checks for this repair (all exit 0):

```
node scripts/build-userscript.mjs
node tests/verify-v3.mjs         # synchronized payload and valid syntax
node tests/customization-v3.mjs  # PASS
node tests/preserved-v3.mjs      # PASS, including exact 06ca058 scope comparison
node tests/navigation-v3.mjs    # RESULT: 421 passed, 0 failed (360 previous + 61 new)
node tests/recorded-live-v3.mjs # RESULT: 21 passed; 0 failed
node tests/native-entry-v3.mjs  # RESULT: 19 passed; 0 failed
node tests/bridge-v3.mjs        # RESULT: 31 passed, 0 failed
node --check <all 16 .js/.mjs files> # PASS
git diff --check               # PASS
```

The baseline-source negative controls reproduce the authenticated attribute/error
combination's not-idle rejection; repaired positive cases exercise only the
explicitly source-less synthetic boundary. All private fixtures remain excluded.
