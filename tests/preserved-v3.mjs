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

const reviewed = execFileSync('git', ['show', '6a44a2a4ca303f0f6102a73eeb4ed2261dd3ff99:v3_optimized.js'], { encoding: 'utf8' });
assert.equal(current.slice(0, current.indexOf('    function initializePlayer()')),
    reviewed.slice(0, reviewed.indexOf('    function initializePlayer()')));
for (const name of ['run', '_bindPageGuards', '_startVideoMonitoring', '_tryResumePlayback',
    '_checkVideoStatus', '_completeVideo', '_continueCompleted', 'playCurrentIndex',
    '_getVideoEl', '_handlePlayError', '_bindStepNavigation']) {
    assert.equal(method(current, name), method(reviewed, name), `${name} must match 6a44a2a`);
}
console.log('PASS: catalog/media scope, playback/recovery and completion checks match 6a44a2a; cooldown changes are confined to navigation and cancellation.');
assert.equal(method(current, 'play'), method(reviewed, 'play').replace(
    "['BLOCKED', 'ADVANCING', 'VERIFYING_COMPLETION', 'FINISHED']",
    "['BLOCKED', 'ADVANCING', 'VERIFYING_COMPLETION', 'NAVIGATION_COOLDOWN', 'FINISHED']"));
