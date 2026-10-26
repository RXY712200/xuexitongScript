// ==UserScript==
// @name         学习通自动刷课脚本 V3 稳定版
// @namespace    local.codex.xuexitong
// @version      3.4.0
// @description  自动播放、自动切换下一节，并在页面结构异常时安全停止
// @author       Codex
// @match        *://mooc1.chaoxing.com/mycourse/studentstudy*
// @match        *://*.chaoxing.com/mycourse/studentstudy*
// @match        *://*.chaoxing.com/mooc2-ans/mycourse/studentstudy*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    const APP_KEY = '__xuexitongPlayerV3';
    const BOOT_TIMER_KEY = '__xuexitongPlayerV3BootTimer';

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
        discover() {
            const result = { videos: [], inaccessible: false, unsupported: false, documents: [] };
            const seen = new Set();
            const visit = (doc, depth) => {
                if (!doc || seen.has(doc)) return;
                seen.add(doc);
                result.documents.push(doc);
                result.videos.push(...doc.querySelectorAll('video#video_html5_api, video[id*="video_html5"]'));
                if (doc.querySelector('audio, video:not([id*="video_html5"])')) result.unsupported = true;
                if (depth > 0 && !doc.querySelector('video, iframe')) {
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
                this._completedVideos = new WeakSet();
                this._completionNode = null;
                this._completionVideo = null;
                this._tryTimes = 0;
                this._stepSwitchPending = false;
                this._nextUnitPending = false;
                this._chapterAdvanceTimes = 0;
                this._getTreeContainer();
                this._initCellData();
                this._videoEl = null;
                this._getVideoEl();
                this._clearCheckInterval();
                this._bindStepNavigation();
                this.play();
            },
            nextUnit() {
                if (this._isChapterTest()) return this._advanceChapterTest();
                if (this._state === 'ADVANCING' || this._nextUnitPending) return;
                if (this._state !== 'READY_TO_ADVANCE' || catalog.current() !== this._completionNode ||
                    catalog.status(this._completionNode) !== 'completed') {
                    return this._block('平台完成状态尚未确认，停止自动导航');
                }
                const entries = catalog.entries();
                const index = entries.indexOf(this._completionNode);
                if (index < 0) return this._block('当前目录节点已失效');
                const next = entries[index + 1];
                if (!next) {
                    this._state = 'FINISHED';
                    console.log('已到当前可见目录末尾；不代表整个课程已完成。');
                    return;
                }
                this.playCurrentIndex(next);
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
                if (!this._completionNode || catalog.current() !== this._completionNode ||
                    this._currentStepTitle() !== this._playStepTitle) {
                    return this._block('完成事件与当前目录不匹配');
                }
                const tasks = videoAdapter.discover();
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
                    if (this._destroyed || ['BLOCKED', 'ADVANCING', 'VERIFYING_COMPLETION', 'FINISHED'].includes(this._state)) return;
                    if (this._state === 'PLAYING' && (catalog.current() !== this._playNode ||
                        this._currentStepTitle() !== this._playStepTitle || !this._videoEl?.isConnected)) {
                        return this._block('当前播放页面或播放器已变化');
                    }
                    if (this._playPending) return;
                    this._state = 'DISCOVERING';
                    const tasks = videoAdapter.discover();
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
                this._block('检测到测验、作业或验证内容，不会自动提交或跳过');
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
                    catalog.status(this._completionNode) !== 'completed') {
                    return this._block('当前内容尚未确认完成');
                }
                const oldDocument = videoAdapter.cardDocument();
                if (!oldDocument) return this._block('无法唯一识别 cards 内容 iframe');
                this._cancelTasks();
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
                if (this._state === 'PLAYING' && (catalog.current() !== this._playNode ||
                    this._currentStepTitle() !== this._playStepTitle || !this._videoEl?.isConnected)) {
                    this._block('当前播放页面或播放器已变化');
                    this._videoEl = null;
                    return null;
                }
                const tasks = videoAdapter.discover();
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
