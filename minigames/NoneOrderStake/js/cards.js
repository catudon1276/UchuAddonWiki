/**
 * カードデータ定義
 * イカサマカードシステム対応版
 *
 * 構造:
 * - id: 一意識別子
 * - name: 表示名
 * - description: 説明文
 * - color: カード色（'red', 'blue', 'green', 'yellow'）
 * - rankCost: L-n形式のコスト（0.5, 1, 1.5, 2, 3）
 * - targetType: 対象タイプ（'self', 'enemy', 'all', 'choice'）
 * - effect: 効果関数（gameState, user, target, multiplier）
 * - canUse: 使用可能条件（オプション）
 */

import { calculateRankCost, getDisplayCost, canAffordCard } from './money-rank.js';

// ===========================================
// カード色定義
// ===========================================
export const CARD_COLORS = {
    red: {
        name: '赤',
        description: '攻撃型',
        gradient: ['#dc2626', '#7f1d1d']
    },
    blue: {
        name: '蒼',
        description: '防御型',
        gradient: ['#2563eb', '#1e3a8a']
    },
    green: {
        name: '緑',
        description: '再行動型',
        gradient: ['#16a34a', '#14532d']
    },
    yellow: {
        name: '黄',
        description: '構造・経済型',
        gradient: ['#eab308', '#713f12']
    }
};

// ===========================================
// カード定義（19種類）
// ===========================================
export const CARDS = {
    // ===========================================
    // 赤（攻撃）7種類
    // ===========================================

    sara_shoumetu: {
        id: 'sara_shoumetu',
        name: '皿消滅',
        description: '指定した相手を確定ションベンにする',
        color: 'red',
        rankCost: 2,
        targetType: 'choice',
        effect: (gameState, user, target, multiplier = 1) => {
            target.forceShonben = true;
            return { action: 'force_shonben', target: target.id };
        }
    },

    double_bet: {
        id: 'double_bet',
        name: '賭け金倍増',
        description: '指定した相手の掛け金を2倍にする',
        color: 'red',
        rankCost: 1,
        targetType: 'choice',
        effect: (gameState, user, target, multiplier = 1) => {
            const additionalBet = target.currentBet * multiplier;
            target.currentBet += additionalBet;
            // 相手の所持金は減らない（仕様通り）
            return { action: 'double_bet', target: target.id, additionalBet };
        }
    },

    zero_bet: {
        id: 'zero_bet',
        name: '賭け金消滅',
        description: '指定した相手の掛け金を0にする（没収）',
        color: 'red',
        rankCost: 1.5,
        targetType: 'choice',
        effect: (gameState, user, target, multiplier = 1) => {
            const confiscated = target.currentBet;
            target.currentBet = 0;
            return { action: 'zero_bet', target: target.id, confiscated };
        }
    },

    no_reroll: {
        id: 'no_reroll',
        name: '振り直し禁止',
        description: '指定した相手はこのターンやり直し不可',
        color: 'red',
        rankCost: 1,
        targetType: 'choice',
        effect: (gameState, user, target, multiplier = 1) => {
            target.rerollsLeft = 0;
            target.cannotReroll = true;
            return { action: 'no_reroll', target: target.id };
        }
    },

    card_destroyer: {
        id: 'card_destroyer',
        name: 'カード破壊',
        description: '全員のカードをランダムに3枚破壊',
        color: 'red',
        rankCost: 3,
        targetType: 'all',
        effect: (gameState, user, targets, multiplier = 1) => {
            const destroyCount = 3 * multiplier;
            const allPlayers = Object.values(gameState.players);
            let destroyed = 0;
            const destroyedCards = [];

            while (destroyed < destroyCount) {
                const validPlayers = allPlayers.filter(p => p.hand.length > 0);
                if (validPlayers.length === 0) break;

                const randomPlayer = validPlayers[Math.floor(Math.random() * validPlayers.length)];
                const randomIndex = Math.floor(Math.random() * randomPlayer.hand.length);
                const removedCard = randomPlayer.hand.splice(randomIndex, 1)[0];
                destroyedCards.push({ playerId: randomPlayer.id, card: removedCard });
                destroyed++;
            }

            return { action: 'card_destroy', destroyed, destroyedCards };
        }
    },

    bad_luck_single: {
        id: 'bad_luck_single',
        name: '凶運付与',
        description: '指定した相手は1〜3が出やすくなる',
        color: 'red',
        rankCost: 1,
        targetType: 'choice',
        effect: (gameState, user, target, multiplier = 1) => {
            target.diceWeight = 'low';
            target.weightStrength = 0.5 * multiplier;
            return { action: 'bad_luck', target: target.id };
        }
    },

    bad_luck_all: {
        id: 'bad_luck_all',
        name: '呪いの霧',
        description: '自分以外の全員が1〜3が出やすくなる',
        color: 'red',
        rankCost: 2,
        targetType: 'all',
        effect: (gameState, user, targets, multiplier = 1) => {
            Object.values(gameState.players).forEach(player => {
                // 使用者自身は除外
                if (player.id !== user.id) {
                    player.diceWeight = 'low';
                    player.weightStrength = 0.4 * multiplier;
                }
            });
            return { action: 'bad_luck_all' };
        }
    },

    // ===========================================
    // 蒼（防御）5種類
    // ===========================================

    shonben_guard: {
        id: 'shonben_guard',
        name: 'ションベン無効',
        description: 'このターン、ションベンを無効化',
        color: 'blue',
        rankCost: 0.5,
        targetType: 'self',
        effect: (gameState, user, target, multiplier = 1) => {
            user.shonbenImmune = true;
            return { action: 'shonben_guard' };
        }
    },

    damage_reduce: {
        id: 'damage_reduce',
        name: '被害軽減',
        description: 'このターンの損失を50%軽減',
        color: 'blue',
        rankCost: 1,
        targetType: 'self',
        effect: (gameState, user, target, multiplier = 1) => {
            user.damageReduction = 0.5 * multiplier;
            // 2倍適用時は100%軽減（ダメージ0）
            if (user.damageReduction > 1) user.damageReduction = 1;
            return { action: 'damage_reduce', reduction: user.damageReduction };
        }
    },

    death_guard: {
        id: 'death_guard',
        name: '即死回避',
        description: '所持金が0以下になっても1000円で復活',
        color: 'blue',
        rankCost: 1.5,
        targetType: 'self',
        effect: (gameState, user, target, multiplier = 1) => {
            user.hasDeathGuard = true;
            user.deathGuardReviveAmount = 1000 * multiplier;
            return { action: 'death_guard', reviveAmount: user.deathGuardReviveAmount };
        }
    },

    red_block: {
        id: 'red_block',
        name: '赤カードブロック',
        description: 'このターン、赤カードの効果を完全無効化',
        color: 'blue',
        rankCost: 2,
        targetType: 'self',
        effect: (gameState, user, target, multiplier = 1) => {
            user.redCardImmune = true;
            return { action: 'red_block' };
        }
    },

    good_luck: {
        id: 'good_luck',
        name: '幸運付与',
        description: '自分は4〜6が出やすくなる',
        color: 'blue',
        rankCost: 1,
        targetType: 'self',
        effect: (gameState, user, target, multiplier = 1) => {
            user.diceWeight = 'high';
            user.weightStrength = 0.5 * multiplier;
            return { action: 'good_luck' };
        }
    },

    // ===========================================
    // 黄（構造・経済）3種類
    // ===========================================

    coin_toss_win: {
        id: 'coin_toss_win',
        name: '運命のコイン',
        description: 'コイントス3連続表で即勝利',
        color: 'yellow',
        rankCost: 3,
        targetType: 'self',
        effect: (gameState, user, target, multiplier = 1) => {
            const results = [];
            for (let i = 0; i < 3; i++) {
                results.push(Math.random() < 0.5 ? 'heads' : 'tails');
            }
            const allHeads = results.every(r => r === 'heads');
            return {
                action: 'coin_toss',
                results,
                success: allHeads,
                instantWin: allHeads
            };
        }
    },

    wealth_tax: {
        id: 'wealth_tax',
        name: '強制徴収',
        description: '全員の所持金40%を徴収し分配（1位70%/2位20%/3位10%、CPU戦は使用者が回収）',
        color: 'yellow',
        rankCost: 2,
        targetType: 'all',
        effect: (gameState, user, targets, multiplier = 1) => {
            const players = Object.values(gameState.players);
            const taxRate = 0.4 * multiplier;
            let totalTax = 0;

            // 40%徴収
            players.forEach(player => {
                const tax = Math.floor(player.money * taxRate);
                player.money -= tax;
                totalTax += tax;
            });

            // 分配ロジック
            if (players.length === 2) {
                // CPU戦（2人）: 使用者が全額回収
                user.money += totalTax;
                return { action: 'wealth_tax', totalTax, beneficiary: user.id, mode: 'cpu' };
            } else {
                // 3人以上: 1位70%/2位20%/3位10%
                const sorted = [...players].sort((a, b) => a.money - b.money);
                const distributions = [0.7, 0.2, 0.1];
                const beneficiaries = [];

                sorted.forEach((player, index) => {
                    if (index < distributions.length) {
                        const share = Math.floor(totalTax * distributions[index]);
                        player.money += share;
                        beneficiaries.push({ id: player.id, share });
                    }
                });

                return { action: 'wealth_tax', totalTax, beneficiaries, mode: 'multiplayer' };
            }
        }
    },

    wealth_equal: {
        id: 'wealth_equal',
        name: '所持金均等化',
        description: '全員の所持金を平均値に統一',
        color: 'yellow',
        rankCost: 3,
        targetType: 'all',
        effect: (gameState, user, targets, multiplier = 1) => {
            const players = Object.values(gameState.players);
            const total = players.reduce((sum, p) => sum + p.money, 0);
            const average = Math.floor(total / players.length);

            players.forEach(player => {
                player.money = average;
            });

            return { action: 'wealth_equal', average };
        }
    },

    // ===========================================
    // 緑（再行動）4種類
    // ===========================================

    free_draw: {
        id: 'free_draw',
        name: '無料ドロー',
        description: '無料でカードを2枚引く',
        color: 'green',
        rankCost: 0,
        targetType: 'self',
        effect: (gameState, user, target, multiplier = 1) => {
            return { action: 'draw', count: 2 * multiplier, free: true };
        }
    },

    extra_reroll: {
        id: 'extra_reroll',
        name: '再挑戦',
        description: 'やり直し回数+1',
        color: 'green',
        rankCost: 1,
        targetType: 'self',
        effect: (gameState, user, target, multiplier = 1) => {
            user.rerollsLeft += 1 * multiplier;
            return { action: 'extra_reroll', added: 1 * multiplier };
        }
    },

    double_effect: {
        id: 'double_effect',
        name: '効果2倍',
        description: '次に使うカードの効果が2倍',
        color: 'green',
        rankCost: 2,
        targetType: 'self',
        effect: (gameState, user, target, multiplier = 1) => {
            user.nextCardDoubled = true;
            return { action: 'double_effect' };
        }
    },

    revive_bankrupt: {
        id: 'revive_bankrupt',
        name: '復活の杯',
        description: '破産者を1000円で復活させる',
        color: 'green',
        rankCost: 0.5,
        targetType: 'choice',
        canUse: (gameState, user) => {
            // 破産者（所持金100未満）がいる場合のみ使用可能
            return Object.values(gameState.players).some(p =>
                p.money < 100 && p.id !== user.id
            );
        },
        effect: (gameState, user, target, multiplier = 1) => {
            target.money = 1000 * multiplier;
            // ゲームオーバー状態を解除
            if (gameState.gameResult === 'defeat' && target.id === 'player') {
                gameState.gameResult = null;
            }
            return { action: 'revive', target: target.id, amount: 1000 * multiplier };
        }
    }
};

// ===========================================
// ユーティリティ関数
// ===========================================

/**
 * 色別にカードを取得
 */
export function getCardsByColor(color) {
    return Object.values(CARDS).filter(card => card.color === color);
}

/**
 * 全カードのIDリストを取得
 */
export function getAllCardIds() {
    return Object.keys(CARDS);
}

/**
 * カードのコストを計算（ランク方式）
 * @param {string} cardId - カードID
 * @param {number} playerMoney - プレイヤーの所持金
 * @returns {object} { canUse, cost, newMoney, newRank }
 */
export function calculateCardCost(cardId, playerMoney) {
    const card = CARDS[cardId];
    if (!card) return { canUse: false, cost: 0, newMoney: playerMoney, newRank: null };
    return calculateRankCost(playerMoney, card.rankCost);
}

/**
 * カードが使用可能かチェック
 * @param {string} cardId - カードID
 * @param {number} playerMoney - プレイヤーの所持金
 * @param {object} gameState - ゲーム状態
 * @param {object} user - 使用者
 * @returns {boolean} 使用可能かどうか
 */
export function canUseCard(cardId, playerMoney, gameState, user) {
    const card = CARDS[cardId];
    if (!card) return false;

    // ランクコストチェック
    if (!canAffordCard(playerMoney, card.rankCost)) return false;

    // 追加の使用条件チェック
    if (card.canUse && !card.canUse(gameState, user)) return false;

    return true;
}

/**
 * ランダムなカードを引く
 */
export function drawRandomCard() {
    const cardIds = getAllCardIds();
    const randomIndex = Math.floor(Math.random() * cardIds.length);
    return { ...CARDS[cardIds[randomIndex]] };
}

/**
 * デッキを生成（各カード複数枚）
 */
export function createDeck(copiesPerCard = 2) {
    const deck = [];
    Object.values(CARDS).forEach(card => {
        for (let i = 0; i < copiesPerCard; i++) {
            deck.push({ ...card });
        }
    });
    // シャッフル
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

/**
 * UI表示用: カードコストを取得
 * @param {string} cardId - カードID
 * @param {number} playerMoney - プレイヤーの所持金
 * @returns {string} 表示文字列（例: "-7,000"）
 */
export function getCardDisplayCost(cardId, playerMoney) {
    const card = CARDS[cardId];
    if (!card) return '×';
    return getDisplayCost(playerMoney, card.rankCost);
}
