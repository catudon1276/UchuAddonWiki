// ==========================================
// Card Game Manager - card.js
// ==========================================

class CardGameManager {
    constructor() {
        this.deck = [];
        this.playerHand = [];
        this.opponentHand = [];
        this.discardPile = [];
        this.cardDefinitions = new Map();
        this.cardEffects = new Map();
        this.eventListeners = {
            onCardDraw: [],
            onCardUse: [],
            onCardDiscard: [],
            onGameReset: [],
            onDeckEmpty: [],
            onExtraTurn: []
        };
        this.infiniteDeck = true;
        this.autoRefillDeck = [];
        this.cardBackColor = {
            gradient1: '#1e3a8a',
            gradient2: '#1e1b4b'
        };
        this.extraTurns = { player: 0, opponent: 0 };
    }

    // 再行動システム
    grantExtraTurn(target = 'player', count = 1) {
        this.extraTurns[target] = (this.extraTurns[target] || 0) + count;
        this.triggerEvent('onExtraTurn', { target, count, total: this.extraTurns[target] });
    }

    useExtraTurn(target = 'player') {
        if (this.extraTurns[target] > 0) {
            this.extraTurns[target]--;
            return true;
        }
        return false;
    }

    getExtraTurns(target = 'player') {
        return this.extraTurns[target] || 0;
    }

    resetExtraTurns(target = 'all') {
        if (target === 'all') {
            this.extraTurns = { player: 0, opponent: 0 };
        } else {
            this.extraTurns[target] = 0;
        }
    }

    hasExtraTurn(target = 'player') {
        return this.getExtraTurns(target) > 0;
    }

    // カード裏面色
    setCardBackColor(color1, color2 = null) {
        this.cardBackColor.gradient1 = color1;
        this.cardBackColor.gradient2 = color2 || color1;
        this.updateAllCardBacks();
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
            this.updateAllCardBacks();
        }
    }

    updateAllCardBacks() {
        document.querySelectorAll('.card-back').forEach(back => {
            back.style.background = `linear-gradient(135deg, ${this.cardBackColor.gradient1} 0%, ${this.cardBackColor.gradient2} 100%)`;
        });
    }

    // カード定義
    defineCard(id, data) {
        this.cardDefinitions.set(id, {
            id,
            title: data.title || '???',
            description: data.description || '',
            effectId: data.effectId || null,
            iconSlug: data.iconSlug || null,
            iconType: data.iconType || 'icons8',
            color: data.color || 'blue'
        });
    }

    defineCards(cards) {
        cards.forEach(c => this.defineCard(c.id, c));
    }

    setCardDescription(cardId, description, effectId = null) {
        const card = this.cardDefinitions.get(cardId);
        if (card) {
            card.description = description;
            if (effectId !== null) card.effectId = effectId;
        }
    }

    setCardIcon(cardId, iconSlug, iconType = 'icons8') {
        const card = this.cardDefinitions.get(cardId);
        if (card) {
            card.iconSlug = iconSlug;
            card.iconType = iconType;
        }
    }

    registerEffect(effectId, effectFunction) {
        this.cardEffects.set(effectId, effectFunction);
    }

    registerEffects(effects) {
        Object.entries(effects).forEach(([id, fn]) => this.registerEffect(id, fn));
    }

    // デッキ管理
    initializeDeck(cardIds, infiniteDeck = true) {
        this.deck = cardIds.map(id => this.createCardInstance(id));
        this.autoRefillDeck = [...cardIds];
        this.infiniteDeck = infiniteDeck;
        this.shuffleDeck();
    }

    createCardInstance(cardId) {
        const def = this.cardDefinitions.get(cardId);
        if (!def) return { id: 'unknown', title: '???', description: '', effectId: null, color: 'blue' };
        return { ...def };
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    getDeckCount() { return this.deck.length; }

    refillDeck() {
        if (this.autoRefillDeck.length > 0) {
            this.deck = this.autoRefillDeck.map(id => this.createCardInstance(id));
            this.shuffleDeck();
        }
    }

    // カード操作
    drawCard(target = 'player', count = 1) {
        const drawn = [];
        for (let i = 0; i < count; i++) {
            if (this.deck.length === 0) {
                if (this.infiniteDeck) this.refillDeck();
                else { this.triggerEvent('onDeckEmpty', {}); break; }
            }
            const card = this.deck.pop();
            if (target === 'player') this.playerHand.push(card);
            else this.opponentHand.push(card);
            drawn.push(card);
            this.triggerEvent('onCardDraw', { card, target });
        }
        return drawn;
    }

    addCardToHand(target, cardId) {
        const card = this.createCardInstance(cardId);
        if (target === 'player') this.playerHand.push(card);
        else this.opponentHand.push(card);
        return card;
    }

    removeCardFromHand(target, index, toDiscard = false) {
        const hand = target === 'player' ? this.playerHand : this.opponentHand;
        if (index < 0 || index >= hand.length) return null;
        const card = hand.splice(index, 1)[0];
        if (toDiscard) this.discardPile.push(card);
        return card;
    }

    clearHand(target, toDiscard = false) {
        const hand = target === 'player' ? this.playerHand : this.opponentHand;
        if (toDiscard) this.discardPile.push(...hand);
        if (target === 'player') this.playerHand = [];
        else this.opponentHand = [];
    }

    useCard(target = 'player', index = 0, context = {}) {
        const hand = target === 'player' ? this.playerHand : this.opponentHand;
        if (index < 0 || index >= hand.length) return null;
        const card = hand.splice(index, 1)[0];
        this.discardPile.push(card);

        if (card.effectId && this.cardEffects.has(card.effectId)) {
            this.cardEffects.get(card.effectId)(this, { target, card, ...context });
        }
        this.triggerEvent('onCardUse', { card, target, context });
        return card;
    }

    discardCard(target, index) {
        const hand = target === 'player' ? this.playerHand : this.opponentHand;
        if (index < 0 || index >= hand.length) return null;
        const card = hand.splice(index, 1)[0];
        this.discardPile.push(card);
        this.triggerEvent('onCardDiscard', { card, target });
        return card;
    }

    getHand(target) {
        return target === 'player' ? [...this.playerHand] : [...this.opponentHand];
    }

    getHandCount(target) {
        return target === 'player' ? this.playerHand.length : this.opponentHand.length;
    }

    resetGame() {
        this.deck = [];
        this.playerHand = [];
        this.opponentHand = [];
        this.discardPile = [];
        this.resetExtraTurns('all');
        this.triggerEvent('onGameReset', {});
    }

    // イベント
    on(event, callback) {
        if (this.eventListeners[event]) this.eventListeners[event].push(callback);
    }

    triggerEvent(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(cb => cb(data));
        }
    }

    // アイコン取得
    getCardIcon(card) {
        if (!card.iconSlug) return { slug: '?', type: 'text', url: null };
        const type = card.iconType || 'icons8';
        if (type === 'text') return { slug: card.iconSlug, type: 'text', url: null };
        const url = type === 'local' ? card.iconSlug : `https://img.icons8.com/fluency/96/${card.iconSlug}.png`;
        return { slug: card.iconSlug, type, url };
    }
}

// グローバルインスタンス
const cardGame = new CardGameManager();

// チンチロ用カード定義
cardGame.defineCards([
    // 赤（攻撃）
    { id: 'sara_shoumetu', title: '皿消滅', description: '相手を確定ションベンにする', effectId: 'force_shonben', color: 'red', iconSlug: 'delete-database' },
    { id: 'hikime_yudo', title: '低目誘導', description: '相手に1~3が出やすくなる(+40%)', effectId: 'low_bias', color: 'red', iconSlug: 'down-arrow' },
    // 青（防御/バフ）
    { id: 'takame_yudo', title: '高目誘導', description: '自分に4~6が出やすくなる(+40%)', effectId: 'high_bias', color: 'blue', iconSlug: 'up-arrow' },
    { id: 'shonben_keigen', title: 'ションベン軽減', description: 'ションベンのペナルティを無効化', effectId: 'shonben_immune', color: 'blue', iconSlug: 'shield' },
    // 緑（リソース）
    { id: 'muryo_draw', title: '無料ドロー', description: 'コストなしでカードを3枚引く', effectId: 'free_draw', color: 'green', iconSlug: 'card-pickup' },
    { id: 'furikae', title: '振り替え', description: 'もう一度振り直せる', effectId: 'reroll', color: 'green', iconSlug: 'refresh' },
    // 黄（ギャンブル）
    { id: 'coin_toss', title: '特殊勝利', description: 'コイントス4連続表で即勝利', effectId: 'coin_win', color: 'yellow', iconSlug: 'coin' },
    { id: 'double_bet', title: '倍プッシュ', description: '掛け金を2倍にする', effectId: 'double', color: 'yellow', iconSlug: 'gold-bars' },
    // 黒（特殊）
    { id: 'ijigen_dice', title: '異次元ダイス', description: '九面賽ルールに変更', effectId: 'nine_dice', color: 'black', iconSlug: 'dice' },
    { id: 'nazo_seibutsu', title: '謎生物', description: '相手ダイスに呪い。1つで-2倍、3揃いで-10倍', effectId: 'curse', color: 'black', iconSlug: 'ghost' }
]);

// デッキ初期化
cardGame.initializeDeck([
    'sara_shoumetu', 'hikime_yudo', 'takame_yudo', 'shonben_keigen',
    'muryo_draw', 'furikae', 'coin_toss', 'double_bet', 'ijigen_dice', 'nazo_seibutsu',
    'sara_shoumetu', 'hikime_yudo', 'takame_yudo', 'shonben_keigen',
    'muryo_draw', 'furikae', 'coin_toss', 'double_bet', 'ijigen_dice', 'nazo_seibutsu'
], true);

window.cardGame = cardGame;