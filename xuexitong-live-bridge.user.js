// ==UserScript==
// @name         学习通 V3 可选回放配对桥
// @namespace    local.codex.xuexitong.live-bridge
// @version      3.4.0
// @description  显式配对原生打开的回放；不自动打开或关闭无主窗口
// @match        https://mooc1.chaoxing.com/mycourse/studentstudy*
// @match        https://mooc1.chaoxing.com/mooc2-ans/mycourse/studentstudy*
// @match        https://zhibo.chaoxing.com/*
// @run-at       document-idle
// @noframes
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// ==/UserScript==

(() => {
    'use strict';
    const protocol = 'xuexitong-live-bridge-v1';
    const course = 'https://mooc1.chaoxing.com', replay = 'https://zhibo.chaoxing.com';
    if (window.top !== window || ![course, replay].includes(location.origin)) return;
    const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value);
    const key = (id, side) => `live-bridge.v1.${id}.${side}`;
    const digest = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
    const approved = href => { try { const url = new URL(href); return url.protocol === 'https:' && url.origin === replay && !url.username && !url.password; } catch (_) { return false; } };
    let session = null, listener = null, timer = null, host = null, output = null, button = null, input = null, disposeMedia = null;
    const panel = (label, action, withInput = false) => {
        host?.remove(); host = document.createElement('div');
        host.style.cssText = 'position:fixed;right:8px;top:50px;z-index:2147483646;max-width:290px';
        const shadow = host.attachShadow({ mode: 'closed' });
        const style = document.createElement('style'); style.textContent = ':host{font:12px sans-serif}section{background:#fff;color:#222;border:1px solid #888;padding:8px}button,input{font:inherit;max-width:260px}p{white-space:pre-wrap;overflow-wrap:anywhere}';
        const section = document.createElement('section'); output = document.createElement('p'); output.textContent = label;
        input = document.createElement('input'); input.placeholder = '粘贴课程页的临时配对码'; input.hidden = !withInput;
        button = document.createElement('button'); button.textContent = withInput ? '确认配对此回放' : '原生打开后，确认配对';
        button.addEventListener('click', event => { if (event.isTrusted) Promise.resolve(action()).catch(() => fail('无法验证配对，请手动处理')); });
        section.append(output, input, button); shadow.append(style, section); document.body.append(host);
    };
    const message = type => {
        if (!session) return;
        window.postMessage({ protocol, id: session.id, generation: session.generation, type,
            seq: ++session.out, timestamp: Date.now() }, course);
    };
    const fresh = meta => meta && uuid(meta.id) && uuid(meta.nonce) && Number.isSafeInteger(meta.generation) && meta.generation >= 0 &&
        Number.isFinite(meta.created) && Number.isFinite(meta.expires) && meta.created <= Date.now() + 30000 &&
        meta.expires === meta.created + 86400000 && Date.now() < meta.expires && /^[0-9a-f]{64}$/.test(meta.urlHash);
    const validPacket = (data, meta) => fresh(meta) && data && data.id === meta.id && data.nonce === meta.nonce &&
        data.generation === meta.generation && uuid(data.childId) && Number.isSafeInteger(data.seq) && data.seq > 0 &&
        Number.isFinite(data.timestamp) && data.timestamp >= meta.created && data.timestamp <= Date.now() + 30000 && data.timestamp < meta.expires;
    const dispose = () => {
        if (listener !== null) GM_removeValueChangeListener(listener); listener = null;
        clearInterval(timer); timer = null; disposeMedia?.(); disposeMedia = null;
        if (session && location.origin === course) {
            GM_deleteValue(key(session.id, 'meta')); GM_deleteValue(key(session.id, 'parent')); GM_deleteValue(key(session.id, 'child'));
        }
        session = null;
        if (button) button.disabled = true;
    };
    const fail = text => {
        if (session) {
            if (location.origin === course) message('ERROR');
            else if (session.meta) writeChild('ERROR');
        }
        if (output) output.textContent = text;
        dispose();
    };
    function courseContext() {
        const nodes = document.querySelectorAll('#coursetree .posCatalog_select.posCatalog_active');
        const frames = document.querySelectorAll('iframe[info="card"], iframe[src*="/knowledge/cards"]');
        if (nodes.length !== 1 || !nodes[0].id || frames.length !== 1 || frames[0].id !== 'iframe' ||
            Array.from(document.querySelectorAll('[id]')).filter(el => el.id === nodes[0].id).length !== 1) return null;
        let doc; try { doc = frames[0].contentDocument; } catch (_) { return null; }
        const entries = doc?.querySelectorAll('a.liveHref');
        if (entries?.length !== 1 || !entries[0].querySelector(':scope > div.liveCard > div.live-ct')) return null;
        return { node: nodes[0], frame: frames[0], doc, entry: entries[0], href: location.href };
    }
    const sameContext = context => {
        const now = courseContext();
        return now && context && ['node', 'frame', 'doc', 'entry', 'href'].every(field => now[field] === context[field]);
    };
    function flag(name) {
        const values = Array.from(document.scripts).flatMap(script => Array.from(script.textContent.matchAll(
            new RegExp('(?:^|[;\\s])(?:var\\s+|let\\s+|const\\s+)?' + name + '\\s*=\\s*(\\d+)\\s*(?=[;,\\r\\n]|$)', 'g')), match => Number(match[1])));
        return values.length && values.every(value => value === values[0]) ? values[0] : null;
    }
    function replayPlayer() {
        const players = document.querySelectorAll('div#video.video-js video#video_html5_api.vjs-tech');
        return location.origin === replay && flag('liveStatus') === 4 && flag('lookback') === 1 && players.length === 1 ? players[0] : null;
    }
    function writeChild(type) {
        if (!session?.meta) return;
        GM_setValue(key(session.id, 'child'), { id: session.id, nonce: session.meta.nonce, generation: session.generation,
            childId: session.childId, seq: ++session.out, timestamp: Date.now(), type });
    }
    function writeParent(type) {
        GM_setValue(key(session.id, 'parent'), { id: session.id, nonce: session.meta.nonce, generation: session.generation,
            childId: session.childId, seq: ++session.parentOut, timestamp: Date.now(), type, background: session.background });
    }
    if (location.origin === course) {
        window.addEventListener('message', event => {
            const data = event.data;
            if (event.source !== window || event.origin !== course || data?.protocol !== protocol) return;
            if (data.type === 'PING') { window.postMessage({ protocol, type: 'AVAILABLE' }, course); return; }
            if (!['PREPARE', 'CANCEL', 'CONFIRM'].includes(data.type)) return;
            if (!uuid(data.id) || !Number.isSafeInteger(data.generation) || data.generation < 0 || !Number.isSafeInteger(data.seq) || data.seq <= 0 ||
                !Number.isFinite(data.timestamp) || data.timestamp > Date.now() + 30000 || data.timestamp < Date.now() - 30000) return;
            if (data.type === 'PREPARE') {
                if (session) return; // Never create a second pending session or tab.
                const context = courseContext(); if (!context) return;
                session = { id: data.id, generation: data.generation, received: data.seq, out: 0, parentOut: 0, childSeq: 0,
                    context, activated: false, background: data.background !== false };
                const activated = click => { if (click.isTrusted && click.target.closest?.('a.liveHref') === context.entry && sameContext(context)) session && (session.activated = true); };
                context.doc.addEventListener('click', activated, true);
                disposeMedia = () => context.doc.removeEventListener('click', activated, true);
                panel('请先手动点击原生直播卡片。打开回放后再确认配对；不会另开或关闭窗口。', async () => {
                    const current = session;
                    if (current?.left && current.ended && current.confirmed && sameContext(context)) {
                        const count = context.node.querySelector('.jobUnfinishCount');
                        if (!context.node.querySelector('.icon_Completed') || (count && !/^0$/.test(count.value.trim()))) return fail('平台完成标记已变化');
                        message('CLOSED'); dispose(); return;
                    }
                    if (!current || current.meta || !current.activated || !sameContext(context)) return fail('缺少本次原生打开证据，保持手动处理');
                    const links = context.doc.querySelectorAll('a#openUrl');
                    if (links.length !== 1 || !approved(links[0].href) || links[0].target !== '_blank') return fail('当前平台回放地址不可验证');
                    const created = Date.now(), href = links[0].href;
                    const meta = { id: current.id, generation: current.generation, nonce: crypto.randomUUID(), created,
                        expires: created + 86400000, urlHash: await digest(current.id + '\n' + href) };
                    if (session !== current || !sameContext(context) || context.doc.querySelector('a#openUrl') !== links[0] || links[0].href !== href) return;
                    current.meta = meta; GM_setValue(key(current.id, 'meta'), meta);
                    output.textContent = `在刚才的回放页输入配对码：\n${current.id}\n仅配对该地址；请勿关闭课程页。`;
                    button.disabled = true;
                    listener = GM_addValueChangeListener(key(current.id, 'child'), (_key, _old, packet, remote) => {
                        if (!remote || session !== current || !sameContext(context) || !validPacket(packet, meta) || packet.seq <= current.childSeq) return;
                        if (!current.childId) {
                            if (packet.type !== 'READY') return;
                            current.childId = packet.childId; writeParent('ACCEPT'); message('PAIRED');
                        }
                        if (packet.childId !== current.childId) return;
                        current.childSeq = packet.seq;
                        if (packet.type === 'ENDED' && !current.ended) { current.ended = true; message('ENDED'); output.textContent = '回放自然结束，等待课程平台完成标记。'; }
                        if (packet.type === 'LEFT') {
                            if (!current.ended || !current.confirmed) return fail('回放在确认完成前被关闭');
                            current.left = true; output.textContent = '回放页已离开（这不能证明已关闭）。请确认您已关闭对应回放页，再点击继续。';
                            button.textContent = '我已关闭对应回放页，继续'; button.disabled = false;
                        }
                        if (packet.type === 'ERROR') fail('回放中断，保持手动处理');
                    });
                });
                timer = setInterval(() => {
                    if (session && (!sameContext(context) || (session.meta && !fresh(session.meta)))) fail('原课程或配对会话已失效');
                }, 2000);
                return;
            }
            if (!session || data.id !== session.id || data.generation !== session.generation || data.seq <= session.received) return;
            session.received = data.seq;
            if (data.type === 'CANCEL') return dispose();
            if (data.type === 'CONFIRM' && session.ended && sameContext(session.context)) {
                // Independently re-read the real marker, not just a core message.
                const node = session.context.node, count = node.querySelector('.jobUnfinishCount');
                if (!node.querySelector('.icon_Completed') || (count && !/^0$/.test(count.value.trim()))) return;
                session.confirmed = true; writeParent('CONFIRMED'); output.textContent = '平台完成已确认，请手动关闭对应回放页。桥接不会关闭无主窗口。';
            }
        });
    } else {
        panel('此回放没有 opener。请先在课程页确认原生打开，再粘贴临时配对码。', async () => {
            if (session) return;
            const id = input.value.trim(), player = replayPlayer();
            if (!uuid(id) || !player) return fail('配对码或回放播放器不受支持');
            const meta = GM_getValue(key(id, 'meta'), null), href = location.href;
            if (!fresh(meta) || meta.id !== id || meta.urlHash !== await digest(id + '\n' + href) || href !== location.href || player !== replayPlayer()) return fail('地址、会话或回放状态不能匹配');
            const current = session = { id, generation: meta.generation, meta, childId: crypto.randomUUID(), out: 0, received: 0,
                player, href, accepted: false, ended: false, confirmed: false };
            const source = () => player.currentSrc || player.getAttribute('src') || '';
            current.source = source();
            const valid = () => {
                const stored = GM_getValue(key(id, 'meta'), null);
                return session === current && fresh(stored) && stored.nonce === meta.nonce && stored.generation === meta.generation &&
                    stored.urlHash === meta.urlHash && href === location.href && player === replayPlayer() &&
                    player.isConnected && !player.error && (!current.source || source() === current.source);
            };
            let lastPosition = player.currentTime, progressAt = Date.now(), recoveryAt = -Infinity, playPending = false;
            const recover = () => {
                if (!valid()) return fail('回放页面或播放器已改变');
                if (!current.source && source()) current.source = source();
                if (!current.accepted || current.ended) return;
                if (player.playbackRate !== 1) player.playbackRate = 1;
                if (player.currentTime !== lastPosition) { lastPosition = player.currentTime; progressAt = Date.now(); }
                if (current.background && !player.ended && (player.paused || Date.now() - progressAt >= 7000) && !playPending && Date.now() - recoveryAt >= 1500) {
                    recoveryAt = Date.now(); playPending = true;
                    Promise.resolve(player.play()).catch(() => fail('播放恢复被浏览器拒绝')).finally(() => { playPending = false; });
                }
            };
            const ended = event => {
                if (!event.isTrusted || !valid() || !current.accepted || !player.ended || current.ended) return;
                current.ended = true; writeChild('ENDED'); output.textContent = '回放自然结束；等待课程页确认平台完成。请暂勿关闭。';
            };
            const rate = () => { if (session === current && player.playbackRate !== 1) player.playbackRate = 1; };
            player.addEventListener('ended', ended); player.addEventListener('ratechange', rate);
            player.addEventListener('pause', recover); window.addEventListener('blur', recover); document.addEventListener('visibilitychange', recover);
            disposeMedia = () => { player.removeEventListener('ended', ended); player.removeEventListener('ratechange', rate); player.removeEventListener('pause', recover);
                window.removeEventListener('blur', recover); document.removeEventListener('visibilitychange', recover); };
            listener = GM_addValueChangeListener(key(id, 'parent'), (_key, _old, packet, remote) => {
                if (!remote || !validPacket(packet, meta) || packet.childId !== current.childId || packet.seq <= current.received || !valid()) return;
                current.received = packet.seq;
                if (packet.type === 'ACCEPT') {
                    current.accepted = true; current.background = packet.background === true; rate();
                    Promise.resolve(player.play()).catch(() => fail('播放启动被浏览器拒绝'));
                    output.textContent = '配对成功，保持 1.0x；课程页等待此回放自然结束。';
                }
                if (packet.type === 'CONFIRMED' && current.ended) { current.confirmed = true; output.textContent = '平台完成已确认。请手动关闭本回放页，原课程将复核后继续。'; }
            });
            timer = setInterval(recover, 2000); writeChild('READY'); button.disabled = true;
        }, true);
    }
    window.addEventListener('pagehide', () => {
        if (session && location.origin === replay) writeChild(session.ended && session.confirmed ? 'LEFT' : 'ERROR');
        else if (session) message('ERROR');
        dispose(); host?.remove();
    });
})();
