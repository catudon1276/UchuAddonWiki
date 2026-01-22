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
 * サイコロアニメーション（3D回転→確定フラッシュ→物理落下）
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
            
            // サイコロをリセット + ランダムな回転軸を設定
            rollingDice.forEach((d, idx) => {
                d.textContent = '?';
                d.className = 'rolling-dice';
                d.style.animation = ''; // アニメーションリセット
                d.dataset.locked = ''; // ロックフラグリセット
                
                // ★各サイコロに固有の回転軸を設定（CSS変数で制御）
                const rotX = 0.3 + Math.random() * 0.7;
                const rotY = 0.2 + Math.random() * 0.8;
                const rotZ = 0.1 + Math.random() * 0.5;
                d.style.setProperty('--rot-x', rotX);
                d.style.setProperty('--rot-y', rotY);
                d.style.setProperty('--rot-z', rotZ);
            });
            
            // ★改善版：段階的急減速 + 長めの演出時間
            const maxVal = state.roleTable === 'nine' ? 9 : 6;
            const totalDuration = 2200; // 2.2秒（体感を重視）
            const baseInterval = 30; // 30ms基準（滑らか）
            const slowdownPower = 4.0; // 減速の強さ（急激）
            
            let elapsed = 0;
            
            while (elapsed < totalDuration) {
                const progress = elapsed / totalDuration;
                // イージング関数：最初は超高速、後半は超スロー
                const easedProgress = 1 - Math.pow(1 - progress, slowdownPower);
                const currentInterval = baseInterval + (easedProgress * 200); // 最大230msまで遅延
                
                // 確定タイミング（最後の800msで順次確定、間隔を広く）
                const timeToEnd = totalDuration - elapsed;
                const confirmThresholds = [800, 500, 250]; // 各サイコロの確定タイミング（ms）
                
                rollingDice.forEach((d, idx) => {
                    if (timeToEnd <= confirmThresholds[idx]) {
                        // ★確定状態（1回だけlockedクラス追加）
                        if (!d.dataset.locked) {
                            const val = result.dice[idx];
                            d.textContent = val === 'cursed' ? '?' : val;
                            const isOne = val === 1;
                            const isCursed = val === 'cursed';
                            d.className = `rolling-dice locked ${isOne ? 'one' : ''} ${isCursed ? 'cursed' : ''}`;
                            d.dataset.locked = 'true';
                        }
                    } else {
                        // ランダム回転中
                        const randVal = Math.floor(Math.random() * maxVal) + 1;
                        d.textContent = randVal;
                        d.className = `rolling-dice ${randVal === 1 ? 'one' : ''}`;
                    }
                });
                
                await sleep(currentInterval);
                elapsed += currentInterval;
            }
            
            // 全サイコロ確定表示（念のため）
            rollingDice.forEach((d, idx) => {
                const val = result.dice[idx];
                d.textContent = val === 'cursed' ? '?' : val;
                d.className = `rolling-dice locked ${val === 1 ? 'one' : ''} ${val === 'cursed' ? 'cursed' : ''}`;
            });
            
            // 確定後の間
            await sleep(500);
            
            // 物理的な落下アニメーション（順次）
            rollingDice.forEach((d, idx) => {
                setTimeout(() => {
                    d.classList.remove('locked');
                    d.classList.add('dropping');
                }, idx * 150); // 0ms, 150ms, 300ms
            });
            
            // 落下完了まで待機
            await sleep(900);
            
            // オーバーレイを非表示
            overlay.classList.add('hidden');
            
            // サイコロをリセット
            rollingDice.forEach(d => {
                d.className = 'rolling-dice';
                d.style.animation = '';
            });
        }
        
        // 皿内のサイコロに結果を反映（バウンド演出強化）
        const diceElements = isPlayer ? elements.dice.playerDice : elements.dice.cpuDice;
        diceElements.forEach((el, i) => {
            const val = result.dice[i];
            
            // 初期状態：透明 + 小さく
            el.style.opacity = '0';
            el.style.transform = 'scale(0.3) translateY(-20px)';
            el.classList.remove('landing'); // 前回のアニメーションをクリア
            
            // 順次表示（着地バウンドアニメーション）
            setTimeout(() => {
                el.textContent = val === 'cursed' ? '?' : val;
                el.className = `dice landing ${val === 1 ? 'one' : ''} ${val === 'cursed' ? 'cursed' : ''}`;
                
                // バウンドアニメーションはCSSで制御
                el.style.transition = 'none'; // CSS animationに任せる
                el.style.opacity = '1';
                el.style.transform = 'scale(1) translateY(0)';
                
                // アニメーション終了後にlandingクラスを削除
                setTimeout(() => {
                    el.classList.remove('landing');
                }, 600);
            }, i * 150 + 100); // 150ms間隔 + 初期遅延100ms
        });
        
        await sleep(500);
        
        // ションベンアニメーション
        if (result.isShonben) {
            const plate = isPlayer ? elements.plates.player : elements.plates.cpu;
            plate?.classList.add('shonben');
            await sleep(500);
            showNotification('ションベン！', who);
        }
        
        // 役表示
        const roleEl = isPlayer ? elements.roles.player : elements.roles.cpu;
        const plate = isPlayer ? elements.plates.player : elements.plates.cpu;
        
        if (roleEl) {
            roleEl.textContent = `${result.role.name}${result.role.value ? `(${result.role.value})` : ''}`;
            roleEl.className = `role-display ${result.role.multiplier >= 0 ? 'positive' : 'negative'}`;
            
            // ★役成立時に皿を光らせる（CSS animationベース）
            if (result.role.multiplier !== 0 && plate) {
                plate.classList.add('role-flash');
                
                // 役の倍率に応じて光の色を変える
                if (result.role.multiplier > 0) {
                    plate.style.setProperty('--flash-color', '212, 175, 55'); // ゴールド
                } else {
                    plate.style.setProperty('--flash-color', '196, 30, 58'); // 赤
                }
                
                // アニメーション終了後にクラスを削除
                setTimeout(() => {
                    plate.classList.remove('role-flash');
                }, 800);
            }
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