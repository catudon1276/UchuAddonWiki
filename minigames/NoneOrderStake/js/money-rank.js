/**
 * 所持金ランクシステム
 * イカサマカードのコスト計算に使用
 */

// ===========================================
// ランク定義
// ===========================================
export const MONEY_RANKS = [
    { level: 0, min: 0,      max: 999,      label: 'L0' },
    { level: 1, min: 1000,   max: 2999,     label: 'L1' },
    { level: 2, min: 3000,   max: 6999,     label: 'L2' },
    { level: 3, min: 7000,   max: 14999,    label: 'L3' },
    { level: 4, min: 15000,  max: 29999,    label: 'L4' },
    { level: 5, min: 30000,  max: 59999,    label: 'L5' },
    { level: 6, min: 60000,  max: Infinity, label: 'L6' }
];

// ===========================================
// ランク取得関数
// ===========================================

/**
 * 所持金からランクを取得
 * @param {number} money - 所持金
 * @returns {object} ランク情報 { level, min, max, label }
 */
export function getMoneyRank(money) {
    for (let i = MONEY_RANKS.length - 1; i >= 0; i--) {
        if (money >= MONEY_RANKS[i].min) {
            return MONEY_RANKS[i];
        }
    }
    return MONEY_RANKS[0];
}

/**
 * ランクレベルから下限値を取得
 * @param {number} level - ランクレベル (0-6)
 * @returns {number} 下限値
 */
export function getRankFloor(level) {
    if (level < 0) return 0;
    if (level >= MONEY_RANKS.length) return MONEY_RANKS[MONEY_RANKS.length - 1].min;
    return MONEY_RANKS[level].min;
}

/**
 * ランクレベルから上限値を取得
 * @param {number} level - ランクレベル (0-6)
 * @returns {number} 上限値
 */
export function getRankCeiling(level) {
    if (level < 0) return MONEY_RANKS[0].max;
    if (level >= MONEY_RANKS.length) return Infinity;
    return MONEY_RANKS[level].max;
}

// ===========================================
// コスト計算関数
// ===========================================

/**
 * カードコスト計算（ランク低下方式）
 *
 * 仕様:
 * - 完全ランク（L-1, L-2, L-3）: 低下後ランクの下限値に所持金を強制変更
 * - 半ランク（L-0.5, L-1.5）: 1つ下のランクの上限値に変更
 *
 * @param {number} currentMoney - 現在の所持金
 * @param {number} rankCost - L-n形式のコスト（例: 0.5, 1, 1.5, 2, 3）
 * @returns {object} { canUse, cost, newMoney, newRank }
 */
export function calculateRankCost(currentMoney, rankCost) {
    const currentRank = getMoneyRank(currentMoney);
    const currentLevel = currentRank.level;

    // コスト0の場合は無料
    if (rankCost === 0) {
        return {
            canUse: true,
            cost: 0,
            newMoney: currentMoney,
            newRank: currentRank
        };
    }

    // 半ランク（0.5）の判定
    const isHalfRank = rankCost % 1 !== 0;
    const fullRankDrop = Math.floor(rankCost);

    let newMoney;

    if (isHalfRank) {
        // 半ランク: 1つ下のランクの上限値に変更
        // 例: L3 で L-0.5 → L2の上限値(6999)に変更
        const targetLevel = Math.max(0, currentLevel - fullRankDrop - 1);
        newMoney = getRankCeiling(targetLevel);

        // 上限値がInfinityの場合は最高ランクの下限値を使用
        if (newMoney === Infinity) {
            newMoney = getRankFloor(MONEY_RANKS.length - 1);
        }
    } else {
        // 完全ランク: 低下後ランクの下限値に変更
        // 例: L3 で L-1 → L2の下限値(3000)に変更
        const newLevel = Math.max(0, currentLevel - fullRankDrop);
        newMoney = getRankFloor(newLevel);
    }

    // 使用不可の判定（現在の所持金が新所持金以下）
    if (currentMoney <= newMoney) {
        return {
            canUse: false,
            cost: 0,
            newMoney: currentMoney,
            newRank: currentRank
        };
    }

    const cost = currentMoney - newMoney;
    const newRank = getMoneyRank(newMoney);

    return {
        canUse: true,
        cost,
        newMoney,
        newRank
    };
}

/**
 * UI表示用: カードコストを「-X円」形式で取得
 * @param {number} currentMoney - 現在の所持金
 * @param {number} rankCost - L-n形式のコスト
 * @returns {string} 表示文字列
 */
export function getDisplayCost(currentMoney, rankCost) {
    // コスト0の場合は「無料」と表示
    if (rankCost === 0) return '無料';

    const result = calculateRankCost(currentMoney, rankCost);
    if (!result.canUse) return '×';
    return `-${result.cost.toLocaleString()}`;
}

/**
 * カードが使用可能かチェック
 * @param {number} currentMoney - 現在の所持金
 * @param {number} rankCost - L-n形式のコスト
 * @returns {boolean} 使用可能かどうか
 */
export function canAffordCard(currentMoney, rankCost) {
    const result = calculateRankCost(currentMoney, rankCost);
    return result.canUse;
}
