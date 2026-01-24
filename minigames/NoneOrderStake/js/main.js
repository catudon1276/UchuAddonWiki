/**
 * Night Of Schemes - メインエントリーポイント
 * 縦型レイアウト対応 ES Modules形式
 */

import { createGameState } from './game-state.js';
import { createCpuAI } from './cpu-ai.js';
import * as UI from './ui.js';

// ===========================================
// グローバル状態
// ===========================================
let gameState = null;
let cpuAI = null;

// ===========================================
// 初期化
// ===========================================
document.addEventListener('DOMContentLoaded', () => {
    // UI初期化（コールバック渡し）
    UI.initUI({
        onStartCpuGame: startCpuGame,
        onRestart: restartGame,
        onDrawCard: drawCard,
        onCardUse: useCard
    });
    
    // グローバル関数を公開（デバッグ用）
    setupGlobalFunctions();
    
    // DiceRoller初期化
    if (window.DiceRoller) {
        window.DiceRoller.init('dice-canvas');
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
    
    // プレイヤーに初期カードを配布
    for (let i = 0; i < 5; i++) {
        gameState.drawCard('player', true);
    }
    
    UI.showScreen('game');
    UI.updateGameInfo(gameState);
    UI.updatePlayerInfo(gameState.players.player, 'player');
    UI.updatePlayerInfo(gameState.players.cpu, 'cpu');
    UI.updateRankPanel('normal');
    
    await sleep(500);
    startBettingPhase();
}

function startOnlineGame() {
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
    
    // CPUも賭ける
    const cpuBet = cpuAI.decideBet(gameState);
    gameState.setBet('cpu', cpuBet);
    
    UI.updatePlayerInfo(gameState.players.player, 'player');
    UI.updatePlayerInfo(gameState.players.cpu, 'cpu');
    
    startCardPhase();
}

// ===========================================
// カード選択フェーズ
// ===========================================
function startCardPhase() {
    gameState.phase = 'card_select';
    
    UI.setActionButton('サイコロを振る', () => {
        startRollingPhase();
    });
    UI.showActionButton();
}

async function drawCard() {
    if (gameState.phase !== 'card_select') return;
    
    const card = gameState.drawCard('player');
    if (card) {
        UI.updatePlayerInfo(gameState.players.player, 'player');
        UI.updateGameInfo(gameState);
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
    
    cpuAI.recordPlayerAction('card_use', { card: result.card });
}

async function handleModeChange(mode) {
    UI.updateRankPanel(mode);
    UI.updateGameInfo(gameState);
}

async function handleCoinToss(result) {
    // CoinTosser APIを使用してコイントス演出
    if (window.CoinTosser) {
        window.CoinTosser.setCoinCount(result.results.length);
        const coinResults = result.results.map(r => r === 'heads' ? 'H' : 'T');
        window.CoinTosser.tossWithResults('bottom', coinResults);
        await waitForCoinStop();
    }
    
    const resultText = result.results.map(r => r === 'heads' ? '表' : '裏').join(' ');
    console.log('コイントス結果:', resultText);
    
    if (result.success) {
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
        UI.setActionButton('振り直す', () => rerollDice());
        UI.showActionButton();
        
        UI.showSkipButton('確定', () => {
            UI.hideSkipButton();
            judgeAndShowResult();
        });
    } else {
        judgeAndShowResult();
    }
}

async function rollForPlayer(playerId) {
    const result = gameState.rollDice(playerId);
    
    // DiceRoller APIを使用
    if (window.DiceRoller) {
        window.DiceRoller.setDiceFaces?.(gameState.diceFaces);
        
        if (result.isShonben) {
            window.DiceRoller.rollShonben?.(playerId === 'player' ? 'bottom' : 'top');
        } else {
            window.DiceRoller.rollWithValues?.(
                playerId === 'player' ? 'bottom' : 'top',
                result.dice
            );
        }
    }
    
    await waitForDiceStop();
    
    UI.updatePlayerInfo(gameState.players[playerId], playerId);
    
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
        window.DiceRoller.rollWithValues?.('bottom', result.dice);
    }
    
    await waitForDiceStop();
    
    UI.updatePlayerInfo(gameState.players.player, 'player');
    
    UI.setAnimating(false);
    
    if (gameState.canReroll('player')) {
        UI.setActionButton(`振り直す (残り${gameState.players.player.rerollsLeft}回)`, () => rerollDice());
        UI.showActionButton();
    } else {
        UI.hideSkipButton();
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
        
        setTimeout(() => {
            clearInterval(check);
            resolve();
        }, 5000);
    });
}

function waitForCoinStop() {
    return new Promise(resolve => {
        const check = setInterval(() => {
            if (window.CoinTosser && !window.CoinTosser.isTossing?.()) {
                clearInterval(check);
                setTimeout(resolve, 500);
            }
        }, 100);
        
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
    UI.hideSkipButton();
    
    const canContinue = gameState.nextMatch();
    
    if (!canContinue) {
        showGameEnd();
        return;
    }
    
    UI.updateGameInfo(gameState);
    UI.updatePlayerInfo(gameState.players.player, 'player');
    UI.updatePlayerInfo(gameState.players.cpu, 'cpu');
    UI.updateRankPanel('normal');
    UI.setActivePlayer(null);
    
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
    UI.hideSkipButton();
    judgeAndShowResult();
}

// ===========================================
// ユーティリティ
// ===========================================
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
