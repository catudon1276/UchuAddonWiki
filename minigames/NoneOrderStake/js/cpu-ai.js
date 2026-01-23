/**
 * CPU AIモジュール
 * プレイヤーの傾向を学習し、対抗策を選択する
 */

import { CARDS, getCardsByColor } from '../data/cards.js';

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
     */
    decideCardUse(gameState, cpuHand) {
        if (cpuHand.length === 0) return null;
        
        const pattern = this.getPattern(gameState.currentMatch, gameState.totalMatches);
        
        // カード使用するかどうか
        if (Math.random() > pattern.cardUseChance) return null;
        
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
            preferredColors = ['red', 'blue', 'green'];
        }
        
        // 終盤は黒カードも検討
        if (gameState.currentMatch > 10 && Math.random() < 0.3) {
            preferredColors.push('black');
        }
        
        // 手札から選択
        const candidates = cpuHand.filter(card => preferredColors.includes(card.color));
        if (candidates.length > 0) {
            return candidates[Math.floor(Math.random() * candidates.length)];
        }
        
        // なければランダム
        return cpuHand[Math.floor(Math.random() * cpuHand.length)];
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
        // 各色1枚ずつ手札に追加
        const colors = ['red', 'blue', 'green', 'yellow', 'black'];
        const hand = [];
        
        colors.forEach(color => {
            const cards = getCardsByColor(color);
            if (cards.length > 0) {
                hand.push({ ...cards[0] });
            }
        });
        
        return hand;
    }
}

// ===========================================
// ファクトリ関数
// ===========================================
export function createCpuAI() {
    return new CpuAI();
}
