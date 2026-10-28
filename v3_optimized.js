(function () {
    const APP_KEY = '__xuexitongPlayerV3';
    const BOOT_TIMER_KEY = '__xuexitongPlayerV3BootTimer';
    window.__xuexitongTaskSupport?.dispose?.();
    window.__xuexitongTaskSupport = createTaskSupport(window);

    const previousApp = window[APP_KEY];
    if (previousApp && typeof previousApp.destroy === 'function') {
        previousApp.destroy();
    }
    if (window[BOOT_TIMER_KEY]) {
        clearInterval(window[BOOT_TIMER_KEY]);
        window[BOOT_TIMER_KEY] = null;
    }

    function bootCourse() {
        if (typeof window.jQuery === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
            script.type = 'text/javascript';
            script.onload = function () {
                console.log("jQuery loaded.");
                waitForCoursePage();
            };
            document.head.appendChild(script);
        } else {
            waitForCoursePage();
        }
    }
    function waitForCoursePage() {
        if (window[BOOT_TIMER_KEY] || (window[APP_KEY] && !window[APP_KEY]._destroyed)) return;
        let attempts = 0;
        const maxAttempts = 20;
        window[BOOT_TIMER_KEY] = setInterval(() => {
            if (window[APP_KEY] && !window[APP_KEY]._destroyed) { clearInterval(window[BOOT_TIMER_KEY]); window[BOOT_TIMER_KEY] = null; return; }
            if ($('#coursetree').length > 0) {
                clearInterval(window[BOOT_TIMER_KEY]);
                window[BOOT_TIMER_KEY] = null;
                initializePlayer();
                return;
            }
            attempts++;
            if (attempts >= maxAttempts) {
                clearInterval(window[BOOT_TIMER_KEY]);
                window[BOOT_TIMER_KEY] = null;
                console.error('%c脚本启动超时：未检测到课程目录（#coursetree）。请确认当前处于课程播放页。', 'color:#F44336;font-weight:bold');
            }
        }, 1000);
    }

    // Rules are limited to the supplied outer structures and the existing V3 player.
    const assessmentTitle = text => /测验|测试|自测|作业|考试|验证/.test(text);
    const optionalAssessment = text => ['章节测验', '章节测试', '本章自测'].includes(text.trim());
    const verificationTitle = text => /验证码|验证|认证|登录|人脸|captcha|authentication/i.test(text);
    const videoTitle = text => /^(?:\d+\s*)?视频$/.test(text.trim());
    const catalog = {
        entries() {
            return Array.from(document.querySelectorAll('#coursetree .posCatalog_select'))
                .filter(node => !node.classList.contains('firstLayer') &&
                    node.querySelector('.posCatalog_name') &&
                    !Array.from(node.closest('li')?.querySelectorAll('.posCatalog_select') || [])
                        .some(child => child !== node && !child.classList.contains('firstLayer')));
        },
        current() {
            const active = this.entries().filter(node => node.classList.contains('posCatalog_active'));
            return active.length === 1 ? active[0] : null;
        },
        status(node) {
            if (!node) return 'unknown';
            const own = selector => [...node.querySelectorAll(selector)].filter(el =>
                el.closest('.posCatalog_select') === node && !el.closest('.ans-attach-online'));
            const counts = own('.jobUnfinishCount');
            const values = counts.map(el => String(el.value ?? el.textContent).trim());
            if (values.some(value => !/^\d+$/.test(value))) return 'unknown';
            if (values.some(value => Number(value) > 0)) return 'incomplete';
            return own('.icon_Completed').length ? 'completed' : 'unknown';
        },
    };
    const videoAdapter = {
        cardFrame() {
            const frames = document.querySelectorAll('iframe[info="card"], iframe[src*="/knowledge/cards"]');
            return frames.length === 1 ? frames[0] : null;
        },
        cardDocument() {
            try { return this.cardFrame()?.contentDocument || null; } catch (_) { return null; }
        },
        discover(knownDocuments = new Set(), selection = null) {
            const result = { videos: [], audios: [], rawAudios: [], documents: [], reasons: [],
                unsupported: false, inaccessible: false, pending: false, navigationSafe: true, diagnosticTriggers: [] };
            const block = (reason, element = null, phase = '') => {
                result.unsupported = true; if (!result.reasons.includes(reason)) result.reasons.push(reason);
                if (element) result.diagnosticTriggers.push({ reason, phase, documentIndex: result.documents.indexOf(element.ownerDocument),
                    tag: element.tagName, knownClasses: ['ans-attach-online','ans-insertvideo-online','ans-insertaudio','insertdoc-online-pdf','liveHref'].filter(name => element.classList.contains(name)) });
            };
            const uncertain = reason => { result.navigationSafe = false; if (!result.reasons.includes(reason)) result.reasons.push(reason); };
            const frame = this.cardFrame(), root = this.cardDocument(), node = catalog.current();
            if (!frame) { block('nonunique-course-frame'); return result; }
            if (!root) { result.inaccessible = true; return result; }
            const uniqueLesson = node?.id && Array.from(document.querySelectorAll('[id]')).filter(el => el.id === node.id).length === 1;
            const frames = Array.from(root.querySelectorAll('iframe'));
            const kindOf = owner => {
                const kinds = [['video','ans-insertvideo-online'],['audio','ans-insertaudio'],['document','insertdoc-online-pdf']]
                    .filter(([, name]) => owner.classList.contains(name));
                return kinds.length === 1 && owner.classList.contains('ans-attach-online') ? kinds[0][0] : null;
            };
            const attachments = frames.filter(owner => owner.classList.contains('ans-attach-online'));
            const multi = attachments.length > 1 || !!selection;
            const seen = new Set(), paths = new Map(), branches = new Map(), candidates = [], allMedia = [];
            const active = media => (!media.paused && !media.ended) || media.seeking || (media.autoplay && !media.ended);
            const visible = element => element.getClientRects().length > 0 && !element.hidden && !element.inert && element.getAttribute('aria-hidden') !== 'true';
            const visit = (doc, path, branch = null) => {
                if (!doc || seen.has(doc)) { block('duplicate-task-document'); return; }
                seen.add(doc); result.documents.push(doc); paths.set(doc, path); branches.set(doc, branch);
                const media = Array.from(doc.querySelectorAll('video, audio')); allMedia.push(...media);
                for (const el of media) {
                    if ((el.tagName === 'VIDEO' && el.id.includes('video_html5')) || (el.tagName === 'AUDIO' && el.id === 'audio_html5_api')) candidates.push(el);
                }
                // Ordinary forms/inputs/labels are UI, not evidence of an independent
                // learning task. Explicit attachment/live boundaries still require an adapter.
                if (!knownDocuments.has(doc)) for (const boundary of doc.querySelectorAll('.ans-attach-online, a.liveHref')) {
                    const contained = frames.filter(owner => boundary !== owner && boundary.contains(owner));
                    const container = doc === root && boundary.tagName !== 'IFRAME' && !boundary.matches('a.liveHref') &&
                        contained.length > 0 && contained.every(owner => kindOf(owner));
                    const branchKind = branch && kindOf(branch), boundaryKind = kindOf(boundary);
                    const ownedRepresentation = doc !== root && boundaryKind && boundaryKind === branchKind &&
                        (branchKind === 'document' || media.some(el => boundary.contains(el) && candidates.includes(el)));
                    if (!(boundary.tagName === 'IFRAME' && doc === root && boundaryKind) && !container && !ownedRepresentation) block('unknown-independent-task', boundary, 'task-boundary');
                }
                for (const form of doc.querySelectorAll('form')) {
                    const labels = [form.textContent, ...Array.from(form.querySelectorAll('[title], [aria-label], [placeholder]')).map(el =>
                        ['title','aria-label','placeholder'].map(attr => el.getAttribute(attr) || '').join(' '))].join(' ');
                    const assessment = optionalAssessment(form.textContent.trim()) || (form.querySelector('[name^="answer"]') && assessmentTitle(labels));
                    const verification = /验证码|人脸|captcha|authentication/i.test(labels) || form.querySelector('input[type="password"], input[autocomplete="one-time-code"]');
                    if (verification || assessment) block('assessment-or-verification-required');
                }
                for (const child of doc.querySelectorAll('iframe')) {
                    if (path.length >= 4) { uncertain('task-depth-limit'); if (multi || child.classList.contains('ans-attach-online')) block('task-depth-limit'); continue; }
                    let inner; try { inner = child.contentDocument; } catch (_) { /* Unknown widgets cannot authorize navigation. */ }
                    if (!inner) {
                        uncertain('unreadable-task-content');
                        if (multi || child.classList.contains('ans-attach-online')) result.inaccessible = true;
                        continue;
                    }
                    visit(inner, [...path, child], branch || child);
                }
            };
            visit(root, [frame]);
            result.videos = candidates.filter(el => el.tagName === 'VIDEO');
            result.audios = candidates.filter(el => el.tagName === 'AUDIO');
            result.rawAudios = allMedia.filter(el => el.tagName === 'AUDIO');
            let selected = candidates;
            if (selection) {
                try {
                    const partition = [selection.activeFrame, ...selection.inactiveFrames];
                    const inactive = selection.inactiveFrames;
                    const omitted = candidates.filter(el => branches.get(el.ownerDocument) !== selection.activeFrame);
                    if (!selection.validateScope?.() || partition.length !== frames.length || new Set(partition).size !== frames.length ||
                        !partition.every(owner => frames.includes(owner) && owner.isConnected) || !visible(selection.activeFrame) ||
                        !inactive.every(owner => owner.hidden && owner.inert && owner.getAttribute('aria-hidden') === 'true') ||
                        omitted.some(el => active(el) || el.currentTime !== 0 || el.error)) block('unverified-media-ownership');
                    selected = candidates.filter(el => branches.get(el.ownerDocument) === selection.activeFrame);
                    if (!selected.length) block('missing-owned-player');
                } catch (_) { block('unverified-media-ownership'); }
            }
            const auxiliary = allMedia.filter(el => !candidates.includes(el));
            for (const el of auxiliary) {
                // Known preview/secondary elements are nonblocking while inactive,
                // regardless of their source, error, CSS class, parent or controls.
                if (active(el)) block('competing-media-playback');
                else if (!['auditionAudio','audio1_html5_white'].includes(el.id)) {
                    const wrapper = el.closest('.video-js');
                    if ((visible(el) && (el.tagName === 'VIDEO' || el.controls)) ||
                        (wrapper && visible(wrapper) && !selected.some(player => wrapper.contains(player)))) block('unknown-independent-media');
                }
            }
            for (const el of selected) {
                if (!el.isConnected) block('disconnected-player');
                if (selected.some(other => other !== el && other.ownerDocument === el.ownerDocument && other.id === el.id)) block('ambiguous-player-id');
                if (el.error) block(el.tagName === 'AUDIO' ? 'audio-player-error' : 'video-player-error');
                const path = paths.get(el.ownerDocument);
                if (!path?.every(visible)) block('inactive-player-branch');
            }
            if (selected.filter(el => !el.paused && !el.ended).length > 1) block('competing-primary-playback');
            if (selected.length > 1 && selected.some(el => el.autoplay && !el.ended)) block('competing-primary-autoplay');
            if (attachments.length) {
                if (!uniqueLesson) block('unverified-attachment-lesson');
                result.tasks = [];
                for (const owner of attachments) {
                    const kind = kindOf(owner), owned = selected.filter(el => branches.get(el.ownerDocument) === owner);
                    if (!kind || !visible(owner)) { block('unknown-attachment'); continue; }
                    if (kind === 'document' && owned.length) block('media-in-document-attachment');
                    if (kind !== 'document' && (owned.length > 1 || owned.some(el => el.tagName !== (kind === 'video' ? 'VIDEO' : 'AUDIO')))) block('ambiguous-attachment-player');
                    if (kind !== 'document' && !owned.length) result.pending = true;
                    const el = kind === 'document' ? null : owned[0] || null;
                    const lineage = el ? paths.get(el.ownerDocument) : [frame, owner];
                    const documents = lineage.map(item => { try { return item.contentDocument; } catch (_) { return null; } }).filter(Boolean);
                    result.tasks.push({ kind, attachment: owner, element: el, media: el, lineage, documents,
                        document: el?.ownerDocument || documents.at(-1), lesson: { id: node?.id, node, root, frame }, position: result.tasks.length, status: 'pending' });
                }
                if (selected.some(el => !attachments.includes(branches.get(el.ownerDocument)))) block('ambiguous-player-ownership');
                if (result.tasks.some(task => task.kind === 'audio') && result.tasks.some(task => task.kind !== 'audio')) block('unsupported-mixed-attachments');
            } else if (!selection && selected.length > 1) {
                // Preserve the existing ordered, single-document video list. Multiple
                // branches/types need an explicit attachment inventory or selection.
                if (new Set(selected.map(el => el.ownerDocument)).size > 1 || selected.some(el => el.tagName === 'AUDIO')) block('ambiguous-player-branches');
            }
            if (multi) {
                // Stricter inventory validation for multi-attachment/explicit selection:
                // a populated unclassified leaf is not silently omitted from the queue.
                for (const doc of result.documents) if (!knownDocuments.has(doc) && doc !== root && !doc.querySelector('video, audio, iframe') &&
                    !result.tasks?.some(task => task.kind === 'document' && task.documents.includes(doc))) {
                    if (attachments.includes(branches.get(doc)) && kindOf(branches.get(doc))) continue; // UI/viewer descendants already belong to a known task.
                    const body = doc.body?.cloneNode(true); body?.querySelectorAll('script, style').forEach(el => el.remove());
                    if (body?.textContent.trim() || body?.querySelector('object, embed, canvas, form, input, img')) {
                        if (attachments.length) uncertain('unassigned-task-content');
                        else block('unknown-independent-task', doc.body, 'unassigned-leaf');
                    }
                }
            }
            if (!candidates.length && !result.tasks?.length && !knownDocuments.size) {
                result.pending = true; // Empty/initializing cards remain bounded by startup/play retries.
            }
            if (result.inaccessible) result.reasons.push('inaccessible-task-frame');
            if (result.pending) result.reasons.push('player-not-ready');
            // UI unreadability may permit playback, but never authorizes leaving a lesson.
            if (result.inaccessible || result.unsupported || result.pending) result.navigationSafe = false;
            if (selection) {
                result.videos = selected.filter(el => el.tagName === 'VIDEO');
                result.audios = selected.filter(el => el.tagName === 'AUDIO');
            }
            return result;
        },
    };

    const SETTINGS_KEY = 'xuexitong.v3.action-settings.v1';
    const FEATURES = { videoPlayback: '自动播放视频', nextVideo: '自动下一视频', audioPlayback: '自动播放音频', nextAudio: '自动下一音频', nextLesson: '自动下一课节',
        nextChapter: '自动下一章节', assessment: '暂缓章节测验并继续学习', document: '文档阅读', live: '直播窗口协调', background: '后台播放保护' };
    const ACTIONS = {
        videoStart: ['视频开始', 300, 900, 'videoPlayback'], nextVideo: ['课内下一视频', 500, 1500, 'nextVideo'],
        audioStart: ['音频开始', 300, 900, 'audioPlayback'], nextAudio: ['课内下一音频', 500, 1500, 'nextAudio'],
        documentScroll: ['文档逐步滚动', 400, 1200, 'document'], nextDocument: ['下一文档', 500, 1500, 'document'],
        nextLesson: ['下一课节', 1000, 2500, 'nextLesson'], nextChapter: ['下一章节', 1500, 3500, 'nextChapter'],
        assessment: ['测验交接', 1000, 2500, 'assessment'], liveOpen: ['打开直播窗口', 500, 1500, 'live'],
        liveReturn: ['直播关闭与返回', 500, 1500, 'live'],
    };
    const navigationActions = new Set(['nextLesson', 'nextChapter', 'assessment', 'liveReturn']);
    function defaultSettings(preset = 'short') {
        return { version: 1, preset, collapsed: true, randomDelaysEnabled: true,
            features: Object.fromEntries(Object.keys(FEATURES).map(key => [key, !['document', 'live'].includes(key)])),
            delays: Object.fromEntries(Object.entries(ACTIONS).map(([key, [, minMs, maxMs]]) =>
                [key, { enabled: true, minMs: preset === 'legacy' ? 5000 : minMs, maxMs: preset === 'legacy' ? 12000 : maxMs }])) };
    }
    function validateSettings(input) {
        const result = defaultSettings();
        if (!input || input.version !== 1) throw new Error('设置版本无效');
        if (!['short', 'legacy', 'custom'].includes(input.preset)) throw new Error('预设无效');
        result.preset = input.preset;
        for (const field of ['collapsed', 'randomDelaysEnabled']) {
            if (typeof input[field] !== 'boolean') throw new Error('开关值无效');
            result[field] = input[field];
        }
        for (const key of Object.keys(FEATURES)) {
            if (['audioPlayback', 'nextAudio'].includes(key) && input.features && !Object.hasOwn(input.features, key)) continue;
            if (typeof input.features?.[key] !== 'boolean') throw new Error('功能开关无效');
            result.features[key] = input.features[key];
        }
        for (const key of Object.keys(ACTIONS)) {
            if (['audioStart', 'nextAudio'].includes(key) && input.delays && !Object.hasOwn(input.delays, key)) {
                result.delays[key] = defaultSettings(input.preset).delays[key]; continue;
            }
            const rule = input.delays?.[key];
            if (!rule || typeof rule.enabled !== 'boolean' || !Number.isSafeInteger(rule.minMs) ||
                !Number.isSafeInteger(rule.maxMs) || rule.minMs < 0 || rule.maxMs < rule.minMs || rule.maxMs > 2147483647) {
                throw new Error('延迟范围须为非负整数毫秒，且最小值不大于最大值');
            }
            result.delays[key] = { enabled: rule.enabled, minMs: rule.minMs, maxMs: rule.maxMs };
        }
        return result;
    }
    function loadSettings(env) {
        try { const raw = env.localStorage.getItem(SETTINGS_KEY); return raw ? validateSettings(JSON.parse(raw)) : defaultSettings(); }
        catch (_) { return defaultSettings(); }
    }
    // The same scheduler serves parent actions, document steps and child-player startup.
    function createActionScheduler(env, { rule, enabled, onQueued = () => {}, onDone = () => {}, onError = () => {} }) {
        const pending = new Map();
        const run = (category, key, callback, options = {}) => {
            if (pending.has(key)) return pending.get(key);
            const range = rule(category);
            if (!ACTIONS[category] || !range || !Number.isSafeInteger(range.minMs) || !Number.isSafeInteger(range.maxMs) ||
                range.minMs < 0 || range.maxMs < range.minMs || range.maxMs > 2147483647) {
                onError('自动动作延迟配置无效'); return null;
            }
            if (!enabled(category)) { options.onCancel?.('feature'); return null; }
            if (options.isValid && !options.isValid()) { options.onCancel?.('stale'); return null; }
            const delay = Number.isSafeInteger(options.delayMs) && options.delayMs >= 0 && options.delayMs <= 2147483647 ? options.delayMs :
                range.enabled ? range.minMs + Math.floor(Math.random() * (range.maxMs - range.minMs + 1)) : 0;
            const action = { category, key, done: false, timer: null, cleanup: null, cancel(reason = 'cancel') {
                if (action.done) return;
                action.done = true; pending.delete(key);
                if (action.timer !== null) { env.clearTimeout(action.timer); onDone(action.timer); }
                action.cleanup?.(); options.onCancel?.(reason);
            } };
            const fire = () => {
                if (action.done) return;
                if (options.isValid && !options.isValid()) return action.cancel('stale');
                action.done = true; pending.delete(key); action.cleanup?.();
                if (action.timer !== null) onDone(action.timer);
                callback();
            };
            pending.set(key, action);
            if (range.enabled) console.log(`${navigationActions.has(category) ? '导航冷却' : '自动动作 ' + ACTIONS[category][0]} ${(delay / 1000).toFixed(3)}s`);
            if (delay || options.defer) {
                action.cleanup = options.watch?.(() => action.cancel('user')) || null;
                action.timer = env.setTimeout(fire, delay); onQueued(action.timer);
            } else fire();
            return action;
        };
        return { run, pending, cancelAll(reason = 'cancel') { for (const action of [...pending.values()]) action.cancel(reason); },
            cancelWhere(test, reason = 'settings') { for (const action of [...pending.values()]) if (test(action.category)) action.cancel(reason); } };
    }

    // The native card is evidenced; its closure URL and native popup handle are not exposed.
    // Recognition is not proof of recorded status or popup ownership.
    const platformLiveEntry = {
        inspect(entry) {
            const doc = entry?.ownerDocument;
            if (!doc || !entry.isConnected) return 'invalid';
            const links = doc.querySelectorAll('[id="openUrl"]');
            if (!links.length) return 'unresolved'; // The platform may create this asynchronously.
            if (links.length !== 1 || links[0].tagName !== 'A') return 'invalid';
            const link = links[0], href = link.getAttribute('href')?.trim();
            if (!href || /^javascript:\s*void\s*\(\s*0\s*\)\s*;?$/i.test(href)) return 'unresolved';
            try {
                const url = new URL(href, doc.baseURI);
                if (url.origin !== 'https://zhibo.chaoxing.com') return 'invalid';
            } catch (_) { return 'invalid'; }
            if (link.target !== '_blank') return 'unresolved';
            return link.relList.contains('noopener') || link.relList.contains('noreferrer') ? 'manual-policy' : 'approved-origin-only';
        },
        discover({ document: doc }) {
            const frame = videoAdapter.cardFrame();
            if (window.location?.origin !== 'https://mooc1.chaoxing.com' || !doc ||
                frame?.id !== 'iframe' || frame.getAttribute('info') !== 'card' || doc !== videoAdapter.cardDocument()) return null;
            const entries = doc.querySelectorAll('a.liveHref');
            if (!entries.length) return null;
            const entry = entries[0];
            const recognized = () => entry.isConnected && doc.querySelectorAll('a.liveHref').length === 1 &&
                doc.querySelector('a.liveHref') === entry &&
                !!entry.querySelector(':scope > div.liveCard > div.live-ct') &&
                /^javascript:\s*void\s*\(\s*0\s*\)\s*;?$/i.test(entry.getAttribute('href')?.trim() || '') &&
                this.inspect(entry) !== 'invalid';
            return { tasks: [{ kind: 'live', element: entry, nativeEntry: true }],
                validateScope: () => entries.length === 1 && frame === videoAdapter.cardFrame() &&
                    doc === videoAdapter.cardDocument() && recognized() };
        },
    };

    // Native attachment identity is observed evidence. Viewer selection uses actual
    // layout/rendering, never a guessed platform-specific scroll-container name.
    function documentViewer(boundary) {
        const documents = [], seen = new Set(); let inaccessible = false, loading = false;
        const visit = (doc, depth) => {
            if (!doc || seen.has(doc) || depth > 4) { inaccessible = true; return; }
            seen.add(doc); documents.push(doc);
            for (const frame of doc.querySelectorAll('iframe')) {
                try { visit(frame.contentDocument, depth + 1); } catch (_) { inaccessible = true; }
            }
        };
        if (boundary.tagName === 'IFRAME') { try { visit(boundary.contentDocument, 0); } catch (_) { inaccessible = true; } }
        else for (const frame of boundary.querySelectorAll('iframe')) { try { visit(frame.contentDocument, 0); } catch (_) { inaccessible = true; } }
        if (inaccessible) return { reason: '文档包含不可访问的内层框架' };
        const viewers = [];
        for (const doc of documents) {
            if (doc.querySelector('video, audio, form input[type=password], input[autocomplete="one-time-code"]')) return { reason: '文档范围含媒体或验证组件，无法安全自动阅读' };
            const pages = [...doc.querySelectorAll('img, canvas')].filter(el => el.getClientRects().length && el.getBoundingClientRect().height > 0);
            if (!pages.length && doc.querySelector('iframe') && doc.readyState !== 'loading') continue; // A wrapper is not a second, unrendered document.
            if (doc.readyState === 'loading' || !pages.length || pages.some(el => el.tagName === 'IMG' && (!el.complete || !el.naturalHeight))) { loading = true; continue; }
            const candidates = [...new Set([doc.scrollingElement, ...doc.querySelectorAll('*')])].filter(el => el && el.clientHeight > 0 &&
                Number.isFinite(el.scrollHeight) && el.scrollHeight >= el.clientHeight && pages.every(page => el.contains(page)) &&
                (el === doc.scrollingElement || /auto|scroll/.test(doc.defaultView.getComputedStyle(el).overflowY)));
            const inner = candidates.filter(el => !candidates.some(other => other !== el && el.contains(other)));
            if (inner.length === 1) viewers.push(inner[0]);
            else if (inner.length > 1) return { reason: '文档滚动区域不唯一' };
        }
        if (viewers.length > 1) {
            const scrolling = viewers.filter(el => el.scrollHeight > el.clientHeight + 1);
            if (scrolling.length === 1) return { viewer: scrolling[0] };
            return { reason: `存在 ${viewers.length} 个独立候选阅读区域（实际可滚动 ${scrolling.length} 个）；无可靠顺序，请手动选择原生阅读区域` };
        }
        return viewers.length === 1 && !loading ? { viewer: viewers[0] } : { loading: true, reason: '未找到已渲染的可验证文档滚动区域（可能尚在加载或格式不受支持）' };
    }
    const platformTaskAdapter = {
        discover({ document: root, node }) {
            const native = platformLiveEntry.discover({ document: root });
            if (native) return native;
            const frame = videoAdapter.cardFrame();
            if (!root || !frame || !node) return null;
            const boundaries = [...root.querySelectorAll('.ans-attach-online.insertdoc-online-pdf')].filter(el =>
                !el.parentElement?.closest('.ans-attach-online.insertdoc-online-pdf'));
            if (boundaries.length) return {
                tasks: boundaries.map(element => ({ kind: 'document', element, ...documentViewer(element), platformDocument: true })),
                validateScope: () => frame === videoAdapter.cardFrame() && root === videoAdapter.cardDocument() && node === catalog.current() &&
                    boundaries.every(el => el.isConnected && el.ownerDocument === root) &&
                    boundaries.length === [...root.querySelectorAll('.ans-attach-online.insertdoc-online-pdf')].filter(el => !el.parentElement?.closest('.ans-attach-online.insertdoc-online-pdf')).length,
            };
            // Additional native interaction: actual approved-origin links plus live
            // lesson identity, not Chinese card text alone. No URL construction.
            const name = node.querySelector('.posCatalog_name');
            if (location.origin !== 'https://mooc1.chaoxing.com' || !/直播|回放/.test(name?.getAttribute('title') || name?.textContent || '')) return null;
            const links = [], documents = new Set();
            const visit = (doc, depth) => {
                if (!doc || documents.has(doc) || depth > 4) return;
                documents.add(doc);
                for (const link of doc.querySelectorAll('a[href]')) {
                    try { if (new URL(link.getAttribute('href'), doc.baseURI).origin === 'https://zhibo.chaoxing.com' && link.target === '_blank' && link.getClientRects().length) links.push(link); } catch (_) { /* Not a validated link. */ }
                }
                for (const child of doc.querySelectorAll('iframe')) { try { visit(child.contentDocument, depth + 1); } catch (_) { /* No invented cross-origin adapter. */ } }
            };
            visit(root, 0);
            if (links.length !== 1 || [...documents].some(doc => doc.querySelector('.ans-attach-online, a.liveHref, input[type=password], input[autocomplete="one-time-code"]'))) return null;
            const entry = links[0], href = entry.getAttribute('href');
            return { tasks: [{ kind: 'live', element: entry, nativeLink: true }], validateScope: () => frame === videoAdapter.cardFrame() &&
                root === videoAdapter.cardDocument() && node === catalog.current() && entry.isConnected &&
                entry.getAttribute('href') === href && entry.target === '_blank' && entry.getClientRects().length > 0 };
        },
    };

    // The recorded popup uses confirmed evidence only.
    function bootRecordedPopup() {
        if (window.top !== window || !window.opener) return;
        const flag = name => {
            if (typeof window[name] === 'number') return window[name];
            const values = Array.from(document.scripts).flatMap(script => Array.from(script.textContent.matchAll(
                new RegExp('(?:^|[;\\s])(?:var\\s+|let\\s+|const\\s+)?' + name + '\\s*=\\s*(\\d+)\\s*(?=[;,\\r\\n]|$)', 'g')), match => Number(match[1])));
            return values.length && values.every(value => value === values[0]) ? values[0] : null;
        };
        const adapter = {
            kind: 'chaoxing-recorded-videojs', allowNearEnd: false, recoverPlayback: true,
            isRecognized: () => window.location.origin === 'https://zhibo.chaoxing.com' &&
                document.title.trim() === '直播' && flag('liveStatus') === 4 && flag('lookback') === 1 &&
                document.querySelectorAll('div#video.video-js video#video_html5_api.vjs-tech').length === 1,
            getPlayer: () => document.querySelector('div#video.video-js video#video_html5_api.vjs-tech'),
        };
        let attempts = 0;
        const stop = () => { clearInterval(window[BOOT_TIMER_KEY]); window[BOOT_TIMER_KEY] = null; window.removeEventListener('pagehide', stop); };
        const probe = () => {
            if (adapter.isRecognized()) { stop(); window.__xuexitongTaskSupport.installChild(adapter); }
            else if (++attempts >= 30) { stop(); console.warn('不支持或未加载的直播回放页面；课程窗口保持等待，请手动处理。'); }
        };
        window[BOOT_TIMER_KEY] = setInterval(probe, 1000);
        window.addEventListener('pagehide', stop);
        probe();
    }
    function createTaskSupport(env) {
        const bridgeProtocol = 'xuexitong-live-bridge-v1';
        const bridgeParents = new Set();
        function createBridgeParent({ generation, isValid, isPlatformComplete, onError, background }) {
            const id = env.crypto.randomUUID(), discoveryId = env.crypto.randomUUID();
            const node = catalog.current(), lessonId = node?.id, cardDocument = videoAdapter.cardDocument(), href = env.location.href;
            const valid = () => isValid() && node?.isConnected && lessonId && node.id === lessonId && catalog.current() === node &&
                Array.from(document.querySelectorAll('[id]')).filter(element => element.id === lessonId).length === 1 &&
                videoAdapter.cardDocument() === cardDocument && env.location.href === href;
            let started, sent = 0, received = 0, timer = null, probeTimer = null, attempts = 0;
            let disposed = false, phase = 'IDLE', paired = false, ended = false, confirmed = false;
            const sendBridge = type => env.postMessage({ protocol: bridgeProtocol, type, id, generation,
                seq: ++sent, timestamp: Date.now(), background: background !== false }, env.location.origin);
            const dispose = () => {
                if (disposed) return;
                const prepared = phase === 'ACTIVE';
                disposed = true; phase = 'DISPOSED'; env.clearInterval(timer); env.clearTimeout(probeTimer);
                bridgeParents.delete(controller);
                if (prepared) sendBridge('CANCEL');
                env.removeEventListener('message', receive);
                for (const type of ['pagehide', 'beforeunload', 'popstate', 'hashchange']) env.removeEventListener(type, dispose);
            };
            const fail = (reason = '直播桥接会话失效或窗口提前关闭，请手动处理') => {
                if (disposed) return;
                dispose(); onError(reason);
            };
            const tick = () => {
                if (disposed) return;
                if (!valid() || Date.now() - started > 86400000) return fail();
                // These messages are advisory: same-window source/origin/IDs do not
                // authenticate the companion. Its isolated side also checks ended/marker.
                if (ended && !confirmed && isPlatformComplete?.() === true) { confirmed = true; sendBridge('CONFIRM'); }
            };
            const probe = () => {
                if (disposed || phase !== 'DISCOVERING') return;
                if (!valid()) return dispose();
                if (attempts >= 20 || Date.now() - started >= 5000) return fail('未在有限等待内发现可选直播桥；请手动处理，脚本不会自动推进');
                attempts++;
                env.postMessage({ protocol: bridgeProtocol, type: 'PING', id, generation, discoveryId, timestamp: Date.now() }, env.location.origin);
                probeTimer = env.setTimeout(probe, 250);
            };
            function receive(event) {
                const data = event.data;
                if (disposed || event.source !== env || event.origin !== 'https://mooc1.chaoxing.com' ||
                    !data || data.protocol !== bridgeProtocol || data.id !== id || data.generation !== generation ||
                    !Number.isFinite(data.timestamp) ||
                    data.timestamp < started || data.timestamp > Date.now() + 30000 || !valid()) return;
                if (data.type === 'AVAILABLE') {
                    if (phase !== 'DISCOVERING' || data.discoveryId !== discoveryId || Date.now() - started >= 5000) return;
                    phase = 'ACTIVE'; env.clearTimeout(probeTimer); probeTimer = null;
                    timer = env.setInterval(tick, 2000); sendBridge('PREPARE'); return;
                }
                if (phase !== 'ACTIVE' || !Number.isSafeInteger(data.seq) || data.seq <= received) return;
                if (!['PAIRED', 'ENDED', 'CLOSED', 'ERROR'].includes(data.type)) return;
                if (['ENDED', 'CLOSED'].includes(data.type) && !paired) return;
                received = data.seq;
                if (data.type === 'PAIRED') paired = true;
                if (data.type === 'ERROR') return fail();
                if (data.type === 'ENDED') { ended = true; tick(); }
                // No page-world message can prove companion provenance or tab closure.
                // There is intentionally no onResult/scheduleClose route in this adapter.
                if (data.type === 'CLOSED') return fail('同页桥接终止消息无法验证发送者；自动续课已禁用，请手动导航');
            }
            const controller = { manualOnly: false, dispose, tick, start() {
                if (disposed || phase !== 'IDLE' || !valid()) return;
                phase = 'DISCOVERING'; started = Date.now(); bridgeParents.add(controller);
                env.addEventListener('message', receive);
                for (const type of ['pagehide', 'beforeunload', 'popstate', 'hashchange']) env.addEventListener(type, dispose);
                probe();
            } };
            bridgeParents.add(controller);
            return controller;
        }
        const protocol = 'xuexitong-live-v1';
        const courseOrigin = 'https://mooc1.chaoxing.com';
        const replayOrigin = 'https://zhibo.chaoxing.com';
        const trustedPair = (parent, child) => parent === courseOrigin && child === replayOrigin;
        const types = new Set(['LIVE_OPENED', 'LIVE_READY', 'LIVE_PLAYING', 'LIVE_NEAR_END', 'LIVE_COMPLETED', 'LIVE_ERROR', 'LIVE_CLOSED', 'LIVE_CANCEL']);
        const send = (peer, session, type, extra = {}) => peer.postMessage({
            protocol, id: session.id, generation: session.generation, seq: ++session.sent,
            timestamp: Date.now(), type, ...(session.documentId ? { documentId: session.documentId, playerKind: 'chaoxing-recorded-videojs' } : {}), ...extra,
        }, session.peerOrigin || env.location.origin);
        const accept = (event, session, peer) => {
            const data = event.data;
            return event.origin === (session.peerOrigin || env.location.origin) && event.source === peer && data &&
                data.protocol === protocol && data.id === session.id && data.generation === session.generation &&
                types.has(data.type) && Number.isSafeInteger(data.seq) && data.seq > session.received &&
                Number.isFinite(data.timestamp) && data.timestamp >= session.started - 5000 && data.timestamp <= Date.now() + 30000;
        };
        function createParent({ entry, nativeEntry = false, generation, threshold, isValid, onResult, onError, scheduleClose = fn => fn(), isPlatformComplete, background }) {
            if (nativeEntry) {
                const scope = platformLiveEntry.discover({ document: entry?.ownerDocument });
                if (!scope?.validateScope() || scope.tasks[0].element !== entry) throw new Error('Unsupported native live entry');
                if (typeof isPlatformComplete === 'function') return createBridgeParent({ generation, isValid,
                    isPlatformComplete, onResult, onError, scheduleClose, background });
                let started = false, disposed = false;
                return {
                    manualOnly: true, dispose() { disposed = true; },
                    start() {
                        if (started || disposed || !isValid()) return;
                        started = true;
                        if (!scope.validateScope()) return onError('直播入口已变化，停止自动处理');
                        // Native anchor.click() returns no WindowProxy. Do not substitute
                        // window.open(), rewrite target/URL, introspect closures or run the
                        // business handler merely to discover its destination.
                        const state = platformLiveEntry.inspect(entry);
                        onError(state === 'invalid' ? '直播目标不受支持，请手动检查原生入口' :
                            '已识别平台直播入口，但原生链接不提供可验证的窗口引用；请手动点击直播卡片并处理，脚本不会自动推进');
                    },
                };
            }
            const url = new URL(entry.href, env.location.href);
            const crossOrigin = url.origin !== env.location.origin;
            if (!entry.isConnected || entry.tagName !== 'A' || entry.target !== '_blank' ||
                entry.relList?.contains('noopener') || entry.relList?.contains('noreferrer') || (crossOrigin && !trustedPair(env.location.origin, url.origin)) ||
                !['http:', 'https:'].includes(url.protocol) || !Number.isFinite(threshold) || threshold <= 0 || threshold > 1) {
                throw new Error('Unsupported live entry/origin/threshold');
            }
            const session = { id: env.crypto.randomUUID(), generation, sent: 0, received: 0, started: Date.now(), peerOrigin: url.origin };
            let child, timer, disposed = false, result = null, closeAttempted = false, childDocument = null;
            const dispose = () => {
                if (crossOrigin && !disposed && child && !child.closed && session.documentId) {
                    try { send(child, session, 'LIVE_CANCEL'); } catch (_) { /* Cancellation never closes a window. */ }
                }
                disposed = true; env.clearInterval(timer);
                env.removeEventListener('message', receive); env.removeEventListener('pagehide', dispose);
            };
            const fail = reason => { if (!disposed) { dispose(); onError(reason); } };
            const tick = () => {
                if (disposed) return;
                if (!isValid()) return fail('Original live task changed');
                if (!child) return;
                if (child.closed) {
                    if (!result) return fail('Live window closed before a validated result');
                    if (!closeAttempted) return;
                    dispose(); onResult(result); return;
                }
                try {
                    if (!crossOrigin && ((child.location.origin !== env.location.origin && !(child.location.href === 'about:blank' && !childDocument)) ||
                        (childDocument && child.document !== childDocument))) {
                        return fail('Live window left its supported document/origin');
                    }
                    if (result && !closeAttempted) return;
                    if (closeAttempted) return fail('Live window closure denied or not confirmed; handle manually');
                    send(child, session, 'LIVE_OPENED', { threshold, ...(crossOrigin ? { settings: loadSettings(env) } : {}) });
                } catch (_) { fail('Live window communication unavailable'); }
            };
            function receive(event) {
                if (disposed || !child || !accept(event, session, child) || !isValid()) return;
                const data = event.data;
                if (data.type === 'LIVE_OPENED' || data.type === 'LIVE_CANCEL') return;
                if (crossOrigin) {
                    if (data.playerKind !== 'chaoxing-recorded-videojs' || typeof data.documentId !== 'string' || !/^[\w-]{16,80}$/.test(data.documentId)) return;
                    if (!session.documentId) {
                        if (data.type !== 'LIVE_READY') return;
                        session.documentId = data.documentId;
                    } else if (data.documentId !== session.documentId) return fail('Live child document changed');
                    // Recorded adapter must reach natural ended, never merely a local ratio.
                    if (data.type === 'LIVE_NEAR_END') return;
                }
                if (data.type === 'LIVE_COMPLETED' && data.ended !== true) return;
                if (data.type === 'LIVE_NEAR_END' && !(Number.isFinite(data.duration) && data.duration > 0 &&
                    Number.isFinite(data.position) && data.position >= 0 && data.position <= data.duration + 1 &&
                    data.position / data.duration >= threshold)) return;
                session.received = data.seq;
                if (result) return;
                if (data.type === 'LIVE_ERROR' || data.type === 'LIVE_CLOSED') return fail('Live child stopped unexpectedly');
                if (data.type === 'LIVE_READY') {
                    if (!crossOrigin) try { childDocument = child.document; } catch (_) { return fail('Live document inaccessible'); }
                }
                const ended = data.type === 'LIVE_COMPLETED' && data.ended === true;
                const near = data.type === 'LIVE_NEAR_END' && Number.isFinite(data.duration) && data.duration > 0 &&
                    Number.isFinite(data.position) && data.position >= 0 && data.position / data.duration >= threshold &&
                    data.position <= data.duration + 1;
                if (!ended && !near) return;
                result = { kind: near ? 'near-end' : 'completed', basis: near ? 'local-position' : 'local-ended' };
                scheduleClose(() => {
                    if (disposed || !isValid()) return;
                    closeAttempted = true;
                    try { child.close(); } catch (_) { fail('Live window closure denied; handle manually'); }
                });
                // Closure is confirmed on the next poll, not inferred from close() succeeding.
            }
            return {
                session, get child() { return child; }, tick, dispose,
                start() {
                    if (disposed || child || !isValid()) return;
                    env.addEventListener('message', receive); env.addEventListener('pagehide', dispose);
                    child = env.open(url.href, '_blank');
                    if (!child) return fail('Live popup blocked; open it manually');
                    timer = env.setInterval(tick, 2000);
                    tick();
                },
            };
        }
        function installChild(adapter) {
            if (env.__xuexitongLiveChild && !env.__xuexitongLiveChild.disposed) return env.__xuexitongLiveChild;
            if (!env.opener || !adapter || typeof adapter.isRecognized !== 'function' || !adapter.isRecognized()) return null;
            let session = null, video = null, timer, terminal = false, disposed = false;
            let lastPosition = -1, lastProgress = Date.now(), lastRecovery = -Infinity, playPending = false;
            let settings = loadSettings(env);
            const actions = createActionScheduler(env, {
                rule: category => ({ ...settings.delays[category], enabled: settings.randomDelaysEnabled && settings.delays[category].enabled }),
                enabled: () => settings.features.live && settings.features.videoPlayback,
                onError: () => report('LIVE_ERROR'),
            });
            const listeners = [];
            const listen = (target, type, handler) => { target.addEventListener(type, handler); listeners.push([target, type, handler]); };
            const dispose = () => {
                disposed = true; env.clearInterval(timer); actions.cancelAll();
                for (const [target, type, handler] of listeners) target.removeEventListener(type, handler);
            };
            const report = (type, extra) => { if (session && !disposed && env.opener && !env.opener.closed) send(env.opener, session, type, extra); };
            const applySettings = next => {
                const previous = settings; settings = next;
                if (previous.features.live !== settings.features.live || previous.features.videoPlayback !== settings.features.videoPlayback ||
                    previous.randomDelaysEnabled !== settings.randomDelaysEnabled || JSON.stringify(previous.delays.videoStart) !== JSON.stringify(settings.delays.videoStart)) actions.cancelAll('settings');
                if (!settings.features.live) { report('LIVE_ERROR'); dispose(); }
            };
            const check = () => {
                if (disposed || !session) return;
                if (!env.opener || env.opener.closed) return dispose();
                if (!adapter.isRecognized() || !video.isConnected || video.error) { report('LIVE_ERROR'); return dispose(); }
                if (terminal) return;
                if (video.playbackRate !== 1) video.playbackRate = 1;
                if (video.ended || adapter.sessionFinished?.() === true) {
                    terminal = true; report('LIVE_COMPLETED', { ended: true });
                } else if (adapter.allowNearEnd !== false && Number.isFinite(video.duration) && video.duration > 0 &&
                    Number.isFinite(video.currentTime) && video.currentTime / video.duration >= session.threshold) {
                    terminal = true; report('LIVE_NEAR_END', { position: video.currentTime, duration: video.duration });
                } else {
                    report(video.paused ? 'LIVE_READY' : 'LIVE_PLAYING');
                    if (adapter.recoverPlayback && settings.features.live && settings.features.videoPlayback && settings.features.background) {
                        if (video.currentTime !== lastPosition) { lastPosition = video.currentTime; lastProgress = Date.now(); }
                        if ((video.paused || Date.now() - lastProgress >= 7000) && !actions.pending.size &&
                            !playPending && Date.now() - lastRecovery >= 1500) {
                            lastRecovery = Date.now(); playPending = true;
                            Promise.resolve(video.play()).catch(() => report('LIVE_ERROR')).finally(() => { playPending = false; });
                        }
                    }
                }
            };
            listen(env, 'message', event => {
                const data = event.data;
                if (!data) return;
                if (data.type === 'LIVE_CANCEL') {
                    if (session && accept(event, session, env.opener) && data.documentId === session.documentId) dispose();
                    return;
                }
                if (data.type !== 'LIVE_OPENED') return;
                if (!session) {
                    const crossOrigin = event.origin !== env.location.origin;
                    if ((crossOrigin && (!trustedPair(event.origin, env.location.origin) || adapter.kind !== 'chaoxing-recorded-videojs')) || event.source !== env.opener || !data ||
                        data.protocol !== protocol || data.type !== 'LIVE_OPENED' ||
                        typeof data.id !== 'string' || !/^[\w-]{16,80}$/.test(data.id) ||
                        !Number.isSafeInteger(data.generation) || data.generation < 0 || !Number.isFinite(data.threshold) || data.threshold <= 0 || data.threshold > 1) return;
                    const candidate = { id: data.id, generation: data.generation, started: Date.now(), sent: 0, received: 0, threshold: data.threshold,
                        peerOrigin: event.origin, ...(crossOrigin ? { documentId: env.crypto.randomUUID() } : {}) };
                    if (!accept(event, candidate, env.opener)) return;
                    if (crossOrigin) {
                        let supplied;
                        try { supplied = validateSettings(data.settings); } catch (_) { return; }
                        if (!supplied || !supplied.features.live) return;
                        settings = supplied;
                    }
                    session = candidate;
                    video = adapter.getPlayer();
                    if (!video?.isConnected || typeof video.play !== 'function' || video.tagName !== 'VIDEO') {
                        report('LIVE_ERROR'); return dispose();
                    }
                    video.playbackRate = 1;
                    listen(video, 'ratechange', () => { if (video.playbackRate !== 1) video.playbackRate = 1; });
                    for (const type of ['timeupdate', 'durationchange', 'ended', 'play', ...(adapter.recoverPlayback ? ['pause'] : [])]) listen(video, type, check);
                    report('LIVE_READY');
                    actions.run('videoStart', 'child-video-start', () => video.play().catch(() => report('LIVE_ERROR')),
                        { isValid: () => !disposed && !!env.opener && !env.opener.closed && video.isConnected && adapter.isRecognized() });
                    timer = env.setInterval(check, 10000);
                    if (adapter.recoverPlayback) {
                        listen(env, 'focus', check);
                        listen(env.document, 'visibilitychange', check);
                    }
                }
                if (!accept(event, session, env.opener)) return;
                if (session.peerOrigin !== env.location.origin) {
                    if (data.documentId && data.documentId !== session.documentId) return;
                    try { applySettings(validateSettings(data.settings)); } catch (_) { return; }
                    if (disposed) return;
                }
                session.received = data.seq;
                check();
            });
            listen(env, 'storage', event => { if (event.key === SETTINGS_KEY) {
                applySettings(loadSettings(env));
            } });
            listen(env, 'pagehide', () => { if (!terminal) report('LIVE_CLOSED'); dispose(); });
            if (env[BOOT_TIMER_KEY]) { env.clearInterval(env[BOOT_TIMER_KEY]); env[BOOT_TIMER_KEY] = null; }
            return env.__xuexitongLiveChild = { check, dispose, get active() { return !!session; }, get disposed() { return disposed; } };
        }
        function readDocument({ element, isValid, onComplete, onError, scheduleStep, onProgress = () => {} }) {
            let timer, scheduled, cancelled = false, previous = -1, unchanged = 0, bottomHeight = -1, begun = false;
            const cancel = () => { cancelled = true; env.clearTimeout(timer); scheduled?.cancel(); };
            const fail = reason => { cancel(); onError(reason); };
            const tick = () => {
                if (cancelled) return;
                if (!isValid() || !element.isConnected || element.clientHeight <= 0) return fail('Document viewer unavailable');
                const bottom = element.scrollHeight - element.clientHeight;
                onProgress(bottom > 0 ? Math.min(100, Math.floor(element.scrollTop / bottom * 100)) : 100);
                if (!Number.isFinite(bottom) || bottom < 0) return fail('Document bottom cannot be verified');
                if (begun && element.scrollTop >= bottom - 1) {
                    if (bottomHeight === element.scrollHeight) { cancel(); onComplete(); return; }
                    bottomHeight = element.scrollHeight;
                    timer = env.setTimeout(tick, 0); // Verification yields, but is never randomized.
                    return;
                }
                bottomHeight = -1;
                if (begun && element.scrollTop === previous) unchanged++; else unchanged = 0;
                if (unchanged >= 10) return fail('Document scrolling made no progress');
                previous = element.scrollTop;
                const step = () => {
                    if (cancelled) return;
                    if (!isValid() || !element.isConnected || element.clientHeight <= 0) return fail('Document viewer unavailable');
                    if (!begun) { element.scrollTop = 0; begun = true; }
                    element.scrollTop = Math.min(element.scrollHeight - element.clientHeight,
                        element.scrollTop + 40 + Math.floor(Math.random() * 81));
                    tick();
                };
                if (scheduleStep) scheduled = scheduleStep(step);
                else timer = env.setTimeout(step, 400 + Math.floor(Math.random() * 801));
            };
            tick();
            return { cancel, tick };
        }
        return { createParent, installChild, readDocument, inspectPlatformEntry: entry => platformLiveEntry.inspect(entry),
            dispose() { for (const parent of [...bridgeParents]) parent.dispose(); } };
    }

    function initializePlayer() {
        const app = {
            configs: {
                playbackRate: 1.0,
                autoplay: true,
                retryInterval: 2000,
                maxRetries: 10,
                videoCheckInterval: 1000,
                guardNoProgressMs: 7000,
                guardResumeCooldownMs: 1500,
                autoAdvanceNoVideo: false,
                liveNearEndThreshold: 0.99,
                randomCooldownEnabled: true,
                randomCooldownMinMs: 5000,
                randomCooldownMaxMs: 12000,
            },
            _videoEl: null,
            _treeContainerEl: null,
            _isPlaying: false,
            _currentRetryCount: 0,
            _checkInterval: null,
            _eventVideoEl: null,
            _boundVideoHandlers: null,
            _nextUnitPending: false,
            _chapterAdvanceTimes: 0,
            _cellData: {
                cells: 0,
                nCells: 0,
                currentCellIndex: 0,
                currentNCellIndex: 0,
                currentVideoTitle: "",
            },
            get cellData() {
                return this._cellData;
            },
            run({ startup = false, transition = false } = {}) {
                console.log("%c=== 学习通自动刷课脚本 V3 优化版启动 ===", "color:#4CAF50;font-size:16px;font-weight:bold");
                if (!transition || this._state !== 'WAITING_CATALOG') this._cancelTasks();
                this._destroyed = false;
                this._manualPermit = null; this._manualBusy = false;
                this._detectedKind = null; this._attemptStatus = '';
                this._priorChecked = null; this._completedVisits ||= new Set();
                this._automaticStartup = startup;
                this._state = 'DISCOVERING';
                this._isPlaying = false;
                this._completedVideos = new WeakSet();
                this._attachmentSnapshot = null;
                this._processedTasks = new WeakSet();
                this._externalCompletion = null;
                this._hadLive = false;
                this._liveReturnPendingNavigation = false;
                this._preparedVideoNode = null;
                this._lastProcessedKind = null;
                this._nextVideoRequested = false;
                this._completionNode = null;
                this._completionVideo = null;
                this._videoContext = null;
                this._tryTimes = 0;
                this._stepSwitchPending = false;
                this._nextUnitPending = false;
                this._chapterAdvanceTimes = 0;
                this._getTreeContainer();
                this._initCellData();
                this._videoEl = null;
                this._clearCheckInterval();
                this._bindStepNavigation();
                this._notify('正在检测当前小节');
                if (this._checkPriorCompletion() || this._observeCredit()) return;
                const scope = startup && this._taskSet();
                if (startup && !this._isChapterTest() && this._currentStepTitle() !== '学习目标' && !scope?.invalid && !scope?.tasks.length) this._waitForStartup(); else this.play();
            },
            _waitForStartup() {
                const generation = this._generation, href = window.location.href;
                const original = catalog.current(), id = original?.id, chapter = original && this._chapterOf(original);
                const topology = this._catalogTopology();
                let timer, attempts = 0, previous = null;
                const cleanup = () => {
                    clearTimeout(timer); this._timers.delete(timer);
                    timer = null;
                    document.removeEventListener('click', interaction, true);
                    for (const type of ['pagehide', 'beforeunload', 'popstate', 'hashchange']) window.removeEventListener(type, cancel);
                    if (this._startupCancel === cleanup) this._startupCancel = null;
                };
                const cancel = () => { cleanup(); this._block('首次自动启动已取消，请手动重新识别'); };
                const interaction = event => { if (event.isTrusted && !event.composedPath().includes(this._settingsPanel)) cancel(); };
                this._startupCancel = cleanup;
                document.addEventListener('click', interaction, true);
                for (const type of ['pagehide', 'beforeunload', 'popstate', 'hashchange']) window.addEventListener(type, cancel);
                const tick = () => {
                    this._timers.delete(timer);
                    if (this._destroyed || generation !== this._generation) return cleanup();
                    if (href !== window.location.href) { cleanup(); return this._block('首次启动时页面已改变，请手动重新识别'); }
                    const node = catalog.current();
                    if (original && node && node !== original && (original.isConnected || !id || node.id !== id ||
                        Array.from(document.querySelectorAll('[id]')).filter(el => el.id === id).length !== 1 ||
                        (this._chapterOf(node) !== chapter && (!topology || this._catalogTopology() !== topology)))) {
                        cleanup(); return this._block('首次启动时课程任务已改变');
                    }
                    const frame = videoAdapter.cardFrame(), doc = videoAdapter.cardDocument(), media = this._playableMedia();
                    if (catalog.status(node) === 'completed') {
                        cleanup(); this._state = 'READY';
                        if (!this._checkPriorCompletion()) this._block('完成标记存在，但任务范围尚无法安全确认');
                        return;
                    }
                    const scope = this._taskSet();
                    if (scope && !scope.invalid && scope.tasks.length && !media.pending && !media.unsupported && !media.inaccessible && scope.validateScope()) {
                        cleanup(); this._state = 'DISCOVERING'; this._initCellData(); this.play(); return;
                    }
                    if (media.reasons?.includes('assessment-or-verification-required')) { cleanup(); return this._block('检测到测验或身份验证，停止自动播放'); }
                    const title = this._currentStepTitle(), label = node?.querySelector('.posCatalog_name');
                    const nodeTitle = (label?.getAttribute('title') || label?.textContent || '').trim();
                    const stepReady = !document.getElementsByClassName('prev_title').length || !!title;
                    const requiredFrames = new Set([frame]);
                    for (const player of media.videos) {
                        let inner = player.ownerDocument;
                        for (let depth=0; inner && inner !== document && depth<5; depth++) {
                            const owner=inner.defaultView?.frameElement;if(!owner)break;
                            requiredFrames.add(owner);inner=owner.ownerDocument;
                        }
                    }
                    const ready = node && stepReady && nodeTitle && frame && doc && document.readyState !== 'loading' && (media.videos.length > 0 || media.tasks?.length > 0) &&
                        !media.pending && !media.inaccessible && [...requiredFrames].every(child => {
                                try {
                                    const nested = child.contentDocument;
                                    const src = child.getAttribute('src')?.trim();
                                    const destination = src ? new URL(src, child.ownerDocument.baseURI) : null;
                                    return nested && nested.readyState !== 'loading' &&
                                        (!destination || !['http:', 'https:'].includes(destination.protocol) || nested.URL !== 'about:blank') &&
                                        (!child.hasAttribute('srcdoc') || nested.URL === 'about:srcdoc');
                                } catch (_) { return false; }
                            });
                    const snapshot = [node, title, nodeTitle, doc, ...media.documents, ...media.videos];
                    if (ready && previous && previous.length === snapshot.length && previous.every((value, index) => value === snapshot[index])) {
                        cleanup(); this._state = 'DISCOVERING'; this._initCellData(); this.play(); return;
                    }
                    if (++attempts >= 40) {
                        cleanup(); return this._block(/直播|回放/.test(nodeTitle) ? '未找到可识别的直播入口；现有页面证据不足，请使用原生入口或提供脱敏结构' : '首次启动等待目录或媒体就绪超时；可在任务面板选择类型后重试');
                    }
                    previous = ready ? snapshot : null;
                    timer = setTimeout(tick, 250); this._timers.add(timer);
                };
                this._state = 'WAITING_STARTUP'; tick();
            },
            nextUnit() {
                if (['ADVANCING', 'NAVIGATION_COOLDOWN', 'WAITING_STARTUP', 'WAITING_LIVE', 'READING_DOCUMENT', 'ACTION_PENDING', 'PAUSED_AUTOMATION'].includes(this._state) || this._nextUnitPending) return;
                if (this._isChapterTest()) return this._advanceChapterTest();
                if (!this._externalCompletion && !this._platformCompletion && this._state === 'READY_TO_ADVANCE' && !this._refreshVideoContext()) return this._block('视频任务身份无法确认');
                if (this._state !== 'READY_TO_ADVANCE' || catalog.current() !== this._completionNode ||
                    (!this._externalCompletion && catalog.status(this._completionNode) !== 'completed')) {
                    return this._block('平台完成状态尚未确认，停止自动导航');
                }
                const entries = catalog.entries();
                const index = entries.indexOf(this._completionNode);
                if (index < 0) return this._block('当前目录节点已失效');
                const next = this._targetAfter(this._completionNode);
                if (next === null) return this._block('章末测验或下一章节无法安全识别');
                if (!next) {
                    this._state = 'FINISHED';
                    this._notify('已到当前可见目录末尾，自动导航已结束');
                    console.log('已到当前可见目录末尾；不代表整个课程已完成。');
                    return;
                }
                this._queueNavigation(next);
            },
            updateSettings(input, persist = true) {
                let next;
                try { next = validateSettings(input); } catch (error) { this._settingsMessage = error.message; return false; }
                const previous = this.settings;
                this.settings = next;
                if (this._documentWaitCancel && !next.features.document) this.stopAutomation();
                if ((this._mediaReadyCancel || this._audioState?.waiting) && !next.features[this._audioState || this._playableMedia().audios?.length ? 'audioPlayback' : 'videoPlayback']) { this._cancelTasks(); this._state = 'PAUSED_AUTOMATION'; }
                if (this._startupCancel && !next.features[this._playableMedia().audios?.length ? 'audioPlayback' : 'videoPlayback']) { this._cancelTasks(); this._state = 'PAUSED_AUTOMATION'; }
                if (previous.preset !== next.preset && next.preset === 'legacy') {
                    this.configs.randomCooldownMinMs = 5000; this.configs.randomCooldownMaxMs = 12000;
                }
                this._actions.cancelWhere(category => !this._actionEnabled(category) ||
                    previous.randomDelaysEnabled !== next.randomDelaysEnabled ||
                    JSON.stringify(previous.delays[category]) !== JSON.stringify(next.delays[category]));
                if ((!next.features.document && this._documentController) ||
                    (!next.features.live && this._liveController)) this._block('对应功能已关闭');
                if (next.features.background && !this._pageGuards) this._bindPageGuards();
                if (!next.features.background) this._removePageGuards();
                if (persist) {
                    try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); this._settingsMessage = '已保存；取消的动作不会自动重启'; }
                    catch (_) { this._settingsMessage = '存储不可用，本页设置仍生效'; }
                }
                this._renderSettings?.();
                return true;
            },
            _actionEnabled(category) {
                const manual = (this._manualPermit === 'video' && category === 'videoStart') ||
                    (this._manualPermit === 'audio' && category === 'audioStart') ||
                    (this._manualPermit === 'document' && category === 'documentScroll');
                return !this._destroyed && (manual || this.settings.features[ACTIONS[category][3]]) &&
                    (category !== 'nextAudio' || this.settings.features.audioPlayback) &&
                    (category !== 'nextVideo' || this.settings.features.videoPlayback) &&
                    (category !== 'assessment' || this.settings.features.nextChapter) &&
                    (manual || !['videoStart', 'nextVideo'].includes(category) || this.configs.autoplay);
            },
            _actionRule(category) {
                const value = { ...this.settings.delays[category] };
                if (this.settings.preset === 'legacy' && navigationActions.has(category)) {
                    value.minMs = this.configs.randomCooldownMinMs; value.maxMs = this.configs.randomCooldownMaxMs;
                }
                value.enabled = value.enabled && this.settings.randomDelaysEnabled;
                return value;
            },
            _runAction(category, key, callback, options = {}) {
                const generation = this._generation, node = catalog.current(), title = this._currentStepTitle();
                const href = window.location.href, content = videoAdapter.cardDocument();
                const valid = () => navigationActions.has(category) && key === 'navigation' ?
                    !this._destroyed && generation === this._generation && this._actionEnabled(category) && !!options.isValid?.() :
                    !this._destroyed && generation === this._generation && this._sameVideoTaskNode(node) &&
                    title === this._currentStepTitle() && href === window.location.href && content === videoAdapter.cardDocument() &&
                    this._actionEnabled(category) && (!options.isValid || options.isValid());
                return this._actions.run(category, key, callback, { ...options, isValid: valid,
                    onCancel: reason => {
                        options.onCancel?.(reason);
                        if (this._destroyed || ['BLOCKED', 'ADVANCING'].includes(this._state)) return;
                        if (['user', 'stale'].includes(reason)) this._block(key === 'navigation' ? (this._navigationFailure || '导航已被用户操作或页面切换取消') : '自动动作上下文已变化');
                        else {
                            if (this._isPlaying) return;
                            this._documentController?.cancel(); this._documentController = null;
                            this._liveController?.dispose(); this._liveController = null;
                            this._state = 'PAUSED_AUTOMATION'; this._playPending = false;
                            this._notify('自动动作已取消；请明确重新检测后继续');
                        }
                    },
                    watch: cancel => {
                        const observer = new MutationObserver(() => { if (!valid()) cancel(); });
                        const listeners = [];
                        const listen = (el, type, handler = cancel) => { el.addEventListener(type, handler, true); listeners.push([el, type, handler]); };
                        const click = event => { if (!event.composedPath().includes(this._settingsPanel) && !event.composedPath().includes(this._noticePanel)) cancel(); };
                        for (const doc of new Set([document, ...this._playableMedia().documents])) {
                            if (key !== 'navigation') observer.observe(doc, { subtree: true, attributes: true, childList: true, characterData: true });
                            listen(doc, 'click', click);
                            for (const frame of doc.querySelectorAll('iframe')) if (doc !== document || frame === videoAdapter.cardFrame()) {
                                listen(frame, 'load', () => { if (navigationActions.has(category) ? !valid() : (!this._automaticStartup || !['videoStart', 'audioStart'].includes(category) || !valid())) cancel(); });
                            }
                        }
                        if (this._completionVideo) listen(this._completionVideo, 'play');
                        for (const type of ['pagehide', 'beforeunload', 'popstate', 'hashchange']) listen(window, type);
                        return () => { observer.disconnect(); for (const [el, type, fn] of listeners) el.removeEventListener(type, fn, true); this._cooldownCleanup = null; };
                    },
                });
            },
            _removePageGuards() {
                if (!this._pageGuards) return;
                const { preventPause, resumePlaybackNow } = this._pageGuards;
                for (const type of ['mouseleave', 'mouseout']) {
                    document.removeEventListener(type, preventPause); window.removeEventListener(type, preventPause);
                }
                window.removeEventListener('blur', resumePlaybackNow);
                document.removeEventListener('visibilitychange', resumePlaybackNow);
                this._pageGuards = null;
            },
            _notify(message, status = '') {
                this._lastNotice = message; if (status) this._attemptStatus = status;
                const output = this._noticePanel?.shadowRoot?.querySelector('[role=status]');
                if (output && output.textContent !== message) output.textContent = message;
                const task = this._settingsPanel?.shadowRoot?.querySelector('[data-task-status]');
                if (task) task.textContent = `${this._attemptStatus || '检测状态'} · ${this._state}：${message}`;
                const detected = this._settingsPanel?.shadowRoot?.querySelector('[data-detected]');
                if (detected) detected.textContent = `自动检测：${this._detectedKind || '尚未识别'} · ${this._state}`;
            },
            stopAutomation() {
                this._manualPermit = null; this._manualBusy = false; this._isPlaying = false;
                this._state = 'PAUSED_AUTOMATION'; this._cancelTasks(); this._detachVideoEvents();
                this._notify('已停止自动操作；可点击“重新自动检测”或选择任务后重试', '安全阻断');
            },
            _mountNoticePanel() {
                if (typeof document.createElement !== 'function') return;
                const host = document.createElement('div'); host.id = 'xuexitong-v3-notice';
                host.style.cssText = 'position:fixed;right:8px;bottom:86px;max-width:290px;z-index:2147483646';
                host.attachShadow({ mode: 'open' }).innerHTML = '<style>:host{font:12px/1.5 sans-serif;color:#222}div{background:#fff;border:1px solid #aaa;border-radius:5px;padding:7px}p{margin:0 0 5px}button{font:inherit}</style><div><p role="status" aria-live="polite">正在检测当前小节</p><button data-stop>停止自动操作</button> <button data-resume>重新自动检测</button></div>';
                host.shadowRoot.querySelector('[data-stop]').onclick = () => this.stopAutomation();
                host.shadowRoot.querySelector('[data-resume]').onclick = () => { if (!this._destroyed) this.run({ startup: true }); };
                this._noticePanel = host; document.body.append(host);
            },
            _inspectTask() {
                const scope = this._taskSet(), media = this._playableMedia();
                const node = catalog.current();
                const card = this._cardIdentity(), oldCard = this._observedCard;
                const sameCard = oldCard && card.length === oldCard.length && card.every((value, index) => value === oldCard[index]);
                if (!node || !this._catalogTopology() || ['WAITING_CATALOG','ADVANCING'].includes(this._state) ||
                    (this._observedLessonId && node.id !== this._observedLessonId && sameCard)) return { blocked: true, reason: '安全阻断：目录与内容切换尚未确认' };
                if (this._verificationPresent() || this._isChapterTest() || scope?.invalid || ((!this._priorProof(node)) && (media.unsupported || media.inaccessible))) return { blocked: true, reason: '安全阻断：任务归属、媒体或验证条件无法确认' };
                const pending = media.tasks?.find(task => task.kind === 'document' ? !this._processedTasks.has(task.attachment) : !this._completedVideos.has(task.element));
                const task = scope?.tasks.find(task => !this._processedTasks.has(task.element));
                const player = media.videos.find(el => !this._completedVideos.has(el));
                const kind = pending?.kind || task?.kind || (player ? player.tagName === 'AUDIO' ? 'audio' : 'video' : null);
                return { kind, task, player, scope, media, completed: !!catalog.current() && this._priorProof(catalog.current()) };
            },
            _appendTaskControls(section) {
                const details = document.createElement('details'); details.dataset.taskControls = '';
                details.innerHTML = '<summary>当前小节 · 检测与手动执行</summary><label>任务类型 <select data-task-type><option value="video">视频</option><option value="audio">音频</option><option value="document">文档</option><option value="live">直播 / 回放</option><option value="completed">已完成小节 / 安全前进</option></select></label><p data-auto-setting></p><p data-detected>自动检测：等待检测</p><p data-task-status></p><button data-inspect>检测</button> <button data-attempt>尝试执行</button> <button data-stop-task>停止自动操作</button>';
                const select = details.querySelector('select'); select.value = this._selectedTask || 'video';
                details.open = !!this._taskControlsOpen;
                details.addEventListener('toggle', () => { this._taskControlsOpen = details.open; });
                const describe = () => {
                    this._selectedTask = select.value;
                    const feature = { video: 'videoPlayback', audio: 'audioPlayback', document: 'document', live: 'live', completed: 'nextLesson' }[select.value];
                    details.querySelector('[data-auto-setting]').textContent = select.value === 'completed' ?
                        `自动前进使用上方下一小节（${this.settings.features.nextLesson ? '开' : '关'}）/ 下一章节（${this.settings.features.nextChapter ? '开' : '关'}）开关` :
                        `自动执行：${this.settings.features[feature] ? '已启用' : '已关闭'}（使用上方对应功能开关；手动尝试仅执行本次）`;
                };
                select.onchange = describe; describe();
                details.querySelector('[data-inspect]').onclick = () => {
                    const info = this._inspectTask();
                    const inventory = info.media?.tasks || [];
                    details.querySelector('[data-task-status]').textContent = inventory.length ? `附件 ${inventory.length} 项：` + inventory.map((task,i) => `${i+1}.${task.kind}：平台信用未知（无已验证的附件级信号），按顺序处理`).join('；') : '未发现可验证的附件级完成信号';
                    details.querySelector('[data-detected]').textContent = `自动检测：${info.blocked ? info.reason : ({ video:'视频',audio:'音频',document:'文档',live:'直播 / 回放' }[info.kind] || '未识别')}${info.completed ? '；平台已有完成标记' : ''}`;
                };
                details.querySelector('[data-attempt]').onclick = event => { if (event.isTrusted) this._attemptTask(select.value); };
                details.querySelector('[data-stop-task]').onclick = () => this.stopAutomation();
                section.prepend(details);
                details.querySelector('[data-task-status]').textContent = this._lastNotice || '尚未手动执行';
            },
            _attemptTask(kind) {
                if (this._destroyed) return;
                if (this._manualBusy || this._isPlaying || ['READING_DOCUMENT','WAITING_CATALOG','ADVANCING'].includes(this._state) || (this._state === 'WAITING_LIVE' && this._liveController)) {
                    this._notify('已有任务正在执行；请先停止自动操作再重试', '安全阻断'); return;
                }
                // A deliberate retry cancels the old generation and rebuilds the
                // inventory; stale discovery caches must not make BLOCKED permanent.
                this._cancelTasks(); this._detachVideoEvents(); this._attachmentSnapshot = null;
                this._state = 'PAUSED_AUTOMATION';
                const info = this._inspectTask();
                if (info.blocked) { this._notify(info.reason, '安全阻断'); return; }
                if ((kind === 'completed' && !info.completed) || (kind !== 'completed' && info.kind !== kind)) {
                    this._notify(kind === 'live' ? '未找到可识别的直播入口；文字标签不足以确认可点击目标' : kind === 'document' ?
                        '未识别到此类型：缺少有归属的文档附件与可验证阅读区域；不会滚动外层网页' : '未识别到此类型；不会改为执行其他任务', '未识别到此类型'); return;
                }
                this._videoEl = null; this._videoContext = null;
                this._externalCompletion = null; this._completionNode = null; this._completionVideo = null;
                this._nextUnitPending = false; this._playPending = false; this._tryTimes = 0;
                this._state = 'READY'; this._manualBusy = true; this._manualPermit = kind; this._automaticStartup = false;
                this._initCellData(); this._notify('已识别，尝试执行所选任务', '已识别，尝试执行');
                if (kind === 'completed') { this._priorChecked = null; if (!this._checkPriorCompletion()) this._block(this._priorFailure || '当前目录身份或平台完成证据尚未稳定，不能安全前进'); }
                else if (kind === 'live' && (info.task?.nativeLink || info.task?.nativeEntry)) this._openNativeLink(info.task, info.scope, true);
                else this.play();
            },
            _openNativeLink(task, scope, manual) {
                const media = this._playableMedia();
                if (!scope.validateScope() || media.unsupported || media.inaccessible || media.videos.length || this._verificationPresent()) return this._block('直播入口与任务范围不一致');
                this._state = 'WAITING_LIVE'; this._isPlaying = false;
                this._detectedKind = '直播 / 回放';
                if (!manual) { this._manualBusy = false; this._notify('检测到直播回放链接；请在任务面板选择直播并点击“尝试执行”（需用户点击打开）', '已识别，等待就绪'); return; }
                this._manualBusy = true;
                task.element.click(); // Native handler/target/URL remain untouched; no unowned window.close().
                this._notify('已请求平台原生入口打开；无法确认新窗口或弹窗是否被拦截。完成后请手动处理，自动返回保持禁用', '已识别，尝试执行');
            },
            _waitForDocument(task) {
                if (this._documentWaitCancel) return;
                if (task.reason && !task.loading) return this._block(task.reason);
                const node = catalog.current(), id = node?.id, title = this._currentStepTitle(), doc = videoAdapter.cardDocument(), generation = this._generation, href = location.href;
                let timer, attempts = 0, cancelled = false;
                const cancel = () => { cleanup(); this._block('页面变化，文档等待已取消'); };
                const cleanup = () => {
                    cancelled = true; clearTimeout(timer); this._timers.delete(timer);
                    for (const type of ['pagehide','beforeunload','popstate','hashchange']) window.removeEventListener(type, cancel);
                    if (this._documentWaitCancel === cleanup) this._documentWaitCancel = null;
                };
                const tick = () => {
                    this._timers.delete(timer); if (cancelled || generation !== this._generation || this._destroyed) return;
                    if (node !== catalog.current() || node?.id !== id || title !== this._currentStepTitle() || doc !== videoAdapter.cardDocument() || href !== location.href || !task.element.isConnected) { cleanup(); return this._block('文档等待期间任务身份已变化'); }
                    const view = documentViewer(task.element);
                    if (view.viewer) { cleanup(); this._state = 'READY'; this.play(); return; }
                    if (!view.loading || ++attempts >= 20) { cleanup(); return this._block(view.reason || '文档加载失败或格式不受支持'); }
                    timer = setTimeout(tick, 500); this._timers.add(timer);
                };
                this._documentWaitCancel = cleanup; this._state = 'WAITING_DOCUMENT';
                this._detectedKind = '文档';
                for (const type of ['pagehide','beforeunload','popstate','hashchange']) window.addEventListener(type, cancel);
                this._notify('检测到文档任务，正在寻找可滚动阅读区域', '已识别，等待就绪'); tick();
            },
            _clearNavigationPreview() {
                clearInterval(this._previewInterval); this._previewInterval = null;
            },
            _navigationPreview() {
                this._clearNavigationPreview(); const deadline = Date.now() + 5000;
                const prefix = this._platformCompletion ? '当前小节已经学习完成' : this._externalCompletion?.kind === 'assessment' ? '已确认可安全前往下一学习项（测验保持未完成）' : '当前小节已完成并通过平台验证';
                const tick = () => this._notify(`${prefix}，${Math.max(0, Math.ceil((deadline - Date.now()) / 1000))} 秒后进入下一节。可点击“停止自动操作”。`, '已完成');
                tick(); this._previewInterval = setInterval(tick, 250);
            },
            _mountSettingsPanel() {
                if (typeof document.createElement !== 'function') return;
                const host = document.createElement('div'); host.id = 'xuexitong-v3-settings';
                host.style.cssText = 'position:fixed;right:8px;top:8px;z-index:2147483647;pointer-events:none';
                const root = host.attachShadow({ mode: 'open' });
                this._settingsPanel = host;
                const render = () => {
                    const previousControls = root.querySelector('[data-task-controls]');
                    if (previousControls) this._taskControlsOpen = previousControls.open;
                    root.innerHTML = '<style>:host{font:12px/1.5 sans-serif;color:#222}details{pointer-events:auto;background:#fff;border:1px solid #aaa;border-radius:6px;box-shadow:0 2px 8px #0002}summary{padding:5px 9px;cursor:pointer}section{width:264px;max-height:65vh;overflow:auto;padding:8px;box-sizing:border-box}label{display:block;margin:3px 0}input[type=number]{width:65px;font:inherit}fieldset{margin:5px 0;padding:4px;border:1px solid #ddd}button,select{font:inherit}p{margin:5px 0}</style><details><summary>学习设置</summary><section><label><input type="checkbox" data-global>随机延迟总开关</label><label>预设 <select data-preset><option value="short">短延迟</option><option value="legacy">旧版长延迟</option><option value="custom">自定义</option></select></label><div data-features></div><div data-delays></div><button type="button" data-reset>恢复默认</button><p>文档、直播仍需已验证适配器。更改设置不会重启已完成任务。</p><p role="status" data-status></p></section></details>';
                    root.querySelector('details').open = !this.settings.collapsed;
                    root.querySelector('[data-global]').checked = this.settings.randomDelaysEnabled;
                    root.querySelector('[data-preset]').value = this.settings.preset;
                    for (const [key, label] of Object.entries(FEATURES)) {
                        const row = document.createElement('label'); const input = document.createElement('input');
                        input.type = 'checkbox'; input.dataset.feature = key; input.checked = this.settings.features[key];
                        row.append(input, label); root.querySelector('[data-features]').append(row);
                    }
                    for (const [key, [label]] of Object.entries(ACTIONS)) {
                        const row = document.createElement('fieldset'); row.dataset.category = key;
                        const legend = document.createElement('legend'); const check = document.createElement('input');
                        check.type = 'checkbox'; check.dataset.enable = key; check.checked = this.settings.delays[key].enabled; legend.append(check, label); row.append(legend);
                        for (const [bound, text] of [['minMs', '最小'], ['maxMs', '最大']]) {
                            const input = document.createElement('input'); input.type = 'number'; input.min = '0'; input.max = '2147483647'; input.step = '1';
                            input.dataset.category = key; input.dataset.bound = bound; input.value = this.settings.delays[key][bound]; input.setAttribute('aria-label', `${label}${text}毫秒`);
                            row.append(text, input);
                        }
                        row.append(' ms'); root.querySelector('[data-delays]').append(row);
                    }
                    root.querySelector('[data-status]').textContent = this._settingsMessage || '仅保存功能和延迟设置，不保存账号或课程信息';
                    this._appendTaskControls(root.querySelector('section'));
                    root.querySelector('details').addEventListener('toggle', event => {
                        this.settings.collapsed = !event.target.open;
                        try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(validateSettings(this.settings))); } catch (_) { /* Page-only settings remain usable. */ }
                    });
                };
                const change = event => {
                    const input = event.target, next = JSON.parse(JSON.stringify(this.settings));
                    if (input.hasAttribute('data-task-type')) return;
                    if (input.dataset.feature) next.features[input.dataset.feature] = input.checked;
                    else if (input.hasAttribute('data-global')) next.randomDelaysEnabled = input.checked;
                    else if (input.hasAttribute('data-preset')) {
                        if (input.value !== 'custom') next.delays = defaultSettings(input.value).delays;
                        next.preset = input.value;
                    } else if (input.dataset.enable) next.delays[input.dataset.enable].enabled = input.checked;
                    else if (input.dataset.bound) {
                        next.delays[input.dataset.category][input.dataset.bound] = input.value.trim() === '' ? NaN : Number(input.value); next.preset = 'custom';
                    }
                    if (!this.updateSettings(next)) root.querySelector('[data-status]').textContent = this._settingsMessage;
                };
                root.addEventListener('change', change);
                root.addEventListener('click', event => { if (event.target.hasAttribute('data-reset')) { this.updateSettings(defaultSettings()); render(); } });
                this._settingsStorage = event => { if (event.key === SETTINGS_KEY) { this.updateSettings(loadSettings(window), false); render(); } };
                window.addEventListener('storage', this._settingsStorage);
                this._renderSettings = render;
                render(); document.body.append(host);
            },
            taskAdapter: null, // Explicit adapters override the built-in native-entry/manual-handoff profile.
            _processedTasks: new WeakSet(),
            _chapterOf(node) {
                for (let el = node; el; el = el.parentElement) {
                    if (el.matches?.('#coursetree > ul > li')) return el;
                }
                return null;
            },
            _nodeTitle(node) {
                return node?.querySelector('.posCatalog_name')?.getAttribute('title') || node?.textContent.trim() || '';
            },
            _verificationPresent() {
                const visit = (doc, depth) => {
                    if (!doc || depth > 4) return true;
                    const body = doc.body?.cloneNode(true);
                    body?.querySelectorAll('script, style').forEach(el => el.remove());
                    if (verificationTitle(body?.textContent || '')) return true;
                    for (const el of doc.querySelectorAll('[title], [aria-label], [placeholder], [alt]')) {
                        if (['title', 'aria-label', 'placeholder', 'alt'].some(attr => verificationTitle(el.getAttribute(attr) || ''))) return true;
                    }
                    for (const frame of doc.querySelectorAll('iframe')) {
                        try { if (visit(frame.contentDocument, depth + 1)) return true; } catch (_) { return true; }
                    }
                    return false;
                };
                return visit(videoAdapter.cardDocument(), 0);
            },
            _assessmentTarget(node) {
                if (this._verificationPresent()) return null;
                const entries = catalog.entries();
                let index = entries.indexOf(node);
                if (index < 0 || !this._chapterOf(node) || !optionalAssessment(this._nodeTitle(node))) return null;
                // Defer consecutive known assessments, never skip another learning leaf.
                while (index < entries.length && optionalAssessment(this._nodeTitle(entries[index]))) {
                    if (entries[index].closest('[aria-disabled="true"], [disabled]')) return null;
                    index++;
                }
                const target = entries[index], title = target && this._nodeTitle(target);
                return target && target.isConnected && this._chapterOf(target) && title &&
                    !assessmentTitle(title) && !verificationTitle(title) &&
                    !/锁定|未解锁|不可访问/.test(target.textContent) &&
                    !target.closest('[aria-disabled="true"], [disabled]') ? target : null;
            },
            _targetAfter(node) {
                const entries = catalog.entries();
                const next = entries[entries.indexOf(node) + 1];
                if (!next) return undefined;
                if (verificationTitle(this._nodeTitle(next))) return null;
                if (!assessmentTitle(this._nodeTitle(next))) return next;
                return this._assessmentTarget(next);
            },
            _taskSet() {
                try {
                    const scope = (this.taskAdapter || platformTaskAdapter).discover({ node: catalog.current(), document: videoAdapter.cardDocument() });
                    if (!scope) return null;
                    if (!Array.isArray(scope.tasks) || typeof scope.validateScope !== 'function' || !scope.validateScope()) return { invalid: true };
                    const belongs = element => {
                        if (!element?.isConnected) return false;
                        let doc = element.ownerDocument;
                        const content = videoAdapter.cardDocument();
                        for (let depth = 0; doc && depth <= 4; depth++) {
                            if (doc === content) return true;
                            try { doc = doc.defaultView?.frameElement?.ownerDocument; } catch (_) { return false; }
                        }
                        return false;
                    };
                    if (!scope.tasks.every(task => ['document', 'live'].includes(task.kind) && belongs(task.element))) return { invalid: true };
                    return scope;
                } catch (_) { return { invalid: true }; }
            },
            _discoverMedia() {
                const scope = this._taskSet();
                if (scope?.invalid) return { videos: [], documents: [], unsupported: true, inaccessible: false };
                const media = videoAdapter.discover(new Set(scope?.tasks.filter(task => task.kind === 'live').map(task => task.element.ownerDocument) || []), scope?.mediaOwnership);
                if (media.tasks) {
                    const snapshot = this._attachmentSnapshot;
                    if (snapshot && (snapshot.root !== media.tasks[0]?.lesson.root || snapshot.id !== catalog.current()?.id ||
                        snapshot.tasks.length !== media.tasks.length || snapshot.tasks.some((task, i) => task.kind !== media.tasks[i].kind || task.attachment !== media.tasks[i].attachment ||
                            task.element !== media.tasks[i].element || task.documents.some((doc, j) => doc !== media.tasks[i].documents[j]) ||
                            task.documents.length !== media.tasks[i].documents.length))) {
                        media.unsupported = true; media.reasons.push('attachment-inventory-changed');
                    }
                    if (!snapshot && !media.pending && !media.unsupported && !media.inaccessible) this._attachmentSnapshot = {
                        root: media.tasks[0]?.lesson.root, id: catalog.current()?.id, tasks: media.tasks };
                    for (const task of media.tasks) task.status = this._completedVideos.has(task.element) ? 'completed' : 'pending';
                }
                return media;
            },
            _playableMedia() {
                const media = this._discoverMedia();
                // The public inventory retains videos/audio separately; the existing
                // completion/recovery coordinator consumes one selected native media list.
                const players = media.tasks ? media.tasks.filter(task => ['video', 'audio'].includes(task.kind) && task.element).map(task => task.element) : [...media.videos, ...(media.audios || [])];
                return { ...media, videos: players };
            },
            _mediaAction(element, next = false) {
                return element?.tagName === 'AUDIO' ? (next ? 'nextAudio' : 'audioStart') : (next ? 'nextVideo' : 'videoStart');
            },
            _taskContextValid(record) {
                try {
                    return !this._destroyed && record.href === window.location.href && record.generation === this._generation &&
                        record.node === catalog.current() && record.title === this._currentStepTitle() &&
                        record.document === videoAdapter.cardDocument() && this.taskAdapter === record.adapter &&
                        record.scope.validateScope() && record.scope.tasks.every(task => task.element.isConnected);
                } catch (_) { return false; }
            },
            _processSupportedTask() {
                if (this._isPlaying) return false;
                const inventory = this._discoverAttachmentTask();
                if (inventory === true) return true;
                if (inventory?.kind === 'video') return false;
                const scope = this._taskSet();
                if (!scope) return false;
                if (scope.invalid || this._verificationPresent()) { this._block('已识别的任务范围已失效或需要验证'); return true; }
                const pending = scope.tasks.find(task => !this._processedTasks.has(task.element));
                if (!pending) {
                    if (!scope.tasks.length) return false;
                    const media = this._playableMedia();
                    if (media.videos.some(video => !this._completedVideos.has(video))) return false;
                    this._verifyExternal(0); return true;
                }
                this._detectedKind = pending.kind === 'document' ? '文档' : '直播 / 回放';
                if (!this.settings.features[pending.kind === 'document' ? 'document' : 'live'] && this._manualPermit !== pending.kind) { this._state = 'PAUSED_AUTOMATION'; this._notify('已识别任务，对应自动执行已关闭'); return true; }
                if (pending.platformDocument && !pending.viewer) { this._waitForDocument(pending); return true; }
                if (pending.nativeLink) { this._openNativeLink(pending, scope, this._manualPermit === 'live'); return true; }
                this._cancelTasks();
                this._detachVideoEvents();
                this._videoEl = null;
                this._isPlaying = false;
                this._playStepTitle = this._currentStepTitle();
                const record = { node: catalog.current(), title: this._playStepTitle,
                    generation: this._generation, href: window.location.href, document: videoAdapter.cardDocument(), adapter: this.taskAdapter, scope,
                    kind: pending.kind, localDone: false };
                this._completionNode = record.node;
                this._completionVideo = null;
                this._externalCompletion = record;
                if (!record.node || !record.document) { this._block('无法识别任务上下文'); return true; }
                const completed = result => {
                    if (!this._taskContextValid(record)) return this._block('任务完成回调已失效');
                    this._documentController = null;
                    this._liveController = null;
                    this._processedTasks.add(pending.element);
                    this._lastProcessedKind = pending.kind;
                    record.localDone = true; record.result = result;
                    this._manualPermit = null; this._manualBusy = false;
                    this._notify(record.kind === 'document' ? '文档本地阅读已完成，正在核对平台完成标记' : '直播会话已结束，正在核对平台完成标记', '已完成');
                    console.log(record.kind === 'document' ? '文档已到可验证底部，仅记为本地操作完成。' : '直播窗口已关闭；本地结束信号不代表平台已计入完成。');
                    this._verifyExternal(0);
                };
                const failed = reason => {
                    if (pending.nativeEntry) {
                        this._settingsMessage = reason;
                        this._renderSettings?.();
                        const summary = this._settingsPanel?.shadowRoot?.querySelector('summary');
                        if (summary) summary.textContent = '学习设置 · 直播需手动处理';
                    }
                    this._block(pending.kind === 'document' ? `文档读取失败：${reason}` : reason);
                };
                if (pending.kind === 'document') {
                    this._state = 'READING_DOCUMENT';
                    this._notify('检测到文档任务，正在逐步阅读', '正在执行');
                    try {
                        let first = true;
                        this._documentController = window.__xuexitongTaskSupport.readDocument({ element: pending.viewer || pending.element,
                            scheduleStep: tick => {
                                const category = first && this._lastProcessedKind === 'document' ? 'nextDocument' : 'documentScroll'; first = false;
                                return this._runAction(category, 'document-step', tick, { defer: true, isValid: () => this._taskContextValid(record) && (pending.viewer || pending.element).clientHeight > 0 });
                            },
                            isValid: () => this._taskContextValid(record) && (!pending.platformDocument || documentViewer(pending.element).viewer === pending.viewer),
                            onProgress: value => this._notify(`文档本地阅读 ${value}%（不代表平台已计入完成）`, '正在执行'),
                            onComplete: () => completed('local-bottom'), onError: failed });
                    } catch (_) { failed('文档视图不支持可验证的滚动'); }
                } else {
                    this._notify('检测到直播回放任务，正在验证入口', '已识别，等待就绪');
                    this._hadLive = true;
                    this._state = 'WAITING_LIVE'; // Set before window.open(), including popup-block failure.
                    try {
                        this._liveController = window.__xuexitongTaskSupport.createParent({ entry: pending.element, nativeEntry: pending.nativeEntry === true,
                            isPlatformComplete: () => this._taskContextValid(record) && catalog.status(record.node) === 'completed',
                            background: this.settings.features.background,
                            generation: record.generation, threshold: this.configs.liveNearEndThreshold,
                            isValid: () => this._state === 'WAITING_LIVE' && this._taskContextValid(record),
                            onResult: completed, onError: failed, scheduleClose: close => this._runAction('liveReturn', 'live-return', () => {
                                this._liveReturnPendingNavigation = true; close();
                            }, { isValid: () => this._taskContextValid(record) && this._state === 'WAITING_LIVE' }) });
                        if (this._liveController.manualOnly) this._liveController.start(); // Safety notice, not an opening action.
                        else this._runAction('liveOpen', 'live-open', () => this._liveController?.start(),
                            { isValid: () => this._taskContextValid(record) && this._state === 'WAITING_LIVE' });
                    } catch (_) { failed('直播入口或通信来源尚不受支持'); }
                }
                return true;
            },
            _discoverAttachmentTask() {
                const media = this._playableMedia();
                if (!media.tasks) return null;
                if (media.pending && !media.unsupported && !media.inaccessible) { this._waitForStartup(); return true; }
                if (media.unsupported || media.inaccessible) { this._block('附件清单无法验证'); return true; }
                const pending = media.tasks.find(task => task.kind === 'document' ? !this._processedTasks.has(task.attachment) : !this._completedVideos.has(task.element));
                if (pending?.kind === 'document') {
                    const scope = this._taskSet();
                    if (scope?.tasks.some(task => task.kind === 'document' && task.element === pending.attachment)) return pending;
                    this._block('文档附件已保留，但缺少可验证的阅读视图，需手动处理'); return true;
                }
                // A playing, seeking or already-ended unprocessed sibling is not silently adopted.
                if (media.tasks.some(task => ['video', 'audio'].includes(task.kind) && task !== pending && !this._completedVideos.has(task.element) &&
                    (!task.element.paused || task.element.seeking || task.element.ended))) {
                    this._block('其他附件播放器正在活动或完成来源不明确'); return true;
                }
                return pending;
            },
            _verifyExternal(attempt) {
                const record = this._externalCompletion;
                if (!record?.localDone || !this._taskContextValid(record)) return this._block('本地任务完成上下文无效');
                this._state = 'VERIFYING_COMPLETION';
                const scope = this._taskSet();
                if (!scope || scope.invalid) return this._block('任务范围无法验证');
                const media = this._playableMedia();
                if (media.inaccessible || media.unsupported || media.navigationSafe === false) return this._block('任务包含未知或不可访问的内容');
                if (scope.tasks.some(task => !this._processedTasks.has(task.element)) ||
                    media.videos.some(video => !this._completedVideos.has(video))) {
                    this._liveReturnPendingNavigation = false;
                    this._state = 'DISCOVERING'; this.play(); return;
                }
                if ((record.kind === 'document' || this._hadLive || media.videos.length) && catalog.status(record.node) !== 'completed') {
                    if (attempt >= this.configs.maxRetries) return this._block('本地操作已结束，但平台尚未确认完成；不会跳过未完成任务');
                    this._schedule(() => this._verifyExternal(attempt + 1), this.configs.retryInterval); return;
                }
                this._state = 'READY_TO_ADVANCE';
                this.nextUnit();
            },
            _externalNavigationEligible(target) {
                const record = this._externalCompletion;
                if (!record || this._isPlaying || !record.localDone || record.node !== catalog.current() ||
                    record.title !== this._currentStepTitle() || record.href !== window.location.href || record.generation !== this._generation || this._destroyed) return false;
                if (record.kind === 'assessment') return this._assessmentTarget(record.node) === target;
                if (this._isChapterTest() || !this._taskContextValid(record) || this._targetAfter(record.node) !== target) return false;
                const media = this._playableMedia();
                if (media.inaccessible || media.unsupported || media.navigationSafe === false || record.scope.tasks.some(task => !this._processedTasks.has(task.element))) return false;
                if ((record.kind === 'document' || this._hadLive || media.videos.length) && catalog.status(record.node) !== 'completed') return false;
                return media.videos.every(video => video.ended && this._completedVideos.has(video));
            },
            _navigationEligible(target) {
                if (this._platformCompletion) return this._priorCompletionValid(this._platformCompletion) && this._targetAfter(this._completionNode) === target && !this._isPlaying;
                if (this._externalCompletion) return this._externalNavigationEligible(target);
                if (!this._refreshVideoContext()) return false;
                if (this._destroyed || this._isPlaying || this._isChapterTest() ||
                    catalog.current() !== this._completionNode ||
                    this._currentStepTitle() !== this._playStepTitle ||
                    catalog.status(this._completionNode) !== 'completed' ||
                    !this._completionVideo?.isConnected || !this._completionVideo.ended ||
                    document.querySelectorAll('.prev_list .prev_white').length > 1) return false;
                const entries = catalog.entries();
                const index = entries.indexOf(this._completionNode);
                if (index < 0 || this._targetAfter(this._completionNode) !== target ||
                    assessmentTitle(target?.querySelector('.posCatalog_name')?.getAttribute('title') ||
                        target?.textContent || '')) return false;
                const tasks = this._playableMedia();
                return !tasks.inaccessible && !tasks.unsupported && tasks.navigationSafe !== false &&
                    (!tasks.tasks || tasks.tasks.every(task => ['video', 'audio'].includes(task.kind) && this._completedVideos.has(task.element))) &&
                    tasks.videos.includes(this._completionVideo) &&
                    tasks.videos.every(video => video.ended && this._completedVideos.has(video));
            },
            _queueNavigation(target) {
                if (this._state !== 'READY_TO_ADVANCE') return;
                if (this._actions.pending.has('navigation')) return;
                if (!this._navigationEligible(target)) return this._block('导航条件已变化');
                const entries = catalog.entries(), adjacent = entries[entries.indexOf(this._completionNode) + 1];
                const assessment = this._externalCompletion?.kind === 'assessment' || adjacent !== target;
                const chapter = this._chapterOf(target) !== this._chapterOf(this._completionNode);
                const category = assessment ? 'assessment' : this._liveReturnPendingNavigation ? 'liveReturn' : chapter ? 'nextChapter' : 'nextLesson';
                if (!this.settings.features[chapter ? 'nextChapter' : 'nextLesson'] || !this._actionEnabled(category)) {
                    this._state = 'PAUSED_AUTOMATION'; return;
                }
                const uniqueId = element => element?.id && Array.from(document.querySelectorAll('[id]')).filter(other => other.id === element.id).length === 1 ? element.id : '';
                const targetId = uniqueId(target), targetTitle = this._nodeTitle(target), targetChapter = this._chapterOf(target);
                const chapterId = uniqueId(targetChapter);
                const topology = this._catalogTopology();
                this._navigationIntent = Object.freeze({ sourceId: this._completionNode.id, sourceTitle: this._nodeTitle(this._completionNode),
                    targetId, targetTitle, topology, href: location.href, generation: this._generation,
                    evidence: this._platformCompletion ? 'platform-credit' : this._externalCompletion?.kind || 'natural-ended' });
                const resolveTarget = () => {
                    if (!target.isConnected) {
                        if (!targetId) return false;
                        const matches = Array.from(document.querySelectorAll('[id]')).filter(el => el.id === targetId);
                        if (matches.length !== 1 || !catalog.entries().includes(matches[0])) return false;
                        target = matches[0];
                    }
                    const chapter = this._chapterOf(target);
                    return this._nodeTitle(target) === targetTitle && (!targetId || (target.id === targetId &&
                        Array.from(document.querySelectorAll('[id]')).filter(el => el.id === targetId).length === 1)) &&
                        (chapter === targetChapter || (!targetChapter?.isConnected && chapterId && chapter?.id === chapterId &&
                            Array.from(document.querySelectorAll('[id]')).filter(el => el.id === chapterId).length === 1) ||
                            (!targetChapter?.isConnected && !chapterId && topology && this._catalogTopology() === topology));
                };
                this._state = 'NAVIGATION_COOLDOWN';
                this._manualBusy = false; this._manualPermit = null;
                this._navigationPreview();
                this._runAction(category, 'navigation', () => {
                    this._clearNavigationPreview();
                    if (this._state !== 'NAVIGATION_COOLDOWN' || !resolveTarget() || !this._navigationEligible(target)) return this._block('冷却后导航条件失效');
                    this._liveReturnPendingNavigation = false;
                    this._state = 'READY_TO_ADVANCE'; this.playCurrentIndex(target);
                }, { delayMs: 5000, isValid: () => {
                    this._navigationFailure = '';
                    if (location.href !== this._navigationIntent.href) this._navigationFailure = '导航预告期间路由已变化';
                    else if (!resolveTarget()) this._navigationFailure = '授权目标缺失或身份不唯一';
                    else if (!this._navigationEligible(target)) this._navigationFailure = '来源身份、平台完成证据或任务归属已失效';
                    return !this._navigationFailure;
                }, onCancel: () => this._clearNavigationPreview() });
            },
            _cooldownCleanup: null,
            _state: 'DISCOVERING',
            _generation: 0,
            _timers: new Set(),
            _completedVideos: new WeakSet(),
            _completionNode: null,
            _completionVideo: null,
            _catalogTopology() {
                const entries = catalog.entries(), chapters = Array.from(document.querySelectorAll('#coursetree > ul > li'));
                const keyedElements = Array.from(document.querySelectorAll('[id]'));
                const keys = entries.map(node => [chapters.indexOf(this._chapterOf(node)), node.id]);
                if (!keys.length || keys.some(([chapter, id]) => chapter < 0 || !id || keyedElements.filter(el => el.id === id).length !== 1)) return null;
                return JSON.stringify(keys); // In-memory ordered keys/grouping, never persisted or logged.
            },
            _refreshVideoContext() {
                const context = this._videoContext, node = catalog.current();
                if (!context || this._destroyed || context.generation !== this._generation ||
                    context.href !== window.location.href || context.document !== videoAdapter.cardDocument() ||
                    context.video !== this._videoEl || !context.video.isConnected || !node ||
                    context.video.ownerDocument !== context.playerDocument ||
                    context.stepTitle !== this._currentStepTitle() || this._nodeTitle(node) !== context.nodeTitle) return false;
                const keyedElements = Array.from(document.querySelectorAll('[id]'));
                if (context.id && (node.id !== context.id || keyedElements.filter(el => el.id === context.id).length !== 1)) return false;
                const chapter = this._chapterOf(node);
                const sameChapter = chapter && (!context.chapterId || (chapter.id === context.chapterId &&
                    keyedElements.filter(el => el.id === context.chapterId).length === 1)) && (chapter === context.chapter ||
                    (!context.chapter?.isConnected && context.chapterId && chapter.id === context.chapterId &&
                        keyedElements.filter(el => el.id === context.chapterId).length === 1) ||
                    (!context.chapter?.isConnected && !context.chapterId && context.topology && this._catalogTopology() === context.topology));
                if (!sameChapter) return false;
                const media = this._playableMedia();
                if (media.inaccessible || media.unsupported || !media.videos.includes(context.video)) return false;
                const source = context.video.currentSrc || context.video.getAttribute('src') || '';
                if (context.source && source !== context.source) return false;
                if (!context.source && source) context.source = source;
                if (node === this._playNode) return true;
                // Only replace a detached member of this task's proven lineage. A title
                // match never authorizes rebinding a connected or different task node.
                if (this._playNode?.isConnected || !context.nodes.has(this._playNode) || !context.id) return false;
                const previous = this._playNode;
                context.nodes.add(node); this._playNode = node;
                if (this._completionNode === previous) this._completionNode = node;
                return true;
            },
            _sameVideoTaskNode(node) {
                return node === catalog.current() || (!!node && !node.isConnected &&
                    this._videoContext?.nodes.has(node) && this._refreshVideoContext());
            },
            _schedule(callback, delay) {
                const generation = this._generation;
                const node = catalog.current();
                const timer = setTimeout(() => {
                    this._timers.delete(timer);
                    if (generation !== this._generation || this._destroyed) return;
                    if (!this._sameVideoTaskNode(node)) return this._block('页面目录已变化，请执行 app.run() 重新识别');
                    callback();
                }, delay);
                this._timers.add(timer);
                return timer;
            },
            _cancelTasks() {
                this._documentWaitCancel?.(); this._clearNavigationPreview();
                this._mediaReadyCancel?.(); this._clearAudioNotice?.();
                this._platformCompletion = null;
                this._catalogTransitionCancel?.();
                this._startupCancel?.(); this._automaticStartup = false;
                this._actions?.cancelAll();
                this._documentController?.cancel();
                this._documentController = null;
                this._liveController?.dispose();
                this._liveController = null;
                this._generation++;
                this._playPending = false;
                for (const timer of this._timers) clearTimeout(timer);
                this._timers.clear();
                if (this._delayedNextUnitTimer) clearTimeout(this._delayedNextUnitTimer);
                this._delayedNextUnitTimer = null;
                this._clearCheckInterval();
            },
            _block(reason) {
                this._state = 'BLOCKED';
                this._isPlaying = false;
                this._nextUnitPending = false;
                this._cancelTasks();
                this._detachVideoEvents();
                this._manualBusy = false; this._manualPermit = null;
                this._notify(reason, '安全阻断');
                console.warn(`自动导航已停止：${reason}。请手动处理后执行 app.run()。`);
            },
            _completeVideo(video) {
                if (!video || !video.isConnected || !video.ended || video !== this._videoEl ||
                    this._completedVideos.has(video) || this._state !== 'PLAYING') return;
                if (!this._refreshVideoContext()) {
                    return this._block('播放器完成事件属于已离开的页面');
                }
                console.log('视频自然播放结束，等待内容发现及平台完成确认。');
                this._completedVideos.add(video);
                this._completionVideo = video;
                this._completionNode = catalog.current();
                this._isPlaying = false;
                this._clearCheckInterval();
                this._state = 'VERIFYING_COMPLETION';
                this._notify('媒体已自然结束，正在等待平台完成确认', '已完成');
                this._schedule(() => this._continueCompleted(0), 1000);
            },
            _continueCompleted(attempt) {
                if (this._state !== 'VERIFYING_COMPLETION') return;
                if (!this._refreshVideoContext()) return this._block('完成事件的任务或播放器身份无法确认');
                if (this._isChapterTest()) return this._advanceChapterTest();
                if (this._processSupportedTask()) return;
                if (!this._completionNode || catalog.current() !== this._completionNode ||
                    this._currentStepTitle() !== this._playStepTitle) {
                    return this._block('完成事件与当前目录不匹配');
                }
                const tasks = this._playableMedia();
                if (tasks.inaccessible || tasks.unsupported) return this._block('存在不可访问或不支持的媒体组件');
                if (tasks.navigationSafe === false) return this._block('未确认的任务内容禁止自动离开课节');
                if (!tasks.videos.includes(this._completionVideo)) return this._block('播放器已替换，完成状态不明确');
                const next = tasks.videos.find(video => !this._completedVideos.has(video));
                if (next) {
                    this._videoEl = next;
                    this._state = 'READY';
                    this._nextVideoRequested = true;
                    this.play();
                    return;
                }
                // Outer samples provide no mapping from numeric tabs to task types.
                if (document.querySelectorAll('.prev_list .prev_white').length > 1) {
                    return this._block('多个内容页签的完成关系尚未验证');
                }
                if (catalog.status(this._completionNode) === 'completed') {
                    this._state = 'READY_TO_ADVANCE';
                    this.nextUnit();
                } else if (attempt < this.configs.maxRetries) {
                    this._schedule(() => this._continueCompleted(attempt + 1), this.configs.retryInterval);
                } else {
                    this._block('视频自然结束，但平台尚未确认当前节点完成');
                }
            },
            _clearCheckInterval() {
                if (this._checkInterval) {
                    clearInterval(this._checkInterval);
                    this._checkInterval = null;
                }
            },
            _startVideoMonitoring() {
                this._clearCheckInterval();
                this._guardLastTime = 0;
                this._guardLastWallTs = 0;
                this._guardLastResumeTs = 0;
                this._checkInterval = setInterval(() => {
                    this._checkVideoStatus();
                }, this.configs.videoCheckInterval);
            },
            _tryResumePlayback(reason) {
                if (!this.settings.features.background) return;
                const now = Date.now();
                if (now - this._guardLastResumeTs < this.configs.guardResumeCooldownMs) {
                    return;
                }
                this._guardLastResumeTs = now;

                const video = this._getVideoEl();
                if (!video || !this._isPlaying) return;
                if (video.ended) { this._completeVideo(video); return; }
                const generation = this._generation;

                console.log(`%c触发视频保活恢复(${reason})`, "color:#607D8B");
                video.play().catch((e) => {
                    if (generation !== this._generation || !this._isPlaying || !video.isConnected ||
                        video !== this._videoEl || !this._refreshVideoContext()) return;
                    if (video.ended) { this._completeVideo(video); return; }
                    if (video.tagName === 'AUDIO') { this._audioPlayRejected(video, e); return; }
                    console.warn("直接恢复播放失败，尝试静音恢复:", e);
                    video.muted = true;
                    video.play().catch((err) => {
                        console.error("静音恢复播放失败:", err);
                    });
                });
            },
            _checkVideoStatus() {
                try {
                    const video = this._getVideoEl();
                    if (!video) return;
                    if (video.ended) { this._completeVideo(video); return; }

                    if (video.paused && this._isPlaying) {
                        console.log("%c检测到视频暂停，尝试恢复播放...", "color:#FF5722");
                        this._tryResumePlayback("paused");
                    } else if (this._isPlaying && !video.ended) {
                        const now = Date.now();
                        const current = Number(video.currentTime || 0);
                        if (this._guardLastWallTs === 0) {
                            this._guardLastWallTs = now;
                            this._guardLastTime = current;
                        } else {
                            const stalled = Math.abs(current - this._guardLastTime) < 0.01;
                            const stalledMs = now - this._guardLastWallTs;
                            if (stalled && stalledMs >= this.configs.guardNoProgressMs) {
                                this._tryResumePlayback("no-progress");
                                this._guardLastWallTs = now;
                                this._guardLastTime = Number(video.currentTime || 0);
                            } else if (!stalled) {
                                this._guardLastWallTs = now;
                                this._guardLastTime = current;
                            }
                        }
                    }

                } catch (e) {
                    console.error("视频状态检查失败:", e);
                }
            },
            _tryTimes: 0,
            _stepAdvanceTimes: 0,
            _stepSwitchAt: 0,
            _stepSwitchPending: false,
            _delayedNextUnitTimer: null,
            _guardLastTime: 0,
            _guardLastWallTs: 0,
            _guardLastResumeTs: 0,
            // Prior platform credit is independent of local ended events. Require an
            // own zero-count AND own completion marker; attachment icons cannot prove a lesson.
            _observeCredit() {
                const node = catalog.current(), doc = videoAdapter.cardDocument();
                if (!node || !doc || this._videoContext || catalog.status(node) !== 'unknown' ||
                    (this._creditObserved?.node === node && this._creditObserved.doc === doc)) return false;
                this._creditObserved = { node, doc };
                const id = node.id, title = this._nodeTitle(node), generation = this._generation;
                let attempts = 0;
                const tick = () => {
                    if (generation !== this._generation || this._destroyed) return;
                    if (catalog.current() !== node || node.id !== id || this._nodeTitle(node) !== title || videoAdapter.cardDocument() !== doc) return this._block('完成观察期间任务身份已变化');
                    if (catalog.status(node) === 'completed') { this._state = 'READY'; this.play(); return; }
                    if (catalog.status(node) === 'incomplete' || ++attempts >= 12) {
                        const media = this._playableMedia();
                        if (catalog.status(node) === 'unknown' && !media.videos.length && !media.tasks?.length && !this._taskSet()?.tasks.length) return this._block('平台完成状态仍未知，有限观察已结束；未跳过当前小节');
                        this._state = 'READY'; this.play(); return;
                    }
                    this._schedule(tick, 500);
                };
                this._state = 'WAITING_CREDIT'; this._notify('平台完成状态暂未确定，正在有限观察；超时不会视为完成');
                this._schedule(tick, 500); return true;
            },
            _priorProof(node) {
                return catalog.status(node) === 'completed';
            },
            _priorCompletionValid(record) {
                const active = catalog.current();
                if (record.node !== active && !record.node.isConnected && active?.id === record.id &&
                    this._nodeTitle(active) === record.name && this._catalogTopology() === record.topology &&
                    [...document.querySelectorAll('[id]')].filter(el => el.id === record.id).length === 1) {
                    if (this._completionNode === record.node) this._completionNode = active;
                    record = { ...record, node: active, chapter: this._chapterOf(active), doc: videoAdapter.cardDocument() };
                }
                if (this._destroyed || record.generation !== this._generation || record.href !== location.href ||
                    catalog.current() !== record.node || record.node.id !== record.id || !record.node.isConnected || !this._priorProof(record.node) ||
                    this._catalogTopology() !== record.topology || this._chapterOf(record.node) !== record.chapter ||
                    this._currentStepTitle() !== record.title || !videoAdapter.cardDocument() ||
                    this._nodeTitle(record.node) !== record.name || this._isChapterTest()) return false;
                const media = this._playableMedia();
                // Whole-lesson credit is authoritative; media readiness is not
                // completion evidence. Security/active-task contradictions remain blocking.
                if (this._verificationPresent() || media.reasons?.some(reason => /assessment|verification/.test(reason))) { this._priorFailure = '检测到测验或身份验证，不能自动前进'; return false; }
                if (media.inaccessible) { this._priorFailure = '存在不可访问的任务框架，不能确认安全范围'; return false; }
                if (media.reasons?.some(reason => /competing/.test(reason))) { this._priorFailure = '存在竞争播放任务，不能自动前进'; return false; }
                this._priorFailure = ''; return true;
            },
            _checkPriorCompletion() {
                if (this._videoContext || this._isPlaying) return false;
                const node = catalog.current(), doc = videoAdapter.cardDocument();
                if (!node || !doc || (this._priorChecked?.node === node && this._priorChecked.doc === doc) || !this._priorProof(node)) return false;
                const media = this._playableMedia();
                const record = { node, doc, id: node.id, topology: this._catalogTopology(), chapter: this._chapterOf(node), generation: this._generation, href: location.href, title: this._currentStepTitle(),
                    name: this._nodeTitle(node), players: [...media.videos], sources: media.videos.map(el => el.currentSrc || el.getAttribute('src') || ''),
                    attachments: (media.tasks || []).map(task => task.attachment) };
                if (!this._priorCompletionValid(record)) return false;
                if (!node.id || document.querySelectorAll(`[id="${CSS.escape(node.id)}"]`).length !== 1 ||
                    this._completedVisits?.has(node.id)) { this._block('已完成目录重复或身份不明确'); return true; }
                this._state = 'VERIFYING_PLATFORM_COMPLETION';
                this._schedule(() => {
                    if (!this._priorCompletionValid(record)) return this._block('既有平台完成证据或课程身份已变化');
                    this._priorChecked = { node, doc }; this._completedVisits ||= new Set();
                    this._platformCompletion = record; this._completionNode = node;
                    this._state = 'READY_TO_ADVANCE'; this.nextUnit();
                }, 250);
                return true;
            },
            _waitForMediaReady(el, actionReady) {
                if (this._mediaReadyCancel) return;
                const generation = this._generation, node = catalog.current(), doc = videoAdapter.cardDocument(), href = location.href;
                const id = node?.id, title = this._nodeTitle(node), source = el.currentSrc || el.getAttribute('src') || '';
                let timer, tries = 0, closed = false;
                const cleanup = () => {
                    closed = true;
                    clearTimeout(timer); this._timers.delete(timer);
                    el.removeEventListener('loadeddata', tick); el.removeEventListener('canplay', tick);
                    for (const type of ['pagehide','beforeunload','popstate','hashchange']) window.removeEventListener(type, cancel);
                    document.removeEventListener('click', interaction, true);
                    if (this._mediaReadyCancel === cleanup) this._mediaReadyCancel = null;
                };
                const cancel = () => { cleanup(); this._block('媒体等待已取消'); };
                const interaction = event => { if (event.isTrusted && !event.composedPath().includes(this._settingsPanel)) cancel(); };
                const tick = () => {
                    if (closed) return;
                    clearTimeout(timer); this._timers.delete(timer);
                    if (generation !== this._generation || this._destroyed) return cleanup();
                    const media = this._playableMedia();
                    if (node !== catalog.current() || node?.id !== id || this._nodeTitle(node) !== title ||
                        (source && source !== (el.currentSrc || el.getAttribute('src') || '')) || doc !== videoAdapter.cardDocument() || href !== location.href ||
                        !el.isConnected || media.unsupported || media.inaccessible || !media.videos.includes(el)) { cleanup(); return this._block('等待期间媒体任务已变化'); }
                    if (el.readyState >= 2) { cleanup(); this._state = 'READY'; this.play(actionReady); return; }
                    if (++tries >= 80) { cleanup(); return this._block('选中媒体未就绪，请手动加载后重试'); }
                    timer = setTimeout(tick, 250); this._timers.add(timer);
                };
                this._state = 'WAITING_MEDIA'; this._mediaReadyCancel = cleanup;
                this._notify('已识别媒体，等待播放器就绪', '已识别，等待就绪');
                el.addEventListener('loadeddata', tick); el.addEventListener('canplay', tick);
                for (const type of ['pagehide','beforeunload','popstate','hashchange']) window.addEventListener(type, cancel);
                document.addEventListener('click', interaction, true);
                if (el.currentSrc || el.getAttribute('src') || el.querySelector('source[src]')) el.load();
                tick();
            },
            _clearAudioNotice() {
                const state = this._audioState;
                if (state) state.el.removeEventListener('volumechange', state.listener);
                this._audioNotice?.remove(); this._audioNotice = null; this._audioState = null;
            },
            _prepareAudio(el) {
                if (this._audioState?.el === el && this._audioState.generation === this._generation) return;
                this._clearAudioNotice();
                this._audioState = { el, generation: this._generation, waiting: false, listener: () => this._renderAudioNotice() };
                el.removeAttribute('muted'); el.defaultMuted = false; el.muted = false;
                if (el.volume === 0) el.volume = 1;
                el.addEventListener('volumechange', this._audioState.listener);
            },
            _audioPlayRejected(el, error) {
                if (!this._audioState || el !== this._audioState.el || !this._refreshVideoContext() || el.ended) return;
                this._audioState.waiting = true; this._audioState.error = error?.name || '播放失败';
                this._state = 'WAITING_AUDIO_GESTURE'; this._isPlaying = false; this._clearCheckInterval(); this._renderAudioNotice();
                this._notify('音频播放被拒绝；请使用下方音频按钮手动播放', '执行失败');
            },
            _renderAudioNotice() {
                const state = this._audioState, el = state?.el;
                if (!el?.isConnected || state.generation !== this._generation) return this._clearAudioNotice();
                this._audioNotice?.remove(); this._audioNotice = null;
                if (!state.waiting && !el.muted && el.volume > 0) return;
                const host = document.createElement('div'); this._audioNotice = host;
                host.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:2147483646;max-width:280px';
                const root = host.attachShadow({ mode: 'open' });
                const label = document.createElement('div'); label.style.cssText = 'padding:10px;background:#fff;color:#222;border:1px solid #888;font:13px sans-serif';
                label.textContent = state.waiting ? `音频需要手动播放（${state.error}）` : el.muted ? '音频已静音' : '音频音量为零';
                for (const [text, muted] of [['有声播放', false], ['本次允许静音继续', true]]) {
                    const button = document.createElement('button'); button.textContent = text;
                    button.addEventListener('click', event => {
                        if (!event.isTrusted || state !== this._audioState || state.generation !== this._generation ||
                            (!this.settings.features.audioPlayback && this._manualPermit !== 'audio') || !this._refreshVideoContext() || el.ended || this._playPending) return;
                        el.defaultMuted = false; el.muted = muted; if (!muted && el.volume === 0) el.volume = 1;
                        el.playbackRate = 1; this._state = 'PLAYING'; this._isPlaying = true; this._playPending = true;
                        const result = el.play();
                        Promise.resolve(result).then(() => {
                            if (state !== this._audioState || !this._refreshVideoContext()) return;
                            this._playPending = false; state.waiting = false; this._startVideoMonitoring(); this._renderAudioNotice();
                            this._manualBusy = false; this._manualPermit = null; this._notify('音频正在播放（1.0x）', '正在执行');
                        }, error => { if (state === this._audioState) { this._playPending = false; this._audioPlayRejected(el, error); } });
                    }); label.append(button);
                }
                root.append(label); document.body.append(host);
            },
            async play(actionReady = false) {
                try {
                    if (this._isChapterTest()) {
                        this._advanceChapterTest();
                        return;
                    }
                    if (this._destroyed || ['BLOCKED', 'ADVANCING', 'WAITING_CATALOG', 'WAITING_STARTUP', 'WAITING_CREDIT', 'WAITING_MEDIA', 'WAITING_DOCUMENT', 'WAITING_AUDIO_GESTURE', 'VERIFYING_PLATFORM_COMPLETION', 'VERIFYING_COMPLETION', 'NAVIGATION_COOLDOWN', 'WAITING_LIVE', 'READING_DOCUMENT', 'PAUSED_AUTOMATION', 'FINISHED'].includes(this._state)) return;
                    if (this._state === 'PLAYING' && !this._refreshVideoContext()) {
                        return this._block('当前播放页面或播放器已变化');
                    }
                    if (this._playPending || this._actions.pending.has('video-start') || this._actions.pending.has('video-tab')) return;
                    if (this._checkPriorCompletion() || this._observeCredit()) return;
                    if (this._processSupportedTask()) return;
                    this._state = 'DISCOVERING';
                    const tasks = this._playableMedia();
                    if (tasks.inaccessible || tasks.unsupported) return this._block('存在不可访问或不支持的媒体组件');
                    const el = this._getVideoEl();
                    if (el == null) {
                        if (this._advanceLearningStep()) {
                            this._state = 'LOADING';
                            this._schedule(() => this.play(), 2000);
                            return;
                        }
                        const hasCards = document.querySelector('iframe[info="card"], iframe[src*="/knowledge/cards"]');
                        if (hasCards || videoTitle(this._currentStepTitle())) {
                            this._state = 'LOADING';
                            throw new Error('视频组件尚未加载完成或当前组件不受支持');
                        }
                        return this._block('未知或不支持的内容，禁止自动跳过');
                    }
                    if (!catalog.current()) return this._block('无法唯一确定当前目录节点');
                    if (this._completedVideos.has(el)) return;
                    if (this._isPlaying && !el.paused && !el.ended) { this._state = 'PLAYING'; return; }
                    if (!this._actionEnabled(this._mediaAction(el, this._nextVideoRequested))) { this._state = 'PAUSED_AUTOMATION'; return; }
                    if (el.readyState < 2) { this._waitForMediaReady(el, actionReady); return; }
                    if (!actionReady && this._preparedVideoNode !== catalog.current()) {
                        const category = this._mediaAction(el, this._nextVideoRequested);
                        this._state = 'ACTION_PENDING';
                        this._runAction(category, 'video-start', () => { this._state = 'READY'; this.play(true); },
                            { isValid: () => el.isConnected && !el.ended && !this._completedVideos.has(el) && el === this._getVideoEl() });
                        return;
                    }
                    this._preparedVideoNode = null;
                    this._nextVideoRequested = false;
                    const generation = this._generation;
                    const node = catalog.current();
                    this._playNode = node;
                    this._playStepTitle = this._currentStepTitle();
                    const chapter = this._chapterOf(node);
                    const uniqueId = element => element?.id && Array.from(document.querySelectorAll('[id]')).filter(other => other.id === element.id).length === 1 ? element.id : '';
                    this._videoContext = { id: uniqueId(node), nodeTitle: this._nodeTitle(node), stepTitle: this._playStepTitle,
                        chapter, chapterId: uniqueId(chapter), video: el, playerDocument: el.ownerDocument, document: videoAdapter.cardDocument(),
                        source: el.currentSrc || el.getAttribute('src') || '',
                        topology: this._catalogTopology(),
                        href: window.location.href, generation, nodes: new WeakSet([node]) };
                    this._state = 'PLAYING';
                    this._isPlaying = true;
                    this._detectedKind = el.tagName === 'AUDIO' ? '音频' : '视频';
                    this._notify(`检测到${this._detectedKind}任务，正在尝试播放`, '已识别，尝试执行');
                    this._videoEventHandle();
                    el.playbackRate = 1.0;
                    if (el.tagName === 'AUDIO') this._prepareAudio(el); else this._clearAudioNotice();

                    try {
                        this._playPending = true;
                        await el.play();
                        if (generation === this._generation) this._playPending = false;
                        if (generation !== this._generation || !this._sameVideoTaskNode(node) ||
                            !el.isConnected || this._state !== 'PLAYING') return;
                        this._tryTimes = 0;
                        this._automaticStartup = false;
                        this._observedLessonId = node.id; this._observedCard = this._cardIdentity();
                        console.log(`%c视频开始播放，倍速: ${el.playbackRate}x`, "color:#4CAF50");
                        this._startVideoMonitoring();
                        this._manualBusy = false; this._manualPermit = null;
                        this._notify(`${this._detectedKind}正在播放（1.0x）`, '正在执行');
                        if (el.tagName === 'AUDIO') this._renderAudioNotice();
                    } catch (playError) {
                        if (generation === this._generation) this._playPending = false;
                        console.error("视频播放失败:", playError);
                        if (generation === this._generation && this._sameVideoTaskNode(node) && this._state === 'PLAYING') {
                            if (el.ended) this._completeVideo(el); else this._handlePlayError(playError);
                        }
                    }
                } catch (e) {
                    if (this._tryTimes >= this.configs.maxRetries) {
                        console.error("%c视频播放失败，已达到最大重试次数", "color:#F44336;font-weight:bold", e);
                        this._block('播放器加载或播放重试已达上限');
                        return;
                    }
                    this._tryTimes++;
                    console.log(`%c播放失败，${this.configs.retryInterval/1000}秒后重试 (${this._tryTimes}/${this.configs.maxRetries})`, "color:#FF9800");
                    this._schedule(() => {
                        this.play();
                    }, this.configs.retryInterval);
                }
            },
            _advanceLearningStep() {
                if (this._currentStepTitle() !== '学习目标') return false;
                const tabs = $('.prev_white:visible').filter((_, el) => videoTitle($(el).text())).toArray();
                if (tabs.length !== 1 || this._stepSwitchPending) return false;
                this._stepSwitchPending = true;
                this._stepSwitchAt = Date.now();
                this._runAction('videoStart', 'video-tab', () => {
                    tabs[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                    this._preparedVideoNode = catalog.current();
                }, { isValid: () => tabs[0].isConnected });
                return true;
            },
            _currentStepTitle() {
                const prevTitle = document.getElementsByClassName('prev_title')[0];
                return prevTitle ? (prevTitle.title || prevTitle.textContent || '').trim() : '';
            },
            _isChapterTest() {
                return assessmentTitle(this._currentStepTitle()) ||
                    assessmentTitle(catalog.current()?.querySelector('.posCatalog_name')?.getAttribute('title') || '');
            },
            _advanceChapterTest() {
                if (['NAVIGATION_COOLDOWN', 'WAITING_LIVE', 'READING_DOCUMENT', 'ADVANCING'].includes(this._state)) return;
                const node = catalog.current();
                const target = node && this._assessmentTarget(node);
                if (!target || !optionalAssessment(this._currentStepTitle())) {
                    return this._block('测验、作业或验证内容无法安全跨章，不会自动提交或跳过');
                }
                this._cancelTasks();
                this._isPlaying = false;
                this._detachVideoEvents();
                this._completionNode = node;
                this._completionVideo = null;
                this._externalCompletion = { kind: 'assessment', localDone: true, node, generation: this._generation,
                    title: this._currentStepTitle(), href: window.location.href };
                this._state = 'READY_TO_ADVANCE';
                this._queueNavigation(target);
            },
            _bindStepNavigation() {
                this._bindCatalogNavigation();
                if (this._stepNavigationBound) {
                    return;
                }
                this._stepNavigationBound = true;

                const reenterVideoMode = () => {
                    this._cancelTasks();
                    this._state = 'LOADING';
                    this._tryTimes = 0;
                    this._videoEl = null;
                    this._isPlaying = false;
                    this._stepSwitchPending = true;
                    this._stepSwitchAt = Date.now();
                    this._schedule(() => {
                        try {
                            this._initCellData();
                        } catch (e) {}
                        this.play();
                    }, 1800);
                };

                $(document).off('click.xuexitongPlayerV3', '.prev_white').on('click.xuexitongPlayerV3', '.prev_white', (e) => {
                    const text = ($(e.currentTarget).text() || "").replace(/\s+/g, "");
                    if (videoTitle(text)) {
                        console.log(`%c检测到步骤切换点击：${text}，准备重新接管视频页`, "color:#607D8B");
                        reenterVideoMode();
                    }
                });
            },
            _cardIdentity() {
                const media = videoAdapter.discover();
                return [videoAdapter.cardFrame(), videoAdapter.cardDocument(), ...media.documents, ...media.videos,
                    ...(media.audios || []), ...(media.tasks || []).map(task => task.attachment),
                    ...media.documents.flatMap(doc => Array.from(doc.querySelectorAll('a.liveHref, form')))];
            },
            _bindCatalogNavigation() {
                if (this._catalogObserver || typeof MutationObserver === 'undefined') return;
                this._observedLessonId = catalog.current()?.id;
                this._observedCard = this._cardIdentity();
                this._catalogClick = event => {
                    const label = event.target.closest?.('#coursetree .posCatalog_name');
                    const target = label?.closest('.posCatalog_select');
                    if (this._destroyed || this._state === 'ADVANCING' || !target || !catalog.entries().includes(target) ||
                        !target.id || (target.id === this._observedLessonId && !this._catalogTransitionCancel)) return;
                    this._beginCatalogTransition(target.id);
                };
                document.addEventListener('click', this._catalogClick, true);
                this._catalogObserver = new MutationObserver(() => {
                    if (this._destroyed || ['BLOCKED', 'ADVANCING', 'WAITING_CATALOG'].includes(this._state)) return;
                    const node = catalog.current();
                    if (!this._observedLessonId && node?.id) { this._observedLessonId = node.id; return; }
                    if (node?.id && node.id !== this._observedLessonId) {
                        if (this._state === 'NAVIGATION_COOLDOWN') { this.stopAutomation(); this._notify('平台或用户已切换小节，旧倒计时已取消；请明确重新检测'); return; }
                        this._beginCatalogTransition(node.id);
                    }
                });
                this._catalogObserver.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
            },
            _beginCatalogTransition(id) {
                const old = this._observedCard || this._cardIdentity();
                this._cancelTasks(); this._detachVideoEvents();
                this._videoEl = null; this._videoContext = null; this._isPlaying = false;
                this._attachmentSnapshot = null;
                this._nextUnitPending = false;
                this._state = 'WAITING_CATALOG';
                const generation = this._generation, href = window.location.href;
                let attempts = 0, timer, previous = null;
                const same = (a, b) => a.length === b.length && a.every((value, i) => value === b[i]);
                const cancel = () => this._block('侧栏切换已取消');
                const cleanup = () => {
                    clearTimeout(timer); this._timers.delete(timer);
                    for (const type of ['pagehide', 'beforeunload', 'popstate', 'hashchange']) window.removeEventListener(type, cancel);
                    if (this._catalogTransitionCancel === cleanup) this._catalogTransitionCancel = null;
                };
                this._catalogTransitionCancel = cleanup;
                for (const type of ['pagehide', 'beforeunload', 'popstate', 'hashchange']) window.addEventListener(type, cancel);
                const wait = () => {
                    this._timers.delete(timer);
                    if (generation !== this._generation || this._destroyed) return cleanup();
                    if (href !== window.location.href) { cleanup(); return this._block('侧栏切换时页面已离开'); }
                    const node = catalog.current(), now = this._cardIdentity();
                    const valid = node?.id === id && Array.from(document.querySelectorAll('[id]')).filter(el => el.id === id).length === 1 &&
                        now[1] && !same(old, now) && now[1].readyState !== 'loading';
                    if (valid && previous && same(previous, now)) {
                        cleanup(); this._observedLessonId = id; this._observedCard = now;
                        this.run({ startup: true, transition: true }); return;
                    }
                    if (++attempts >= 40) { cleanup(); return this._block('侧栏课节与新内容未能稳定确认'); }
                    previous = valid ? now : null;
                    timer = setTimeout(wait, 250); this._timers.add(timer);
                };
                wait();
            },
            _handlePlayError(error) {
                console.error("播放错误详情:", error);
                const video = this._getVideoEl();
                if (video?.ended) { this._completeVideo(video); return; }
                const generation = this._generation;
                const node = catalog.current();
                if (video?.tagName === 'AUDIO') { this._audioPlayRejected(video, error); return; }
                if (video) {
                    video.muted = true;
                    video.play().then(() => {
                        if (generation !== this._generation || !this._sameVideoTaskNode(node) ||
                            !video.isConnected || this._state !== 'PLAYING') return;
                        console.log("%c静音播放成功", "color:#4CAF50");
                        this._tryTimes = 0;
                        this._startVideoMonitoring();
                        if (this._delayedNextUnitTimer) {
                            clearTimeout(this._delayedNextUnitTimer);
                            this._delayedNextUnitTimer = null;
                        }
                    }).catch(e => {
                        if (generation !== this._generation || !this._sameVideoTaskNode(node)) return;
                        if (video.ended) { this._completeVideo(video); return; }
                        console.error("静音播放也失败:", e);
                        if (this._delayedNextUnitTimer) {
                            clearTimeout(this._delayedNextUnitTimer);
                        }
                        this._isPlaying = false;
                        if (this._tryTimes >= this.configs.maxRetries) {
                            console.error('%c静音播放失败，已达到最大重试次数', 'color:#F44336;font-weight:bold', e);
                            this._block('静音播放重试已达上限');
                            return;
                        }
                        this._tryTimes++;
                        this._delayedNextUnitTimer = this._schedule(() => {
                            this._delayedNextUnitTimer = null;
                            this.play();
                        }, this.configs.retryInterval);
                    });
                }
            },
            playCurrentIndex(nCell) {
                const target = nCell?.querySelector('.posCatalog_name');
                if (!target || !nCell.isConnected || !catalog.entries().includes(nCell)) {
                    return this._block('找不到有效的目录导航目标');
                }
                if (assessmentTitle(target.getAttribute('title') || target.textContent)) {
                    return this._block('下一目录为测验或作业，请手动进入');
                }
                if (this._nextUnitPending || this._state === 'ADVANCING') return;
                if (this._state !== 'READY_TO_ADVANCE' || catalog.current() !== this._completionNode ||
                    (!this._externalCompletion && catalog.status(this._completionNode) !== 'completed')) {
                    return this._block('当前内容尚未确认完成');
                }
                const destinationChapter = this._chapterOf(nCell), destinationTopology = this._catalogTopology();
                const destinationId = nCell.id, destinationTitle = this._nodeTitle(nCell), destinationHref = new URL(location.href);
                const sourceId = this._completionNode?.id;
                const routeValid = () => {
                    const now = new URL(location.href);
                    if (now.origin !== destinationHref.origin || now.pathname !== destinationHref.pathname) return false;
                    const keys = new Set([...destinationHref.searchParams.keys(), ...now.searchParams.keys()]);
                    return [...keys].every(key => /^(chapterid|knowledgeid)$/i.test(key) ||
                        JSON.stringify(now.searchParams.getAll(key)) === JSON.stringify(destinationHref.searchParams.getAll(key)));
                };
                const oldCard = this._cardIdentity();
                const oldMarkup = videoAdapter.cardDocument()?.body?.innerHTML;
                const oldDocument = videoAdapter.cardDocument();
                if (!oldDocument) return this._block('无法唯一识别 cards 内容 iframe');
                this._attachmentSnapshot = null;
                this._cancelTasks();
                this._externalCompletion = null;
                this._hadLive = false;
                this._detachVideoEvents();
                this._state = 'ADVANCING';
                this._nextUnitPending = true;
                this._videoEl = null;
                this._videoContext = null;
                this._isPlaying = false;
                const generation = this._generation;
                this._notify('已发起导航，正在确认目标小节');
                target.click();
                // Navigation has its own context: the active node must change to the target,
                // and a new iframe document must arrive before an old player can be reused.
                let attempts = 0, previous = null;
                const wait = () => {
                    if (generation !== this._generation || this._destroyed) return;
                    if (!nCell.isConnected) {
                        const matches = catalog.entries().filter(el => el.id === destinationId);
                        if (matches.length !== 1) {
                            if (++attempts >= this.configs.maxRetries) return this._block('目标目录重建未能唯一确认');
                            const timer = setTimeout(() => { this._timers.delete(timer); wait(); }, 250); this._timers.add(timer); return;
                        }
                        if (this._catalogTopology() !== destinationTopology || this._nodeTitle(matches[0]) !== destinationTitle) return this._block('重建目标的章节关系或标题不符');
                        nCell = matches[0];
                    }
                    if (!routeValid() || nCell.id !== destinationId || this._nodeTitle(nCell) !== destinationTitle) return this._block('导航期间页面或目标身份已变化');
                    const contentDocument = videoAdapter.cardDocument();
                    const card = this._cardIdentity(), markup = contentDocument?.body?.innerHTML;
                    const changed = contentDocument !== oldDocument || card.length !== oldCard.length || card.some((value,i) => value !== oldCard[i]) || markup !== oldMarkup;
                    const destination = catalog.current();
                    if (destination && destination !== nCell && destination !== this._completionNode) return this._block('导航到达非预期小节，已停止');
                    const valid = destination === nCell && nCell.isConnected && catalog.entries().includes(nCell) &&
                        contentDocument && contentDocument.readyState !== 'loading' && changed;
                    const snapshot = [...card, markup];
                    if (valid && previous && previous.length === snapshot.length && previous.every((value,i) => value === snapshot[i])) {
                        this._observedLessonId = nCell.id; this._observedCard = card;
                        this._nextUnitPending = false;
                        this._completedVisits ||= new Set();
                        if (sourceId) this._completedVisits.add(sourceId);
                        if (this._completedVisits.has(nCell.id)) return this._block('已确认返回历史小节，阻止导航循环');
                        this._notify('目标小节已确认，重新检查平台完成状态');
                        this.run({ startup: true, transition: true });
                    } else if (++attempts >= this.configs.maxRetries) {
                        this._block('目录切换或内容 iframe 加载未确认');
                    } else {
                        previous = valid ? snapshot : null;
                        const timer = setTimeout(() => { this._timers.delete(timer); wait(); }, 250);
                        this._timers.add(timer);
                    }
                };
                wait();
            },
            _initCellData() {
                const entries = catalog.entries();
                const current = catalog.current();
                this._cellData.cells = document.querySelectorAll('#coursetree > ul > li').length;
                this._cellData.nCells = entries.length;
                this._cellData.currentNCellIndex = entries.indexOf(current);
                this._cellData.currentVideoTitle = current?.querySelector('.posCatalog_name')?.getAttribute('title') || '';
                // Counts describe directory entries, never a video/task count.
                console.log(`已识别 ${entries.length} 个目录内容节点；媒体数量由播放器发现。`);
            },
            _getTreeContainer() {
                if (!this._treeContainerEl) {
                    const el = $('#coursetree');
                    if (el.length <= 0) {
                        throw new Error("找不到视频列表");
                    }
                    this._treeContainerEl = el;
                }
                return this._treeContainerEl;
            },
            _getVideoEl() {
                if (['WAITING_CATALOG', 'WAITING_STARTUP', 'WAITING_MEDIA', 'WAITING_LIVE', 'READING_DOCUMENT', 'VERIFYING_PLATFORM_COMPLETION'].includes(this._state)) return null;
                if (this._state === 'PLAYING' && !this._refreshVideoContext()) {
                    this._block('当前播放页面或播放器已变化');
                    this._videoEl = null;
                    return null;
                }
                const tasks = this._playableMedia();
                if (tasks.inaccessible || tasks.unsupported) {
                    if (this._state !== 'BLOCKED') this._block('存在不可访问或不支持的媒体组件');
                    return null;
                }
                if (!this._videoEl?.isConnected || !tasks.videos.includes(this._videoEl)) {
                    this._detachVideoEvents();
                    this._videoEl = tasks.videos.find(video => !this._completedVideos.has(video)) || null;
                }
                return this._videoEl;
            },
            _videoEventHandle() {
                const el = this._videoEl;
                if (!el) {
                    console.log("videoEl未加载");
                    return;
                }

                if (this._eventVideoEl === el) return;
                this._detachVideoEvents();
                this._eventVideoEl = el;
                this._boundVideoHandlers = {
                    ended: this._handleVideoEnded.bind(this),
                    loadedmetadata: this._handleVideoLoaded.bind(this),
                    play: this._handleVideoPlay.bind(this),
                    pause: this._handleVideoPause.bind(this),
                    ratechange: () => { if (el.playbackRate !== 1.0) el.playbackRate = 1.0; },
                };

                el.addEventListener('ended', this._boundVideoHandlers.ended);
                el.addEventListener('loadedmetadata', this._boundVideoHandlers.loadedmetadata);
                el.addEventListener('play', this._boundVideoHandlers.play);
                el.addEventListener('pause', this._boundVideoHandlers.pause);
                el.addEventListener('ratechange', this._boundVideoHandlers.ratechange);
            },
            _detachVideoEvents() {
                if (!this._eventVideoEl || !this._boundVideoHandlers) return;
                this._eventVideoEl.removeEventListener('ended', this._boundVideoHandlers.ended);
                this._eventVideoEl.removeEventListener('loadedmetadata', this._boundVideoHandlers.loadedmetadata);
                this._eventVideoEl.removeEventListener('play', this._boundVideoHandlers.play);
                this._eventVideoEl.removeEventListener('pause', this._boundVideoHandlers.pause);
                this._eventVideoEl.removeEventListener('ratechange', this._boundVideoHandlers.ratechange);
                this._eventVideoEl = null;
                this._boundVideoHandlers = null;
            },
            _handleVideoEnded(e) {
                this._completeVideo(e?.target);
            },
            _handleVideoLoaded(e) {
                console.log(`%c============视频加载完成=============`, "color:#2196F3");
                if (this.configs.autoplay && !this._isPlaying) {
                    this.play();
                }
            },
            _handleVideoPlay(e) {
                const title = this._cellData.currentVideoTitle;
                console.info(`%c============'${title}' 开始播放=============`, "color:#4CAF50");
                this._isPlaying = true;
                this._stepSwitchPending = false;
                const video = this._getVideoEl();
                this._guardLastTime = Number(video?.currentTime || 0);
                this._guardLastWallTs = Date.now();
                if (this._delayedNextUnitTimer) {
                    clearTimeout(this._delayedNextUnitTimer);
                    this._delayedNextUnitTimer = null;
                }
            },
            _handleVideoPause(e) {
                console.log(`%c============视频暂停=============`, "color:#FF9800");
            },
            _bindPageGuards() {
                const preventPause = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                };
                const resumePlaybackNow = () => this._tryResumePlayback('page-event');
                this._pageGuards = { preventPause, resumePlaybackNow };
                document.addEventListener('mouseleave', preventPause);
                window.addEventListener('mouseleave', preventPause);
                document.addEventListener('mouseout', preventPause);
                window.addEventListener('mouseout', preventPause);
                window.addEventListener('blur', resumePlaybackNow);
                document.addEventListener('visibilitychange', resumePlaybackNow);
            },
            destroy() {
                this._catalogObserver?.disconnect(); this._catalogObserver = null;
                document.removeEventListener?.('click', this._catalogClick, true);
                this._destroyed = true;
                this._settingsPanel?.remove();
                this._noticePanel?.remove(); this._noticePanel = null;
                this._renderSettings = null;
                window.removeEventListener('storage', this._settingsStorage);
                this._cancelTasks();
                this._state = 'BLOCKED';
                this._isPlaying = false;
                this._clearCheckInterval();
                this._detachVideoEvents();
                if (this._delayedNextUnitTimer) clearTimeout(this._delayedNextUnitTimer);
                $(document).off('.xuexitongPlayerV3');
                if (this._pageGuards) {
                    const { preventPause, resumePlaybackNow } = this._pageGuards;
                    document.removeEventListener('mouseleave', preventPause);
                    window.removeEventListener('mouseleave', preventPause);
                    document.removeEventListener('mouseout', preventPause);
                    window.removeEventListener('mouseout', preventPause);
                    window.removeEventListener('blur', resumePlaybackNow);
                    document.removeEventListener('visibilitychange', resumePlaybackNow);
                    this._pageGuards = null;
                }
            },
        };

        Object.defineProperty(app.configs, 'playbackRate', {
            enumerable: true,
            get: () => 1.0,
            set: () => {},
        });
        app.settings = loadSettings(window);
        app._actions = createActionScheduler(window, {
            rule: category => app._actionRule(category), enabled: category => app._actionEnabled(category),
            onQueued: timer => app._timers.add(timer), onDone: timer => app._timers.delete(timer), onError: reason => app._block(reason),
        });
        Object.defineProperty(app.configs, 'randomCooldownEnabled', {
            enumerable: true, get: () => app.settings.randomDelaysEnabled,
            set: value => { const next = JSON.parse(JSON.stringify(app.settings)); next.randomDelaysEnabled = !!value; app.updateSettings(next); },
        });
        Object.defineProperty(app.configs, 'autoplay', {
            enumerable: true, get: () => app.settings.features.videoPlayback,
            set: value => { const next = JSON.parse(JSON.stringify(app.settings)); next.features.videoPlayback = !!value; app.updateSettings(next); },
        });
        app._mountNoticePanel(); app._mountSettingsPanel();
        window.app = app;
        window[APP_KEY] = app;

        try {
            app.run({ startup: true });
            if (app.settings.features.background && !app._pageGuards) app._bindPageGuards();
        } catch (error) {
            console.error("%c脚本运行失败: ", "color:#F44336;font-weight:bold", error.message);
            console.log("请检查是否在正确的课程播放页面，或者页面结构是否再次发生改变。");
        }
    }
    if (window.location?.origin === 'https://zhibo.chaoxing.com') bootRecordedPopup();
    else bootCourse();
})();
