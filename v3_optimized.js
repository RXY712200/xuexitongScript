(function () {
    const APP_KEY = '__xuexitongPlayerV3';
    const BOOT_TIMER_KEY = '__xuexitongPlayerV3BootTimer';
    window.__xuexitongTaskSupport = createTaskSupport(window);

    const previousApp = window[APP_KEY];
    if (previousApp && typeof previousApp.destroy === 'function') {
        previousApp.destroy();
    }
    if (window[BOOT_TIMER_KEY]) {
        clearInterval(window[BOOT_TIMER_KEY]);
        window[BOOT_TIMER_KEY] = null;
    }

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

    function waitForCoursePage() {
        let attempts = 0;
        const maxAttempts = 20;
        window[BOOT_TIMER_KEY] = setInterval(() => {
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
    const assessmentTitle = text => /测验|自测|作业|考试|验证/.test(text);
    const optionalAssessment = text => ['章节测验', '本章自测'].includes(text.trim());
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
            const count = node.querySelector('.jobUnfinishCount');
            const value = count && /^\d+$/.test(count.value.trim()) ? Number(count.value) : null;
            if (count && value === null) return 'unknown';
            if (value > 0) return 'incomplete';
            // Zero unfinished tasks alone does not prove completion.
            return node.querySelector('.icon_Completed') ? 'completed' : 'unknown';
        },
    };
    const videoAdapter = {
        cardFrame() {
            const cards = document.querySelectorAll('iframe[info="card"], iframe[src*="/knowledge/cards"]');
            return cards.length === 1 ? cards[0] : null;
        },
        cardDocument() {
            try { return this.cardFrame()?.contentDocument || null; } catch (_) { return null; }
        },
        discover(knownDocuments = new Set()) {
            const result = { videos: [], inaccessible: false, unsupported: false, documents: [] };
            const seen = new Set();
            const visit = (doc, depth) => {
                if (!doc || seen.has(doc)) return;
                seen.add(doc);
                result.documents.push(doc);
                result.videos.push(...doc.querySelectorAll('video#video_html5_api, video[id*="video_html5"]'));
                if (doc.querySelector('audio, video:not([id*="video_html5"])')) result.unsupported = true;
                if (depth > 0 && !knownDocuments.has(doc) && !doc.querySelector('video, iframe')) {
                    const body = doc.body?.cloneNode(true);
                    body?.querySelectorAll('script, style').forEach(node => node.remove());
                    if (body?.textContent.trim() || body?.querySelector('form, input, object, embed, canvas, img')) {
                        result.unsupported = true;
                    }
                }
                for (const frame of doc.querySelectorAll('iframe')) {
                    try {
                        if (depth >= 4) { result.unsupported = true; continue; }
                        const inner = frame.contentDocument;
                        if (!inner) { result.inaccessible = true; continue; }
                        visit(inner, depth + 1);
                    } catch (_) { result.inaccessible = true; }
                }
            };
            // Only the unique course-content frame defines task scope. Editor, popup,
            // reporting and other outer-page frames are not learning modules.
            const frame = this.cardFrame();
            if (!frame) result.unsupported = true;
            else {
                const content = this.cardDocument();
                if (!content) result.inaccessible = true;
                else visit(content, 1); // Keep all nested task checks and the depth bound.
            }
            result.videos = [...new Set(result.videos)].filter(video => video.isConnected);
            return result;
        },
    };

    // Evidence adapters are opt-in. No live URL, player selector or document viewer is guessed.
    function createTaskSupport(env) {
        const protocol = 'xuexitong-live-v1';
        const types = new Set(['LIVE_OPENED', 'LIVE_READY', 'LIVE_PLAYING', 'LIVE_NEAR_END', 'LIVE_COMPLETED', 'LIVE_ERROR', 'LIVE_CLOSED']);
        const send = (peer, session, type, extra = {}) => peer.postMessage({
            protocol, id: session.id, generation: session.generation, seq: ++session.sent,
            timestamp: Date.now(), type, ...extra,
        }, env.location.origin);
        const accept = (event, session, peer) => {
            const data = event.data;
            return event.origin === env.location.origin && event.source === peer && data &&
                data.protocol === protocol && data.id === session.id && data.generation === session.generation &&
                types.has(data.type) && Number.isSafeInteger(data.seq) && data.seq > session.received &&
                Number.isFinite(data.timestamp) && data.timestamp >= session.started - 5000 && data.timestamp <= Date.now() + 30000;
        };
        function createParent({ entry, generation, threshold, isValid, onResult, onError }) {
            const url = new URL(entry.href, env.location.href);
            if (!entry.isConnected || entry.tagName !== 'A' || entry.target !== '_blank' ||
                entry.relList?.contains('noopener') || entry.relList?.contains('noreferrer') || url.origin !== env.location.origin ||
                !['http:', 'https:'].includes(url.protocol) || !Number.isFinite(threshold) || threshold <= 0 || threshold > 1) {
                throw new Error('Unsupported live entry/origin/threshold');
            }
            const session = { id: env.crypto.randomUUID(), generation, sent: 0, received: 0, started: Date.now() };
            let child, timer, disposed = false, result = null, closeAttempted = false, childDocument = null;
            const dispose = () => {
                disposed = true; env.clearInterval(timer);
                env.removeEventListener('message', receive); env.removeEventListener('pagehide', dispose);
            };
            const fail = reason => { if (!disposed) { dispose(); onError(reason); } };
            const tick = () => {
                if (disposed) return;
                if (!isValid()) return fail('Original live task changed');
                if (child.closed) {
                    if (!result) return fail('Live window closed before a validated result');
                    dispose(); onResult(result); return;
                }
                try {
                    if ((child.location.origin !== env.location.origin && !(child.location.href === 'about:blank' && !childDocument)) ||
                        (childDocument && child.document !== childDocument)) {
                        return fail('Live window left its supported document/origin');
                    }
                    if (closeAttempted) return fail('Live window closure denied or not confirmed; handle manually');
                    send(child, session, 'LIVE_OPENED', { threshold });
                } catch (_) { fail('Live window communication unavailable'); }
            };
            function receive(event) {
                if (disposed || !child || !accept(event, session, child) || !isValid()) return;
                const data = event.data;
                if (data.type === 'LIVE_OPENED') return;
                if (data.type === 'LIVE_COMPLETED' && data.ended !== true) return;
                if (data.type === 'LIVE_NEAR_END' && !(Number.isFinite(data.duration) && data.duration > 0 &&
                    Number.isFinite(data.position) && data.position >= 0 && data.position <= data.duration + 1 &&
                    data.position / data.duration >= threshold)) return;
                session.received = data.seq;
                if (result) return;
                if (data.type === 'LIVE_ERROR' || data.type === 'LIVE_CLOSED') return fail('Live child stopped unexpectedly');
                if (data.type === 'LIVE_READY') {
                    try { childDocument = child.document; } catch (_) { return fail('Live document inaccessible'); }
                }
                const ended = data.type === 'LIVE_COMPLETED' && data.ended === true;
                const near = data.type === 'LIVE_NEAR_END' && Number.isFinite(data.duration) && data.duration > 0 &&
                    Number.isFinite(data.position) && data.position >= 0 && data.position / data.duration >= threshold &&
                    data.position <= data.duration + 1;
                if (!ended && !near) return;
                result = { kind: near ? 'near-end' : 'completed', basis: near ? 'local-position' : 'local-ended' };
                closeAttempted = true;
                try { child.close(); } catch (_) { return fail('Live window closure denied; handle manually'); }
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
            const listeners = [];
            const listen = (target, type, handler) => { target.addEventListener(type, handler); listeners.push([target, type, handler]); };
            const dispose = () => {
                disposed = true; env.clearInterval(timer);
                for (const [target, type, handler] of listeners) target.removeEventListener(type, handler);
            };
            const report = (type, extra) => { if (session && !disposed && env.opener && !env.opener.closed) send(env.opener, session, type, extra); };
            const check = () => {
                if (disposed || !session) return;
                if (!env.opener || env.opener.closed) return dispose();
                if (!adapter.isRecognized() || !video.isConnected) { report('LIVE_ERROR'); return dispose(); }
                if (terminal) return;
                if (video.ended || adapter.sessionFinished?.() === true) {
                    terminal = true; report('LIVE_COMPLETED', { ended: true });
                } else if (Number.isFinite(video.duration) && video.duration > 0 &&
                    Number.isFinite(video.currentTime) && video.currentTime / video.duration >= session.threshold) {
                    terminal = true; report('LIVE_NEAR_END', { position: video.currentTime, duration: video.duration });
                } else report(video.paused ? 'LIVE_READY' : 'LIVE_PLAYING');
            };
            listen(env, 'message', event => {
                const data = event.data;
                if (!data || data.type !== 'LIVE_OPENED') return;
                if (!session) {
                    if (event.origin !== env.location.origin || event.source !== env.opener || !data ||
                        data.protocol !== protocol || data.type !== 'LIVE_OPENED' ||
                        typeof data.id !== 'string' || !/^[\w-]{16,80}$/.test(data.id) ||
                        !Number.isSafeInteger(data.generation) || data.generation < 0 || !Number.isFinite(data.threshold) || data.threshold <= 0 || data.threshold > 1) return;
                    const candidate = { id: data.id, generation: data.generation, started: Date.now(), sent: 0, received: 0, threshold: data.threshold };
                    if (!accept(event, candidate, env.opener)) return;
                    session = candidate;
                    video = adapter.getPlayer();
                    if (!video?.isConnected || typeof video.play !== 'function' || video.tagName !== 'VIDEO') {
                        report('LIVE_ERROR'); return dispose();
                    }
                    video.playbackRate = 1;
                    listen(video, 'ratechange', () => { if (video.playbackRate !== 1) video.playbackRate = 1; });
                    for (const type of ['timeupdate', 'durationchange', 'ended', 'play']) listen(video, type, check);
                    report('LIVE_READY');
                    video.play().catch(() => report('LIVE_ERROR'));
                    timer = env.setInterval(check, 10000);
                }
                if (!accept(event, session, env.opener)) return;
                session.received = data.seq;
                check();
            });
            listen(env, 'pagehide', () => { if (!terminal) report('LIVE_CLOSED'); dispose(); });
            if (env[BOOT_TIMER_KEY]) { env.clearInterval(env[BOOT_TIMER_KEY]); env[BOOT_TIMER_KEY] = null; }
            return env.__xuexitongLiveChild = { check, dispose, get active() { return !!session; }, get disposed() { return disposed; } };
        }
        function readDocument({ element, isValid, onComplete, onError }) {
            let timer, cancelled = false, previous = -1, unchanged = 0, bottomHeight = -1;
            const cancel = () => { cancelled = true; env.clearTimeout(timer); };
            const fail = reason => { cancel(); onError(reason); };
            const tick = () => {
                if (cancelled) return;
                if (!isValid() || !element.isConnected || element.clientHeight <= 0) return fail('Document viewer unavailable');
                const bottom = element.scrollHeight - element.clientHeight;
                if (!Number.isFinite(bottom) || bottom < 0) return fail('Document bottom cannot be verified');
                if (element.scrollTop >= bottom - 1) {
                    if (bottomHeight === element.scrollHeight) { cancel(); onComplete(); return; }
                    bottomHeight = element.scrollHeight;
                } else {
                    bottomHeight = -1;
                    if (element.scrollTop === previous) unchanged++; else unchanged = 0;
                    if (unchanged >= 10) return fail('Document scrolling made no progress');
                    previous = element.scrollTop;
                    element.scrollTop = Math.min(bottom, element.scrollTop + 40 + Math.floor(Math.random() * 81));
                }
                timer = env.setTimeout(tick, 400 + Math.floor(Math.random() * 801));
            };
            element.scrollTop = 0;
            timer = env.setTimeout(tick, 400);
            return { cancel, tick };
        }
        return { createParent, installChild, readDocument };
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
            run() {
                console.log("%c=== 学习通自动刷课脚本 V3 优化版启动 ===", "color:#4CAF50;font-size:16px;font-weight:bold");
                this._cancelTasks();
                this._destroyed = false;
                this._state = 'DISCOVERING';
                this._isPlaying = false;
                this._completedVideos = new WeakSet();
                this._processedTasks = new WeakSet();
                this._externalCompletion = null;
                this._hadLive = false;
                this._completionNode = null;
                this._completionVideo = null;
                this._tryTimes = 0;
                this._stepSwitchPending = false;
                this._nextUnitPending = false;
                this._chapterAdvanceTimes = 0;
                this._getTreeContainer();
                this._initCellData();
                this._videoEl = null;
                this._clearCheckInterval();
                this._bindStepNavigation();
                this.play();
            },
            nextUnit() {
                if (['ADVANCING', 'NAVIGATION_COOLDOWN', 'WAITING_LIVE', 'READING_DOCUMENT'].includes(this._state) || this._nextUnitPending) return;
                if (this._isChapterTest()) return this._advanceChapterTest();
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
                    console.log('已到当前可见目录末尾；不代表整个课程已完成。');
                    return;
                }
                this._queueNavigation(next);
            },
            taskAdapter: null, // No real viewer/live profile is enabled without evidence.
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
                const chapter = this._chapterOf(node);
                if (!chapter) return null;
                const local = entries.filter(entry => this._chapterOf(entry) === chapter);
                const index = local.indexOf(node);
                if (index < 0 || !local.slice(0, index).some(entry => !optionalAssessment(this._nodeTitle(entry))) ||
                    !local.slice(index).every(entry => optionalAssessment(this._nodeTitle(entry)))) return null;
                if (!local.slice(0, index).every(entry => optionalAssessment(this._nodeTitle(entry)) || catalog.status(entry) === 'completed' ||
                    (entry === this._completionNode && this._externalCompletion?.kind === 'document' &&
                        this._externalCompletion.localDone && !this._hadLive && this._taskContextValid(this._externalCompletion) &&
                        this._discoverMedia().videos.length === 0))) return null;
                const nextChapter = chapter.nextElementSibling;
                const target = entries.find(entry => this._chapterOf(entry) === nextChapter);
                return target && !assessmentTitle(this._nodeTitle(target)) && !verificationTitle(this._nodeTitle(target)) ? target : null;
            },
            _targetAfter(node) {
                const entries = catalog.entries();
                const next = entries[entries.indexOf(node) + 1];
                if (!next) return undefined;
                if (verificationTitle(this._nodeTitle(next))) return null;
                if (!assessmentTitle(this._nodeTitle(next))) return next;
                // Only the two observed optional labels at the end of the same chapter.
                if (this._chapterOf(next) !== this._chapterOf(node)) return null;
                return this._assessmentTarget(next);
            },
            _taskSet() {
                try {
                    if (!this.taskAdapter) return null;
                    const scope = this.taskAdapter.discover({ node: catalog.current(), document: videoAdapter.cardDocument() });
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
                return videoAdapter.discover(new Set(scope?.tasks.map(task => task.element.ownerDocument) || []));
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
                const scope = this._taskSet();
                if (!scope) return false;
                if (scope.invalid || this._verificationPresent()) { this._block('已识别的任务范围已失效或需要验证'); return true; }
                const pending = scope.tasks.find(task => !this._processedTasks.has(task.element));
                if (!pending) {
                    if (!scope.tasks.length) return false;
                    const media = this._discoverMedia();
                    if (media.videos.some(video => !this._completedVideos.has(video))) return false;
                    this._verifyExternal(0); return true;
                }
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
                    record.localDone = true; record.result = result;
                    console.log(record.kind === 'document' ? '文档已到可验证底部，仅记为本地操作完成。' : '直播窗口已关闭；本地结束信号不代表平台已计入完成。');
                    this._verifyExternal(0);
                };
                const failed = reason => this._block(reason);
                if (pending.kind === 'document') {
                    this._state = 'READING_DOCUMENT';
                    try {
                        this._documentController = window.__xuexitongTaskSupport.readDocument({ element: pending.element,
                            isValid: () => this._taskContextValid(record), onComplete: () => completed('local-bottom'), onError: failed });
                    } catch (_) { failed('文档视图不支持可验证的滚动'); }
                } else {
                    this._hadLive = true;
                    this._state = 'WAITING_LIVE'; // Set before window.open(), including popup-block failure.
                    try {
                        this._liveController = window.__xuexitongTaskSupport.createParent({ entry: pending.element,
                            generation: record.generation, threshold: this.configs.liveNearEndThreshold,
                            isValid: () => this._state === 'WAITING_LIVE' && this._taskContextValid(record),
                            onResult: completed, onError: failed });
                        this._liveController.start();
                    } catch (_) { failed('直播入口或通信来源尚不受支持'); }
                }
                return true;
            },
            _verifyExternal(attempt) {
                const record = this._externalCompletion;
                if (!record?.localDone || !this._taskContextValid(record)) return this._block('本地任务完成上下文无效');
                this._state = 'VERIFYING_COMPLETION';
                const scope = this._taskSet();
                if (!scope || scope.invalid) return this._block('任务范围无法验证');
                const media = this._discoverMedia();
                if (media.inaccessible || media.unsupported) return this._block('任务包含未知或不可访问的内容');
                if (scope.tasks.some(task => !this._processedTasks.has(task.element)) ||
                    media.videos.some(video => !this._completedVideos.has(video))) {
                    this._state = 'DISCOVERING'; this.play(); return;
                }
                if ((this._hadLive || media.videos.length) && catalog.status(record.node) !== 'completed') {
                    if (attempt >= this.configs.maxRetries) return this._block('本地操作已结束，但视频或直播的平台完成状态未确认');
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
                const media = this._discoverMedia();
                if (media.inaccessible || media.unsupported || record.scope.tasks.some(task => !this._processedTasks.has(task.element))) return false;
                if ((this._hadLive || media.videos.length) && catalog.status(record.node) !== 'completed') return false;
                return media.videos.every(video => video.ended && this._completedVideos.has(video));
            },
            _navigationEligible(target) {
                if (this._externalCompletion) return this._externalNavigationEligible(target);
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
                const tasks = this._discoverMedia();
                return !tasks.inaccessible && !tasks.unsupported &&
                    tasks.videos.includes(this._completionVideo) &&
                    tasks.videos.every(video => video.ended && this._completedVideos.has(video));
            },
            _queueNavigation(target) {
                if (this._state !== 'READY_TO_ADVANCE') return;
                if (!this._navigationEligible(target)) return this._block('导航条件已变化');
                if (!this.configs.randomCooldownEnabled) return this.playCurrentIndex(target);
                const min = this.configs.randomCooldownMinMs;
                const max = this.configs.randomCooldownMaxMs;
                if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) ||
                    min < 0 || max < min || max > 2147483647) {
                    return this._block('导航冷却范围必须为有效的整数毫秒');
                }
                const generation = this._generation;
                const node = this._completionNode;
                const video = this._completionVideo;
                const content = videoAdapter.cardDocument();
                if (!content) return this._block('无法确认内容 iframe');
                const delay = min + Math.floor(Math.random() * (max - min + 1));
                this._state = 'NAVIGATION_COOLDOWN';
                console.log(`导航冷却 ${(delay / 1000).toFixed(3)}s`);
                const valid = () => generation === this._generation && node === this._completionNode &&
                    video === this._completionVideo && content === videoAdapter.cardDocument() &&
                    this._navigationEligible(target);
                const cancel = () => this._block('页面操作或任务变化已取消导航冷却');
                const observer = new MutationObserver(() => {
                    if (this._state === 'NAVIGATION_COOLDOWN' && !valid()) cancel();
                });
                const listeners = [];
                const listen = (element, event) => {
                    element.addEventListener(event, cancel, true);
                    listeners.push([element, event]);
                };
                // Watch only while waiting. No pauses, focus simulation or activity synthesis.
                for (const doc of new Set([document, ...this._discoverMedia().documents])) {
                    observer.observe(doc, { subtree: true, childList: true, attributes: true, characterData: true });
                    listen(doc, 'click');
                    for (const frame of doc.querySelectorAll('iframe')) {
                        if (doc !== document || frame === videoAdapter.cardFrame()) listen(frame, 'load');
                    }
                }
                if (video) listen(video, 'play');
                listen(window, 'pagehide');
                listen(window, 'beforeunload');
                listen(window, 'popstate');
                listen(window, 'hashchange');
                this._cooldownCleanup = () => {
                    observer.disconnect();
                    for (const [element, event] of listeners) element.removeEventListener(event, cancel, true);
                    this._cooldownCleanup = null;
                };
                this._schedule(() => {
                    if (this._state !== 'NAVIGATION_COOLDOWN') return;
                    if (!valid()) return this._block('冷却后导航条件未通过重新确认');
                    this._cooldownCleanup();
                    this._state = 'READY_TO_ADVANCE';
                    this.playCurrentIndex(target);
                }, delay);
            },
            _state: 'DISCOVERING',
            _generation: 0,
            _timers: new Set(),
            _completedVideos: new WeakSet(),
            _completionNode: null,
            _completionVideo: null,
            _schedule(callback, delay) {
                const generation = this._generation;
                const node = catalog.current();
                const timer = setTimeout(() => {
                    this._timers.delete(timer);
                    if (generation !== this._generation || this._destroyed) return;
                    if (node !== catalog.current()) return this._block('页面目录已变化，请执行 app.run() 重新识别');
                    callback();
                }, delay);
                this._timers.add(timer);
                return timer;
            },
            _cancelTasks() {
                this._documentController?.cancel();
                this._documentController = null;
                this._liveController?.dispose();
                this._liveController = null;
                if (this._cooldownCleanup) this._cooldownCleanup();
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
                console.warn(`自动导航已停止：${reason}。请手动处理后执行 app.run()。`);
            },
            _completeVideo(video) {
                if (!video || !video.isConnected || !video.ended || video !== this._videoEl ||
                    this._completedVideos.has(video) || this._state !== 'PLAYING') return;
                if (catalog.current() !== this._playNode || this._currentStepTitle() !== this._playStepTitle) {
                    return this._block('播放器完成事件属于已离开的页面');
                }
                console.log('视频自然播放结束，等待内容发现及平台完成确认。');
                this._completedVideos.add(video);
                this._completionVideo = video;
                this._completionNode = catalog.current();
                this._isPlaying = false;
                this._clearCheckInterval();
                this._state = 'VERIFYING_COMPLETION';
                this._schedule(() => this._continueCompleted(0), 1000);
            },
            _continueCompleted(attempt) {
                if (this._state !== 'VERIFYING_COMPLETION') return;
                if (this._isChapterTest()) return this._advanceChapterTest();
                if (this._processSupportedTask()) return;
                if (!this._completionNode || catalog.current() !== this._completionNode ||
                    this._currentStepTitle() !== this._playStepTitle) {
                    return this._block('完成事件与当前目录不匹配');
                }
                const tasks = this._discoverMedia();
                if (tasks.inaccessible || tasks.unsupported) return this._block('存在不可访问或不支持的媒体组件');
                if (!tasks.videos.includes(this._completionVideo)) return this._block('播放器已替换，完成状态不明确');
                const next = tasks.videos.find(video => !this._completedVideos.has(video));
                if (next) {
                    this._videoEl = next;
                    this._state = 'READY';
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
                const now = Date.now();
                if (now - this._guardLastResumeTs < this.configs.guardResumeCooldownMs) {
                    return;
                }
                this._guardLastResumeTs = now;

                const video = this._getVideoEl();
                if (!video || !this._isPlaying) return;
                const generation = this._generation;

                console.log(`%c触发视频保活恢复(${reason})`, "color:#607D8B");
                video.play().catch((e) => {
                    if (generation !== this._generation || !this._isPlaying || !video.isConnected ||
                        video !== this._videoEl || catalog.current() !== this._playNode) return;
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

                    if (video.ended && this._isPlaying) {
                        console.log("%c检测到视频结束，准备切换下一个...", "color:#9C27B0");
                        this._isPlaying = false;
                        this._completeVideo(video);
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
            async play() {
                try {
                    if (this._isChapterTest()) {
                        this._advanceChapterTest();
                        return;
                    }
                    if (this._destroyed || ['BLOCKED', 'ADVANCING', 'VERIFYING_COMPLETION', 'NAVIGATION_COOLDOWN', 'WAITING_LIVE', 'READING_DOCUMENT', 'FINISHED'].includes(this._state)) return;
                    if (this._state === 'PLAYING' && (catalog.current() !== this._playNode ||
                        this._currentStepTitle() !== this._playStepTitle || !this._videoEl?.isConnected)) {
                        return this._block('当前播放页面或播放器已变化');
                    }
                    if (this._playPending) return;
                    if (this._processSupportedTask()) return;
                    this._state = 'DISCOVERING';
                    const tasks = this._discoverMedia();
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
                    const generation = this._generation;
                    const node = catalog.current();
                    this._playNode = node;
                    this._playStepTitle = this._currentStepTitle();
                    this._state = 'PLAYING';
                    this._isPlaying = true;
                    this._videoEventHandle();
                    el.playbackRate = 1.0;

                    try {
                        this._playPending = true;
                        await el.play();
                        if (generation === this._generation) this._playPending = false;
                        if (generation !== this._generation || node !== catalog.current() ||
                            !el.isConnected || this._state !== 'PLAYING') return;
                        this._tryTimes = 0;
                        console.log(`%c视频开始播放，倍速: ${el.playbackRate}x`, "color:#4CAF50");
                        this._startVideoMonitoring();
                    } catch (playError) {
                        if (generation === this._generation) this._playPending = false;
                        console.error("视频播放失败:", playError);
                        if (generation === this._generation && node === catalog.current() && this._state === 'PLAYING') this._handlePlayError(playError);
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
                console.log('尝试点击“视频”页签');
                tabs[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
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
            _handlePlayError(error) {
                console.error("播放错误详情:", error);
                const video = this._getVideoEl();
                const generation = this._generation;
                const node = catalog.current();
                if (video) {
                    video.muted = true;
                    video.play().then(() => {
                        if (generation !== this._generation || node !== catalog.current() ||
                            !video.isConnected || this._state !== 'PLAYING') return;
                        console.log("%c静音播放成功", "color:#4CAF50");
                        this._tryTimes = 0;
                        this._startVideoMonitoring();
                        if (this._delayedNextUnitTimer) {
                            clearTimeout(this._delayedNextUnitTimer);
                            this._delayedNextUnitTimer = null;
                        }
                    }).catch(e => {
                        if (generation !== this._generation || node !== catalog.current()) return;
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
                const oldDocument = videoAdapter.cardDocument();
                if (!oldDocument) return this._block('无法唯一识别 cards 内容 iframe');
                this._cancelTasks();
                this._externalCompletion = null;
                this._hadLive = false;
                this._detachVideoEvents();
                this._state = 'ADVANCING';
                this._nextUnitPending = true;
                this._videoEl = null;
                this._isPlaying = false;
                const generation = this._generation;
                target.click();
                // Navigation has its own context: the active node must change to the target,
                // and a new iframe document must arrive before an old player can be reused.
                let attempts = 0;
                const wait = () => {
                    if (generation !== this._generation || this._destroyed) return;
                    const contentDocument = videoAdapter.cardDocument();
                    if (catalog.current() === nCell && contentDocument && contentDocument !== oldDocument) {
                        this._nextUnitPending = false;
                        this._tryTimes = 0;
                        this._state = 'DISCOVERING';
                        this._initCellData();
                        if (this.configs.autoplay) this.play();
                    } else if (++attempts >= this.configs.maxRetries) {
                        this._block('目录切换或内容 iframe 加载未确认');
                    } else {
                        const timer = setTimeout(() => { this._timers.delete(timer); wait(); }, this.configs.retryInterval);
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
                if (['WAITING_LIVE', 'READING_DOCUMENT'].includes(this._state)) return null;
                if (this._state === 'PLAYING' && (catalog.current() !== this._playNode ||
                    this._currentStepTitle() !== this._playStepTitle || !this._videoEl?.isConnected)) {
                    this._block('当前播放页面或播放器已变化');
                    this._videoEl = null;
                    return null;
                }
                const tasks = this._discoverMedia();
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
                this._destroyed = true;
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
        window.app = app;
        window[APP_KEY] = app;

        try {
            app.run();
            app._bindPageGuards();
        } catch (error) {
            console.error("%c脚本运行失败: ", "color:#F44336;font-weight:bold", error.message);
            console.log("请检查是否在正确的课程播放页面，或者页面结构是否再次发生改变。");
        }
    }
})();
