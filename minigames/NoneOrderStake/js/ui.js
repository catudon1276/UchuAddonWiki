/**
 * UI Manager - ui.js
 * ES Modules形式
 */

import { getRoleTable } from './roles.js';

// DOM要素キャッシュ
const el = {};

function cacheElements() {
    // 画面
    el.titleScreen = document.getElementById('title-screen');
    el.gameScreen = document.getElementById('game-screen');
    el.resultScreen = document.getElementById('result-screen');

    // ヘッダー
    el.rankBtn = document.getElementById('rank-btn');
    el.drawBtn = document.getElementById('draw-btn');
    el.matchNum = document.getElementById('match-num');
    el.diceMode = document.getElementById('dice-mode');

    // プレイヤー
    el.playerBox = document.getElementById('player-box');
    el.playerMoney = document.getElementById('player-money');
    el.playerBet = document.getElementById('player-bet');
    el.playerDice = document.getElementById('player-dice');
    el.playerRole = document.getElementById('player-role');
    el.playerHand = document.getElementById('player-hand');

    // CPU
    el.cpuBox = document.getElementById('cpu-box');
    el.cpuMoney = document.getElementById('cpu-money');
    el.cpuBet = document.getElementById('cpu-bet');
    el.cpuDice = document.getElementById('cpu-dice');
    el.cpuRole = document.getElementById('cpu-role');
    el.cpuHand = document.getElementById('cpu-hand');

    // 中央
    el.deckCount = document.getElementById('deck-count');
    el.actionBtn = document.getElementById('action-btn');
    el.skipBtn = document.getElementById('skip-btn');

    // 役表
    el.rankPanel = document.getElementById('rank-panel');
    el.rankOverlay = document.getElementById('rank-overlay');
    el.rankClose = document.getElementById('rank-close');
    el.rankMode = document.getElementById('rank-mode');
    el.rankList = document.getElementById('rank-list');

    // モーダル
    el.betModal = document.getElementById('bet-modal');
    el.betSlider = document.getElementById('bet-slider');
    el.betValue = document.getElementById('bet-value');
    el.betConfirm = document.getElementById('bet-confirm');

    el.cardModal = document.getElementById('card-modal');
    el.cardModalTitle = document.getElementById('card-modal-title');
    el.cardModalDesc = document.getElementById('card-modal-desc');
    el.cardUseBtn = document.getElementById('card-use-btn');
    el.cardCancelBtn = document.getElementById('card-cancel-btn');

    el.matchModal = document.getElementById('match-modal');
    el.matchResultTitle = document.getElementById('match-result-title');
    el.matchPlayerRole = document.getElementById('match-player-role');
    el.matchCpuRole = document.getElementById('match-cpu-role');
    el.matchPayout = document.getElementById('match-payout');
    el.nextMatchBtn = document.getElementById('next-match-btn');

    // クイックビュー
    el.quickView = document.getElementById('quick-view');
    el.quickTitle = document.getElementById('quick-title');
    el.quickDesc = document.getElementById('quick-desc');

    // 結果画面
    el.resultTitle = document.getElementById('result-title');
    el.resultMoney = document.getElementById('result-money');
    el.restartBtn = document.getElementById('restart-btn');
    el.startCpuBtn = document.getElementById('start-cpu-btn');
}

// ===========================================
// 画面切り替え
// ===========================================
export function showScreen(name) {
    el.titleScreen?.classList.add('hidden');
    el.gameScreen?.classList.add('hidden');
    el.resultScreen?.classList.add('hidden');

    if (name === 'title') el.titleScreen?.classList.remove('hidden');
    if (name === 'game') el.gameScreen?.classList.remove('hidden');
    if (name === 'result') el.resultScreen?.classList.remove('hidden');
}

// ===========================================
// ゲーム情報更新
// ===========================================
export function updateGameInfo(state) {
    if (el.matchNum) {
        el.matchNum.textContent = `${state.currentMatch}/${state.totalMatches}`;
    }
    if (el.diceMode) {
        el.diceMode.textContent = state.diceMode === 'nine' ? '九星賽' : '通常賽';
    }
    if (el.deckCount) {
        el.deckCount.textContent = state.deck?.length || 0;
    }
}

// ===========================================
// プレイヤー情報更新
// ===========================================
export function updatePlayerInfo(player, playerId) {
    const prefix = playerId === 'player' ? 'player' : 'cpu';

    // 所持金
    const moneyEl = el[`${prefix}Money`];
    if (moneyEl) {
        if (playerId === 'cpu' && player.money > 1000000) {
            moneyEl.textContent = '¥∞';
        } else {
            moneyEl.textContent = '¥' + player.money.toLocaleString();
        }
    }

    // 掛け金
    const betEl = el[`${prefix}Bet`];
    if (betEl) {
        betEl.textContent = '¥' + (player.currentBet || 0).toLocaleString();
    }

    // ダイス
    const diceEl = el[`${prefix}Dice`];
    if (diceEl) {
        const dice = diceEl.querySelectorAll('.die');
        player.currentDice?.forEach((v, i) => {
            if (dice[i]) {
                dice[i].textContent = v || '?';
                dice[i].classList.toggle('one', v === 1);
            }
        });
    }

    // 役
    const roleEl = el[`${prefix}Role`];
    if (roleEl) {
        roleEl.textContent = player.currentRole?.name || '-';
    }

    // 手札
    renderHand(player, playerId);
}

// ===========================================
// 手札レンダリング
// ===========================================
// カード使用コールバック（main.jsから設定される）
let onCardUseCallback = null;

export function setOnCardUse(callback) {
    onCardUseCallback = callback;
}

function renderHand(player, playerId) {
    const handEl = el[playerId === 'player' ? 'playerHand' : 'cpuHand'];
    if (!handEl) return;

    handEl.innerHTML = '';

    if (playerId === 'cpu') {
        // CPUは裏向き
        for (let i = 0; i < player.hand.length; i++) {
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            cardEl.innerHTML = '<div class="card-back"></div>';
            handEl.appendChild(cardEl);
        }
    } else {
        // プレイヤーは表向き
        player.hand.forEach((card, index) => {
            const cardEl = createCardElement(card, index);
            handEl.appendChild(cardEl);
        });
    }
}

function createCardElement(card, index) {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.dataset.index = index;

    const front = document.createElement('div');
    front.className = `card-front ${card.color || 'blue'}`;

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = card.name;
    front.appendChild(title);

    cardEl.appendChild(front);

    // クリック → モーダル表示
    cardEl.addEventListener('click', () => showCardModal(card, index));

    // ホバー → クイックビュー
    cardEl.addEventListener('mouseenter', (e) => showQuickView(e, card));
    cardEl.addEventListener('mousemove', (e) => moveQuickView(e));
    cardEl.addEventListener('mouseleave', () => hideQuickView());

    return cardEl;
}

// ===========================================
// クイックビュー
// ===========================================
function showQuickView(e, card) {
    if (el.quickTitle) el.quickTitle.textContent = card.name;
    if (el.quickDesc) el.quickDesc.textContent = card.description;
    if (el.quickView) {
        el.quickView.style.display = 'block';
        moveQuickView(e);
    }
}

function moveQuickView(e) {
    const container = document.querySelector('.game-container');
    if (!container || !el.quickView) return;

    const rect = container.getBoundingClientRect();
    let x = e.clientX - rect.left + 15;
    let y = e.clientY - rect.top - 80;

    if (x + 180 > rect.width) x = e.clientX - rect.left - 195;
    if (y < 0) y = 10;

    el.quickView.style.left = x + 'px';
    el.quickView.style.top = y + 'px';
}

function hideQuickView() {
    if (el.quickView) el.quickView.style.display = 'none';
}

// ===========================================
// カードモーダル
// ===========================================
let selectedCardIndex = -1;
let selectedCard = null;

function showCardModal(card, index) {
    selectedCard = card;
    selectedCardIndex = index;

    if (el.cardModalTitle) el.cardModalTitle.textContent = card.name;
    if (el.cardModalDesc) el.cardModalDesc.textContent = card.description;
    if (el.cardModal) el.cardModal.classList.remove('hidden');

    // 使用ボタン
    if (el.cardUseBtn) {
        el.cardUseBtn.onclick = () => {
            hideCardModal();
            if (onCardUseCallback) {
                onCardUseCallback(index);
            }
        };
    }
}

export function hideCardModal() {
    if (el.cardModal) el.cardModal.classList.add('hidden');
    selectedCardIndex = -1;
    selectedCard = null;
}

// ===========================================
// ベットモーダル
// ===========================================
export function showBetModal(maxBet, onConfirm) {
    if (el.betSlider) {
        el.betSlider.max = maxBet;
        el.betSlider.min = 100;
        el.betSlider.value = Math.min(1000, maxBet);
    }
    if (el.betValue) {
        el.betValue.textContent = parseInt(el.betSlider?.value || 1000).toLocaleString();
    }
    if (el.betModal) el.betModal.classList.remove('hidden');

    if (el.betSlider) {
        el.betSlider.oninput = () => {
            if (el.betValue) {
                el.betValue.textContent = parseInt(el.betSlider.value).toLocaleString();
            }
        };
    }

    if (el.betConfirm) {
        el.betConfirm.onclick = () => {
            const amount = parseInt(el.betSlider?.value || 1000);
            if (el.betModal) el.betModal.classList.add('hidden');
            onConfirm(amount);
        };
    }
}

// ===========================================
// アクションボタン
// ===========================================
export function setActionButton(text, onClick) {
    if (el.actionBtn) {
        el.actionBtn.textContent = text;
        el.actionBtn.onclick = onClick;
    }
}

export function showActionButton() {
    if (el.actionBtn) el.actionBtn.classList.remove('hidden');
}

export function hideActionButton() {
    if (el.actionBtn) el.actionBtn.classList.add('hidden');
}

// ===========================================
// スキップボタン
// ===========================================
export function showSkipButton(text, onClick) {
    if (el.skipBtn) {
        el.skipBtn.textContent = text;
        el.skipBtn.classList.remove('hidden');
        el.skipBtn.onclick = onClick;
    }
}

export function hideSkipButton() {
    if (el.skipBtn) el.skipBtn.classList.add('hidden');
}

// ===========================================
// アクティブプレイヤー表示
// ===========================================
export function setActivePlayer(target) {
    el.playerBox?.classList.toggle('active', target === 'player');
    el.cpuBox?.classList.toggle('active', target === 'cpu');
}

export function setAnimating(isAnimating) {
    if (el.actionBtn) {
        el.actionBtn.disabled = isAnimating;
    }
}

// ===========================================
// 役表パネル
// ===========================================
export function toggleRankPanel() {
    el.rankPanel?.classList.toggle('open');
}

export function updateRankPanel(mode) {
    if (el.rankMode) {
        el.rankMode.textContent = mode === 'nine' ? '九星賽' : '通常賽';
    }
    renderRankList(mode);
}

function renderRankList(mode = 'normal') {
    if (!el.rankList) return;

    const roleTable = getRoleTable(mode);
    el.rankList.innerHTML = '';

    // 勝ち役
    addRankSection('勝ち役');
    roleTable.roles.filter(r => r.multiplier > 0).forEach(r => addRankItem(r));

    // 負け役
    addRankSection('負け役');
    roleTable.roles.filter(r => r.multiplier <= 0).forEach(r => addRankItem(r));
    addRankItem(roleTable.noRole);
    addRankItem(roleTable.shonben);
}

function addRankSection(label) {
    const section = document.createElement('div');
    section.className = 'rank-section';
    section.textContent = label;
    el.rankList.appendChild(section);
}

function addRankItem(role) {
    const item = document.createElement('div');
    item.className = 'rank-item';

    // ダイス表示
    const diceDiv = document.createElement('div');
    diceDiv.className = 'rank-dice';
    (role.display || []).forEach(v => {
        const die = document.createElement('div');
        die.className = 'rank-die';
        if (v === 1) die.classList.add('red');
        die.textContent = v;
        diceDiv.appendChild(die);
    });

    const name = document.createElement('span');
    name.className = 'rank-name';
    name.textContent = role.name;

    const mult = document.createElement('span');
    mult.className = 'rank-mult' + (role.multiplier < 0 ? ' neg' : '');
    mult.textContent = 'x' + role.multiplier;

    item.appendChild(diceDiv);
    item.appendChild(name);
    item.appendChild(mult);
    el.rankList.appendChild(item);
}

// ===========================================
// 試合結果モーダル
// ===========================================
export function showMatchResult(result, onNext) {
    if (el.matchResultTitle) {
        el.matchResultTitle.textContent = result.winner === 'player' ? 'WIN!' : 'LOSE...';
        el.matchResultTitle.className = 'match-winner ' + (result.winner === 'player' ? 'win' : 'lose');
    }

    if (el.matchPlayerRole) {
        el.matchPlayerRole.textContent = result.playerRole?.name || '-';
    }
    if (el.matchCpuRole) {
        el.matchCpuRole.textContent = result.cpuRole?.name || '-';
    }

    if (el.matchPayout) {
        const payout = result.winner === 'player' ? result.payout : -result.payout;
        const sign = payout >= 0 ? '+' : '';
        el.matchPayout.textContent = `${sign}¥${Math.abs(payout).toLocaleString()}`;
        el.matchPayout.style.color = payout >= 0 ? '#22c55e' : '#ef4444';
    }

    if (el.matchModal) el.matchModal.classList.remove('hidden');

    if (el.nextMatchBtn) {
        el.nextMatchBtn.onclick = () => {
            if (el.matchModal) el.matchModal.classList.add('hidden');
            onNext();
        };
    }
}

// ===========================================
// ゲーム終了結果
// ===========================================
export function showGameResult(result, money, onRestart) {
    if (el.resultTitle) {
        el.resultTitle.textContent = result === 'victory' ? '🎉 VICTORY! 🎉' : '💀 DEFEAT 💀';
        el.resultTitle.className = 'result-title ' + result;
    }
    if (el.resultMoney) {
        el.resultMoney.textContent = '¥' + money.toLocaleString();
    }

    showScreen('result');

    if (el.restartBtn) {
        el.restartBtn.onclick = onRestart;
    }
}

// ===========================================
// ユーティリティ
// ===========================================
export function flashElement(element, className) {
    if (!element) return;
    element.classList.add(className);
    setTimeout(() => element.classList.remove(className), 500);
}

export function getElement(id) {
    return el[id];
}

// ===========================================
// 初期化
// ===========================================
export function initUI(callbacks = {}) {
    cacheElements();

    // 役表パネル
    if (el.rankBtn) {
        el.rankBtn.addEventListener('click', () => toggleRankPanel());
    }
    if (el.rankClose) {
        el.rankClose.addEventListener('click', () => toggleRankPanel());
    }
    if (el.rankOverlay) {
        el.rankOverlay.addEventListener('click', () => toggleRankPanel());
    }

    // カードモーダル
    if (el.cardCancelBtn) {
        el.cardCancelBtn.addEventListener('click', () => hideCardModal());
    }

    // コールバック設定
    if (callbacks.onStartCpuGame && el.startCpuBtn) {
        el.startCpuBtn.addEventListener('click', callbacks.onStartCpuGame);
    }
    if (callbacks.onRestart && el.restartBtn) {
        el.restartBtn.addEventListener('click', callbacks.onRestart);
    }
    if (callbacks.onDrawCard && el.drawBtn) {
        el.drawBtn.addEventListener('click', callbacks.onDrawCard);
    }
    if (callbacks.onCardUse) {
        setOnCardUse(callbacks.onCardUse);
    }

    console.log('🎮 UI initialized');
}
