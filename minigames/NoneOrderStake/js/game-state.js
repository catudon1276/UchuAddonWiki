/**
 * ゲーム状態管理モジュール
 * CPU対戦・オンライン対戦の両方に対応
 */

import { CARDS, CARD_COLORS, createDeck, calculateCardCost, canUseCard } from './cards.js';
import { judgeRole, compareRoles, getRoleTable } from './roles.js';
import { calculateRankCost, getMoneyRank } from './money-rank.js';

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
        cannotReroll: false,      // 振り直し禁止
        damageReduction: 0,       // 被害軽減率（0〜1）
        hasDeathGuard: false,     // 即死回避
        deathGuardReviveAmount: 1000, // 即死回避時の復活金額
        redCardImmune: false,     // 赤カード無効
        nextCardDoubled: false,   // 次カード効果2倍

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

        // 賭けた時点で所持金から引く
        player.money -= validAmount;

        // プレイヤーの所持金が100円未満になったら即ゲームオーバー
        if (playerId === 'player' && player.money < 100) {
            this.gameResult = 'defeat';
        }

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

            // 所持金が100未満になったら即座にゲームオーバー
            if (playerId === 'player' && player.money < 100) {
                this.gameResult = 'defeat';
            }
        }

        // 全カードプールからランダムに1枚選出
        const allCardIds = Object.keys(CARDS);
        const randomCardId = allCardIds[Math.floor(Math.random() * allCardIds.length)];
        const card = { ...CARDS[randomCardId] };

        player.hand.push(card);
        return card;
    }
    
    // ===========================================
    // カード使用
    // ===========================================
    useCard(playerId, cardIndex, targetId = null) {
        const player = this.players[playerId];
        if (!player || cardIndex < 0 || cardIndex >= player.hand.length) return null;

        const card = player.hand[cardIndex];

        // ランクコスト計算
        const costResult = calculateRankCost(player.money, card.rankCost);
        if (!costResult.canUse) return { error: 'not_enough_money' };

        // 効果2倍チェック
        let multiplier = 1;
        if (player.nextCardDoubled) {
            multiplier = 2;
            player.nextCardDoubled = false;
        }

        // 追加の使用条件チェック（対象がいないなど）
        if (card.canUse && !card.canUse(this, player)) {
            // カードは消費するがコストのみ適用、効果は無効
            player.money = costResult.newMoney;
            player.hand.splice(cardIndex, 1);
            this.usedCards[playerId] = card;

            // 所持金が100未満になったら即座にゲームオーバー
            if (playerId === 'player' && player.money < 100) {
                this.gameResult = 'defeat';
            }

            return {
                card,
                result: { action: 'blocked', reason: 'no_valid_target' },
                cost: costResult.cost,
                blocked: true
            };
        }

        // ターゲット決定
        let target = null;
        let targets = null;

        switch (card.targetType) {
            case 'self':
                target = player;
                break;
            case 'enemy':
                // 2人対戦では相手は1人
                target = this.players[playerId === 'player' ? 'cpu' : 'player'];
                break;
            case 'choice':
                // targetIdが指定されていれば使用、なければデフォルトで相手
                if (targetId && this.players[targetId]) {
                    target = this.players[targetId];
                } else {
                    target = this.players[playerId === 'player' ? 'cpu' : 'player'];
                }
                break;
            case 'all':
                targets = Object.values(this.players);
                break;
            default:
                target = player;
        }

        // 赤カードブロックチェック
        if (card.color === 'red' && target && target.redCardImmune) {
            // カードは消費するがコストのみ適用、効果は無効
            player.money = costResult.newMoney;
            player.hand.splice(cardIndex, 1);
            this.usedCards[playerId] = card;
            return {
                card,
                result: { action: 'blocked', reason: 'red_card_immune' },
                cost: costResult.cost,
                blocked: true
            };
        }

        // コスト適用（所持金をランク低下後の値に設定）
        player.money = costResult.newMoney;

        // カードを手札から削除
        player.hand.splice(cardIndex, 1);
        this.usedCards[playerId] = card;

        // 効果を適用
        const result = card.effect(this, player, target || targets, multiplier);

        // 特殊効果の処理
        if (result) {
            // 賽モード変更
            if (result.action === 'mode_change') {
                this.diceMode = result.mode;
                this.diceFaces = result.mode === 'nine' ? 9 : 6;
            }

            // 無料ドローの処理
            if (result.action === 'draw' && result.free) {
                for (let i = 0; i < result.count; i++) {
                    this.drawCard(playerId, true);
                }
            }

            // 即勝利判定
            if (result.instantWin) {
                this.gameResult = 'victory';
            }
        }

        // 所持金が100未満になったら即座にゲームオーバー
        if (playerId === 'player' && player.money < 100) {
            this.gameResult = 'defeat';
        }

        return { card, result, cost: costResult.cost };
    }
    
    // ===========================================
    // サイコロを振る
    // ===========================================
    rollDice(playerId) {
        const player = this.players[playerId];
        if (!player) return null;

        // ションベン強制チェック（ションベン無効で回避可能）
        if (player.forceShonben && !player.shonbenImmune) {
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
        // 振り直し禁止フラグもチェック
        return player.rerollsLeft > 0 && !player.cannotReroll && player.currentRole?.id === 'menashi';
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
        let payout = bet * multiplier;
        let damageReduced = false;
        let deathGuardActivated = false;

        // 所持金更新（賭け金は既にベット時に引かれている）
        if (winner === 'player') {
            // 勝った場合：賭け金を返還 + 配当を獲得
            this.players.player.money += bet + payout;
            this.players.cpu.money -= payout;
            this.players.player.wins++;
        } else {
            // 負けた場合：賭け金は既に失っているので、配当分のみ追加で失う
            // 被害軽減チェック
            if (this.players.player.damageReduction > 0) {
                const reduction = Math.floor(payout * this.players.player.damageReduction);
                payout -= reduction;
                damageReduced = true;
            }

            this.players.player.money -= payout;
            this.players.cpu.money += payout;
            this.players.player.losses++;

            // 即死回避チェック
            if (this.players.player.money <= 0 && this.players.player.hasDeathGuard) {
                this.players.player.money = this.players.player.deathGuardReviveAmount;
                this.players.player.hasDeathGuard = false; // 使用済み
                deathGuardActivated = true;
            }
        }

        this.matchResult = {
            winner,
            loser,
            playerRole,
            cpuRole,
            bet,
            payout,
            multiplier,
            damageReduced,
            deathGuardActivated
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
        // 新規追加フィールドのリセット
        player.cannotReroll = false;
        player.damageReduction = 0;
        player.hasDeathGuard = false;
        player.deathGuardReviveAmount = 1000;
        player.redCardImmune = false;
        // nextCardDoubledはリセットしない（次カード使用時に消費）
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
            usedCards: this.usedCards
        };
    }
}

// ===========================================
// ファクトリ関数
// ===========================================
export function createGameState(mode = 'cpu') {
    return new GameState(mode);
}
