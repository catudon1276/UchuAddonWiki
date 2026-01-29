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
        console.log('🎲 Initializing DiceRoller...');
        window.DiceRoller.init('dice-canvas');
        console.log('✅ DiceRoller initialized');
    } else {
        console.error('❌ DiceRoller not found!');
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

    UI.showScreen('game');

    // 前のゲームから残っているカードUI をクリア（ゲーム状態を変更する前に）
    const playerHandMini = document.getElementById('player-hand-mini');
    const cpuHand = document.getElementById('cpu-hand');
    const playerHand = document.getElementById('player-hand');
    if (playerHandMini) playerHandMini.innerHTML = '';
    if (cpuHand) cpuHand.innerHTML = '';
    if (playerHand) playerHand.innerHTML = '';

    // CPUの手札を初期化
    gameState.players.cpu.hand = cpuAI.initializeHand(gameState);

    // プレイヤーに初期カードを配布（2枚）
    for (let i = 0; i < 2; i++) {
        gameState.drawCard('player', true);
    }

    UI.updateGameInfo(gameState);
    UI.updatePlayerInfo(gameState.players.player, 'player', false); // 初期化時はアニメーションなし
    UI.updatePlayerInfo(gameState.players.cpu, 'cpu', false);
    UI.updateRankPanel('normal');
    UI.hideDiceResult();

    await sleep(500);

    // ルール説明モーダルを表示
    UI.showRulesModal(() => {
        startBettingPhase();
    });
}

function startOnlineGame() {
    alert('オンライン対戦は現在開発中です');
}

// ===========================================
// ベッティングフェーズ
// ===========================================
function startBettingPhase() {
    gameState.phase = 'betting';

    UI.hideDiceResult();
    UI.setCardsEnabled(false); // カード操作無効化

    // 「賭ける」ボタンを表示
    UI.setActionButton('賭ける', () => {
        UI.showBetModal(gameState.players.player.money, (amount) => {
            confirmBet(amount);
        });
    });
    UI.showActionButton();
}

async function confirmBet(amount) {
    gameState.setBet('player', amount);

    // CPUも賭ける
    const cpuBet = cpuAI.decideBet(gameState);
    gameState.setBet('cpu', cpuBet);

    UI.updatePlayerInfo(gameState.players.player, 'player');
    UI.updatePlayerInfo(gameState.players.cpu, 'cpu');

    UI.hideActionButton(); // 賭けるボタンを非表示

    // 賭けた直後に所持金が100円未満ならゲームオーバー
    if (gameState.gameResult === 'defeat') {
        await sleep(1000);
        UI.showGameResult('defeat', gameState.players.player.money, restartGame);
        return;
    }

    startCardPhase();
}

// ===========================================
// カード選択フェーズ
// ===========================================
function startCardPhase() {
    gameState.phase = 'card_select';
    UI.setCardsEnabled(true); // カード操作有効化

    UI.setActionButton('サイコロを振る', () => {
        startRollingPhase();
    });
    UI.showActionButton();
}

async function drawCard() {
    if (gameState.phase !== 'card_select') return;

    const card = gameState.drawCard('player');
    if (card) {
        UI.updatePlayerInfo(gameState.players.player, 'player', true); // ドロー時はアニメーションあり
        UI.updateGameInfo(gameState);

        // 所持金が100未満になった場合、即座にゲームオーバー
        if (gameState.gameResult === 'defeat') {
            UI.showGameResult('defeat', gameState.players.player.money, restartGame);
        }
    }
}

async function useCard(cardIndex, targetId = null) {
    // card_select フェーズまたは rolling フェーズ（振り直し可能な時）でのみ使用可能
    if (gameState.phase !== 'card_select' && gameState.phase !== 'rolling') return;

    // ターゲット選択が必要なカードの場合、デフォルトでCPUを対象
    const card = gameState.players.player.hand[cardIndex];
    if (card && (card.targetType === 'choice' || card.targetType === 'enemy') && !targetId) {
        targetId = 'cpu';
    }

    const result = gameState.useCard('player', cardIndex, targetId);
    if (result.error) {
        if (result.error === 'not_enough_money') {
            alert('所持金が足りません');
        } else if (result.error === 'cannot_use') {
            alert('このカードは使用できません');
        }
        return;
    }

    // カード使用通知を表示
    UI.showCardUsedNotification('YOU', result.card.name, result.card.description);
    await sleep(200); // 通知が表示されるまで少し待つ

    UI.updatePlayerInfo(gameState.players.player, 'player');
    UI.updatePlayerInfo(gameState.players.cpu, 'cpu');

    // 所持金が100未満になった場合、即座にゲームオーバー
    if (gameState.gameResult === 'defeat') {
        UI.showGameResult('defeat', gameState.players.player.money, restartGame);
        return;
    }

    // 即勝利判定
    if (gameState.gameResult === 'victory') {
        UI.showGameResult('victory', gameState.players.player.money, restartGame);
        return;
    }

    // 特殊効果の処理
    await handleCardEffectResult(result, 'player');

    cpuAI.recordPlayerAction('card_use', { card: result.card });
}

/**
 * カード効果の結果を処理
 */
async function handleCardEffectResult(result, userId) {
    if (!result || !result.result) return;

    const effectResult = result.result;

    switch (effectResult.action) {
        case 'mode_change':
            await handleModeChange(effectResult.mode);
            break;

        case 'coin_toss':
            await handleCoinToss(effectResult);
            break;

        case 'draw':
            // 無料ドローはgame-state.jsで処理済み
            // UI更新はuseCard関数で既に行われているため、ここでは行わない
            if (gameState.gameResult === 'defeat') {
                UI.showGameResult('defeat', gameState.players.player.money, restartGame);
            }
            break;

        case 'card_destroy':
            // カード破壊の視覚的フィードバック
            console.log(`カード破壊: ${effectResult.destroyed}枚`);
            UI.updatePlayerInfo(gameState.players.player, 'player');
            UI.updatePlayerInfo(gameState.players.cpu, 'cpu');
            break;

        case 'wealth_tax':
            console.log(`強制徴収: ${effectResult.totalTax}円 → ${effectResult.beneficiary}`);
            UI.updatePlayerInfo(gameState.players.player, 'player');
            UI.updatePlayerInfo(gameState.players.cpu, 'cpu');
            break;

        case 'wealth_equal':
            console.log(`所持金均等化: ${effectResult.average}円`);
            UI.updatePlayerInfo(gameState.players.player, 'player');
            UI.updatePlayerInfo(gameState.players.cpu, 'cpu');
            break;

        case 'revive':
            console.log(`復活: ${effectResult.target} → ${effectResult.amount}円`);
            UI.updatePlayerInfo(gameState.players.player, 'player');
            UI.updatePlayerInfo(gameState.players.cpu, 'cpu');
            break;

        case 'blocked':
            console.log(`カード効果がブロックされました: ${effectResult.reason}`);
            break;

        default:
            // その他の効果（ステータス変更など）
            break;
    }
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
    UI.setCardsEnabled(false); // カード操作無効化

    // CPUがカードを使うか決定
    const cpuCardDecision = cpuAI.decideCardUse(gameState, gameState.players.cpu.hand);
    if (cpuCardDecision) {
        const { cardIndex, targetId } = cpuCardDecision;
        if (cardIndex >= 0) {
            const result = gameState.useCard('cpu', cardIndex, targetId);
            if (result && result.card) {
                // CPU のカード使用通知を表示
                UI.showCardUsedNotification('CPU', result.card.name, result.card.description);
                await sleep(1200); // 通知表示時間 + 余裕

                // 特殊効果のUI更新
                await handleCardEffectResult(result, 'cpu');
            }
            UI.updatePlayerInfo(gameState.players.cpu, 'cpu');
            UI.updatePlayerInfo(gameState.players.player, 'player');
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
        UI.setCardsEnabled(true); // 振り直し時はカード操作可能

        UI.setActionButton('振り直す', () => rerollDice());
        UI.showActionButton();

        UI.showSkipButton('確定', () => {
            UI.hideSkipButton();
            UI.setCardsEnabled(false); // 確定時はカード無効化
            judgeAndShowResult();
        });
    } else {
        judgeAndShowResult();
    }
}

async function rollForPlayer(playerId) {
    const result = gameState.rollDice(playerId);

    console.log(`🎲 rollForPlayer(${playerId}):`, { result, diceFaces: gameState.diceFaces });

    // DiceRoller APIを使用
    if (window.DiceRoller) {
        console.log('✅ DiceRoller available');
        window.DiceRoller.setDiceFaces?.(gameState.diceFaces);

        if (result.isShonben) {
            console.log('🎲 Calling rollShonben');
            window.DiceRoller.rollShonben?.(playerId === 'player' ? 'bottom' : 'top');
        } else {
            console.log('🎲 Calling rollWithValues:', { direction: playerId === 'player' ? 'bottom' : 'top', dice: result.dice });
            window.DiceRoller.rollWithValues?.(
                playerId === 'player' ? 'bottom' : 'top',
                result.dice
            );
        }
    } else {
        console.warn('❌ DiceRoller not available');
    }
    
    await waitForDiceStop();

    UI.updatePlayerInfo(gameState.players[playerId], playerId);

    // 振る度に中央に結果を表示（プレイヤー・CPU両方）
    if (result.role) {
        UI.showDiceResult(result.role.name, result.dice);
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
    UI.setCardsEnabled(false); // 振り直し中はカード無効化

    const result = gameState.reroll('player');
    
    if (window.DiceRoller) {
        window.DiceRoller.rollWithValues?.('bottom', result.dice);
    }
    
    await waitForDiceStop();

    UI.updatePlayerInfo(gameState.players.player, 'player');

    // 振り直し結果を中央に表示
    if (result.role) {
        UI.showDiceResult(result.role.name, result.dice);
    }

    UI.setAnimating(false);

    if (gameState.canReroll('player')) {
        UI.setCardsEnabled(true); // まだ振り直し可能ならカード操作有効化
        UI.setActionButton(`振り直す (残り${gameState.players.player.rerollsLeft}回)`, () => rerollDice());
        UI.showActionButton();
    } else {
        UI.setCardsEnabled(false); // 振り直し不可ならカード無効化
        UI.hideSkipButton();
        judgeAndShowResult();
    }
}

function waitForDiceStop() {
    return new Promise(resolve => {
        console.log('⏳ Waiting for dice to stop...');
        let attempts = 0;
        const check = setInterval(() => {
            attempts++;
            const isRolling = window.DiceRoller?.isRolling?.();
            if (!isRolling) {
                console.log(`✅ Dice stopped after ${attempts} checks`);
                clearInterval(check);
                setTimeout(resolve, 500);
            }
        }, 100);

        setTimeout(() => {
            clearInterval(check);
            console.warn('⚠️ Dice timeout - continuing anyway');
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
    UI.setCardsEnabled(false); // カード操作無効化

    const result = gameState.judgeMatch();

    // 特殊効果の発動をログ出力
    if (result.damageReduced) {
        console.log('被害軽減が発動しました');
    }
    if (result.deathGuardActivated) {
        console.log('即死回避が発動しました');
    }

    UI.updatePlayerInfo(gameState.players.player, 'player');
    UI.updatePlayerInfo(gameState.players.cpu, 'cpu');

    await sleep(1000);

    // 結果判定後に所持金が100円未満ならゲームオーバー（即死回避で復活していない場合）
    if (gameState.players.player.money < 100) {
        gameState.gameResult = 'defeat';
        UI.showGameResult('defeat', gameState.players.player.money, restartGame);
        return;
    }

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
    UI.hideDiceResult();

    const canContinue = gameState.nextMatch();

    if (!canContinue) {
        showGameEnd();
        return;
    }

    // カード表示をリセット（次の試合のため）
    const playerHandMini = document.getElementById('player-hand-mini');
    const cpuHand = document.getElementById('cpu-hand');
    const playerHand = document.getElementById('player-hand');
    if (playerHandMini) playerHandMini.innerHTML = '';
    if (cpuHand) cpuHand.innerHTML = '';
    if (playerHand) playerHand.innerHTML = '';

    UI.updateGameInfo(gameState);
    UI.updatePlayerInfo(gameState.players.player, 'player', false); // 初期化時はアニメーションなし
    UI.updatePlayerInfo(gameState.players.cpu, 'cpu', false);
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
