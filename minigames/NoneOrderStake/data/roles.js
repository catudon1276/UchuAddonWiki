/**
 * 役判定システム
 * 通常賽（6面）と九星賽（9面）の役表を管理
 */

// ===========================================
// 通常賽（6面ダイス）
// ===========================================
export const ROLES_NORMAL = {
    id: 'normal',
    name: '通常賽',
    diceFaces: 6,
    
    roles: [
        {
            id: 'pinzoro',
            name: 'ピンゾロ',
            description: '1が3つ揃い',
            multiplier: 5,
            priority: 100,
            check: (dice) => dice.every(d => d === 1),
            display: [1, 1, 1]
        },
        {
            id: 'arashi',
            name: 'アラシ',
            description: '同じ目が3つ揃い（1以外）',
            multiplier: 3,
            priority: 90,
            check: (dice) => dice[0] === dice[1] && dice[1] === dice[2] && dice[0] !== 1,
            display: [6, 6, 6]
        },
        {
            id: 'shigoro',
            name: 'シゴロ',
            description: '4-5-6の組み合わせ',
            multiplier: 2,
            priority: 80,
            check: (dice) => {
                const sorted = [...dice].sort((a, b) => a - b);
                return sorted[0] === 4 && sorted[1] === 5 && sorted[2] === 6;
            },
            display: [4, 5, 6]
        },
        {
            id: 'me_6',
            name: '六の目',
            description: '2つ揃いで残り1つが6',
            multiplier: 1,
            priority: 56,
            check: (dice) => hasTargetMe(dice, 6),
            getValue: () => 6,
            display: [2, 2, 6],
            targetIndex: 2
        },
        {
            id: 'me_5',
            name: '五の目',
            description: '2つ揃いで残り1つが5',
            multiplier: 1,
            priority: 55,
            check: (dice) => hasTargetMe(dice, 5),
            getValue: () => 5,
            display: [4, 4, 5],
            targetIndex: 2
        },
        {
            id: 'me_4',
            name: '四の目',
            description: '2つ揃いで残り1つが4',
            multiplier: 1,
            priority: 54,
            check: (dice) => hasTargetMe(dice, 4),
            getValue: () => 4,
            display: [3, 3, 4],
            targetIndex: 2
        },
        {
            id: 'me_3',
            name: '三の目',
            description: '2つ揃いで残り1つが3',
            multiplier: 1,
            priority: 53,
            check: (dice) => hasTargetMe(dice, 3),
            getValue: () => 3,
            display: [1, 1, 3],
            targetIndex: 2
        },
        {
            id: 'me_2',
            name: '二の目',
            description: '2つ揃いで残り1つが2',
            multiplier: 1,
            priority: 52,
            check: (dice) => hasTargetMe(dice, 2),
            getValue: () => 2,
            display: [5, 5, 2],
            targetIndex: 2
        },
        {
            id: 'me_1',
            name: '一の目',
            description: '2つ揃いで残り1つが1',
            multiplier: 1,
            priority: 51,
            check: (dice) => hasTargetMe(dice, 1),
            getValue: () => 1,
            display: [6, 6, 1],
            targetIndex: 2
        },
        {
            id: 'hifumi',
            name: 'ヒフミ',
            description: '1-2-3の組み合わせ',
            multiplier: -2,
            priority: 10,
            check: (dice) => {
                const sorted = [...dice].sort((a, b) => a - b);
                return sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 3;
            },
            display: [1, 2, 3]
        }
    ],
    
    noRole: {
        id: 'menashi',
        name: '目なし',
        description: '役が成立しない（振り直し可能）',
        multiplier: -1,
        priority: 0,
        display: [2, 3, 5]
    },
    
    shonben: {
        id: 'shonben',
        name: 'ションベン',
        description: '皿から出た',
        multiplier: -1,
        priority: -10,
        display: [0, 0, 0],
        isSpecial: true
    }
};

// ===========================================
// 九星賽（9面ダイス）
// ===========================================
export const ROLES_NINE = {
    id: 'nine',
    name: '九星賽',
    diceFaces: 9,
    
    roles: [
        {
            id: 'tenshou',
            name: '天昇',
            ruby: 'てんしょう',
            description: '9-8-7の組み合わせ',
            multiplier: 10,
            priority: 200,
            check: (dice) => {
                const sorted = [...dice].sort((a, b) => a - b);
                return sorted[0] === 7 && sorted[1] === 8 && sorted[2] === 9;
            },
            display: [7, 8, 9]
        },
        {
            id: 'goku_arashi',
            name: '極・嵐',
            ruby: 'ごくあらし',
            description: '9が3つ揃い',
            multiplier: 9,
            priority: 190,
            check: (dice) => dice.every(d => d === 9),
            display: [9, 9, 9]
        },
        {
            id: 'sei_arashi',
            name: '聖・嵐',
            ruby: 'せいあらし',
            description: '7が3つ揃い',
            multiplier: 7,
            priority: 180,
            check: (dice) => dice.every(d => d === 7),
            display: [7, 7, 7]
        },
        {
            id: 'hira_arashi',
            name: '平・嵐',
            ruby: 'ひらあらし',
            description: '2~6, 8のゾロ目',
            multiplier: 5,
            priority: 170,
            check: (dice) => {
                const val = dice[0];
                return dice.every(d => d === val) && [2, 3, 4, 5, 6, 8].includes(val);
            },
            display: [5, 5, 5]
        },
        {
            id: 'kamiza_9',
            name: '上座・九',
            ruby: 'かみざ',
            description: '通常目 9',
            multiplier: 1,
            priority: 169,
            check: (dice) => hasTargetMe(dice, 9),
            getValue: () => 9,
            display: [3, 3, 9],
            targetIndex: 2
        },
        {
            id: 'kamiza_8',
            name: '上座・八',
            ruby: 'かみざ',
            description: '通常目 8',
            multiplier: 1,
            priority: 168,
            check: (dice) => hasTargetMe(dice, 8),
            getValue: () => 8,
            display: [2, 2, 8],
            targetIndex: 2
        },
        {
            id: 'kamiza_7',
            name: '上座・七',
            ruby: 'かみざ',
            description: '通常目 7',
            multiplier: 1,
            priority: 167,
            check: (dice) => hasTargetMe(dice, 7),
            getValue: () => 7,
            display: [4, 4, 7],
            targetIndex: 2
        },
        {
            id: 'bonpu',
            name: '凡夫',
            ruby: 'ぼんぷ',
            description: '4-5-6の組み合わせ',
            multiplier: 1,
            priority: 150,
            check: (dice) => {
                const sorted = [...dice].sort((a, b) => a - b);
                return sorted[0] === 4 && sorted[1] === 5 && sorted[2] === 6;
            },
            display: [4, 5, 6]
        },
        {
            id: 'shimoza_6',
            name: '下座・六',
            ruby: 'しもざ',
            description: '通常目 6',
            multiplier: 1,
            priority: 146,
            check: (dice) => hasTargetMe(dice, 6),
            getValue: () => 6,
            display: [1, 1, 6],
            targetIndex: 2
        },
        {
            id: 'shimoza_5',
            name: '下座・五',
            ruby: 'しもざ',
            description: '通常目 5',
            multiplier: 1,
            priority: 145,
            check: (dice) => hasTargetMe(dice, 5),
            getValue: () => 5,
            display: [3, 3, 5],
            targetIndex: 2
        },
        {
            id: 'shimoza_4',
            name: '下座・四',
            ruby: 'しもざ',
            description: '通常目 4',
            multiplier: 1,
            priority: 144,
            check: (dice) => hasTargetMe(dice, 4),
            getValue: () => 4,
            display: [2, 2, 4],
            targetIndex: 2
        },
        {
            id: 'shimoza_3',
            name: '下座・三',
            ruby: 'しもざ',
            description: '通常目 3',
            multiplier: 1,
            priority: 143,
            check: (dice) => hasTargetMe(dice, 3),
            getValue: () => 3,
            display: [1, 1, 3],
            targetIndex: 2
        },
        {
            id: 'shimoza_2',
            name: '下座・二',
            ruby: 'しもざ',
            description: '通常目 2',
            multiplier: 1,
            priority: 142,
            check: (dice) => hasTargetMe(dice, 2),
            getValue: () => 2,
            display: [4, 4, 2],
            targetIndex: 2
        },
        {
            id: 'shimoza_1',
            name: '下座・一',
            ruby: 'しもざ',
            description: '通常目 1',
            multiplier: 1,
            priority: 141,
            check: (dice) => hasTargetMe(dice, 1),
            getValue: () => 1,
            display: [5, 5, 1],
            targetIndex: 2
        },
        {
            id: 'sakaotoshi',
            name: '逆落',
            ruby: 'さかおとし',
            description: '1-2-3の組み合わせ',
            multiplier: -10,
            priority: 10,
            check: (dice) => {
                const sorted = [...dice].sort((a, b) => a - b);
                return sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 3;
            },
            display: [1, 2, 3]
        }
    ],
    
    noRole: {
        id: 'menashi',
        name: '目なし',
        description: '役が成立しない（振り直し可能）',
        multiplier: -1,
        priority: 0,
        display: [2, 4, 6]
    },
    
    shonben: {
        id: 'jougai',
        name: '場外',
        ruby: 'じょうがい',
        description: '皿から出た。次回振り直し不可',
        multiplier: -5,
        priority: -10,
        nextTurnPenalty: true,
        display: [0, 0, 0],
        isSpecial: true
    }
};

// ===========================================
// ヘルパー関数
// ===========================================

/**
 * 特定の「目」があるかチェック（2つ揃い + 残り1つが指定値）
 */
function hasTargetMe(dice, target) {
    const counts = {};
    dice.forEach(d => counts[d] = (counts[d] || 0) + 1);
    const entries = Object.entries(counts);
    
    // 2つ揃いがあり、残り1つがtarget
    for (const [val, count] of entries) {
        if (count === 2) {
            // 残りの1つを探す
            for (const [otherVal, otherCount] of entries) {
                if (otherCount === 1 && parseInt(otherVal) === target) {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * 役判定関数
 */
export function judgeRole(dice, mode = 'normal', isShonben = false) {
    const roleTable = mode === 'nine' ? ROLES_NINE : ROLES_NORMAL;
    
    if (isShonben) {
        return { ...roleTable.shonben, dice };
    }
    
    for (const role of roleTable.roles) {
        if (role.check(dice)) {
            const result = { ...role, dice };
            if (role.getValue) {
                result.value = role.getValue(dice);
            }
            return result;
        }
    }
    
    return { ...roleTable.noRole, dice };
}

/**
 * 役の強さ比較（正なら役1が強い、負なら役2が強い、0は同点）
 */
export function compareRoles(role1, role2) {
    return role1.priority - role2.priority;
}

/**
 * 役表を取得
 */
export function getRoleTable(mode = 'normal') {
    return mode === 'nine' ? ROLES_NINE : ROLES_NORMAL;
}
