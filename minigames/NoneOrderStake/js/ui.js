/**
 * UI制御モジュール
 */

import { createGame } from './game.js';
import { generateRollFrames, diceToString } from './dice.js';
import { CHEATS, getAvailableCheats } from '../data/cheats-data.js';
import { ROLES_NORMAL } from '../data/roles-normal.js';
import { ROLES_NINE } from '../data/roles-nine.js';

let game = null;
let isAnimating = false;

/**
 * DOM要素キャッシュ
 */
const elements = {};

/**
 * 初期化
 */
export function initUI() {
    cacheElements();
    game = createGame();
    setupEventListeners();
    showScreen('title');
}

/**
 * DOM要素をキャッシュ
 */
function cacheElements() {
    elements.screens = {
        title: document.getElementById('screen-title'),
        game: document.getElementById('screen-game'),
        result: document.getElementById('screen-result'),
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
        betAmount: document.getElementById('bet-amount'),
        betSlider: document.getElementById('bet-slider'),
        betDisplay: document.getElementById('bet-display'),
    };
    
    elements.dice = {
        playerDice: document.querySelectorAll('.player-dice .dice'),
        cpuDice: document.querySelectorAll('.cpu-dice .dice'),
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
        retry: document.getElementById('btn-retry'),
    };
    
    elements.roleTable = document.getElementById('role-table');
}

/**
 * イベントリスナー設定
 */
function setupEventListeners() {
    // タイトル画面
    elements.buttons.start?.addEventListener('click', startGame);
    
    // 賭け金スライダー
    elements.ui.betSlider?.addEventListener('input', updateBetDisplay);
    
    // 賭け金確定
    elements.buttons.confirmBet?.addEventListener('click', confirmBet);
    
    // イカサマスキップ
    elements.buttons.skipCheat?.addEventListener('click', () => selectCheat(null));
    
    // サイコロを振る
    elements.buttons.roll?.addEventListener('click', rollDice);
    
    // 次の試合
    elements.buttons.nextMatch?.addEventListener('click', nextMatch);
    
    // リトライ
    elements.buttons.retry?.addEventListener('click', () => {
        game.reset();
        startGame();
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
}

/**
 * UI更新
 */
function updateUI() {
    const state = game.getState();
    const phase = game.getCurrentPhase();
    
    // 所持金
    if (elements.ui.playerMoney) {
        elements.ui.playerMoney.textContent = state.player.money.toLocaleString();
    }
    if (elements.ui.cpuMoney) {
        elements.ui.cpuMoney.textContent = state.cpu.money.toLocaleString();
    }
    
    // 試合情報
    if (elements.ui.currentMatch) {
        elements.ui.currentMatch.textContent = state.currentMatch;
    }
    if (elements.ui.totalMatches) {
        elements.ui.totalMatches.textContent = state.totalMatches;
    }
    if (elements.ui.phaseName) {
        elements.ui.phaseName.textContent = phase.name;
    }
    
    // 賭け金スライダー
    if (elements.ui.betSlider) {
        elements.ui.betSlider.max = state.player.money;
        elements.ui.betSlider.value = Math.min(elements.ui.betSlider.value, state.player.money);
    }
    
    updateBetDisplay();
    updateRoleTable();
}

/**
 * 賭け金表示更新
 */
function updateBetDisplay() {
    const value = elements.ui.betSlider?.value || 0;
    if (elements.ui.betDisplay) {
        elements.ui.betDisplay.textContent = parseInt(value).toLocaleString();
    }
}

/**
 * 役表更新
 */
function updateRoleTable() {
    const state = game.getState();
    const roles = state.roleTable === 'nine' ? ROLES_NINE : ROLES_NORMAL;
    
    if (!elements.roleTable) return;
    
    let html = `<h3>${roles.name}</h3><div class="role-list">`;
    
    roles.roles.forEach(role => {
        const multiplierClass = role.multiplier > 0 ? 'positive' : 'negative';
        html += `
            <div class="role-item">
                <span class="role-name">${role.name}</span>
                <span class="role-multiplier ${multiplierClass}">
                    ${role.multiplier > 0 ? '+' : ''}${role.multiplier}倍
                </span>
            </div>
        `;
    });
    
    // 特殊役
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
    
    html += '</div>';
    elements.roleTable.innerHTML = html;
}

/**
 * 賭け金確定
 */
function confirmBet() {
    const amount = parseInt(elements.ui.betSlider?.value || 100);
    game.setBet(amount);
    
    // イカサマ選択UI表示
    showCheatSelection();
}

/**
 * イカサマ選択UI表示
 */
function showCheatSelection() {
    const cheats = game.getAvailableCheatsForPlayer();
    const state = game.getState();
    
    if (cheats.length === 0) {
        // イカサマ不可のフェーズ
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
    
    // イベントリスナー追加
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
    
    // イカサマ使用通知
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
    
    // CPUから振る（親）
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
 * サイコロアニメーション（大きいサイコロ→皿に落ちる演出）
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
        const rollingDice = [
            document.getElementById('rolling-dice-0'),
            document.getElementById('rolling-dice-1'),
            document.getElementById('rolling-dice-2')
        ];
        
        if (overlay && rollingDice[0]) {
            overlay.classList.remove('hidden');
            
            // サイコロを?にリセット
            rollingDice.forEach(d => {
                d.textContent = '?';
                d.className = 'rolling-dice';
            });
            
            // 高速で数字を切り替える演出
            const maxVal = state.roleTable === 'nine' ? 9 : 6;
            const spinDuration = 1200; // 1.2秒
            const spinInterval = 60; // 60msごとに更新
            const spinCount = spinDuration / spinInterval;
            
            for (let i = 0; i < spinCount; i++) {
                // 徐々に遅くなる
                const slowdown = Math.pow(i / spinCount, 2);
                const delay = spinInterval + (slowdown * 100);
                
                // 最後の数フレームで確定していく
                const finalFrames = 5;
                const remainingFrames = spinCount - i;
                
                rollingDice.forEach((d, idx) => {
                    if (remainingFrames <= finalFrames - idx) {
                        // 確定
                        const val = result.dice[idx];
                        d.textContent = val === 'cursed' ? '?' : val;
                        d.className = `rolling-dice ${val === 1 ? 'one' : ''} ${val === 'cursed' ? 'cursed' : ''}`;
                    } else {
                        // ランダム
                        const randVal = Math.floor(Math.random() * maxVal) + 1;
                        d.textContent = randVal;
                        d.className = `rolling-dice ${randVal === 1 ? 'one' : ''}`;
                    }
                });
                
                await sleep(delay);
            }
            
            // 全部確定表示
            rollingDice.forEach((d, idx) => {
                const val = result.dice[idx];
                d.textContent = val === 'cursed' ? '?' : val;
                d.className = `rolling-dice ${val === 1 ? 'one' : ''} ${val === 'cursed' ? 'cursed' : ''}`;
            });
            
            await sleep(400);
            
            // 落下アニメーション
            rollingDice.forEach((d, idx) => {
                setTimeout(() => {
                    d.classList.add('settling');
                }, idx * 100);
            });
            
            await sleep(500);
            
            // オーバーレイを非表示
            overlay.classList.add('hidden');
            
            // サイコロをリセット
            rollingDice.forEach(d => {
                d.classList.remove('settling');
            });
        }
        
        // 皿内のサイコロに結果を反映
        const diceElements = isPlayer ? elements.dice.playerDice : elements.dice.cpuDice;
        diceElements.forEach((el, i) => {
            const val = result.dice[i];
            el.textContent = val === 'cursed' ? '?' : val;
            el.className = `dice ${val === 1 ? 'one' : ''} ${val === 'cursed' ? 'cursed' : ''}`;
        });
        
        // ションベンアニメーション
        if (result.isShonben) {
            const plate = isPlayer ? elements.plates.player : elements.plates.cpu;
            plate?.classList.add('shonben');
            await sleep(500);
            showNotification('ションベン！', who);
        }
        
        // 役表示
        const roleEl = isPlayer ? elements.roles.player : elements.roles.cpu;
        if (roleEl) {
            roleEl.textContent = `${result.role.name}${result.role.value ? `(${result.role.value})` : ''}`;
            roleEl.className = `role-display ${result.role.multiplier >= 0 ? 'positive' : 'negative'}`;
        }
        
        // 振り直し判定（CPU）
        if (!isPlayer && result.canRetry) {
            const cpu = game.cpuInstance;
            if (cpu.shouldReroll(result.role, result.retriesLeft, state)) {
                retryCount++;
                showNotification('CPUが振り直し...', 'cpu');
                await sleep(800);
                continue;
            }
        }
        
        // 振り直し判定（プレイヤー）
        if (isPlayer && result.canRetry) {
            const shouldRetry = await askRetry(result.retriesLeft);
            if (shouldRetry) {
                retryCount++;
                continue;
            }
        }
        
        break;
    } while (true);
    
    // 役を確定
    if (isPlayer) {
        game.state.playerRole = result.role;
    } else {
        game.state.cpuRole = result.role;
    }
}

/**
 * 振り直し確認
 */
function askRetry(retriesLeft) {
    return new Promise(resolve => {
        const modal = document.getElementById('retry-modal');
        const yesBtn = document.getElementById('retry-yes');
        const noBtn = document.getElementById('retry-no');
        const countEl = document.getElementById('retry-count');
        
        if (!modal) {
            resolve(false);
            return;
        }
        
        countEl.textContent = retriesLeft;
        modal.classList.remove('hidden');
        
        const handleYes = () => {
            modal.classList.add('hidden');
            yesBtn.removeEventListener('click', handleYes);
            noBtn.removeEventListener('click', handleNo);
            resolve(true);
        };
        
        const handleNo = () => {
            modal.classList.add('hidden');
            yesBtn.removeEventListener('click', handleYes);
            noBtn.removeEventListener('click', handleNo);
            resolve(false);
        };
        
        yesBtn.addEventListener('click', handleYes);
        noBtn.addEventListener('click', handleNo);
    });
}

/**
 * 試合結果表示
 */
function showMatchResult() {
    const state = game.getState();
    
    const resultPanel = document.getElementById('match-result');
    if (!resultPanel) return;
    
    const winnerText = state.winner === 'player' ? 'WIN!' : 'LOSE...';
    const winnerClass = state.winner === 'player' ? 'win' : 'lose';
    const payout = game.calculatePayout();
    const sign = state.winner === 'player' ? '+' : '-';
    
    resultPanel.innerHTML = `
        <div class="result-content ${winnerClass}">
            <h2>${winnerText}</h2>
            <div class="result-detail">
                <p>配当: ${sign}${payout.toLocaleString()}円 (×${state.payoutMultiplier})</p>
            </div>
        </div>
    `;
    resultPanel.classList.remove('hidden');
    
    elements.buttons.nextMatch?.classList.remove('hidden');
    
    updateUI();
}

/**
 * 次の試合
 */
function nextMatch() {
    const canContinue = game.nextMatch();
    
    document.getElementById('match-result')?.classList.add('hidden');
    elements.buttons.nextMatch?.classList.add('hidden');
    document.getElementById('rolling-ui')?.classList.add('hidden');
    document.getElementById('betting-ui')?.classList.remove('hidden');
    
    // 皿リセット
    elements.plates.player?.classList.remove('shonben');
    elements.plates.cpu?.classList.remove('shonben');
    
    // サイコロリセット
    elements.dice.playerDice?.forEach(el => {
        el.textContent = '?';
        el.className = 'dice';
    });
    elements.dice.cpuDice?.forEach(el => {
        el.textContent = '?';
        el.className = 'dice';
    });
    
    // 役表示リセット
    if (elements.roles.player) elements.roles.player.textContent = '';
    if (elements.roles.cpu) elements.roles.cpu.textContent = '';
    
    if (!canContinue) {
        const state = game.getState();
        if (state.gameStatus === 'victory') {
            showVictoryScreen();
        } else {
            showGameOverScreen();
        }
        return;
    }
    
    updateUI();
}

/**
 * 勝利画面
 */
function showVictoryScreen() {
    const state = game.getState();
    const el = document.getElementById('victory-money');
    if (el) el.textContent = state.player.money.toLocaleString();
    showScreen('victory');
}

/**
 * ゲームオーバー画面
 */
function showGameOverScreen() {
    const state = game.getState();
    const el = document.getElementById('final-money');
    if (el) el.textContent = state.player.money.toLocaleString();
    showScreen('gameover');
}

/**
 * 通知表示
 */
function showNotification(message, type = 'info') {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

/**
 * スリープ
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// エクスポート
export { game };