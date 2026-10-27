# Task controls, navigation preview and native document support

Status: PARTIAL pending authenticated user retesting. Baseline: `b880e87`.

- Chinese task panel: inspect/select a type, retry once after BLOCKED without
  refreshing, reuse existing automatic feature settings, stop pending operations.
  Selection does not authorize another type or override ownership/completion.
- Chinese notice and global stop/rescan controls. Cross-lesson navigation uses
  one scheduler timer of 5000ms with a live cancellable preview, replacing that
  transition's random delay. Other action delays remain unchanged.
- Confirmed PDF attachment frames: bounded same-origin viewer search, loaded
  images/canvas and genuine layout/scroll checks, incremental reading. Local
  bottom cannot authorize navigation without platform completion confirmation.
- Live: existing native entry support plus a unique visible approved-origin
  native link in a live/replay lesson. Explicit manual activation preserves the
  native handler and destination. Opening/popup success cannot be confirmed from
  anchor.click(); the UI says so. Unowned tabs are never closed, and the existing
  fail-closed bridge remains unchanged. Text-only replay cards stay unsupported.

Tests: build, payload verification, customization smoke, preservation/syntax/diff
checks; 13 targeted Chrome cases passed, zero failed (mock media/timers, network
intercepted). Filter: `^controls |^repair C|^audio native primary|^multi-attachment inventory|^sidebar single video|^sidebar audio`.
Five new cases cover controls, preview cancellation, nested document readiness/
credit, and native opening requests. The audio completion assertion now checks
the required preview before navigation; its ended/marker checks remain intact.
Final retry checks also cover stale-inventory recovery and explicit resumption
after stopping a prior-credit countdown; automatic loop guards remain enabled.
No full historical browser-suite run was required or claimed this iteration.

Unknown standalone/non-PDF viewer markup, browser PDF plugins, inaccessible
frames, lazy/unrendered pages, and the reported replay card without validated
DOM/link evidence remain unsupported or bounded failures. The reported card is
not claimed fixed. Please retest actual document rendering, platform credit,
popup behavior and five-second stopping on Chaoxing. No private HTML published.
