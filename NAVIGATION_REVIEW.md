# V3.4.0 navigation implementation review

**STATUS: PARTIAL** — implementation and local tests complete; independent ChatGPT review and authenticated platform acceptance are outstanding. The user has authorized publishing this candidate to the fork review branch; independent implementation acceptance remains pending.

## Baseline and final files

Repository: `D:\xuexitongScript-master`, review branch `review/v3.4.0-modular-navigation`.
Recoverable baseline: `e907cdda9d50fd80c61721061ed0988dfec621a4` (V3.3.0).
Source: `v3_optimized.js`. Generated delivery: `v3_optimized.user.js`, metadata version **3.4.0**.
The original baseline is preserved on `master`; this candidate is prepared for publication on the dedicated review branch only. No merge, tag, release, or pull request is authorized in this publication step.

## HTML sample analysis and compatibility matrix

All eight local files identify themselves as `SANITIZED_STRUCTURAL_EXTRACT`. They are compact reference structures, not complete authenticated pages. Source-group metadata divides them into two groups, but the retained DOM is mostly shared. The only meaningful additional hierarchy shown is the nested group in sample 06. No inner player, JavaScript-driven tab semantics, full directory, or task-level completion mapping is available.

Shared observed selectors: `#coursetree`, `.posCatalog_select`, `.posCatalog_name`, `.posCatalog_active`, `.posCatalog_level`, `.prev_title`, hidden `.prev_list`, numeric `.prev_white`, `iframe[info="card"]`, and the `/knowledge/cards` entry path. Task counters describe unfinished task points, not media counts. Course titles and identifiers are intentionally omitted here.

| Sample | Group | Confirmed structural evidence | Candidate behavior on supplied outer DOM | Media compatibility |
| --- | --- | --- | --- | --- |
| 01 | 1 | Active content leaf; unfinished count 2 | Bounded loading, then BLOCKED | Unknown; no player DOM |
| 02 | 1 | Active content leaf; unfinished count 1 | Bounded loading, then BLOCKED | Lecture title does not establish player type |
| 03 | 1 | Assessment title; unfinished count 1 | Immediately BLOCKED | No answering or skipping |
| 04 | 1 | Active content leaf; completed icon | Bounded loading, then BLOCKED | Completed icon alone does not select a media adapter |
| 05 | 2 | Active content leaf; unfinished count 1 | Bounded loading, then BLOCKED | Audio title does not establish player structure |
| 06 | 2 | Nested firstLayer group and content leaf | One eligible leaf; bounded loading, then BLOCKED | No player DOM |
| 07 | 2 | Self-test title; unfinished count 1 | Immediately BLOCKED | No answering or skipping |
| 08 | 2 | Active content leaf; completed icon | Bounded loading, then BLOCKED | No player DOM |

The samples establish outer selectors and fallback behavior only. No sample establishes automatic video, audio, lecture, or numeric-tab compatibility on a live course.

## Implemented changes / concise changelog

Retained: existing jQuery bootstrap and userscript-manager format, autoplay, muted fallback, video events, page guards, pause recovery, stall detection, and recovery cooldown. No new runtime dependency or AI integration. DeepSeek and legacy source remain unchanged.

Modified: dynamic DOM-order leaf traversal replaces fixed two-level indexing; directory entries are not called videos. The active leaf must be unique. Entries are rediscovered for each navigation, supporting newly inserted directories without inventing absent nodes. At the visible directory end, FINISHED means only that the visible list ended.

Added: separate catalog rules, a normal-video discovery adapter, and coordinator methods inside the existing IIFE. States are DISCOVERING, LOADING, READY, PLAYING, VERIFYING_COMPLETION, READY_TO_ADVANCE, ADVANCING, BLOCKED, and FINISHED. Unknown media types are blockers rather than speculative adapters.

Added: per-session timer cancellation and generation checks, active-node and content-title checks, stale-player rejection, pending-play protection, and a per-element completion WeakSet. Duplicate ended/monitor signals converge on one completion action. Navigation stays locked until the target becomes active and the identified cards iframe has a new Document. Unrelated iframe changes cannot acknowledge navigation.

Added: video discovery across accessible nested iframe documents (bounded to four levels); recognized videos are selected dynamically and played sequentially after natural ended events. Audio, nonmatching players, inaccessible frames, deep frames, and unrecognized nonempty leaf frames stop automation. The initial reviewed implementation examined every outer iframe; the scope remediation below replaces that entry point with the unique cards frame.

Modified: navigation requires the current catalog completed icon with no positive unfinished count. Zero alone, malformed counts, missing markers, and contradictory positive counts do not prove completion. Missing confirmation is polled with the existing retry bounds and then stops. The script only reads these signals; it does not create completion markers or submit progress. This is observable DOM evidence, not independently verified server state.

Modified: 1.0x is enforced on playback and ratechange; `configs.playbackRate` remains an assignment-compatible property that always returns 1. `autoAdvanceNoVideo` remains present but cannot bypass unknown content. `nextUnit()` and `playCurrentIndex()` require coordinator confirmation rather than providing a blind skip. Assessment-like titles, including the observed self-test label, stop automation.

Limited retained tab support: from the legacy learning-objective title only, a unique visible numbered video tab may be selected. Arbitrary numeric prefixes replace the fixed `2` assumption. Multiple unresolved content tabs block chapter exit; numeric-only tabs are not guessed. This legacy rule is covered synthetically, not established by the eight files.

## Real test results

Environment observed: Node v24.18.1; installed Chrome 156.0.8078.48, headless. Tests launch a fresh browser context, block network requests, parse reference HTML inertly, remove scripts/resource attributes/event handlers, and do not execute reference scripts. Eight reference-DOM cases executed successfully in Chrome. These are local browser DOM tests, not authenticated Chaoxing acceptance.

Commands executed from the repository:

```powershell
node scripts/build-userscript.mjs
node tests/verify-v3.mjs
node tests/customization-v3.mjs
node tests/preserved-v3.mjs
$env:PLAYWRIGHT_MODULE = 'C:\test-tools\node_modules\playwright\index.mjs'
$env:JQUERY_PATH = 'C:\test-tools\jquery-3.6.0.min.js'
node tests/navigation-v3.mjs
```

The environment-variable paths above are sanitized examples replacing machine-specific paths used for execution. The Playwright path and local jQuery file are test inputs only. No package manifest or project dependency was added. On another machine, point PLAYWRIGHT_MODULE to an installed Playwright module (or install it in the test environment), and JQUERY_PATH to jQuery 3.6.0. The local test copy matches the existing runtime CDN version, with SHA256 `ff1523fb7389539c84c65aba19260648793bb4f5e29329d2ee8804bc37a3fe6e`.

Build exits 0 without output. Verification outputs:

```text
V3 source and userscript payload are synchronized and syntactically valid.
PASS: fixed 1.0x configuration, assessment detection, and unknown-content safety (VM smoke).
PASS: background guards/stall code preserved; recovery adds only stale-session guard; monitor completion dispatch updated; DeepSeek and legacy source unchanged.
```

Additional executed checks:

```powershell
Get-ChildItem -Recurse -File -Include *.js,*.mjs | ForEach-Object { node --check $_.FullName }
git diff --check
git diff --exit-code -- deepseek-console v2.js xuexitong.js tests/verify-v3.mjs
git check-ignore fixtures/private/sample-01.html fixtures/private/sample-02.html fixtures/private/sample-03.html fixtures/private/sample-04.html fixtures/private/sample-05.html fixtures/private/sample-06.html fixtures/private/sample-07.html fixtures/private/sample-08.html
```

The executed syntax enumeration excluded `.git` and private fixture paths. Results: 12 JS/MJS files passed; `git diff --check` and the protected-file diff exited 0; all eight private paths were returned by `git check-ignore`; `git ls-files fixtures/private` returned no paths. Git emitted only its configured LF-to-CRLF working-copy notices. No unrelated Git settings were changed.

## Synthetic test results

The Chrome suite includes 40 synthetic cases plus eight reference-structure cases. All media play promises, ended/paused values, platform-marker updates, focus events, and timers are simulated. No test changes actual course records. Synthetic fixtures are generated inline in `tests/navigation-v3.mjs`; none copies private chapter titles or identifiers. Full executed suite output follows:

```text
ENV: Chrome 156.0.8078.48; headless; network blocked; media and timers simulated.
PASS private sample-01: inert outer structure and safe fallback
PASS private sample-02: inert outer structure and safe fallback
PASS private sample-03: inert outer structure and safe fallback
PASS private sample-04: inert outer structure and safe fallback
PASS private sample-05: inert outer structure and safe fallback
PASS private sample-06: inert outer structure and safe fallback
PASS private sample-07: inert outer structure and safe fallback
PASS private sample-08: inert outer structure and safe fallback
PASS synthetic 1 videos: dynamic discovery, natural end, platform confirmation
PASS synthetic 3 videos: dynamic discovery, natural end, platform confirmation
PASS synthetic 4 videos: dynamic discovery, natural end, platform confirmation
PASS synthetic unfinished counter is never used as video count
PASS synthetic completion absent: bounded wait and no navigation
PASS synthetic delayed platform completion
PASS synthetic duplicate ended and monitor callbacks schedule one completion
PASS synthetic delayed player retry
PASS synthetic nested same-origin player
PASS synthetic stale player removed: detached player never reused
PASS synthetic cross-origin-like inaccessible iframe: safe block
PASS synthetic audio mixed with video: unsupported safe block
PASS synthetic unknown content never auto-skips
PASS synthetic quiz wins over cached player and pending callbacks
PASS synthetic unsupported multi-tab completion stops
PASS synthetic fixed normal rate after config assignment and ratechange
PASS synthetic absent navigation target
PASS synthetic missing active node blocks playback
PASS synthetic dynamic nested directory rescan
PASS synthetic navigation target: lock, active-node change and new iframe required
PASS synthetic navigation not acknowledged: bounded stop
PASS synthetic blur/visibilitychange resume with cooldown
PASS synthetic mouseleave/mouseout guards retained on document/window
PASS synthetic unexpected pause recovery and cooldown
PASS synthetic stall detection avoids repeated recovery
PASS synthetic destroy cancels callbacks and removes guards
PASS synthetic conflict: positive unfinished count overrides completed icon
PASS synthetic zero unfinished counter without completion icon is ambiguous
PASS synthetic unknown iframe alongside video stops
PASS synthetic user changes chapter before old completion
PASS synthetic pending play promise invalidated by quiz stop
PASS synthetic video completion while navigation is pending is ignored
PASS synthetic muted fallback remains active
PASS synthetic course has chapters with 1/3/4 videos, one transition each
PASS synthetic stale completion after player replacement cannot navigate
PASS synthetic unrelated iframe update cannot acknowledge chapter navigation
PASS synthetic retained learning-objective tab rule accepts arbitrary numeric prefix
PASS synthetic private reference sanitization does not execute scripts or handlers
PASS synthetic content title changes during completion verification: stop
PASS synthetic pending recovery rejection cannot restart playback after safe stop
RESULT: 48 passed, 0 failed; local Chrome DOM tests, simulated media/timers, no live platform.
```

## Background playback regression status

Preservation test compares exact method text to the Git baseline for `_bindPageGuards`, `_startVideoMonitoring`, and `_handleVideoPause`. `_tryResumePlayback` is compared against the baseline with only the explicit stale-session fallback guard allowed. `_checkVideoStatus` is unchanged except routing its completion dispatch to `_completeVideo`. Simulated Chrome events test blur/visibility recovery, cooldown, mouseleave/mouseout cancellation on window/document, paused recovery, stall recovery without repeated attempts, and guard removal on destroy. Muted fallback and promise cancellation also pass. A newly added regression first reproduced a late recovery rejection invoking muted playback once after a safe stop (47 passed, 1 failed). A local generation/player/node check now suppresses that stale fallback; the final suite passes 48/48. The recovery cooldown, direct resume call, active-session muted fallback, and stall thresholds are unchanged.

NOT EXECUTED: actual switching Chrome tabs, actual switching to another application, physical mouse leaving the learning page, real decoded-video recovery, browser throttling, or authenticated player behavior. Method preservation and synthetic tests do not prove background playback in those environments.

## Normal-speed playback status

VM and Chrome synthetic tests pass for fixed configuration and correcting a changed media playbackRate to 1.0. No currentTime, duration, attendance, completion-record, or progress-writing implementation was added. Actual platform player enforcement remains unverified.

## Supported and unsupported modules

Implemented and tested locally: outer catalog discovery/status signals; normal video elements matching the original V3 selectors; dynamic simultaneous video counts; sequential natural completion; nested accessible documents; safe assessment/unknown fallback; bounded completion confirmation and leaf navigation.

Unsupported: dedicated audio and recorded-lecture adapters, arbitrary numeric-tab navigation, non-V3/custom/canvas players, inaccessible cross-origin documents, frame nesting beyond the bound, ambiguous completion, dynamically replaced catalog nodes without stable identity, same-Document iframe content replacement during navigation, and directories not yet loaded into the DOM. A title alone never selects a new media adapter. Inaccessible or unrecognized frames inside the selected cards scope conservatively block playback. Unrelated outer auxiliary frames are excluded by the scope remediation below.

Necessary next evidence: sanitized rendered inner cards/player DOM before and after legitimate completion, mappings between content tabs and individual modules, audio/lecture player events, live catalog updates after completion, and a human authenticated run covering actual tab/application switching and mouse movement. Do not send cookies or authentication tokens.

## Files changed / Git status and diff summary

Tracked modifications: `README.md`, `scripts/build-userscript.mjs` (metadata version only), `tests/customization-v3.mjs`, `v3_optimized.js`, generated `v3_optimized.user.js`.
New reviewable files: `tests/navigation-v3.mjs`, `tests/preserved-v3.mjs`, `NAVIGATION_REVIEW.md`.
Local-only change: `.git/info/exclude` contains `/fixtures/private/`; all eight paths were confirmed ignored. No private fixture is tracked or included in the review patch.

Source and generated entrypoints are checked for exact payload identity. The final diff was inspected, including new tests and this report. DeepSeek, legacy scripts, existing verification, dependencies, remote configuration, and history remain unchanged. Publication is authorized only to `RXY712200/xuexitongScript` on `review/v3.4.0-modular-navigation`; independent acceptance is still pending. The preserved baseline is `e907cdda9d50fd80c61721061ed0988dfec621a4`.

## Remaining limitations and review decision

This is a tested implementation candidate with deliberately conservative navigation. It does not claim live compatibility or complete support for arbitrary module combinations. DOM completion markers cannot independently prove server-side completion. Media adapters and asynchronous page identity assumptions need the additional evidence above. Independent ChatGPT review is pending; no acceptance PASS is claimed. Review the published branch diff and this test evidence before approving implementation acceptance or any merge into master.

## Public review publication privacy check

The eight private reference files remain excluded locally and are not part of the publication. Only implementation, build, tests, and sanitized documentation are included. Machine-specific usernames/tool paths have been replaced with generic examples. Public test runs require access to separately supplied private reference files for the eight reference-DOM cases; those files are deliberately not published. No live platform acceptance is asserted.


## Independent-review remediation: course-task iframe scope

Reviewed parent: `82814b4427cfd9f48a2789eb3160ada42a3d9807`. Overall acceptance remains PARTIAL; this remediation addresses only the reported auxiliary-frame compatibility risk. Version stays 3.4.0.

Exact runtime change: `videoAdapter.cardFrame()` centralizes selection of a unique outer `iframe[info="card"]` or `iframe[src*="/knowledge/cards"]`. `cardDocument()` uses that same selection. `discover()` starts at that frame's Document (depth 1), replacing `visit(document, 0)`. It never falls back to outer videos or auxiliary frames. Missing or ambiguous cards roots are unsupported; a null/inaccessible selected document is inaccessible. Recursive checks inside the selected document and the existing depth limit remain unchanged, so inaccessible/unsupported nested task content still blocks. This does not infer subframe roles from arbitrary frame names: all descendants of the selected cards document remain conservatively in scope.

A preservation assertion against the reviewed parent verifies that **all source outside videoAdapter is unchanged**, including the catalog rules, coordinator, strict 1.0x behavior, focus guards, pause/stall recovery, and cooldowns. The userscript was regenerated by the existing build; build script, metadata, dependencies, DeepSeek, and legacy implementations are unchanged.

Two public fixtures under `fixtures/synthetic/` are generated examples, not private-page extracts:

- `course-with-auxiliary-frames.html`: 65 `.posCatalog_select` nodes (15 synthetic grouping nodes plus 50 mixed-depth content leaves), active leaf 37, and seven top-level iframes. Six auxiliary frames represent editor, popup, reporting, attachment, notification, and help UI. The course iframe is deliberately third rather than first.
- `course-task-video.html`: a synthetic legacy V3 video element inserted into a same-origin nested task frame by the browser harness. Media events, play promises, and completion changes are mocked.

The test harness selects the course frame explicitly rather than the first iframe. The former generic inaccessible-frame regression was clarified to place the denied frame **inside** the course document; the safe-stop assertion is retained. Ten new cases exercise normal, unsupported, and inaccessible auxiliary frames; unsupported audio, unknown, and inaccessible task frames; inaccessible/missing/ambiguous cards roots; active-leaf recognition and one confirmed leaf-37-to-leaf-38 transition. Auxiliary frame access is instrumented and expected to remain zero. Recovery on blur still works with those auxiliary frames present. Safety cases verify PLAYING before introducing task failures.

Before the runtime correction, the expanded suite reproduced four failures (54 passed, 4 failed): all three large-page playback variants and the large-directory navigation case. After correction, the entire suite passed: eight private reference-DOM cases plus 50 synthetic cases. These counts describe executed local Chrome tests, not live course coverage.

Commands rerun from the repository (Playwright and jQuery environment variables resolved locally as in the earlier sanitized command examples):

```text
node scripts/build-userscript.mjs
node tests/verify-v3.mjs
node tests/customization-v3.mjs
node tests/preserved-v3.mjs
node tests/navigation-v3.mjs
git diff --cached --check
```

Build exits 0 without output. The source/userscript synchronization and VM safety checks passed. The preservation suite additionally reports:

```text
PASS: scope remediation changes only videoAdapter; all catalog, coordinator, playback, focus, pause, stall, cooldown and rate code matches reviewed 82814b4.
```

New browser case outputs and final result:

```text
PASS synthetic scoped discovery with 65 nodes / 7 frames: normal-aux
PASS synthetic scoped discovery with 65 nodes / 7 frames: unsupported-aux
PASS synthetic scoped discovery with 65 nodes / 7 frames: inaccessible-aux
PASS synthetic selected task audio still blocks with auxiliary frames present
PASS synthetic selected task unknown still blocks with auxiliary frames present
PASS synthetic selected task inaccessible still blocks with auxiliary frames present
PASS synthetic inaccessible selected cards root blocks
PASS synthetic ambiguous cards roots block instead of falling back to auxiliary frames
PASS synthetic missing cards root blocks instead of scanning outer videos
PASS synthetic large-directory completion advances leaf 37 to leaf 38 only
RESULT: 58 passed, 0 failed; local Chrome DOM tests, simulated media/timers, no live platform.
```

Privacy boundary: fixtures/private remains locally ignored and untracked. Public synthetic fixtures use only generic generated labels, counters and IDs; no original HTML, course titles, account/session fields, credentials, or personal learning records are included. Source/build consistency, syntax, protected-source preservation, the staged diff and privacy checks are required before publication.

Remaining limitations: no authenticated real-platform playback, actual focus/application switching, decoded-media timing, or true cross-origin requests were exercised. Access denial is simulated with a throwing contentDocument getter. The original eight local files remain compact outer structures, not inner media samples. Unsupported audio/lecture players, ambiguous task completion, multi-tab mappings and unrelated auxiliary frames *inside* the cards scope remain conservative blockers. Independent review is still needed; do not merge into master on the basis of these synthetic results alone.

## Randomized navigation cooldown (V3.4.0)

Parent baseline: `6a44a2a4ca303f0f6102a73eeb4ed2261dd3ff99`. This is an operation-rate-limiting/stability change, not a platform-detection bypass or an implementation acceptance claim. Metadata stays at V3.4.0.

Defaults:

```javascript
randomCooldownEnabled: true,
randomCooldownMinMs: 5000,
randomCooldownMaxMs: 12000,
```

After natural media completion and the existing observable catalog completion checks, `nextUnit()` identifies a next eligible catalog target and queues one nonblocking, cancellable navigation timer. It draws a fresh integer with `min + Math.floor(Math.random() * (max - min + 1))` for each eligible navigation, inclusive of both bounds. Independent draws may legitimately repeat. It logs seconds with exactly three decimal places, for example `9.684s`. Setting `app.configs.randomCooldownEnabled = false` disables the randomized wait. Millisecond bounds are configurable; negative, fractional, reversed or above-native-timer-limit ranges stop safely. The limit is 2147483647ms.

The added NAVIGATION_COOLDOWN state prevents repeated completion/nextUnit calls from scheduling additional waits or bypassing a pending wait. Same-page remaining videos continue normal playback: no random wait is applied before those videos, because their individual platform task-completion mapping is not available. No cooldown is queued at the end of the visible catalog or before an assessment/unsupported target. No actively playing video is paused.

At expiry, the callback verifies the generation, active node, current title, completion-video identity and ended state, observable completed status, cards Document identity, discovered task safety, and next target's current adjacency/assessment status before navigating. All discovered videos must remain naturally ended and recorded in the in-memory completed-video set. No platform progress is manufactured.

Only during the wait, MutationObserver watches the outer DOM and selected task documents for invalidation. Temporary listeners cancel on manual clicks, content-frame load, replay, pagehide/beforeunload and history/hash navigation. Existing `_cancelTasks()` removes observers/listeners and cancels the setTimeout on run, blocking, manual step reentry, or destruction. State/generation checks also discard stale callbacks that are already queued. Property-only changes that do not emit a mutation (such as setting an input value) are caught by the expiry checks. Unrelated outer auxiliary-frame load events do not cancel valid waits, and their content documents remain outside discovery scope.

Preserved methods are compared against 6a44a2a: catalog/video-adapter source, run, page guards, pause/stall recovery and cooldowns, completion handling, media discovery, chapter switching, muted fallback and step reentry. `play()` differs only by refusing reentry during NAVIGATION_COOLDOWN. The prior scope-remediation whole-source equality check has been replaced with these explicit invariants because this authorized feature necessarily changes navigation and cancellation outside videoAdapter. The original V3.3.0 preservation assertions remain.

Executed commands (local test-tool environment as documented above):

```text
node scripts/build-userscript.mjs
node tests/verify-v3.mjs
node tests/customization-v3.mjs
node tests/preserved-v3.mjs
node tests/navigation-v3.mjs
node --check (all 12 JS/MJS files)
git diff --cached --check
```

Results: generated payload synchronization, syntax, VM safety and preservation passed. The existing 58 browser scenarios explicitly disable the new wait to retain their original immediate-navigation assertions. There are 33 additional cooldown scenarios covering default enabled settings, inclusive endpoints, integer millisecond values, 5000/5001 variation, independent draws, custom ranges, exact log formatting, invalid ranges, disabled mode, no cooldown during playback/unconfirmed completion, duplicate events, timer/listener cleanup, stale generations, revoked completion, changed tasks, auxiliary frames, 1.0x and background recovery.

The latest suite output for new cooldown cases and its final result:

```text
PASS synthetic cooldown integer milliseconds 5000
PASS synthetic cooldown integer milliseconds 12000
PASS synthetic cooldown integer milliseconds 5327
PASS synthetic cooldown integer milliseconds 9684
PASS synthetic independent random draw for every eligible navigation
PASS synthetic active playback and unconfirmed completion never draw a cooldown
PASS synthetic duplicate completion and nextUnit schedule only one cooldown
PASS synthetic cooldown cancellation and stale callback: destroy
PASS synthetic cooldown cancellation and stale callback: block
PASS synthetic cooldown cancellation and stale callback: click
PASS synthetic cooldown cancellation and stale callback: chapter
PASS synthetic cooldown cancellation and stale callback: title
PASS synthetic cooldown cancellation and stale callback: pagehide
PASS synthetic cooldown cancellation and stale callback: popstate
PASS synthetic cooldown cancellation and stale callback: unsupported-task
PASS synthetic cooldown cancellation and stale callback: player-replacement
PASS synthetic cooldown cancellation and stale callback: target-removal
PASS synthetic cooldown cancellation and stale callback: assessment
PASS synthetic cooldown cancellation and stale callback: replay
PASS synthetic cooldown cancellation and stale callback: content-reload
PASS synthetic cooldown cancellation and stale callback: nested-click
PASS synthetic cooldown cancellation and stale callback: completion-marker
PASS synthetic expiry revalidates completion even without a mutation event
PASS synthetic expiry revalidates task ended state and generation
PASS synthetic run invalidates stale cooldown generation
PASS synthetic disabled cooldown navigates without drawing randomness
PASS synthetic invalid cooldown range 7000/5000 safely blocks
PASS synthetic invalid cooldown range 1.5/12000 safely blocks
PASS synthetic invalid cooldown range 0/2147483648 safely blocks
PASS synthetic cooldown does not weaken fixed rate or background recovery
PASS synthetic auxiliary-frame load does not cancel a valid cooldown
PASS synthetic successful cooldown callback cannot navigate twice
PASS synthetic configurable fixed integer range is respected
RESULT: 91 passed, 0 failed; local Chrome DOM tests, simulated media/timers, no live platform.
```

Remaining limitations: all random values, media states and timers are controlled in these tests; no statistical independence claim or authenticated platform compatibility is established. Real browser throttling can delay callbacks, so 1ms is the sampling resolution, not a promise of wall-clock timer accuracy. Actual application/tab switching and uninterrupted live media remain manual acceptance requirements. The existing unsupported audio/lecture/tab mappings and DOM-only completion limitations still apply. Private reference HTML remains excluded; no private data, runtime AI, activity simulation or fingerprint spoofing is added. Publication is restricted to the existing fork review branch; no merge into master is authorized.
