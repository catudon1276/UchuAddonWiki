// ==========================================
// Game Logic - game.js
// ==========================================

const Game = (() => {
    // ゲーム設定
    const CONFIG = {
        maxMatches: 15,
        startMoney: 10000,
        goalMoney: 100000,
        minMoney: 100,
        cpuMoney: 9999999,
        drawCostRate: 0.1  // 賭け金の10%
    };

    // ゲーム状態
    let state = {
        mode: 'cpu',  // 'cpu' or 'online'
        match: 1,
        phase: 'idle',  // idle, betting, card, rolling, reroll, judging
        diceMode: 'normal',  // 'normal' or 'nine'
        player: {
            money: CONFIG.startMoney,
            bet: 0,
            dice: [0, 0, 0],
            role: null,
            effects: {}
        },
        cpu: {
            money: CONFIG.cpuMoney,
            bet: 0,
            dice: [0, 0, 0],
            role: null,
            effects: {}
        },
        betMultiplier: 1,
        currentTurn: 'player'
    };

    // 通常賽の役
    const ROLES_NORMAL = [
        { name: 'ピンゾロ', mult: 5, check: d => d[0] === 1 && d[1] === 1 && d[2] === 1 },
        { name: 'アラシ', mult: 3, check: d => d[0] === d[1] && d[1] === d[2] && d[0] !== 1 },
        { name: 'シゴロ', mult: 2, check: d => sorted(d).join('') === '456' },
        { name: '6の目', mult: 1, check: d => getMe(d) === 6, me: 6 },
        { name: '5の目', mult: 1, check: d => getMe(d) === 5, me: 5 },
        { name: '4の目', mult: 1, check: d => getMe(d) === 4, me: 4 },
        { name: '3の目', mult: 1, check: d => getMe(d) === 3, me: 3 },
        { name: '2の目', mult: 1, check: d => getMe(d) === 2, me: 2 },
        { name: '1の目', mult: 1, check: d => getMe(d) === 1, me: 1 },
        { name: 'ヒフミ', mult: -2, check: d => sorted(d).join('') === '123' },
        { name: '目なし', mult: 0, check: () => true }
    ];

    // 九面賽の役
    const ROLES_NINE = [
        { name: '天翔', mult: 10, check: d => d[0] === 9 && d[1] === 9 && d[2] === 9 },
        { name: '極嵐', mult: 9, check: d => d[0] === d[1] && d[1] === d[2] && d[0] >= 7 },
        { name: '聖嵐', mult: 7, check: d => d[0] === d[1] && d[1] === d[2] && d[0] >= 4 && d[0] <= 6 },
        { name: '平嵐', mult: 5, check: d => d[0] === d[1] && d[1] === d[2] },
        { name: '上座', mult: 1, check: d => getMe9(d) >= 5, priority: d => getMe9(d) },
        { name: '下座', mult: 1, check: d => getMe9(d) >= 1 && getMe9(d) <= 4, priority: d => getMe9(d) },
        { name: '逆落', mult: -10, check: d => sorted(d).join('') === '123' },
        { name: '目なし', mult: 0, check: () => true }
    ];

    function sorted(d) { return [...d].sort((a, b) => a - b); }

    function getMe(d) {
        const s = sorted(d);
        if (s[0] === s[1]) return s[2];
        if (s[1] === s[2]) return s[0];
        return null;
    }

    function getMe9(d) {
        const s = sorted(d);
        if (s[0] === s[1]) return s[2];
        if (s[1] === s[2]) return s[0];
        return null;
    }

    // 役判定
    function judgeRole(dice) {
        const roles = state.diceMode === 'nine' ? ROLES_NINE : ROLES_NORMAL;
        for (const role of roles) {
            if (role.check(dice)) {
                return { ...role, dice: [...dice] };
            }
        }
        return { name: '目なし', mult: 0, dice };
    }

    // 勝敗判定
    function judgeMatch() {
        const p = state.player.role;
        const c = state.cpu.role;

        // ションベン判定
        if (p.name === 'ションベン' && c.name === 'ションベン') return 'draw';
        if (p.name === 'ションベン') return 'lose';
        if (c.name === 'ションベン') return 'win';

        // 倍率比較
        if (p.mult > c.mult) return 'win';
        if (p.mult < c.mult) return 'lose';

        // 同倍率時は目の大きさ
        if (p.me && c.me) {
            if (p.me > c.me) return 'win';
            if (p.me < c.me) return 'lose';
        }

        // 九面賽の優先度
        if (p.priority && c.priority) {
            const pp = p.priority(p.dice);
            const cp = c.priority(c.dice);
            if (pp > cp) return 'win';
            if (pp < cp) return 'lose';
        }

        return 'lose';  // 同点はCPU勝利
    }

    // 賞金計算
    function calculatePayout(result) {
        const baseBet = state.player.bet * state.betMultiplier;
        const mult = result === 'win' ? state.player.role.mult : -state.cpu.role.mult;

        if (result === 'draw') return 0;
        if (result === 'win') {
            return Math.floor(baseBet * Math.max(1, mult));
        } else {
            return -Math.floor(baseBet * Math.max(1, Math.abs(mult)));
        }
    }

    // CPU行動
    function cpuDecideBet(playerBet) {
        // プレイヤーの掛け金の50~150%
        const ratio = 0.5 + Math.random();
        return Math.min(Math.floor(playerBet * ratio), Math.floor(state.cpu.money * 0.3));
    }

    function cpuDecideCard() {
        // 30%の確率でカードを使う
        if (Math.random() < 0.3 && cardGame.getHandCount('opponent') > 0) {
            return Math.floor(Math.random() * cardGame.getHandCount('opponent'));
        }
        return -1;
    }

    function cpuRoll(bias = null) {
        // biasがあれば重み付け
        const values = [];
        const faces = state.diceMode === 'nine' ? 9 : 6;
        for (let i = 0; i < 3; i++) {
            if (bias === 'high') {
                values.push(Math.ceil(Math.random() * 3) + (faces - 3));
            } else if (bias === 'low') {
                values.push(Math.ceil(Math.random() * 3));
            } else {
                values.push(Math.ceil(Math.random() * faces));
            }
        }
        return values;
    }

    // リセット
    function resetMatch() {
        state.player.bet = 0;
        state.player.dice = [0, 0, 0];
        state.player.role = null;
        state.player.effects = {};
        state.cpu.bet = 0;
        state.cpu.dice = [0, 0, 0];
        state.cpu.role = null;
        state.cpu.effects = {};
        state.betMultiplier = 1;
        state.diceMode = 'normal';
        state.phase = 'idle';
    }

    function resetGame() {
        state.match = 1;
        state.player.money = CONFIG.startMoney;
        state.cpu.money = CONFIG.cpuMoney;
        resetMatch();
        cardGame.resetGame();
        cardGame.initializeDeck([
            'sara_shoumetu', 'hikime_yudo', 'takame_yudo', 'shonben_keigen',
            'muryo_draw', 'furikae', 'coin_toss', 'double_bet', 'ijigen_dice', 'nazo_seibutsu',
            'sara_shoumetu', 'hikime_yudo', 'takame_yudo', 'shonben_keigen',
            'muryo_draw', 'furikae', 'coin_toss', 'double_bet', 'ijigen_dice', 'nazo_seibutsu'
        ], true);
    }

    // ゲーム終了判定
    function checkGameEnd() {
        if (state.player.money < CONFIG.minMoney) return 'defeat';
        if (state.player.money >= CONFIG.goalMoney) return 'victory';
        if (state.match > CONFIG.maxMatches) {
            return state.player.money >= CONFIG.goalMoney ? 'victory' : 'defeat';
        }
        return null;
    }

    return {
        CONFIG,
        state,
        ROLES_NORMAL,
        ROLES_NINE,
        judgeRole,
        judgeMatch,
        calculatePayout,
        cpuDecideBet,
        cpuDecideCard,
        cpuRoll,
        resetMatch,
        resetGame,
        checkGameEnd
    };
})();

window.Game = Game;