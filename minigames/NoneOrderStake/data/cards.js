/**
 * カードデータ定義
 * 新しいカードを追加する場合はCARDSオブジェクトに追加するだけ
 * 
 * 構造:
 * - id: 一意識別子
 * - name: 表示名
 * - description: 説明文
 * - color: 和色（'red', 'blue', 'green', 'yellow', 'black'）
 * - colorHex: カード裏面のグラデーション色
 * - costRate: 使用時の所持金消費割合（0 = 無料）
 * - effect: 効果関数（gameStateを受け取り、変更を適用）
 * - canUse: 使用可能条件（オプション）
 */

export const CARD_COLORS = {
    red: {
        name: '赤',
        description: '攻撃型',
        gradient: ['#dc2626', '#7f1d1d']
    },
    blue: {
        name: '蒼',
        description: 'バフ・守備型',
        gradient: ['#2563eb', '#1e3a8a']
    },
    green: {
        name: '緑',
        description: '行動型',
        gradient: ['#16a34a', '#14532d']
    },
    yellow: {
        name: '黄',
        description: '特殊',
        gradient: ['#eab308', '#713f12']
    },
    black: {
        name: '黒',
        description: '賽モードチェンジ',
        gradient: ['#374151', '#111827']
    }
};

export const CARDS = {
    // ===========================================
    // 赤（攻撃型）
    // ===========================================
    sara_shoumetu: {
        id: 'sara_shoumetu',
        name: '皿消滅',
        description: '相手を確定ションベンにする',
        color: 'red',
        costRate: 0.1,
        effect: (gameState, targetPlayer) => {
            targetPlayer.forceShonben = true;
        }
    },

    // ===========================================
    // 蒼（バフ・守備型）
    // ===========================================
    kouun_fuyo: {
        id: 'kouun_fuyo',
        name: '幸運付与',
        description: '4・5・6が出やすくなる（+40%）',
        color: 'blue',
        costRate: 0.1,
        effect: (gameState, user) => {
            user.diceWeight = 'high';
            user.weightStrength = 0.4;
        }
    },

    // ===========================================
    // 緑（行動型）
    // ===========================================
    muryo_draw: {
        id: 'muryo_draw',
        name: '無料ドロー',
        description: '所持金コストなしでカードを3枚引く',
        color: 'green',
        costRate: 0,
        effect: (gameState, user) => {
            // カードを3枚引く処理はゲームロジック側で実装
            return { action: 'draw', count: 3, free: true };
        }
    },

    // ===========================================
    // 黄（特殊）
    // ===========================================
    coin_toss: {
        id: 'coin_toss',
        name: '特殊勝利',
        description: 'コイントス4回全て表なら即勝利',
        color: 'yellow',
        costRate: 0.2,
        effect: (gameState, user) => {
            // コイントス4回
            const results = [];
            for (let i = 0; i < 4; i++) {
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

    // ===========================================
    // 黒（賽モードチェンジ）
    // ===========================================
    kyuseisai: {
        id: 'kyuseisai',
        name: '九星賽',
        description: '9面ダイスモードに変更。役表が変わる',
        color: 'black',
        costRate: 0.15,
        effect: (gameState) => {
            gameState.diceMode = 'nine';
            gameState.diceFaces = 9;
            return { action: 'mode_change', mode: 'nine' };
        }
    }
};

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
 * カードのコストを計算
 */
export function calculateCardCost(cardId, playerMoney) {
    const card = CARDS[cardId];
    if (!card) return 0;
    return Math.floor(playerMoney * card.costRate);
}

/**
 * ランダムなカードを引く
 */
export function drawRandomCard() {
    const cardIds = getAllCardIds();
    const randomIndex = Math.floor(Math.random() * cardIds.length);
    return CARDS[cardIds[randomIndex]];
}

/**
 * デッキを生成（各カード複数枚）
 */
export function createDeck(copiesPerCard = 3) {
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
