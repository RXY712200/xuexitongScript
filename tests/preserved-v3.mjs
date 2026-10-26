import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const baseline = execFileSync('git', ['show', 'e907cdda9d50fd80c61721061ed0988dfec621a4:v3_optimized.js'], { encoding: 'utf8' });
const current = readFileSync(new URL('../v3_optimized.js', import.meta.url), 'utf8');
function method(source, name) {
    const start = source.indexOf(`            ${name}(`);
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

const reviewed = execFileSync('git', ['show', '82814b4427cfd9f48a2789eb3160ada42a3d9807:v3_optimized.js'], { encoding: 'utf8' });
function outsideAdapter(source) {
    const start = source.indexOf('    const videoAdapter = {');
    const end = source.indexOf('    function initializePlayer()', start);
    assert.ok(start >= 0 && end > start);
    return source.slice(0, start) + source.slice(end);
}
assert.equal(outsideAdapter(current), outsideAdapter(reviewed));
console.log('PASS: scope remediation changes only videoAdapter; all catalog, coordinator, playback, focus, pause, stall, cooldown and rate code matches reviewed 82814b4.');
