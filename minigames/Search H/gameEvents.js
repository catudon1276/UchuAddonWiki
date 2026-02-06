// =====================
// ゲームイベントシステム
// =====================

// イベント定義
const GameEvents = {
    // 視野狭窄Lv1：軽度
    NARROW_VISION_1: {
        id: 'narrow_vision_1',
        name: '視野狭窄Lv1',
        description: '視野が少し狭くなる'
    },
    // 視野狭窄Lv2：中度
    NARROW_VISION_2: {
        id: 'narrow_vision_2',
        name: '視野狭窄Lv2',
        description: '視野がかなり狭くなる'
    },
    // 視野狭窄Lv3：重度
    NARROW_VISION_3: {
        id: 'narrow_vision_3',
        name: '視野狭窄Lv3',
        description: '視野が極端に狭くなる'
    },
    // 全移動Lv1：ゆっくり
    ALL_MOVE_1: {
        id: 'all_move_1',
        name: '全移動Lv1',
        description: '全キャラクターがゆっくり動く'
    },
    // 全移動Lv2：普通
    ALL_MOVE_2: {
        id: 'all_move_2',
        name: '全移動Lv2',
        description: '全キャラクターが動く'
    },
    // 全移動Lv3：速い
    ALL_MOVE_3: {
        id: 'all_move_3',
        name: '全移動Lv3',
        description: '全キャラクターが速く動く'
    },
    // 全移動Lv4：非常に速い
    ALL_MOVE_4: {
        id: 'all_move_4',
        name: '全移動Lv4',
        description: '全キャラクターが非常に速く動く'
    },
    // 逃走：クリック時に1回だけ短距離移動
    TARGET_ESCAPE: {
        id: 'target_escape',
        name: '逃走',
        description: 'ターゲットが1回逃げる'
    },
    // モノクロ化：全体がモノクロになる
    MONOCHROME: {
        id: 'monochrome',
        name: 'モノクロ',
        description: '画面がモノクロになる'
    },
    // ボディ一致：全キャラクターがターゲットと同じボディになる
    SAME_BODY: {
        id: 'same_body',
        name: 'ボディ一致',
        description: '全キャラクターが同じボディになる'
    }
};

// 難易度別イベント設定（確率と解放レベル）
const eventSettings = {
    easy: {
        narrow_vision_1: { prob: 0.15, unlockLevel: 10 },
        narrow_vision_2: { prob: 0.1, unlockLevel: 20 },
        narrow_vision_3: { prob: 0.01, unlockLevel: 50 },
        all_move_2: { prob: 0.1, unlockLevel: 25 },
        all_move_3: { prob: 0.05, unlockLevel: 35 },
        all_move_4: { prob: 0.01, unlockLevel: 100 },
        target_escape: { prob: 0.04, unlockLevel: 25 },
        monochrome: { prob: 0.01, unlockLevel: 20 },
        same_body: { prob: 0.05, unlockLevel: 30 }
    },
    normal: {
        narrow_vision_1: { prob: 0.2, unlockLevel: 5 },
        narrow_vision_2: { prob: 0.15, unlockLevel: 10 },
        narrow_vision_3: { prob: 0.1, unlockLevel: 40 },
        all_move_2: { prob: 0.15, unlockLevel: 15 },
        all_move_3: { prob: 0.1, unlockLevel: 25 },
        all_move_4: { prob: 0.05, unlockLevel: 80 },
        target_escape: { prob: 0.06, unlockLevel: 12 },
        monochrome: { prob: 0.1, unlockLevel: 10 },
        same_body: { prob: 0.08, unlockLevel: 20 }
    },
    hard: {
        narrow_vision_1: { prob: 0.25, unlockLevel: 3 },
        narrow_vision_2: { prob: 0.2, unlockLevel: 6 },
        narrow_vision_3: { prob: 0.01, unlockLevel: 30 },
        all_move_2: { prob: 0.2, unlockLevel: 8 },
        all_move_3: { prob: 0.15, unlockLevel: 15 },
        all_move_4: { prob: 0.1, unlockLevel: 50 },
        target_escape: { prob: 0.1, unlockLevel: 5 },
        monochrome: { prob: 0.2, unlockLevel: 5 },
        same_body: { prob: 0.1, unlockLevel: 10 }
    },
    nightmare: {
        narrow_vision_1: { prob: 0.3, unlockLevel: 1 },
        narrow_vision_2: { prob: 0.25, unlockLevel: 1 },
        narrow_vision_3: { prob: 0.1, unlockLevel: 20 },
        all_move_2: { prob: 0.3, unlockLevel: 3 },
        all_move_3: { prob: 0.25, unlockLevel: 6 },
        all_move_4: { prob: 0.15, unlockLevel: 30 },
        target_escape: { prob: 0.15, unlockLevel: 1 },
        monochrome: { prob: 0.3, unlockLevel: 2 },
        same_body: { prob: 0.15, unlockLevel: 5 }
    }
};

// 現在のアクティブイベント
let activeEvents = [];
let targetMoveInterval = null;
let hasEscaped = false;  // 逃走イベント用フラグ

// ビジョンオーバーレイ要素
let visionOverlay = null;

// イベントシステム初期化
function initEventSystem() {
    // 視野狭窄用オーバーレイを作成
    if (!visionOverlay) {
        visionOverlay = document.createElement('div');
        visionOverlay.id = 'vision-overlay';
        visionOverlay.style.cssText = `
            position: absolute;
            inset: 0;
            pointer-events: none;
            z-index: 100;
            opacity: 0;
            transition: opacity 0.5s;
            background: radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.95) 60%);
        `;
        document.getElementById('viewport').appendChild(visionOverlay);
    }
}

// 難易度IDを取得
function getDifficultyId() {
    return diffSettings[currentDiffIndex].id;
}

// イベントが解放されているかチェック
function isEventUnlocked(eventId, diffId, level) {
    const settings = eventSettings[diffId];
    if (!settings[eventId]) return false;
    return level >= settings[eventId].unlockLevel;
}

// イベントの発生確率を取得
function getEventProb(eventId, diffId) {
    const settings = eventSettings[diffId];
    if (!settings[eventId]) return 0;
    return settings[eventId].prob;
}

// レベル開始時にイベントを判定
function rollEvents() {
    activeEvents = [];
    hasEscaped = false;
    const diffId = getDifficultyId();
    const currentLevel = score + 1; // 次のレベル

    // 視野狭窄は1つだけ（重いものが優先）
    if (isEventUnlocked('narrow_vision_3', diffId, currentLevel) && Math.random() < getEventProb('narrow_vision_3', diffId)) {
        activeEvents.push(GameEvents.NARROW_VISION_3);
    } else if (isEventUnlocked('narrow_vision_2', diffId, currentLevel) && Math.random() < getEventProb('narrow_vision_2', diffId)) {
        activeEvents.push(GameEvents.NARROW_VISION_2);
    } else if (isEventUnlocked('narrow_vision_1', diffId, currentLevel) && Math.random() < getEventProb('narrow_vision_1', diffId)) {
        activeEvents.push(GameEvents.NARROW_VISION_1);
    }

    // 全移動は1つだけ（速いものが優先、Lv1は常時固定）
    if (isEventUnlocked('all_move_4', diffId, currentLevel) && Math.random() < getEventProb('all_move_4', diffId)) {
        activeEvents.push(GameEvents.ALL_MOVE_4);
    } else if (isEventUnlocked('all_move_3', diffId, currentLevel) && Math.random() < getEventProb('all_move_3', diffId)) {
        activeEvents.push(GameEvents.ALL_MOVE_3);
    } else if (isEventUnlocked('all_move_2', diffId, currentLevel) && Math.random() < getEventProb('all_move_2', diffId)) {
        activeEvents.push(GameEvents.ALL_MOVE_2);
    } else {
        // Lv1は常時固定（被りを回避するため）
        activeEvents.push(GameEvents.ALL_MOVE_1);
    }

    // その他のイベント（重複可能）
    if (isEventUnlocked('target_escape', diffId, currentLevel) && Math.random() < getEventProb('target_escape', diffId)) {
        activeEvents.push(GameEvents.TARGET_ESCAPE);
    }
    if (isEventUnlocked('monochrome', diffId, currentLevel) && Math.random() < getEventProb('monochrome', diffId)) {
        activeEvents.push(GameEvents.MONOCHROME);
    }
    if (isEventUnlocked('same_body', diffId, currentLevel) && Math.random() < getEventProb('same_body', diffId)) {
        activeEvents.push(GameEvents.SAME_BODY);
    }

    return activeEvents;
}

// イベントを適用
function applyEvents() {
    // 視野狭窄（段階別）
    if (isEventActive('narrow_vision_3')) {
        visionOverlay.style.background = 'radial-gradient(circle at center, transparent 15%, rgba(0,0,0,0.98) 35%)';
        visionOverlay.style.opacity = '1';
    } else if (isEventActive('narrow_vision_2')) {
        visionOverlay.style.background = 'radial-gradient(circle at center, transparent 25%, rgba(0,0,0,0.95) 50%)';
        visionOverlay.style.opacity = '1';
    } else if (isEventActive('narrow_vision_1')) {
        visionOverlay.style.background = 'radial-gradient(circle at center, transparent 35%, rgba(0,0,0,0.9) 65%)';
        visionOverlay.style.opacity = '1';
    } else {
        visionOverlay.style.opacity = '0';
    }

    // 全移動（4段階、Lv1は常時固定）
    if (isEventActive('all_move_4')) {
        startAllMovement(4);
    } else if (isEventActive('all_move_3')) {
        startAllMovement(3);
    } else if (isEventActive('all_move_2')) {
        startAllMovement(2);
    } else if (isEventActive('all_move_1')) {
        startAllMovement(1);
    }

    // モノクロ化
    if (isEventActive('monochrome')) {
        applyMonochrome(true);
    } else {
        applyMonochrome(false);
    }
}

// イベントをクリア
function clearEvents() {
    activeEvents = [];
    hasEscaped = false;

    // 視野狭窄解除
    if (visionOverlay) {
        visionOverlay.style.opacity = '0';
    }

    // 全移動停止
    stopAllMovement();

    // モノクロ解除
    applyMonochrome(false);
}

// モノクロ化適用（70%彩度低下＝彩度30%残し）
function applyMonochrome(enabled) {
    const world = document.getElementById('world');
    if (enabled) {
        world.style.filter = 'grayscale(90%)';
    } else {
        world.style.filter = '';
    }
}

// イベントがアクティブかチェック
function isEventActive(eventId) {
    return activeEvents.some(e => e.id === eventId);
}

// ボディ一致イベントがアクティブかチェック
function isSameBodyActive() {
    return isEventActive('same_body');
}

// 全移動のパラメータ設定（速度: px/frame）
const allMoveSettings = {
    1: { speed: 0.5 },   // ゆっくり（常時固定）
    2: { speed: 1.0 },   // 普通
    3: { speed: 2.0 },   // 速い
    4: { speed: 3.5 }    // 非常に速い
};

let allMoveAnimationId = null;
let characterVelocities = new Map();  // キャラクターごとの移動方向

// 全キャラクター移動開始
function startAllMovement(level) {
    stopAllMovement();

    const settings = allMoveSettings[level];
    characterVelocities.clear();

    // 全キャラクターに初期方向を設定
    const characters = document.querySelectorAll('.character');
    characters.forEach(char => {
        const angle = Math.random() * Math.PI * 2;
        characterVelocities.set(char, {
            vx: Math.cos(angle) * settings.speed,
            vy: Math.sin(angle) * settings.speed
        });
        // トランジションを無効化（滑らかに動かすため）
        char.style.transition = 'none';
    });

    // アニメーションループ
    function animate() {
        if (!gameActive) {
            allMoveAnimationId = requestAnimationFrame(animate);
            return;
        }

        characters.forEach(char => {
            const vel = characterVelocities.get(char);
            if (!vel) return;

            let currentLeft = parseFloat(char.style.left) || 0;
            let currentTop = parseFloat(char.style.top) || 0;

            // 移動
            let newLeft = currentLeft + vel.vx;
            let newTop = currentTop + vel.vy;

            // 境界で反射
            if (newLeft <= 0 || newLeft >= currentWorldSize - 168) {
                vel.vx *= -1;
                newLeft = Math.max(0, Math.min(currentWorldSize - 168, newLeft));
            }
            if (newTop <= 0 || newTop >= currentWorldSize - 120) {
                vel.vy *= -1;
                newTop = Math.max(0, Math.min(currentWorldSize - 120, newTop));
            }

            char.style.left = newLeft + 'px';
            char.style.top = newTop + 'px';
        });

        allMoveAnimationId = requestAnimationFrame(animate);
    }

    allMoveAnimationId = requestAnimationFrame(animate);
}

// 全移動停止
function stopAllMovement() {
    if (allMoveAnimationId) {
        cancelAnimationFrame(allMoveAnimationId);
        allMoveAnimationId = null;
    }
    characterVelocities.clear();
}

// 逃走イベント処理（クリック時に呼び出す）
function tryEscape(element) {
    if (!isEventActive('target_escape') || hasEscaped) {
        return false;
    }

    hasEscaped = true;

    // 短距離移動
    const currentLeft = parseFloat(element.style.left) || 0;
    const currentTop = parseFloat(element.style.top) || 0;

    // ランダムな方向に150〜250px移動
    const angle = Math.random() * Math.PI * 2;
    const distance = 150 + Math.random() * 100;

    const moveX = Math.cos(angle) * distance;
    const moveY = Math.sin(angle) * distance;

    const newLeft = Math.max(0, Math.min(currentWorldSize - 168, currentLeft + moveX));
    const newTop = Math.max(0, Math.min(currentWorldSize - 120, currentTop + moveY));

    element.style.transition = 'left 0.2s ease-out, top 0.2s ease-out';
    element.style.left = newLeft + 'px';
    element.style.top = newTop + 'px';

    // エフェクト（一瞬光る）
    element.style.boxShadow = '0 0 30px white';
    setTimeout(() => {
        element.style.boxShadow = '';
    }, 200);

    return true;
}

// アクティブイベントの表示用テキストを取得
function getActiveEventsText() {
    if (activeEvents.length === 0) return '';
    return activeEvents.map(e => e.name).join(' + ');
}

// 初期化
initEventSystem();
