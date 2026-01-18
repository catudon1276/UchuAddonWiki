/**
 * イカサマ定義
 * 新しいイカサマを追加する場合はCHEATSオブジェクトに追加するだけ
 * 
 * 構造:
 * - id: 一意識別子
 * - name: 表示名
 * - description: 説明文
 * - type: 'attack' | 'defense' | 'buff' | 'special'
 * - target: 'self' | 'opponent'
 * - phase: 解禁フェーズ（2, 3, 4）
 * - costRate: 賭け金に対するコスト割合（0.1 = 10%）
 * - duration: 効果持続ターン（1 = 今回のみ, 3 = 3ターン等）
 * - counters: この技を無効化できるイカサマID配列
 * - effect: 効果を適用する関数
 * - onActivate: 発動時の追加処理（オプション）
 */

export const CHEATS = {
    // ===========================================
    // 第2フェーズ解禁（基本イカサマ）
    // ===========================================
    
    // 攻撃系
    sara_shoumetu: {
        id: 'sara_shoumetu',
        name: '皿消滅',
        description: '相手を確定ションベンにする',
        type: 'attack',
        target: 'opponent',
        phase: 2,
        costRate: 0.1,
        duration: 1,
        counters: ['shonben_keigen'],
        effect: (state, target) => {
            target.forceShonben = true;
        },
    },
    
    hikime_yudo: {
        id: 'hikime_yudo',
        name: '低目誘導',
        description: '相手に1~3が出やすくなる（+40%）',
        type: 'attack',
        target: 'opponent',
        phase: 2,
        costRate: 0.1,
        duration: 1,
        counters: ['takame_yudo'],
        effect: (state, target) => {
            target.diceWeight = 'low'; // 1, 2, 3が出やすい
            target.weightStrength = 0.4; // +40%
        },
    },
    
    // 防御系
    shonben_keigen: {
        id: 'shonben_keigen',
        name: 'ションベン軽減',
        description: 'ションベンのペナルティを無効化',
        type: 'defense',
        target: 'self',
        phase: 2,
        costRate: 0.1,
        duration: 1,
        counters: [],
        effect: (state, target) => {
            target.shonbenImmune = true;
        },
    },
    
    takame_yudo: {
        id: 'takame_yudo',
        name: '高目誘導',
        description: '自分に4~6が出やすくなる（+40%）',
        type: 'defense',
        target: 'self',
        phase: 2,
        costRate: 0.1,
        duration: 1,
        counters: ['hikime_yudo'],
        effect: (state, target) => {
            target.diceWeight = 'high'; // 4, 5, 6が出やすい
            target.weightStrength = 0.4;
        },
    },
    
    // ===========================================
    // 第4フェーズ解禁（強化イカサマ）
    // ===========================================
    
    // 攻撃系
    nazo_seibutsu: {
        id: 'nazo_seibutsu',
        name: '謎生物',
        description: '相手のダイスに謎生物混入。1つで-2倍、3揃いで-10倍',
        type: 'attack',
        target: 'opponent',
        phase: 4,
        costRate: 0.15,
        duration: 1,
        counters: ['nazo_harai'],
        effect: (state, target) => {
            target.cursedDice = true;
            target.cursedPenalty = {
                single: -2,   // 1つ出たら
                triple: -10,  // 3つ揃ったら
            };
        },
    },
    
    ijigen_dice: {
        id: 'ijigen_dice',
        name: '異次元ダイス',
        description: '1~9から出目を抽出。役表が九面賽に変更',
        type: 'buff',
        target: 'self',
        phase: 4,
        costRate: 0.15,
        duration: 1,
        counters: [], // カウンターなし（余地を残す）
        effect: (state, target) => {
            target.useNineDice = true;
            state.roleTable = 'nine';
        },
    },
    
    // 防御系
    nazo_harai: {
        id: 'nazo_harai',
        name: '謎生物祓い',
        description: '3ターンの間、謎生物を無効化',
        type: 'defense',
        target: 'self',
        phase: 4,
        costRate: 0.2,
        duration: 3,
        counters: [],
        effect: (state, target) => {
            target.cursedImmune = true;
        },
    },
    
    // ===========================================
    // 拡張用テンプレート（コメントアウト）
    // ===========================================
    
    /*
    template_cheat: {
        id: 'template_cheat',
        name: 'テンプレート',
        description: '説明文',
        type: 'attack', // 'attack' | 'defense' | 'buff' | 'special'
        target: 'opponent', // 'self' | 'opponent'
        phase: 2, // 解禁フェーズ
        costRate: 0.1, // コスト割合
        duration: 1, // 持続ターン
        counters: [], // カウンターされるイカサマID
        effect: (state, target) => {
            // 効果の実装
        },
    },
    */
};

/**
 * フェーズで使用可能なイカサマを取得
 */
export function getAvailableCheats(phase) {
    return Object.values(CHEATS).filter(cheat => cheat.phase <= phase);
}

/**
 * タイプ別にイカサマを取得
 */
export function getCheatsByType(phase, type) {
    return getAvailableCheats(phase).filter(cheat => cheat.type === type);
}

/**
 * イカサマのカウンターをチェック
 */
export function checkCounter(attackCheatId, defenseCheatId) {
    const attackCheat = CHEATS[attackCheatId];
    if (!attackCheat) return false;
    return attackCheat.counters.includes(defenseCheatId);
}

/**
 * イカサマコストを計算
 */
export function calculateCheatCost(cheatId, betAmount) {
    const cheat = CHEATS[cheatId];
    if (!cheat) return 0;
    return Math.floor(betAmount * cheat.costRate);
}

/**
 * イカサマを適用
 */
export function applyCheat(cheatId, gameState, targetState) {
    const cheat = CHEATS[cheatId];
    if (!cheat) return false;
    
    cheat.effect(gameState, targetState);
    
    return {
        cheatId,
        duration: cheat.duration,
        appliedAt: gameState.currentTurn,
    };
}
