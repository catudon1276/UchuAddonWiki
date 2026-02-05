// =====================
// キャラクターパーツシステム
// =====================

// スプライトシート設定
const SPRITE_WIDTH = 350;
const SPRITE_HEIGHT = 250;
const SPRITE_COLS = 3;

// パーツ定義
const CharacterParts = {
    body: {
        file: 'textures/Body.png',
        count: 15,  // 3x5グリッド
        rows: 5
    },
    eye: {
        file: 'textures/Eye.png',
        count: 8,   // 3x3グリッド - 1
        rows: 3
    },
    accessory: {
        file: 'textures/Accessory.png',
        count: 15,  // 3x5グリッド
        rows: 5
    }
};

// 現在のターゲットパーツ構成
let targetParts = null;

// デフォルト（高頻出）の組み合わせ（40%の確率で使用）
// 指定: (body-eye-accessory) 1始まり → 0始まりに変換済み
const defaultCombinations = [
    { body: 0, eye: 0, accessory: 0 },   // 1-1-1
    { body: 1, eye: 1, accessory: 1 },   // 2-2-2
    { body: 2, eye: 0, accessory: 2 },   // 3-1-3
    { body: 3, eye: 0, accessory: 3 },   // 4-1-4
    { body: 4, eye: 0, accessory: 4 },   // 5-1-5
    { body: 5, eye: 0, accessory: 5 },   // 6-1-6
    { body: 6, eye: 2, accessory: 6 },   // 7-3-7
    { body: 7, eye: 0, accessory: 7 },   // 8-1-8
    { body: 8, eye: 0, accessory: 8 },   // 9-1-9
    { body: 9, eye: 5, accessory: 9 },   // 10-6-10
    { body: 10, eye: 7, accessory: 10 }, // 11-8-11
    { body: 11, eye: 0, accessory: 11 }, // 12-1-12
    { body: 12, eye: 0, accessory: 12 }, // 13-1-13
    { body: 13, eye: 0, accessory: 13 }, // 14-1-14
    { body: 14, eye: 0, accessory: 14 }  // 15-1-15
];
const DEFAULT_COMBINATION_RATE = 0.2;  // 20%の確率でデフォルト組み合わせを使用

// パーツがデフォルト組み合わせかどうかを判定
function isDefaultCombination(parts) {
    if (!parts) return false;
    return defaultCombinations.some(combo =>
        combo.body === parts.body &&
        combo.eye === parts.eye &&
        combo.accessory === parts.accessory
    );
}

// 難易度別の初期解放パーツ数
const baseUnlockedParts = {
    easy: { body: 3, eye: 2, accessory: 3 },
    normal: { body: 5, eye: 3, accessory: 5 },
    hard: { body: 8, eye: 5, accessory: 8 },
    nightmare: { body: 10, eye: 6, accessory: 10 }
};

// 難易度別の最大解放パーツ数
const maxUnlockedParts = {
    easy: { body: 10, eye: 5, accessory: 10 },
    normal: { body: 15, eye: 8, accessory: 15 },
    hard: { body: 15, eye: 8, accessory: 15 },
    nightmare: { body: 15, eye: 8, accessory: 15 }
};

// レベル毎の追加解放数（難易度別）
const partsUnlockPerLevel = {
    easy: { body: 1, eye: 0.5, accessory: 1, interval: 5 },      // 5レベルごとに解放
    normal: { body: 1, eye: 0.5, accessory: 1, interval: 3 },    // 3レベルごとに解放
    hard: { body: 1, eye: 0.5, accessory: 1, interval: 2 },      // 2レベルごとに解放
    nightmare: { body: 1, eye: 0.5, accessory: 1, interval: 1 }  // 毎レベル解放
};

// レベルに応じた解放パーツ数を計算
function getUnlockedPartsForLevel(diffId, level) {
    const base = baseUnlockedParts[diffId] || baseUnlockedParts.normal;
    const max = maxUnlockedParts[diffId] || maxUnlockedParts.normal;
    const perLevel = partsUnlockPerLevel[diffId] || partsUnlockPerLevel.normal;

    const unlockTimes = Math.floor(level / perLevel.interval);

    return {
        body: Math.min(max.body, base.body + Math.floor(unlockTimes * perLevel.body)),
        eye: Math.min(max.eye, base.eye + Math.floor(unlockTimes * perLevel.eye)),
        accessory: Math.min(max.accessory, base.accessory + Math.floor(unlockTimes * perLevel.accessory))
    };
}

// 後方互換性のため（既存コード用）
const unlockedPartsCount = {
    easy: { body: 10, eye: 5, accessory: 10 },
    normal: { body: 15, eye: 8, accessory: 15 },
    hard: { body: 15, eye: 8, accessory: 15 },
    nightmare: { body: 15, eye: 8, accessory: 15 }
};

// 表示サイズ別のスケール（高さ基準で統一）
const DisplayScales = {
    character: 120 / SPRITE_HEIGHT,  // 120px表示
    preview: 56 / SPRITE_HEIGHT,     // 56px表示
    spotlight: 200 / SPRITE_HEIGHT   // 200px表示
};

// スプライト位置を計算（スケール適用済み）
function getSpritePosition(partType, index, displayType = 'character') {
    const col = index % SPRITE_COLS;
    const row = Math.floor(index / SPRITE_COLS);
    const scale = DisplayScales[displayType] || DisplayScales.character;
    return {
        x: col * SPRITE_WIDTH * scale,
        y: row * SPRITE_HEIGHT * scale
    };
}

// デフォルト組み合わせから解放済みのものを取得（レベル対応）
function getUnlockedDefaultCombinations(diffId, level = 0) {
    const unlocked = getUnlockedPartsForLevel(diffId, level);
    return defaultCombinations.filter(combo =>
        combo.body < unlocked.body &&
        combo.eye < unlocked.eye &&
        combo.accessory < unlocked.accessory
    );
}

// ランダムなパーツ構成を生成（40%でデフォルト組み合わせ、レベル対応）
function generateRandomParts(diffId = 'normal', level = 0) {
    const unlocked = getUnlockedPartsForLevel(diffId, level);

    // 40%の確率でデフォルト組み合わせを使用
    if (Math.random() < DEFAULT_COMBINATION_RATE) {
        const unlockedDefaults = getUnlockedDefaultCombinations(diffId, level);
        if (unlockedDefaults.length > 0) {
            const combo = unlockedDefaults[Math.floor(Math.random() * unlockedDefaults.length)];
            return { ...combo };  // コピーを返す
        }
    }

    // 通常のランダム生成
    return {
        body: Math.floor(Math.random() * unlocked.body),
        eye: Math.floor(Math.random() * unlocked.eye),
        accessory: Math.floor(Math.random() * unlocked.accessory)
    };
}

// ターゲットのパーツを設定
function setTargetParts(parts) {
    targetParts = parts;
}

// ターゲットとは異なるパーツを生成（40%でデフォルト組み合わせ、レベル対応）
function generateDifferentParts(diffId = 'normal', level = 0, targetIsFullDefault = false, targetDefaultCombo = null) {
    if (!targetParts) return generateRandomParts(diffId, level);

    const unlocked = getUnlockedPartsForLevel(diffId, level);
    let parts;

    // 最低1つは異なるパーツにする
    do {
        // 40%の確率でデフォルト組み合わせを使用
        if (Math.random() < DEFAULT_COMBINATION_RATE) {
            const unlockedDefaults = getUnlockedDefaultCombinations(diffId, level);
            if (unlockedDefaults.length > 0) {
                // ターゲットが完全なデフォルト組み合わせの場合、同じ組み合わせを除外
                let availableDefaults = unlockedDefaults;
                if (targetIsFullDefault && targetDefaultCombo) {
                    availableDefaults = unlockedDefaults.filter(combo =>
                        !(combo.body === targetDefaultCombo.body &&
                          combo.eye === targetDefaultCombo.eye &&
                          combo.accessory === targetDefaultCombo.accessory)
                    );
                }
                
                // 利用可能なデフォルト組み合わせがあれば使用、なければランダム生成
                if (availableDefaults.length > 0) {
                    parts = { ...availableDefaults[Math.floor(Math.random() * availableDefaults.length)] };
                } else {
                    parts = {
                        body: Math.floor(Math.random() * unlocked.body),
                        eye: Math.floor(Math.random() * unlocked.eye),
                        accessory: Math.floor(Math.random() * unlocked.accessory)
                    };
                }
            } else {
                parts = {
                    body: Math.floor(Math.random() * unlocked.body),
                    eye: Math.floor(Math.random() * unlocked.eye),
                    accessory: Math.floor(Math.random() * unlocked.accessory)
                };
            }
        } else {
            parts = {
                body: Math.floor(Math.random() * unlocked.body),
                eye: Math.floor(Math.random() * unlocked.eye),
                accessory: Math.floor(Math.random() * unlocked.accessory)
            };
        }
        // ターゲットと完全一致しないこと
        // かつ、ターゲットがデフォルト組み合わせの場合、ランダム生成でも同じ組み合わせにならないこと
    } while (
        (parts.body === targetParts.body &&
         parts.eye === targetParts.eye &&
         parts.accessory === targetParts.accessory) ||
        (targetIsFullDefault && targetDefaultCombo &&
         parts.body === targetDefaultCombo.body &&
         parts.eye === targetDefaultCombo.eye &&
         parts.accessory === targetDefaultCombo.accessory)
    );
    return parts;
}

// キャラクター要素を作成
function createCharacterElement(parts, isTarget = false) {
    const container = document.createElement('div');
    container.className = 'character';
    if (isTarget) {
        container.dataset.isTarget = 'true';
    }

    // パーツデータを保存
    container.dataset.body = parts.body;
    container.dataset.eye = parts.eye;
    container.dataset.accessory = parts.accessory;

    // レイヤー順: body(背面) → eye → accessory(前面)
    const layers = ['body', 'eye', 'accessory'];

    layers.forEach((layer) => {
        const partEl = document.createElement('div');
        partEl.className = `character-part character-${layer}`;

        const pos = getSpritePosition(layer, parts[layer], 'character');
        partEl.style.backgroundImage = `url(${CharacterParts[layer].file})`;
        partEl.style.backgroundPosition = `-${pos.x}px -${pos.y}px`;

        container.appendChild(partEl);
    });

    return container;
}

// パーツが一致するかチェック
function isMatchingParts(element) {
    if (!targetParts) return false;
    return (
        parseInt(element.dataset.body) === targetParts.body &&
        parseInt(element.dataset.eye) === targetParts.eye &&
        parseInt(element.dataset.accessory) === targetParts.accessory
    );
}

// ターゲットプレビューを更新
function updateTargetPreview(previewElement) {
    if (!targetParts || !previewElement) return;

    // 既存のコンテンツをクリア
    previewElement.innerHTML = '';
    previewElement.style.backgroundColor = 'transparent';

    // プレビュー用のミニキャラクターを作成
    const layers = ['body', 'eye', 'accessory'];

    layers.forEach((layer) => {
        const partEl = document.createElement('div');
        partEl.className = `preview-part preview-${layer}`;

        const pos = getSpritePosition(layer, targetParts[layer], 'preview');
        partEl.style.backgroundImage = `url(${CharacterParts[layer].file})`;
        partEl.style.backgroundPosition = `-${pos.x}px -${pos.y}px`;

        previewElement.appendChild(partEl);
    });
}

// スポットライト用ターゲット表示を更新
function updateSpotlightTarget(spotlightElement) {
    if (!targetParts || !spotlightElement) return;

    // 既存のコンテンツをクリア
    spotlightElement.innerHTML = '';
    spotlightElement.style.backgroundColor = 'transparent';

    const layers = ['body', 'eye', 'accessory'];

    layers.forEach((layer) => {
        const partEl = document.createElement('div');
        partEl.className = `spotlight-part spotlight-${layer}`;

        const pos = getSpritePosition(layer, targetParts[layer], 'spotlight');
        partEl.style.backgroundImage = `url(${CharacterParts[layer].file})`;
        partEl.style.backgroundPosition = `-${pos.x}px -${pos.y}px`;

        spotlightElement.appendChild(partEl);
    });
}

// スポットライト用シャドウ表示を更新
function updateSpotlightShadow(shadowElement) {
    if (!targetParts || !shadowElement) return;

    // 既存のコンテンツをクリア
    shadowElement.innerHTML = '';
    shadowElement.style.backgroundColor = 'transparent';

    const layers = ['body', 'eye', 'accessory'];

    layers.forEach((layer) => {
        const partEl = document.createElement('div');
        partEl.className = `shadow-part shadow-${layer}`;

        const pos = getSpritePosition(layer, targetParts[layer], 'spotlight');
        partEl.style.backgroundImage = `url(${CharacterParts[layer].file})`;
        partEl.style.backgroundPosition = `-${pos.x}px -${pos.y}px`;

        shadowElement.appendChild(partEl);
    });
}
