# Automation resumption repair

PARTIAL pending authenticated retest. Baseline: 281eda3.

Navigation frame-load cancellation now checks actual validity instead of
unconditionally cancelling navigation categories. Five-second scheduling and
explicit cancellation remain intact. Destination route validation permits only
chapterId/knowledgeId changes within the same origin/path; all other parameters,
including course identity, must remain identical. Unknown route formats fail safe.

Whole-lesson credit no longer depends on irrelevant media readiness/classification.
Stable identity, platform marker, contradictory counts, assessments, verification,
inaccessible task scope and competing playback checks remain. The precise original
advanced-study DOM rejection cannot be proven without that DOM; multiple unnecessary
media prerequisites were established from source and removed.

Historical visits are committed only on confirmed arrival (the source is then
known to have been left). Stop/failed navigation does not add history. Explicit
rescan retains history; actual return to a departed lesson remains blocked.

Build, verify/customization, syntax/diff checks passed. Seven targeted simulated
Chrome cases pass using filter `^resumption |^lifecycle |^credit |^controls five-second`.
The prior visit-count assertion now counts confirmed departures rather than
scheduled intentions. No full historical browser suite was run. Attachment credit,
document-viewer expansion and replay adapters were not changed. Private HTML excluded.
