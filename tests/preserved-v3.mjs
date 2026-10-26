import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const baseline = execFileSync('git', ['show', 'e907cdda9d50fd80c61721061ed0988dfec621a4:v3_optimized.js'], { encoding: 'utf8' });
const current = readFileSync(new URL('../v3_optimized.js', import.meta.url), 'utf8');
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
assert.equal(method(current, '_tryResumePlayback'), method(baseline, '_tryResumePlayback')
    .replace('                if (!video || !this._isPlaying) return;',
        '                if (!video || !this._isPlaying) return;\n                const generation = this._generation;')
    .replace('                video.play().catch((e) => {',
        '                video.play().catch((e) => {\n                    if (generation !== this._generation || !this._isPlaying || !video.isConnected ||\n                        video !== this._videoEl || catalog.current() !== this._playNode) return;'));
assert.equal(method(current, '_checkVideoStatus'), method(baseline, '_checkVideoStatus')
    .replace('setTimeout(() => this.nextUnit(), 1000);', 'this._completeVideo(video);'));
for (const path of ['deepseek-console/xuexitong-console.js', 'deepseek-console/deepseek-local.mjs', 'deepseek-console/deepseek-request.mjs', 'v2.js', 'xuexitong.js']) {
    assert.equal(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n'),
        execFileSync('git', ['show', `e907cdda9d50fd80c61721061ed0988dfec621a4:${path}`], { encoding: 'utf8' }).replace(/\r\n/g, '\n'));
}
console.log('PASS: background guards/stall code preserved; recovery adds only stale-session guard; monitor completion dispatch updated; DeepSeek and legacy source unchanged.');

const reviewed = execFileSync('git', ['show', '8d7ab1510b5371094ca77e6ffad96fdc08dd0219:v3_optimized.js'], { encoding: 'utf8' });
for (const name of ['_bindPageGuards', '_startVideoMonitoring', '_tryResumePlayback', '_checkVideoStatus',
    '_completeVideo', '_handlePlayError', '_bindStepNavigation', '_initCellData', '_schedule']) {
    assert.equal(method(current, name), method(reviewed, name), `${name} must match 8d7ab15`);
}
assert.equal(method(current, '_continueCompleted'), method(reviewed, '_continueCompleted')
    .replace("                if (!this._completionNode", "                if (this._processSupportedTask()) return;\n                if (!this._completionNode")
    .replaceAll('videoAdapter.discover()', 'this._discoverMedia()'));
assert.equal(method(current, 'play'), method(reviewed, 'play')
    .replace("'NAVIGATION_COOLDOWN', 'FINISHED'", "'NAVIGATION_COOLDOWN', 'WAITING_LIVE', 'READING_DOCUMENT', 'FINISHED'")
    .replace('                    if (this._playPending) return;', '                    if (this._playPending) return;\n                    if (this._processSupportedTask()) return;')
    .replaceAll('videoAdapter.discover()', 'this._discoverMedia()'));
assert.equal(method(current, '_getVideoEl'), method(reviewed, '_getVideoEl')
    .replace('            _getVideoEl() {', "            _getVideoEl() {\n                if (['WAITING_LIVE', 'READING_DOCUMENT'].includes(this._state)) return null;")
    .replaceAll('videoAdapter.discover()', 'this._discoverMedia()'));
const catalogBlock = source => source.slice(source.indexOf('    const catalog = {'), source.indexOf('    const videoAdapter = {'));
assert.equal(catalogBlock(current), catalogBlock(reviewed));
console.log('PASS: ordinary video guards, recovery, completion and cooldown scheduling preserved; explicit document/live waiting hooks and media-scope adapter routing verified against 8d7ab15.');
