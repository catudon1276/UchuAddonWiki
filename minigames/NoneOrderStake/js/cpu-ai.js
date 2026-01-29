/**
 * CPU AIモジュール
 * プレイヤーの傾向を学習し、対抗策を選択する
 */

import { CARDS, getCardsByColor, canUseCard } from './cards.js';
import { canAffordCard } from './money-rank.js';

// ===========================================
// AI行動パターン
// ===========================================
const AI_PATTERNS = {
    // 序盤（1-5試合目）: 控えめ
    early: {
        betRatio: [0.05, 0.15], // 所持金の5-15%
        cardUseChance: 0.2,
        aggressiveness: 0.3
    },
    // 中盤（6-10試合目）: バランス
    mid: {
        betRatio: [0.1, 0.25],
        cardUseChance: 0.4,
        aggressiveness: 0.5
    },
    // 終盤（11-15試合目）: 積極的
    late: {
        betRatio: [0.15, 0.4],
        cardUseChance: 0.6,
        aggressiveness: 0.7
    }
};

// ===========================================
// CPUクラス
// ===========================================
export class CpuAI {
    constructor() {
        // プレイヤー行動の学習データ
        this.playerHistory = {
            cardUsage: {}, // カード使用頻度
            betPatterns: [], // 賭け金パターン
            rerollTendency: 0, // 振り直し傾向
            totalGames: 0
        };
    }
    
    /**
     * 現在のフェーズに応じたパターンを取得
     */
    getPattern(currentMatch, totalMatches) {
        const progress = currentMatch / totalMatches;
        if (progress <= 0.33) return AI_PATTERNS.early;
        if (progress <= 0.67) return AI_PATTERNS.mid;
        return AI_PATTERNS.late;
    }
    
    /**
     * 賭け金を決定
     */
    decideBet(gameState) {
        const pattern = this.getPattern(gameState.currentMatch, gameState.totalMatches);
        const playerMoney = gameState.players.player.money;
        
        // プレイヤーの所持金に応じて調整
        let [minRatio, maxRatio] = pattern.betRatio;
        
        // プレイヤーが勝っている場合は攻撃的に
        if (playerMoney > 50000) {
            maxRatio = Math.min(0.5, maxRatio + 0.1);
        }
        
        const ratio = minRatio + Math.random() * (maxRatio - minRatio);
        const bet = Math.floor(playerMoney * ratio);
        
        // 最低100円
        return Math.max(100, bet);
    }
    
    /**
     * カード使用を決定
     * @returns {object|null} { cardIndex, targetId? } or null
     */
    decideCardUse(gameState, cpuHand) {
        if (cpuHand.length === 0) return null;

        const pattern = this.getPattern(gameState.currentMatch, gameState.totalMatches);
        const cpuMoney = gameState.players.cpu.money;

        // カード使用するかどうか
        if (Math.random() > pattern.cardUseChance) return null;

        // 使用可能なカードをフィルタリング（コスト払える＆使用条件満たす）
        const usableCards = cpuHand.map((card, index) => ({ card, index }))
            .filter(({ card }) => canAffordCard(cpuMoney, card.rankCost))
            .filter(({ card }) => !card.canUse || card.canUse(gameState, gameState.players.cpu));

        if (usableCards.length === 0) return null;

        // プレイヤーの傾向に基づいてカード選択
        const playerLastCard = this._getMostUsedCardColor();

        // カウンター戦略
        let preferredColors = [];
        if (playerLastCard === 'red') {
            // プレイヤーが攻撃的 → 防御（蒼）
            preferredColors = ['blue'];
        } else if (playerLastCard === 'blue') {
            // プレイヤーが防御的 → 攻撃（赤）
            preferredColors = ['red'];
        } else {
            // ランダム
            preferredColors = ['red', 'blue', 'green', 'yellow'];
        }

        // 手札から選択
        const candidates = usableCards.filter(({ card }) => preferredColors.includes(card.color));
        let selected;
        if (candidates.length > 0) {
            selected = candidates[Math.floor(Math.random() * candidates.length)];
        } else {
            selected = usableCards[Math.floor(Math.random() * usableCards.length)];
        }

        // ターゲットの決定
        let targetId = null;
        if (selected.card.targetType === 'choice' || selected.card.targetType === 'enemy') {
            targetId = 'player'; // 2人対戦ではプレイヤーが対象
        }

        return { cardIndex: selected.index, targetId };
    }
    
    /**
     * 振り直しするか決定
     */
    decideReroll(currentRole, rerollsLeft) {
        if (rerollsLeft <= 0) return false;
        
        // 役なしは必ず振り直し
        if (currentRole.id === 'menashi') return true;
        
        // 負け役も振り直し
        if (currentRole.multiplier < 0) return true;
        
        // 低い目なら検討
        if (currentRole.value && currentRole.value <= 2) {
            return Math.random() < 0.6;
        }
        
        return false;
    }
    
    /**
     * プレイヤーの行動を記録
     */
    recordPlayerAction(action, data) {
        this.playerHistory.totalGames++;
        
        if (action === 'card_use' && data.card) {
            const color = data.card.color;
            this.playerHistory.cardUsage[color] = (this.playerHistory.cardUsage[color] || 0) + 1;
        }
        
        if (action === 'bet' && data.amount) {
            this.playerHistory.betPatterns.push(data.amount);
            // 直近10件のみ保持
            if (this.playerHistory.betPatterns.length > 10) {
                this.playerHistory.betPatterns.shift();
            }
        }
        
        if (action === 'reroll') {
            this.playerHistory.rerollTendency = 
                (this.playerHistory.rerollTendency * 0.8) + (data.didReroll ? 0.2 : 0);
        }
    }
    
    /**
     * 最も使用頻度の高いカード色を取得
     */
    _getMostUsedCardColor() {
        const usage = this.playerHistory.cardUsage;
        let maxColor = null;
        let maxCount = 0;
        
        for (const [color, count] of Object.entries(usage)) {
            if (count > maxCount) {
                maxCount = count;
                maxColor = color;
            }
        }
        
        return maxColor;
    }
    
    /**
     * CPUの手札を初期化（ゲーム開始時）
     */
    initializeHand(gameState) {
        // ランダムに2枚選択
        const allCardIds = Object.keys(CARDS);
        const hand = [];

        for (let i = 0; i < 2; i++) {
            const randomIndex = Math.floor(Math.random() * allCardIds.length);
            const cardId = allCardIds[randomIndex];
            hand.push({ ...CARDS[cardId] });
        }

        return hand;
    }
}

// ===========================================
// ファクトリ関数
// ===========================================
export function createCpuAI() {
    return new CpuAI();
}
