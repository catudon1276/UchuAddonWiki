/**
 * 通常役表（6面ダイス）
 * 追加・変更はこのファイルを編集
 */
export const ROLES_NORMAL = {
    id: 'normal',
    name: '通常役表',
    diceRange: [1, 6],
    
    // 役判定（上から順に優先度高い）
    roles: [
        {
            id: 'pinzoro',
            name: 'ピンゾロ',
            description: '1が3つ揃い',
            multiplier: 5,
            check: (dice) => dice.every(d => d === 1),
            priority: 100,
        },
        {
            id: 'zorome',
            name: 'ゾロ目',
            description: '2~6が3つ揃い',
            multiplier: 3,
            check: (dice) => dice[0] === dice[1] && dice[1] === dice[2] && dice[0] !== 1,
            priority: 90,
        },
        {
            id: 'shigoro',
            name: 'シゴロ',
            description: '4-5-6の組み合わせ',
            multiplier: 2,
            check: (dice) => {
                const sorted = [...dice].sort((a, b) => a - b);
                return sorted[0] === 4 && sorted[1] === 5 && sorted[2] === 6;
            },
            priority: 80,
        },
        {
            id: 'hifumi',
            name: 'ヒフミ',
            description: '1-2-3の組み合わせ',
            multiplier: -2,
            check: (dice) => {
                const sorted = [...dice].sort((a, b) => a - b);
                return sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 3;
            },
            priority: 70,
        },
        {
            id: 'me',
            name: '通常目',
            description: '2つ揃いの残り1つの目',
            multiplier: 1,
            check: (dice) => {
                // 2つ同じ目があり、残り1つが異なる
                const counts = {};
                dice.forEach(d => counts[d] = (counts[d] || 0) + 1);
                const values = Object.entries(counts);
                return values.some(([, count]) => count === 2) && values.length === 2;
            },
            getValue: (dice) => {
                const counts = {};
                dice.forEach(d => counts[d] = (counts[d] || 0) + 1);
                for (const [val, count] of Object.entries(counts)) {
                    if (count === 1) return parseInt(val);
                }
                return 0;
            },
            priority: 50,
        },
    ],
    
    // 役なし（振り直し）
    noRole: {
        id: 'menashi',
        name: '役無し',
        description: '役が成立しない（振り直し可能）',
        multiplier: -1,
        maxRetries: 2,
    },
    
    // ションベン
    shonben: {
        id: 'shonben',
        name: 'ションベン',
        description: '皿から出た',
        multiplier: -1,
    },
};

/**
 * 役判定関数
 */
export function judgeRoleNormal(dice, isShonben = false) {
    if (isShonben) {
        return { ...ROLES_NORMAL.shonben, dice };
    }
    
    for (const role of ROLES_NORMAL.roles) {
        if (role.check(dice)) {
            const result = { ...role, dice };
            if (role.getValue) {
                result.value = role.getValue(dice);
            }
            return result;
        }
    }
    
    return { ...ROLES_NORMAL.noRole, dice };
}

/**
 * 役の強さ比較（正なら役1が強い、負なら役2が強い、0は同点）
 */
export function compareRolesNormal(role1, role2) {
    // 優先度で比較
    if (role1.priority !== role2.priority) {
        return role1.priority - role2.priority;
    }
    
    // 同じ役の場合、通常目なら値で比較
    if (role1.id === 'me' && role2.id === 'me') {
        return role1.value - role2.value;
    }
    
    return 0;
}
