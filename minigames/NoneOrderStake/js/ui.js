/**
 * UI制御モジュール - Dice Roller統合版
 */

import { createGame } from './game.js';
import { CHEATS, getAvailableCheats } from '../data/cheats-data.js';
import { ROLES_NORMAL } from '../data/roles-normal.js';
import { ROLES_NINE } from '../data/roles-nine.js';

let game = null;
let isAnimating = false;

// DOM要素キャッシュ
const elements = {};

/**
 * 初期化
 */
export function initUI() {
    cacheElements();
    game = createGame();
    setupEventListeners();
    setupDiceRollerCallbacks();
    showScreen('title');
}

/**
 * DOM要素をキャッシュ
 */
function cacheElements() {
    elements.screens = {
        title: document.getElementById('screen-title'),
        game: document.getElementById('screen-game'),
        gameover: document.getElementById('screen-gameover'),
        victory: document.getElementById('screen-victory'),
    };
    
    elements.ui = {
        playerMoney: document.getElementById('player-money'),
        cpuMoney: document.getElementById('cpu-money'),
        targetMoney: document.getElementById('target-money'),
        currentMatch: document.getElementById('current-match'),
        totalMatches: document.getElementById('total-matches'),
        phaseName: document.getElementById('phase-name'),
        betSlider: document.getElementById('bet-slider'),
        betDisplay: document.getElementById('bet-display'),
    };
    
    elements.plates = {
        player: document.getElementById('player-plate'),
        cpu: document.getElementById('cpu-plate'),
    };
    
    elements.roles = {
        player: document.getElementById('player-role'),
        cpu: document.getElementById('cpu-role'),
    };
    
    elements.cheats = {
        container: document.getElementById('cheat-container'),
        list: document.getElementById('cheat-list'),
    };
    
    elements.buttons = {
        start: document.getElementById('btn-start'),
        roll: document.getElementById('btn-roll'),
        confirmBet: document.getElementById('btn-confirm-bet'),
        skipCheat: document.getElementById('btn-skip-cheat'),
        nextMatch: document.getElementById('btn-next-match'),
        retry: document.querySelectorAll('#btn-retry'),
        retryVictory: document.getElementById('btn-retry-victory'),
    };
    
    elements.roleTable = document.getElementById('role-table');
    
    elements.dice = {
        playerDice: Array.from(document.querySelectorAll('.player-dice .dice')),
        cpuDice: Array.from(document.querySelectorAll('.cpu-dice .dice')),
    };
}

/**
 * Dice Rollerコールバック設定
 */
function setupDiceRollerCallbacks() {
    window.onDiceRollComplete = (results, isShonben) => {
        // サイコロ演出完了後の処理
        console.log('Dice roll complete:', results, 'Shonben:', isShonben);
    };
}

/**
 * イベントリスナー設定
 */
function setupEventListeners() {
    elements.buttons.start?.addEventListener('click', startGame);
    elements.ui.betSlider?.addEventListener('input', updateBetDisplay);
    elements.buttons.confirmBet?.addEventListener('click', confirmBet);
    elements.buttons.skipCheat?.addEventListener('click', () => selectCheat(null));
    elements.buttons.roll?.addEventListener('click', rollDice);
    elements.buttons.nextMatch?.addEventListener('click', nextMatch);
    elements.buttons.retry?.forEach(btn => {
        btn.addEventListener('click', () => {
            game.reset();
            startGame();
        });
    });
    elements.buttons.retryVictory?.addEventListener('click', () => {
        game.reset();
        startGame();
    });
}

/**
 * 画面表示切り替え
 */
function showScreen(screenName) {
    Object.values(elements.screens).forEach(screen => {
        screen?.classList.add('hidden');
    });
    elements.screens[screenName]?.classList.remove('hidden');
}

/**
 * ゲーム開始
 */
function startGame() {
    game.reset();
    game.startBetting();
    updateUI();
    updateRoleTable();
    showScreen('game');
    
    // ベットUI表示
    document.getElementById('betting-ui')?.classList.remove('hidden');
    document.getElementById('rolling-ui')?.classList.add('hidden');
}

/**
 * UI更新
 */
function updateUI() {
    const state = game.getState();
    
    // 所持金
    if (elements.ui.playerMoney) {
        elements.ui.playerMoney.textContent = state.player.money.toLocaleString();
    }
    if (elements.ui.cpuMoney) {
        elements.ui.cpuMoney.textContent = state.cpu.money.toLocaleString();
    }
    
    // 試合数
    if (elements.ui.currentMatch) {
        elements.ui.currentMatch.textContent = state.currentMatch;
    }
    if (elements.ui.totalMatches) {
        elements.ui.totalMatches.textContent = state.totalMatches;
    }
    
    // フェーズ
    const phase = game.getCurrentPhase();
    if (elements.ui.phaseName) {
        elements.ui.phaseName.textContent = phase.name;
    }
    
    // ベットスライダーの最大値
    if (elements.ui.betSlider) {
        elements.ui.betSlider.max = state.player.money;
        const currentBet = Math.min(parseInt(elements.ui.betSlider.value), state.player.money);
        elements.ui.betSlider.value = currentBet;
        updateBetDisplay();
    }
}

/**
 * 賭け金表示更新
 */
function updateBetDisplay() {
    const value = parseInt(elements.ui.betSlider?.value || 1000);
    if (elements.ui.betDisplay) {
        elements.ui.betDisplay.textContent = value.toLocaleString();
    }
}

/**
 * 賭け金確定
 */
function confirmBet() {
    const amount = parseInt(elements.ui.betSlider?.value || 1000);
    game.setBet(amount);
    
    // イカサマ選択へ
    const availableCheats = game.getAvailableCheatsForPlayer();
    if (availableCheats.length > 0) {
        showCheatSelection(availableCheats);
    } else {
        selectCheat(null);
    }
    
    document.getElementById('betting-ui')?.classList.add('hidden');
}

/**
 * イカサマ選択UI表示
 */
function showCheatSelection(cheats) {
    elements.cheats.container?.classList.remove('hidden');
    
    if (elements.cheats.list) {
        elements.cheats.list.innerHTML = '';
        
        cheats.forEach(cheat => {
            const cost = game.calculateCheatCost(cheat.id);
            const canAfford = game.getState().player.money >= cost;
            
            const button = document.createElement('button');
            button.className = `cheat-option ${!canAfford ? 'disabled' : ''}`;
            button.disabled = !canAfford;
            
            button.innerHTML = `
                <div class="cheat-name">${cheat.name}</div>
                <div class="cheat-desc">${cheat.description}</div>
                <div class="cheat-cost">${cost.toLocaleString()}円</div>
            `;
            
            button.addEventListener('click', () => selectCheat(cheat.id));
            elements.cheats.list.appendChild(button);
        });
    }
}

/**
 * イカサマ選択
 */
function selectCheat(cheatId) {
    elements.cheats.container?.classList.add('hidden');
    
    if (cheatId) {
        game.selectCheat(cheatId);
        showNotification(`イカサマ使用: ${CHEATS.find(c => c.id === cheatId).name}`);
    }
    
    // CPU選択
    game.cpuSelectCheat();
    
    // サイコロUI表示
    document.getElementById('rolling-ui')?.classList.remove('hidden');
}

/**
 * サイコロを振る
 */
async function rollDice() {
    if (isAnimating) return;
    isAnimating = true;
    
    elements.buttons.roll?.classList.add('hidden');
    
    // CPU振る（上から）
    await animateRoll('cpu');
    await sleep(500);
    
    // プレイヤー振る（下から）
    await animateRoll('player');
    await sleep(500);
    
    // 結果判定
    game.finalizeMatch();
    showMatchResult();
    
    isAnimating = false;
}

/**
 * サイコロアニメーション（Dice Roller統合版）
 */
async function animateRoll(who) {
    const state = game.getState();
    const isPlayer = who === 'player';
    
    // ゲームロジックからサイコロの目を取得
    const result = game.roll(isPlayer, 0);
    
    // DiceRollerを使用して演出
    const direction = isPlayer ? 'bottom' : 'top';
    
    // 皿内のサイコロを一時的に非表示
    const diceElements = isPlayer ? elements.dice.playerDice : elements.dice.cpuDice;
    diceElements.forEach(d => d.style.opacity = '0');
    
    // Dice Roller呼び出し
    return new Promise((resolve) => {
        window.onDiceRollComplete = (results, isShonben) => {
            // サイコロ演出完了
            setTimeout(() => {
                // 皿内のサイコロに結果を反映
                diceElements.forEach((dice, i) => {
                    const val = result.dice[i];
                    dice.textContent = val === 'cursed' ? '?' : val;
                    dice.style.opacity = '1';
                    
                    if (val === 'cursed') {
                        dice.classList.add('cursed');
                    } else {
                        dice.classList.remove('cursed');
                    }
                });
                
                // 役表示
                const plate = isPlayer ? elements.plates.player : elements.plates.cpu;
                const roleEl = isPlayer ? elements.roles.player : elements.roles.cpu;
                
                if (roleEl) {
                    roleEl.textContent = `${result.role.name}${result.role.value ? `(${result.role.value})` : ''}`;
                    roleEl.className = `role-display ${result.role.multiplier >= 0 ? 'positive' : 'negative'}`;
                    
                    if (result.role.multiplier !== 0 && plate) {
                        plate.classList.add('role-flash');
                        setTimeout(() => {
                            plate.classList.remove('role-flash');
                        }, 800);
                    }
                }
                
                // ションベンチェック
                if (isShonben && result.isShonben) {
                    showNotification(isPlayer ? 'プレイヤーがションベン！' : 'CPUがションベン！', 'warning');
                }
                
                // Canvas非表示
                setTimeout(() => {
                    if (window.DiceRoller) {
                        window.DiceRoller.hideCanvas();
                    }
                    resolve();
                }, 1000);
            }, 500);
        };
        
        // サイコロの目を指定して振る
        if (window.DiceRoller) {
            // 謎生物対応：cursedの場合は1に変換
            const values = result.dice.map(d => d === 'cursed' ? 1 : d);
            window.DiceRoller.rollWithValues(direction, values);
        } else {
            console.error('DiceRoller not found!');
            resolve();
        }
    });
    
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
    updateUI();
    
    setTimeout(() => {
        elements.buttons.nextMatch?.classList.remove('hidden');
    }, 1000);
}

/**
 * 次の試合へ
 */
function nextMatch() {
    elements.buttons.nextMatch?.classList.add('hidden');
    
    // 役表示をクリア
    if (elements.roles.player) elements.roles.player.textContent = '';
    if (elements.roles.cpu) elements.roles.cpu.textContent = '';
    
    // サイコロをリセット
    elements.dice.playerDice.forEach(d => {
        d.textContent = '?';
        d.classList.remove('cursed');
    });
    elements.dice.cpuDice.forEach(d => {
        d.textContent = '?';
        d.classList.remove('cursed');
    });
    
    const canContinue = game.nextMatch();
    
    if (!canContinue) {
        if (game.getState().gameStatus === 'victory') {
            showVictory();
        } else {
            showGameOver();
        }
    } else {
        updateUI();
        updateRoleTable();
        document.getElementById('betting-ui')?.classList.remove('hidden');
        document.getElementById('rolling-ui')?.classList.add('hidden');
    }
}

/**
 * ゲームオーバー表示
 */
function showGameOver() {
    const state = game.getState();
    document.getElementById('final-money').textContent = state.player.money.toLocaleString();
    showScreen('gameover');
}

/**
 * 勝利表示
 */
function showVictory() {
    const state = game.getState();
    document.getElementById('victory-money').textContent = state.player.money.toLocaleString();
    showScreen('victory');
}

/**
 * 役表更新
 */
function updateRoleTable() {
    if (!elements.roleTable) return;
    
    const state = game.getState();
    const roles = state.roleTable === 'nine' ? ROLES_NINE : ROLES_NORMAL;
    
    elements.roleTable.innerHTML = `
        <h4 class="role-table-title">${state.roleTable === 'nine' ? '9面ダイス役表' : '通常役表'}</h4>
        <div class="role-table-content">
            ${roles.map(role => `
                <div class="role-table-item">
                    <span class="role-table-name">${role.name}</span>
                    <span class="role-table-mult">${role.multiplier > 0 ? '+' : ''}${role.multiplier}倍</span>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * 通知表示
 */
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    container.appendChild(notif);
    
    setTimeout(() => {
        notif.remove();
    }, 3000);
}

/**
 * スリープ
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}