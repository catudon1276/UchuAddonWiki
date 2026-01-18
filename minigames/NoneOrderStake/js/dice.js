/**
 * サイコロ処理モジュール
 */

/**
 * サイコロを振る（重み付け対応）
 * @param {number} count - 振るサイコロの数
 * @param {object} options - オプション
 * @param {number} options.min - 最小値（デフォルト1）
 * @param {number} options.max - 最大値（デフォルト6）
 * @param {string} options.weight - 重み付け ('low' | 'high' | null)
 * @param {number} options.weightStrength - 重みの強さ（0-1）
 * @param {boolean} options.cursed - 謎生物混入
 */
export function rollDice(count = 3, options = {}) {
    const {
        min = 1,
        max = 6,
        weight = null,
        weightStrength = 0,
        cursed = false,
        cursedChance = 0.3, // 謎生物が出る確率
    } = options;
    
    const results = [];
    
    for (let i = 0; i < count; i++) {
        let value;
        
        // 謎生物判定
        if (cursed && Math.random() < cursedChance) {
            value = 'cursed';
        } else {
            value = rollSingleDice(min, max, weight, weightStrength);
        }
        
        results.push(value);
    }
    
    return results;
}

/**
 * 単一サイコロを振る（重み付け対応）
 */
function rollSingleDice(min, max, weight, weightStrength) {
    const range = max - min + 1;
    const midpoint = (min + max) / 2;
    
    // 重み付けなし
    if (!weight || weightStrength <= 0) {
        return Math.floor(Math.random() * range) + min;
    }
    
    // 重み付け配列を作成
    const weights = [];
    for (let i = min; i <= max; i++) {
        let w = 1;
        
        if (weight === 'low') {
            // 低い目ほど出やすい
            w = i <= midpoint ? 1 + weightStrength : 1 - weightStrength * 0.5;
        } else if (weight === 'high') {
            // 高い目ほど出やすい
            w = i > midpoint ? 1 + weightStrength : 1 - weightStrength * 0.5;
        }
        
        weights.push(Math.max(0.1, w)); // 最小0.1
    }
    
    // 重み付きランダム選択
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < weights.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return min + i;
        }
    }
    
    return max; // フォールバック
}

/**
 * ションベン判定
 * @param {number} chance - ションベン発生確率（0-1）
 */
export function checkShonben(chance = 0.05) {
    return Math.random() < chance;
}

/**
 * サイコロ結果に謎生物が含まれるかチェック
 */
export function hasCursedDice(dice) {
    return dice.some(d => d === 'cursed');
}

/**
 * 謎生物の数をカウント
 */
export function countCursedDice(dice) {
    return dice.filter(d => d === 'cursed').length;
}

/**
 * 謎生物ペナルティを計算
 */
export function calculateCursedPenalty(dice, penalty) {
    const count = countCursedDice(dice);
    
    if (count === 0) return 0;
    if (count === 3) return penalty.triple;
    return penalty.single * count;
}

/**
 * サイコロアニメーション用の中間フレーム生成
 */
export function generateRollFrames(finalDice, frameCount = 10, options = {}) {
    const { min = 1, max = 6 } = options;
    const frames = [];
    
    for (let f = 0; f < frameCount; f++) {
        const frame = finalDice.map((final, i) => {
            // 最後の数フレームは徐々に確定
            if (f >= frameCount - 3 && f >= frameCount - 3 + i) {
                return final;
            }
            // それ以外はランダム
            return Math.floor(Math.random() * (max - min + 1)) + min;
        });
        frames.push(frame);
    }
    
    // 最終フレーム
    frames.push(finalDice);
    
    return frames;
}

/**
 * サイコロ結果を文字列化（デバッグ用）
 */
export function diceToString(dice) {
    return dice.map(d => d === 'cursed' ? '?' : d).join('-');
}
