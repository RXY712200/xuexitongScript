# Three authenticated regression repairs

Status: PARTIAL until authenticated user retesting. Baseline: `8fde326`.

## Changes and evidence boundaries

- Multi-video: discovery rejected non-iframe attachment containers and populated
  descendant UI documents even when they belonged to known native attachments.
  Known containers and matching owned representations now retain that ownership.
  Unknown marked tasks, competing media and inaccessible attachments still stop.
  Unassigned unmarked content cannot authorize navigation. Redacted
  `diagnosticTriggers` identifies the rejecting phase/document/tag/class category;
  the authenticated offending node cannot be established without its markup.
  Selected media waits for readiness with cancellable, bounded native-event/poll
  handling. Four videos remain sequential; unsupported PDF remains pending.
- Prior completion: `run()` reset local ended history and playback had no check
  for preexisting lesson credit. A separate platform-credit route now requires
  a lesson-owned completed icon AND zero unfinished count, sampled again after
  250ms and revalidated before navigation. It does not synthesize ended or local
  attachment completion. Identity, source, inventory and directory checks remain.
  Missing/contradictory markers do not authorize skipping; individual attachment
  credit has no new adapter and may therefore be replayed conservatively.
- Audio: shared recovery could mute native audio without consent. Audio now makes
  an audible first attempt, clearing native mute/defaultMute and restoring zero
  volume once. Playback rejection requires a trusted Chinese UI gesture. Muted
  continuation is explicit and local to that task. Later volume/mute changes are
  reported without repeated automatic unmuting. This addresses demonstrated code
  paths; it does not prove the cause of the user's physical sound failure.

## Verification

Passed: `node scripts/build-userscript.mjs`, `node tests/verify-v3.mjs`,
`node tests/customization-v3.mjs`, `node tests/preserved-v3.mjs`, syntax checks
for both source/build and changed test files, and `git diff --check`.

Targeted Chrome command (with existing PLAYWRIGHT_MODULE/JQUERY_PATH setup):

```powershell
$env:TEST_FILTER='repair [ABC]|multi-attachment inventory|audio.*completion|natural.*completion|catalog.*re-render|sidebar single audio'
node tests/navigation-v3.mjs
```

Result: **23 passed, 0 failed**; simulated media/timers, network blocked.
The earlier development run of the existing navigation cases passed 441/441;
that run preceded final edits and is not a full final-state acceptance run.
Per the revised testing instruction, the complete legacy suite was not rerun.

Historical snapshots normalize only the explicitly added integrations; an extra
reviewed-baseline comparison and raw document/live block equality check protect
unchanged code. Mock players now explicitly expose playable readyState; the new
four-video case alone exercises delayed readiness instead of networkless mocks
accidentally behaving as unloaded media. No completion assertions were removed.

## Retest and limitations

Retest the reported four-video/PDF page, already-credited lessons, and audible
audio/rejection recovery on Chaoxing. Verify actual sound and credited navigation.
Marker-only prior credit is deliberately insufficient for automatic bypass.
First-entry Ctrl+R behavior, general document scrolling and live automation remain
separate unresolved work. Fixed 1.0x, original video recovery/cooldowns, settings,
assessment deferral, sidebar flow and fail-closed live bridge remain preserved.
No authenticated page, credentials, course identifiers or private fixtures added.
