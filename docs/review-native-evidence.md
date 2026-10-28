# Native entry, media startup and nested document repair

PARTIAL until authenticated retest. Baseline 014b9bc.

Native live discovery now traverses course-owned accessible iframe ancestry
(depth bounded), requires one native card and exact current lesson association,
and inspects openUrl inside its owner document. Missing target remains unresolved,
not absent. Manual activation calls the original handler; popup outcome and return
remain unverified/fail-closed. No destination URL is constructed.

Selected source-present media may attempt normal play at readyState 0. Waiting
for HAVE_CURRENT_DATA previously prevented players that load only upon playback.
The readiness waiter no longer invokes load(), preserving resumed position.
Autoplay rejection follows existing audible/audio or video fallback handling.
Historical attachment credit remains unknown; no count/time/index inference.

Nested owned reader ancestry now removes containing shells before viewport
selection. This is structural rather than maximum-scrollHeight selection. Missing
nested rendering remains bounded; independent scrolling readers remain ambiguous.
Notification includes page-graphic count/range; local scrolling and platform credit
stay separate. Real knowledge-map topology still requires authenticated retest.

Five targeted Chrome simulated cases pass: nested native card/unresolved target,
source-present idle selected video, nested scrolling/credit, delayed rendering,
and existing route/autoplay. Build/verify/customization/syntax/diff checks pass.
No full historical suite or authenticated PASS is claimed. Private HTML excluded.
