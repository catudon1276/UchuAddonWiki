/**
 * UI制御モジュール - 3D立体サイコロ対応版
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
    initDiceElements(); // 3Dサイコロ要素を初期化
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
    };
    
    elements.roleTable = document.getElementById('role-table');
}

/**
 * 3Dサイコロ要素を初期化
 */
function initDiceElements() {
    // 皿内の3Dサイコロを生成
    const playerContainer = document.querySelector('.player-dice');
    const cpuContainer = document.querySelector('.cpu-dice');
    
    playerContainer.innerHTML = '';
    cpuContainer.innerHTML = '';
    
    for (let i = 0; i < 3; i++) {
        playerContainer.appendChild(create3DDice(i));
        cpuContainer.appendChild(create3DDice(i));
    }
    
    // 演出用の大きい3Dサイコロを生成
    const rollingContainer = document.querySelector('.rolling-dice-container');
    rollingContainer.innerHTML = '';
    
    for (let i = 0; i < 3; i++) {
        const bigDice = create3DDice(i, true);
        bigDice.id = `rolling-dice-${i}`;
        rollingContainer.appendChild(bigDice);
    }
    
    // DOM要素を再キャッシュ
    elements.dice = {
        playerDice: Array.from(document.querySelectorAll('.player-dice .dice')),
        cpuDice: Array.from(document.querySelectorAll('.cpu-dice .dice')),
    };
    
    elements.rollingDice = [
        document.getElementById('rolling-dice-0'),
        document.getElementById('rolling-dice-1'),
        document.getElementById('rolling-dice-2'),
    ];
}

/**
 * 3Dサイコロ要素を作成
 * @param {number} index - サイコロのインデックス
 * @param {boolean} isBig - 大きいサイコロか
 */
function create3DDice(index, isBig = false) {
    const dice = document.createElement('div');
    dice.className = isBig ? 'rolling-dice' : 'dice';
    dice.dataset.value = '?';
    
    // 6面を作成
    for (let i = 1; i <= 6; i++) {
        const face = document.createElement('div');
        face.className = isBig ? 'rolling-dice-face' : 'dice-face';
        face.classList.add(getFaceClass(i));
        face.textContent = i;
        face.dataset.faceValue = i;
        dice.appendChild(face);
    }
    
    return dice;
}

/**
 * 面のクラス名を取得
 */
function getFaceClass(value) {
    const classes = ['', 'front', 'back', 'right', 'left', 'top', 'bottom'];
    return classes[value] || 'front';
}

/**
 * 3Dサイコロの回転を設定（指定した面を上に）
 * @param {HTMLElement} dice - サイコロ要素
 * @param {number|string} value - 表示する値（1-6 or 'cursed'）
 */
function setDiceRotation(dice, value) {
    if (value === 'cursed' || value === '?') {
        // 謎生物の場合は特殊な回転
        dice.style.transform = 'rotateX(-20deg) rotateY(30deg)';
        dice.querySelectorAll('.dice-face, .rolling-dice-face').forEach(face => {
            if (face.textContent !== '?') {
                face.textContent = '?';
                face.classList.add('cursed');
            }
        });
        return;
    }
    
    // 各面の回転角度（上から見たときにその面が見えるように）
    const rotations = {
        1: 'rotateX(-20deg) rotateY(30deg)',  // 正面
        2: 'rotateX(-20deg) rotateY(-150deg)', // 裏面
        3: 'rotateX(-20deg) rotateY(-60deg)',  // 右面
        4: 'rotateX(-20deg) rotateY(120deg)',  // 左面
        5: 'rotateX(-110deg) rotateY(30deg)',  // 上面
        6: 'rotateX(70deg) rotateY(30deg)',    // 下面
    };
    
    dice.style.transform = rotations[value] || rotations[1];
    
    // 1の目は赤色に
    dice.querySelectorAll('.dice-face, .rolling-dice-face').forEach(face => {
        face.classList.remove('one', 'cursed');
        if (face.dataset.faceValue == 1) {
            face.classList.add('one');
        }
    });
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
}

/**
 * 画面切り替え
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
    showScreen('game');
    updateUI();
    updateRoleTable();
}

/**
 * UI更新
 */
function updateUI() {
    const state = game.getState();
    const phase = game.getCurrentPhase();
    
    if (elements.ui.playerMoney) {
        elements.ui.playerMoney.textContent = state.player.money.toLocaleString();
    }
    if (elements.ui.cpuMoney) {
        elements.ui.cpuMoney.textContent = state.cpu.money.toLocaleString();
    }
    if (elements.ui.currentMatch) {
        elements.ui.currentMatch.textContent = state.currentMatch;
    }
    if (elements.ui.totalMatches) {
        elements.ui.totalMatches.textContent = state.totalMatches;
    }
    if (elements.ui.phaseName) {
        elements.ui.phaseName.textContent = phase.name;
    }
}

/**
 * 役表を更新
 */
function updateRoleTable() {
    const state = game.getState();
    const roles = state.roleTable === 'nine' ? ROLES_NINE : ROLES_NORMAL;
    
    let html = '<div class="role-table-title">役表</div>';
    
    Object.values(roles).forEach(role => {
        if (role.id === 'noRole' || role.id === 'shonben') return;
        
        const multiplierClass = role.multiplier >= 0 ? 'positive' : 'negative';
        html += `
            <div class="role-item">
                <span class="role-name">${role.name}</span>
                <span class="role-multiplier ${multiplierClass}">
                    ${role.multiplier > 0 ? '+' : ''}${role.multiplier}倍
                </span>
            </div>
        `;
    });
    
    html += `
        <div class="role-item">
            <span class="role-name">${roles.noRole.name}</span>
            <span class="role-multiplier negative">${roles.noRole.multiplier}倍</span>
        </div>
        <div class="role-item">
            <span class="role-name">${roles.shonben.name}</span>
            <span class="role-multiplier negative">${roles.shonben.multiplier}倍</span>
        </div>
    `;
    
    elements.roleTable.innerHTML = html;
}

/**
 * 賭け金表示を更新
 */
function updateBetDisplay() {
    const value = elements.ui.betSlider?.value || 1000;
    if (elements.ui.betDisplay) {
        elements.ui.betDisplay.textContent = parseInt(value).toLocaleString();
    }
}

/**
 * 賭け金確定
 */
function confirmBet() {
    const amount = parseInt(elements.ui.betSlider?.value || 100);
    game.setBet(amount);
    showCheatSelection();
}

/**
 * イカサマ選択UI表示
 */
function showCheatSelection() {
    const cheats = game.getAvailableCheatsForPlayer();
    const state = game.getState();
    
    if (cheats.length === 0) {
        selectCheat(null);
        return;
    }
    
    if (!elements.cheats.container || !elements.cheats.list) return;
    
    elements.cheats.container.classList.remove('hidden');
    
    let html = '';
    cheats.forEach(cheat => {
        const cost = Math.floor(state.betAmount * cheat.costRate);
        const canAfford = state.player.money >= cost;
        const typeClass = cheat.type === 'attack' ? 'attack' : cheat.type === 'defense' ? 'defense' : 'buff';
        
        html += `
            <button class="cheat-btn ${typeClass} ${canAfford ? '' : 'disabled'}" 
                    data-cheat="${cheat.id}" 
                    ${canAfford ? '' : 'disabled'}>
                <span class="cheat-name">${cheat.name}</span>
                <span class="cheat-desc">${cheat.description}</span>
                <span class="cheat-cost">コスト: ${cost.toLocaleString()}円</span>
            </button>
        `;
    });
    
    elements.cheats.list.innerHTML = html;
    
    elements.cheats.list.querySelectorAll('.cheat-btn:not(.disabled)').forEach(btn => {
        btn.addEventListener('click', () => selectCheat(btn.dataset.cheat));
    });
}

/**
 * イカサマ選択
 */
function selectCheat(cheatId) {
    game.selectCheat(cheatId);
    elements.cheats.container?.classList.add('hidden');
    
    const state = game.getState();
    if (state.playerCheat) {
        showNotification(`イカサマ発動: ${state.playerCheat.name}`, 'player');
    }
    if (state.cpuCheat) {
        setTimeout(() => {
            showNotification(`CPUのイカサマ: ${state.cpuCheat.name}`, 'cpu');
        }, 500);
    }
    
    showRollUI();
}

/**
 * サイコロUI表示
 */
function showRollUI() {
    document.getElementById('betting-ui')?.classList.add('hidden');
    document.getElementById('rolling-ui')?.classList.remove('hidden');
    elements.buttons.roll?.classList.remove('hidden');
}

/**
 * サイコロを振る
 */
async function rollDice() {
    if (isAnimating) return;
    isAnimating = true;
    
    elements.buttons.roll?.classList.add('hidden');
    
    // CPUから振る
    await animateRoll('cpu');
    await sleep(500);
    
    // プレイヤーが振る
    await animateRoll('player');
    
    // 結果表示
    game.finalizeMatch();
    showMatchResult();
    
    isAnimating = false;
}

/**
 * サイコロアニメーション（3D版）
 */
async function animateRoll(who) {
    const state = game.getState();
    const isPlayer = who === 'player';
    
    let result;
    let retryCount = 0;
    
    do {
        result = game.roll(isPlayer, retryCount);
        
        // 大きいサイコロ演出
        const overlay = document.getElementById('dice-animation-overlay');
        
        if (overlay && elements.rollingDice[0]) {
            overlay.classList.remove('hidden');
            
            // ランダムな回転軸を設定
            elements.rollingDice.forEach((dice, idx) => {
                dice.dataset.locked = '';
                const rotX = 0.3 + Math.random() * 0.7;
                const rotY = 0.2 + Math.random() * 0.8;
                const rotZ = 0.1 + Math.random() * 0.5;
                dice.style.setProperty('--rot-x', rotX);
                dice.style.setProperty('--rot-y', rotY);
                dice.style.setProperty('--rot-z', rotZ);
            });
            
            // 高速回転演出
            const totalDuration = 2200;
            const baseInterval = 30;
            const slowdownPower = 4.0;
            
            let elapsed = 0;
            
            while (elapsed < totalDuration) {
                const progress = elapsed / totalDuration;
                const easedProgress = 1 - Math.pow(1 - progress, slowdownPower);
                const currentInterval = baseInterval + (easedProgress * 200);
                
                const timeToEnd = totalDuration - elapsed;
                const confirmThresholds = [800, 500, 250];
                
                elements.rollingDice.forEach((dice, idx) => {
                    if (timeToEnd <= confirmThresholds[idx]) {
                        if (!dice.dataset.locked) {
                            const val = result.dice[idx];
                            setDiceRotation(dice, val);
                            dice.classList.add('locked');
                            dice.dataset.locked = 'true';
                        }
                    } else {
                        // ランダム回転中
                        const maxVal = state.roleTable === 'nine' ? 9 : 6;
                        const randVal = Math.floor(Math.random() * maxVal) + 1;
                        setDiceRotation(dice, randVal);
                        dice.classList.remove('locked');
                    }
                });
                
                await sleep(currentInterval);
                elapsed += currentInterval;
            }
            
            // 最終確定
            elements.rollingDice.forEach((dice, idx) => {
                const val = result.dice[idx];
                setDiceRotation(dice, val);
                dice.classList.add('locked');
            });
            
            await sleep(500);
            
            // 落下アニメーション
            elements.rollingDice.forEach((dice, idx) => {
                setTimeout(() => {
                    dice.classList.remove('locked');
                    dice.classList.add('dropping');
                }, idx * 150);
            });
            
            await sleep(900);
            overlay.classList.add('hidden');
            
            elements.rollingDice.forEach(dice => {
                dice.classList.remove('dropping', 'locked');
            });
        }
        
        // 皿内のサイコロに結果を反映
        const diceElements = isPlayer ? elements.dice.playerDice : elements.dice.cpuDice;
        diceElements.forEach((dice, i) => {
            const val = result.dice[i];
            
            dice.style.opacity = '0';
            
            setTimeout(() => {
                setDiceRotation(dice, val);
                dice.classList.add('landing');
                dice.style.opacity = '1';
                
                setTimeout(() => {
                    dice.classList.remove('landing');
                }, 600);
            }, i * 150 + 100);
        });
        
        await sleep(500);
        
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
        
        // 振り直し判定（略）
        break;
    } while (true);
    
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
 * 通知表示
 */
function showNotification(message, type = 'player') {
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