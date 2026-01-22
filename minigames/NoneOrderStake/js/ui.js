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
    
    // グローバル関数を登録
    registerGlobalFunctions();
}

/**
 * グローバル関数を登録
 */
function registerGlobalFunctions() {
    window.startGame = startGame;
    window.confirmBet = confirmBet;
    window.selectCheat = selectCheat;
    window.rollDice = rollDice;
    window.nextMatch = nextMatch;
    window.restartGame = restartGame;
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
function startGame() {
    game.reset();
    game.startBetting();
    
    // 画面切り替え
    document.getElementById('screen-title').classList.add('hidden');
    document.getElementById('canvas-container').classList.remove('hidden');
    document.getElementById('bet-ui').classList.remove('hidden');
    
    updateUI();
}

/**
 * 賭け金確定
 */
function confirmBet() {
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
}

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
function selectCheat(cheatId) {
    document.getElementById('cheat-modal').classList.add('hidden');
    
    // ゲームロジック側でイカサマを選択（CPUも含む）
    game.selectCheat(cheatId);
    
    // サイコロを振るボタンを表示
    document.getElementById('btn-roll').classList.remove('hidden');
}

/**
 * サイコロを振る
 */
async function rollDice() {
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
}

/**
 * サイコロアニメーション
 */
async function animateRoll(who) {
    const isPlayer = who === 'player';
    
    // Canvasを表示
    if (window.DiceRoller) {
        window.DiceRoller.showCanvas();
    }
    
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
            
            // 結果ボックスに表示
            updateResultBox(isPlayer, result);
            
            setTimeout(() => {
                resultDisplay.classList.remove('show');
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
 * 結果ボックスを更新
 */
function updateResultBox(isPlayer, result) {
    const prefix = isPlayer ? 'player' : 'cpu';
    const diceContainer = document.getElementById(`${prefix}-result-dice`);
    const roleDisplay = document.getElementById(`${prefix}-result-role`);
    
    // サイコロの目を表示
    const diceElements = diceContainer.querySelectorAll('.result-dice');
    result.dice.forEach((val, i) => {
        if (diceElements[i]) {
            if (val === 'cursed') {
                diceElements[i].textContent = '?';
                diceElements[i].classList.add('cursed');
                diceElements[i].classList.remove('one');
            } else {
                diceElements[i].textContent = val;
                diceElements[i].classList.remove('cursed');
                if (val === 1) {
                    diceElements[i].classList.add('one');
                } else {
                    diceElements[i].classList.remove('one');
                }
            }
        }
    });
    
    // 役を表示
    if (result.isShonben) {
        roleDisplay.textContent = 'ションベン';
        roleDisplay.style.color = '#facc15';
    } else {
        const roleValue = result.role.value ? `(${result.role.value})` : '';
        roleDisplay.textContent = `${result.role.name}${roleValue}`;
        roleDisplay.style.color = 'white';
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
function nextMatch() {
    document.getElementById('btn-next').classList.add('hidden');
    
    // 結果ボックスをリセット
    resetResultBoxes();
    
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
}

/**
 * 結果ボックスをリセット
 */
function resetResultBoxes() {
    ['player', 'cpu'].forEach(prefix => {
        const diceContainer = document.getElementById(`${prefix}-result-dice`);
        const roleDisplay = document.getElementById(`${prefix}-result-role`);
        
        const diceElements = diceContainer.querySelectorAll('.result-dice');
        diceElements.forEach(dice => {
            dice.textContent = '?';
            dice.classList.remove('one', 'cursed');
        });
        
        roleDisplay.textContent = '-';
        roleDisplay.style.color = 'white';
    });
}

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
function restartGame() {
    document.getElementById('screen-gameover').classList.add('hidden');
    document.getElementById('screen-victory').classList.add('hidden');
    document.getElementById('screen-title').classList.remove('hidden');
}

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