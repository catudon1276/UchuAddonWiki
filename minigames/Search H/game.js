// =====================
// データ・定数
// =====================
const colors = [
    '#ef4444','#f97316','#eab308','#22c55e','#06b6d4',
    '#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f43f5e',
    '#84cc16','#a855f7','#0ea5e9','#f59e0b','#10b981',
    '#6366f1','#d946ef','#fbbf24','#34d399','#60a5fa',
    '#c084fc','#fb923c','#4ade80','#38bdf8','#e879f9',
    '#a3e635','#fb7185','#67e8f9','#818cf8','#fcd34d'
];

const BASE_WORLD_SIZE = 2200;
const WORLD_SIZE_PER_LEVEL = 150;  // レベルごとに広がるサイズ
const VIEWPORT_SIZE = 800;
const CHAR_WIDTH = 168;
const CHAR_HEIGHT = 120;

// 現在のワールドサイズ（レベルによって変動）
let currentWorldSize = BASE_WORLD_SIZE;

// ワールドサイズを計算
function getWorldSize(level) {
    return BASE_WORLD_SIZE + (level * WORLD_SIZE_PER_LEVEL);
}

const diffSettings = [
    { id: 'easy',      name: 'EASY',      desc: 'ミス: 減点なし / 初期: 90秒', start: 90, penalty: 0,   recovery: 15, color: '#10b981', baseCount: 200, countPerLevel: 20 },
    { id: 'normal',    name: 'NORMAL',    desc: 'ミス: -5秒 / 初期: 60秒',    start: 60, penalty: 5,   recovery: 10, color: '#3b82f6', baseCount: 250, countPerLevel: 25 },
    { id: 'hard',      name: 'HARD',      desc: 'ミス: -10秒 / 初期: 45秒',   start: 45, penalty: 10,  recovery: 10,  color: '#f59e0b', baseCount: 300, countPerLevel: 30 },
    { id: 'nightmare', name: 'NIGHTMARE', desc: 'ミス: 即死 / 初期: 30秒',     start: 30, penalty: 999, recovery: 5,  color: '#ef4444', baseCount: 350, countPerLevel: 35 }
];

// =====================
// ゲーム状態
// =====================
let score = 0;
let timeLeft = 0;
let gameActive = false;
let timerInterval = null;
let targetColor = '';
let currentDiffIndex = 1;
let deathCause = '';  // 死因: 'timeout' | 'miss'
let gameStartTime = 0;  // ゲーム開始時刻
let totalPlayTime = 0;  // 総プレイ時間（秒）
let levelStartTime = 0;  // レベル開始時刻
let lastLevelTime = 0;   // 直前のレベルにかかった時間

// =====================
// カメラ状態
// =====================
let scale = 1.3;
let translateX = 0;
let translateY = 0;
let lastPoint = { x: 0, y: 0 };
let dragStartTime = 0;
let isMoving = false;
let pointerDown = false;
let currentVisualScale = 1;

// =====================
// DOM参照
// =====================
const world            = document.getElementById('world');
const viewport         = document.getElementById('viewport');
const overlay          = document.getElementById('overlay-screen');
const spotlightScreen  = document.getElementById('spotlight-screen');
const spotlightTarget  = document.getElementById('spotlight-target');
const spotlightLevel   = document.getElementById('spotlight-level');
const spotlightCanvas  = document.getElementById('spotlight-canvas');
const spotlightCtx     = spotlightCanvas.getContext('2d');
const spotlightWhiteLeft  = document.getElementById('spotlight-white-left');
const spotlightWhiteRight = document.getElementById('spotlight-white-right');
const spotlightShadow  = document.getElementById('spotlight-shadow');
const flashLayer       = document.getElementById('flash-layer');
const scoreDisplay     = document.getElementById('score-display');
const timerDisplay     = document.getElementById('timer-display');
const targetPreview    = document.getElementById('target-preview');
const diffNameEl       = document.getElementById('diff-name');
const diffDescEl       = document.getElementById('diff-desc');
const startContent     = document.getElementById('start-content');
const clearContent     = document.getElementById('clear-content');
const gameoverContent  = document.getElementById('gameover-content');
const clearTitle       = document.getElementById('clear-title');
const finalScore       = document.getElementById('final-score');
const appWrapper       = document.getElementById('app-wrapper');

// =====================
// レイアウト調整
// =====================
function adjustLayout() {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    currentVisualScale = Math.min(screenW / (VIEWPORT_SIZE + 40), screenH / (VIEWPORT_SIZE + 150), 1);
    appWrapper.style.transform = `scale(${currentVisualScale})`;
}

// =====================
// 難易度セレクター
// =====================
function changeDifficulty(dir) {
    currentDiffIndex = (currentDiffIndex + dir + diffSettings.length) % diffSettings.length;
    const d = diffSettings[currentDiffIndex];
    diffNameEl.textContent = d.name;
    diffNameEl.style.color  = d.color;
    diffDescEl.textContent  = d.desc;
}

// =====================
// ターゲット・スポットライト
// =====================
function pickNewTarget() {
    const diffId = getDifficultyId();
    const level = score + 1;  // 次のレベル
    const parts = generateRandomParts(diffId, level);
    setTargetParts(parts);
    updateTargetPreview(targetPreview);
    updateSpotlightTarget(spotlightTarget);
    updateSpotlightShadow(spotlightShadow);
}

// =====================
// サーチライト演出 (Canvas版)
// =====================
const spotlightLights = [
    { x: -500, y: 0, targetX: -500, targetY: 0, radius: 200 },
    { x: 0, y: 0, targetX: 0, targetY: 0, radius: 200 }
];
let spotlightAnimFrame = null;
let spotlightSceneState = 0;
let spotlightStartTime = 0;
let spotlightStateTimer = 0;

function resizeSpotlightCanvas() {
    spotlightCanvas.width = VIEWPORT_SIZE;
    spotlightCanvas.height = VIEWPORT_SIZE;
    const midY = VIEWPORT_SIZE / 2;
    spotlightLights[0].y = midY;
    spotlightLights[1].y = midY;
    spotlightLights[0].targetY = midY;
    spotlightLights[1].targetY = midY;
}

function drawSpotlightCanvas() {
    const width = VIEWPORT_SIZE;
    const height = VIEWPORT_SIZE;

    // 黒で全体を塗りつぶし
    spotlightCtx.globalCompositeOperation = 'source-over';
    spotlightCtx.fillStyle = '#000000';
    spotlightCtx.fillRect(0, 0, width, height);

    if (spotlightSceneState === 0) {
        // 完全暗転時は白い円も非表示
        spotlightWhiteLeft.style.display = 'none';
        spotlightWhiteRight.style.display = 'none';
        return;
    }

    // 白い円を表示・位置更新（左右それぞれ）
    spotlightWhiteLeft.style.display = 'block';
    spotlightWhiteLeft.style.left = spotlightLights[0].x + 'px';
    spotlightWhiteLeft.style.top = spotlightLights[0].y + 'px';

    spotlightWhiteRight.style.display = 'block';
    spotlightWhiteRight.style.left = spotlightLights[1].x + 'px';
    spotlightWhiteRight.style.top = spotlightLights[1].y + 'px';

    // 黒マスクに穴を開ける（白い円と同じ位置・サイズ）
    spotlightCtx.globalCompositeOperation = 'destination-out';
    spotlightCtx.fillStyle = '#ffffff';
    spotlightLights.forEach(light => {
        spotlightCtx.beginPath();
        spotlightCtx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
        spotlightCtx.fill();
    });
}

// イージング関数
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}
function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function runSpotlightSequence(level) {
    return new Promise(resolve => {
        resizeSpotlightCanvas();

        const midY = VIEWPORT_SIZE / 2;
        const midX = VIEWPORT_SIZE / 2;

        // 初期位置（画面外）
        spotlightLights[0].x = -200;
        spotlightLights[1].x = VIEWPORT_SIZE + 200;
        spotlightLights[0].y = midY;
        spotlightLights[1].y = midY;

        spotlightStartTime = Date.now();

        spotlightLevel.textContent = `LEVEL ${level}`;
        spotlightScreen.classList.remove('fading');
        spotlightScreen.style.display = 'block';
        spotlightTarget.style.display = 'none';
        spotlightShadow.style.display = 'none';

        // タイムライン定義（合計4000ms）
        const BLACKOUT_END = 800;      // 暗転終了
        const CONVERGE_END = 2200;     // 中央収束完了
        const HOLD_END = 3600;         // 見せる時間（1秒追加）
        const FADE_END = 4000;         // フェードアウト完了

        function animate() {
            const now = Date.now();
            const elapsed = now - spotlightStartTime;

            // 描画前に位置を計算
            if (elapsed < BLACKOUT_END) {
                // 暗転中 - 何も描画しない
                spotlightSceneState = 0;
            } else if (elapsed < CONVERGE_END) {
                // 中央へ収束（時間ベースのイージング）
                spotlightSceneState = 1;
                if (elapsed === BLACKOUT_END || spotlightTarget.style.display === 'none') {
                    spotlightTarget.style.display = 'block';
                    spotlightShadow.style.display = 'block';
                }
                const t = (elapsed - BLACKOUT_END) / (CONVERGE_END - BLACKOUT_END);
                const eased = easeInOutCubic(t);

                // 左から中央へ
                spotlightLights[0].x = -200 + (midX - (-200)) * eased;
                // 右から中央へ
                spotlightLights[1].x = (VIEWPORT_SIZE + 200) + (midX - (VIEWPORT_SIZE + 200)) * eased;
                spotlightLights[0].y = midY;
                spotlightLights[1].y = midY;
            } else if (elapsed < HOLD_END) {
                // 中央で静止
                spotlightSceneState = 2;
                spotlightLights[0].x = midX;
                spotlightLights[1].x = midX;
            } else if (elapsed < FADE_END) {
                // フェードアウト
                spotlightSceneState = 3;
                if (!spotlightScreen.classList.contains('fading')) {
                    spotlightScreen.classList.add('fading');
                }
            } else {
                // 終了
                spotlightScreen.style.display = 'none';
                cancelAnimationFrame(spotlightAnimFrame);
                resolve();
                return;
            }

            drawSpotlightCanvas();
            spotlightAnimFrame = requestAnimationFrame(animate);
        }

        animate();
    });
}

// =====================
// キャラクター配置
// =====================
// 重なり判定（30%以上の重なりを禁止）
function checkOverlap(x, y, placedPositions) {
    const minDistX = CHAR_WIDTH * 0.7;   // 117.6
    const minDistY = CHAR_HEIGHT * 0.7;  // 84

    for (const pos of placedPositions) {
        const dx = Math.abs(x - pos.x);
        const dy = Math.abs(y - pos.y);
        if (dx < minDistX && dy < minDistY) {
            return true;
        }
    }
    return false;
}

// ランダム配置（重なり30%以下を保証）
function generateRandomPositions(count, worldSize) {
    const positions = [];
    const maxAttemptsPerChar = 100;

    for (let i = 0; i < count; i++) {
        let x, y;
        let placed = false;

        for (let attempt = 0; attempt < maxAttemptsPerChar; attempt++) {
            x = Math.random() * (worldSize - CHAR_WIDTH);
            y = Math.random() * (worldSize - CHAR_HEIGHT);

            if (!checkOverlap(x, y, positions)) {
                positions.push({ x, y });
                placed = true;
                break;
            }
        }

        // 配置できなかった場合はグリッドフォールバック
        if (!placed) {
            const cellWidth = CHAR_WIDTH * 0.7;
            const cellHeight = CHAR_HEIGHT * 0.7;
            const cols = Math.floor((worldSize - CHAR_WIDTH) / cellWidth) + 1;

            // 未使用のグリッドセルを探す
            for (let cellIdx = 0; cellIdx < cols * 25; cellIdx++) {
                const col = cellIdx % cols;
                const row = Math.floor(cellIdx / cols);
                const gx = col * cellWidth + (Math.random() - 0.5) * 20;
                const gy = row * cellHeight + (Math.random() - 0.5) * 20;
                const clampedX = Math.max(0, Math.min(worldSize - CHAR_WIDTH, gx));
                const clampedY = Math.max(0, Math.min(worldSize - CHAR_HEIGHT, gy));

                if (!checkOverlap(clampedX, clampedY, positions)) {
                    positions.push({ x: clampedX, y: clampedY });
                    placed = true;
                    break;
                }
            }
        }

        // それでも配置できない場合は強制配置（稀）
        if (!placed) {
            positions.push({ x, y });
        }
    }

    return positions;
}

// クリック位置で最前面のキャラクターを探す（中央部分のみ有効）
function findClickedCharacter(worldX, worldY) {
    const characters = document.querySelectorAll('.character');
    let topChar = null;
    let topZIndex = -1;

    // キャラクターの中央70%をヒット領域とする
    const hitMarginX = CHAR_WIDTH * 0.15;  // 左右15%は透明扱い
    const hitMarginY = CHAR_HEIGHT * 0.15; // 上下15%は透明扱い

    characters.forEach(char => {
        const left = parseFloat(char.style.left) || 0;
        const top = parseFloat(char.style.top) || 0;

        // 中央70%の範囲内かチェック
        const hitLeft = left + hitMarginX;
        const hitRight = left + CHAR_WIDTH - hitMarginX;
        const hitTop = top + hitMarginY;
        const hitBottom = top + CHAR_HEIGHT - hitMarginY;

        if (worldX >= hitLeft && worldX <= hitRight &&
            worldY >= hitTop && worldY <= hitBottom) {
            // DOM順で後に追加されたものが前面
            // z-indexは使っていないので、DOM順で判定
            const charIndex = Array.from(characters).indexOf(char);
            if (charIndex > topZIndex) {
                topZIndex = charIndex;
                topChar = char;
            }
        }
    });

    return topChar;
}

function spawnCharacters() {
    world.innerHTML = '';
    const diff = diffSettings[currentDiffIndex];
    const count = diff.baseCount + (score * diff.countPerLevel);
    const diffId = getDifficultyId();

    // レベルに応じてワールドサイズを更新
    currentWorldSize = getWorldSize(score);
    world.style.width = currentWorldSize + 'px';
    world.style.height = currentWorldSize + 'px';

    // ランダムで位置を生成（重なり30%以下保証）
    const positions = generateRandomPositions(count, currentWorldSize);

    const currentLevel = score + 1;  // 現在のレベル
    for (let i = 0; i < count; i++) {
        const isTarget = (i === 0);
        const parts = isTarget ? targetParts : generateDifferentParts(diffId, currentLevel);
        const char = createCharacterElement(parts, isTarget);

        const pos = positions[i];
        char.style.left = `${pos.x}px`;
        char.style.top  = `${pos.y}px`;

        char.addEventListener('pointerdown', (e) => {
            dragStartTime = Date.now();
            // ワールド座標でのクリック位置を保存
            char.dataset.clickWorldX = (parseFloat(char.style.left) || 0) + e.offsetX;
            char.dataset.clickWorldY = (parseFloat(char.style.top) || 0) + e.offsetY;
        });

        char.addEventListener('pointerup', () => {
            if (!gameActive || isMoving) return;
            if (Date.now() - dragStartTime < 300) {
                // クリック位置でヒットしたキャラクターを探す
                const clickedChar = findClickedCharacter(
                    parseFloat(char.dataset.clickWorldX),
                    parseFloat(char.dataset.clickWorldY)
                );

                if (!clickedChar) return;  // 何もヒットしなかった

                if (isMatchingParts(clickedChar)) {
                    // 逃走イベントチェック
                    if (tryEscape(clickedChar)) {
                        return; // 逃げた場合は何もしない
                    }
                    foundTarget(clickedChar);
                } else {
                    applyPenalty();
                }
            }
        });

        world.appendChild(char);
    }
}

// =====================
// ペナルティ・ダメージ
// =====================
function applyPenalty() {
    // 難易度に関係なく赤フラッシュを表示
    flashLayer.classList.remove('damage-effect');
    void flashLayer.offsetWidth;
    flashLayer.classList.add('damage-effect');

    const p = diffSettings[currentDiffIndex].penalty;
    if (p === 0) return;

    // nightmare（即死）かどうか判定
    const isInstantDeath = p >= 999;
    timeLeft = Math.max(0, timeLeft - p);
    updateUI();

    if (timeLeft <= 0) {
        endGame(isInstantDeath ? 'miss' : 'timeout');
    }
}

// =====================
// カメラ（パン）
// =====================
function updateTransform() {
    const minX = VIEWPORT_SIZE - (currentWorldSize * scale);
    const minY = VIEWPORT_SIZE - (currentWorldSize * scale);
    translateX = Math.min(0, Math.max(minX, translateX));
    translateY = Math.min(0, Math.max(minY, translateY));
    world.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

// ドラッグ開始はbody全体で受付
document.body.addEventListener('pointerdown', (e) => {
    if (!gameActive) return;
    lastPoint   = { x: e.clientX, y: e.clientY };
    isMoving    = false;
    pointerDown = true;
});

// ドラッグ中はdocument全体で追跡（画面外でも動作）
document.addEventListener('pointermove', (e) => {
    if (!gameActive || !pointerDown) return;
    const dx = (e.clientX - lastPoint.x) / currentVisualScale;
    const dy = (e.clientY - lastPoint.y) / currentVisualScale;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isMoving = true;
    if (isMoving) {
        translateX += dx;
        translateY += dy;
        lastPoint = { x: e.clientX, y: e.clientY };
        updateTransform();
    }
});

// ドラッグ終了もdocument全体で追跡
document.addEventListener('pointerup', () => {
    pointerDown = false;
    setTimeout(() => { isMoving = false; }, 50);
});

// =====================
// ゲームフロー
// =====================
function handleStart() {
    pickNewTarget();
    rollEvents(); // イベント判定
    overlay.classList.add('hidden');
    runSpotlightSequence(1).then(() => { startGame(); });
}

function startGame() {
    score    = 0;
    timeLeft = diffSettings[currentDiffIndex].start;
    gameActive = true;
    gameStartTime = Date.now();  // ゲーム開始時刻を記録
    levelStartTime = Date.now(); // レベル開始時刻を記録

    startContent.classList.add('hidden');
    gameoverContent.classList.add('hidden');
    clearContent.classList.add('hidden');

    // 初期ワールドサイズを設定
    currentWorldSize = getWorldSize(score);

    scale      = 1.3;
    translateX = (VIEWPORT_SIZE - currentWorldSize * scale) / 2;
    translateY = (VIEWPORT_SIZE - currentWorldSize * scale) / 2;

    spawnCharacters();
    applyEvents(); // イベント適用
    updateTransform();
    updateUI();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!gameActive) return;
        timeLeft -= 0.1;
        if (timeLeft <= 0) endGame();
        updateUI();
    }, 100);
}

function foundTarget(el) {
    gameActive = false;
    clearEvents(); // イベントクリア
    el.classList.add('target-found');

    // レベルクリア時間を計算
    lastLevelTime = (Date.now() - levelStartTime) / 1000;

    // 難易度に応じた回復量
    const recovery = diffSettings[currentDiffIndex].recovery;

    score++;
    timeLeft += recovery;
    setTimeout(() => {
        clearTitle.textContent = `Level ${score} Clear!`;
        // レベルクリア時間を表示
        const clearTimeEl = document.getElementById('clear-time');
        if (clearTimeEl) {
            clearTimeEl.textContent = `Time: ${lastLevelTime.toFixed(2)}s`;
        }
        // 回復量を表示
        const recoveryEl = document.querySelector('#clear-content .text-emerald-400');
        if (recoveryEl) {
            recoveryEl.textContent = `+${recovery.toFixed(1)}s RECOVERY`;
        }
        overlay.classList.remove('hidden');
        clearContent.classList.remove('hidden');
    }, 600);
}

function nextLevel() {
    overlay.classList.add('hidden');
    clearContent.classList.add('hidden');
    pickNewTarget();
    rollEvents(); // 次レベルのイベント判定
    runSpotlightSequence(score + 1).then(() => {
        levelStartTime = Date.now(); // 新レベル開始時刻を記録
        gameActive = true;
        spawnCharacters();
        applyEvents(); // イベント適用
        updateUI();
    });
}

// ランク計算（全難易度共通）
function calculateRank(score) {
    // 共通基準スコア
    // XXX(150)が人間の限界値
    // U1以降は超人領域（U1=200, U2=250, U3=300, U4=350, ...）

    // U領域の計算（200以上）
    if (score >= 200) {
        const uLevel = Math.floor((score - 200) / 50) + 1;
        return { rank: `U${uLevel}`, color: 'text-fuchsia-400' };
    }
    if (score >= 150) return { rank: 'XXX', color: 'text-rose-400' };    // 人間の限界
    if (score >= 120) return { rank: 'XX', color: 'text-rose-500' };
    if (score >= 100) return { rank: 'X', color: 'text-red-500' };
    if (score >= 80) return { rank: 'SSS', color: 'text-amber-300' };
    if (score >= 60) return { rank: 'SS', color: 'text-amber-400' };
    if (score >= 45) return { rank: 'S', color: 'text-yellow-400' };
    if (score >= 30) return { rank: 'A', color: 'text-emerald-400' };
    if (score >= 15) return { rank: 'B', color: 'text-blue-400' };
    if (score >= 5) return { rank: 'C', color: 'text-slate-300' };
    return { rank: 'D', color: 'text-slate-500' };
}

// 時間フォーマット
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function endGame(cause = 'timeout') {
    gameActive = false;
    deathCause = cause;
    clearEvents(); // イベントクリア
    timeLeft   = 0;
    updateUI();
    clearInterval(timerInterval);

    // 総プレイ時間を計算
    totalPlayTime = (Date.now() - gameStartTime) / 1000;

    // スコア表示
    finalScore.textContent = score;

    // 難易度表示
    const diff = diffSettings[currentDiffIndex];
    const resultDifficulty = document.getElementById('result-difficulty');
    resultDifficulty.textContent = diff.name;
    resultDifficulty.style.color = diff.color;

    // クリア時間表示
    const resultTime = document.getElementById('result-time');
    resultTime.textContent = formatTime(totalPlayTime);

    // ランク計算・表示
    const { rank, color } = calculateRank(score);
    const resultRank = document.getElementById('result-rank');
    resultRank.textContent = rank;
    resultRank.className = `text-3xl font-black ${color}`;

    // 死因に応じてタイトルを変更
    const gameoverTitle = document.getElementById('gameover-title');
    if (cause === 'miss') {
        gameoverTitle.textContent = 'MISS!';
        gameoverTitle.className = 'text-4xl font-black mb-4 text-orange-500 italic';
    } else {
        gameoverTitle.textContent = 'TIME OVER';
        gameoverTitle.className = 'text-4xl font-black mb-4 text-rose-500 italic';
    }

    overlay.classList.remove('hidden');
    gameoverContent.classList.remove('hidden');
}

// =====================
// UI更新
// =====================
function updateUI() {
    timerDisplay.textContent = Math.max(0, timeLeft).toFixed(1);
    scoreDisplay.textContent = score;
    timerDisplay.classList.toggle('text-red-500', timeLeft <= 5);
}

// =====================
// イベントバインド・初期化
// =====================
document.getElementById('prev-diff').onclick  = () => changeDifficulty(-1);
document.getElementById('next-diff').onclick  = () => changeDifficulty(1);
document.getElementById('start-btn').onclick  = handleStart;
document.getElementById('next-btn').onclick   = nextLevel;
document.getElementById('retry-btn').onclick  = () => {
    gameoverContent.classList.add('hidden');
    startContent.classList.remove('hidden');
};
document.getElementById('back-wiki-btn').onclick = () => {
    window.location.href = '/UchuAddonWiki/';
};

window.addEventListener('resize', adjustLayout);
adjustLayout();
changeDifficulty(0);

// ピンチズーム無効化
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('gestureend', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) e.preventDefault();
}, { passive: false });
