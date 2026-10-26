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
async function setup(html = outer(), count = 1, nested = false, scopeCase = null) {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.route('**/*', route => route.abort());
    const page = await context.newPage();
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
        window.setTimeout = fn => { window.__timeouts.set(++id, fn); return id; };
        window.clearTimeout = id => window.__timeouts.delete(id);
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
    await page.evaluate(async () => { for (const fn of [...window.__intervals.values()]) fn(); await Promise.resolve(); });
    return { page, close: () => context.close() };
}
async function flush(page, rounds = 1) {
    await page.evaluate(async rounds => {
        for (let i = 0; i < rounds; i++) {
            const callbacks = [...window.__timeouts.values()]; window.__timeouts.clear();
            for (const fn of callbacks) fn();
            await Promise.resolve(); await Promise.resolve();
        }
    }, rounds);
}
async function check(label, fn) {
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
    console.log(`RESULT: ${passed} passed, ${failures.length} failed; local Chrome DOM tests, simulated media/timers, no live platform.`);
    if (failures.length) process.exitCode = 1;
} finally { await browser.close(); }
