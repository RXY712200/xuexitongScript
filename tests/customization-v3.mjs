import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../v3_optimized.js', import.meta.url), 'utf8');
let title = '章节测验';
let boot;
const timers = new Map();
let timerId = 0;
const context = {
    window: { jQuery: {} },
    document: { getElementsByClassName: () => [{ title }] },
    $: () => ({ length: 1 }),
    console: { log() {}, warn() {}, error() {}, info() {} },
    setInterval(fn) { boot = fn; return ++timerId; },
    clearInterval() {},
    setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
    clearTimeout(id) { timers.delete(id); },
};
vm.runInNewContext(source, context);
boot();
const app = context.window.app;
assert.ok(app);
assert.equal(app.configs.playbackRate, 1.0);
assert.equal(app._isChapterTest(), true);

// Quiz detection must win even over a cached video, pending step switch,
// and the optional advance-on-no-video setting.
app._getVideoEl = () => { throw new Error('Quiz must stop before video lookup'); };
app._stepSwitchPending = true;
app._stepSwitchAt = Date.now();
app.configs.autoAdvanceNoVideo = true;
app._isPlaying = true;
app._checkInterval = 42;
app._delayedNextUnitTimer = context.setTimeout(() => assert.fail('retry survived'));
await app.play();
assert.equal(app._isPlaying, false);
assert.equal(app._checkInterval, null);
assert.equal(app._delayedNextUnitTimer, null);
assert.equal(timers.size, 0);
app._getTreeContainer = () => { throw new Error('Quiz must stop before navigation'); };
app.nextUnit();
assert.equal(app._nextUnitPending, false);

title = '视频';
assert.equal(app._isChapterTest(), false);
const video = { play: async () => {} };
app._getVideoEl = () => video;
app._videoEventHandle = () => {};
app._startVideoMonitoring = () => {};
await app.play();
assert.equal(video.playbackRate, 1.0);
app.configs.playbackRate = 1.25;
await app.play();
assert.equal(video.playbackRate, 1.25);

// Exercise the original same-chapter and next-chapter navigation branches.
const nodes = [{}, {}];
let target;
context.$ = () => ({ find: () => ({ length: nodes.length, get: i => nodes[i] }) });
const cells = { length: 2, get: i => ({ index: i }) };
app._getTreeContainer = () => ({ children: () => ({ children: () => cells }) });
app.playCurrentIndex = node => { target = node; };
app.nextUnit();
assert.equal(target, nodes[1]);
app._nextUnitPending = false;
app._cellData.currentNCellIndex = 1;
target = 'unset';
app.nextUnit();
assert.equal(target, undefined);
assert.equal(app._cellData.currentCellIndex, 1);
assert.equal(app._cellData.currentNCellIndex, 0);
console.log('PASS: quiz stop, pending retry cancellation, configurable rate, and both navigation branches (simulated).');
