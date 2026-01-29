/**
 * UI Manager - ui.js
 * 新レイアウト対応（enemy_info_box.html形式）
 * ES Modules形式
 */

import { getRoleTable } from './roles.js';
import { RankSystem } from './rank-system.js';
import { getCardDisplayCost } from './cards.js';

// DOM要素キャッシュ
const el = {};

function cacheElements() {
    // 画面
    el.titleScreen = document.getElementById('title-screen');
    el.gameScreen = document.getElementById('game-screen');
    el.resultScreen = document.getElementById('result-screen');

    // プレイヤー情報BOX
    el.playerBox = document.getElementById('player-box');
    el.playerMoney = document.getElementById('player-money');
    el.playerBet = document.getElementById('player-bet');
    el.playerDice = document.getElementById('player-dice');
    el.playerRole = document.getElementById('player-role');
    el.playerHand = document.getElementById('player-hand'); // 下段の手札エリア

    // CPU情報BOX
    el.cpuBox = document.getElementById('cpu-box');
    el.cpuMoney = document.getElementById('cpu-money');
    el.cpuBet = document.getElementById('cpu-bet');
    el.cpuDice = document.getElementById('cpu-dice');
    el.cpuRole = document.getElementById('cpu-role');
    el.cpuHand = document.getElementById('cpu-hand'); // 情報BOX内のミニカード

    // 試合情報
    el.matchNum = document.getElementById('match-num');
    el.diceMode = document.getElementById('dice-mode');
    el.diceResultDisplay = document.getElementById('dice-result-display');
    el.resultRoleName = document.getElementById('result-role-name');
    el.resultDiceValues = document.getElementById('result-dice-values');

    // カード使用通知
    el.cardUsedNotification = document.getElementById('card-used-notification');
    el.notificationPlayerName = document.getElementById('notification-player-name');
    el.notificationCardName = document.getElementById('notification-card-name');
    el.notificationCardDesc = document.getElementById('notification-card-desc');

    // 中央エリア
    el.deckArea = document.getElementById('deck-area');
    el.discardArea = document.getElementById('discard-area');
    el.actionBtn = document.getElementById('action-btn');
    el.skipBtn = document.getElementById('skip-btn');

    // 役表ドロワー
    el.rankBtn = document.getElementById('rank-btn');
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

    // クイックビュー（ホバー時の説明）
    el.quickView = document.getElementById('quick-view');
    el.quickTitle = document.getElementById('quick-title');
    el.quickDesc = document.getElementById('quick-desc');

    // カードモーダル（従来型）
    el.cardModal = document.getElementById('card-modal');
    el.cardModalIcon = document.getElementById('card-modal-icon');
    el.cardModalTitle = document.getElementById('card-modal-title');
    el.cardModalDesc = document.getElementById('card-modal-desc');
    el.cardUseBtn = document.getElementById('card-use-btn');
    el.cardCancelBtn = document.getElementById('card-cancel-btn');

    // 試合結果モーダル
    el.matchModal = document.getElementById('match-modal');
    el.matchResultTitle = document.getElementById('match-result-title');
    el.matchPlayerRole = document.getElementById('match-player-role');
    el.matchCpuRole = document.getElementById('match-cpu-role');
    el.matchPayout = document.getElementById('match-payout');
    el.nextMatchBtn = document.getElementById('next-match-btn');

    // ルール説明モーダル
    el.rulesModal = document.getElementById('rules-modal');
    el.rulesConfirm = document.getElementById('rules-confirm');

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
}

// ===========================================
// ダイス結果表示
// ===========================================
export function showDiceResult(roleName, diceValues) {
    if (el.resultRoleName) {
        el.resultRoleName.textContent = roleName || '-';
    }
    if (el.resultDiceValues && diceValues) {
        // dice-slot スタイルで表示
        el.resultDiceValues.innerHTML = '';
        if (Array.isArray(diceValues)) {
            diceValues.forEach(value => {
                const diceSlot = document.createElement('div');
                diceSlot.className = 'dice-slot';
                if (value === 1) {
                    diceSlot.classList.add('one');
                }
                diceSlot.textContent = value;
                el.resultDiceValues.appendChild(diceSlot);
            });
        }
    }
    if (el.diceResultDisplay) {
        el.diceResultDisplay.style.display = 'block';
    }
}

export function hideDiceResult() {
    if (el.diceResultDisplay) {
        el.diceResultDisplay.style.display = 'none';
    }
}

// ===========================================
// カード使用通知表示
// ===========================================
export function showCardUsedNotification(playerName, cardName, cardDesc) {
    if (!el.cardUsedNotification) return;

    if (el.notificationPlayerName) {
        el.notificationPlayerName.textContent = playerName;
    }
    if (el.notificationCardName) {
        el.notificationCardName.textContent = cardName;
    }
    if (el.notificationCardDesc) {
        el.notificationCardDesc.textContent = cardDesc;
    }

    el.cardUsedNotification.classList.remove('hidden');

    // 1秒後に自動で非表示
    setTimeout(() => {
        el.cardUsedNotification.classList.add('hidden');
    }, 1000);
}

// ===========================================
// ルール説明モーダル
// ===========================================
export function showRulesModal(onConfirm) {
    if (!el.rulesModal) return;

    el.rulesModal.classList.remove('hidden');

    // 確認ボタンのイベントハンドラをセット
    const handleConfirm = () => {
        el.rulesModal.classList.add('hidden');
        el.rulesConfirm.removeEventListener('click', handleConfirm);
        if (onConfirm) onConfirm();
    };

    el.rulesConfirm.addEventListener('click', handleConfirm);
}

export function hideRulesModal() {
    if (el.rulesModal) {
        el.rulesModal.classList.add('hidden');
    }
}

// ===========================================
// プレイヤー情報更新
// ===========================================
export function updatePlayerInfo(player, playerId, animateCardDraw = true) {
    const isPlayer = playerId === 'player';
    const prefix = isPlayer ? 'player' : 'cpu';

    // 所持金（アニメーション付き）
    const moneyEl = el[`${prefix}Money`];
    if (moneyEl) {
        const parentItem = moneyEl.closest('.stat-item');
        if (playerId === 'cpu' && player.money > 10000000000000) {
            moneyEl.textContent = '¥∞';
        } else {
            moneyEl.textContent = '¥' + player.money.toLocaleString();
        }
        // フラッシュアニメーション
        if (parentItem) {
            parentItem.classList.add('flash-update');
            setTimeout(() => parentItem.classList.remove('flash-update'), 300);
        }

        // プレイヤーの場合、所持金を記録（カードオーバーレイのコスト表示用）
        if (isPlayer) {
            currentPlayerMoney = player.money;
        }
    }

    // 掛け金
    const betEl = el[`${prefix}Bet`];
    if (betEl) {
        const parentItem = betEl.closest('.stat-item');
        betEl.textContent = '¥' + (player.currentBet || 0).toLocaleString();
        if (parentItem) {
            parentItem.classList.add('flash-update');
            setTimeout(() => parentItem.classList.remove('flash-update'), 300);
        }
    }

    // ダイス（情報BOX内）
    const diceEl = el[`${prefix}Dice`];
    if (diceEl) {
        const slots = diceEl.querySelectorAll('.dice-slot');
        player.currentDice?.forEach((v, i) => {
            if (slots[i]) {
                // アニメーション
                slots[i].style.transform = 'scale(1.3) rotate(10deg)';
                slots[i].textContent = v || '?';
                slots[i].classList.toggle('one', v === 1);
                setTimeout(() => {
                    slots[i].style.transform = 'scale(1) rotate(0deg)';
                }, 250);
            }
        });
    }

    // 役
    const roleEl = el[`${prefix}Role`];
    if (roleEl) {
        roleEl.textContent = player.currentRole?.name || '-';
    }

    // 手札レンダリング（統合）
    synchronizeCardDisplays(player, isPlayer, animateCardDraw);
}

// ===========================================
// 統合カード表示管理
// 大型カード、ミニカード、追加・削除を一括管理
// ===========================================
function synchronizeCardDisplays(player, isPlayer, animateCardDraw = true) {
    // 大型カード（プレイヤーのみ）
    if (isPlayer) {
        updatePlayerCardDisplay(player, animateCardDraw);
    }
    // ミニカード（プレイヤー/CPU）
    updateMiniCardDisplay(player, isPlayer);
}

/**
 * プレイヤー大型カード表示更新（下段・表向き）
 * card.jsのCardGameManagerと連携
 */
function updatePlayerCardDisplay(player, animate = true) {
    if (!el.playerHand) return;

    // CardRenderingSystem を使用（利用可能なら）
    if (window.cardRenderer && window.cardRenderer.playerHandContainer === el.playerHand) {
        // 既存のカード数と新しいカード数を比較
        const currentCards = el.playerHand.querySelectorAll('.card:not(.card-exit)').length;
        const newCardCount = player.hand.length;

        if (newCardCount > currentCards) {
            // カードが追加された場合
            for (let i = currentCards; i < newCardCount; i++) {
                if (player.hand[i]) {
                    const cardEl = window.cardRenderer.addPlayerCard(player.hand[i], null, null, animate);
                    // イベントリスナーを設定
                    attachCardEventListeners(cardEl, player.hand[i], i);
                }
            }
            // カード追加後、レイアウトを更新
            window.cardRenderer.updatePlayerCardLayout();
        } else if (newCardCount < currentCards) {
            // カードが削除された場合：ミニカードとの同期削除は呼び出し側で行う
            // 削除処理は deletePlayerCardsInSync() で行うため、ここでは何もしない
            // （すでに呼び出し側で同期的に処理される）
        }

        window.cardRenderer.updatePlayerCardIndices();
    } else {
        // フォールバック：基本的なレンダリング
        el.playerHand.innerHTML = '';
        player.hand.forEach((card, index) => {
            const cardEl = createCardElement(card, index);
            el.playerHand.appendChild(cardEl);
        });
    }

    // card.jsのカードレイアウト調整を適用（利用可能なら）
    if (window.cardGame) {
        // cardGameの手札と同期
        window.cardGame.playerHand = player.hand.map(c => ({
            id: c.id,
            title: c.name,
            description: c.description,
            effectId: c.effectId || null
        }));
    }
}

/**
 * ミニカード表示更新（プレイヤー/CPU両方）
 */
function updateMiniCardDisplay(player, isPlayer) {
    if (isPlayer) {
        updatePlayerMiniCards(player);
    } else {
        updateCpuMiniCards(player);
    }
}

/**
 * プレイヤーミニカード表示更新（情報BOX内）
 * ミニカードの色がplayer.handと一致しているか検証し、不一致があれば再構築
 */
function updatePlayerMiniCards(player) {
    const playerHandMiniEl = document.getElementById('player-hand-mini');
    if (!playerHandMiniEl) return;

    const existingCards = playerHandMiniEl.querySelectorAll('.card-back-mini:not(.card-exit)');
    const currentCards = existingCards.length;
    const newCardCount = player.hand.length;

    // 色の一致を確認
    let colorsMatch = (currentCards === newCardCount);
    if (colorsMatch) {
        for (let i = 0; i < currentCards; i++) {
            const expectedColor = player.hand[i]?.color || 'blue';
            const hasExpectedColor = existingCards[i].classList.contains(expectedColor);
            if (!hasExpectedColor) {
                colorsMatch = false;
                break;
            }
        }
    }

    // 色が一致しない場合は全て再構築
    if (!colorsMatch) {
        rebuildPlayerMiniCards(player, playerHandMiniEl);
        return;
    }

    if (newCardCount > currentCards) {
        // カードが追加された場合
        for (let i = currentCards; i < newCardCount; i++) {
            const card = player.hand[i];
            const cardEl = document.createElement('div');
            const cardColor = card?.color || 'blue';
            cardEl.className = `card-back-mini card-enter ${cardColor}`;
            playerHandMiniEl.appendChild(cardEl);

            // アニメーション開始
            cardEl.offsetHeight;
            setTimeout(() => {
                cardEl.classList.remove('card-enter');
                cardEl.classList.add('card-ready');
            }, 50);
        }
        updatePlayerHandMiniLayout();
    } else if (newCardCount < currentCards) {
        // カードが削除された場合
        const usedIndex = getAndResetLastUsedCardIndex();
        removePlayerCardMiniAtIndex(usedIndex, currentCards - newCardCount);
    }
}

/**
 * ミニカードを完全に再構築（色の不一致を修正）
 */
function rebuildPlayerMiniCards(player, containerEl) {
    // 既存のカードをフェードアウト
    const oldCards = containerEl.querySelectorAll('.card-back-mini');
    oldCards.forEach(card => {
        card.classList.add('card-exit');
        setTimeout(() => {
            if (card.parentNode === containerEl) {
                containerEl.removeChild(card);
            }
        }, 300);
    });

    // 新しいカードを追加
    setTimeout(() => {
        player.hand.forEach((card) => {
            const cardEl = document.createElement('div');
            const cardColor = card?.color || 'blue';
            cardEl.className = `card-back-mini card-enter ${cardColor}`;
            containerEl.appendChild(cardEl);

            cardEl.offsetHeight;
            setTimeout(() => {
                cardEl.classList.remove('card-enter');
                cardEl.classList.add('card-ready');
            }, 50);
        });
        updatePlayerHandMiniLayout();
    }, 150);
}

/**
 * 指定インデックスのミニカードを削除
 */
function removePlayerCardMiniAtIndex(usedIndex, deleteCount) {
    const playerHandMiniEl = document.getElementById('player-hand-mini');
    if (!playerHandMiniEl) return;

    for (let i = 0; i < deleteCount; i++) {
        setTimeout(() => {
            const cards = playerHandMiniEl.querySelectorAll('.card-back-mini:not(.card-exit)');
            if (cards.length === 0) return;

            // 最初の削除時は指定インデックス、以降は最後のカード
            const indexToRemove = (i === 0 && usedIndex >= 0 && usedIndex < cards.length)
                ? usedIndex
                : cards.length - 1;

            const targetCard = cards[indexToRemove];
            if (targetCard) {
                targetCard.classList.add('card-exit');
                setTimeout(() => {
                    if (targetCard.parentNode === playerHandMiniEl) {
                        playerHandMiniEl.removeChild(targetCard);
                        updatePlayerHandMiniLayout();
                    }
                }, 300);
            }
        }, i * 150);
    }
}

/**
 * CPUミニカード表示更新（情報BOX内）
 */
function updateCpuMiniCards(player) {
    if (!el.cpuHand) return;

    // 既存のカード数と新しいカード数を比較
    const currentCards = el.cpuHand.querySelectorAll('.card-back-mini:not(.card-exit)').length;
    const newCardCount = player.hand.length;

    if (newCardCount > currentCards) {
        // カードが追加された場合
        for (let i = currentCards; i < newCardCount; i++) {
            const card = player.hand[i];
            const cardEl = document.createElement('div');
            const cardColor = card?.color || 'blue';
            cardEl.className = `card-back-mini card-enter ${cardColor}`;
            el.cpuHand.appendChild(cardEl);

            // アニメーション開始
            cardEl.offsetHeight;
            setTimeout(() => {
                cardEl.classList.remove('card-enter');
                cardEl.classList.add('card-ready');
            }, 50);
        }
        updateCpuHandMiniLayout();
    } else if (newCardCount < currentCards) {
        // カードが削除された場合
        const diff = currentCards - newCardCount;
        deleteCpuCardsInSync(diff);
    }
}

/**
 * CPUのカード削除を同期（大型・ミニ一括）
 * 重複削除を防ぐため、削除可能なカードがあるかチェック
 */
function deleteCpuCardsInSync(deleteCount) {
    for (let i = 0; i < deleteCount; i++) {
        setTimeout(() => {
            // CPU大型カード削除（存在する場合・重複削除防止）
            // 注：CPUの大型カードはゲーム内に表示されないため、実際には削除されない
            if (window.cardRenderer) {
                window.cardRenderer.removeCPUCard();
            }
            // CPUミニカード削除（同じタイミング）
            removeCpuCardMini();

            // 最後の削除時にレイアウト更新
            if (i === deleteCount - 1) {
                setTimeout(() => {
                    updateCpuHandMiniLayout();
                }, 350);
            }
        }, i * 150);
    }
}

let onCardUseCallback = null;
let lastUsedCardIndex = -1; // 最後に使用されたカードのインデックスを追跡
let currentPlayerMoney = null; // 現在のプレイヤー所持金（コスト計算用）

export function setOnCardUse(callback) {
    onCardUseCallback = callback;
}

/**
 * 使用されたカードのインデックスを設定
 */
export function setLastUsedCardIndex(index) {
    lastUsedCardIndex = index;
}

/**
 * 現在のプレイヤー所持金を設定（コスト計算用）
 */
export function setCurrentPlayerMoney(money) {
    currentPlayerMoney = money;
}

/**
 * 使用されたカードのインデックスを取得してリセット
 */
function getAndResetLastUsedCardIndex() {
    const index = lastUsedCardIndex;
    lastUsedCardIndex = -1;
    return index;
}


/**
 * カード要素にイベントリスナーをアタッチ（ホバー、クリック）
 */
function attachCardEventListeners(cardEl, card, index) {
    if (!cardEl) return;

    // クリック → モーダル表示
    cardEl.addEventListener('click', () => showCardModal(card, index));

    // ホバー → クイックビュー
    cardEl.addEventListener('mouseenter', (e) => showQuickView(e, card));
    cardEl.addEventListener('mousemove', (e) => moveQuickView(e));
    cardEl.addEventListener('mouseleave', () => hideQuickView());
}

function createCardElement(card, index, playerMoney = 0) {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    cardEl.dataset.index = index;
    cardEl.dataset.cardId = card.id;
    cardEl.dataset.title = card.name;
    cardEl.dataset.desc = card.description;

    // プレイヤーのカードは裏面表示
    const back = document.createElement('div');
    // カラークラスを追加（色分け用）
    const colorClass = card.color || 'blue';
    back.className = `card-back ${colorClass}`;

    cardEl.appendChild(back);

    // クリック → モーダル表示
    cardEl.addEventListener('click', () => showCardModal(card, index));

    // ホバー → クイックビュー
    cardEl.addEventListener('mouseenter', (e) => showQuickView(e, card));
    cardEl.addEventListener('mousemove', (e) => moveQuickView(e));
    cardEl.addEventListener('mouseleave', () => hideQuickView());

    return cardEl;
}

/**
 * ミニカードのレイアウトを更新
 */
function updatePlayerHandMiniLayout() {
    const playerHandMiniEl = document.getElementById('player-hand-mini');
    if (!playerHandMiniEl) return;

    const allCards = playerHandMiniEl.querySelectorAll('.card-back-mini:not(.card-exit)');
    const containerWidth = playerHandMiniEl.offsetWidth || 210;
    const cardWidth = 30;
    const count = allCards.length;

    if (count > 0) {
        let negativeMargin = -10;
        if (count * (cardWidth + negativeMargin) > containerWidth) {
            negativeMargin = (containerWidth - cardWidth) / (count - 1) - cardWidth;
        }

        allCards.forEach((card, i) => {
            card.style.marginLeft = i === 0 ? '0px' : `${negativeMargin}px`;
            card.style.zIndex = i;
            card.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });
    }
}

// ===========================================
// プレイヤー手札ミニ表示（情報BOX内・裏向きミニカード・色付き）
// ===========================================

// ===========================================
// CPU手札ミニカード削除
// ===========================================
function removeCpuCardMini() {
    if (!el.cpuHand) return;

    const cards = el.cpuHand.querySelectorAll('.card-back-mini:not(.card-exit)');
    if (cards.length === 0) return;

    // 最後のカードを削除
    const targetCard = cards[cards.length - 1];
    targetCard.classList.add('card-exit');

    setTimeout(() => {
        if (targetCard.parentNode === el.cpuHand) {
            el.cpuHand.removeChild(targetCard);
            // レイアウト更新
            updateCpuHandMiniLayout();
        }
    }, 300);
}

/**
 * CPU手札ミニカードのレイアウトを更新
 */
function updateCpuHandMiniLayout() {
    if (!el.cpuHand) return;

    const allCards = el.cpuHand.querySelectorAll('.card-back-mini:not(.card-exit)');
    const containerWidth = el.cpuHand.offsetWidth || 210;
    const cardWidth = 30;
    const count = allCards.length;

    if (count > 0) {
        let negativeMargin = -10;
        if (count * (cardWidth + negativeMargin) > containerWidth) {
            negativeMargin = (containerWidth - cardWidth) / (count - 1) - cardWidth;
        }

        allCards.forEach((card, i) => {
            card.style.marginLeft = i === 0 ? '0px' : `${negativeMargin}px`;
            card.style.zIndex = i;
            card.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });
    }
}

// ===========================================
// CPU手札レンダリング（情報BOX内・裏向きミニカード・色付き）
// ===========================================

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
    if (!el.quickView) return;
    let x = e.clientX + 15;
    let y = e.clientY - 80;
    if (x + 200 > window.innerWidth) x = e.clientX - 215;
    if (y < 0) y = 10;
    el.quickView.style.left = x + 'px';
    el.quickView.style.top = y + 'px';
}

function hideQuickView() {
    if (el.quickView) el.quickView.style.display = 'none';
}

// ===========================================
// カードモーダル & オーバーレイ
// ===========================================
let selectedCardIndex = -1;
let selectedCard = null;

function showCardModal(card, index) {
    selectedCard = card;
    selectedCardIndex = index;

    // 高品質オーバーレイモーダルを使用（利用可能なら）
    const overlay = document.getElementById('card-overlay');
    if (overlay) {
        showCardOverlay(card, index);
    } else {
        // フォールバック：従来のモーダル
        if (el.cardModalTitle) el.cardModalTitle.textContent = card.name;
        if (el.cardModalDesc) el.cardModalDesc.textContent = card.description;
        if (el.cardModalIcon) el.cardModalIcon.textContent = '🎴';
        if (el.cardModal) el.cardModal.classList.remove('hidden');

        if (el.cardUseBtn) {
            el.cardUseBtn.onclick = () => {
                hideCardModal();
                // 使用されたカードのインデックスを記録（ミニカード削除用）
                lastUsedCardIndex = index;
                if (onCardUseCallback) onCardUseCallback(index);
            };
        }
    }
}

/**
 * 高品質カードオーバーレイを表示
 */
function showCardOverlay(card, index) {
    const overlay = document.getElementById('card-overlay');
    if (!overlay) return;

    const titleEl = document.getElementById('big-card-title');
    const descEl = document.getElementById('big-card-desc');
    const costEl = document.getElementById('big-card-cost');
    const imageEl = document.getElementById('card-image');
    const fallbackEl = document.getElementById('icon-fallback');
    const useBtn = document.getElementById('overlay-use-btn');
    const separatorEl = document.querySelector('.modal-separator');

    if (titleEl) titleEl.textContent = card.name || 'カード';
    if (descEl) descEl.textContent = card.description || '説明なし';

    // セパレータの色をカードの色に合わせる
    if (separatorEl && card.color) {
        const colorMap = {
            red: '#dc2626',
            blue: '#2563eb',
            green: '#16a34a',
            yellow: '#eab308'
        };
        const color = colorMap[card.color] || '#888';
        separatorEl.style.background = `linear-gradient(90deg, transparent, ${color}, transparent)`;
    }

    // コスト表示を更新
    if (costEl && currentPlayerMoney !== null) {
        const costDisplay = getCardDisplayCost(card.id, currentPlayerMoney);
        costEl.textContent = `コスト: ${costDisplay}`;
        if (costDisplay === '×') {
            costEl.classList.add('unusable');
            if (useBtn) useBtn.disabled = true;
        } else {
            costEl.classList.remove('unusable');
            if (useBtn) useBtn.disabled = false;
        }
    }

    // 画像の処理（あれば表示、なければフォールバック）
    if (card.image) {
        if (imageEl) {
            imageEl.src = card.image;
            imageEl.style.display = 'block';
            if (fallbackEl) fallbackEl.style.display = 'none';
        }
    } else {
        if (imageEl) imageEl.style.display = 'none';
        if (fallbackEl) fallbackEl.style.display = 'flex';
    }

    // 使用ボタンのコールバック
    if (useBtn) {
        useBtn.onclick = () => {
            closeCardOverlay();

            // 使用されたカードのインデックスを記録（ミニカード削除用）
            lastUsedCardIndex = index;

            // カード使用アニメーションを実行
            if (window.cardRenderer) {
                window.cardRenderer.executeCardUseAnimation(index, () => {
                    // アニメーション完了後に実際のコールバックを実行
                    if (onCardUseCallback) onCardUseCallback(index);
                });
            } else {
                // 描画システムがない場合は直接コールバック
                if (onCardUseCallback) onCardUseCallback(index);
            }
        };
    }

    // オーバーレイを表示
    overlay.classList.add('active');
    selectedCard = card;
    selectedCardIndex = index;
}

/**
 * カードオーバーレイを閉じる
 */
window.closeCardOverlay = function() {
    const overlay = document.getElementById('card-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
    selectedCardIndex = -1;
    selectedCard = null;
};

// ESCキーでオーバーレイを閉じる
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        window.closeCardOverlay();
    }
});

// オーバーレイ外をクリックで閉じる
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('card-overlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                window.closeCardOverlay();
            }
        });
    }
});

export function hideCardModal() {
    window.closeCardOverlay();
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
// アクティブプレイヤー表示（光らせる）
// ===========================================
export function setActivePlayer(target) {
    el.playerBox?.classList.toggle('is-active', target === 'player');
    el.cpuBox?.classList.toggle('is-active', target === 'cpu');
}

export function setAnimating(isAnimating) {
    if (el.actionBtn) el.actionBtn.disabled = isAnimating;
}

// ===========================================
// カード操作の有効/無効切り替え
// ===========================================
export function setCardsEnabled(enabled) {
    const deckArea = document.getElementById('deck-area');
    const playerHandArea = document.getElementById('player-hand');

    if (enabled) {
        deckArea?.classList.remove('disabled');
        playerHandArea?.classList.remove('disabled');
    } else {
        deckArea?.classList.add('disabled');
        playerHandArea?.classList.add('disabled');
    }
}

// ===========================================
// 役表ドロワー
// ===========================================
export function toggleRankPanel() {
    el.rankPanel?.classList.toggle('open');
    el.rankOverlay?.classList.toggle('open');
}

export function closeRankPanel() {
    el.rankPanel?.classList.remove('open');
    el.rankOverlay?.classList.remove('open');
}

export function updateRankPanel(mode) {
    const diceName = mode === 'nine' ? '九星賽' : '通常賽';
    RankSystem.setDiceName(diceName);
    renderRankList(mode);
}

function renderRankList(mode = 'normal') {
    const roleTable = getRoleTable(mode);

    RankSystem.clear();

    if (mode === 'normal') {
        // 通常賽のカテゴリー分類
        RankSystem.addSection('役物');
        roleTable.roles.filter(r => r.multiplier >= 2).forEach(r => {
            RankSystem.addRank(r.name, r.multiplier, r.display || [], r.targetIndex !== undefined ? r.targetIndex : -1);
        });

        RankSystem.addSection('通常');
        roleTable.roles.filter(r => r.multiplier === 1).forEach(r => {
            RankSystem.addRank(r.name, r.multiplier, r.display || [], r.targetIndex !== undefined ? r.targetIndex : -1);
        });

        RankSystem.addSection('凶役・特殊');
        roleTable.roles.filter(r => r.multiplier < 0).forEach(r => {
            RankSystem.addRank(r.name, r.multiplier, r.display || [], r.targetIndex !== undefined ? r.targetIndex : -1);
        });
        RankSystem.addRank(roleTable.noRole.name, roleTable.noRole.multiplier, roleTable.noRole.display || []);
        RankSystem.addRank(roleTable.shonben.name, roleTable.shonben.multiplier, roleTable.shonben.display || [], -1, true);
    } else {
        // 九星賽のカテゴリー分類
        RankSystem.addSection('特別役');
        roleTable.roles.filter(r => r.multiplier >= 5).forEach(r => {
            RankSystem.addRank(r.name, r.multiplier, r.display || [], r.targetIndex !== undefined ? r.targetIndex : -1);
        });

        RankSystem.addSection('通常役');
        roleTable.roles.filter(r => r.multiplier === 1).forEach(r => {
            RankSystem.addRank(r.name, r.multiplier, r.display || [], r.targetIndex !== undefined ? r.targetIndex : -1);
        });

        RankSystem.addSection('凶役・特殊');
        roleTable.roles.filter(r => r.multiplier < 0).forEach(r => {
            RankSystem.addRank(r.name, r.multiplier, r.display || [], r.targetIndex !== undefined ? r.targetIndex : -1);
        });
        RankSystem.addRank(roleTable.noRole.name, roleTable.noRole.multiplier, roleTable.noRole.display || []);
        RankSystem.addRank(roleTable.shonben.name, roleTable.shonben.multiplier, roleTable.shonben.display || [], -1, true);
    }

    RankSystem.render();
}

// ===========================================
// 山札の積み重ね初期化
// ===========================================
let onDrawCardCallback = null;

export function setOnDrawCard(callback) {
    onDrawCardCallback = callback;
}

function initDeckStack() {
    if (!el.deckArea) return;

    // 既存のカードをクリア
    el.deckArea.innerHTML = '';

    // 5枚のカードを積み重ねる
    for (let i = 0; i < 5; i++) {
        const card = document.createElement('div');
        card.className = 'deck-stack-card card';
        card.style.zIndex = i;

        // ランダムに±5pxずらす
        const randomX = (Math.random() - 0.5) * 10;
        const randomY = (Math.random() - 0.5) * 10;
        card.style.transform = `translate(${randomX}px, ${randomY}px)`;

        // カード裏面
        const cardBack = document.createElement('div');
        cardBack.className = 'card-back blue';
        card.appendChild(cardBack);

        // クリックイベント - ゲームロジックのdrawCardを呼ぶ
        card.addEventListener('click', () => {
            if (onDrawCardCallback) {
                onDrawCardCallback();
            }
        });

        el.deckArea.appendChild(card);
    }
}

// ===========================================
// 試合結果モーダル
// ===========================================
export function showMatchResult(result, onNext) {
    if (el.matchResultTitle) {
        el.matchResultTitle.textContent = result.winner === 'player' ? 'WIN!' : 'LOSE...';
        el.matchResultTitle.className = 'match-winner ' + (result.winner === 'player' ? 'win' : 'lose');
    }

    if (el.matchPlayerRole) el.matchPlayerRole.textContent = result.playerRole?.name || '-';
    if (el.matchCpuRole) el.matchCpuRole.textContent = result.cpuRole?.name || '-';

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

    if (el.restartBtn) el.restartBtn.onclick = onRestart;
}

// ===========================================
// 初期化
// ===========================================
export function initUI(callbacks = {}) {
    cacheElements();

    // カード描画システムを初期化
    if (window.cardRenderer) {
        window.cardRenderer.init('#player-hand', '#cpu-hand', '#deck-area');
        console.log('🎴 カード描画システムを初期化しました（プレイヤー手札 + CPU手札）');
    }

    // 山札の積み重ねを初期化
    initDeckStack();

    // 役表ドロワー
    if (el.rankBtn) el.rankBtn.addEventListener('click', () => toggleRankPanel());
    if (el.rankClose) el.rankClose.addEventListener('click', () => closeRankPanel());
    if (el.rankOverlay) el.rankOverlay.addEventListener('click', () => closeRankPanel());

    // カードモーダル
    if (el.cardCancelBtn) el.cardCancelBtn.addEventListener('click', () => hideCardModal());

    // ドローコールバック設定
    if (callbacks.onDrawCard) {
        setOnDrawCard(callbacks.onDrawCard);
    }

    // コールバック設定
    if (callbacks.onStartCpuGame && el.startCpuBtn) {
        el.startCpuBtn.addEventListener('click', callbacks.onStartCpuGame);
    }
    if (callbacks.onRestart && el.restartBtn) {
        el.restartBtn.addEventListener('click', callbacks.onRestart);
    }
    if (callbacks.onCardUse) {
        setOnCardUse(callbacks.onCardUse);
    }

    console.log('🎮 UI initialized (new layout with info-box)');
}
