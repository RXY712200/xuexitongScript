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
