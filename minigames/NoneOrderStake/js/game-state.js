/**
 * ゲーム状態管理モジュール
 * CPU対戦・オンライン対戦の両方に対応
 */

import { CARDS, CARD_COLORS, createDeck, calculateCardCost } from './cards.js';
import { judgeRole, compareRoles, getRoleTable } from './roles.js';

// ===========================================
// ゲーム設定
// ===========================================
export const GAME_CONFIG = {
    cpu: {
        totalMatches: 15,
        initialMoney: 10000,
        targetMoney: 100000,
        cpuMoney: 9999999, // 事実上無限
        drawCostRate: 0.1, // カードドロー時の所持金消費割合
        maxRerolls: 1 // 振り直し回数
    },
    online: {
        totalTurns: 10,
        initialMoney: 10000,
        drawCostRate: 0.1,
        maxRerolls: 1
    }
};

// ===========================================
// プレイヤー状態テンプレート
// ===========================================
function createPlayerState(id, name, isHuman = true, money = 10000) {
    return {
        id,
        name,
        isHuman,
        money,
        hand: [], // 手札
        currentBet: 0,
        currentDice: [0, 0, 0],
        currentRole: null,
        
        // ターン中の効果
        forceShonben: false,
        diceWeight: null, // 'high' | 'low' | null
        weightStrength: 0,
        shonbenImmune: false,
        rerollsLeft: 1,
        
        // 持続効果
        activeEffects: [],
        
        // 統計
        wins: 0,
        losses: 0
    };
}

// ===========================================
// ゲーム状態クラス
// ===========================================
export class GameState {
    constructor(mode = 'cpu') {
        this.mode = mode; // 'cpu' | 'online'
        this.config = mode === 'cpu' ? GAME_CONFIG.cpu : GAME_CONFIG.online;
        this.reset();
    }
    
    reset() {
        // プレイヤー初期化
        this.players = {
            player: createPlayerState('player', 'あなた', true, this.config.initialMoney),
            cpu: createPlayerState('cpu', 'CPU', false, 
                this.mode === 'cpu' ? GAME_CONFIG.cpu.cpuMoney : this.config.initialMoney)
        };
        
        // ゲーム進行
        this.currentMatch = 1;
        this.totalMatches = this.config.totalMatches || 15;
        this.currentTurn = 'player'; // 'player' | 'cpu'
        this.phase = 'betting'; // 'betting' | 'card_select' | 'rolling' | 'result'
        
        // 賽モード
        this.diceMode = 'normal'; // 'normal' | 'nine'
        this.diceFaces = 6;
        
        // デッキ
        this.deck = createDeck(3);
        this.discardPile = [];
        
        // 勝敗結果
        this.matchResult = null;
        this.gameResult = null; // 'victory' | 'defeat' | null
        
        // ターン中の使用カード
        this.usedCards = {
            player: null,
            cpu: null
        };
    }
    
    // ===========================================
    // ベッティング
    // ===========================================
    setBet(playerId, amount) {
        const player = this.players[playerId];
        if (!player) return false;
        
        const validAmount = Math.min(Math.max(100, amount), player.money);
        player.currentBet = validAmount;
        return true;
    }
    
    // ===========================================
    // カードドロー
    // ===========================================
    drawCard(playerId, free = false) {
        const player = this.players[playerId];
        if (!player) return null;
        
        // コスト計算
        if (!free) {
            const cost = Math.floor(player.money * this.config.drawCostRate);
            if (player.money < cost) return null;
            player.money -= cost;
        }
        
        // デッキから引く
        if (this.deck.length === 0) {
            // 捨て札をシャッフルしてデッキに
            this.deck = [...this.discardPile];
            this.discardPile = [];
            for (let i = this.deck.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
            }
        }
        
        const card = this.deck.pop();
        if (card) {
            player.hand.push(card);
        }
        return card;
    }
    
    // ===========================================
    // カード使用
    // ===========================================
    useCard(playerId, cardIndex) {
        const player = this.players[playerId];
        if (!player || cardIndex < 0 || cardIndex >= player.hand.length) return null;
        
        const card = player.hand[cardIndex];
        
        // コスト計算
        const cost = calculateCardCost(card.id, player.money);
        if (player.money < cost) return { error: 'not_enough_money' };
        
        player.money -= cost;
        
        // カードを手札から削除
        player.hand.splice(cardIndex, 1);
        this.usedCards[playerId] = card;
        
        // 効果を適用
        const target = card.color === 'red' ? 
            this.players[playerId === 'player' ? 'cpu' : 'player'] : 
            player;
        
        const result = card.effect(this, target);
        
        // 賽モード変更の場合
        if (result && result.action === 'mode_change') {
            this.diceMode = result.mode;
            this.diceFaces = result.mode === 'nine' ? 9 : 6;
        }
        
        // 捨て札に追加
        this.discardPile.push(card);
        
        return { card, result, cost };
    }
    
    // ===========================================
    // サイコロを振る
    // ===========================================
    rollDice(playerId) {
        const player = this.players[playerId];
        if (!player) return null;
        
        // ションベン強制チェック
        if (player.forceShonben) {
            player.currentDice = [0, 0, 0];
            player.currentRole = judgeRole([0, 0, 0], this.diceMode, true);
            return { dice: [0, 0, 0], role: player.currentRole, isShonben: true };
        }
        
        // 重み付きサイコロ
        const dice = this._rollWeightedDice(player);
        const role = judgeRole(dice, this.diceMode);
        
        player.currentDice = dice;
        player.currentRole = role;
        
        return { dice, role, isShonben: false };
    }
    
    _rollWeightedDice(player) {
        const dice = [];
        const max = this.diceFaces;
        const mid = Math.ceil(max / 2);
        
        for (let i = 0; i < 3; i++) {
            let value;
            
            if (player.diceWeight && player.weightStrength > 0) {
                // 重み付き
                const weights = [];
                for (let j = 1; j <= max; j++) {
                    let w = 1;
                    if (player.diceWeight === 'high') {
                        w = j > mid ? 1 + player.weightStrength : 1 - player.weightStrength * 0.5;
                    } else if (player.diceWeight === 'low') {
                        w = j <= mid ? 1 + player.weightStrength : 1 - player.weightStrength * 0.5;
                    }
                    weights.push(Math.max(0.1, w));
                }
                
                const total = weights.reduce((a, b) => a + b, 0);
                let random = Math.random() * total;
                
                for (let j = 0; j < weights.length; j++) {
                    random -= weights[j];
                    if (random <= 0) {
                        value = j + 1;
                        break;
                    }
                }
                if (!value) value = max;
            } else {
                // 通常
                value = Math.floor(Math.random() * max) + 1;
            }
            
            dice.push(value);
        }
        
        return dice;
    }
    
    // ===========================================
    // 振り直し
    // ===========================================
    canReroll(playerId) {
        const player = this.players[playerId];
        if (!player) return false;
        return player.rerollsLeft > 0 && player.currentRole?.id === 'menashi';
    }
    
    reroll(playerId) {
        const player = this.players[playerId];
        if (!this.canReroll(playerId)) return null;
        
        player.rerollsLeft--;
        return this.rollDice(playerId);
    }
    
    // ===========================================
    // 勝敗判定
    // ===========================================
    judgeMatch() {
        const playerRole = this.players.player.currentRole;
        const cpuRole = this.players.cpu.currentRole;
        
        if (!playerRole || !cpuRole) return null;
        
        const comparison = compareRoles(playerRole, cpuRole);
        
        let winner, loser;
        if (comparison > 0) {
            winner = 'player';
            loser = 'cpu';
        } else {
            // 同点はCPU勝利
            winner = 'cpu';
            loser = 'player';
        }
        
        // 配当計算
        const winnerRole = this.players[winner].currentRole;
        const loserRole = this.players[loser].currentRole;
        
        let multiplier = Math.abs(winnerRole.multiplier);
        if (loserRole.multiplier < 0) {
            multiplier = Math.max(multiplier, Math.abs(loserRole.multiplier));
        }
        
        const bet = this.players.player.currentBet;
        const payout = bet * multiplier;
        
        // 所持金更新
        if (winner === 'player') {
            this.players.player.money += payout;
            this.players.cpu.money -= payout;
            this.players.player.wins++;
        } else {
            this.players.player.money -= payout;
            this.players.cpu.money += payout;
            this.players.player.losses++;
        }
        
        this.matchResult = {
            winner,
            loser,
            playerRole,
            cpuRole,
            bet,
            payout,
            multiplier
        };
        
        return this.matchResult;
    }
    
    // ===========================================
    // 次の試合へ
    // ===========================================
    nextMatch() {
        // ゲーム終了判定
        if (this.players.player.money < 100) {
            this.gameResult = 'defeat';
            return false;
        }
        
        if (this.currentMatch >= this.totalMatches) {
            if (this.players.player.money >= this.config.targetMoney) {
                this.gameResult = 'victory';
            } else {
                this.gameResult = 'defeat';
            }
            return false;
        }
        
        // 次の試合
        this.currentMatch++;
        this.phase = 'betting';
        this.matchResult = null;
        this.usedCards = { player: null, cpu: null };
        
        // ターン効果リセット
        this._clearTurnEffects('player');
        this._clearTurnEffects('cpu');
        
        // 賽モードリセット（黒カード使用時のみ変更されているので）
        // 注：ゲームによってはリセットしない仕様もあり
        this.diceMode = 'normal';
        this.diceFaces = 6;
        
        return true;
    }
    
    _clearTurnEffects(playerId) {
        const player = this.players[playerId];
        player.currentBet = 0;
        player.currentDice = [0, 0, 0];
        player.currentRole = null;
        player.forceShonben = false;
        player.diceWeight = null;
        player.weightStrength = 0;
        player.shonbenImmune = false;
        player.rerollsLeft = this.config.maxRerolls;
    }
    
    // ===========================================
    // 状態取得
    // ===========================================
    getState() {
        return {
            mode: this.mode,
            currentMatch: this.currentMatch,
            totalMatches: this.totalMatches,
            phase: this.phase,
            diceMode: this.diceMode,
            diceFaces: this.diceFaces,
            players: this.players,
            matchResult: this.matchResult,
            gameResult: this.gameResult,
            usedCards: this.usedCards,
            deckCount: this.deck.length
        };
    }
}

// ===========================================
// ファクトリ関数
// ===========================================
export function createGameState(mode = 'cpu') {
    return new GameState(mode);
}
