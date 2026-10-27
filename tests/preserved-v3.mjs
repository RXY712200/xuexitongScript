import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const baseline = execFileSync('git', ['show', 'e907cdda9d50fd80c61721061ed0988dfec621a4:v3_optimized.js'], { encoding: 'utf8' });
const actual = readFileSync(new URL('../v3_optimized.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
// Shared native audio/video coordinator additions are behavior-tested below the
// historical snapshots. Normalize only this explicit integration, not recovery code.
const current = actual.replaceAll('this._playableMedia()', 'this._discoverMedia()')
    .replace("                    (category !== 'nextAudio' || this.settings.features.audioPlayback) &&\n", '')
    .replace("['videoStart', 'nextVideo', 'audioStart', 'nextAudio']", "['videoStart', 'nextVideo']")
    .replace("!['videoStart', 'audioStart'].includes(category)", "category !== 'videoStart'")
    .replace("if (this._startupCancel && !next.features[this._discoverMedia().audios?.length ? 'audioPlayback' : 'videoPlayback'])", 'if (!next.features.videoPlayback && this._startupCancel)')
    .replaceAll("['video', 'audio'].includes(task.kind)", "task.kind === 'video'")
    .replace('                this._bindCatalogNavigation();\n', '')
    .replace('                this._catalogObserver?.disconnect(); this._catalogObserver = null;\n                document.removeEventListener?.(\'click\', this._catalogClick, true);\n', '')
    .replace('                        this._observedLessonId = nCell.id; this._observedCard = this._cardIdentity();\n', '');
function method(source, name) {
    const start = Math.max(source.indexOf(`            ${name}(`), source.indexOf(`            async ${name}(`));
    assert.ok(start >= 0, name);
    const end = source.indexOf('\n            },', start);
    assert.ok(end >= 0, name);
    return source.slice(start, end);
}
for (const name of ['_bindPageGuards', '_startVideoMonitoring', '_handleVideoPause']) {
    assert.equal(method(current, name), method(baseline, name), `${name} must remain unchanged`);
}
assert.equal(method(current, '_tryResumePlayback'), method(baseline, '_tryResumePlayback').replace('            _tryResumePlayback(reason) {', '            _tryResumePlayback(reason) {\n                if (!this.settings.features.background) return;')
    .replace('                if (!video || !this._isPlaying) return;',
        '                if (!video || !this._isPlaying) return;\n                if (video.ended) { this._completeVideo(video); return; }\n                const generation = this._generation;')
    .replace('                video.play().catch((e) => {',
        '                video.play().catch((e) => {\n                    if (generation !== this._generation || !this._isPlaying || !video.isConnected ||\n                        video !== this._videoEl || !this._refreshVideoContext()) return;\n                    if (video.ended) { this._completeVideo(video); return; }'));
for (const path of ['deepseek-console/xuexitong-console.js', 'deepseek-console/deepseek-local.mjs', 'deepseek-console/deepseek-request.mjs', 'v2.js', 'xuexitong.js']) {
    assert.equal(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n'),
        execFileSync('git', ['show', `e907cdda9d50fd80c61721061ed0988dfec621a4:${path}`], { encoding: 'utf8' }).replace(/\r\n/g, '\n'));
}
console.log('PASS: background guards/stall thresholds preserved; recovery rejects stale sessions and ended video; DeepSeek and legacy source unchanged.');

const reviewed = execFileSync('git', ['show', '64900befe4ffa90effc8333077dcb7677ac4a8e6:v3_optimized.js'], { encoding: 'utf8' });
for (const name of ['_bindPageGuards', '_startVideoMonitoring',
    '_bindStepNavigation', '_initCellData', '_verificationPresent',
    '_taskContextValid', '_externalNavigationEligible']) {
    assert.equal(method(current, name), method(reviewed, name), `${name} must match 64900be`);
}
assert.equal(method(current, '_taskSet'), method(reviewed, '_taskSet').replace(
    '                    if (!this.taskAdapter) return null;\n                    const scope = this.taskAdapter.discover',
    '                    const scope = (this.taskAdapter || platformLiveEntry).discover'));
assert.equal(method(current, '_tryResumePlayback'), method(reviewed, '_tryResumePlayback').replace(
    '            _tryResumePlayback(reason) {', '            _tryResumePlayback(reason) {\n                if (!this.settings.features.background) return;').replace(
    '                if (!video || !this._isPlaying) return;', '                if (!video || !this._isPlaying) return;\n                if (video.ended) { this._completeVideo(video); return; }').replace(
    'video !== this._videoEl || catalog.current() !== this._playNode) return;',
    'video !== this._videoEl || !this._refreshVideoContext()) return;\n                    if (video.ended) { this._completeVideo(video); return; }'));
const accept = source => source.slice(source.indexOf('        const accept = (event,'), source.indexOf('        function createParent('));
assert.ok(accept(current).includes('event.source === peer'));
assert.ok(accept(current).includes('session.peerOrigin || env.location.origin'));
assert.ok(accept(current).includes('data.seq > session.received'));
const catalogOnly = source => source.slice(source.indexOf('    const catalog = {'), source.indexOf('    const videoAdapter ='));
assert.equal(catalogOnly(current), catalogOnly(reviewed));
console.log('PASS: immediate recovery/monitoring, legitimate completion and scoped discovery preserved; assessment deferral and exact-origin protocol intentionally extended.');

const popupBaseline = execFileSync('git', ['show', '58a252a6eb935b1cc249fe7944b5758d2675b7be:v3_optimized.js'], { encoding: 'utf8' });
for (const name of ['_assessmentTarget', '_targetAfter', '_actionEnabled']) {
    assert.equal(method(current, name), method(popupBaseline, name), `${name} must match 58a252a`);
}
const block = (source, start, end) => {
    const first = source.indexOf(start), last = source.indexOf(end, first);
    assert.ok(first >= 0 && last > first, start);
    return source.slice(first, last);
};
for (const [start, end] of [
    ['    function bootRecordedPopup()', '    function createTaskSupport('],
    ["        const protocol = 'xuexitong-live-v1'", '        function createParent('],
    ['            const url = new URL(entry.href', '        function installChild('],
    ['        function installChild(', '        function readDocument('],
]) assert.equal(block(current, start, end), block(popupBaseline, start, end));
console.log('PASS: 58a252a owned-popup protocol/child recovery and assessment/settings rules preserved; scheduler timing unchanged.');

const lifecycleBaseline = execFileSync('git', ['show', '87c3086245c1078fa13ad7df0391b99e656ebefb:v3_optimized.js'], { encoding: 'utf8' });
assert.equal(block(current, '                    const [root, player, leaf]', '                    // Broader topologies').trim(),
    block(lifecycleBaseline, '                    const [root, player, leaf]', '                } catch (_) { /* Unverifiable context').trim());
assert.ok(current.includes("if (depth >= 4) { block('task-depth-limit'); continue; }"));
assert.equal(method(current, '_runAction'), method(lifecycleBaseline, '_runAction').replace('node === catalog.current()', 'this._sameVideoTaskNode(node)')
    .replace("for (const frame of doc.querySelectorAll('iframe')) if (doc !== document || frame === videoAdapter.cardFrame()) listen(frame, 'load');",
        "for (const frame of doc.querySelectorAll('iframe')) if (doc !== document || frame === videoAdapter.cardFrame()) {\n                                listen(frame, 'load', () => { if (!this._automaticStartup || category !== 'videoStart' || !valid()) cancel(); });\n                            }"));
// Inventory discovery is intentionally extended; keep the legacy scope/ownership delegation,
// and exercise inventory ordering, invalidation and refusal paths in navigation-v3.mjs.
assert.ok(method(current, '_discoverMedia').includes('videoAdapter.discover(new Set(scope?.tasks.map(task => task.element.ownerDocument) || []), scope?.mediaOwnership)'));
assert.ok(method(current, '_discoverMedia').includes("media.reasons.push('attachment-inventory-changed')"));
assert.equal(method(current, 'updateSettings'), method(popupBaseline, 'updateSettings').replace('                this.settings = next;',
    "                this.settings = next;\n                if (!next.features.videoPlayback && this._startupCancel) { this._cancelTasks(); this._state = 'PAUSED_AUTOMATION'; }"));
assert.equal(method(current, '_schedule'), method(lifecycleBaseline, '_schedule').replace('node !== catalog.current()', '!this._sameVideoTaskNode(node)'));
const withoutInventoryGuard = value => value.replace("                    (!tasks.tasks || tasks.tasks.every(task => task.kind === 'video' && this._completedVideos.has(task.element))) &&\n", '');
assert.equal(withoutInventoryGuard(method(current, '_navigationEligible')), method(lifecycleBaseline, '_navigationEligible').replace(
    '                if (this._externalCompletion) return this._externalNavigationEligible(target);',
    '                if (this._externalCompletion) return this._externalNavigationEligible(target);\n                if (!this._refreshVideoContext()) return false;'));
assert.equal(method(current, '_completeVideo'), method(lifecycleBaseline, '_completeVideo').replace(
    'catalog.current() !== this._playNode || this._currentStepTitle() !== this._playStepTitle', '!this._refreshVideoContext()'));
assert.equal(method(current, '_continueCompleted'), method(lifecycleBaseline, '_continueCompleted').replace(
    "                if (this._state !== 'VERIFYING_COMPLETION') return;",
    "                if (this._state !== 'VERIFYING_COMPLETION') return;\n                if (!this._refreshVideoContext()) return this._block('完成事件的任务或播放器身份无法确认');"));
assert.equal(method(current, '_handlePlayError'), method(lifecycleBaseline, '_handlePlayError')
    .replace('                const video = this._getVideoEl();', '                const video = this._getVideoEl();\n                if (video?.ended) { this._completeVideo(video); return; }')
    .replaceAll('node !== catalog.current()', '!this._sameVideoTaskNode(node)')
    .replace('                        if (generation !== this._generation || !this._sameVideoTaskNode(node)) return;',
        '                        if (generation !== this._generation || !this._sameVideoTaskNode(node)) return;\n                        if (video.ended) { this._completeVideo(video); return; }'));
assert.equal(method(current, '_checkVideoStatus'), method(lifecycleBaseline, '_checkVideoStatus')
    .replace('                    if (!video) return;', '                    if (!video) return;\n                    if (video.ended) { this._completeVideo(video); return; }')
    .replace("                    if (video.ended && this._isPlaying) {\n                        console.log(\"%c检测到视频结束，准备切换下一个...\", \"color:#9C27B0\");\n                        this._isPlaying = false;\n                        this._completeVideo(video);\n                    }\n", ''));
const startupBaseline = execFileSync('git', ['show', 'd7ea26ac373522b250f4bf573fada7c75687c909:v3_optimized.js'], { encoding: 'utf8' });
for (const name of ['_catalogTopology', '_refreshVideoContext', '_sameVideoTaskNode', '_schedule', '_completeVideo', '_continueCompleted',
    '_navigationEligible', '_queueNavigation', '_tryResumePlayback', '_handlePlayError', '_checkVideoStatus']) {
    assert.equal(withoutInventoryGuard(method(current, name)), method(startupBaseline, name), `${name} preserves d7ea26a completion/continuity`);
}
const startupChanges = ['run', '_waitForStartup', 'nextUnit', 'updateSettings', '_runAction', '_discoverMedia', '_playableMedia', '_mediaAction', '_discoverAttachmentTask', '_cardIdentity', '_bindCatalogNavigation', '_beginCatalogTransition', '_cancelTasks', 'play', '_getVideoEl'];
const outsideStartup = source => {
    source = source.slice(source.indexOf('    // Rules are limited'));
    source = withoutInventoryGuard(source);
    source = source.replaceAll('                this._attachmentSnapshot = null;\n', '');
    if (source.includes("        const bridgeProtocol =")) source = source.replace(block(source, '        const bridgeProtocol =', "        const protocol = 'xuexitong-live-v1'"), '');
    source = source.replace('scheduleClose = fn => fn(), isPlatformComplete, background', 'scheduleClose = fn => fn()')
        .replace("                if (typeof isPlatformComplete === 'function') return createBridgeParent({ generation, isValid,\n                    isPlatformComplete, onResult, onError, scheduleClose, background });\n", '')
        .replace("        return { createParent, installChild, readDocument, inspectPlatformEntry: entry => platformLiveEntry.inspect(entry),\n            dispose() { for (const parent of [...bridgeParents]) parent.dispose(); } };", "        return { createParent, installChild, readDocument, inspectPlatformEntry: entry => platformLiveEntry.inspect(entry) };")
        .replace("                            isPlatformComplete: () => this._taskContextValid(record) && catalog.status(record.node) === 'completed',\n                            background: this.settings.features.background,\n", '');
    source = source.replace("audioPlayback: '自动播放音频', nextAudio: '自动下一音频', ", '')
        .replace("        audioStart: ['音频开始', 300, 900, 'audioPlayback'], nextAudio: ['课内下一音频', 500, 1500, 'nextAudio'],\n", '')
        .replace("            if (['audioPlayback', 'nextAudio'].includes(key) && input.features && !Object.hasOwn(input.features, key)) continue;\n", '')
        .replace("            if (['audioStart', 'nextAudio'].includes(key) && input.delays && !Object.hasOwn(input.delays, key)) {\n                result.delays[key] = defaultSettings(input.preset).delays[key]; continue;\n            }\n", '');
    source = source.replace("                const inventory = this._discoverAttachmentTask();\n                if (inventory === true) return true;\n                if (inventory?.kind === 'video') return false;\n", '');
    source = source.replace(block(source, '    const videoAdapter =', '    const SETTINGS_KEY'), '');
    for (const name of startupChanges) if (source.includes(`            ${name}(`) || source.includes(`            async ${name}(`)) {
        source = source.replace(method(source, name) + '\n            },', '');
    }
    return source.replace('app.run({ startup: true });', 'app.run();').replace(/\n{2,}/g, '\n');
};
assert.equal(outsideStartup(current), outsideStartup(startupBaseline));
console.log('PASS: legacy audition predicate/depth bound preserved; d7ea26a completion/rebinding methods unchanged; startup/media changes isolated from all other runtime code.');

const mediaBaseline = execFileSync('git', ['show', 'f587605e91e14d39429168c88936a83840ea19cf:v3_optimized.js'], { encoding: 'utf8' }).replace(/\r\n/g, '\n');
const outsideMediaRepair = source => {
    source = source.replace(block(source, '    const videoAdapter =', '    const SETTINGS_KEY'), '');
    for (const name of ['_discoverMedia', '_playableMedia', '_discoverAttachmentTask', '_waitForStartup']) source = source.replace(method(source, name), '');
    return source;
};
assert.equal(outsideMediaRepair(actual), outsideMediaRepair(mediaBaseline), 'all runtime outside discovery/classification/readiness must match f587605');
assert.equal(block(actual, "        const bridgeProtocol =", '    function initializePlayer()'), block(mediaBaseline, "        const bridgeProtocol =", '    function initializePlayer()'));
console.log('PASS: all runtime outside media discovery/readiness, including bridge fail-closed security and legacy popup code, unchanged from f587605.');
