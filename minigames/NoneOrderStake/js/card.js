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
        this.cardEffects = new Map();  // 効果関数を別管理
        this.eventListeners = {
            onCardDraw: [],
            onCardUse: [],
            onCardDiscard: [],
            onGameReset: [],
            onDeckEmpty: [],
            onExtraTurn: []  // 再行動イベント
        };
        this.infiniteDeck = true;  // 無限ドロー有効
        this.autoRefillDeck = [];  // デッキが空になったら補充するカードID
        this.cardBackColor = {
            gradient1: '#1e3a8a',  // デフォルトの青
            gradient2: '#1e1b4b'
        };
        this.extraTurns = {
            player: 0,
            opponent: 0
        };  // 再行動カウンター
    }

    // ==========================================
    // 再行動システム
    // ==========================================

    /**
     * 再行動を付与
     * @param {string} target - 'player' または 'opponent'
     * @param {number} count - 付与する再行動回数（デフォルト1）
     */
    grantExtraTurn(target = 'player', count = 1) {
        if (target === 'player') {
            this.extraTurns.player += count;
        } else if (target === 'opponent') {
            this.extraTurns.opponent += count;
        }
        
        this.triggerEvent('onExtraTurn', { target, count, total: this.extraTurns[target] });
        console.log(`🔄 ${target} に再行動 x${count} を付与しました（合計: ${this.extraTurns[target]}）`);
    }

    /**
     * 再行動を消費
     * @param {string} target - 'player' または 'opponent'
     * @returns {boolean} 再行動が消費できたかどうか
     */
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

    /**
     * 再行動の残り回数を取得
     * @param {string} target - 'player' または 'opponent'
     * @returns {number} 残りの再行動回数
     */
    getExtraTurns(target = 'player') {
        return target === 'player' ? this.extraTurns.player : this.extraTurns.opponent;
    }

    /**
     * 再行動をリセット
     * @param {string} target - 'player', 'opponent', または 'all'
     */
    resetExtraTurns(target = 'all') {
        if (target === 'player' || target === 'all') {
            this.extraTurns.player = 0;
        }
        if (target === 'opponent' || target === 'all') {
            this.extraTurns.opponent = 0;
        }
        console.log(`🔄 再行動をリセットしました: ${target}`);
    }

    /**
     * 再行動があるかチェック
     * @param {string} target - 'player' または 'opponent'
     * @returns {boolean} 再行動があるかどうか
     */
    hasExtraTurn(target = 'player') {
        return this.getExtraTurns(target) > 0;
    }

    // ==========================================
    // 見た目のカスタマイズ
    // ==========================================

    /**
     * カード裏面の色を設定
     * @param {string} color1 - グラデーション開始色（CSSカラー）
     * @param {string} color2 - グラデーション終了色（CSSカラー、省略時はcolor1）
     */
    setCardBackColor(color1, color2 = null) {
        this.cardBackColor.gradient1 = color1;
        this.cardBackColor.gradient2 = color2 || color1;
        
        // 既存のカード裏面のスタイルを更新
        this.updateAllCardBacks();
        
        console.log(`🎨 カード裏面色を変更: ${color1} → ${this.cardBackColor.gradient2}`);
    }

    /**
     * プリセット色を設定
     * @param {string} presetName - プリセット名（'blue', 'red', 'green', 'purple', 'gold', 'black'）
     */
    setCardBackPreset(presetName) {
        const presets = {
            'blue': { gradient1: '#1e3a8a', gradient2: '#1e1b4b' },
            'red': { gradient1: '#991b1b', gradient2: '#7f1d1d' },
            'green': { gradient1: '#065f46', gradient2: '#064e3b' },
            'purple': { gradient1: '#6b21a8', gradient2: '#581c87' },
            'gold': { gradient1: '#b45309', gradient2: '#78350f' },
            'black': { gradient1: '#1f2937', gradient2: '#111827' },
            'pink': { gradient1: '#be185d', gradient2: '#9f1239' },
            'orange': { gradient1: '#c2410c', gradient2: '#9a3412' },
            'teal': { gradient1: '#0f766e', gradient2: '#115e59' },
            'indigo': { gradient1: '#4338ca', gradient2: '#3730a3' }
        };

        if (presets[presetName]) {
            this.cardBackColor = { ...presets[presetName] };
            this.updateAllCardBacks();
            console.log(`🎨 プリセット "${presetName}" を適用しました`);
        } else {
            console.warn(`⚠️ プリセット "${presetName}" が見つかりません`);
            console.log('利用可能なプリセット:', Object.keys(presets).join(', '));
        }
    }

    /**
     * すべてのカード裏面のスタイルを更新
     */
    updateAllCardBacks() {
        const cardBacks = document.querySelectorAll('.card-back');
        cardBacks.forEach(back => {
            back.style.background = `linear-gradient(135deg, ${this.cardBackColor.gradient1} 0%, ${this.cardBackColor.gradient2} 100%)`;
        });
    }

    /**
     * 現在のカード裏面色を取得
     */
    getCardBackColor() {
        return { ...this.cardBackColor };
    }

    // ==========================================
    // カード定義の登録
    // ==========================================
    
    /**
     * カードタイプを定義
     * @param {string} id - カードの一意ID
     * @param {Object} data - カードデータ {title, description, effectId, iconSlug, iconType}
     */
    defineCard(id, data) {
        this.cardDefinitions.set(id, {
            id: id,
            title: data.title || '???',
            description: data.description || '',
            effectId: data.effectId || null,  // 効果IDのみを保存
            iconSlug: data.iconSlug || null,  // Icons8のアイコン名 or ローカルパス
            iconType: data.iconType || 'icons8'  // 'icons8', 'local', 'text'
        });
    }

    /**
     * カードの説明文と効果を設定（後から変更可能）
     * @param {string} cardId - カードID
     * @param {string} description - 新しい説明文
     * @param {string} effectId - 新しい効果ID（省略時は変更なし）
     */
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

    /**
     * カードのアイコンを設定（後から変更可能）
     * @param {string} cardId - カードID
     * @param {string} iconSlug - アイコン名 or パス
     * @param {string} iconType - 'icons8', 'local', 'text'
     */
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

    /**
     * 複数カードの説明文を一括設定
     * @param {Object} descriptions - {cardId: description} の形式
     */
    setCardDescriptions(descriptions) {
        Object.entries(descriptions).forEach(([cardId, desc]) => {
            this.setCardDescription(cardId, desc);
        });
    }

    /**
     * 複数カードの効果を一括設定
     * @param {Object} effects - {cardId: effectId} の形式
     */
    setCardEffectIds(effects) {
        Object.entries(effects).forEach(([cardId, effectId]) => {
            const card = this.cardDefinitions.get(cardId);
            if (card) {
                card.effectId = effectId;
            }
        });
    }

    /**
     * 複数のカードを一括定義
     * @param {Array} cards - カード定義の配列
     */
    defineCards(cards) {
        cards.forEach(card => {
            this.defineCard(card.id, card);
        });
    }

    /**
     * カード効果を登録（外部ファイルから呼び出し可能）
     * @param {string} effectId - 効果ID
     * @param {Function} effectFunction - 効果関数
     */
    registerEffect(effectId, effectFunction) {
        this.cardEffects.set(effectId, effectFunction);
    }

    /**
     * 複数の効果を一括登録
     * @param {Object} effects - {effectId: function} の形式
     */
    registerEffects(effects) {
        Object.entries(effects).forEach(([effectId, func]) => {
            this.registerEffect(effectId, func);
        });
    }

    // ==========================================
    // デッキ管理
    // ==========================================

    /**
     * デッキを初期化
     * @param {Array} cardIds - カードIDの配列
     * @param {boolean} infiniteDeck - 無限ドロー有効化
     */
    initializeDeck(cardIds, infiniteDeck = true) {
        this.deck = cardIds.map(id => this.createCardInstance(id));
        this.autoRefillDeck = [...cardIds];  // 補充用に保存
        this.infiniteDeck = infiniteDeck;
        this.shuffleDeck();
    }

    /**
     * カードインスタンスを作成
     */
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

    /**
     * デッキをシャッフル
     */
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    /**
     * デッキの残り枚数を取得
     */
    getDeckCount() {
        return this.deck.length;
    }

    /**
     * デッキを補充
     */
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

    /**
     * カードをドロー
     * @param {string} target - 'player' または 'opponent'
     * @param {number} count - ドロー枚数（デフォルト1枚）
     * @returns {Array} ドローしたカードの配列
     */
    drawCard(target = 'player', count = 1) {
        const drawnCards = [];
        
        for (let i = 0; i < count; i++) {
            // デッキが空の場合
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

    /**
     * 手札にカードを直接追加
     * @param {string} target - 'player' または 'opponent'
     * @param {string} cardId - カードID
     * @returns {Object} 追加したカード
     */
    addCardToHand(target = 'player', cardId) {
        const card = this.createCardInstance(cardId);
        
        if (target === 'player') {
            this.playerHand.push(card);
        } else if (target === 'opponent') {
            this.opponentHand.push(card);
        }
        
        return card;
    }

    /**
     * 手札から特定のカードを削除
     * @param {string} target - 'player' または 'opponent'
     * @param {number} index - 削除するカードのインデックス
     * @param {boolean} addToDiscard - 捨て札に追加するか（デフォルトfalse）
     * @returns {Object|null} 削除したカード
     */
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

    /**
     * 手札を完全にクリア
     * @param {string} target - 'player' または 'opponent'
     * @param {boolean} addToDiscard - 捨て札に追加するか（デフォルトfalse）
     */
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

    /**
     * カードを使用
     * @param {string} target - 'player' または 'opponent'
     * @param {number} index - 手札のインデックス
     * @param {Object} context - 効果関数に渡す追加コンテキスト
     */
    useCard(target = 'player', index = 0, context = {}) {
        const hand = target === 'player' ? this.playerHand : this.opponentHand;
        
        if (index < 0 || index >= hand.length) {
            console.warn('無効なカードインデックス');
            return null;
        }

        const card = hand.splice(index, 1)[0];
        this.discardPile.push(card);

        // 効果IDから効果関数を取得して実行
        if (card.effectId && this.cardEffects.has(card.effectId)) {
            const effectFunction = this.cardEffects.get(card.effectId);
            effectFunction(this, { target, card, ...context });
        } else if (card.effectId) {
            console.warn(`効果ID "${card.effectId}" が登録されていません`);
        }

        this.triggerEvent('onCardUse', { card, target, context });
        return card;
    }

    /**
     * カードを捨てる
     * @param {string} target - 'player' または 'opponent'
     * @param {number} index - 手札のインデックス
     */
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

    /**
     * 手札を取得
     * @param {string} target - 'player' または 'opponent'
     */
    getHand(target = 'player') {
        return target === 'player' ? [...this.playerHand] : [...this.opponentHand];
    }

    /**
     * 手札の枚数を取得
     * @param {string} target - 'player' または 'opponent'
     */
    getHandCount(target = 'player') {
        return target === 'player' ? this.playerHand.length : this.opponentHand.length;
    }

    // ==========================================
    // ゲーム管理
    // ==========================================

    /**
     * ゲームをリセット
     */
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

    /**
     * イベントリスナーを登録
     * @param {string} eventName - イベント名
     * @param {Function} callback - コールバック関数
     */
    on(eventName, callback) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName].push(callback);
        }
    }

    /**
     * イベントを発火
     */
    triggerEvent(eventName, data) {
        if (this.eventListeners[eventName]) {
            this.eventListeners[eventName].forEach(callback => callback(data));
        }
    }

    // ==========================================
    // デバッグ用
    // ==========================================

    /**
     * 現在の状態を出力
     */
    debugState() {
        console.log('=== Card Game State ===');
        console.log('Deck:', this.deck.length, 'cards');
        console.log('Player Hand:', this.playerHand.length, 'cards', this.playerHand);
        console.log('Opponent Hand:', this.opponentHand.length, 'cards');
        console.log('Discard Pile:', this.discardPile.length, 'cards');
    }
}

// ==========================================
// グローバルインスタンスの作成
// ==========================================
const cardGame = new CardGameManager();

// ==========================================
// 使用例とサンプルカード定義
// ==========================================

// サンプルカード定義（効果IDのみを指定）
cardGame.defineCards([
    {
        id: 'heal_potion',
        title: '回復の薬',
        description: 'HPを20回復する',
        effectId: 'heal_20'
    },
    {
        id: 'attack_card',
        title: '攻撃カード',
        description: '相手に10ダメージを与える',
        effectId: 'damage_10'
    },
    {
        id: 'shield',
        title: 'シールド',
        description: '次のターン、ダメージを無効化する',
        effectId: 'shield_effect'
    },
    {
        id: 'draw_card',
        title: 'ドロー',
        description: 'カードを2枚引く',
        effectId: 'draw_2'
    },
    {
        id: 'mystery_card',
        title: '謎のカード',
        description: 'ランダムな効果が発動する',
        effectId: 'random_effect'
    }
]);

// サンプル効果関数の登録（これは別ファイルに分離可能）
cardGame.registerEffects({
    'heal_20': (game, context) => {
        console.log('💊 HPを20回復しました！');
        // ここに実際のHP回復処理を記述
    },
    'damage_10': (game, context) => {
        console.log('⚔️ 相手に10ダメージ！');
        // ここに実際のダメージ処理を記述
    },
    'shield_effect': (game, context) => {
        console.log('🛡️ シールドを展開しました！');
        // ここにシールド効果を記述
    },
    'draw_2': (game, context) => {
        console.log('🎴 カードを2枚ドロー！');
        game.drawCard(context.target, 2);
    },
    'random_effect': (game, context) => {
        const effects = ['heal', 'damage', 'draw'];
        const random = effects[Math.floor(Math.random() * effects.length)];
        console.log(`❓ ${random} 効果が発動！`);
    }
});

// ==========================================
// HTML統合用のヘルパー関数
// ==========================================

/**
 * HTMLのカードシステムと統合
 */
function integrateWithHTML() {
    // onCardUse関数を拡張
    const originalOnCardUse = window.onCardUse || function() {};
    
    window.onCardUse = function(title, description) {
        // 元の処理を実行
        originalOnCardUse(title, description);
        
        // カードマネージャーの処理を実行
        const hand = cardGame.getHand('player');
        const cardIndex = hand.findIndex(c => c.title === title);
        
        if (cardIndex >= 0) {
            cardGame.useCard('player', cardIndex);
        }
    };

    // カードドロー時にHTMLに反映（アイコン対応）
    cardGame.on('onCardDraw', (data) => {
        if (data.target === 'player' && window.setCardContent) {
            // 次にクリックされるカードにデータを設定
            setTimeout(() => {
                const drawnCards = document.querySelectorAll('.card.my-card');
                const lastCard = drawnCards[drawnCards.length - 1];
                if (lastCard) {
                    // アイコン情報も含めて設定
                    const iconInfo = cardGame.getCardIcon(data.card);
                    window.setCardContent(
                        lastCard, 
                        data.card.title, 
                        data.card.description,
                        iconInfo.slug,
                        iconInfo.type
                    );
                }
            }, 100);
        }
    });

    // 初期カード裏面色を適用
    cardGame.updateAllCardBacks();
}

/**
 * カードのアイコン情報を取得
 * @param {Object} card - カードオブジェクト
 * @returns {Object} {slug, type, url}
 */
cardGame.getCardIcon = function(card) {
    const iconType = card.iconType || 'icons8';
    const iconSlug = card.iconSlug || null;
    
    let iconUrl = null;
    let displaySlug = iconSlug;
    
    if (!iconSlug) {
        // アイコンがない場合は文字「?」を返す
        return { slug: '?', type: 'text', url: null };
    }
    
    switch (iconType) {
        case 'icons8':
            iconUrl = `https://img.icons8.com/fluency/100/${iconSlug}.png`;
            break;
        case 'local':
            iconUrl = iconSlug;  // ローカルパスをそのまま使用
            break;
        case 'text':
            // テキストとして表示
            return { slug: iconSlug, type: 'text', url: null };
        default:
            iconUrl = `https://img.icons8.com/fluency/100/${iconSlug}.png`;
    }
    
    return { slug: displaySlug, type: iconType, url: iconUrl };
};

/**
 * HTMLのモーダルにアイコンを設定（エラーハンドリング付き）
 */
function setupModalIconHandling() {
    const overlayImg = document.getElementById('overlay-img');
    if (!overlayImg) return;
    
    // 画像読み込みエラー時のフォールバック
    overlayImg.addEventListener('error', function() {
        console.warn('⚠️ アイコン画像の読み込みに失敗しました。テキストで表示します。');
        
        // 画像を非表示にして、代わりにテキストを表示
        this.style.display = 'none';
        
        const imageArea = this.parentElement;
        let textFallback = imageArea.querySelector('.icon-text-fallback');
        
        if (!textFallback) {
            textFallback = document.createElement('div');
            textFallback.className = 'icon-text-fallback';
            textFallback.style.cssText = `
                font-size: 4rem;
                font-weight: bold;
                color: #fbbf24;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100px;
                height: 100px;
            `;
            imageArea.appendChild(textFallback);
        }
        
        textFallback.textContent = '?';
        textFallback.style.display = 'flex';
    });
    
    // 画像読み込み成功時は画像を表示
    overlayImg.addEventListener('load', function() {
        this.style.display = 'block';
        const textFallback = this.parentElement.querySelector('.icon-text-fallback');
        if (textFallback) {
            textFallback.style.display = 'none';
        }
    });
}

/**
 * クイックビュー（ホバー時の簡易表示）を有効化
 * HTMLにクイックビュー要素が存在する場合に使用
 */
function enableQuickView() {
    const quickView = document.getElementById('quick-view');
    if (!quickView) {
        console.warn('⚠️ クイックビュー要素が見つかりません');
        return;
    }

    // 全てのカードにホバーイベントを追加
    document.addEventListener('mouseenter', (e) => {
        const card = e.target.closest('.card.my-card');
        if (card && card.dataset.title) {
            showQuickView(e, card.dataset.title, card.dataset.desc);
        }
    }, true);

    document.addEventListener('mousemove', (e) => {
        const card = e.target.closest('.card.my-card');
        if (card && quickView.style.display === 'flex') {
            moveQuickView(e);
        }
    }, true);

    document.addEventListener('mouseleave', (e) => {
        const card = e.target.closest('.card.my-card');
        if (card) {
            hideQuickView();
        }
    }, true);

    function showQuickView(e, title, desc) {
        const quickTitle = document.getElementById('quick-title');
        const quickDesc = document.getElementById('quick-desc');
        if (quickTitle) quickTitle.innerText = title;
        if (quickDesc) quickDesc.innerText = desc;
        quickView.style.display = 'flex';
        moveQuickView(e);
    }

    function moveQuickView(e) {
        const x = e.clientX + 25;
        const y = e.clientY - 160;
        quickView.style.left = `${x}px`;
        quickView.style.top = `${y}px`;
    }

    function hideQuickView() {
        quickView.style.display = 'none';
    }
}

// ==========================================
// 初期化処理
// ==========================================

// ページ読み込み後に統合
if (typeof window !== 'undefined') {
    window.cardGame = cardGame;
    window.integrateWithHTML = integrateWithHTML;
    window.enableQuickView = enableQuickView;
    window.setupModalIconHandling = setupModalIconHandling;
    
    // DOMが読み込まれたら自動的に統合
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            integrateWithHTML();
            enableQuickView();
            setupModalIconHandling();
        });
    } else {
        integrateWithHTML();
        enableQuickView();
        setupModalIconHandling();
    }
}

// Node.js環境用のエクスポート
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CardGameManager, cardGame };
}
