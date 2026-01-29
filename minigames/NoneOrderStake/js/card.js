// ==========================================
// Card System - card.js
// ゲーム統合カード管理 + 高品質描画システム
// ==========================================

/**
 * カード管理 + 描画システムの統合
 */
class CardGameManager {
    constructor() {
        // ゲーム状態管理
        this.deck = [];
        this.playerHand = [];
        this.opponentHand = [];
        this.discardPile = [];
        this.cardDefinitions = new Map();
        this.cardEffects = new Map();

        // 描画システム
        this.rendering = null;

        // イベントシステム
        this.eventListeners = {
            onCardDraw: [],
            onCardUse: [],
            onCardDiscard: [],
            onGameReset: [],
            onDeckEmpty: [],
            onExtraTurn: [],
            onRender: []  // 描画完了イベント
        };

        // ゲーム設定
        this.infiniteDeck = true;
        this.autoRefillDeck = [];
        this.cardBackColor = {
            gradient1: '#1e3a8a',
            gradient2: '#1e1b4b'
        };
        this.extraTurns = {
            player: 0,
            opponent: 0
        };
    }

    // ==========================================
    // 描画システム初期化
    // ==========================================

    /**
     * 描画システムをセット
     */
    setRenderingSystem(renderer) {
        this.rendering = renderer;
        console.log('🎴 描画システムをセットしました');
    }

    // ==========================================
    // 再行動システム
    // ==========================================

    grantExtraTurn(target = 'player', count = 1) {
        if (target === 'player') {
            this.extraTurns.player += count;
        } else if (target === 'opponent') {
            this.extraTurns.opponent += count;
        }

        this.triggerEvent('onExtraTurn', { target, count, total: this.extraTurns[target] });
        console.log(`🔄 ${target} に再行動 x${count} を付与しました（合計: ${this.extraTurns[target]}）`);
    }

    useExtraTurn(target = 'player') {
        if (target === 'player' && this.extraTurns.player > 0) {
            this.extraTurns.player--;
            console.log(`🔄 ${target} が再行動を消費しました（残り: ${this.extraTurns.player}）`);
            return true;
        } else if (target === 'opponent' && this.extraTurns.opponent > 0) {
            this.extraTurns.opponent--;
            console.log(`🔄 ${target} が再行動を消費しました（残り: ${this.extraTurns.opponent}）`);
            return true;
        }
        return false;
    }

    getExtraTurns(target = 'player') {
        return target === 'player' ? this.extraTurns.player : this.extraTurns.opponent;
    }

    resetExtraTurns(target = 'all') {
        if (target === 'player' || target === 'all') {
            this.extraTurns.player = 0;
        }
        if (target === 'opponent' || target === 'all') {
            this.extraTurns.opponent = 0;
        }
        console.log(`🔄 再行動をリセットしました: ${target}`);
    }

    hasExtraTurn(target = 'player') {
        return this.getExtraTurns(target) > 0;
    }

    // ==========================================
    // 見た目のカスタマイズ
    // ==========================================

    setCardBackColor(color1, color2 = null) {
        this.cardBackColor.gradient1 = color1;
        this.cardBackColor.gradient2 = color2 || color1;

        if (this.rendering) {
            this.rendering.setCardBackColor(color1, color2);
        }

        console.log(`🎨 カード裏面色を変更: ${color1} → ${this.cardBackColor.gradient2}`);
    }

    setCardBackPreset(presetName) {
        const presets = {
            'blue': { gradient1: '#1e3a8a', gradient2: '#1e1b4b' },
            'red': { gradient1: '#991b1b', gradient2: '#7f1d1d' },
            'green': { gradient1: '#065f46', gradient2: '#064e3b' },
            'purple': { gradient1: '#6b21a8', gradient2: '#581c87' },
            'gold': { gradient1: '#b45309', gradient2: '#78350f' },
            'black': { gradient1: '#1f2937', gradient2: '#111827' }
        };

        if (presets[presetName]) {
            this.cardBackColor = { ...presets[presetName] };
            if (this.rendering) {
                this.rendering.setCardBackPreset(presetName);
            }
            console.log(`🎨 プリセット "${presetName}" を適用しました`);
        }
    }

    getCardBackColor() {
        return { ...this.cardBackColor };
    }

    // ==========================================
    // カード定義の登録
    // ==========================================

    defineCard(id, data) {
        this.cardDefinitions.set(id, {
            id: id,
            title: data.title || '???',
            description: data.description || '',
            effectId: data.effectId || null,
            iconSlug: data.iconSlug || null,
            iconType: data.iconType || 'icons8'
        });
    }

    setCardDescription(cardId, description, effectId = null) {
        const card = this.cardDefinitions.get(cardId);
        if (card) {
            card.description = description;
            if (effectId !== null) {
                card.effectId = effectId;
            }
            console.log(`✏️ カード "${cardId}" の説明を更新しました`);
        } else {
            console.warn(`⚠️ カードID "${cardId}" が見つかりません`);
        }
    }

    setCardIcon(cardId, iconSlug, iconType = 'icons8') {
        const card = this.cardDefinitions.get(cardId);
        if (card) {
            card.iconSlug = iconSlug;
            card.iconType = iconType;
            console.log(`🖼️ カード "${cardId}" のアイコンを更新しました`);
        } else {
            console.warn(`⚠️ カードID "${cardId}" が見つかりません`);
        }
    }

    setCardDescriptions(descriptions) {
        Object.entries(descriptions).forEach(([cardId, desc]) => {
            this.setCardDescription(cardId, desc);
        });
    }

    setCardEffectIds(effects) {
        Object.entries(effects).forEach(([cardId, effectId]) => {
            const card = this.cardDefinitions.get(cardId);
            if (card) {
                card.effectId = effectId;
            }
        });
    }

    defineCards(cards) {
        cards.forEach(card => {
            this.defineCard(card.id, card);
        });
    }

    registerEffect(effectId, effectFunction) {
        this.cardEffects.set(effectId, effectFunction);
    }

    registerEffects(effects) {
        Object.entries(effects).forEach(([effectId, func]) => {
            this.registerEffect(effectId, func);
        });
    }

    // ==========================================
    // デッキ管理
    // ==========================================

    initializeDeck(cardIds, infiniteDeck = true) {
        this.deck = cardIds.map(id => this.createCardInstance(id));
        this.autoRefillDeck = [...cardIds];
        this.infiniteDeck = infiniteDeck;
        this.shuffleDeck();
    }

    createCardInstance(cardId) {
        const definition = this.cardDefinitions.get(cardId);
        if (!definition) {
            console.warn(`カードID "${cardId}" が見つかりません`);
            return {
                id: 'unknown',
                title: '???',
                description: '不明なカード',
                effectId: null
            };
        }
        return { ...definition };
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    getDeckCount() {
        return this.deck.length;
    }

    refillDeck() {
        if (this.autoRefillDeck.length > 0) {
            this.deck = this.autoRefillDeck.map(id => this.createCardInstance(id));
            this.shuffleDeck();
            console.log('🔄 デッキを補充しました');
        }
    }

    // ==========================================
    // カード操作
    // ==========================================

    drawCard(target = 'player', count = 1) {
        const drawnCards = [];

        for (let i = 0; i < count; i++) {
            if (this.deck.length === 0) {
                if (this.infiniteDeck) {
                    this.refillDeck();
                } else {
                    console.warn('デッキが空です');
                    this.triggerEvent('onDeckEmpty', {});
                    break;
                }
            }

            const card = this.deck.pop();

            if (target === 'player') {
                this.playerHand.push(card);
            } else if (target === 'opponent') {
                this.opponentHand.push(card);
            }

            drawnCards.push(card);
            this.triggerEvent('onCardDraw', { card, target, totalDrawn: i + 1, requestedCount: count });
        }

        return drawnCards;
    }

    addCardToHand(target = 'player', cardId) {
        const card = this.createCardInstance(cardId);

        if (target === 'player') {
            this.playerHand.push(card);
        } else if (target === 'opponent') {
            this.opponentHand.push(card);
        }

        return card;
    }

    removeCardFromHand(target = 'player', index, addToDiscard = false) {
        const hand = target === 'player' ? this.playerHand : this.opponentHand;

        if (index < 0 || index >= hand.length) {
            console.warn('無効なカードインデックス');
            return null;
        }

        const card = hand.splice(index, 1)[0];

        if (addToDiscard) {
            this.discardPile.push(card);
        }

        return card;
    }

    clearHand(target = 'player', addToDiscard = false) {
        const hand = target === 'player' ? this.playerHand : this.opponentHand;

        if (addToDiscard) {
            this.discardPile.push(...hand);
        }

        if (target === 'player') {
            this.playerHand = [];
        } else {
            this.opponentHand = [];
        }
    }

    useCard(target = 'player', index = 0, context = {}) {
        const hand = target === 'player' ? this.playerHand : this.opponentHand;

        if (index < 0 || index >= hand.length) {
            console.warn('無効なカードインデックス');
            return null;
        }

        const card = hand.splice(index, 1)[0];
        this.discardPile.push(card);

        if (card.effectId && this.cardEffects.has(card.effectId)) {
            const effectFunction = this.cardEffects.get(card.effectId);
            effectFunction(this, { target, card, ...context });
        } else if (card.effectId) {
            console.warn(`効果ID "${card.effectId}" が登録されていません`);
        }

        this.triggerEvent('onCardUse', { card, target, context });
        return card;
    }

    discardCard(target = 'player', index = 0) {
        const hand = target === 'player' ? this.playerHand : this.opponentHand;

        if (index < 0 || index >= hand.length) {
            console.warn('無効なカードインデックス');
            return null;
        }

        const card = hand.splice(index, 1)[0];
        this.discardPile.push(card);

        this.triggerEvent('onCardDiscard', { card, target });
        return card;
    }

    getHand(target = 'player') {
        return target === 'player' ? [...this.playerHand] : [...this.opponentHand];
    }

    getHandCount(target = 'player') {
        return target === 'player' ? this.playerHand.length : this.opponentHand.length;
    }

    // ==========================================
    // ゲーム管理
    // ==========================================

    resetGame() {
        this.deck = [];
        this.playerHand = [];
        this.opponentHand = [];
        this.discardPile = [];
        this.resetExtraTurns('all');
        this.triggerEvent('onGameReset', {});
    }

    // ==========================================
    // イベントシステム
    // ==========================================

    on(eventName, callback) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName].push(callback);
        }
    }

    triggerEvent(eventName, data) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName].forEach(callback => callback(data));
        }
    }

    // ==========================================
    // デバッグ用
    // ==========================================

    debugState() {
        console.log('=== Card Game State ===');
        console.log('Deck:', this.deck.length, 'cards');
        console.log('Player Hand:', this.playerHand.length, 'cards', this.playerHand);
        console.log('Opponent Hand:', this.opponentHand.length, 'cards');
        console.log('Discard Pile:', this.discardPile.length, 'cards');
    }
}

// ==========================================
// カード描画システム - Card Rendering System
// ==========================================

/**
 * 高品質カード描画マネージャー
 * info-box.htmlのデザイン + アニメーション統合
 */
class CardRenderingSystem {
    constructor() {
        this.playerHandContainer = null;
        this.cpuHandContainer = null;
        this.deckContainer = null;
        this.cardBackColor = {
            gradient1: '#1e3a8a',
            gradient2: '#1e1b4b'
        };
    }

    /**
     * 初期化
     */
    init(playerHandSelector, cpuHandSelector = null, deckSelector = null) {
        this.playerHandContainer = document.querySelector(playerHandSelector);
        this.cpuHandContainer = cpuHandSelector ? document.querySelector(cpuHandSelector) : null;
        this.deckContainer = deckSelector ? document.querySelector(deckSelector) : null;

        if (!this.playerHandContainer) {
            console.warn('⚠️ プレイヤーの手札コンテナが見つかりません:', playerHandSelector);
        }
        console.log('🎴 カード描画システムを初期化しました');
    }

    /**
     * カード裏面の色を設定（全体）
     */
    setCardBackColor(color1, color2 = null) {
        this.cardBackColor.gradient1 = color1;
        this.cardBackColor.gradient2 = color2 || color1;
        console.log(`🎨 カード裏面色を変更: ${color1} → ${this.cardBackColor.gradient2}`);
    }

    /**
     * プリセット色を設定
     */
    setCardBackPreset(presetName) {
        const presets = {
            'blue': { gradient1: '#1e3a8a', gradient2: '#1e1b4b' },
            'red': { gradient1: '#991b1b', gradient2: '#7f1d1d' },
            'green': { gradient1: '#065f46', gradient2: '#064e3b' },
            'purple': { gradient1: '#6b21a8', gradient2: '#581c87' },
            'gold': { gradient1: '#b45309', gradient2: '#78350f' },
            'black': { gradient1: '#1f2937', gradient2: '#111827' }
        };

        if (presets[presetName]) {
            this.cardBackColor = { ...presets[presetName] };
            console.log(`🎨 プリセット "${presetName}" を適用しました`);
        }
    }

    /**
     * 手札内のカードレイアウトを更新（リアルなスタッキング）
     */
    updateCardLayout(container) {
        if (!container) return;

        const cards = Array.from(container.querySelectorAll('.card-back-mini:not(.card-exit)'));
        const count = cards.length;

        if (count === 0) return;

        const containerWidth = container.offsetWidth || 210;
        const cardWidth = 30;

        let negativeMargin = -10;
        if (count * (cardWidth + negativeMargin) > containerWidth) {
            negativeMargin = (containerWidth - cardWidth) / (count - 1) - cardWidth;
        }

        cards.forEach((card, i) => {
            card.style.marginLeft = i === 0 ? '0px' : `${negativeMargin}px`;
            card.style.zIndex = i;
            card.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });
    }

    /**
     * プレイヤー手札のカード配置を更新（画面下部中央基準）
     */
    updatePlayerCardLayout() {
        if (!this.playerHandContainer) return;

        const cards = Array.from(this.playerHandContainer.querySelectorAll('.card:not(.card-exit)'));
        const count = cards.length;

        if (count === 0) return;

        // 利用可能な幅を取得（余白を考慮）
        const containerWidth = this.playerHandContainer.offsetWidth || window.innerWidth - 80;
        const cardWidth = 110;
        let gap = 35; // カード間隔

        // 手札が幅を超える場合は間隔を自動調整
        const totalWidth = (count - 1) * gap + cardWidth;
        if (totalWidth > containerWidth) {
            gap = Math.max(10, (containerWidth - cardWidth) / (count - 1));
        }

        // 中心揃えの計算
        const actualTotalWidth = (count - 1) * gap;
        const centerOffset = actualTotalWidth / 2;

        cards.forEach((card, index) => {
            // 中心揃えで配置
            const offsetX = index * gap - centerOffset;
            card.style.left = `calc(50% + ${offsetX}px)`;
            card.style.zIndex = index; // カード番号が大きいほど前面
        });
    }

    /**
     * カードを手札に追加（アニメーション付き）
     */
    addCardToContainer(container, color1 = null, color2 = null) {
        if (!container) return;

        const card = document.createElement('div');
        card.className = 'card-back-mini card-enter';

        const gradColor1 = color1 || this.cardBackColor.gradient1;
        const gradColor2 = color2 || this.cardBackColor.gradient2;
        card.style.background = `linear-gradient(135deg, ${gradColor1} 0%, ${gradColor2} 100%)`;
        card.style.setProperty('--this-color-1', gradColor1);
        card.style.setProperty('--this-color-2', gradColor2);

        container.appendChild(card);

        card.offsetHeight;

        this.updateCardLayout(container);

        setTimeout(() => {
            card.classList.remove('card-enter');
            card.classList.add('card-ready');
        }, 50);

        return card;
    }

    /**
     * カードを手札から削除（アニメーション付き）
     */
    removeCardFromContainer(container, index = -1) {
        if (!container) return;

        const activeCards = container.querySelectorAll('.card-back-mini:not(.card-exit)');
        if (activeCards.length === 0) return;

        const targetCard = index >= 0 && index < activeCards.length
            ? activeCards[index]
            : activeCards[activeCards.length - 1];

        targetCard.classList.add('card-exit');

        this.updateCardLayout(container);

        setTimeout(() => {
            if (targetCard.parentNode === container) {
                container.removeChild(targetCard);
                this.updateCardLayout(container);
            }
        }, 300);
    }

    /**
     * CPUの手札にカードを追加
     */
    addCPUCard(color1 = null, color2 = null) {
        if (!this.cpuHandContainer) return;
        return this.addCardToContainer(this.cpuHandContainer, color1, color2);
    }

    /**
     * CPUの手札からカードを削除
     */
    removeCPUCard(index = -1) {
        if (!this.cpuHandContainer) return;
        this.removeCardFromContainer(this.cpuHandContainer, index);
    }

    /**
     * プレイヤーの大型カード（110x154px）を手札に追加
     * 裏面表示で高品質な背デザイン（色分けあり）
     */
    addPlayerCard(cardData, color1 = null, color2 = null, animate = true) {
        if (!this.playerHandContainer) return;

        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.index = this.playerHandContainer.children.length;
        card.dataset.cardId = cardData.id || '';
        card.dataset.title = cardData.name || cardData.title || '???';
        card.dataset.desc = cardData.description || '';

        // プレイヤーのカードは裏面表示
        const back = document.createElement('div');

        // カラークラスを追加（色分け用）
        const colorClass = cardData.color || 'blue';
        back.className = `card-back ${colorClass}`;

        card.appendChild(back);

        if (animate) {
            // 山札から手札へのアニメーション
            this.animateCardFromDeck(card);
        } else {
            // アニメーションなしで直接追加
            card.className = 'card card-enter';
            this.playerHandContainer.appendChild(card);
            card.offsetHeight;
            setTimeout(() => {
                card.classList.remove('card-enter');
                card.classList.add('card-ready');
            }, 50);
        }

        return card;
    }

    /**
     * 山札から手札へのカードアニメーション
     */
    animateCardFromDeck(cardEl) {
        const field = document.getElementById('field');
        const handBottom = document.getElementById('hand-bottom');
        const deckArea = document.getElementById('deck-area');

        if (!field || !handBottom || !deckArea) {
            // フォールバック: アニメーションなしで追加
            cardEl.className = 'card card-enter';
            this.playerHandContainer.appendChild(cardEl);
            cardEl.offsetHeight;
            setTimeout(() => {
                cardEl.classList.remove('card-enter');
                cardEl.classList.add('card-ready');
                this.updatePlayerCardLayout();
            }, 50);
            return;
        }

        // フィールドに一時追加
        field.appendChild(cardEl);

        // 山札の位置を取得
        const deckRect = deckArea.getBoundingClientRect();
        const fieldRect = field.getBoundingClientRect();

        // 現在の手札の枚数を確認（新しいカードを含まない）
        const currentHandCount = this.playerHandContainer.querySelectorAll('.card:not(.card-exit)').length;
        const newCardIndex = currentHandCount; // 新しいカードのインデックス
        const totalCardsAfterAdd = currentHandCount + 1; // 追加後の総カード数

        // 利用可能な幅を取得（余白を考慮）
        const containerWidth = this.playerHandContainer.offsetWidth || window.innerWidth - 80;
        const cardWidth = 110;
        let gap = 35;

        // 手札が幅を超える場合は間隔を自動調整
        const totalWidthCheck = (totalCardsAfterAdd - 1) * gap + cardWidth;
        if (totalWidthCheck > containerWidth) {
            gap = Math.max(10, (containerWidth - cardWidth) / (totalCardsAfterAdd - 1));
        }

        // 中心揃えの計算（追加後の状態で）
        const totalWidth = (totalCardsAfterAdd - 1) * gap;
        const centerOffset = totalWidth / 2;
        const offsetX = newCardIndex * gap - centerOffset;

        // 既存のカードの位置を更新（新しいカードが追加されることを考慮）
        const existingCards = Array.from(this.playerHandContainer.querySelectorAll('.card:not(.card-exit)'));
        existingCards.forEach((card, index) => {
            const existingOffsetX = index * gap - centerOffset;
            card.style.left = `calc(50% + ${existingOffsetX}px)`;
        });

        // 山札の中心座標（フィールド基準）
        const deckCenterX = deckRect.left - fieldRect.left + deckRect.width / 2;
        const deckCenterY = deckRect.top - fieldRect.top + deckRect.height / 2;

        // カードを山札の位置に配置
        cardEl.style.position = 'absolute';
        cardEl.style.left = `${deckCenterX - 55}px`; // カードの幅の半分
        cardEl.style.top = `${deckCenterY - 77}px`;  // カードの高さの半分
        cardEl.style.zIndex = '5000';
        cardEl.style.transition = 'all 0.6s cubic-bezier(0.19, 1, 0.22, 1)';

        // 強制レイアウト更新
        cardEl.offsetHeight;

        // 手札コンテナの位置を取得
        const handContainerRect = this.playerHandContainer.getBoundingClientRect();

        // 目標位置を計算（手札の最終位置）
        // bottom: 10px, left: calc(50% + offsetX) を絶対座標に変換
        const targetX = handContainerRect.left - fieldRect.left + handContainerRect.width / 2 + offsetX - 55;
        const targetY = handContainerRect.bottom - fieldRect.top - 10 - 154;

        // スムーズに手札の位置へ移動
        requestAnimationFrame(() => {
            cardEl.style.left = `${targetX}px`;
            cardEl.style.top = `${targetY}px`;

            // アニメーション終了後、実際の手札コンテナに移動
            setTimeout(() => {
                // transitionを一時的に無効化して瞬間移動を防ぐ
                cardEl.style.transition = 'none';

                if (cardEl.parentNode === field) {
                    field.removeChild(cardEl);
                }
                this.playerHandContainer.appendChild(cardEl);

                // スタイルをクリア（leftは残す）
                cardEl.style.position = '';
                cardEl.style.top = '';
                cardEl.style.zIndex = '';
                cardEl.classList.add('card-ready');

                // レイアウトを更新してleftを正しく設定
                this.updatePlayerCardIndices();
                this.updatePlayerCardLayout();

                // 強制レンダリングしてからtransitionを再度有効化
                cardEl.offsetHeight;
                cardEl.style.transition = '';
            }, 650); // transitionが完全に完了してから実行
        });
    }

    /**
     * プレイヤー手札からカードを削除
     */
    removePlayerCard(index = -1) {
        if (!this.playerHandContainer) return;

        const cards = this.playerHandContainer.querySelectorAll('.card:not(.card-exit)');
        if (cards.length === 0) return;

        const targetCard = index >= 0 && index < cards.length
            ? cards[index]
            : cards[cards.length - 1];

        targetCard.classList.add('card-exit');

        // 削除前に残りのカードのレイアウトを更新
        setTimeout(() => {
            this.updatePlayerCardLayout();
        }, 50);

        setTimeout(() => {
            if (targetCard.parentNode === this.playerHandContainer) {
                this.playerHandContainer.removeChild(targetCard);
                this.updatePlayerCardIndices();
                this.updatePlayerCardLayout();
            }
        }, 400);
    }

    /**
     * プレイヤーの手札インデックスを更新
     */
    updatePlayerCardIndices() {
        if (!this.playerHandContainer) return;

        Array.from(this.playerHandContainer.querySelectorAll('.card')).forEach((card, index) => {
            card.dataset.index = index;
        });

        // インデックス更新後、レイアウトも更新
        this.updatePlayerCardLayout();
    }

    /**
     * プレイヤー手札を完全に再レンダリング
     */
    renderPlayerHand(cards) {
        if (!this.playerHandContainer) return;

        this.playerHandContainer.innerHTML = '';

        cards.forEach((card, index) => {
            this.addPlayerCard(card);
        });
    }

    /**
     * すべての手札をクリア
     */
    clearAllHands() {
        if (this.playerHandContainer) {
            this.playerHandContainer.innerHTML = '';
        }
        if (this.cpuHandContainer) {
            this.cpuHandContainer.innerHTML = '';
        }
    }

    /**
     * プレイヤーの手札数を取得
     */
    getPlayerCardCount() {
        if (!this.playerHandContainer) return 0;
        return this.playerHandContainer.querySelectorAll('.card:not(.card-exit)').length;
    }

    /**
     * CPU の手札数を取得
     */
    getCPUCardCount() {
        if (!this.cpuHandContainer) return 0;
        return this.cpuHandContainer.querySelectorAll('.card-back-mini:not(.card-exit)').length;
    }

    /**
     * デッキの初期化と表示設定
     */
    initializeDeckDisplay(deckSelector, initialCardCount = 30) {
        this.deckContainer = document.querySelector(deckSelector);
        if (!this.deckContainer) return;

        this.deckContainer.dataset.cardCount = initialCardCount;
        const deckLabel = this.deckContainer.querySelector('.deck-label');
        if (deckLabel) {
            deckLabel.textContent = initialCardCount;
        }
        console.log(`🎴 デッキを初期化: ${initialCardCount}枚`);
    }

    /**
     * デッキの表示カウントを更新
     */
    updateDeckCount(newCount) {
        if (!this.deckContainer) return;

        this.deckContainer.dataset.cardCount = newCount;
        const deckLabel = this.deckContainer.querySelector('.deck-label');
        if (deckLabel) {
            deckLabel.textContent = newCount;
        }
    }

    /**
     * デッキスタックの再描画
     */
    renderDeckStack(count) {
        if (!this.deckContainer) return;

        const deckStack = this.deckContainer.querySelector('.deck-stack');
        if (!deckStack) return;

        deckStack.innerHTML = '';

        // 最大3枚まで表示
        const displayCount = Math.min(count, 3);
        for (let i = 0; i < displayCount; i++) {
            const stackCard = document.createElement('div');
            stackCard.className = 'card-back-stack';
            deckStack.appendChild(stackCard);
        }
    }

    /**
     * デッキからプレイヤーの手札へカードをドロー（アニメーション付き）
     */
    executeDeckCardDraw(callback) {
        if (!this.deckContainer || !this.playerHandContainer) {
            if (callback) callback();
            return;
        }

        // 新しいカード要素を作成（アニメーション対象）
        const newCard = document.createElement('div');
        newCard.className = 'card card-draw';
        newCard.dataset.index = this.playerHandContainer.children.length;
        newCard.dataset.title = 'ドロー中...';
        newCard.dataset.desc = '';

        // カード裏面を作成
        const back = document.createElement('div');
        back.className = 'card-back blue';
        newCard.appendChild(back);

        // アニメーション用の位置を計算
        const deckRect = this.deckContainer.getBoundingClientRect();
        const playerHandRect = this.playerHandContainer.getBoundingClientRect();

        const startX = deckRect.left - playerHandRect.left;
        const startY = deckRect.top - playerHandRect.top;

        newCard.style.setProperty('--start-x', `${startX}px`);
        newCard.style.setProperty('--start-y', `${startY}px`);

        this.playerHandContainer.appendChild(newCard);

        // アニメーション完了後の処理
        newCard.addEventListener('animationend', () => {
            // アニメーション完了後、一時的なカードを削除
            if (newCard.parentNode === this.playerHandContainer) {
                this.playerHandContainer.removeChild(newCard);
            }
            if (callback) callback();
        }, { once: true });

        // 強制レイアウト更新（アニメーション開始を保証）
        newCard.offsetHeight;
    }

    /**
     * カード使用演出（プレイヤー手札から削除）
     */
    executeCardUseAnimation(cardIndex = -1, callback) {
        if (!this.playerHandContainer) {
            if (callback) callback();
            return;
        }

        const cards = this.playerHandContainer.querySelectorAll('.card:not(.card-exit):not(.card-use)');
        if (cards.length === 0) {
            if (callback) callback();
            return;
        }

        const targetCard = cardIndex >= 0 && cardIndex < cards.length
            ? cards[cardIndex]
            : cards[cards.length - 1];

        targetCard.classList.add('card-use');

        // 使用開始時に残りのカードのレイアウトを更新
        setTimeout(() => {
            this.updatePlayerCardLayout();
        }, 50);

        // アニメーション完了後にDOMから削除
        targetCard.addEventListener('animationend', () => {
            if (targetCard.parentNode === this.playerHandContainer) {
                this.playerHandContainer.removeChild(targetCard);
                this.updatePlayerCardIndices();
                this.updatePlayerCardLayout();
            }
            if (callback) callback();
        }, { once: true });
    }
}

// ==========================================
// グローバルインスタンス
// ==========================================

const cardGame = new CardGameManager();
const cardRenderer = new CardRenderingSystem();

// 描画システムをゲームに統合
cardGame.setRenderingSystem(cardRenderer);

// ==========================================
// ゲーム流連動 - Game Flow Integration
// ==========================================

/**
 * カード描画との自動連動を設定
 */
function setupGameFlowIntegration() {
    // プレイヤーがカードをドローしたとき
    cardGame.on('onCardDraw', (data) => {
        if (data.target === 'player' && cardRenderer.playerHandContainer) {
            console.log(`🎴 プレイヤーがカードをドロー: ${data.card.title}`);
            // プレイヤー手札はui.jsで管理されるため、ここでは何もしない
        } else if (data.target === 'opponent' && cardRenderer.cpuHandContainer) {
            console.log(`🎴 CPUがカードをドロー`);
            // 既存のカード数をカウント
            const currentCount = cardRenderer.cpuHandContainer.querySelectorAll('.card-back-mini:not(.card-exit)').length;
            const targetCount = cardGame.getHandCount('opponent');

            if (targetCount > currentCount) {
                cardRenderer.addCPUCard();
            }
        }
    });

    // カードが使用されたとき
    cardGame.on('onCardUse', (data) => {
        if (data.target === 'opponent' && cardRenderer.cpuHandContainer) {
            console.log(`🎴 CPUがカードを使用: ${data.card.title}`);
            cardRenderer.removeCPUCard();
        }
    });

    // カードが捨てられたとき
    cardGame.on('onCardDiscard', (data) => {
        if (data.target === 'opponent' && cardRenderer.cpuHandContainer) {
            console.log(`🎴 CPUがカードを捨てた: ${data.card.title}`);
            cardRenderer.removeCPUCard();
        }
    });

    // ゲームがリセットされたとき
    cardGame.on('onGameReset', () => {
        console.log('🔄 ゲームをリセット - カードもクリア');
        cardRenderer.clearAllHands();
    });

    console.log('✅ ゲーム流連動を設定しました');
}

// ==========================================
// 初期化
// ==========================================

if (typeof window !== 'undefined') {
    window.cardGame = cardGame;
    window.cardRenderer = cardRenderer;

    // DOMが読み込まれたら統合設定を実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupGameFlowIntegration();
        });
    } else {
        setupGameFlowIntegration();
    }
}

// Node.js環境用のエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CardGameManager, cardGame, CardRenderingSystem, cardRenderer };
}
