/**
 * ゲームエンジンモジュール
 */

import { ROLES_NORMAL, judgeRoleNormal, compareRolesNormal } from '../data/roles-normal.js';
import { ROLES_NINE, judgeRoleNine, compareRolesNine } from '../data/roles-nine.js';
import { CHEATS, applyCheat, checkCounter, calculateCheatCost, getAvailableCheats } from '../data/cheats-data.js';
import { rollDice, checkShonben, calculateCursedPenalty, countCursedDice } from './dice.js';
import { createCPU } from './cpu.js';

/**
 * フェーズ定義
 */
const PHASES = [
    { id: 1, name: '通常戦', matches: 1, cpuCheat: false, cheatLevel: 0 },
    { id: 2, name: 'イカサマ解禁', matches: 3, cpuCheat: false, cheatLevel: 2 },
    { id: 3, name: 'CPU反撃', matches: 6, cpuCheat: true, cheatLevel: 2 },
    { id: 4, name: '最終決戦', matches: 5, cpuCheat: true, cheatLevel: 4 },
];

/**
 * ゲーム状態管理クラス
 */
export class Game {
    constructor() {
        this.reset();
    }
    
    /**
     * ゲーム状態をリセット
     */
    reset() {
        this.state = {
            // プレイヤー状態
            player: {
                money: 10000,
                forceShonben: false,
                diceWeight: null,
                weightStrength: 0,
                cursedDice: false,
                cursedPenalty: null,
                shonbenImmune: false,
                cursedImmune: false,
                useNineDice: false,
                nextTurnPenalty: false,
                activeEffects: [],
            },
            
            // CPU状態
            cpu: {
                money: 10000,
                forceShonben: false,
                diceWeight: null,
                weightStrength: 0,
                cursedDice: false,
                cursedPenalty: null,
                shonbenImmune: false,
                cursedImmune: false,
                useNineDice: false,
                nextTurnPenalty: false,
                activeEffects: [],
            },
            
            // ゲーム進行
            currentPhase: 1,
            currentMatch: 1,
            totalMatches: 15,
            currentTurn: 0,
            roleTable: 'normal', // 'normal' | 'nine'
            
            // 現在の試合
            betAmount: 0,
            playerCheat: null,
            cpuCheat: null,
            playerRole: null,
            cpuRole: null,
            lastPlayerCheat: null,
            lastCpuCheat: null,
            
            // 結果
            winner: null,
            payoutMultiplier: 0,
            
            // ゲーム状態
            gameStatus: 'init', // 'init' | 'betting' | 'cheat_select' | 'rolling' | 'result' | 'gameover' | 'victory'
        };
        
        this.cpuInstance = createCPU();
    }
    
    /**
     * 現在のフェーズ情報を取得
     */
    getCurrentPhase() {
        let matchCount = 0;
        for (const phase of PHASES) {
            matchCount += phase.matches;
            if (this.state.currentMatch <= matchCount) {
                return phase;
            }
        }
        return PHASES[PHASES.length - 1];
    }
    
    /**
     * フェーズ内の試合番号を取得
     */
    getMatchInPhase() {
        let matchCount = 0;
        for (const phase of PHASES) {
            if (this.state.currentMatch <= matchCount + phase.matches) {
                return this.state.currentMatch - matchCount;
            }
            matchCount += phase.matches;
        }
        return 1;
    }
    
    /**
     * 使用可能なイカサマを取得
     */
    getAvailableCheatsForPlayer() {
        const phase = this.getCurrentPhase();
        if (phase.cheatLevel === 0) return [];
        return getAvailableCheats(phase.cheatLevel);
    }
    
    /**
     * 賭けフェーズ開始
     */
    startBetting() {
        this.state.gameStatus = 'betting';
        this.clearTurnEffects();
        
        // CPU状態更新
        const phase = this.getCurrentPhase();
        this.cpuInstance.updatePattern(phase.id, this.getMatchInPhase());
    }
    
    /**
     * 賭け金を設定
     */
    setBet(amount) {
        const maxBet = this.state.player.money;
        this.state.betAmount = Math.min(Math.max(1, amount), maxBet);
        this.state.gameStatus = 'cheat_select';
    }
    
    /**
     * イカサマ選択
     */
    selectCheat(cheatId) {
        if (cheatId && CHEATS[cheatId]) {
            const cost = calculateCheatCost(cheatId, this.state.betAmount);
            if (this.state.player.money >= cost) {
                this.state.playerCheat = CHEATS[cheatId];
                this.state.player.money -= cost;
            }
        } else {
            this.state.playerCheat = null;
        }
        
        // CPUのイカサマ選択
        const phase = this.getCurrentPhase();
        if (phase.cpuCheat) {
            const cpuCheat = this.cpuInstance.selectCheat(this.state);
            if (cpuCheat) {
                const cost = calculateCheatCost(cpuCheat.id, this.state.betAmount);
                if (this.cpuInstance.money >= cost) {
                    this.state.cpuCheat = cpuCheat;
                    this.cpuInstance.money -= cost;
                }
            }
        }
        
        // イカサマ適用
        this.applyCheats();
        
        this.state.gameStatus = 'rolling';
    }
    
    /**
     * イカサマを適用
     */
    applyCheats() {
        const playerCheat = this.state.playerCheat;
        const cpuCheat = this.state.cpuCheat;
        
        // プレイヤーのイカサマ優先
        if (playerCheat) {
            // CPUのイカサマとカウンターチェック
            let blocked = false;
            if (cpuCheat && checkCounter(playerCheat.id, cpuCheat.id)) {
                blocked = true;
            }
            
            if (!blocked) {
                const target = playerCheat.target === 'self' ? this.state.player : this.state.cpu;
                applyCheat(playerCheat.id, this.state, target);
            }
        }
        
        // CPUのイカサマ
        if (cpuCheat) {
            // プレイヤーのイカサマとカウンターチェック
            let blocked = false;
            if (playerCheat && checkCounter(cpuCheat.id, playerCheat.id)) {
                blocked = true;
            }
            
            // 同じターゲットへの同種の効果はプレイヤー優先
            if (playerCheat && cpuCheat.target === playerCheat.target) {
                // 出目操作系が重複した場合はプレイヤー優先
                if ((cpuCheat.id.includes('yudo') && playerCheat.id.includes('yudo')) ||
                    (cpuCheat.id === 'sara_shoumetu' && playerCheat.id === 'sara_shoumetu')) {
                    blocked = true;
                }
            }
            
            if (!blocked) {
                const target = cpuCheat.target === 'self' ? this.state.cpu : this.state.player;
                applyCheat(cpuCheat.id, this.state, target);
            }
        }
    }
    
    /**
     * サイコロを振る
     */
    roll(isPlayer = true, retryCount = 0) {
        const target = isPlayer ? this.state.player : this.state.cpu;
        const maxRetries = target.nextTurnPenalty ? 0 : 2;
        
        // ションベン強制
        if (target.forceShonben) {
            const roleTable = this.state.roleTable === 'nine' ? ROLES_NINE : ROLES_NORMAL;
            return {
                dice: [0, 0, 0],
                role: { ...roleTable.shonben, dice: [0, 0, 0] },
                isShonben: true,
                canRetry: false,
            };
        }
        
        // ションベン判定
        const isShonben = checkShonben(0.05);
        if (isShonben && !target.shonbenImmune) {
            const roleTable = this.state.roleTable === 'nine' ? ROLES_NINE : ROLES_NORMAL;
            return {
                dice: [0, 0, 0],
                role: { ...roleTable.shonben, dice: [0, 0, 0] },
                isShonben: true,
                canRetry: false,
            };
        }
        
        // サイコロを振る
        const diceOptions = {
            min: 1,
            max: target.useNineDice ? 9 : 6,
            weight: target.diceWeight,
            weightStrength: target.weightStrength,
            cursed: target.cursedDice && !target.cursedImmune,
        };
        
        const dice = rollDice(3, diceOptions);
        
        // 謎生物ペナルティチェック
        let cursedPenalty = 0;
        if (target.cursedDice && !target.cursedImmune && target.cursedPenalty) {
            cursedPenalty = calculateCursedPenalty(dice, target.cursedPenalty);
        }
        
        // 役判定
        const judgeDice = dice.filter(d => d !== 'cursed');
        if (judgeDice.length < 3) {
            // 謎生物が混入している場合、通常のダイスで埋める
            while (judgeDice.length < 3) {
                judgeDice.push(Math.floor(Math.random() * 6) + 1);
            }
        }
        
        const judgeFunc = this.state.roleTable === 'nine' ? judgeRoleNine : judgeRoleNormal;
        const role = judgeFunc(judgeDice);
        
        // 謎生物ペナルティを役に追加
        if (cursedPenalty !== 0) {
            role.cursedPenalty = cursedPenalty;
        }
        
        const canRetry = role.id === 'menashi' && retryCount < maxRetries;
        
        return {
            dice,
            role,
            isShonben: false,
            canRetry,
            retriesLeft: maxRetries - retryCount,
            cursedPenalty,
        };
    }
    
    /**
     * 勝敗判定
     */
    judgeWinner() {
        const playerRole = this.state.playerRole;
        const cpuRole = this.state.cpuRole;
        
        if (!playerRole || !cpuRole) return null;
        
        const compareFunc = this.state.roleTable === 'nine' ? compareRolesNine : compareRolesNormal;
        const comparison = compareFunc(playerRole, cpuRole);
        
        // 同点はCPU勝利
        if (comparison === 0) {
            return 'cpu';
        }
        
        return comparison > 0 ? 'player' : 'cpu';
    }
    
    /**
     * 配当計算
     */
    calculatePayout() {
        const winner = this.state.winner;
        const betAmount = this.state.betAmount;
        
        if (!winner) return 0;
        
        const winnerRole = winner === 'player' ? this.state.playerRole : this.state.cpuRole;
        const loserRole = winner === 'player' ? this.state.cpuRole : this.state.playerRole;
        
        let multiplier = Math.abs(winnerRole.multiplier);
        
        // 負け役のマイナス倍率も考慮
        if (loserRole.multiplier < 0) {
            multiplier = Math.max(multiplier, Math.abs(loserRole.multiplier));
        }
        
        // 謎生物ペナルティ
        const loser = winner === 'player' ? this.state.cpu : this.state.player;
        if (loserRole.cursedPenalty) {
            multiplier += Math.abs(loserRole.cursedPenalty);
        }
        
        return betAmount * multiplier;
    }
    
    /**
     * 試合結果を確定
     */
    finalizeMatch() {
        const winner = this.judgeWinner();
        this.state.winner = winner;
        
        const payout = this.calculatePayout();
        this.state.payoutMultiplier = payout / this.state.betAmount;
        
        // 所持金更新
        if (winner === 'player') {
            this.state.player.money += payout;
            this.state.cpu.money -= payout;
        } else {
            this.state.player.money -= payout;
            this.state.cpu.money += payout;
        }
        
        // CPUの所持金も同期
        this.cpuInstance.money = this.state.cpu.money;
        
        // 次ターンペナルティ設定（nullチェック追加）
        if (this.state.playerRole && this.state.playerRole.nextTurnPenalty) {
            this.state.player.nextTurnPenalty = true;
        }
        if (this.state.cpuRole && this.state.cpuRole.nextTurnPenalty) {
            this.state.cpu.nextTurnPenalty = true;
        }
        
        // イカサマ履歴更新
        this.state.lastPlayerCheat = this.state.playerCheat;
        this.state.lastCpuCheat = this.state.cpuCheat;
        
        this.state.gameStatus = 'result';
    }
    
    /**
     * 次の試合へ
     */
    nextMatch() {
        // 勝敗判定
        if (this.state.player.money < 1000) {
            this.state.gameStatus = 'gameover';
            return false;
        }
        
        if (this.state.currentMatch >= this.state.totalMatches) {
            if (this.state.player.money >= 100000) {
                this.state.gameStatus = 'victory';
            } else {
                this.state.gameStatus = 'gameover';
            }
            return false;
        }
        
        // 次の試合
        this.state.currentMatch++;
        this.state.currentTurn++;
        this.state.currentPhase = this.getCurrentPhase().id;
        
        // 試合状態リセット
        this.state.betAmount = 0;
        this.state.playerCheat = null;
        this.state.cpuCheat = null;
        this.state.playerRole = null;
        this.state.cpuRole = null;
        this.state.winner = null;
        this.state.payoutMultiplier = 0;
        this.state.roleTable = 'normal';
        
        this.startBetting();
        return true;
    }
    
    /**
     * ターン効果をクリア
     */
    clearTurnEffects() {
        const clearTarget = (target) => {
            target.forceShonben = false;
            target.diceWeight = null;
            target.weightStrength = 0;
            target.cursedDice = false;
            target.cursedPenalty = null;
            target.shonbenImmune = false;
            target.useNineDice = false;
            
            // 持続効果のデクリメント
            target.activeEffects = target.activeEffects.filter(effect => {
                effect.remainingTurns--;
                return effect.remainingTurns > 0;
            });
            
            // 持続効果の再適用
            target.activeEffects.forEach(effect => {
                if (effect.id === 'nazo_harai') {
                    target.cursedImmune = true;
                }
            });
        };
        
        clearTarget(this.state.player);
        clearTarget(this.state.cpu);
        
        // 次ターンペナルティの消費
        // (前回ションベンした場合、このターンで効果発動後に解除)
    }
    
    /**
     * 現在の状態を取得
     */
    getState() {
        return { ...this.state };
    }
}

/**
 * ゲームインスタンス作成
 */
export function createGame() {
    return new Game();
}