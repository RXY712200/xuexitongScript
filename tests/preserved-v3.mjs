import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const baseline = execFileSync('git', ['show', 'e907cdda9d50fd80c61721061ed0988dfec621a4:v3_optimized.js'], { encoding: 'utf8' });
const current = readFileSync(new URL('../v3_optimized.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
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
    '_discoverMedia', '_taskContextValid', '_externalNavigationEligible']) {
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
for (const name of ['_assessmentTarget', '_targetAfter', '_actionEnabled', 'updateSettings']) {
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
assert.equal(block(current, '    const videoAdapter =', '    const SETTINGS_KEY'), block(lifecycleBaseline, '    const videoAdapter =', '    const SETTINGS_KEY'));
assert.equal(method(current, '_runAction'), method(lifecycleBaseline, '_runAction').replace('node === catalog.current()', 'this._sameVideoTaskNode(node)'));
assert.equal(method(current, '_schedule'), method(lifecycleBaseline, '_schedule').replace('node !== catalog.current()', '!this._sameVideoTaskNode(node)'));
assert.equal(method(current, '_navigationEligible'), method(lifecycleBaseline, '_navigationEligible').replace(
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
const lifecycleMethods = ['nextUnit', '_runAction', '_navigationEligible', '_queueNavigation', '_catalogTopology', '_refreshVideoContext', '_sameVideoTaskNode',
    '_schedule', '_completeVideo', '_continueCompleted', '_tryResumePlayback', '_checkVideoStatus', '_handlePlayError', 'play', '_getVideoEl'];
const outsideLifecycle = source => {
    for (const name of lifecycleMethods) if (source.includes(`            ${name}(`) || source.includes(`            async ${name}(`)) {
        source = source.replace(method(source, name) + '\n            },', '');
    }
    return source.replace('                this._videoContext = null;\n', '').replace(/\n{3,}/g, '\n\n');
};
assert.equal(outsideLifecycle(current), outsideLifecycle(lifecycleBaseline));
console.log('PASS: audition discovery unchanged; all code outside the reviewed lifecycle methods matches 87c3086; pause/stall thresholds and scheduler timing unchanged.');
