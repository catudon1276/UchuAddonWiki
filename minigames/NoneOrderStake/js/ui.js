/**
 * UI管理モジュール
 * ゲーム画面の表示・操作を管理
 */

import { CARD_COLORS, CARDS } from '../data/cards.js';
import { getRoleTable } from '../data/roles.js';

// ===========================================
// UI状態
// ===========================================
let uiState = {
    currentScreen: 'title', // 'title' | 'game' | 'result'
    isAnimating: false,
    selectedCard: null
};

// ===========================================
// DOM要素キャッシュ
// ===========================================
let elements = {};

// ===========================================
// 初期化
// ===========================================
export function initUI() {
    cacheElements();
    setupEventListeners();
    showScreen('title');
}

function cacheElements() {
    elements = {
        // 画面
        titleScreen: document.getElementById('title-screen'),
        gameScreen: document.getElementById('game-screen'),
        resultScreen: document.getElementById('result-screen'),
        
        // ゲーム情報
        matchDisplay: document.getElementById('match-display'),
        modeDisplay: document.getElementById('mode-display'),
        
        // プレイヤー情報
        playerMoney: document.getElementById('player-money'),
        playerBet: document.getElementById('player-bet'),
        playerDice: document.getElementById('player-dice'),
        playerCards: document.getElementById('player-cards'),
        playerBox: document.getElementById('player-box'),
        
        // CPU情報
        cpuMoney: document.getElementById('cpu-money'),
        cpuBet: document.getElementById('cpu-bet'),
        cpuDice: document.getElementById('cpu-dice'),
        cpuCards: document.getElementById('cpu-cards'),
        cpuBox: document.getElementById('cpu-box'),
        
        // 中央エリア
        bowlArea: document.getElementById('bowl-area'),
        diceCanvas: document.getElementById('dice-canvas'),
        vfxStage: document.getElementById('vfx-stage'),
        
        // ボタン
        actionButton: document.getElementById('action-button'),
        cardDrawButton: document.getElementById('card-draw-button'),
        
        // モーダル
        betModal: document.getElementById('bet-modal'),
        betSlider: document.getElementById('bet-slider'),
        betValue: document.getElementById('bet-value'),
        
        cardModal: document.getElementById('card-modal'),
        cardList: document.getElementById('card-list'),
        
        // 役表パネル
        rankPanel: document.getElementById('rank-panel'),
        rankToggle: document.getElementById('rank-toggle'),
        
        // 結果
        resultTitle: document.getElementById('result-title'),
        resultMoney: document.getElementById('result-money')
    };
}

function setupEventListeners() {
    // ベットスライダー
    elements.betSlider?.addEventListener('input', (e) => {
        elements.betValue.textContent = parseInt(e.target.value).toLocaleString();
    });
    
    // 役表トグル
    elements.rankToggle?.addEventListener('click', toggleRankPanel);
}

// ===========================================
// 画面切り替え
// ===========================================
export function showScreen(screenName) {
    uiState.currentScreen = screenName;
    
    elements.titleScreen?.classList.toggle('hidden', screenName !== 'title');
    elements.gameScreen?.classList.toggle('hidden', screenName !== 'game');
    elements.resultScreen?.classList.toggle('hidden', screenName !== 'result');
}

// ===========================================
// ゲーム情報更新
// ===========================================
export function updateGameInfo(gameState) {
    const state = gameState.getState();
    
    // 試合数
    if (elements.matchDisplay) {
        elements.matchDisplay.textContent = `${state.currentMatch}/${state.totalMatches}`;
    }
    
    // モード表示
    if (elements.modeDisplay) {
        const roleTable = getRoleTable(state.diceMode);
        elements.modeDisplay.textContent = roleTable.name;
    }
}

// ===========================================
// プレイヤー情報更新
// ===========================================
export function updatePlayerInfo(player, elementPrefix) {
    const moneyEl = elements[`${elementPrefix}Money`];
    const betEl = elements[`${elementPrefix}Bet`];
    const diceEl = elements[`${elementPrefix}Dice`];
    const cardsEl = elements[`${elementPrefix}Cards`];
    
    if (moneyEl) {
        moneyEl.textContent = `¥${player.money.toLocaleString()}`;
    }
    
    if (betEl) {
        betEl.textContent = `¥${player.currentBet.toLocaleString()}`;
    }
    
    if (diceEl) {
        updateDiceDisplay(diceEl, player.currentDice);
    }
    
    if (cardsEl && elementPrefix === 'player') {
        updateHandDisplay(cardsEl, player.hand);
    } else if (cardsEl) {
        updateCardBackDisplay(cardsEl, player.hand.length);
    }
}

function updateDiceDisplay(container, dice) {
    const slots = container.querySelectorAll('.dice-slot');
    dice.forEach((val, i) => {
        if (slots[i]) {
            slots[i].textContent = val === 0 ? '?' : val;
            slots[i].classList.toggle('one', val === 1);
        }
    });
}

function updateHandDisplay(container, hand) {
    container.innerHTML = '';
    
    hand.forEach((card, index) => {
        const cardEl = createCardElement(card, index);
        container.appendChild(cardEl);
    });
    
    // 手札の配置を調整（扇状）
    layoutCards(container);
}

function updateCardBackDisplay(container, count) {
    container.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card-back';
        container.appendChild(cardEl);
    }
    
    layoutCards(container);
}

function createCardElement(card, index) {
    const colors = CARD_COLORS[card.color];
    
    const cardEl = document.createElement('div');
    cardEl.className = 'card-hand';
    cardEl.dataset.index = index;
    cardEl.dataset.cardId = card.id;
    cardEl.style.setProperty('--card-color-1', colors.gradient[0]);
    cardEl.style.setProperty('--card-color-2', colors.gradient[1]);
    
    cardEl.innerHTML = `
        <div class="card-inner">
            <div class="card-front">
                <div class="card-name">${card.name}</div>
                <div class="card-desc">${card.description}</div>
            </div>
            <div class="card-back-face"></div>
        </div>
    `;
    
    cardEl.addEventListener('click', () => onCardClick(index, card));
    
    return cardEl;
}

function layoutCards(container) {
    const cards = container.querySelectorAll('.card-hand, .card-back');
    const count = cards.length;
    
    if (count === 0) return;
    
    const baseRotation = -15;
    const rotationStep = 30 / Math.max(1, count - 1);
    
    cards.forEach((card, i) => {
        const rotation = baseRotation + (rotationStep * i);
        const translateY = Math.abs(rotation) * 0.5;
        card.style.transform = `rotate(${rotation}deg) translateY(${translateY}px)`;
        card.style.zIndex = i;
    });
}

// ===========================================
// カード操作
// ===========================================
function onCardClick(index, card) {
    if (uiState.isAnimating) return;
    
    uiState.selectedCard = { index, card };
    
    // カード使用確認モーダル表示
    showCardConfirm(card);
}

function showCardConfirm(card) {
    // カード詳細を表示し、使用するか確認
    const modal = document.getElementById('card-confirm-modal');
    if (modal) {
        document.getElementById('confirm-card-name').textContent = card.name;
        document.getElementById('confirm-card-desc').textContent = card.description;
        modal.classList.remove('hidden');
    }
}

// ===========================================
// ベッティング
// ===========================================
export function showBetModal(maxBet, onConfirm) {
    if (!elements.betModal) return;
    
    elements.betSlider.max = maxBet;
    elements.betSlider.value = Math.min(1000, maxBet);
    elements.betValue.textContent = parseInt(elements.betSlider.value).toLocaleString();
    
    elements.betModal.classList.remove('hidden');
    
    // 確定ボタン
    const confirmBtn = elements.betModal.querySelector('.bet-confirm');
    confirmBtn.onclick = () => {
        const amount = parseInt(elements.betSlider.value);
        elements.betModal.classList.add('hidden');
        onConfirm(amount);
    };
}

export function hideBetModal() {
    elements.betModal?.classList.add('hidden');
}

// ===========================================
// 役表パネル
// ===========================================
export function toggleRankPanel() {
    elements.rankPanel?.classList.toggle('open');
}

export function updateRankPanel(mode = 'normal') {
    const roleTable = getRoleTable(mode);
    
    // RankSystemを使用して役表を更新
    if (window.RankSystem) {
        window.RankSystem.clear();
        window.RankSystem.setDiceName(roleTable.name);
        
        // 役物
        window.RankSystem.addSection('役物');
        roleTable.roles
            .filter(r => r.multiplier >= 2)
            .forEach(r => {
                window.RankSystem.addRank(
                    r.name,
                    r.multiplier,
                    r.display,
                    r.targetIndex ?? -1,
                    r.isSpecial ?? false
                );
            });
        
        // 通常
        window.RankSystem.addSection('通常');
        roleTable.roles
            .filter(r => r.multiplier === 1)
            .forEach(r => {
                window.RankSystem.addRank(
                    r.name,
                    r.multiplier,
                    r.display,
                    r.targetIndex ?? -1
                );
            });
        
        // 凶役
        window.RankSystem.addSection('凶役・特殊');
        roleTable.roles
            .filter(r => r.multiplier < 0)
            .forEach(r => {
                window.RankSystem.addRank(
                    r.name,
                    r.multiplier,
                    r.display,
                    -1
                );
            });
        window.RankSystem.addRank(
            roleTable.noRole.name,
            roleTable.noRole.multiplier,
            roleTable.noRole.display,
            -1
        );
        window.RankSystem.addRank(
            roleTable.shonben.name,
            roleTable.shonben.multiplier,
            roleTable.shonben.display,
            -1,
            true
        );
        
        window.RankSystem.render();
    }
}

// ===========================================
// アクションボタン
// ===========================================
export function setActionButton(text, onClick, disabled = false) {
    if (!elements.actionButton) return;
    
    elements.actionButton.textContent = text;
    elements.actionButton.disabled = disabled;
    elements.actionButton.onclick = onClick;
}

export function hideActionButton() {
    elements.actionButton?.classList.add('hidden');
}

export function showActionButton() {
    elements.actionButton?.classList.remove('hidden');
}

// ===========================================
// 結果表示
// ===========================================
export function showMatchResult(result, onNext) {
    const modal = document.getElementById('match-result-modal');
    if (!modal) return;
    
    const winnerText = result.winner === 'player' ? 'WIN!' : 'LOSE...';
    const winnerClass = result.winner === 'player' ? 'win' : 'lose';
    const payoutText = result.winner === 'player' 
        ? `+¥${result.payout.toLocaleString()}`
        : `-¥${result.payout.toLocaleString()}`;
    
    document.getElementById('match-winner').textContent = winnerText;
    document.getElementById('match-winner').className = `match-winner ${winnerClass}`;
    document.getElementById('match-payout').textContent = payoutText;
    document.getElementById('match-role-player').textContent = result.playerRole.name;
    document.getElementById('match-role-cpu').textContent = result.cpuRole.name;
    
    modal.classList.remove('hidden');
    
    document.getElementById('next-match-btn').onclick = () => {
        modal.classList.add('hidden');
        onNext();
    };
}

export function showGameResult(result, finalMoney, onRestart) {
    showScreen('result');
    
    const isVictory = result === 'victory';
    
    if (elements.resultTitle) {
        elements.resultTitle.textContent = isVictory ? '🎉 VICTORY! 🎉' : 'GAME OVER';
        elements.resultTitle.className = isVictory ? 'victory' : 'defeat';
    }
    
    if (elements.resultMoney) {
        elements.resultMoney.textContent = `¥${finalMoney.toLocaleString()}`;
    }
    
    document.getElementById('restart-btn').onclick = onRestart;
}

// ===========================================
// アニメーション状態
// ===========================================
export function setAnimating(isAnimating) {
    uiState.isAnimating = isAnimating;
}

export function isAnimating() {
    return uiState.isAnimating;
}

// ===========================================
// プレイヤーボックスの強調
// ===========================================
export function setActivePlayer(playerId) {
    elements.playerBox?.classList.toggle('is-active', playerId === 'player');
    elements.cpuBox?.classList.toggle('is-active', playerId === 'cpu');
}

// ===========================================
// ユーティリティ
// ===========================================
export function flashElement(element, className = 'flash', duration = 300) {
    element.classList.add(className);
    setTimeout(() => element.classList.remove(className), duration);
}

export function shakeElement(element, duration = 200) {
    element.classList.add('shake');
    setTimeout(() => element.classList.remove('shake'), duration);
}
