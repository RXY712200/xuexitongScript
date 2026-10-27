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
