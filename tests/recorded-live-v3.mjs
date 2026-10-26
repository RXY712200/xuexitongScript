import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = process.env.PLAYWRIGHT_MODULE ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href) : require('playwright');
const source = readFileSync(new URL('../v3_optimized.js', import.meta.url), 'utf8');
const fixture = readFileSync(new URL('../fixtures/synthetic/recorded-live-videojs.html', import.meta.url), 'utf8');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let passed = 0;
const failures = [];
console.log(`ENV: Chrome ${browser.version()}; intercepted HTTPS origins, synthetic DOM and media; no authenticated platform access.`);
async function setup({ duration = 2737, delayed = false, noopener = false, blocked = false, status = 4, lookback = 1, wrongStructure = false, title = '直播' } = {}) {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.route('**/*', route => route.abort());
    await context.route('https://mooc1.chaoxing.com/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Synthetic course</title><a id="entry" target="_blank" href="https://zhibo.chaoxing.com/synthetic-replay">Synthetic recording</a>' }));
    await context.route('https://zhibo.chaoxing.com/**', route => route.fulfill({ contentType: 'text/html', body: fixture }));
    const page = await context.newPage();
    await page.goto('https://mooc1.chaoxing.com/synthetic-course');
    await page.evaluate(({ noopener, blocked }) => {
        const categories = ['videoStart', 'nextVideo', 'documentScroll', 'nextDocument', 'nextLesson', 'nextChapter', 'assessment', 'liveOpen', 'liveReturn'];
        localStorage.setItem('xuexitong.v3.action-settings.v1', JSON.stringify({ version: 1, preset: 'custom', collapsed: true, randomDelaysEnabled: false,
            features: Object.fromEntries(['videoPlayback', 'nextVideo', 'nextLesson', 'nextChapter', 'assessment', 'document', 'live', 'background'].map(key => [key, true])),
            delays: Object.fromEntries(categories.map(key => [key, { enabled: false, minMs: 0, maxMs: 0 }])) }));
        if (noopener) document.querySelector('a').rel = 'noopener';
        if (blocked) window.open = () => null;
        // No course bootstrap needed in this protocol fixture.
        window.jQuery = {};
    }, { noopener, blocked });
    await page.addScriptTag({ content: source });
    await page.evaluate(() => {
        window.__results = []; window.__errors = []; window.__valid = true; window.__closeCalls = 0;
        try {
            window.__parent = window.__xuexitongTaskSupport.createParent({ entry: document.querySelector('a'), generation: 7, threshold: .99,
                isValid: () => window.__valid, onResult: value => window.__results.push(value), onError: value => window.__errors.push(value),
                scheduleClose: callback => { window.__closeCalls++; window.__closeCallback = callback; } });
            window.__parent.start();
        } catch (error) { window.__errors.push(error.message); }
    });
    if (noopener || blocked) return { context, page, child: null };
    const child = context.pages().find(candidate => candidate !== page) || await context.waitForEvent('page');
    await child.waitForLoadState('domcontentloaded');
    await child.evaluate(({ duration, delayed, status, lookback, wrongStructure, title }) => {
        window.liveStatus = status;
        window.lookback = lookback; document.title = title;
        const video = document.querySelector('video');
        window.__video = video; window.__position = 9; window.__duration = duration; window.__ended = false; window.__paused = false; window.__plays = 0;
        Object.defineProperties(video, { duration: { get: () => window.__duration }, currentTime: { get: () => window.__position, set() { throw Error('Seeking forbidden'); } },
            ended: { get: () => window.__ended }, paused: { get: () => window.__paused } });
        video.play = () => { window.__plays++; window.__paused = false; return Promise.resolve(); };
        if (delayed) video.remove();
        if (wrongStructure) video.className = 'unrecognized-player';
    }, { duration, delayed, status, lookback, wrongStructure, title });
    await child.addScriptTag({ content: source });
    if (!delayed && status === 4 && lookback === 1 && !wrongStructure && title === '直播') {
        await page.evaluate(() => window.__parent.tick());
        await page.waitForFunction(() => !!window.__parent.session.documentId);
    }
    return { context, page, child };
}
async function check(name, options, callback) {
    let env;
    try { env = await setup(options); await callback(env); console.log(`PASS: ${name}`); passed++; }
    catch (error) { failures.push(name); console.error(`FAIL: ${name}\n${error.stack}`); }
    finally { await env?.context.close(); }
}
const terminal = async child => child.evaluate(() => { window.__ended = true; window.__video.dispatchEvent(new Event('ended')); });
try {
    await check('exact cross-origin handshake pins an ephemeral child document identity', {}, async ({ page, child }) => {
        assert.equal(await child.evaluate(() => window.__xuexitongLiveChild.active), true);
        assert.equal(await page.evaluate(() => window.__parent.session.peerOrigin), 'https://zhibo.chaoxing.com');
        assert.equal(await child.evaluate(() => window.__video.playbackRate), 1);
        assert.deepEqual(await page.evaluate(() => window.__errors), []);
    });
    await check('finite replay at 99 percent and visible end banner do not complete', {}, async ({ page, child }) => {
        await child.evaluate(() => { window.__position = window.__duration * .995; document.querySelector('#endViewId').style.display = ''; window.__xuexitongLiveChild.check(); });
        await page.evaluate(() => window.__parent.tick());
        assert.equal(await page.evaluate(() => window.__closeCalls), 0);
        assert.equal(child.isClosed(), false);
    });
    await check('natural ended schedules closure once; result waits for actual closure', {}, async ({ page, child }) => {
        await terminal(child);
        await page.waitForFunction(() => window.__closeCalls === 1);
        await terminal(child);
        assert.deepEqual(await page.evaluate(() => window.__results), []);
        const closed = child.waitForEvent('close');
        await page.evaluate(() => window.__closeCallback());
        await closed;
        await page.evaluate(() => window.__parent.tick());
        assert.deepEqual(await page.evaluate(() => window.__results), [{ kind: 'completed', basis: 'local-ended' }]);
        assert.equal(await page.evaluate(() => window.__closeCalls), 1);
    });
    await check('unknown duration has no elapsed-time completion', { duration: Infinity }, async ({ page, child }) => {
        await child.evaluate(() => { const now = Date.now(); Date.now = () => now + 2 * 3600000; window.__xuexitongLiveChild.check(); });
        assert.equal(await page.evaluate(() => window.__closeCalls), 0);
    });
    await check('ongoing live status is unsupported by the recorded adapter', { status: 1 }, async ({ page, child }) => {
        assert.equal(await child.evaluate(() => !!window.__xuexitongLiveChild), false);
        assert.equal(await page.evaluate(() => window.__closeCalls), 0);
    });
    for (const [name, options] of [['not a lookback', { lookback: 0 }], ['wrong Video.js structure', { wrongStructure: true }], ['wrong page title', { title: 'Synthetic unrelated page' }]]) {
        await check(`strict recorded recognition rejects ${name}`, options, async ({ page, child }) => {
            assert.equal(await child.evaluate(() => !!window.__xuexitongLiveChild), false);
            assert.equal(await page.evaluate(() => window.__closeCalls), 0);
        });
    }
    await check('asynchronously inserted player is recognized without course jQuery bootstrap', { delayed: true }, async ({ page, child }) => {
        assert.equal(await child.evaluate(() => !!window.__xuexitongLiveChild), false);
        await child.evaluate(() => document.querySelector('#video').append(window.__video));
        await child.waitForFunction(() => !!window.__xuexitongLiveChild);
        await page.evaluate(() => window.__parent.tick());
        await page.waitForFunction(() => !!window.__parent.session.documentId);
        assert.equal(await child.evaluate(() => !!document.querySelector('script[src*="jquery"]')), false);
    });
    await check('wrong origin/source/session/generation/sequence cannot trigger closure', {}, async ({ page, child }) => {
        const packet = await page.evaluate(() => ({ protocol: 'xuexitong-live-v1', ...window.__parent.session, seq: window.__parent.session.received + 1,
            timestamp: Date.now(), type: 'LIVE_COMPLETED', ended: true, playerKind: 'chaoxing-recorded-videojs' }));
        await page.evaluate(packet => window.dispatchEvent(new MessageEvent('message', { origin: 'https://untrusted.test', source: window.__parent.child, data: packet })), packet);
        await page.evaluate(packet => window.dispatchEvent(new MessageEvent('message', { origin: 'https://zhibo.chaoxing.com', source: window, data: packet })), packet);
        for (const patch of [{ id: 'wrong-session' }, { generation: 99 }, { seq: 0 }]) {
            await child.evaluate(packet => opener.postMessage(packet, 'https://mooc1.chaoxing.com'), { ...packet, ...patch });
        }
        await page.evaluate(() => window.__parent.tick());
        assert.equal(await page.evaluate(() => window.__closeCalls), 0);
    });
    await check('changed child instance is rejected and stops coordination', {}, async ({ page, child }) => {
        const packet = await page.evaluate(() => ({ protocol: 'xuexitong-live-v1', ...window.__parent.session, seq: window.__parent.session.received + 1,
            timestamp: Date.now(), type: 'LIVE_COMPLETED', ended: true, playerKind: 'chaoxing-recorded-videojs', documentId: crypto.randomUUID() }));
        await child.evaluate(packet => opener.postMessage(packet, 'https://mooc1.chaoxing.com'), packet);
        await page.waitForFunction(() => window.__errors.length > 0);
        assert.equal(await page.evaluate(() => window.__closeCalls), 0);
    });
    await check('unexpected child closure stops safely', {}, async ({ page, child }) => {
        await child.close(); await page.evaluate(() => window.__parent.tick());
        assert.equal(await page.evaluate(() => window.__errors.length), 1);
        assert.deepEqual(await page.evaluate(() => window.__results), []);
    });
    await check('stale parent validity prevents closure and continuation', {}, async ({ page, child }) => {
        await page.evaluate(() => { window.__valid = false; window.__parent.tick(); }); await terminal(child);
        assert.equal(await page.evaluate(() => window.__closeCalls), 0);
        await child.waitForFunction(() => window.__xuexitongLiveChild.disposed);
        assert.equal(child.isClosed(), false);
    });
    await check('cross-origin background feature updates are validated and applied without pausing playback', {}, async ({ page, child }) => {
        const before = await child.evaluate(() => window.__plays);
        await page.evaluate(() => { const key = 'xuexitong.v3.action-settings.v1', s = JSON.parse(localStorage.getItem(key)); s.features.background = false; localStorage.setItem(key, JSON.stringify(s)); window.__parent.tick(); });
        // A reply establishes that the child processed the settings-bearing packet.
        const seq = await page.evaluate(() => window.__parent.session.received);
        await page.waitForFunction(seq => window.__parent.session.received > seq, seq);
        await child.evaluate(() => { window.__paused = true; window.__video.dispatchEvent(new Event('pause')); });
        assert.equal(await child.evaluate(() => window.__plays), before);
    });
    await check('recorded stall recovery keeps its cooldown and never seeks', {}, async ({ child }) => {
        const before = await child.evaluate(() => window.__plays);
        await child.evaluate(() => {
            const now = Date.now(); let elapsed = 0; Date.now = () => now + elapsed;
            window.__xuexitongLiveChild.check(); elapsed = 8000;
            window.__xuexitongLiveChild.check(); window.__xuexitongLiveChild.check();
        });
        assert.equal(await child.evaluate(() => window.__plays), before + 1);
        assert.equal(await child.evaluate(() => window.__video.currentTime), 9);
    });
    await check('only the confirmed cross-origin origin pair is accepted', {}, async ({ page }) => {
        const rejected = await page.evaluate(() => {
            const entry = document.createElement('a'); entry.target = '_blank'; entry.href = 'https://other.chaoxing.com/synthetic-replay'; document.body.append(entry);
            try { window.__xuexitongTaskSupport.createParent({ entry, generation: 8, threshold: .99 }); return false; } catch (_) { return true; }
        });
        assert.equal(rejected, true);
    });
    await check('media errors stop the recorded child without reporting completion', {}, async ({ page, child }) => {
        await child.evaluate(() => { Object.defineProperty(window.__video, 'error', { value: { code: 4 } }); window.__xuexitongLiveChild.check(); });
        await page.waitForFunction(() => window.__errors.length > 0);
        assert.equal(await page.evaluate(() => window.__closeCalls), 0);
        assert.equal(await child.evaluate(() => window.__xuexitongLiveChild.disposed), true);
    });
    await check('popup-blocked delayed open reports manual intervention without retry', { blocked: true }, async ({ page }) => {
        assert.match(await page.evaluate(() => window.__errors.join()), /blocked/);
        assert.deepEqual(await page.evaluate(() => window.__results), []);
    });
    await check('noopener security policy is preserved', { noopener: true }, async ({ page }) => {
        assert.match(await page.evaluate(() => window.__errors.join()), /Unsupported/);
    });
    await check('recorded pause/focus recovery is immediate and rate remains one', {}, async ({ child }) => {
        const before = await child.evaluate(() => window.__plays);
        await child.evaluate(() => { window.__paused = true; window.__video.playbackRate = 2; window.__video.dispatchEvent(new Event('ratechange')); window.__video.dispatchEvent(new Event('pause')); });
        assert.equal(await child.evaluate(() => window.__plays), before + 1);
        assert.equal(await child.evaluate(() => window.__video.playbackRate), 1);
        await child.evaluate(() => { window.__paused = true; window.dispatchEvent(new Event('focus')); });
        assert.equal(await child.evaluate(() => window.__plays), before + 1); // Existing recovery cooldown principle.
    });
    await check('popup missing opener does not install an autonomous coordinator', {}, async ({ context }) => {
        const standalone = await context.newPage(); await standalone.goto('https://zhibo.chaoxing.com/synthetic-standalone');
        await standalone.addScriptTag({ content: source });
        assert.equal(await standalone.evaluate(() => !!window.__xuexitongLiveChild), false);
    });
} finally { await browser.close(); }
console.log(`RESULT: ${passed} passed; ${failures.length} failed. Synthetic browser evidence only.`);
if (failures.length) process.exitCode = 1;
