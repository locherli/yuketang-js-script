// ==UserScript==
// @name         雨课堂刷课
// @namespace    http://tampermonkey.net/
// @version      2026-03-27
// @description  仅实现刷视频和刷外部链接功能，考试和作业需自己完成
// @author       locher
// @license      GPL3
// @connect      *.jsdelivr.net
// @match        *://*.yuketang.cn/*
// @match        https://www.yuketang.cn/v2/web/studentLog/30920093?university_id=2656&platform_id=3&classroom_id=30920093&content_url=
// @icon         https://www.google.com/s2/favicons?sz=64&domain=yuketang.cn
// @grant        unsafeWindow
// ==/UserScript==

(async () => {
    'use strict';

    const STATE_KEY = 'ytk_script_enabled';
    let isEnabled = localStorage.getItem(STATE_KEY) !== 'false';



    // UI

    function injectUI() {
        // 插入 CSS
        const style = document.createElement('style');
        style.textContent = `
            .ytk-window-container {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 250px;
                background-color: white;
                border: 1px solid #ccc;
                border-radius: 5px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 999999; /* 保证层级最高 */
                font-family: Arial, sans-serif;
                color: #333;
            }
            .ytk-window-header {
                height: 30px;
                background-color: #4a86e8;
                color: white;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 10px;
                cursor: move;
                border-top-left-radius: 5px;
                border-top-right-radius: 5px;
                user-select: none;
            }
            .ytk-window-title { font-size: 14px; font-weight: bold; }
            .ytk-window-controls { display: flex; gap: 8px; }
            .ytk-btn {
                background: none; border: none; color: white; cursor: pointer;
                font-size: 16px; width: 20px; height: 20px;
                display: flex; align-items: center; justify-content: center;
            }
            .ytk-btn:hover { background-color: rgba(255,255,255,0.2); border-radius: 3px; }
            .ytk-window-content { padding: 15px; }
            .ytk-minimized {
                height: 30px !important;
                width: 150px !important;
                transform: translate(-50%, -50%) !important;
            }
            .ytk-minimized .ytk-window-content { display: none; }
            .ytk-minimized .ytk-window-header { border-radius: 5px; }
            .ytk-windows-content label:above { background-color: grey }
        `;
        document.head.appendChild(style);

        // 插入 HTML
        const uiWrapper = document.createElement('div');
        uiWrapper.innerHTML = `
            <div class="ytk-window-container" id="ytkWindow">
                <div class="ytk-window-header" id="ytkHeader">
                    <div class="ytk-window-title">刷课脚本</div>
                    <div class="ytk-window-controls">
                        <button class="ytk-btn" id="ytkMinimizeBtn">−</button>
                        <button class="ytk-btn" id="ytkCloseBtn">×</button>
                    </div>
                </div>
                <div class="ytk-window-content">
                    <label style="display: flex; align-items: center; cursor: pointer; font-size: 14px;">
                        <input type="checkbox" id="ytkEnableCb" ${isEnabled ? 'checked' : ''} style="margin-right: 8px;">
                        <b>启用自动刷课脚本</b>
                    </label>
                    <div style="margin-top: 12px; font-size: 12px; color: #666;" id="ytkStatusText">
                        状态：${isEnabled ? '🟢 运行中...' : '🔴 已暂停'}
                    </div>

                </div>
            </div>
        `;
        document.body.appendChild(uiWrapper);

        // ==========================================
        // 3. 窗口交互逻辑 (拖拽、最小化、关闭、开关)
        // ==========================================
        const ui = {
            windowContainer: document.getElementById('ytkWindow'),
            windowHeader: document.getElementById('ytkHeader'),
            minimizeBtn: document.getElementById('ytkMinimizeBtn'),
            closeBtn: document.getElementById('ytkCloseBtn'),
            enableCb: document.getElementById('ytkEnableCb'),
            statusText: document.getElementById('ytkStatusText')
        };

        let isDragging = false;
        let startX = 0, startY = 0, startLeft = 0, startTop = 0;
        const hostWindow = window.parent || window;

        // 初始化位置转换
        const initializePosition = () => {
            const rect = ui.windowContainer.getBoundingClientRect();
            ui.windowContainer.style.transform = 'none';
            ui.windowContainer.style.left = rect.left + 'px';
            ui.windowContainer.style.top = rect.top + 'px';
        };

        const onMove = e => {
            if (!isDragging) return;
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            const maxLeft = Math.max(0, hostWindow.innerWidth - ui.windowContainer.offsetWidth);
            const maxTop = Math.max(0, hostWindow.innerHeight - ui.windowContainer.offsetHeight);
            ui.windowContainer.style.left = Math.min(Math.max(0, startLeft + deltaX), maxLeft) + 'px';
            ui.windowContainer.style.top = Math.min(Math.max(0, startTop + deltaY), maxTop) + 'px';
        };

        const stopDrag = () => {
            if (!isDragging) return;
            isDragging = false;
            ui.windowHeader.style.cursor = 'move';
            document.body.style.userSelect = '';
        };

        ui.windowHeader.addEventListener('mousedown', e => {
            // 防止点击按钮时触发拖拽
            if (e.target.tagName.toLowerCase() === 'button') return;

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseFloat(ui.windowContainer.style.left) || 0;
            startTop = parseFloat(ui.windowContainer.style.top) || 0;
            ui.windowHeader.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', onMove);
        hostWindow.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', stopDrag);
        hostWindow.addEventListener('mouseup', stopDrag);
        hostWindow.addEventListener('blur', stopDrag);

        // 按钮事件
        ui.minimizeBtn.addEventListener('click', () => {
            ui.windowContainer.classList.toggle('ytk-minimized');
            ui.minimizeBtn.textContent = ui.windowContainer.classList.contains('ytk-minimized') ? '+' : '−';
        });

        ui.closeBtn.addEventListener('click', () => {
            ui.windowContainer.style.display = 'none';
        });

        // 开关脚本状态事件
        ui.enableCb.addEventListener('change', (e) => {
            isEnabled = e.target.checked;
            localStorage.setItem(STATE_KEY, isEnabled); // 保存设置到本地存储
            ui.statusText.innerHTML = `状态：${isEnabled ? '🟢 运行中...' : '🔴 已暂停'}`;
        });

        // 延迟初始化以防渲染未完成
        setTimeout(initializePosition, 100);

    }

    // 自动化逻辑

    const Utils = {
        // 短暂睡眠，等待网页加载
        sleep: (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms)),
        // 将一个 JSON 字符串解析为 JavaScript 对象
        safeJSONParse(value, fallback) {
            try {
                return JSON.parse(value);
            } catch (_) {
                return fallback;
            }
        },

        // 主要是规避firefox会创建多个iframe的问题
        inIframe() {
            return window.top !== window.self;
        },

        hasKeywordInText(element, keyword) {
            return element.textContent.includes(keyword);
        },

    };

    // ---- 播放器工具 ----
    const Player = {
        applySpeed(rate) {
            const speedBtn = document.querySelector('xt-speedlist xt-button') || document.getElementsByTagName('xt-speedlist')[0]?.firstElementChild?.firstElementChild;
            const speedWrap = document.getElementsByTagName('xt-speedbutton')[0];

            if (speedBtn && speedWrap) {
                speedBtn.setAttribute('data-speed', rate);
                speedBtn.setAttribute('keyt', `${rate}.00`);
                speedBtn.innerText = `${rate}.00X`;

                // --- MODERN REPLACEMENT FOR DEPRECATED CODE ---
                const mousemove = new MouseEvent('mousemove', {
                    bubbles: true,
                    cancelable: true,
                    view: typeof unsafeWindow !== 'undefined' ? unsafeWindow : window,
                    screenX: 10,
                    screenY: 10,
                    clientX: 10,
                    clientY: 10
                });
                // ----------------------------------------------

                speedWrap.dispatchEvent(mousemove);
                speedBtn.click();
            } else if (document.querySelector('video')) {
                document.querySelector('video').playbackRate = rate;
            }
        },

        mute() {
            const muteBtn = document.querySelector('#video-box > div > xt-wrap > xt-controls > xt-inner > xt-volumebutton > xt-icon');
            if (muteBtn) muteBtn.click();
            const video = document.querySelector('video');
            if (video) video.volume = 0;
        },
        applyMediaDefault(media) {
            if (!media) return;
            // 使用 catch 处理播放失败
            const playPromise = media.play();
            if (playPromise) {
                playPromise
                    .catch(error => {
                    // AbortError 说明播放被中断，不需要重试
                    if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
                        console.warn('播放失败:', error);
                    }
                });
            }
            media.volume = 0;
            media.playbackRate = 2;
        },
        observePause(video) {
            if (!video) return () => { };
            const target = document.getElementsByClassName('play-btn-tip')[0];
            if (!target) return () => { };
            // 自动播放
            let isPlaying = false;
            const playVideo = () => {
                // 检查视频元素是否仍在文档中
                if (!document.body.contains(video)) {
                    console.warn('视频元素已被移除，停止播放尝试');
                    return;
                }
                // 避免重复调用 play()
                if (isPlaying) return;
                isPlaying = true;
                video.play()
                    .then(() => {
                    isPlaying = false;
                })
                    .catch(e => {
                    console.warn('自动播放失败:', e);
                    isPlaying = false;
                    // 仅在网络或其他非中断错误时重试
                    if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') {
                        setTimeout(playVideo, 3000);
                    }
                });
            };
            playVideo();
            const observer = new MutationObserver(list => {
                for (const mutation of list) {
                    if (mutation.type === 'childList' && target.innerText === '播放') {
                        // 再次检查元素是否存在
                        if (document.body.contains(video)) {
                            playVideo();
                        }
                    }
                }
            });
            observer.observe(target, { childList: true });
            return () => observer.disconnect();
        },
        waitForEnd(media, timeout = 0) {
            return new Promise(resolve => {
                if (!media) return resolve();
                if (media.ended) return resolve();
                let timer;
                let hasResolved = false;
                const onEnded = () => {
                    if (!hasResolved) {
                        hasResolved = true;
                        clearTimeout(timer);
                        resolve();
                    }
                };
                // 检查元素是否被移除
                const checkElementExists = () => {
                    if (!document.body.contains(media)) {
                        if (!hasResolved) {
                            hasResolved = true;
                            media.removeEventListener('ended', onEnded);
                            clearTimeout(timer);
                            resolve();
                        }
                    }
                };
                media.addEventListener('ended', onEnded, { once: true });
                const existenceCheckInterval = setInterval(checkElementExists, 1000);
                if (timeout > 0) {
                    timer = setTimeout(() => {
                        clearInterval(existenceCheckInterval);
                        if (!hasResolved) {
                            hasResolved = true;
                            media.removeEventListener('ended', onEnded);
                            resolve();
                        }
                    }, timeout);
                }
            });
        }
    };

    async function toTaskPage() {

        if (!window.location.pathname.includes('studentLog')) {
            return; // Exit early if the condition is not met
        }

        // 展开日志
        const logs = document.querySelectorAll("#app > div.viewContainer > div > div > div.mainTab.el-tabs.el-tabs--top > div.el-tabs__content .activity-info");

        for (const log of logs) {
            if (Utils.hasKeywordInText(log, '考试') || !Utils.hasKeywordInText(log, '展开')) {
                continue;
            }
            const spans = log.querySelectorAll('span');
            console.log('点击展开')
            if (spans[1].innerText.includes('展开'))
                spans[1].click();
        }

        await Utils.sleep(2000);

        // 任务列表
        const videoList = document.querySelectorAll("#app > div.viewContainer > div > div > div.mainTab.el-tabs.el-tabs--top > div.el-tabs__content .el-tooltip.activity-info");

        if (!videoList) {
            console.log('log list is null');
            return;
        }

        for (const node of videoList) {
            if (Utils.hasKeywordInText(node.parentElement, '已')) {
                console.log('已完成，跳过');
                continue;
            }
            if (Utils.hasKeywordInText(node.parentElement, '考试')) {
                console.log('跳过考试');
                continue;
            }
            if (Utils.hasKeywordInText(node.parentElement, '作业') || Utils.hasKeywordInText(node.parentElement, '练习') || Utils.hasKeywordInText(node.parentElement, '课后')|| Utils.hasKeywordInText(node.parentElement, '题')) {
                console.log('跳过作业');
                continue;
            }
            if (Utils.hasKeywordInText(node.parentElement, '讨论')) {
                console.log('跳过讨论');
                continue;
            }

            console.log('click node: ');
            console.log(node)
            node.click();

            break;

            console.log(node)
        }
    }

    // 绕过切屏检测
    function preventScreenCheck() {
        const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
        const blackList = new Set(['visibilitychange', 'blur', 'pagehide']);

        // 保存原始的 addEventListener
        const originalWindowAddEventListener = win.addEventListener;
        const originalDocumentAddEventListener = document.addEventListener;

        // 重新定义 addEventListener
        win.addEventListener = function (...args) {
            return blackList.has(args[0]) ? undefined : originalWindowAddEventListener.apply(this, args);
        };

        document.addEventListener = function (...args) {
            return blackList.has(args[0]) ? undefined : originalDocumentAddEventListener.apply(this, args);
        };

        Object.defineProperties(document, {
            hidden: { value: false },
            visibilityState: { value: 'visible' }
        });

        document.onvisibilitychange = null;
        document.onblur = null;
        document.hasFocus = () => true;

        win.onblur = null;
        win.onpagehide = null;
    }


    async function autoPlayVideo() {

        let isDone = false;

        preventScreenCheck();
        const video = document.querySelector('video');

        if (video) {

            console.log('start play video')
            Player.observePause(video);
            Player.mute();
            Player.applySpeed(2);

            const checkProgress = async () => {
                await Utils.sleep(2000);
                console.log('check progress...')
                const progressWrap = document.querySelector('.progress-wrap') || document.querySelector('[class*="progress-wrap"]');

                if (progressWrap && progressWrap.textContent.includes('已完成')) {
                    console.log("✅ 雨课堂助手：当前视频播放完毕！");
                    isDone = true
                    history.back();
                    await Utils.sleep(2000);
                    location.reload();
                }
            }

            while (!isDone) {
                if (!window.location.pathname.includes('video')) {
                    break;
                }
                await checkProgress();
            }


        }
    }

    async function run() {
        while (true) {
            await Utils.sleep(2000);
            console.log('looping ...')

            // 如果开关被关闭，则不执行后续逻辑，继续等待下一次循环
            if (!isEnabled) {
                continue;
            }


            if (window.location.pathname.includes('studentLog')) {
                await toTaskPage();
            }

            if (window.location.pathname.includes('video')) {
                await autoPlayVideo();
            }

            if (window.location.pathname.includes('graph')) {
                console.log('已阅读外部链接');
                await Utils.sleep(2000);
                history.back();
                location.reload();
                continue;
            }

        }
    }




    // 启动
    if (Utils.inIframe()) return;
    injectUI();
    run();
})();

