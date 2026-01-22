/**
 * UI制御モジュール - Dice.htmlベース完全版
 */

import { createGame } from './game.js';
import { CHEATS } from '../data/cheats-data.js';

let game = null;
let isAnimating = false;

/**
 * 初期化
 */
export function initUI() {
    game = createGame();
    setupDiceRollerCallbacks();
    setupBetSlider();
}

/**
 * Dice Rollerコールバック設定
 */
function setupDiceRollerCallbacks() {
    window.onDiceRollComplete = (results, isShonben) => {
        console.log('Dice roll complete:', results, 'Shonben:', isShonben);
    };
}

/**
 * ベットスライダー設定
 */
function setupBetSlider() {
    const slider = document.getElementById('bet-slider');
    const display = document.getElementById('bet-display');
    
    if (slider && display) {
        slider.addEventListener('input', () => {
            display.textContent = parseInt(slider.value).toLocaleString();
        });
    }
}

/**
 * ゲーム開始
 */
window.startGame = function() {
    game.reset();
    game.startBetting();
    
    // 画面切り替え
    document.getElementById('screen-title').classList.add('hidden');
    document.getElementById('canvas-container').classList.remove('hidden');
    document.getElementById('bet-ui').classList.remove('hidden');
    
    updateUI();
};

/**
 * 賭け金確定
 */
window.confirmBet = function() {
    const slider = document.getElementById('bet-slider');
    const amount = parseInt(slider.value);
    
    game.setBet(amount);
    document.getElementById('bet-ui').classList.add('hidden');
    
    // イカサマ選択へ
    const phase = game.getCurrentPhase();
    if (phase.cheatLevel > 0) {
        showCheatSelection();
    } else {
        // イカサマなしで直接サイコロ振りへ
        game.selectCheat(null);
        document.getElementById('btn-roll').classList.remove('hidden');
    }
};

/**
 * イカサマ選択UI表示
 */
function showCheatSelection() {
    const availableCheats = game.getAvailableCheatsForPlayer();
    const cheatList = document.getElementById('cheat-list');
    const state = game.getState();
    
    cheatList.innerHTML = '';
    
    availableCheats.forEach(cheat => {
        const cheatData = CHEATS.find(c => c.id === cheat);
        if (!cheatData) return;
        
        const cost = game.calculateCheatCost(cheat);
        const canAfford = state.player.money >= cost;
        
        const div = document.createElement('div');
        div.className = `cheat-option ${!canAfford ? 'disabled' : ''}`;
        div.innerHTML = `
            <div class="cheat-name">${cheatData.name}</div>
            <div class="cheat-desc">${cheatData.description}</div>
            <div class="cheat-cost">${cost.toLocaleString()}円</div>
        `;
        
        if (canAfford) {
            div.onclick = () => selectCheat(cheat);
        }
        
        cheatList.appendChild(div);
    });
    
    document.getElementById('cheat-modal').classList.remove('hidden');
}

/**
 * イカサマ選択
 */
window.selectCheat = function(cheatId) {
    document.getElementById('cheat-modal').classList.add('hidden');
    
    // ゲームロジック側でイカサマを選択（CPUも含む）
    game.selectCheat(cheatId);
    
    // サイコロを振るボタンを表示
    document.getElementById('btn-roll').classList.remove('hidden');
};

/**
 * サイコロを振る
 */
window.rollDice = async function() {
    if (isAnimating) return;
    isAnimating = true;
    
    document.getElementById('btn-roll').classList.add('hidden');
    
    // CPU振る（上から）
    await animateRoll('cpu');
    await sleep(1000);
    
    // プレイヤー振る（下から）
    await animateRoll('player');
    await sleep(1000);
    
    // 結果判定
    game.finalizeMatch();
    showMatchResult();
    
    isAnimating = false;
};

/**
 * サイコロアニメーション
 */
async function animateRoll(who) {
    const isPlayer = who === 'player';
    
    // ゲームロジックからサイコロの目を取得
    const result = game.roll(isPlayer, 0);
    
    // DiceRollerを使用して演出
    const direction = isPlayer ? 'bottom' : 'top';
    
    return new Promise((resolve) => {
        window.onDiceRollComplete = (results, isShonben) => {
            // 結果を画面上部に表示
            const resultDisplay = document.getElementById('result-display');
            
            if (isShonben || result.isShonben) {
                resultDisplay.textContent = 'ションベン！';
                resultDisplay.classList.add('shonben');
            } else {
                const roleName = result.role.name;
                const roleValue = result.role.value ? `(${result.role.value})` : '';
                resultDisplay.textContent = `${isPlayer ? 'あなた' : 'CPU'}: ${roleName}${roleValue}`;
                resultDisplay.classList.remove('shonben');
            }
            
            resultDisplay.classList.add('show');
            
            setTimeout(() => {
                resultDisplay.classList.remove('show');
                if (window.DiceRoller) {
                    window.DiceRoller.hideCanvas();
                }
                resolve();
            }, 2000);
        };
        
        // サイコロの目を指定して振る
        if (window.DiceRoller) {
            const values = result.dice.map(d => d === 'cursed' ? 1 : d);
            window.DiceRoller.rollWithValues(direction, values);
        } else {
            console.error('DiceRoller not found!');
            resolve();
        }
    });
    
    // 役を保存
    if (isPlayer) {
        game.getState().playerRole = result.role;
    } else {
        game.getState().cpuRole = result.role;
    }
}

/**
 * 試合結果表示
 */
function showMatchResult() {
    const state = game.getState();
    const resultMessage = document.getElementById('result-message');
    const resultWinner = document.getElementById('result-winner');
    const resultDetail = document.getElementById('result-detail');
    
    // 勝者判定
    let winnerText = '';
    let winnerClass = '';
    let detailText = '';
    
    if (state.winner === 'player') {
        winnerText = 'あなたの勝ち！';
        winnerClass = 'player';
        detailText = `+${state.payoutMultiplier * state.betAmount}円`;
    } else if (state.winner === 'cpu') {
        winnerText = 'CPUの勝ち';
        winnerClass = 'cpu';
        detailText = `-${state.betAmount}円`;
    } else {
        winnerText = '引き分け';
        winnerClass = 'draw';
        detailText = `±0円（同点はCPUの勝ち）`;
    }
    
    resultWinner.textContent = winnerText;
    resultWinner.className = `result-winner ${winnerClass}`;
    resultDetail.textContent = detailText;
    
    resultMessage.classList.add('show');
    
    // UI更新
    updateUI();
    
    // 次の試合ボタンを表示
    setTimeout(() => {
        resultMessage.classList.remove('show');
        document.getElementById('btn-next').classList.remove('hidden');
    }, 2000);
}

/**
 * 次の試合へ
 */
window.nextMatch = function() {
    document.getElementById('btn-next').classList.add('hidden');
    
    const canContinue = game.nextMatch();
    
    if (!canContinue) {
        if (game.getState().gameStatus === 'victory') {
            showVictory();
        } else {
            showGameOver();
        }
    } else {
        updateUI();
        document.getElementById('bet-ui').classList.remove('hidden');
    }
};

/**
 * ゲームオーバー表示
 */
function showGameOver() {
    const state = game.getState();
    document.getElementById('final-money').textContent = state.player.money.toLocaleString();
    document.getElementById('canvas-container').classList.add('hidden');
    document.getElementById('screen-gameover').classList.remove('hidden');
}

/**
 * 勝利表示
 */
function showVictory() {
    const state = game.getState();
    document.getElementById('victory-money').textContent = state.player.money.toLocaleString();
    document.getElementById('canvas-container').classList.add('hidden');
    document.getElementById('screen-victory').classList.remove('hidden');
}

/**
 * リスタート
 */
window.restartGame = function() {
    document.getElementById('screen-gameover').classList.add('hidden');
    document.getElementById('screen-victory').classList.add('hidden');
    document.getElementById('screen-title').classList.remove('hidden');
};

/**
 * UI更新
 */
function updateUI() {
    const state = game.getState();
    
    // 所持金
    document.getElementById('player-money').textContent = state.player.money.toLocaleString();
    document.getElementById('cpu-money').textContent = state.cpu.money.toLocaleString();
    
    // 試合数
    document.getElementById('current-match').textContent = state.currentMatch;
    
    // ベットスライダーの最大値
    const slider = document.getElementById('bet-slider');
    if (slider) {
        slider.max = state.player.money;
        slider.value = Math.min(parseInt(slider.value), state.player.money);
        document.getElementById('bet-display').textContent = parseInt(slider.value).toLocaleString();
    }
}

/**
 * スリープ
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}