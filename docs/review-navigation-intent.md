# Navigation identity and document classification

PARTIAL pending authenticated retest. Baseline e68d493.

Destination references were compared directly despite sidebar replacement.
Detached targets are now re-resolved by unique ID, title and chapter topology;
course-route checks and stable destination content confirmation remain required.
Navigation scheduling now uses a frozen intent record and safety revalidation,
without treating arbitrary child mutations as failures. Non-navigation watchers
remain unchanged. Source platform-credit identity can survive detached-node
replacement. Visible cancellation reasons distinguish route, destination and
completion/ownership failures. The actual authenticated cancellation trigger is
still unconfirmed; no specific DOM trigger is claimed proven.

Document detection retains innermost-container selection. Among multiple owned
viewer documents, one genuinely overflowing viewport can be selected over fitting
shells. Multiple independently scrolling candidates still stop, reporting counts;
no visual order is guessed and platform credit remains separate. Real knowledge-map
DOM is unavailable, so unsupported multiple-reader topology remains PARTIAL.

Nine targeted simulated Chrome cases pass: sidebar replacement, benign update,
route handoff/autoplay, prior credit, Stop/retry, document waiting/scroll credit.
Existing fixtures reused. Build, verify/customization, syntax/diff checks pass.
No full historical suite or authenticated compatibility PASS claimed.
