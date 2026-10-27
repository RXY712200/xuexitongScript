# Unified compatibility review

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

## Stage 4 — optional openerless companion (PARTIAL)

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
Final observed gate: navigation 311/0; recorded-live 21/0; native-entry 19/0;
bridge 18/0. Build/verify/customization/preservation/syntax/diff gates passed.
No old behavioral test was deleted. UI field counts were
updated from 8/9 to 10/11 for the explicitly requested audio switches/categories;
historical source snapshots normalize only documented integration additions.

Authenticated retesting still required: four videos plus PDF stop, actual audio UI
and secondary-player state, delayed/sidebar transitions on real course pages,
natural completion/marker timing and complete native replay pairing/manual return
with the companion installed in Tampermonkey. Do not call this production-ready.
