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

## Document, chapter-assessment and cross-window infrastructure

**STATUS: PARTIAL.** Parent baseline is `8d7ab1510b5371094ca77e6ffad96fdc08dd0219`. Executable infrastructure and synthetic integration are implemented; no real document/live adapter is enabled, and authenticated platform acceptance remains outstanding. This section supersedes earlier blanket statements that assessments always stop and that only video completion can authorize navigation.

### Adapter boundary and supported functionality

`app.taskAdapter` defaults to **null**. No document-viewer selector, live entry URL, destination domain or live-player selector has been invented. An evidence profile may supply `discover({node, document})`, returning null for unrelated pages or `{tasks, validateScope}` for an entirely recognized cards scope. Each task has `kind: 'document' | 'live'` and a connected `element` in that cards document or its accessible descendants. `validateScope()` must remain true only while the entire task set is known, with no unknown/verification components. Exceptions fail closed. A registered profile's known document scopes may contain approved document text; ordinary unknown text remains unsupported without a profile. Unsupported audio/media and inaccessible frames remain blockers. This interface is an integration seam, not a claim that any real viewer was recognized.

Documents use actual scroll dimensions, reset to the beginning, and scroll in 40–120px increments at variable 400–1200ms intervals. Completion requires reaching the actual bottom and observing the same bottom height again. No-progress, disappearance, invalid scope or unavailable dimensions stop safely. The result is **local processing completion only**; document-only navigation does not add a server-completion poll. Mixed videos and live tasks retain their existing observable completion requirement. Multiple documents and mixed document/video flows are covered by executable tests. Virtualized/PDF/canvas viewers without verified dimensions remain unsupported.

Chapter-end navigation uses the two observed exact labels, `章节测验` and `本章自测`. It requires an identifiable top-level chapter, at least one preceding learning leaf, satisfied preceding learning conditions, only optional assessment leaves remaining in that chapter, and a non-assessment/non-verification first content leaf in the next chapter. A locally processed document-only current task may satisfy its own preceding condition without changing its platform marker. Verification-like titles/content/labels, inaccessible task frames, generic exams, missing next chapters and incomplete prior learning stop. The script never clicks answer/submit controls or modifies assessment completion state. Any new destination still goes through normal discovery and safely stops if unsupported.

### Cross-window architecture and protocol

`WAITING_LIVE` is entered **before** opening a child. Existing parent timers and media event bindings are cancelled; parent video recovery cannot restart an obsolete player in this state. Duplicate play/nextUnit calls cannot open another child. The entry must be an evidence-supplied, connected normal `_blank` anchor on the current exact origin, without noopener/noreferrer. Unsupported links/origins fail closed; the code does not remove browser isolation directives or widen metadata matches.

`window.__xuexitongTaskSupport.installChild(adapter)` installs one child coordinator, requiring explicit `isRecognized()`, `getPlayer()` and optional evidence-backed `sessionFinished()`. Repeated installation returns the active coordinator. An actual rendered HTML video element is kept at 1.0x and observed through events/position/duration. `liveNearEndThreshold` defaults to **0.99**. Finite positive duration permits a local near-end signal; ended/session-finished evidence takes priority. Unknown, zero, NaN or infinite duration is never converted to a made-up elapsed-time completion.

The postMessage protocol is `xuexitong-live-v1`, with LIVE_OPENED, LIVE_READY, LIVE_PLAYING, LIVE_NEAR_END, LIVE_COMPLETED, LIVE_ERROR and LIVE_CLOSED. Every packet includes a crypto-generated ephemeral ID, coordinator generation, monotonic sender sequence and timestamp. Both sides enforce the exact current origin and related WindowProxy source; stale IDs/generations/sequences, invalid timestamps, malformed terminal payloads and wrong-direction messages are ignored. No wildcard origin, localStorage, manager storage or AI service is used. Task URL/DOM identity remains parent-local; no credentials or course records are transmitted. The existing @grant none and @match metadata remain unchanged.

The parent checks child existence/document/origin every 2 seconds; the child checks media/session state every 10 seconds plus events. These checks and repeated handshakes are liveness information, **not completion**. There is no one-hour limit or other elapsed-time completion rule. Throttling delays checks without creating completion. Silent communication loss with no observable closure/error leaves the parent waiting for manual intervention; reload/navigation/explicit errors cause a safe block. Initial about:blank is tolerated only until a supported child document is established.

### Closure and resumption

A validated local near-end/ended message permits one close attempt on the associated child handle only. The next poll must observe actual closure; a denied/unconfirmed close requires manual handling and is not repeatedly attempted. Unexpected closure before a result blocks. Parent destruction, task/URL change or document invalidation disposes its coordinator; the child disposes reporting when its opener disappears. No unrelated tab is closed.

After closure, the parent may process other recognized local tasks. Leaving a node containing video/live still requires its observable platform completion marker; local 99% is never treated as platform credit. Only after all relevant conditions pass does the existing randomized 5000–12000ms cooldown start, followed by task/generation/target revalidation. Optional chapter-end assessment transitions also use that cooldown and leave assessments unfinished.

### Tests executed and evidence level

The complete suites were executed:

```text
node scripts/build-userscript.mjs
node tests/verify-v3.mjs
node tests/customization-v3.mjs
node tests/preserved-v3.mjs
node tests/navigation-v3.mjs
node --check (all 12 JS/MJS files)
git diff --cached --check
```

The Playwright/jQuery paths remain local test inputs as documented above. The additional cross-window tests route reserved `https://course.test` pages locally, inside disposable browser contexts. They open actual Chrome popup pages and deliver native postMessage events; media states, two-hour clock advancement and denied-close behavior are simulated. No real network course page is accessed. Origin-denial cases use reserved `.test` domains only in tests, not runtime allowlists.

The original 91 scenarios pass, with 37 additional document/assessment/live cases: **128 passed, 0 failed** (eight private-reference DOM cases and 120 synthetic cases). During implementation, popup initialization exposed the transient about:blank origin and opener becoming null after parent closure; both were corrected and have passing browser regressions. The tests cover incremental/local document completion, multiple/mixed tasks, document cancellation and unknown viewers; both optional assessment labels, unchanged unfinished markers, mandatory verification, missing chapters and incomplete learning; parent WAITING_LIVE before open, no duplicate windows, two simulated hours, finite 99%, true-live session-finished evidence, closure/return/cooldown, wrong-origin/source/stale/duplicate/malformed messages, popup blocking, denied close, unexpected closure, parent closure, changed URLs, communication reload, unrelated tabs and duplicate child installation.

Preservation output:

```text
V3 source and userscript payload are synchronized and syntactically valid.
PASS: fixed 1.0x configuration, assessment detection, and unknown-content safety (VM smoke).
PASS: background guards/stall code preserved; recovery adds only stale-session guard; monitor completion dispatch updated; DeepSeek and legacy source unchanged.
PASS: ordinary video guards, recovery, completion and cooldown scheduling preserved; explicit document/live waiting hooks and media-scope adapter routing verified against 8d7ab15.
```

Additional executed case output:

```text
PASS synthetic document scrolls incrementally from start to actual bottom without platform polling
PASS synthetic multiple documents finish locally then await navigation cooldown
PASS synthetic mixed document/video keeps video confirmation requirement
PASS synthetic document scope invalidation and destruction cancel scrolling
PASS synthetic unsupported document viewers stay stopped without an adapter
PASS synthetic optional chapter-end 章节测验 stays unfinished and targets next chapter
PASS synthetic optional chapter-end 本章自测 stays unfinished and targets next chapter
PASS synthetic ambiguous/mandatory assessment stops: 身份验证/true/true
PASS synthetic ambiguous/mandatory assessment stops: 考试/true/true
PASS synthetic ambiguous/mandatory assessment stops: 章节测验/false/true
PASS synthetic ambiguous/mandatory assessment stops: 章节测验/true/false
PASS synthetic real popup: parent waits first, duplicates cannot open another window
PASS synthetic two-hour true live stream remains waiting with unknown duration
PASS synthetic live ended: associated child closes, marker then cooldown, normal video resumes
PASS synthetic live near-end: associated child closes, marker then cooldown, normal video resumes
PASS synthetic local near-end never fabricates platform completion
PASS synthetic unexpected child closure safely blocks without navigation
PASS synthetic denied child close is attempted once and requires manual handling
PASS synthetic parent closure disposes child coordination without navigation
PASS synthetic strict message origin/source/generation and duplicate sequence validation
PASS synthetic blocked popup and cross-origin live entry never retry or advance
PASS synthetic document destruction cancels even an already queued tick
PASS synthetic unverifiable document bottom safely stops
PASS synthetic task invalidation disposes live parent; stale child result cannot advance
PASS synthetic lost/reloaded live communication blocks without reopening
PASS synthetic duplicate terminal child messages request closure only once
PASS synthetic true live session-finished evidence hands off without invented duration
PASS synthetic malformed or unrelated live completion cannot close the child
PASS synthetic finished video bypasses only trailing optional assessment into next chapter
PASS synthetic finished document bypasses only trailing optional assessment into next chapter
PASS synthetic live closure never closes an unrelated tab
PASS synthetic same-document parent URL change invalidates live waiting
PASS synthetic optional-assessment-only chapter has insufficient learning evidence
PASS synthetic verification inside an optional assessment prevents handoff
PASS synthetic noopener live link is unsupported without changing browser security policy
PASS synthetic live-like page without an evidence adapter never opens a window
PASS synthetic duplicate child installation keeps one player and one session listener
RESULT: 128 passed, 0 failed; local Chrome DOM tests, simulated media/timers, no live platform.
```

### Missing evidence / limitations for independent review

- Real scroll-container/viewer DOM and reliable bottom behavior, especially virtualization or PDF/canvas rendering.
- Actual live entry href, target/rel or platform JavaScript opening mechanism; exact child origin/URL and userscript matching; COOP/opener behavior.
- Rendered child player DOM, supported media events, unknown-duration/session-finished evidence, platform completion updates and close policy.
- Authenticated long-session/background tab/application-switch testing. No such live end-to-end run has been executed.
- Cross-origin/noopener/COOP-separated children are unsupported. No grant or execution-context change is hidden in this patch. The unchanged metadata does not promise userscript execution on any as-yet-unknown live URL.
- No real profile is registered. Synthetic tests explicitly inject adapters into a known test scope; users must not infer real Chaoxing compatibility or universal CAPTCHA recognition.

Only source, generated userscript, tests and sanitized documentation are published to the fork review branch. No private HTML, platform-progress write, fabricated attendance, mouse simulation, fingerprint spoofing, runtime AI dependency, master merge, tag or release is included. Independent acceptance remains pending.

## Universal short action delays and per-feature settings panel

Parent baseline: `64900befe4ffa90effc8333077dcb7677ac4a8e6`. This section supersedes the earlier lesson-only 5000–12000ms default. Metadata remains V3.4.0. Engineering checks pass; authenticated platform acceptance and real document/live adapter evidence remain outstanding.

### Settings and defaults

The compact Chinese `学习设置` panel mounts once in a Shadow DOM at the course page's upper-right corner, initially collapsed. It has independent switches for video playback, next video, next lesson, next chapter, assessment handoff, document reading, live coordination and background protection, plus a global randomized-delay switch. Background protection and ordinary video/navigation switches default on; document/live default off and their evidence adapters remain null. Every action category has its own delay checkbox and integer minimum/maximum fields.

| Category | Short preset inclusive milliseconds |
| --- | --- |
| videoStart | 300–900 |
| nextVideo | 500–1500 |
| documentScroll | 400–1200 |
| nextDocument | 500–1500 |
| nextLesson | 1000–2500 |
| nextChapter | 1500–3500 |
| assessment | 1000–2500 |
| liveOpen | 500–1500 |
| liveReturn | 500–1500 |

Short is the default. The legacy preset supplies 5000–12000ms ranges; custom fields permit nonnegative integer milliseconds up to 2147483647, with min <= max. Invalid input is rejected immediately without saving. Restore Defaults restores short ranges and default feature flags. The panel does not display account/course/session data.

Only a validated, whitelisted settings schema is saved under `xuexitong.v3.action-settings.v1` in same-origin localStorage. The schema contains version, preset, collapsed state, feature booleans and action ranges; unknown fields are discarded, including during collapse/expand persistence. Storage denial falls back to in-memory operation. Storage events synchronize settings with same-origin coordinators; live completion messages do not use storage. @grant none, @match, dependencies and existing build conventions are unchanged.

`app.settings` / `app.updateSettings()` expose the validated configuration. Legacy `configs.autoplay` and `randomCooldownEnabled` are aliases to the corresponding feature/global settings. The old min/max cooldown fields remain navigation compatibility overrides only under the explicitly selected legacy preset; the category panel is the current configuration surface. Preset changes preserve feature selections; Restore Defaults restores them too.

### Shared scheduler and no stacking

One reusable createActionScheduler implementation serves course actions, document steps, live open/close and the child player's startup. Each logical action has one pending key; duplicate requests reuse the existing pending action rather than sample again. Enabled waits use `min + floor(Math.random() * (max - min + 1))`, including endpoints and single-millisecond variation, with three-decimal seconds in logs. Global/category delay switches remove the random wait, not the automation feature. Zero-delay recurring document steps still yield through a cancellable setTimeout, avoiding synchronous scroll loops.

The wrapper captures coordinator generation, active node, title, URL and cards Document, plus action-specific eligibility. It validates before scheduling and before execution. Temporary DOM/lifecycle watchers cancel obsolete actions, manual navigation, blocking, destruction and affected settings changes. Settings-panel interactions are excluded from generic page-click cancellation; actual relevant setting changes still cancel the matching action. Cancelled work does not automatically restart when a switch is re-enabled. Native videos already playing normally are neither paused nor replayed. Disabling one unrelated feature does not stop normal playback. The panel and its storage listener are removed on destruction.

Chapter navigation takes precedence over lesson navigation; assessment handoff has its own category and also requires next-chapter permission. A video-tab selection and its subsequent player start share a single videoStart wait. Within-lesson video transitions use nextVideo. A next document's first increment uses nextDocument rather than stacking another documentScroll delay; subsequent increments use documentScroll. Live close/return uses one liveReturn action after a validated child result, then bypasses redundant catalog waiting after actual closure and required platform confirmation. Any subsequent video playback is a separate videoStart action. Opening waits in WAITING_LIVE before calling window.open, so duplicate requests cannot create another window. Custom long video-tab waits do not consume player-loading retries before the tab action runs.

Completion recognition, verification, warnings, cancellation and destruction remain immediate. Document-bottom confirmation only yields with a nonrandom zero-delay check; actual scroll increments alone receive action waits. Pause/focus/stall recovery retains its original timing and cooldown, with only an explicit default-on background feature gate. Live heartbeat/session checking is never used as randomized completion or elapsed-time credit.

### Executed validation

Commands run from the repository with the locally resolved Playwright/jQuery environment described earlier:

```text
node scripts/build-userscript.mjs
node tests/verify-v3.mjs
node tests/customization-v3.mjs
node tests/preserved-v3.mjs
node tests/navigation-v3.mjs
node --check (all 12 JS/MJS files)
git diff --cached --check
```

All passed. The suite retains the previous 128 scenarios and adds 51 action/settings scenarios: **179 passed, 0 failed** (eight private-reference DOM cases and 171 synthetic cases). Historical immediate-navigation tests explicitly disable other action waits; former long-cooldown cases explicitly select legacy timing. Live-return expectations now assert that no extra catalog cooldown is stacked. Startup-error fixtures explicitly model paused startup rather than replaying an already active video.

New cases cover every category's minimum/maximum, integer resolution, independent draws, three-decimal logs, disabled global/category delays, independent feature cancellation, navigation precedence, next-video/document integration, delayed live open/return, instantaneous recovery with no action timer, stale callbacks and page changes, compact UI mounting/collapse/expansion, input validation, legacy/default/custom controls, persistence across a fresh document, whitelist filtering and cleanup. They also cover settings edits after completion, disabling video during tab loading, an ended player invalidating startup, disabling next chapter during assessment handoff, cancelling a not-yet-open popup, nonblocking zero-delay document increments and a long custom video-tab wait.

Preservation checks compare exact guard/monitor/completion code, catalog/media discovery, chapter eligibility and live-message validation against the reviewed parent. Background recovery differs only by the user-controlled background gate. The existing source/userscript payload identity, DeepSeek/legacy preservation and 1.0x checks remain. Actual output includes:

```text
V3 source and userscript payload are synchronized and syntactically valid.
PASS: fixed 1.0x configuration, assessment detection, and unknown-content safety (VM smoke).
PASS: immediate recovery/monitoring, legitimate completion, chapter rules, scoped discovery and live message validation preserved; explicit background switch is the only recovery gate.
RESULT: 179 passed, 0 failed; local Chrome DOM tests, simulated media/timers, no live platform.
```

All new-case output follows:

```text
PASS action settings videoStart minimum integer bound
PASS action settings videoStart maximum integer bound
PASS action settings nextVideo minimum integer bound
PASS action settings nextVideo maximum integer bound
PASS action settings documentScroll minimum integer bound
PASS action settings documentScroll maximum integer bound
PASS action settings nextDocument minimum integer bound
PASS action settings nextDocument maximum integer bound
PASS action settings nextLesson minimum integer bound
PASS action settings nextLesson maximum integer bound
PASS action settings nextChapter minimum integer bound
PASS action settings nextChapter maximum integer bound
PASS action settings assessment minimum integer bound
PASS action settings assessment maximum integer bound
PASS action settings liveOpen minimum integer bound
PASS action settings liveOpen maximum integer bound
PASS action settings liveReturn minimum integer bound
PASS action settings liveReturn maximum integer bound
PASS action settings independently draw single-millisecond values and log three decimals
PASS action settings disabled global delays do not sample or queue a wait
PASS action settings disabled category delays do not sample or queue a wait
PASS action settings independent feature switch videoPlayback
PASS action settings independent feature switch nextVideo
PASS action settings independent feature switch nextLesson
PASS action settings independent feature switch nextChapter
PASS action settings independent feature switch assessment
PASS action settings independent feature switch document
PASS action settings independent feature switch live
PASS action settings default video startup delays once and does not replay active video
PASS action settings within-lesson next video uses only nextVideo category
PASS action settings navigation precedence nextLesson creates one timer and click
PASS action settings navigation precedence nextChapter creates one timer and click
PASS action settings navigation precedence assessment creates one timer and click
PASS action settings next document first step has one nextDocument delay
PASS action settings live open and return are delayed once with no stacked catalog cooldown
PASS action settings background toggle preserves immediate recovery without action timers
PASS action settings cancellation user rejects stale callbacks
PASS action settings cancellation page rejects stale callbacks
PASS action settings cancellation blocked rejects stale callbacks
PASS action settings cancellation destroy rejects stale callbacks
PASS action settings UI mounts compact, expands, validates and restores defaults
PASS action settings panel clicks do not cancel actions until a relevant setting changes
PASS action settings persist whitelisted fields across a new document without account data
PASS action settings edits never restart a completed task
PASS action settings video tab consumes one start delay; disabled during load=false
PASS action settings video tab consumes one start delay; disabled during load=true
PASS action settings ended player invalidates pending startup without replay
PASS action settings disabling next chapter also cancels a pending assessment handoff
PASS action settings disabling live cancels a delayed popup before creation
PASS action settings zero-delay document steps remain incremental and nonblocking
PASS action settings custom long video-tab wait does not consume loading retries
RESULT: 179 passed, 0 failed; local Chrome DOM tests, simulated media/timers, no live platform.
```

### Publication scope and limitations

Only six files change: v3_optimized.js, its generated userscript, navigation/preservation tests, README and this review report. Private HTML remains locally excluded and untracked. No real document/live adapter, external service, progress write, AI runtime, grant change, fingerprint spoofing or release is added.

These are local Chrome DOM/UI/popup tests. Media, timers, and long-session clocks remain simulated; no authenticated Chaoxing playback, physical application/tab switching or real viewer/live integration has been executed. Browser throttling may delay callbacks beyond the sampled interval. Delayed window.open may be blocked by real popup policy; that remains a safe stop. Native storage can be denied, and settings are scoped by browser origin. A cancelled/disabled action pauses automation and may require explicit manual selection/re-identification; re-enabling a setting never silently replays a completed task. Fixed-corner UI needs live layout acceptance on the user's actual course page. Independent ChatGPT review is pending before any merge into master.

## 2026-10-26: Recorded popup and deferred assessments (supersedes earlier limitations above)

STATUS: PARTIAL. Implementation and local gates pass. Authenticated platform acceptance remains unverified.
Review base: `97952cac703f2e27dab3046f1848252cb24325c4` on `review/v3.4.0-modular-navigation`.

### Evidence actually available

The user supplied an independently reviewed sanitized description, not the full private popup HTML. This implementation did not inspect that full snapshot. Confirmed facts used: HTTPS popup origin `zhibo.chaoxing.com`, course origin `mooc1.chaoxing.com`, title `直播`, recorded flags `liveStatus=4` and `lookback=1`, `div#video.video-js` containing `video#video_html5_api.vjs-tech`, actual media ended support, and a non-authoritative `#endViewId`. The displayed 45:37 appears only in the synthetic fixture; runtime uses actual media properties, never a fixed recording length. Eight local outer-page examples remain private and excluded; they do not establish live-player compatibility.

### Implementation

- Dedicated popup bootstrap requires the exact HTTPS origin, top-level opener relationship, title, both recorded flags and the unique confirmed player. It probes delayed DOM loading for at most 30 attempts; this is initialization only, never a completion timer. Flags are read from numeric globals or literal assignments in script text without executing or evaluating captured source. No jQuery download is needed in the popup.
- Playback stays at 1.0x. The dedicated recorded adapter waits for the media ended state/event; it rejects ratio-only near-end completion. Neither hidden nor visible end banners count. Unknown/infinite duration never implies completion. Ongoing live-status pages are unsupported by this recorded profile. Generic opt-in infrastructure retains its prior near-end capability.
- Recorded child pause/focus/stall recovery calls play without artificial delay, with a 1500ms recovery cooldown and a 7000ms observed-stall threshold. It never assigns currentTime/duration or writes platform records. Media errors or lost recognition stop coordination. Ordinary course recovery methods are preserved by exact source checks.
- Cross-origin communication permits only `https://mooc1.chaoxing.com` parent to `https://zhibo.chaoxing.com` child. Existing explicit same-origin adapters remain supported. Messages validate full origin, window source, ephemeral session ID, generation, increasing integer sequence and timestamp. Cross-origin children also pin a fresh document identity and recorded-player kind after READY; a changed instance stops coordination. No cross-origin DOM/location reads are attempted, and every postMessage uses an explicit target origin.
- Only validated whitelisted feature/delay settings travel across the origin boundary, without persisting session/task metadata. Background settings propagate on parent polls. A validated LIVE_CANCEL disposes child timers/recovery after parent cancellation without closing or pausing the media. No userscript grants or external services were added.
- Parent remains WAITING_LIVE, closes only its associated window after a validated result and the shared live-return delay, confirms actual closure, then still requires the existing observable course marker. Missing markers block after the existing bounded verification retries. Opener loss, noopener/noreferrer, blocked popup, unexpected close and denied close do not cause retries or blind advancement. Initial unsupported/lost communication can leave the parent waiting for manual intervention; it never proves completion.
- Exact assessment labels `章节测验`, `章节测试`, `本章自测` can be deferred consecutively to the first subsequent learning leaf, within a chapter or across chapters. The first other learning leaf is never skipped. Starting on an assessment does not require retroactively marking earlier lessons complete. Ordinary video completion and platform-marker checks remain unchanged. Verification/authentication, examinations, unknown assessment labels, missing targets and evidenced generic disabled/locked destinations stop. Assessment markers remain untouched; no answers/submissions are generated. The switch defaults on and is labeled `暂缓章节测验并继续学习`. Existing next-lesson/chapter settings and one-action scheduler still govern handoff.

### Actual commands and results

Environment: Node v24.18.1; Chrome 156.0.8078.48 headless; Playwright selected by PLAYWRIGHT_MODULE and local jQuery by JQUERY_PATH. Browser network was intercepted/blocked. Real browser DOM, WindowProxy, postMessage and popup lifecycles were exercised; media properties/events and navigation timers were simulated. Popup-policy rejection was injected, not an authenticated interactive Chrome observation.

```text
node scripts/build-userscript.mjs
[exit 0; no output]
node tests/verify-v3.mjs
V3 source and userscript payload are synchronized and syntactically valid.
node tests/customization-v3.mjs
PASS: fixed 1.0x configuration, assessment detection, and unknown-content safety (VM smoke).
node tests/preserved-v3.mjs
PASS: background guards/stall code preserved; recovery adds only stale-session guard; monitor completion dispatch updated; DeepSeek and legacy source unchanged.
PASS: immediate recovery/monitoring, legitimate completion and scoped discovery preserved; assessment deferral and exact-origin protocol intentionally extended.
node tests/navigation-v3.mjs
RESULT: 188 passed, 0 failed; local Chrome DOM tests, simulated media/timers, no live platform.
node tests/recorded-live-v3.mjs
RESULT: 21 passed; 0 failed. Synthetic browser evidence only.
```

The navigation suite comprises eight inert private outer-structure checks and 180 synthetic cases. Nine cases expand the previous 179-case suite; obsolete assertions that unfinished/assessment-only chapters must always block were replaced because the user explicitly superseded that behavior. New coverage includes all three labels, consecutive deferred assessments, preserving learning order and one pending navigation, disabled/locked/authentication destinations, and cross-origin recorded completion with late/missing course markers. Existing scheduler/UI/document/generic-live tests still run. The separate 21-case suite covers strict recognition, finite and unknown duration, delayed player, real cross-origin message transport with simulated media, forged origin/source/session/generation/sequence, changed document, duplicate events, cancellation, feature propagation, pause/stall recovery, popup blocking, noopener, missing opener and media errors.

### Files and privacy

Nine files: `v3_optimized.js`, generated `v3_optimized.user.js`, `scripts/build-userscript.mjs`, `tests/navigation-v3.mjs`, `tests/preserved-v3.mjs`, new `tests/recorded-live-v3.mjs`, new `fixtures/synthetic/recorded-live-videojs.html`, `README.md`, and this report. Metadata adds only the confirmed popup host; @grant none and existing course matches remain. Private HTML, signed URLs, account/course identifiers, cookies and credentials are not included. The new fixture is explicitly synthetic with no real media URL. Historical DeepSeek experimental files remain unchanged and are not integrated into the V3 runtime.

### Remaining acceptance requirements

No authenticated course-to-popup-to-course run, actual HLS playback, server credit/attendance verification, physical tab/application-switch test, Chrome user-activation/popup-policy acceptance or real course layout test was performed. The real parent entry DOM/opening mechanism is still missing: taskAdapter remains opt-in, no speculative entry selector was added, and the live feature remains disabled by default. Document adapters also remain opt-in/default-off. Other popup origins, absent opener/COOP separation, unsupported players/statuses and unrecognized locks need additional evidence or manual handling. Generic aria-disabled/disabled/lock-text checks do not establish recognition of every platform-specific access restriction. Long sessions have no completion timeout; background throttling may postpone monitoring. A browser can deny opening/closing. Missing communication remains waiting/safe rather than proving completion. Master remains unchanged; publication is review-only and requires independent ChatGPT acceptance.
Additional final gates: `node --check` passed for all 13 JavaScript files; `git diff --check` passed. Privacy audit output: `PASS: nine candidate files reviewed; credential literals/signed-identity URLs/private keys absent; zero tracked private fixtures; all eight private files excluded.` The complete source/test diff and generated payload were inspected before explicit staging; publication is limited to these nine files. Pattern checks supplement manual diff review and do not constitute an exhaustive data-loss-prevention guarantee.

## 2026-10-26: Real native-entry recognition and safe manual handoff

STATUS: PARTIAL. This implements the provable entry-recognition/manual-fallback portion, not unattended native-popup opening and return. Review base: `58a252a6eb935b1cc249fe7944b5758d2675b7be`. This section supersedes the earlier statement that the parent entry structure was wholly unavailable.

### Real entry evidence used

The user supplied a sanitized DevTools description: `a.liveHref > div.liveCard > div.live-ct` inside `iframe#iframe[info="card"]`, with placeholder `javascript:void(0);`. The registered business handler first calls `setLiveANDCourseRelation()`, then assigns its captured URL to platform-owned `#openUrl`, sets `_blank`, and clicks that anchor. The closure URL and relation function internals were not provided. No authenticated page or complete private handler snapshot was inspected in this implementation.

### Entry adapter and platform behavior

The built-in fallback profile selects only the unique evidenced course frame on the exact confirmed course origin, ignores outer/auxiliary live-looking elements, and requires a unique matching task card. Existing explicit task adapters retain precedence. Missing/dynamically created `#openUrl` is unresolved; duplicate/non-anchor links and unapproved destinations are invalid. Inspection follows current/replaced DOM links rather than caching a URL. A usable target must have the exact approved HTTPS replay origin and `_blank`; noopener/noreferrer mean manual policy. Origin approval alone never proves recorded status, popup ownership or task completion. No URL is logged, persisted or placed into protocol packets by this profile.

The profile enters the existing parent coordinator's native-entry branch. With live disabled (unchanged default), automation pauses. With live enabled, WAITING_LIVE is entered before the branch immediately stops with a manual notice, without adding a randomized safety-warning delay. The compact existing settings panel displays `直播需手动处理` and the instruction to click the platform card manually. No automatic business-handler invocation, relationship-function call, anchor click, window.open replacement, link rewrite, handler interception, closure extraction or extra popup is performed. The actual user-triggered platform handler remains untouched. Known assessment deferral and ordinary video checks are unchanged.

This deliberately does not retrofit native anchor navigation into window.open: doing so would change the evidenced opening mechanism without verifying the relationship function and browser-policy implications. Native anchor.click returns undefined, not a WindowProxy. In the local real-Chrome synthetic native-click test, a `_blank` popup was created with no opener. Its child coordinator stayed inactive. The existing owned-window protocol cannot safely attach merely by origin or a claimed completion message; no wildcard trust, guessed window identity or broadcast adoption was added. The manual-only branch never calls onResult, marks a task processed, closes a window or continues course navigation. Repeated automation discovery/run/callbacks do not invoke the handler. Repeated deliberate manual user clicks remain platform behavior, not a script deduplication claim.

### Tests executed and actual output

Node v24.18.1, Chrome 156.0.8078.48 headless, Playwright supplied through PLAYWRIGHT_MODULE and local jQuery through JQUERY_PATH. All external networking was blocked/intercepted; pages and relation function are synthetic. The relation stub records call order only and does not model the unverified real function's internals. Native anchor navigation and actual opener behavior were exercised in Chrome; media state elsewhere remains simulated.

```text
node scripts/build-userscript.mjs
[exit 0; no output]
node tests/verify-v3.mjs
V3 source and userscript payload are synchronized and syntactically valid.
node tests/customization-v3.mjs
PASS: fixed 1.0x configuration, assessment detection, and unknown-content safety (VM smoke).
node tests/preserved-v3.mjs
PASS: background guards/stall code preserved; recovery adds only stale-session guard; monitor completion dispatch updated; DeepSeek and legacy source unchanged.
PASS: immediate recovery/monitoring, legitimate completion and scoped discovery preserved; assessment deferral and exact-origin protocol intentionally extended.
PASS: 58a252a recorded adapter, owned-popup lifecycle/protocol, child recovery, assessment rules, scheduler and settings preserved exactly.
node tests/navigation-v3.mjs
RESULT: 188 passed, 0 failed; local Chrome DOM tests, simulated media/timers, no live platform.
node tests/recorded-live-v3.mjs
RESULT: 21 passed; 0 failed. Synthetic browser evidence only.
node tests/native-entry-v3.mjs
RESULT: 19 passed; 0 failed. Synthetic entry/manual-fallback evidence only.
```

The new 19 tests cover scoped recognition/default-off behavior, auxiliary exclusion, repeated automation without duplicate business calls, untouched registered handler and its original sequence under manual click, async link creation, dynamic link replacement, read-only inspection, invalid/duplicate entries, exact frame identity, disposed callbacks after seven cancellation/invalidation cases, immediate visible manual notice, actual native popup/opener behavior, unowned message rejection and preserved noopener/noreferrer. Existing 188 + 21 cases continue to run, including cross-origin owned-popup messaging, delayed/missing completion markers, document and assessment behavior, 1.0x, background recovery and nine-category scheduler/UI checks. Eight of the 188 are inert local private outer-structure examples; no authenticated platform compatibility follows from them.

Preservation checks now additionally compare the previous reviewed recorded-popup bootstrap, normal owned-parent lifecycle, complete protocol block and child implementation byte-for-byte (normalized line endings) against 58a252a. Assessment rules, action scheduler and saved-settings methods are also unchanged. The task-set method has exactly the intended built-in fallback substitution; explicit adapters still work.

### Changed files and privacy boundary

Seven files: source and generated V3 script, `tests/preserved-v3.mjs`, new `tests/native-entry-v3.mjs`, new `fixtures/synthetic/native-live-entry.html`, README and this report. No grant, metadata match, stable/legacy implementation, DeepSeek file or repository setting changes. Public fixtures use generic titles, synthetic destinations and a clearly marked test stub, with no private snapshot, real replay URL, signature, course/account identifiers or authentication data. All eight private files stay excluded and untracked. There are no runtime AI services.

### Remaining live-platform limitations

Automatic native entry to owned cross-origin replay return remains unsupported. The native card alone does not establish whether the session is recorded or genuinely live; the separately verified popup adapter still requires its recorded flags and player evidence. The actual relationship function effects, authenticated handler behavior, delayed/blocked popup policy, browser opener/COOP/sandbox policies, live HLS/background playback, server credit and end-to-end return remain unverified. A platform-supported, security-preserving way to obtain a verifiable popup/session relationship would be needed before enabling automatic handoff. An already populated approved #openUrl does not authorize bypassing the business handler. Users must open/handle this native flow manually; the script does not resume automatically afterward or claim credit. No merge/tag/release is part of publication.

Final static/privacy gates: all 14 JavaScript syntax checks passed; source/generated payload consistency and git diff --check passed. Manual diff review plus credential-literal/signed-identity-URL/private-key pattern checks covered all seven candidate files. Zero private fixtures are tracked; all eight remain locally excluded. Pattern checks supplement inspection and are not an exhaustive privacy guarantee.

## 2026-10-26: Narrow auditionAudio classification correction

STATUS: PARTIAL. Local implementation and regression checks pass; the user must independently retest the authenticated course. Baseline: `f8caf22013a975f696f704e6ebeceb323bc806ba`.

### Root cause and evidence boundary

The user's authenticated inspection found one recognized video across three accessible task documents, but the old unconditional audio selector set unsupported=true for a hidden root-document `audio#auditionAudio`. Its actual purpose remains unconfirmed. This implementation uses the supplied structural observations; it did not inspect or publish authenticated HTML, course identifiers, replay URLs or session state. The directory count of 54 is not hardcoded or used for classification.

### Exact classification change

Audio candidates are collected during the existing bounded traversal and classified after discovery finishes. The video collection is unchanged. An exception is possible only if no other unsupported/inaccessible condition exists, with exactly three task documents in a root -> player -> leaf chain, one iframe in each of the first two documents and none in the leaf. There must be exactly one recognized video, in the middle document, no other videos and exactly one audio in the entire discovered task scope.

That audio must belong to the root task document, be the unique root element with id auditionAudio, have an empty class, a DIV parent, controls=true, be connected and return zero client rectangles. Additional conservative checks require paused=true, autoplay=false, seeking=false and currentTime exactly zero. These playback-state properties were not supplied in the real inspection and may need checking during retest. The leaf must have no unknown text (scripts/styles excluded) or interactive/task objects, even when an explicit adapter supplies a known-document exemption. The code never clears an existing blocker. Any failed/throwing check keeps audio unsupported. This is a narrowly bounded structural exception, not a universal claim that hidden audio or this ID is harmless.

Discovery is repeated rather than caching the exception: an audio that becomes active loses it. No playback position, completion marker, state-machine rule or navigation eligibility is written by classification. Existing actual-ended plus platform-marker verification remains required for video navigation.

### Negative safety cases

Executable cases reject wrong audio identity; visible or playing audio; duplicate or additional audio; missing video; unexpected nested audio; nonempty class; controls disabled; wrong parent; nonzero audio position; autoplay; seeking; additional videos/frames; unknown leaf content (including an explicit known-document adapter); and inaccessible task frames. A later transition from inactive to playing audio is also rejected. Tests separately establish that missing platform confirmation blocks navigation, while actual simulated ended plus a platform marker can finish normally. No audio ID-only, hidden-element-wide or global audio whitelist was introduced.

### Commands and observed results

Node v24.18.1 / Chrome 156.0.8078.48 headless. Playwright and local jQuery supplied through PLAYWRIGHT_MODULE/JQUERY_PATH. Browser networking blocked/intercepted; media and navigation timers simulated.

```text
node scripts/build-userscript.mjs
[exit 0; no output]
node tests/verify-v3.mjs
V3 source and userscript payload are synchronized and syntactically valid.
node tests/customization-v3.mjs
PASS: fixed 1.0x configuration, assessment detection, and unknown-content safety (VM smoke).
node tests/preserved-v3.mjs
PASS: background guards/stall code preserved; recovery adds only stale-session guard; monitor completion dispatch updated; DeepSeek and legacy source unchanged.
PASS: immediate recovery/monitoring, legitimate completion and scoped discovery preserved; assessment deferral and exact-origin protocol intentionally extended.
PASS: 58a252a recorded adapter, owned-popup lifecycle/protocol, child recovery, assessment rules, scheduler and settings preserved exactly.
PASS: all V3 runtime code outside media discovery matches f8caf22 exactly.
node tests/navigation-v3.mjs
RESULT: 209 passed, 0 failed; local Chrome DOM tests, simulated media/timers, no live platform.
node tests/recorded-live-v3.mjs
RESULT: 21 passed; 0 failed. Synthetic browser evidence only.
node tests/native-entry-v3.mjs
RESULT: 19 passed; 0 failed. Synthetic entry/manual-fallback evidence only.
```

The navigation suite adds 21 focused cases to the previous 188. Its eight private outer-structure cases remain inert local checks; all new media cases use sanitized synthetic data. The new fixture models the root audio/frame document; the executable harness populates its middle video/frame and empty leaf documents. Synthetic success does not establish authenticated platform compatibility. Exact source comparison against f8caf22 confirms all runtime code outside media discovery is unchanged, including completion verification, 1.0x policy, nine delay categories, saved settings, assessment deferral, background recovery and popup ownership.

### Files and remaining limitations

Six files: V3 source and generated userscript, navigation/preservation tests, new `fixtures/synthetic/audition-audio-task.html` and this report. No grants, metadata, repository settings, legacy/DeepSeek code or private fixtures change. The exception intentionally fails if the document chain, media counts, hidden/paused state or leaf content differs; further real evidence is required before widening it. The actual role of auditionAudio remains unknown, and authenticated autoplay/background behavior/completion credit must be retested by the user. Existing native-live automatic popup ownership remains unsupported as documented above. Publication is only to the fork review branch; no master merge, tag, release or upstream PR.

Final static/privacy gates: all 14 JavaScript syntax checks and git diff --check passed. Six candidate files were inspected and checked for credential literals, signed identity URLs and private keys; none found. All eight private fixtures remain excluded and untracked. Pattern checks supplement manual diff review, not an exhaustive privacy guarantee.
