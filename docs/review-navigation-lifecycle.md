# Navigation lifecycle repair

PARTIAL pending authenticated retesting. Baseline: 48dc4f1.

Confirmed source causes: automatic navigation required a different Document and
reused prior coordinator state; sidebar transition run reset visited lessons;
startup waiting did not recheck credit; unknown non-media observation fell into
media startup failure. These are corrected without changing player recovery.

Destination confirmation now requires the authorized target, changed content
identity or markup (in memory only), and two stable samples. Reused iframe and
Document objects are allowed; no change evidence still times out safely. The
visited guard survives transitions. Countdown exits show initiation, destination,
cancellation or failure; unsolicited changes cancel without automatic resumption.
Startup rechecks stable credit. Unknown non-media timeout reports unknown credit,
never completion. Attachment credit, document ordering and replay remain separate.

Targeted Chrome filter: `^lifecycle |^credit |^controls five-second`.
Six cases passed: consecutive credited lessons, credited to incomplete video,
reused Document, startup delayed credit, contradiction, cancellation/stale events.
Media/timers simulated; authenticated DOM mutation ordering remains unverified.
Build/verify/customization/syntax/diff checks passed. No full historical suite run.
