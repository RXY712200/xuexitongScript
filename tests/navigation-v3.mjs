import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = process.env.PLAYWRIGHT_MODULE
    ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
    : require('playwright');
const jquery = readFileSync(process.env.JQUERY_PATH, 'utf8');
const source = readFileSync(new URL('../v3_optimized.js', import.meta.url), 'utf8');
const scopeOuter = readFileSync(new URL('../fixtures/synthetic/course-with-auxiliary-frames.html', import.meta.url), 'utf8');
const scopeMedia = readFileSync(new URL('../fixtures/synthetic/course-task-video.html', import.meta.url), 'utf8');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
console.log(`ENV: Chrome ${browser.version()}; headless; network blocked; media and timers simulated.`);
let passed = 0;
const failures = [];
const node = (i, active = false, complete = false) => `<li><div class="posCatalog_select ${active ? 'posCatalog_active' : ''}" id="node${i}"><span class="posCatalog_name" title="Content ${i}">Content ${i}</span>${complete ? '<span class="icon_Completed"></span>' : '<input class="jobUnfinishCount" value="1">'}</div></li>`;
const outer = (entries = 1, complete = false, title = '视频') => `<div class="prev_title" title="${title}"></div><div id="coursetree"><ul><li><ul>${Array.from({ length: entries }, (_, i) => node(i, i === 0, complete)).join('')}</ul></li></ul></div><iframe info="card"></iframe>`;
async function setup(html = outer(), count = 1, nested = false, scopeCase = null, enableCooldown = false, syntheticOrigin = false) {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.route('**/*', route => route.abort());
    if (syntheticOrigin) await context.route('https://course.test/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body><video id="live-player"></video></body></html>' }));
    const page = await context.newPage();
    if (syntheticOrigin) await page.goto('https://course.test/course');
    // DOMParser is inert. Strip executable/resource-bearing content before insertion.
    const sanitized = await page.evaluate(html => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        doc.querySelectorAll('script,object,embed,link,base,meta').forEach(el => el.remove());
        doc.querySelectorAll('*').forEach(el => {
            for (const attr of [...el.attributes]) {
                if (/^on/i.test(attr.name) || ['src', 'srcdoc', 'href', 'action'].includes(attr.name)) el.removeAttribute(attr.name);
            }
        });
        return doc.documentElement.outerHTML;
    }, html);
    await page.setContent(sanitized);
    await page.addScriptTag({ content: jquery });
    await page.evaluate(({ count, nested, scopeCase, scopeMedia }) => {
        window.__clock = 100000;
        Date.now = () => window.__clock;
        let id = 0;
        window.__timeouts = new Map(); window.__intervals = new Map();
        window.__timeoutDelays = new Map(); window.__logs = [];
        const log = console.log.bind(console);
        console.log = (...args) => { window.__logs.push(args.join(' ')); log(...args); };
        window.setTimeout = (fn, delay) => { window.__timeouts.set(++id, fn); window.__timeoutDelays.set(id, delay); return id; };
        window.clearTimeout = id => { window.__timeouts.delete(id); window.__timeoutDelays.delete(id); };
        window.setInterval = fn => { window.__intervals.set(++id, fn); return id; };
        window.clearInterval = id => window.__intervals.delete(id);
        window.__addVideos = (count, nested = false) => {
            let doc = document.querySelector('iframe[info="card"]').contentDocument;
            if (nested) {
                const frame = doc.createElement('iframe'); doc.body.append(frame); doc = frame.contentDocument;
            }
            if (scopeCase && count) doc.body.innerHTML = new DOMParser().parseFromString(scopeMedia, 'text/html').body.innerHTML;
            for (let i = 0; i < count; i++) {
                const v = doc.querySelectorAll('video')[i] || doc.createElement('video'); v.id = `video_html5_api_${i}`;
                v.__ended = false; v.__paused = false; v.__plays = 0;
                Object.defineProperties(v, {
                    ended: { get: () => v.__ended },
                    paused: { get: () => v.__paused },
                });
                v.play = () => { v.__plays++; v.__paused = false; return Promise.resolve(); };
                doc.body.append(v);
            }
        };
        window.__addVideos(count, nested);
        if (scopeCase) {
            window.__auxReads = 0;
            for (const aux of document.querySelectorAll('iframe[id^="aux-"]')) {
                aux.contentDocument.body.textContent = 'Synthetic auxiliary UI';
            }
            if (scopeCase === 'unsupported-aux') {
                document.querySelector('#aux-editor').contentDocument.body.append(document.createElement('audio'));
            }
            if (scopeCase === 'inaccessible-aux') {
                Object.defineProperty(document.querySelector('#aux-report'), 'contentDocument', { get() {
                    window.__auxReads++;
                    throw new DOMException('Synthetic access denial', 'SecurityError');
                } });
            }
        }
    }, { count, nested, scopeCase, scopeMedia });
    await page.addScriptTag({ content: source });
    await page.evaluate(async enableCooldown => {
        for (const fn of [...window.__intervals.values()]) fn();
        await Promise.resolve();
        window.__cooldownDefaults = [app.configs.randomCooldownEnabled, app.configs.randomCooldownMinMs, app.configs.randomCooldownMaxMs];
        // Existing immediate-navigation scenarios explicitly disable the new option.
        app.configs.randomCooldownEnabled = enableCooldown;
    }, enableCooldown);
    return { page, close: () => context.close() };
}
async function flush(page, rounds = 1) {
    await page.evaluate(async rounds => {
        for (let i = 0; i < rounds; i++) {
            const callbacks = [...window.__timeouts.values()]; window.__timeouts.clear(); window.__timeoutDelays.clear();
            for (const fn of callbacks) fn();
            await Promise.resolve(); await Promise.resolve();
        }
    }, rounds);
}
async function check(label, fn) {
    if (process.env.TEST_FILTER && !new RegExp(process.env.TEST_FILTER).test(label)) return;
    try { await fn(); passed++; console.log(`PASS ${label}`); }
    catch (e) { failures.push(label); console.error(`FAIL ${label}: ${e.message}`); }
}
async function using(options, fn) {
    const fixture = await setup(...options);
    try { await fn(fixture.page); } finally { await fixture.close(); }
}
const state = page => page.evaluate(() => app._state);
try {
    for (let i = 1; i <= 8; i++) {
        await check(`private sample-${String(i).padStart(2, '0')}: inert outer structure and safe fallback`, async () => {
            const html = readFileSync(new URL(`../fixtures/private/sample-${String(i).padStart(2, '0')}.html`, import.meta.url), 'utf8');
            await using([html, 0], async page => {
                assert.equal(await page.evaluate(() => app.cellData.nCells), 1);
                assert.equal(await state(page), [3, 7].includes(i) ? 'BLOCKED' : 'LOADING');
                await flush(page, 12);
                assert.equal(await state(page), 'BLOCKED');
                assert.equal(await page.evaluate(() => app._timers.size), 0);
            });
        });
    }
    for (const count of [1, 3, 4]) {
        await check(`synthetic ${count} videos: dynamic discovery, natural end, platform confirmation`, () => using([outer(1, true), count], async page => {
            for (let i = 0; i < count; i++) {
                assert.equal(await state(page), 'PLAYING');
                await page.evaluate(() => { const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); });
                await flush(page);
            }
            assert.equal(await state(page), 'FINISHED');
            assert.deepEqual(await page.evaluate(() => [...document.querySelector('iframe').contentDocument.querySelectorAll('video')].map(v => v.__plays)), Array(count).fill(1));
        }));
    }
    await check('synthetic unfinished counter is never used as video count', () => using([outer(), 4], async page => {
        assert.equal(await page.evaluate(() => app.cellData.nCells), 1);
        assert.equal(await page.evaluate(() => app._getVideoEl().ownerDocument.querySelectorAll('video').length), 4);
    }));
    await check('synthetic completion absent: bounded wait and no navigation', () => using([], async page => {
        await page.evaluate(() => { const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); });
        assert.equal(await state(page), 'VERIFYING_COMPLETION');
        await flush(page, 12); assert.equal(await state(page), 'BLOCKED');
    }));
    await check('synthetic delayed platform completion', () => using([], async page => {
        await page.evaluate(() => { const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); });
        await flush(page);
        await page.evaluate(() => { document.querySelector('.jobUnfinishCount').remove(); document.querySelector('.posCatalog_active').insertAdjacentHTML('beforeend', '<span class="icon_Completed"></span>'); });
        await flush(page); assert.equal(await state(page), 'FINISHED');
    }));
    await check('synthetic duplicate ended and monitor callbacks schedule one completion', () => using([outer(1, true)], async page => {
        const result = await page.evaluate(() => {
            const v = app._videoEl; v.__ended = true;
            app._checkVideoStatus();
            v.dispatchEvent(new Event('ended')); v.dispatchEvent(new Event('ended'));
            return app._timers.size;
        });
        assert.equal(result, 1); await flush(page); assert.equal(await state(page), 'FINISHED');
    }));
    await check('synthetic delayed player retry', () => using([outer(), 0], async page => {
        assert.equal(await state(page), 'LOADING');
        await page.evaluate(() => window.__addVideos(1));
        await flush(page); assert.equal(await state(page), 'PLAYING');
    }));
    await check('synthetic nested same-origin player', () => using([outer(), 1, true], async page => {
        assert.equal(await state(page), 'PLAYING');
    }));
    await check('synthetic stale player removed: detached player never reused', () => using([], async page => {
        const result = await page.evaluate(() => { const old = app._videoEl; old.remove(); return app._getVideoEl() === old; });
        assert.equal(result, false);
    }));
    await check('synthetic in-task cross-origin-like inaccessible iframe: safe block', () => using([], async page => {
        await page.evaluate(() => { const f = document.createElement('iframe'); document.querySelector('iframe[info="card"]').contentDocument.body.append(f); Object.defineProperty(f, 'contentDocument', { get() { throw new DOMException('denied', 'SecurityError'); } }); app.play(); });
        assert.equal(await state(page), 'BLOCKED');
    }));
    await check('synthetic audio mixed with video: unsupported safe block', () => using([], async page => {
        await page.evaluate(() => { document.querySelector('iframe').contentDocument.body.append(document.createElement('audio')); app.play(); });
        assert.equal(await state(page), 'BLOCKED');
    }));
    await check('synthetic unknown content never auto-skips', () => using([outer(2, false, 'Unknown resource'), 0], async page => {
        await page.evaluate(() => { app.configs.autoAdvanceNoVideo = true; });
        await flush(page, 12); assert.equal(await state(page), 'BLOCKED');
        assert.equal(await page.evaluate(() => document.querySelector('.posCatalog_active').id), 'node0');
    }));
    await check('synthetic quiz wins over cached player and pending callbacks', () => using([], async page => {
        await page.evaluate(() => { document.querySelector('.prev_title').title = '本章自测'; app.play(); });
        await flush(page, 12); assert.equal(await state(page), 'BLOCKED');
    }));
    await check('synthetic unsupported multi-tab completion stops', () => using([outer(1, true)], async page => {
        await page.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<div class="prev_list"><div class="prev_white">1</div><div class="prev_white">2</div></div>'); const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); });
        await flush(page); assert.equal(await state(page), 'BLOCKED');
    }));
    await check('synthetic fixed normal rate after config assignment and ratechange', () => using([], async page => {
        await page.evaluate(() => { app.configs.playbackRate = 2; app._videoEl.playbackRate = 2; app._videoEl.dispatchEvent(new Event('ratechange')); });
        assert.deepEqual(await page.evaluate(() => [app.configs.playbackRate, app._videoEl.playbackRate]), [1, 1]);
    }));
    await check('synthetic absent navigation target', () => using([], async page => {
        await page.evaluate(() => app.playCurrentIndex(null)); assert.equal(await state(page), 'BLOCKED');
    }));
    await check('synthetic missing active node blocks playback', () => using([outer().replace('posCatalog_active', '')], async page => {
        assert.equal(await state(page), 'BLOCKED');
    }));
    await check('synthetic dynamic nested directory rescan', () => using([], async page => {
        await page.evaluate(() => { document.querySelector('#coursetree ul ul').insertAdjacentHTML('beforeend', '<li><div class="posCatalog_select firstLayer"><span class="posCatalog_name">Group</span></div><ul><li><div class="posCatalog_select"><span class="posCatalog_name">Nested</span></div></li></ul></li>'); app._initCellData(); });
        assert.equal(await page.evaluate(() => app.cellData.nCells), 2);
    }));
    await check('synthetic navigation target: lock, active-node change and new iframe required', () => using([outer(2, true)], async page => {
        await page.evaluate(() => {
            window.__clicks = 0;
            document.querySelector('#node1 .posCatalog_name').onclick = () => {
                window.__clicks++;
                document.querySelector('#node0').classList.remove('posCatalog_active');
                document.querySelector('#node1').classList.add('posCatalog_active');
                const old = document.querySelector('iframe'); const frame = document.createElement('iframe'); frame.setAttribute('info', 'card'); old.replaceWith(frame); window.__addVideos(3);
            };
            const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); v.dispatchEvent(new Event('ended'));
        });
        await flush(page);
        assert.equal(await page.evaluate(() => window.__clicks), 1);
        assert.equal(await state(page), 'PLAYING');
        assert.equal(await page.evaluate(() => document.querySelector('.posCatalog_active').id), 'node1');
    }));
    await check('synthetic navigation not acknowledged: bounded stop', () => using([outer(2, true)], async page => {
        await page.evaluate(() => { const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); });
        await flush(page, 12); assert.equal(await state(page), 'BLOCKED');
    }));
    await check('synthetic blur/visibilitychange resume with cooldown', () => using([], async page => {
        const results = await page.evaluate(() => {
            const v = app._videoEl; const before = v.__plays;
            window.dispatchEvent(new Event('blur')); document.dispatchEvent(new Event('visibilitychange'));
            const immediate = v.__plays - before;
            window.__clock += 1600; document.dispatchEvent(new Event('visibilitychange'));
            return [immediate, v.__plays - before];
        });
        assert.deepEqual(results, [1, 2]);
    }));
    await check('synthetic mouseleave/mouseout guards retained on document/window', () => using([], async page => {
        assert.equal(await page.evaluate(() => [document, window].every(target => ['mouseleave', 'mouseout'].every(type => !target.dispatchEvent(new Event(type, { cancelable: true }))))), true);
    }));
    await check('synthetic unexpected pause recovery and cooldown', () => using([], async page => {
        assert.equal(await page.evaluate(() => { const v = app._videoEl; const before = v.__plays; v.__paused = true; app._checkVideoStatus(); v.__paused = true; app._checkVideoStatus(); return v.__plays - before; }), 1);
    }));
    await check('synthetic stall detection avoids repeated recovery', () => using([], async page => {
        assert.equal(await page.evaluate(() => { const v = app._videoEl; const before = v.__plays; app._checkVideoStatus(); window.__clock += 7100; app._checkVideoStatus(); app._checkVideoStatus(); return v.__plays - before; }), 1);
    }));
    await check('synthetic destroy cancels callbacks and removes guards', () => using([outer(1, true)], async page => {
        await page.evaluate(() => { const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); app.destroy(); });
        await flush(page, 12);
        assert.deepEqual(await page.evaluate(() => [app._timers.size, document.dispatchEvent(new Event('mouseleave', { cancelable: true }))]), [0, true]);
    }));
    await check('synthetic conflict: positive unfinished count overrides completed icon', () => using([outer(1, true)], async page => {
        await page.evaluate(() => { document.querySelector('.posCatalog_active').insertAdjacentHTML('beforeend', '<input class="jobUnfinishCount" value="1">'); const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); });
        await flush(page, 12); assert.equal(await state(page), 'BLOCKED');
    }));
    await check('synthetic zero unfinished counter without completion icon is ambiguous', () => using([], async page => {
        await page.evaluate(() => { document.querySelector('.jobUnfinishCount').value = '0'; const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); });
        await flush(page, 12); assert.equal(await state(page), 'BLOCKED');
    }));
    await check('synthetic unknown iframe alongside video stops', () => using([], async page => {
        await page.evaluate(() => { const f = document.createElement('iframe'); document.querySelector('iframe').contentDocument.body.append(f); f.contentDocument.body.textContent = 'Unknown resource'; app.play(); });
        assert.equal(await state(page), 'BLOCKED');
    }));
    await check('synthetic user changes chapter before old completion', () => using([outer(2, true)], async page => {
        await page.evaluate(() => { document.querySelector('#node0').classList.remove('posCatalog_active'); document.querySelector('#node1').classList.add('posCatalog_active'); const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); });
        assert.equal(await state(page), 'BLOCKED');
    }));
    await check('synthetic pending play promise invalidated by quiz stop', () => using([], async page => {
        await page.evaluate(() => {
            const v = app._videoEl; v.play = () => new Promise(resolve => { window.__resolvePlay = resolve; });
            app.play(); document.querySelector('.prev_title').title = '章节测验'; app.play(); window.__resolvePlay();
        });
        assert.equal(await state(page), 'BLOCKED');
        assert.equal(await page.evaluate(() => app._checkInterval), null);
    }));
    await check('synthetic video completion while navigation is pending is ignored', () => using([outer(2, true)], async page => {
        await page.evaluate(() => { const v = app._videoEl; window.__old = v; v.__ended = true; v.dispatchEvent(new Event('ended')); });
        await flush(page);
        assert.equal(await state(page), 'ADVANCING');
        const size = await page.evaluate(() => app._timers.size);
        await page.evaluate(() => app._completeVideo(window.__old));
        assert.equal(await page.evaluate(() => app._timers.size), size);
    }));
    await check('synthetic muted fallback remains active', () => using([], async page => {
        await page.evaluate(async () => { const v = app._videoEl; let calls = 0; v.play = () => ++calls === 1 ? Promise.reject(new Error('autoplay blocked')) : Promise.resolve(); await app.play(); await Promise.resolve(); });
        assert.equal(await page.evaluate(() => app._videoEl.muted), true);
        assert.equal(await state(page), 'PLAYING');
        assert.notEqual(await page.evaluate(() => app._checkInterval), null);
    }));
    await check('synthetic course has chapters with 1/3/4 videos, one transition each', () => using([outer(1, true)], async page => {
        await page.evaluate(() => {
            window.__chapter = 0; window.__transitions = 0;
            const root = document.querySelector('#coursetree > ul');
            root.insertAdjacentHTML('beforeend', [1, 2].map(i => `<li><ul><li><div id="node${i}" class="posCatalog_select"><span class="posCatalog_name" title="Content ${i}">Content ${i}</span><span class="icon_Completed"></span></div></li></ul></li>`).join(''));
            for (const i of [1, 2]) document.querySelector(`#node${i} .posCatalog_name`).onclick = () => {
                window.__chapter = i; window.__transitions++;
                document.querySelector('.posCatalog_active').classList.remove('posCatalog_active'); document.querySelector(`#node${i}`).classList.add('posCatalog_active');
                const frame = document.createElement('iframe'); frame.setAttribute('info', 'card'); document.querySelector('iframe').replaceWith(frame); window.__addVideos([1, 3, 4][i]);
            };
        });
        for (let i = 0; i < 8; i++) {
            assert.equal(await state(page), 'PLAYING');
            await page.evaluate(() => { const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); });
            await flush(page);
        }
        assert.equal(await state(page), 'FINISHED');
        assert.equal(await page.evaluate(() => window.__transitions), 2);
    }));
    await check('synthetic stale completion after player replacement cannot navigate', () => using([outer(1, true)], async page => {
        await page.evaluate(() => { const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); v.remove(); window.__addVideos(1); });
        await flush(page); assert.equal(await state(page), 'BLOCKED');
    }));
    await check('synthetic unrelated iframe update cannot acknowledge chapter navigation', () => using([outer(2, true)], async page => {
        await page.evaluate(() => {
            document.querySelector('#node1 .posCatalog_name').onclick = () => {
                document.querySelector('#node0').classList.remove('posCatalog_active'); document.querySelector('#node1').classList.add('posCatalog_active');
                document.body.append(document.createElement('iframe'));
            };
            const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended'));
        });
        await flush(page); assert.equal(await state(page), 'ADVANCING');
        await flush(page, 12); assert.equal(await state(page), 'BLOCKED');
    }));
    await check('synthetic retained learning-objective tab rule accepts arbitrary numeric prefix', () => using([outer(1, false, '学习目标') + '<div class="prev_white">12视频</div>', 0], async page => {
        const clicked = await page.evaluate(() => {
            let clicked = 0; const tab = document.querySelector('.prev_white');
            tab.onclick = () => { clicked++; document.querySelector('.prev_title').title = '视频'; window.__addVideos(1); };
            app.run(); return clicked;
        });
        assert.equal(clicked, 1); await flush(page); assert.equal(await state(page), 'PLAYING');
    }));
    await check('synthetic private reference sanitization does not execute scripts or handlers', () => using([outer() + '<script>window.__unsafe = true</script><img src="https://invalid.example/image" onerror="window.__unsafe=true">'], async page => {
        assert.equal(await page.evaluate(() => window.__unsafe), undefined);
        assert.equal(await page.locator('img').getAttribute('onerror'), null);
    }));
    await check('synthetic content title changes during completion verification: stop', () => using([outer(1, true)], async page => {
        await page.evaluate(() => { const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); document.querySelector('.prev_title').title = 'Unknown content'; });
        await flush(page); assert.equal(await state(page), 'BLOCKED');
    }));
    await check('synthetic pending recovery rejection cannot restart playback after safe stop', () => using([], async page => {
        await page.evaluate(async () => {
            const v = app._videoEl; window.__lateFallbacks = 0;
            v.play = () => new Promise((_, reject) => { window.__rejectRecovery = reject; });
            window.dispatchEvent(new Event('blur'));
            app._block('Synthetic stop');
            v.play = () => { window.__lateFallbacks++; return Promise.resolve(); };
            window.__rejectRecovery(new Error('late recovery rejection'));
            await Promise.resolve(); await Promise.resolve();
        });
        assert.equal(await page.evaluate(() => window.__lateFallbacks), 0);
    }));
    for (const variant of ['normal-aux', 'unsupported-aux', 'inaccessible-aux']) {
        await check(`synthetic scoped discovery with 65 nodes / 7 frames: ${variant}`, () => using([scopeOuter, 1, true, variant], async page => {
            assert.equal(await state(page), 'PLAYING');
            assert.deepEqual(await page.evaluate(() => [
                document.querySelectorAll('#coursetree .posCatalog_select').length,
                document.querySelectorAll('body > iframe').length,
                app.cellData.nCells,
                app.cellData.currentNCellIndex,
                document.querySelector('.posCatalog_active').id,
                app._videoEl.ownerDocument.defaultView.frameElement.ownerDocument.defaultView.frameElement.id,
                app._videoEl.playbackRate,
                window.__auxReads,
            ]), [65, 7, 50, 37, 'leaf-37', 'iframe', 1, 0]);
            const before = await page.evaluate(() => app._videoEl.__plays);
            await page.evaluate(() => window.dispatchEvent(new Event('blur')));
            assert.equal(await page.evaluate(() => app._videoEl.__plays), before + 1);
        }));
    }
    for (const kind of ['audio', 'unknown', 'inaccessible']) {
        await check(`synthetic selected task ${kind} still blocks with auxiliary frames present`, () => using([scopeOuter, 1, true, 'normal-aux'], async page => {
            assert.equal(await state(page), 'PLAYING');
            await page.evaluate(kind => {
                const doc = document.querySelector('iframe[info="card"]').contentDocument;
                if (kind === 'audio') doc.body.append(doc.createElement('audio'));
                else {
                    const frame = doc.createElement('iframe'); doc.body.append(frame);
                    if (kind === 'unknown') frame.contentDocument.body.textContent = 'Synthetic unsupported task';
                    else Object.defineProperty(frame, 'contentDocument', { get() { throw new DOMException('denied', 'SecurityError'); } });
                }
                app.play();
            }, kind);
            assert.equal(await state(page), 'BLOCKED');
            assert.equal(await page.evaluate(() => app._isPlaying), false);
        }));
    }
    await check('synthetic inaccessible selected cards root blocks', () => using([scopeOuter, 1, true, 'normal-aux'], async page => {
        assert.equal(await state(page), 'PLAYING');
        await page.evaluate(() => { Object.defineProperty(document.querySelector('iframe[info="card"]'), 'contentDocument', { get() { throw new DOMException('denied', 'SecurityError'); } }); app.play(); });
        assert.equal(await state(page), 'BLOCKED');
    }));
    await check('synthetic ambiguous cards roots block instead of falling back to auxiliary frames', () => using([scopeOuter, 1, true, 'normal-aux'], async page => {
        await page.evaluate(() => { document.querySelector('#aux-editor').setAttribute('info', 'card'); app.play(); });
        assert.equal(await state(page), 'BLOCKED');
    }));
    await check('synthetic missing cards root blocks instead of scanning outer videos', () => using([scopeOuter, 1, true, 'normal-aux'], async page => {
        await page.evaluate(() => { document.querySelector('iframe[info="card"]').removeAttribute('info'); document.body.append(document.createElement('video')); app.play(); });
        assert.equal(await state(page), 'BLOCKED');
    }));
    await check('synthetic large-directory completion advances leaf 37 to leaf 38 only', () => using([scopeOuter, 1, true, 'inaccessible-aux'], async page => {
        assert.equal(await state(page), 'PLAYING');
        await page.evaluate(() => {
            window.__scopeClicks = 0;
            document.querySelector('#leaf-37 .jobUnfinishCount').value = '0';
            document.querySelector('#leaf-37').insertAdjacentHTML('beforeend', '<span class="icon_Completed"></span>');
            document.querySelector('#leaf-38 .posCatalog_name').onclick = () => {
                window.__scopeClicks++;
                document.querySelector('#leaf-37').classList.remove('posCatalog_active'); document.querySelector('#leaf-38').classList.add('posCatalog_active');
                const frame = document.createElement('iframe'); frame.id = 'iframe'; frame.setAttribute('info', 'card'); document.querySelector('iframe[info="card"]').replaceWith(frame); window.__addVideos(1, true);
            };
            const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); v.dispatchEvent(new Event('ended'));
        });
        await flush(page);
        assert.equal(await state(page), 'PLAYING');
        assert.deepEqual(await page.evaluate(() => [document.querySelector('.posCatalog_active').id, window.__scopeClicks, app.cellData.currentNCellIndex, window.__auxReads]), ['leaf-38', 1, 38, 0]);
    }));
    const cooldownOptions = [outer(2, true), 1, false, null, true];
    async function enterCooldown(page, random = 0.5) {
        await page.evaluate(random => {
            Math.random = () => { window.__randomDraws = (window.__randomDraws || 0) + 1; return random; };
            window.__navClicks = 0;
            document.querySelector('#node1 .posCatalog_name').onclick = () => window.__navClicks++;
            const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended'));
        }, random);
        await flush(page);
        assert.equal(await state(page), 'NAVIGATION_COOLDOWN');
    }
    for (const [random, expected] of [[0, 5000], [0.999999999, 12000], [327 / 7001, 5327], [4684 / 7001, 9684]]) {
        await check(`synthetic cooldown integer milliseconds ${expected}`, () => using(cooldownOptions, async page => {
            await enterCooldown(page, random);
            assert.deepEqual(await page.evaluate(() => [window.__cooldownDefaults, [...window.__timeoutDelays.values()], window.__randomDraws, window.__navClicks]), [[true, 5000, 12000], [expected], 1, 0]);
            assert.equal(await page.evaluate(() => window.__logs.filter(line => line.startsWith('导航冷却 ')).at(-1)), `导航冷却 ${(expected / 1000).toFixed(3)}s`);
            await flush(page);
            assert.equal(await page.evaluate(() => window.__navClicks), 1);
        }));
    }
    await check('synthetic independent random draw for every eligible navigation', () => using([outer(4, true), 1, false, null, true], async page => {
        await page.evaluate(() => {
            const values = [0, 1 / 7001, 0.5]; window.__draws = 0;
            Math.random = () => values[window.__draws++];
            for (const index of [1, 2, 3]) document.querySelector(`#node${index} .posCatalog_name`).onclick = () => {
                document.querySelector('.posCatalog_active').classList.remove('posCatalog_active'); document.querySelector(`#node${index}`).classList.add('posCatalog_active');
                const f = document.createElement('iframe'); f.setAttribute('info', 'card'); document.querySelector('iframe[info="card"]').replaceWith(f); window.__addVideos(1);
            };
        });
        const delays = [];
        for (let index = 0; index < 3; index++) {
            await page.evaluate(() => { const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); });
            await flush(page);
            delays.push(await page.evaluate(() => [...window.__timeoutDelays.values()][0]));
            await flush(page); assert.equal(await state(page), 'PLAYING');
        }
        assert.deepEqual(delays, [5000, 5001, 8500]);
        assert.equal(await page.evaluate(() => window.__draws), 3);
    }));
    await check('synthetic active playback and unconfirmed completion never draw a cooldown', () => using([outer(2), 1, false, null, true], async page => {
        await page.evaluate(() => { window.__draws = 0; Math.random = () => { window.__draws++; return 0.5; }; });
        assert.equal(await state(page), 'PLAYING');
        assert.equal(await page.evaluate(() => app._timers.size), 0);
        await page.evaluate(() => { const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); });
        await flush(page, 12); assert.equal(await state(page), 'BLOCKED');
        assert.equal(await page.evaluate(() => window.__draws), 0);
    }));
    await check('synthetic duplicate completion and nextUnit schedule only one cooldown', () => using(cooldownOptions, async page => {
        await enterCooldown(page);
        await page.evaluate(() => { const v = app._videoEl; v.dispatchEvent(new Event('ended')); app._checkVideoStatus(); app.nextUnit(); app.nextUnit(); });
        assert.deepEqual(await page.evaluate(() => [app._timers.size, window.__randomDraws, window.__navClicks]), [1, 1, 0]);
        await flush(page); assert.equal(await page.evaluate(() => window.__navClicks), 1);
    }));
    for (const cancel of ['destroy', 'block', 'click', 'chapter', 'title', 'pagehide', 'popstate', 'unsupported-task', 'player-replacement', 'target-removal', 'assessment', 'replay', 'content-reload', 'nested-click', 'completion-marker']) {
        await check(`synthetic cooldown cancellation and stale callback: ${cancel}`, () => using(cooldownOptions, async page => {
            await enterCooldown(page);
            await page.evaluate(async cancel => {
                window.__staleCooldown = [...window.__timeouts.values()][0];
                if (cancel === 'destroy') app.destroy();
                if (cancel === 'block') app._block('Synthetic stop');
                if (cancel === 'click') document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                if (cancel === 'chapter') { document.querySelector('#node0').classList.remove('posCatalog_active'); document.querySelector('#node1').classList.add('posCatalog_active'); }
                if (cancel === 'title') document.querySelector('.prev_title').title = 'Unknown resource';
                if (cancel === 'pagehide' || cancel === 'popstate') window.dispatchEvent(new Event(cancel));
                if (cancel === 'unsupported-task') document.querySelector('iframe').contentDocument.body.append(document.createElement('audio'));
                if (cancel === 'player-replacement') app._videoEl.remove();
                if (cancel === 'target-removal') document.querySelector('#node1').remove();
                if (cancel === 'assessment') document.querySelector('.prev_title').title = '章节测验';
                if (cancel === 'replay') app._videoEl.dispatchEvent(new Event('play'));
                if (cancel === 'content-reload') document.querySelector('iframe[info="card"]').dispatchEvent(new Event('load'));
                if (cancel === 'nested-click') app._videoEl.ownerDocument.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                if (cancel === 'completion-marker') document.querySelector('#node0 .icon_Completed').remove();
                await Promise.resolve(); await Promise.resolve();
                window.__staleCooldown();
            }, cancel);
            assert.equal(await state(page), 'BLOCKED');
            assert.deepEqual(await page.evaluate(() => [app._timers.size, window.__navClicks, app._cooldownCleanup]), [0, 0, null]);
        }));
    }
    await check('synthetic expiry revalidates completion even without a mutation event', () => using(cooldownOptions, async page => {
        await enterCooldown(page);
        await page.evaluate(() => { document.querySelector('.jobUnfinishCount')?.remove(); document.querySelector('#node0').insertAdjacentHTML('beforeend', '<input class="jobUnfinishCount" value="0">'); });
        // Let the observer see valid state, then change only the value property.
        await page.evaluate(() => { document.querySelector('#node0 .jobUnfinishCount').value = '1'; });
        await flush(page);
        assert.equal(await state(page), 'BLOCKED');
        assert.equal(await page.evaluate(() => window.__navClicks), 0);
    }));
    await check('synthetic expiry revalidates task ended state and generation', () => using(cooldownOptions, async page => {
        await enterCooldown(page);
        await page.evaluate(() => { app._completionVideo.__ended = false; });
        await flush(page); assert.equal(await state(page), 'BLOCKED');
        assert.equal(await page.evaluate(() => window.__navClicks), 0);
    }));
    await check('synthetic run invalidates stale cooldown generation', () => using(cooldownOptions, async page => {
        await enterCooldown(page);
        await page.evaluate(() => { const stale = [...window.__timeouts.values()][0]; app.run(); stale(); });
        assert.equal(await page.evaluate(() => window.__navClicks), 0);
        assert.notEqual(await state(page), 'ADVANCING');
    }));
    await check('synthetic disabled cooldown navigates without drawing randomness', () => using([outer(2, true)], async page => {
        await page.evaluate(() => { Math.random = () => { throw new Error('disabled cooldown drew randomness'); }; window.__clicks = 0; document.querySelector('#node1 .posCatalog_name').onclick = () => window.__clicks++; const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); });
        await flush(page); assert.equal(await page.evaluate(() => window.__clicks), 1);
    }));
    for (const [min, max] of [[7000, 5000], [1.5, 12000], [0, 2147483648]]) {
        await check(`synthetic invalid cooldown range ${min}/${max} safely blocks`, () => using(cooldownOptions, async page => {
            await page.evaluate(({ min, max }) => { app.configs.randomCooldownMinMs = min; app.configs.randomCooldownMaxMs = max; const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); }, { min, max });
            await flush(page); assert.equal(await state(page), 'BLOCKED');
        }));
    }
    await check('synthetic cooldown does not weaken fixed rate or background recovery', () => using(cooldownOptions, async page => {
        assert.deepEqual(await page.evaluate(() => { const v = app._videoEl; const before = v.__plays; app.configs.playbackRate = 2; window.dispatchEvent(new Event('blur')); return [v.__plays - before, v.playbackRate, app.configs.playbackRate, app._timers.size]; }), [1, 1, 1, 0]);
    }));
    await check('synthetic auxiliary-frame load does not cancel a valid cooldown', () => using([scopeOuter, 1, true, 'inaccessible-aux', true], async page => {
        await page.evaluate(() => { const n = document.querySelector('#leaf-37'); n.querySelector('input').value = '0'; n.insertAdjacentHTML('beforeend', '<span class="icon_Completed"></span>'); const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); });
        await flush(page); assert.equal(await state(page), 'NAVIGATION_COOLDOWN');
        await page.evaluate(() => document.querySelector('#aux-editor').dispatchEvent(new Event('load')));
        assert.equal(await state(page), 'NAVIGATION_COOLDOWN');
        assert.equal(await page.evaluate(() => window.__auxReads), 0);
    }));
    await check('synthetic successful cooldown callback cannot navigate twice', () => using(cooldownOptions, async page => {
        await enterCooldown(page);
        await page.evaluate(() => { const callback = [...window.__timeouts.values()][0]; callback(); callback(); });
        assert.equal(await page.evaluate(() => window.__navClicks), 1);
    }));
    await check('synthetic configurable fixed integer range is respected', () => using(cooldownOptions, async page => {
        await page.evaluate(() => { app.configs.randomCooldownMinMs = 7041; app.configs.randomCooldownMaxMs = 7041; });
        await enterCooldown(page);
        assert.deepEqual(await page.evaluate(() => [...window.__timeoutDelays.values()]), [7041]);
        assert.equal(await page.evaluate(() => window.__logs.filter(line => line.startsWith('导航冷却 ')).at(-1)), '导航冷却 7.041s');
    }));
    async function installDocuments(page, count = 1, mixed = false) {
        await page.evaluate(({ count, mixed }) => {
            const doc = document.querySelector('iframe[info="card"]').contentDocument;
            if (!mixed) doc.body.innerHTML = '';
            for (let i = 0; i < count; i++) {
                const el = doc.createElement('div'); el.className = 'synthetic-document';
                el.style.cssText = 'height:100px;overflow:auto;width:200px;scroll-behavior:auto';
                el.innerHTML = '<div style="height:700px">Synthetic document</div>'; doc.body.append(el);
            }
            app.taskAdapter = { discover() {
                if (document.querySelector('.posCatalog_active').id !== 'node0') return null;
                return { tasks: [...doc.querySelectorAll('.synthetic-document')].map(element => ({ kind: 'document', element })),
                    validateScope: () => doc === document.querySelector('iframe[info="card"]').contentDocument && !doc.querySelector('.synthetic-unknown') };
            } };
            window.__scrollPositions = []; window.__docDelays = [];
            let draw = 0; const values = [0.1, 0.5, 0.9]; Math.random = () => values[draw++ % values.length];
            app.run();
        }, { count, mixed });
    }
    await check('synthetic document scrolls incrementally from start to actual bottom without platform polling', () => using([outer(2), 0, false, null, true], async page => {
        await installDocuments(page);
        assert.equal(await state(page), 'READING_DOCUMENT');
        const positions = [], delays = [];
        for (let i = 0; i < 40 && await state(page) === 'READING_DOCUMENT'; i++) {
            delays.push(...await page.evaluate(() => [...window.__timeoutDelays.values()]));
            await flush(page);
            positions.push(await page.evaluate(() => document.querySelector('iframe').contentDocument.querySelector('.synthetic-document').scrollTop));
        }
        assert.equal(await state(page), 'NAVIGATION_COOLDOWN');
        assert.ok(positions.some(pos => pos > 0 && pos < 600));
        assert.equal(positions.at(-1), 600);
        assert.ok(new Set(delays.filter(delay => delay <= 1200)).size > 1);
        assert.ok(new Set(positions.slice(1).map((pos, i) => pos - positions[i]).filter(step => step > 0)).size > 1);
        assert.equal(await page.evaluate(() => document.querySelector('.jobUnfinishCount').value), '1');
    }));
    await check('synthetic multiple documents finish locally then await navigation cooldown', () => using([outer(2), 0, false, null, true], async page => {
        await installDocuments(page, 3);
        await flush(page, 60);
        assert.ok(['ADVANCING', 'BLOCKED'].includes(await state(page))); // No target click handler installed.
        assert.deepEqual(await page.evaluate(() => [...document.querySelector('iframe').contentDocument.querySelectorAll('.synthetic-document')].map(el => el.scrollTop)), [600, 600, 600]);
    }));
    await check('synthetic mixed document/video keeps video confirmation requirement', () => using([outer(2), 1, false, null, true], async page => {
        await page.evaluate(() => { app._isPlaying = false; });
        await installDocuments(page, 1, true);
        for (let i = 0; i < 30 && await state(page) === 'READING_DOCUMENT'; i++) await flush(page);
        assert.equal(await state(page), 'PLAYING');
        await page.evaluate(() => { const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); });
        await flush(page, 12);
        assert.equal(await state(page), 'BLOCKED');
        assert.equal(await page.evaluate(() => app._videoEl.playbackRate), 1);
    }));
    await check('synthetic document scope invalidation and destruction cancel scrolling', () => using([outer(), 0], async page => {
        await installDocuments(page);
        await page.evaluate(() => { document.querySelector('iframe').contentDocument.body.insertAdjacentHTML('beforeend', '<div class="synthetic-unknown">Unknown</div>'); });
        await flush(page); assert.equal(await state(page), 'BLOCKED');
        assert.equal(await page.evaluate(() => app._documentController), null);
    }));
    await check('synthetic unsupported document viewers stay stopped without an adapter', () => using([outer(), 0], async page => {
        await page.evaluate(() => { document.querySelector('iframe').contentDocument.body.textContent = 'Unknown viewer'; app.run(); });
        assert.equal(await state(page), 'BLOCKED');
    }));
    const assessmentPage = (assessment = '章节测验', priorComplete = true, includeNextChapter = true) =>
        `<div class="prev_title" title="${assessment}"></div><div id="coursetree"><ul><li><ul>${node(0, false, priorComplete)}<li><div id="assessment" class="posCatalog_select posCatalog_active"><span class="posCatalog_name" title="${assessment}">${assessment}</span><input class="jobUnfinishCount" value="1"></div></li></ul></li>${includeNextChapter ? `<li><ul>${node(1, false)}</ul></li>` : ''}</ul></div><iframe info="card"></iframe>`;
    for (const label of ['章节测验', '本章自测']) {
        await check(`synthetic optional chapter-end ${label} stays unfinished and targets next chapter`, () => using([assessmentPage(label), 0, false, null, true], async page => {
            assert.equal(await state(page), 'NAVIGATION_COOLDOWN');
            assert.equal(await page.evaluate(() => document.querySelector('#assessment input').value), '1');
            await page.evaluate(() => { window.__assessmentClicks = 0; document.querySelector('#node1 .posCatalog_name').onclick = () => window.__assessmentClicks++; });
            await flush(page);
            assert.equal(await page.evaluate(() => window.__assessmentClicks), 1);
            assert.equal(await page.evaluate(() => document.querySelector('#assessment input').value), '1');
        }));
    }
    for (const [label, prior, next] of [['身份验证', true, true], ['考试', true, true], ['章节测验', false, true], ['章节测验', true, false]]) {
        await check(`synthetic ambiguous/mandatory assessment stops: ${label}/${prior}/${next}`, () => using([assessmentPage(label, prior, next), 0], async page => {
            assert.equal(await state(page), 'BLOCKED');
        }));
    }
    async function startLive(page, { duration = 100, deniedClose = false } = {}) {
        const popupPromise = page.context().waitForEvent('page');
        await page.evaluate(() => {
            const doc = document.querySelector('iframe[info="card"]').contentDocument;
            doc.body.innerHTML = '<a id="synthetic-live" target="_blank" href="https://course.test/live">Synthetic lecture</a>';
            const entry = doc.querySelector('a');
            app.taskAdapter = { discover() {
                if (document.querySelector('.posCatalog_active').id !== 'node0') return null;
                return { tasks: [{ kind: 'live', element: entry }], validateScope: () => entry.isConnected && doc === document.querySelector('iframe[info="card"]').contentDocument };
            } };
            window.__openCalls = 0; window.__stateAtOpen = null; window.__liveTypes = [];
            window.addEventListener('message', event => { if (event.data?.protocol === 'xuexitong-live-v1') window.__liveTypes.push(event.data.type); });
            const open = window.open.bind(window);
            window.open = (...args) => { window.__openCalls++; window.__stateAtOpen = app._state; return open(...args); };
            Math.random = () => 0;
            document.querySelector('#node1 .posCatalog_name').onclick = () => {
                document.querySelector('#node0').classList.remove('posCatalog_active'); document.querySelector('#node1').classList.add('posCatalog_active');
                const f = document.createElement('iframe'); f.setAttribute('info', 'card'); document.querySelector('iframe[info="card"]').replaceWith(f); window.__addVideos(1);
            };
            app.run();
        });
        const child = await popupPromise;
        await child.waitForLoadState();
        await child.addScriptTag({ content: jquery });
        await child.evaluate(duration => {
            window.__clock = 100000; Date.now = () => window.__clock;
            window.__duration = duration === 'infinite' ? Infinity : duration;
            window.__position = 0; window.__ended = false; window.__plays = 0;
            const video = document.querySelector('video');
            Object.defineProperties(video, { duration: { get: () => window.__duration }, currentTime: { get: () => window.__position }, ended: { get: () => window.__ended }, paused: { get: () => false } });
            video.play = () => { window.__plays++; return Promise.resolve(); };
        }, duration);
        await child.addScriptTag({ content: source });
        await child.evaluate(() => {
            window.__child = window.__xuexitongTaskSupport.installChild({ isRecognized: () => !!document.querySelector('video'), getPlayer: () => document.querySelector('video'), sessionFinished: () => window.__sessionFinished === true });
        });
        if (deniedClose) await page.evaluate(() => { window.__closeAttempts = 0; app._liveController.child.close = () => { window.__closeAttempts++; }; });
        await page.evaluate(() => app._liveController.tick());
        await page.waitForFunction(() => window.__liveTypes.includes('LIVE_READY'));
        return child;
    }
    async function confirmParentMarker(page) {
        await page.evaluate(() => { document.querySelector('#node0 input').value = '0'; document.querySelector('#node0').insertAdjacentHTML('beforeend', '<span class="icon_Completed"></span>'); });
    }
    const liveOptions = [outer(2), 0, false, null, true, true];
    await check('synthetic real popup: parent waits first, duplicates cannot open another window', () => using(liveOptions, async page => {
        const child = await startLive(page);
        assert.deepEqual(await page.evaluate(() => [window.__stateAtOpen, app._state, window.__openCalls, app._isPlaying]), ['WAITING_LIVE', 'WAITING_LIVE', 1, false]);
        await page.evaluate(() => { app.play(); app.nextUnit(); window.dispatchEvent(new Event('blur')); document.dispatchEvent(new Event('visibilitychange')); });
        assert.equal(await state(page), 'WAITING_LIVE');
        assert.equal(await page.evaluate(() => window.__openCalls), 1);
        assert.equal(await child.evaluate(() => document.querySelector('video').playbackRate), 1);
    }));
    await check('synthetic two-hour true live stream remains waiting with unknown duration', () => using(liveOptions, async page => {
        const child = await startLive(page, { duration: 'infinite' });
        await page.evaluate(() => { window.__clock += 7200000; app._liveController.tick(); });
        await child.evaluate(() => { window.__clock += 7200000; window.__position = 7200; window.__child.check(); });
        assert.equal(await state(page), 'WAITING_LIVE');
        assert.equal(await page.evaluate(() => app._timers.size), 0);
        assert.equal(await child.evaluate(() => window.__child.disposed), false);
    }));
    for (const completion of ['ended', 'near-end']) {
        await check(`synthetic live ${completion}: associated child closes, marker then cooldown, normal video resumes`, () => using(liveOptions, async page => {
            const child = await startLive(page);
            await confirmParentMarker(page);
            const closed = child.waitForEvent('close');
            await child.evaluate(completion => { if (completion === 'ended') window.__ended = true; else window.__position = 99; window.__child.check(); }, completion);
            await closed;
            await page.evaluate(() => app._liveController.tick());
            assert.equal(await state(page), 'NAVIGATION_COOLDOWN');
            assert.deepEqual(await page.evaluate(() => [...window.__timeoutDelays.values()]), [5000]);
            await flush(page);
            assert.equal(await state(page), 'PLAYING');
            assert.equal(await page.evaluate(() => document.querySelector('.posCatalog_active').id), 'node1');
        }));
    }
    await check('synthetic local near-end never fabricates platform completion', () => using(liveOptions, async page => {
        const child = await startLive(page);
        const closed = child.waitForEvent('close');
        await child.evaluate(() => { window.__position = 99; window.__child.check(); }); await closed;
        await page.evaluate(() => app._liveController.tick());
        assert.equal(await state(page), 'VERIFYING_COMPLETION');
        assert.equal(await page.evaluate(() => document.querySelector('#node0 input').value), '1');
        await flush(page, 12); assert.equal(await state(page), 'BLOCKED');
        assert.equal(await page.evaluate(() => window.__logs.some(line => line.startsWith('导航冷却 '))), false);
    }));
    await check('synthetic unexpected child closure safely blocks without navigation', () => using(liveOptions, async page => {
        const child = await startLive(page); await child.close();
        await page.evaluate(() => app._liveController?.tick());
        assert.equal(await state(page), 'BLOCKED');
        assert.equal(await page.evaluate(() => window.__openCalls), 1);
    }));
    await check('synthetic denied child close is attempted once and requires manual handling', () => using(liveOptions, async page => {
        const child = await startLive(page, { deniedClose: true });
        await confirmParentMarker(page);
        await child.evaluate(() => { window.__ended = true; window.__child.check(); });
        await page.waitForFunction(() => window.__closeAttempts === 1);
        await page.evaluate(() => app._liveController.tick());
        assert.equal(await state(page), 'BLOCKED');
        assert.equal(await page.evaluate(() => window.__closeAttempts), 1);
        assert.equal(child.isClosed(), false);
    }));
    await check('synthetic parent closure disposes child coordination without navigation', () => using(liveOptions, async page => {
        const child = await startLive(page); await page.close();
        await child.evaluate(() => window.__child.check());
        assert.equal(await child.evaluate(() => window.__child.disposed), true);
    }));
    await check('synthetic strict message origin/source/generation and duplicate sequence validation', () => using(liveOptions, async page => {
        const child = await startLive(page);
        await page.evaluate(() => {
            const controller = app._liveController; const s = controller.session;
            const data = { protocol: 'xuexitong-live-v1', id: s.id, generation: s.generation, seq: 1000, timestamp: Date.now(), type: 'LIVE_COMPLETED', ended: true };
            window.dispatchEvent(new MessageEvent('message', { data, origin: 'https://untrusted.test', source: controller.child }));
            window.dispatchEvent(new MessageEvent('message', { data, origin: location.origin, source: window }));
            window.dispatchEvent(new MessageEvent('message', { data: { ...data, generation: s.generation - 1 }, origin: location.origin, source: controller.child }));
            window.dispatchEvent(new MessageEvent('message', { data: { ...data, seq: s.received }, origin: location.origin, source: controller.child }));
        });
        assert.equal(await state(page), 'WAITING_LIVE'); assert.equal(child.isClosed(), false);
    }));
    await check('synthetic blocked popup and cross-origin live entry never retry or advance', () => using(liveOptions, async page => {
        await page.evaluate(() => {
            const doc = document.querySelector('iframe').contentDocument; doc.body.innerHTML = '<a target="_blank" href="https://course.test/live">Synthetic live</a>';
            app.taskAdapter = { discover: () => ({ tasks: [{ kind: 'live', element: doc.querySelector('a') }], validateScope: () => true }) };
            window.__popupCalls = 0; window.open = () => { window.__popupCalls++; return null; }; app.run();
        });
        assert.equal(await state(page), 'BLOCKED'); assert.equal(await page.evaluate(() => window.__popupCalls), 1);
        await page.evaluate(() => { document.querySelector('iframe').contentDocument.querySelector('a').href = 'https://other.test/live'; app.run(); });
        assert.equal(await state(page), 'BLOCKED'); assert.equal(await page.evaluate(() => window.__popupCalls), 1);
    }));
    await check('synthetic document destruction cancels even an already queued tick', () => using([outer(), 0], async page => {
        await installDocuments(page);
        const positions = await page.evaluate(() => { const el = document.querySelector('iframe').contentDocument.querySelector('.synthetic-document'); const tick = app._documentController.tick; const before = el.scrollTop; app.destroy(); tick(); return [before, el.scrollTop, app._timers.size]; });
        assert.deepEqual(positions, [0, 0, 0]);
    }));
    await check('synthetic unverifiable document bottom safely stops', () => using([outer(), 0], async page => {
        await installDocuments(page);
        await page.evaluate(() => { document.querySelector('iframe').contentDocument.querySelector('.synthetic-document').style.display = 'none'; });
        await flush(page); assert.equal(await state(page), 'BLOCKED');
    }));
    await check('synthetic task invalidation disposes live parent; stale child result cannot advance', () => using(liveOptions, async page => {
        const child = await startLive(page);
        await page.evaluate(() => { document.querySelector('#node0').classList.remove('posCatalog_active'); document.querySelector('#node1').classList.add('posCatalog_active'); app._liveController.tick(); });
        assert.equal(await state(page), 'BLOCKED');
        await child.evaluate(() => { window.__ended = true; window.__child.check(); });
        assert.equal(await state(page), 'BLOCKED'); assert.equal(child.isClosed(), false);
    }));
    await check('synthetic lost/reloaded live communication blocks without reopening', () => using(liveOptions, async page => {
        const child = await startLive(page);
        await child.goto('https://course.test/reloaded');
        await page.evaluate(() => app._liveController.tick());
        assert.equal(await state(page), 'BLOCKED'); assert.equal(await page.evaluate(() => window.__openCalls), 1);
    }));
    await check('synthetic duplicate terminal child messages request closure only once', () => using(liveOptions, async page => {
        const child = await startLive(page, { deniedClose: true });
        await page.evaluate(() => {
            const c = app._liveController, s = c.session;
            const data = { protocol: 'xuexitong-live-v1', id: s.id, generation: s.generation, seq: s.received + 1, timestamp: Date.now(), type: 'LIVE_COMPLETED', ended: true };
            for (const seq of [data.seq, data.seq, data.seq + 1]) window.dispatchEvent(new MessageEvent('message', { data: { ...data, seq }, origin: location.origin, source: c.child }));
        });
        assert.equal(await page.evaluate(() => window.__closeAttempts), 1);
        await page.evaluate(() => app._liveController.tick()); assert.equal(await state(page), 'BLOCKED');
        assert.equal(child.isClosed(), false);
    }));
    await check('synthetic true live session-finished evidence hands off without invented duration', () => using(liveOptions, async page => {
        const child = await startLive(page, { duration: 'infinite' }); await confirmParentMarker(page);
        const closed = child.waitForEvent('close');
        await child.evaluate(() => { window.__sessionFinished = true; window.__child.check(); }); await closed;
        await page.evaluate(() => app._liveController.tick()); assert.equal(await state(page), 'NAVIGATION_COOLDOWN');
    }));
    await check('synthetic malformed or unrelated live completion cannot close the child', () => using(liveOptions, async page => {
        const child = await startLive(page);
        await page.evaluate(() => {
            const c = app._liveController, s = c.session;
            const base = { protocol: 'xuexitong-live-v1', id: s.id, generation: s.generation, seq: 100, timestamp: Date.now(), type: 'LIVE_NEAR_END', duration: Infinity, position: 99 };
            window.dispatchEvent(new MessageEvent('message', { data: base, origin: location.origin, source: c.child }));
            window.dispatchEvent(new MessageEvent('message', { data: { ...base, id: 'unrelated-session-id', seq: 101, duration: 100 }, origin: location.origin, source: c.child }));
        });
        assert.equal(await state(page), 'WAITING_LIVE'); assert.equal(child.isClosed(), false);
        const closed = child.waitForEvent('close');
        await child.evaluate(() => { window.__ended = true; window.__child.check(); }); await closed;
    }));
    for (const kind of ['video', 'document']) {
        await check(`synthetic finished ${kind} bypasses only trailing optional assessment into next chapter`, () => using([
            `<div class="prev_title" title="视频"></div><div id="coursetree"><ul><li><ul>${node(0, true, kind === 'video')}<li><div id="optional" class="posCatalog_select"><span class="posCatalog_name" title="章节测验">章节测验</span><input value="1"></div></li></ul></li><li><ul>${node(1)}</ul></li></ul></div><iframe info="card"></iframe>`,
            kind === 'video' ? 1 : 0, false, null, true,
        ], async page => {
            await page.evaluate(() => { window.__nextChapter = 0; document.querySelector('#node1 .posCatalog_name').onclick = () => window.__nextChapter++; });
            if (kind === 'document') {
                await installDocuments(page);
                for (let i = 0; i < 40 && await state(page) === 'READING_DOCUMENT'; i++) await flush(page);
            } else {
                await page.evaluate(() => { const v = app._videoEl; v.__ended = true; v.dispatchEvent(new Event('ended')); }); await flush(page);
            }
            assert.equal(await state(page), 'NAVIGATION_COOLDOWN');
            await flush(page); assert.equal(await page.evaluate(() => window.__nextChapter), 1);
            assert.equal(await page.evaluate(() => document.querySelector('#optional input').value), '1');
            if (kind === 'document') assert.equal(await page.evaluate(() => document.querySelector('#node0 input').value), '1');
        }));
    }
    await check('synthetic live closure never closes an unrelated tab', () => using(liveOptions, async page => {
        const child = await startLive(page); const unrelated = await page.context().newPage(); await unrelated.goto('https://course.test/unrelated');
        await confirmParentMarker(page); const closed = child.waitForEvent('close');
        await child.evaluate(() => { window.__ended = true; window.__child.check(); }); await closed;
        await page.evaluate(() => app._liveController.tick());
        assert.equal(await state(page), 'NAVIGATION_COOLDOWN'); assert.equal(unrelated.isClosed(), false);
    }));
    await check('synthetic same-document parent URL change invalidates live waiting', () => using(liveOptions, async page => {
        const child = await startLive(page);
        await page.evaluate(() => { history.pushState({}, '', '/elsewhere'); app._liveController.tick(); });
        assert.equal(await state(page), 'BLOCKED'); assert.equal(child.isClosed(), false);
    }));
    await check('synthetic optional-assessment-only chapter has insufficient learning evidence', () => using([
        '<div class="prev_title" title="章节测验"></div><div id="coursetree"><ul><li><ul><li><div class="posCatalog_select posCatalog_active"><span class="posCatalog_name" title="章节测验">章节测验</span></div></li></ul></li><li><ul>' + node(1) + '</ul></li></ul></div><iframe info="card"></iframe>', 0,
    ], async page => { assert.equal(await state(page), 'BLOCKED'); }));
    await check('synthetic verification inside an optional assessment prevents handoff', () => using([assessmentPage(), 0, false, null, true], async page => {
        await page.evaluate(() => { app._cancelTasks(); document.querySelector('iframe').contentDocument.body.innerHTML = '<input placeholder="请输入验证码">'; app.run(); });
        assert.equal(await state(page), 'BLOCKED');
        assert.equal(await page.evaluate(() => document.querySelector('#assessment input').value), '1');
    }));
    await check('synthetic noopener live link is unsupported without changing browser security policy', () => using(liveOptions, async page => {
        await page.evaluate(() => {
            const doc = document.querySelector('iframe').contentDocument; doc.body.innerHTML = '<a target="_blank" rel="noopener" href="https://course.test/live">Synthetic live</a>';
            app.taskAdapter = { discover: () => ({ tasks: [{ kind: 'live', element: doc.querySelector('a') }], validateScope: () => true }) };
            window.__popupCalls = 0; window.open = () => { window.__popupCalls++; return null; }; app.run();
        });
        assert.equal(await state(page), 'BLOCKED'); assert.equal(await page.evaluate(() => window.__popupCalls), 0);
    }));
    await check('synthetic live-like page without an evidence adapter never opens a window', () => using(liveOptions, async page => {
        await page.evaluate(() => { document.querySelector('iframe').contentDocument.body.innerHTML = '<a target="_blank" href="https://course.test/live">Synthetic lecture</a>'; window.open = () => { throw new Error('Unrecognized task opened a window'); }; app.run(); });
        assert.equal(await state(page), 'BLOCKED'); assert.equal(await page.evaluate(() => app.taskAdapter), null);
    }));
    await check('synthetic duplicate child installation keeps one player and one session listener', () => using(liveOptions, async page => {
        const child = await startLive(page);
        assert.deepEqual(await child.evaluate(() => {
            const first = window.__child;
            const second = window.__xuexitongTaskSupport.installChild({ isRecognized: () => true, getPlayer: () => document.querySelector('video') });
            return [first === second, window.__plays];
        }), [true, 1]);
        assert.equal(await state(page), 'WAITING_LIVE');
    }));
    console.log(`RESULT: ${passed} passed, ${failures.length} failed; local Chrome DOM tests, simulated media/timers, no live platform.`);
    if (failures.length) process.exitCode = 1;
} finally { await browser.close(); }
