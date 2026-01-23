/**
 * Night Of Schemes - メインエントリーポイント
 * チンチロ×イカサマゲーム
 */

import { createGameState } from './game-state.js';
import { createCpuAI } from './cpu-ai.js';
import * as UI from './ui.js';
import { getRoleTable } from '../data/roles.js';

// ===========================================
// グローバル状態
// ===========================================
let gameState = null;
let cpuAI = null;
let vfx = null;

// ===========================================
// 初期化
// ===========================================
document.addEventListener('DOMContentLoaded', () => {
    UI.initUI();
    setupGlobalFunctions();
    
    // VFXインスタンス
    if (window.MatchVFX) {
        vfx = new window.MatchVFX('vfx-stage');
    }
    
    console.log('🎲 Night Of Schemes initialized!');
});

function setupGlobalFunctions() {
    window.startCpuGame = startCpuGame;
    window.startOnlineGame = startOnlineGame;
    window.confirmBet = confirmBet;
    window.rollDice = rollDice;
    window.useCard = useCard;
    window.drawCard = drawCard;
    window.nextMatch = nextMatch;
    window.restartGame = restartGame;
    window.skipToResult = skipToResult;
}

// ===========================================
// ゲーム開始
// ===========================================
async function startCpuGame() {
    gameState = createGameState('cpu');
    cpuAI = createCpuAI();
    
    // CPUの手札を初期化
    gameState.players.cpu.hand = cpuAI.initializeHand(gameState);
    
    // プレイヤーに初期カードを配布（各色1枚）
    for (let i = 0; i < 5; i++) {
        gameState.drawCard('player', true);
    }
    
    UI.showScreen('game');
    UI.updateGameInfo(gameState);
    UI.updatePlayerInfo(gameState.players.player, 'player');
    UI.updatePlayerInfo(gameState.players.cpu, 'cpu');
    UI.updateRankPanel('normal');
    
    // 試合開始演出
    if (vfx) {
        await vfx.playPattern1('第1巡', 'いざ、勝負！');
    }
    
    await sleep(500);
    startBettingPhase();
}

function startOnlineGame() {
    // オンライン対戦（未実装）
    alert('オンライン対戦は現在開発中です');
}

// ===========================================
// ベッティングフェーズ
// ===========================================
function startBettingPhase() {
    gameState.phase = 'betting';
    
    UI.showBetModal(gameState.players.player.money, (amount) => {
        confirmBet(amount);
    });
}

async function confirmBet(amount) {
    gameState.setBet('player', amount);
    
    // CPUも賭ける（同額）
    const cpuBet = cpuAI.decideBet(gameState);
    gameState.setBet('cpu', cpuBet);
    
    UI.updatePlayerInfo(gameState.players.player, 'player');
    UI.updatePlayerInfo(gameState.players.cpu, 'cpu');
    
    // カード選択フェーズへ
    startCardPhase();
}

// ===========================================
// カード選択フェーズ
// ===========================================
function startCardPhase() {
    gameState.phase = 'card_select';
    
    // アクションボタンを「サイコロを振る」に設定
    UI.setActionButton('サイコロを振る', () => {
        startRollingPhase();
    });
    UI.showActionButton();
    
    // カードドローボタン
    updateDrawButton();
}

function updateDrawButton() {
    const drawBtn = document.getElementById('card-draw-button');
    if (drawBtn) {
        const cost = Math.floor(gameState.players.player.money * gameState.config.drawCostRate);
        drawBtn.textContent = `カードを引く (¥${cost.toLocaleString()})`;
        drawBtn.disabled = gameState.players.player.money < cost;
    }
}

async function drawCard() {
    if (gameState.phase !== 'card_select') return;
    
    const card = gameState.drawCard('player');
    if (card) {
        UI.updatePlayerInfo(gameState.players.player, 'player');
        updateDrawButton();
        
        // カード獲得演出
        UI.flashElement(document.getElementById('player-cards'), 'flash-gold');
    }
}

async function useCard(cardIndex) {
    if (gameState.phase !== 'card_select') return;
    
    const result = gameState.useCard('player', cardIndex);
    if (result.error) {
        alert('所持金が足りません');
        return;
    }
    
    UI.updatePlayerInfo(gameState.players.player, 'player');
    
    // カード使用演出
    if (vfx && result.card) {
        await vfx.playPattern2(result.card.name);
    }
    
    // 特殊効果の処理
    if (result.result) {
        if (result.result.action === 'mode_change') {
            await handleModeChange(result.result.mode);
        } else if (result.result.action === 'coin_toss') {
            await handleCoinToss(result.result);
        } else if (result.result.action === 'draw') {
            for (let i = 0; i < result.result.count; i++) {
                gameState.drawCard('player', result.result.free);
            }
            UI.updatePlayerInfo(gameState.players.player, 'player');
        }
    }
    
    // CPUの行動を記録
    cpuAI.recordPlayerAction('card_use', { card: result.card });
}

async function handleModeChange(mode) {
    UI.updateRankPanel(mode);
    UI.updateGameInfo(gameState);
    
    // モード変更演出
    if (vfx) {
        const newModeName = getRoleTable(mode).name;
        await vfx.playPattern3('通常賽', newModeName);
    }
}

async function handleCoinToss(result) {
    // コイントス演出
    const resultText = result.results.map(r => r === 'heads' ? '表' : '裏').join(' ');
    
    if (vfx) {
        await vfx.playPattern2(resultText);
    }
    
    if (result.success) {
        // 即勝利
        alert('コイントス成功！即勝利！');
        gameState.matchResult = {
            winner: 'player',
            instantWin: true,
            payout: gameState.players.player.currentBet * 10
        };
        gameState.players.player.money += gameState.matchResult.payout;
        showResult();
    }
}

// ===========================================
// サイコロフェーズ
// ===========================================
async function startRollingPhase() {
    gameState.phase = 'rolling';
    UI.hideActionButton();
    UI.setAnimating(true);
    
    // CPUがカードを使うか決定
    const cpuCard = cpuAI.decideCardUse(gameState, gameState.players.cpu.hand);
    if (cpuCard) {
        const cardIndex = gameState.players.cpu.hand.findIndex(c => c.id === cpuCard.id);
        if (cardIndex >= 0) {
            gameState.useCard('cpu', cardIndex);
            UI.updatePlayerInfo(gameState.players.cpu, 'cpu');
            
            // CPU カード使用演出
            if (vfx) {
                await vfx.playPattern2(`CPU: ${cpuCard.name}`);
            }
        }
    }
    
    await sleep(500);
    
    // CPUが先に振る
    UI.setActivePlayer('cpu');
    await rollForPlayer('cpu');
    
    await sleep(1000);
    
    // プレイヤーが振る
    UI.setActivePlayer('player');
    await rollForPlayer('player');
    
    UI.setAnimating(false);
    
    // 振り直し可能か確認
    if (gameState.canReroll('player')) {
        UI.setActionButton('振り直す', () => rerollDice(), false);
        UI.showActionButton();
        
        // 確定ボタンも表示
        const skipBtn = document.getElementById('skip-reroll-btn');
        if (skipBtn) {
            skipBtn.classList.remove('hidden');
            skipBtn.onclick = () => {
                skipBtn.classList.add('hidden');
                judgeAndShowResult();
            };
        }
    } else {
        judgeAndShowResult();
    }
}

async function rollForPlayer(playerId) {
    const result = gameState.rollDice(playerId);
    
    // DiceRoller APIを使用
    if (window.DiceRoller) {
        window.DiceRoller.setDiceFaces(gameState.diceFaces);
        
        if (result.isShonben) {
            window.DiceRoller.rollShonben(playerId === 'player' ? 'bottom' : 'top');
        } else {
            window.DiceRoller.rollWithValues(
                playerId === 'player' ? 'bottom' : 'top',
                result.dice
            );
        }
    }
    
    // 結果表示を待つ
    await waitForDiceStop();
    
    // UI更新
    UI.updatePlayerInfo(gameState.players[playerId], playerId);
    
    // 役名演出
    if (vfx && result.role) {
        await vfx.playPattern2(result.role.name);
    }
    
    return result;
}

async function rollDice() {
    await startRollingPhase();
}

async function rerollDice() {
    if (!gameState.canReroll('player')) return;
    
    UI.hideActionButton();
    UI.setAnimating(true);
    
    const result = gameState.reroll('player');
    
    if (window.DiceRoller) {
        window.DiceRoller.rollWithValues('bottom', result.dice);
    }
    
    await waitForDiceStop();
    
    UI.updatePlayerInfo(gameState.players.player, 'player');
    
    if (vfx && result.role) {
        await vfx.playPattern2(result.role.name);
    }
    
    UI.setAnimating(false);
    
    // まだ振り直し可能か
    if (gameState.canReroll('player')) {
        UI.setActionButton(`振り直す (残り${gameState.players.player.rerollsLeft}回)`, () => rerollDice());
        UI.showActionButton();
    } else {
        judgeAndShowResult();
    }
}

function waitForDiceStop() {
    return new Promise(resolve => {
        const check = setInterval(() => {
            if (window.DiceRoller && !window.DiceRoller.isRolling?.()) {
                clearInterval(check);
                setTimeout(resolve, 500);
            }
        }, 100);
        
        // タイムアウト
        setTimeout(() => {
            clearInterval(check);
            resolve();
        }, 5000);
    });
}

// ===========================================
// 結果フェーズ
// ===========================================
async function judgeAndShowResult() {
    gameState.phase = 'result';
    
    const result = gameState.judgeMatch();
    
    UI.updatePlayerInfo(gameState.players.player, 'player');
    UI.updatePlayerInfo(gameState.players.cpu, 'cpu');
    
    // 結果演出
    const winnerText = result.winner === 'player' ? 'WIN!' : 'LOSE...';
    if (vfx) {
        await vfx.playPattern1(result.playerRole.name + ' vs ' + result.cpuRole.name, winnerText);
    }
    
    await sleep(1000);
    
    showResult();
}

function showResult() {
    const result = gameState.matchResult;
    
    UI.showMatchResult(result, () => {
        nextMatch();
    });
}

// ===========================================
// 次の試合
// ===========================================
async function nextMatch() {
    // 隠しボタンを非表示
    const skipBtn = document.getElementById('skip-reroll-btn');
    if (skipBtn) skipBtn.classList.add('hidden');
    
    const canContinue = gameState.nextMatch();
    
    if (!canContinue) {
        // ゲーム終了
        showGameEnd();
        return;
    }
    
    // UI更新
    UI.updateGameInfo(gameState);
    UI.updatePlayerInfo(gameState.players.player, 'player');
    UI.updatePlayerInfo(gameState.players.cpu, 'cpu');
    UI.updateRankPanel('normal');
    UI.setActivePlayer(null);
    
    // 新しい試合開始演出
    if (vfx) {
        await vfx.playPattern1(`第${gameState.currentMatch}巡`, 'いざ、勝負！');
    }
    
    await sleep(500);
    startBettingPhase();
}

function showGameEnd() {
    const state = gameState.getState();
    UI.showGameResult(state.gameResult, state.players.player.money, restartGame);
}

function restartGame() {
    UI.showScreen('title');
}

function skipToResult() {
    // デバッグ用：振り直しをスキップして結果へ
    const skipBtn = document.getElementById('skip-reroll-btn');
    if (skipBtn) skipBtn.classList.add('hidden');
    judgeAndShowResult();
}

// ===========================================
// ユーティリティ
// ===========================================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
