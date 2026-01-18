/**
 * CPUロジックモジュール
 */

import { CHEATS, getAvailableCheats } from '../data/cheats-data.js';

/**
 * CPU行動パターン
 */
const CPU_PATTERNS = {
    // ランダム行動（序盤）
    random: {
        cheatChance: 0.3, // イカサマ使用確率
        selectCheat: (availableCheats, gameState) => {
            if (Math.random() > 0.3) return null;
            const cheats = availableCheats.filter(c => c.target === 'opponent');
            if (cheats.length === 0) return null;
            return cheats[Math.floor(Math.random() * cheats.length)];
        },
    },
    
    // 戦略的行動（終盤）
    strategic: {
        cheatChance: 0.6,
        selectCheat: (availableCheats, gameState) => {
            const { player, cpu } = gameState;
            
            // 負けている時は攻撃的
            if (cpu.money < player.money) {
                const attacks = availableCheats.filter(c => c.type === 'attack');
                if (attacks.length > 0 && Math.random() < 0.7) {
                    // 最も強力な攻撃を選択
                    return attacks.reduce((a, b) => a.costRate > b.costRate ? a : b);
                }
            }
            
            // 勝っている時は防御的
            if (cpu.money > player.money * 1.5) {
                const defenses = availableCheats.filter(c => c.type === 'defense');
                if (defenses.length > 0 && Math.random() < 0.5) {
                    return defenses[Math.floor(Math.random() * defenses.length)];
                }
            }
            
            // それ以外はランダム
            if (Math.random() < 0.4) {
                return availableCheats[Math.floor(Math.random() * availableCheats.length)];
            }
            
            return null;
        },
    },
    
    // 読み合い行動（最終盤）
    mindgame: {
        cheatChance: 0.8,
        selectCheat: (availableCheats, gameState) => {
            const { player, cpu, lastPlayerCheat } = gameState;
            
            // プレイヤーの前回のイカサマに対応
            if (lastPlayerCheat) {
                // カウンターを探す
                const counters = availableCheats.filter(c => 
                    c.counters && c.counters.includes(lastPlayerCheat.id)
                );
                if (counters.length > 0 && Math.random() < 0.6) {
                    return counters[0];
                }
            }
            
            // 所持金差で行動変更
            const moneyRatio = cpu.money / player.money;
            
            if (moneyRatio < 0.5) {
                // 大幅に負けている：ハイリスク攻撃
                const strongAttacks = availableCheats.filter(c => 
                    c.type === 'attack' && c.costRate >= 0.15
                );
                if (strongAttacks.length > 0) {
                    return strongAttacks[Math.floor(Math.random() * strongAttacks.length)];
                }
            } else if (moneyRatio > 2) {
                // 大幅に勝っている：安全策
                const defenses = availableCheats.filter(c => c.type === 'defense');
                if (defenses.length > 0) {
                    return defenses[Math.floor(Math.random() * defenses.length)];
                }
            }
            
            // バランス：攻撃寄り
            const attacks = availableCheats.filter(c => c.type === 'attack');
            if (attacks.length > 0 && Math.random() < 0.6) {
                return attacks[Math.floor(Math.random() * attacks.length)];
            }
            
            return availableCheats[Math.floor(Math.random() * availableCheats.length)];
        },
    },
};

/**
 * CPUクラス
 */
export class CPU {
    constructor() {
        this.money = 1000;
        this.pattern = 'random';
        this.phase = 1;
    }
    
    /**
     * フェーズに応じてパターン更新
     */
    updatePattern(phase, matchNumber) {
        this.phase = phase;
        
        if (phase <= 2) {
            this.pattern = 'random';
        } else if (phase === 3) {
            // 後半は戦略的
            this.pattern = matchNumber > 3 ? 'strategic' : 'random';
        } else {
            // 第4フェーズは読み合い
            this.pattern = matchNumber > 3 ? 'mindgame' : 'strategic';
        }
    }
    
    /**
     * イカサマを選択
     */
    selectCheat(gameState) {
        if (this.phase < 3) return null; // 第3フェーズまでCPUはイカサマ不可
        
        const availableCheats = getAvailableCheats(this.phase);
        const pattern = CPU_PATTERNS[this.pattern];
        
        if (Math.random() > pattern.cheatChance) return null;
        
        return pattern.selectCheat(availableCheats, gameState);
    }
    
    /**
     * 賭け金を決定
     */
    decideBet(gameState) {
        const { player, currentMatch, totalMatches } = gameState;
        const remainingMatches = totalMatches - currentMatch + 1;
        
        // 基本：所持金の10-30%
        let betRatio = 0.1 + Math.random() * 0.2;
        
        // 終盤は大胆に
        if (remainingMatches <= 3) {
            betRatio = 0.3 + Math.random() * 0.3;
        }
        
        // 負けている時はさらに大胆
        if (this.money < player.money * 0.5) {
            betRatio = Math.min(0.8, betRatio + 0.3);
        }
        
        // 勝っている時は控えめ
        if (this.money > player.money * 2) {
            betRatio = Math.max(0.1, betRatio - 0.1);
        }
        
        const bet = Math.floor(this.money * betRatio);
        return Math.max(100, bet); // 最低100円
    }
    
    /**
     * 振り直しするか判断
     */
    shouldReroll(currentRole, retriesLeft, gameState) {
        if (retriesLeft <= 0) return false;
        
        // 役なしは必ず振り直し
        if (currentRole.id === 'menashi') return true;
        
        // 負け役も振り直し
        if (currentRole.multiplier < 0) return true;
        
        // 通常目で低い値なら振り直し検討
        if (currentRole.id === 'me' || currentRole.id === 'shimoza') {
            if (currentRole.value <= 3 && retriesLeft > 0) {
                return Math.random() < 0.6;
            }
        }
        
        return false;
    }
}

/**
 * CPUインスタンス作成
 */
export function createCPU() {
    return new CPU();
}
