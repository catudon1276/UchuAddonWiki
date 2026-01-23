// ==========================================
// UI Manager - ui.js
// ==========================================

const UI = (() => {
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
        el.vfxStage = document.getElementById('vfx-stage');

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
        el.cardModalIcon = document.getElementById('card-modal-icon');
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

    // 画面切り替え
    function showScreen(name) {
        el.titleScreen.classList.add('hidden');
        el.gameScreen.classList.add('hidden');
        el.resultScreen.classList.add('hidden');
        if (name === 'title') el.titleScreen.classList.remove('hidden');
        if (name === 'game') el.gameScreen.classList.remove('hidden');
        if (name === 'result') el.resultScreen.classList.remove('hidden');
    }

    // 所持金・掛け金更新
    function updateMoney() {
        el.playerMoney.textContent = '¥' + Game.state.player.money.toLocaleString();
        el.playerBet.textContent = '¥' + Game.state.player.bet.toLocaleString();
        el.cpuBet.textContent = '¥' + Game.state.cpu.bet.toLocaleString();
    }

    // ダイス表示更新
    function updateDice(target, values) {
        const container = target === 'player' ? el.playerDice : el.cpuDice;
        const dice = container.querySelectorAll('.die');
        values.forEach((v, i) => {
            if (dice[i]) {
                dice[i].textContent = v || '?';
                dice[i].classList.toggle('one', v === 1);
            }
        });
    }

    // 役表示更新
    function updateRole(target, role) {
        const elem = target === 'player' ? el.playerRole : el.cpuRole;
        elem.textContent = role ? role.name : '-';
    }

    // 試合番号更新
    function updateMatch() {
        el.matchNum.textContent = `${Game.state.match}/${Game.CONFIG.maxMatches}`;
    }

    // ダイスモード更新
    function updateDiceMode() {
        el.diceMode.textContent = Game.state.diceMode === 'nine' ? '九面賽' : '通常賽';
        el.rankMode.textContent = Game.state.diceMode === 'nine' ? '九面賽' : '通常賽';
    }

    // デッキ枚数更新
    function updateDeckCount() {
        el.deckCount.textContent = cardGame.getDeckCount();
    }

    // アクティブプレイヤー表示
    function setActivePlayer(target) {
        el.playerBox.classList.toggle('active', target === 'player');
        el.cpuBox.classList.toggle('active', target === 'cpu');
    }

    // アクションボタン
    function showActionBtn(text, onClick) {
        el.actionBtn.textContent = text;
        el.actionBtn.classList.remove('hidden');
        el.actionBtn.onclick = onClick;
    }

    function hideActionBtn() {
        el.actionBtn.classList.add('hidden');
    }

    function showSkipBtn(text, onClick) {
        el.skipBtn.textContent = text;
        el.skipBtn.classList.remove('hidden');
        el.skipBtn.onclick = onClick;
    }

    function hideSkipBtn() {
        el.skipBtn.classList.add('hidden');
    }

    // ===== 手札レンダリング =====
    function renderPlayerHand() {
        el.playerHand.innerHTML = '';
        const hand = cardGame.getHand('player');
        hand.forEach((card, index) => {
            const cardEl = createCardElement(card, index);
            el.playerHand.appendChild(cardEl);
        });
    }

    function renderCpuHand() {
        el.cpuHand.innerHTML = '';
        const count = cardGame.getHandCount('opponent');
        for (let i = 0; i < count; i++) {
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            cardEl.innerHTML = '<div class="card-back"></div>';
            el.cpuHand.appendChild(cardEl);
        }
    }

    function createCardElement(card, index) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.dataset.index = index;
        cardEl.dataset.title = card.title;
        cardEl.dataset.desc = card.description;

        const front = document.createElement('div');
        front.className = `card-front ${card.color || 'blue'}`;

        const title = document.createElement('div');
        title.className = 'card-title';
        title.textContent = card.title;
        front.appendChild(title);

        cardEl.appendChild(front);

        // クリック → モーダル表示
        cardEl.addEventListener('click', () => showCardModal(card, index));

        // ホバー → クイックビュー
        cardEl.addEventListener('mouseenter', (e) => showQuickView(e, card));
        cardEl.addEventListener('mousemove', (e) => moveQuickView(e));
        cardEl.addEventListener('mouseleave', hideQuickView);

        return cardEl;
    }

    // ===== クイックビュー =====
    function showQuickView(e, card) {
        el.quickTitle.textContent = card.title;
        el.quickDesc.textContent = card.description;
        el.quickView.style.display = 'block';
        moveQuickView(e);
    }

    function moveQuickView(e) {
        const container = document.querySelector('.game-container');
        const rect = container.getBoundingClientRect();
        let x = e.clientX - rect.left + 15;
        let y = e.clientY - rect.top - 80;

        // 画面外対応
        if (x + 180 > rect.width) x = e.clientX - rect.left - 195;
        if (y < 0) y = 10;

        el.quickView.style.left = x + 'px';
        el.quickView.style.top = y + 'px';
    }

    function hideQuickView() {
        el.quickView.style.display = 'none';
    }

    // ===== カードモーダル =====
    let selectedCardIndex = -1;
    let selectedCard = null;

    function showCardModal(card, index) {
        selectedCard = card;
        selectedCardIndex = index;

        // アイコン
        const iconInfo = cardGame.getCardIcon(card);
        el.cardModalIcon.innerHTML = '';
        if (iconInfo.url) {
            const img = document.createElement('img');
            img.src = iconInfo.url;
            img.onerror = () => { el.cardModalIcon.textContent = '?'; };
            el.cardModalIcon.appendChild(img);
        } else {
            el.cardModalIcon.textContent = iconInfo.slug || '?';
            el.cardModalIcon.style.fontSize = '2rem';
            el.cardModalIcon.style.color = '#fbbf24';
        }

        el.cardModalTitle.textContent = card.title;
        el.cardModalDesc.textContent = card.description;
        el.cardModal.classList.remove('hidden');
    }

    function hideCardModal() {
        el.cardModal.classList.add('hidden');
        selectedCardIndex = -1;
        selectedCard = null;
    }

    function getSelectedCard() {
        return { card: selectedCard, index: selectedCardIndex };
    }

    // ===== ベットモーダル =====
    function showBetModal(maxBet, onConfirm) {
        el.betSlider.max = maxBet;
        el.betSlider.value = Math.min(1000, maxBet);
        el.betValue.textContent = parseInt(el.betSlider.value).toLocaleString();
        el.betModal.classList.remove('hidden');

        el.betSlider.oninput = () => {
            el.betValue.textContent = parseInt(el.betSlider.value).toLocaleString();
        };

        el.betConfirm.onclick = () => {
            const amount = parseInt(el.betSlider.value);
            el.betModal.classList.add('hidden');
            onConfirm(amount);
        };
    }

    // ===== 試合結果モーダル =====
    function showMatchResult(result, payout, onNext) {
        el.matchResultTitle.textContent = result === 'win' ? 'WIN!' : result === 'lose' ? 'LOSE...' : 'DRAW';
        el.matchResultTitle.className = 'match-winner ' + result;

        el.matchPlayerRole.textContent = Game.state.player.role?.name || '-';
        el.matchCpuRole.textContent = Game.state.cpu.role?.name || '-';

        const sign = payout >= 0 ? '+' : '';
        el.matchPayout.textContent = `${sign}¥${Math.abs(payout).toLocaleString()}`;
        el.matchPayout.style.color = payout >= 0 ? '#22c55e' : '#ef4444';

        el.matchModal.classList.remove('hidden');
        el.nextMatchBtn.onclick = () => {
            el.matchModal.classList.add('hidden');
            onNext();
        };
    }

    // ===== 役表パネル =====
    function toggleRankPanel() {
        el.rankPanel.classList.toggle('open');
    }

    function renderRankList() {
        const roles = Game.state.diceMode === 'nine' ? Game.ROLES_NINE : Game.ROLES_NORMAL;
        el.rankList.innerHTML = '';

        // セクション: 勝ち役
        addRankSection('勝ち役');
        roles.filter(r => r.mult > 0).forEach(r => addRankItem(r));

        // セクション: 負け役
        addRankSection('負け役');
        roles.filter(r => r.mult <= 0).forEach(r => addRankItem(r));
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

        // ダイス表示（サンプル）
        const diceDiv = document.createElement('div');
        diceDiv.className = 'rank-dice';
        const sample = getSampleDice(role);
        sample.forEach((v, i) => {
            const die = document.createElement('div');
            die.className = 'rank-die';
            if (role.me === v) die.classList.add('target');
            if (v === 1 && role.me !== 1) die.classList.add('red');
            die.textContent = v;
            diceDiv.appendChild(die);
        });

        const name = document.createElement('span');
        name.className = 'rank-name';
        name.textContent = role.name;

        const mult = document.createElement('span');
        mult.className = 'rank-mult' + (role.mult < 0 ? ' neg' : '');
        mult.textContent = 'x' + role.mult;

        item.appendChild(diceDiv);
        item.appendChild(name);
        item.appendChild(mult);
        el.rankList.appendChild(item);
    }

    function getSampleDice(role) {
        // 役に対応するサンプルダイス
        if (role.name === 'ピンゾロ') return [1, 1, 1];
        if (role.name === 'アラシ') return [2, 2, 2];
        if (role.name === 'シゴロ') return [4, 5, 6];
        if (role.name === 'ヒフミ') return [1, 2, 3];
        if (role.me) return [role.me, role.me, role.me === 6 ? 5 : 6];
        if (role.name === '天翔') return [9, 9, 9];
        if (role.name === '極嵐') return [7, 7, 7];
        if (role.name === '聖嵐') return [5, 5, 5];
        if (role.name === '平嵐') return [3, 3, 3];
        if (role.name === '上座') return [5, 5, 7];
        if (role.name === '下座') return [2, 2, 4];
        if (role.name === '逆落') return [1, 2, 3];
        return [1, 3, 5];
    }

    // ===== ゲーム結果画面 =====
    function showResult(type) {
        el.resultTitle.textContent = type === 'victory' ? '🎉 VICTORY! 🎉' : '💀 DEFEAT 💀';
        el.resultTitle.className = 'result-title ' + type;
        el.resultMoney.textContent = '¥' + Game.state.player.money.toLocaleString();
        showScreen('result');
    }

    // ===== 初期化 =====
    function init() {
        cacheElements();

        // イベントリスナー
        el.rankBtn.addEventListener('click', toggleRankPanel);
        el.rankClose.addEventListener('click', toggleRankPanel);
        el.rankOverlay.addEventListener('click', toggleRankPanel);
        el.cardCancelBtn.addEventListener('click', hideCardModal);

        renderRankList();
        updateDeckCount();
    }

    return {
        init,
        el,
        showScreen,
        updateMoney,
        updateDice,
        updateRole,
        updateMatch,
        updateDiceMode,
        updateDeckCount,
        setActivePlayer,
        showActionBtn,
        hideActionBtn,
        showSkipBtn,
        hideSkipBtn,
        renderPlayerHand,
        renderCpuHand,
        showCardModal,
        hideCardModal,
        getSelectedCard,
        showBetModal,
        showMatchResult,
        toggleRankPanel,
        renderRankList,
        showResult
    };
})();

window.UI = UI;