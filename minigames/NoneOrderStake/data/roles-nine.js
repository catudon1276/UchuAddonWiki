/**
 * 九面賽役表（9面ダイス）- 異次元モード
 * 追加・変更はこのファイルを編集
 */
export const ROLES_NINE = {
    id: 'nine',
    name: '九面賽役表',
    diceRange: [1, 9],
    
    // 役判定（上から順に優先度高い）
    roles: [
        {
            id: 'tenshou',
            name: '天昇',
            ruby: 'てんしょう',
            description: '9-8-7の組み合わせ',
            multiplier: 10,
            check: (dice) => {
                const sorted = [...dice].sort((a, b) => a - b);
                return sorted[0] === 7 && sorted[1] === 8 && sorted[2] === 9;
            },
            priority: 200,
        },
        {
            id: 'goku_arashi',
            name: '極・嵐',
            ruby: 'ごくあらし',
            description: '9が3つ揃い',
            multiplier: 9,
            check: (dice) => dice.every(d => d === 9),
            priority: 190,
        },
        {
            id: 'sei_arashi',
            name: '聖・嵐',
            ruby: 'せいあらし',
            description: '7が3つ揃い',
            multiplier: 7,
            check: (dice) => dice.every(d => d === 7),
            priority: 180,
        },
        {
            id: 'hira_arashi',
            name: '平・嵐',
            ruby: 'ひらあらし',
            description: '2~6, 8のゾロ目',
            multiplier: 5,
            check: (dice) => {
                const val = dice[0];
                return dice.every(d => d === val) && 
                       [2, 3, 4, 5, 6, 8].includes(val);
            },
            priority: 170,
        },
        {
            id: 'kamiza',
            name: '上座',
            ruby: 'かみざ',
            description: '通常目 7~9（凡夫より強い）',
            multiplier: 1,
            check: (dice) => {
                const counts = {};
                dice.forEach(d => counts[d] = (counts[d] || 0) + 1);
                const values = Object.entries(counts);
                if (!values.some(([, count]) => count === 2) || values.length !== 2) return false;
                
                for (const [val, count] of values) {
                    if (count === 1 && [7, 8, 9].includes(parseInt(val))) return true;
                }
                return false;
            },
            getValue: (dice) => {
                const counts = {};
                dice.forEach(d => counts[d] = (counts[d] || 0) + 1);
                for (const [val, count] of Object.entries(counts)) {
                    if (count === 1) return parseInt(val);
                }
                return 0;
            },
            priority: 160,
        },
        {
            id: 'bonpu',
            name: '凡夫',
            ruby: 'ぼんぷ',
            description: '4-5-6の組み合わせ（揃い役だが上座に負ける）',
            multiplier: 1,
            check: (dice) => {
                const sorted = [...dice].sort((a, b) => a - b);
                return sorted[0] === 4 && sorted[1] === 5 && sorted[2] === 6;
            },
            priority: 150,
        },
        {
            id: 'shimoza',
            name: '下座',
            ruby: 'しもざ',
            description: '通常目 1~6',
            multiplier: 1,
            check: (dice) => {
                const counts = {};
                dice.forEach(d => counts[d] = (counts[d] || 0) + 1);
                const values = Object.entries(counts);
                if (!values.some(([, count]) => count === 2) || values.length !== 2) return false;
                
                for (const [val, count] of values) {
                    if (count === 1 && [1, 2, 3, 4, 5, 6].includes(parseInt(val))) return true;
                }
                return false;
            },
            getValue: (dice) => {
                const counts = {};
                dice.forEach(d => counts[d] = (counts[d] || 0) + 1);
                for (const [val, count] of Object.entries(counts)) {
                    if (count === 1) return parseInt(val);
                }
                return 0;
            },
            priority: 140,
        },
        {
            id: 'sakaotoshi',
            name: '逆落',
            ruby: 'さかおとし',
            description: '1-2-3の組み合わせ（最悪役）',
            multiplier: -10,
            check: (dice) => {
                const sorted = [...dice].sort((a, b) => a - b);
                return sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 3;
            },
            priority: 10,
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
    
    // 場外（ションベン）
    shonben: {
        id: 'jougai',
        name: '場外',
        ruby: 'じょうがい',
        description: '皿から出た。次回1回しか振れない',
        multiplier: -5,
        nextTurnPenalty: true, // 次回振り直し回数が0になる
    },
};

/**
 * 役判定関数
 */
export function judgeRoleNine(dice, isShonben = false) {
    if (isShonben) {
        return { ...ROLES_NINE.shonben, dice };
    }
    
    for (const role of ROLES_NINE.roles) {
        if (role.check(dice)) {
            const result = { ...role, dice };
            if (role.getValue) {
                result.value = role.getValue(dice);
            }
            return result;
        }
    }
    
    return { ...ROLES_NINE.noRole, dice };
}

/**
 * 役の強さ比較（正なら役1が強い、負なら役2が強い、0は同点）
 */
export function compareRolesNine(role1, role2) {
    // 優先度で比較
    if (role1.priority !== role2.priority) {
        return role1.priority - role2.priority;
    }
    
    // 同じ役の場合、上座・下座なら値で比較
    if ((role1.id === 'kamiza' || role1.id === 'shimoza') && 
        (role2.id === 'kamiza' || role2.id === 'shimoza')) {
        return role1.value - role2.value;
    }
    
    return 0;
}
