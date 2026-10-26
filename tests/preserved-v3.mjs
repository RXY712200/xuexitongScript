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

const reviewed = execFileSync('git', ['show', '64900befe4ffa90effc8333077dcb7677ac4a8e6:v3_optimized.js'], { encoding: 'utf8' });
for (const name of ['_bindPageGuards', '_startVideoMonitoring', '_checkVideoStatus', '_completeVideo',
    '_handlePlayError', '_bindStepNavigation', '_initCellData', '_schedule', '_verificationPresent',
    '_assessmentTarget', '_targetAfter', '_taskSet', '_discoverMedia', '_taskContextValid', '_externalNavigationEligible', '_navigationEligible']) {
    assert.equal(method(current, name), method(reviewed, name), `${name} must match 64900be`);
}
assert.equal(method(current, '_tryResumePlayback'), method(reviewed, '_tryResumePlayback').replace(
    '            _tryResumePlayback(reason) {', '            _tryResumePlayback(reason) {\n                if (!this.settings.features.background) return;'));
const accept = source => source.slice(source.indexOf('        const accept = (event,'), source.indexOf('        function createParent('));
assert.equal(accept(current), accept(reviewed));
const catalogBlock = source => source.slice(source.indexOf('    const catalog = {'), source.indexOf('    // Evidence adapters are opt-in.'));
const catalogOnly = source => source.slice(source.indexOf('    const catalog = {'), source.indexOf('    const SETTINGS_KEY'));
assert.ok(catalogBlock(current).includes("const videoAdapter ="));
assert.equal(catalogOnly(current).trim(), reviewed.slice(reviewed.indexOf('    const catalog = {'), reviewed.indexOf('    // Evidence adapters are opt-in.')).trim());
console.log('PASS: immediate recovery/monitoring, legitimate completion, chapter rules, scoped discovery and live message validation preserved; explicit background switch is the only recovery gate.');
