# Permissive playback discovery, strict completion verification

Baseline: 8bf8930f990ff1c13929b50c822a2be2e35cd8bc.
Overall status: PARTIAL until authenticated user testing passes.

## Cause and coherent correction

The earlier recognizer conflated ordinary surrounding DOM with independent tasks.
Whole-tree form/input/canvas rules, Video.js wrapper requirements and auxiliary
audio source/error whitelists rejected pages even when their primary media was
identifiable. Adding exceptions did not fix this architectural coupling.

The media adapter is now a single bounded traversal and inventory, replacing the
layered attachment/audio/legacy whitelist implementations. It selects the actual
native media by the established video_html5/audio_html5_api identities within the
unique course-content document and current lesson. Audio no longer requires a
particular wrapper class or visible native-audio rectangle. Ordinary controls,
forms, labels, canvas/object/embed UI and unmarked nested wrappers do not themselves
prove an independent task. The code never submits/clicks those controls.

Inactive previews and secondary elements are not required to pass error-code,
source, CSS-class, parent, controls, position-zero or duplicate-preview-ID tests.
They are never selected as primary lesson media. Playing, seeking or autoplaying
auxiliary media blocks as competing activity. Visible unknown media controls or
an independent visible player wrapper also block. Failed primary media, duplicate
primary IDs in the same document and ambiguous primary branches block. Identical
player IDs across separate, explicitly owned attachments are valid.

Native video/audio attachment types are recognized in DOM order. Each requires
one correctly typed primary. Multiple attachments retain stricter ownership,
inaccessibility and unclassified-leaf checks; explicit selection profiles must
still validate their complete active/inactive partition. Unknown marked task
boundaries, chapter-assessment forms and verification forms stop automation.
Audio/video or audio/PDF mixed inventories remain unsupported. Pending PDF tasks
are never converted into completed media. Only one player is controlled at a time.

Empty/initializing cards and missing native players use the existing bounded
startup/retry path, not permanent early rejection or repeated app.run loops.
Startup waits for the selected player's ancestry rather than every UI iframe.
Inventory identity records retain required attachment/player ancestry, allowing
ordinary widgets to appear without replacing or restarting the player.

## Completion boundary and preservation

Discovery returns navigationSafe independently of playback eligibility. An
unreadable unmarked widget can coexist with an identifiable playing primary, but
navigationSafe=false prevents leaving the lesson. Inaccessible marked task frames
or unknown independent tasks still block. Explicit navigation checks revalidate
this field, alongside all existing natural-ended, platform-marker, current task,
source, generation and destination requirements. No progress, attendance, ended or
platform-completion record is fabricated. No seeking or speed-up is added.

1.0x policy, immediate background/pause/stall recovery, cooldowns, persisted audio
settings, sidebar lifecycle, assessment deferral and all live/popup code remain
unchanged. The optional native-live bridge still cannot authorize automatic return
from same-window messages. Literal tests compare the baseline runtime outside the
adapter/readiness replacement and the explicitly added navigation refusals.

## Every changed expectation

Existing cases remain executable; the following named variant groups intentionally
change expectations. The old sources remain negative controls in dedicated tests.

| Existing cases/variants | New expectation and reason |
|---|---|
| Auxiliary errors 0/1/2/3/4/5, src/empty-src/source-child/current-src/stream/unobservable-src | PLAYING with the primary only: inactive preview error/source state is not lesson completion or competing playback evidence. |
| Auxiliary visible/duplicate/progress/controls/class/parent/unknown-id/nested | PLAYING when inactive: these properties do not alter the unique primary's task ownership. An unknown element with visible independent controls still blocks. |
| Active/seeking/autoplay auxiliary, failed primary, missing primary | Still BLOCKED (missing primary after bounded readiness). No competing control or invented completion. |
| Inactive secondary error/visible secondary | Primary may play; secondary is not added to the learning queue. Active secondary still blocks. |
| independent-form/form-action/wrong-target/named-control/object/embed/canvas in single-media fixtures | These bare controls have no independent task marker; primary playback proceeds and no form is submitted. A marked task or explicit assessment/security form still blocks. |
| Audio no-ui/inactive-player (hidden wrapper only) | Primary ID and course ancestry suffice; wrapper styling is not playback ownership. Inactive iframe branches still do not qualify. |
| Empty unknown audio added beside a video | Inactive, non-rendered media is not by itself an independent learning task. Visible/active unknown media is a negative case. |
| unknown-leaf/unknown-frame text and extra empty wrappers in single-media cases | UI text/frame count alone is not a task boundary. No marker means no completion shortcut. |
| Inaccessible unmarked iframe beside a valid primary | PLAYING, navigationSafe=false; natural ended plus a marker still cannot navigate. Inaccessible primary/marked attachments still stop. |
| Generic audio inaccessible before any primary is found; private outer-only samples; unsupported document/live-like page with no adapter | Bounded loading then BLOCKED, never navigation. Prior immediate-block timing is obsolete, not the safety assertion. |
| Explicit complex-profile unknown-audio/wrapper-form/unclassified-audio | Profile ownership still validates; inert UI no longer defeats a valid selection. Missing/unverified/active or inaccessible partitions still block. |
| Multi-attachment auxiliary unknown inactive audio | The verified media queue continues; pending PDF is preserved. Unknown marked attachments and ambiguous/competing players still block. |
| Cooldown cancellation unsupported-task fixture | Now inserts an actual unknown ans-attach-online boundary instead of a harmless empty audio element; the cancellation/no-navigation assertions are unchanged. |
| Mock native players before first start | Default paused=true models unstarted media. Dedicated tests set competing players active explicitly. |

## New realistic evidence and limitations

The new synthetic UI fixture includes forms/search controls, named inputs, canvas,
object/embed controls and nested wrappers. Its search text mentions homework to
ensure ordinary search UI is not mislabeled as an assessment. Positive video/audio
cases remove old wrapper assumptions and add a sourced/erroring inactive preview;
the previous 8bf8930 source reproduces the failure on these shapes. Tests cover
initial entry, reboot, delayed creation, dynamic UI without duplicate play, unknown
task/assessment/verification boundaries, independent visible and hidden-native
player UIs, competing playback, and four videos ending at the pending PDF.

All evidence is synthetic Chrome DOM/media/timer or mocked-GM evidence, with the
existing local WAV natural-ended test. No authenticated platform or actual
Tampermonkey execution was performed. Unknown layouts without identifiable native
players remain unsupported; unreadable widgets may require manual navigation even
after playback. Generic same-origin video lists and verified attachment queues are
supported, not arbitrary player technologies. The real user must retest ordinary
video/audio startup, background playback, platform credit and next-lesson behavior.

## Executed validation

All commands exited 0:

```
node scripts/build-userscript.mjs
node tests/verify-v3.mjs         # synchronized userscript payload; valid syntax
node tests/customization-v3.mjs  # PASS: 1.0x, assessment and unknown-content smoke
node tests/preserved-v3.mjs      # PASS: frozen recovery/settings/identity/live code
node tests/navigation-v3.mjs    # RESULT: 441 passed, 0 failed
node tests/recorded-live-v3.mjs # RESULT: 21 passed; 0 failed
node tests/native-entry-v3.mjs  # RESULT: 19 passed; 0 failed
node tests/bridge-v3.mjs        # RESULT: 31 passed, 0 failed
node --check <all 16 .js/.mjs files> # PASS
git diff --check               # PASS
```

The previous 421 navigation cases remain, with policy-specific expectations changed
as listed above, plus 20 new policy cases. Old source revisions are exercised as
negative controls. No private fixture, signed URL, account or learning data is
included in this correction; private examples remain locally excluded from Git.
