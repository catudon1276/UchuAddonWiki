// 役職データベース
// ここに直接役職情報を追加・編集できます
const roleDatabase = [
    {
        id: '1',
        name: 'メイヤー',
        description: '会議中に複数回投票できる役職。自分の意見を強く主張できる。',
        tags: ['投票', '会議', '重要'],
        team: 'クルー',
        difficulty: '普通',
        character_image: 'https://via.placeholder.com/200x300/4CAF50/white?text=メイヤー',
        abilities: ['会議で複数回投票可能', '自分の意見を強く主張'],
        win_condition: 'クルーと同じ',
        color: '#4CAF50'
    },
    {
        id: '2',
        name: 'シリアルキラー',
        description: 'キルクールが短く、キルすることが目的のインポスター。',
        tags: ['キル', 'インポスター', '攻撃的'],
        team: 'インポスター',
        difficulty: '難しい',
        character_image: 'https://via.placeholder.com/200x300/F44336/white?text=SK',
        abilities: ['キルクール大幅短縮', 'キル能力に特化'],
        win_condition: 'インポスターと同じ',
        color: '#F44336'
    },
    {
        id: '3',
        name: 'ジョーカー',
        description: 'インポスターでもクルーでもない独立した陣営。最後まで生き残るか、特定の条件で勝利する。',
        tags: ['ニュートラル', '勝利条件', '特殊'],
        team: 'ニュートラル',
        difficulty: '難しい',
        character_image: 'https://via.placeholder.com/200x300/FF9800/white?text=JOKER',
        abilities: ['独立した陣営', '特殊な勝利条件'],
        win_condition: '最後まで生き残る、または特定条件で勝利',
        color: '#FF9800'
    },
    {
        id: '4',
        name: 'スニッチ',
        description: '特定のタスクを完了させると他のプレイヤーの役職が分かるようになる。',
        tags: ['タスク', '情報', 'サポート'],
        team: 'クルー',
        difficulty: '普通',
        character_image: 'https://via.placeholder.com/200x300/2196F3/white?text=スニッチ',
        abilities: ['タスク完了で役職情報を取得', '情報収集能力'],
        win_condition: 'クルーと同じ',
        color: '#2196F3'
    },
    {
        id: '5',
        name: 'シェリフ',
        description: 'インポスターをキルできるクルー。間違えてクルーをキルすると自滅する。',
        tags: ['キル', 'クルー', 'リスク'],
        team: 'クルー',
        difficulty: '難しい',
        character_image: 'https://via.placeholder.com/200x300/9C27B0/white?text=シェリフ',
        abilities: ['インポスターをキル可能', '間違えると自滅'],
        win_condition: 'クルーと同じ',
        color: '#9C27B0'
    },
    {
        id: '6',
        name: 'エンジニア',
        description: 'ベントを使えるクルー。移動力が高いが、インポスターに見つかると危険。',
        tags: ['移動', 'ベント', 'サポート'],
        team: 'クルー',
        difficulty: '普通',
        character_image: 'https://via.placeholder.com/200x300/00BCD4/white?text=エンジニア',
        abilities: ['ベントを使える', '高い移動力'],
        win_condition: 'クルーと同じ',
        color: '#00BCD4'
    }
];

// 新しい役職を追加する例：
// roleDatabase.push({
//     id: '7',
//     name: '新しい役職',
//     description: '説明文をここに入力',
//     tags: ['タグ1', 'タグ2'],
//     team: 'クルー', // クルー、インポスター、ニュートラル
//     difficulty: '普通' // 簡単、普通、難しい
// });

// 役職データを取得する関数
function getRoleData() {
    return roleDatabase;
}

// IDで特定の役職を取得
function getRoleById(id) {
    return roleDatabase.find(role => role.id === id);
}

// タグでフィルター
function getRolesByTag(tag) {
    return roleDatabase.filter(role => role.tags.includes(tag));
}

// チームでフィルター
function getRolesByTeam(team) {
    return roleDatabase.filter(role => role.team === team);
}

// 難易度でフィルター
function getRolesByDifficulty(difficulty) {
    return roleDatabase.filter(role => role.difficulty === difficulty);
}