/**
 * roles/rolesList.json を自動生成するスクリプト
 * 
 * roles/yaml/ 内のJSONファイルをスキャンして
 * rolesList.jsonを自動更新
 */

const fs = require('fs');
const path = require('path');

// 設定
const YAML_DIR = path.join(__dirname, 'yaml');
const OUTPUT_FILE = path.join(__dirname, 'rolesList.json');

// 陣営フォルダ（順番も定義）
const TEAM_FOLDERS = ['crewmate', 'impostor', 'neutral', 'modifier', 'ghost', 'perk', 'secret'];

/**
 * 指定フォルダ内のJSONファイルを取得
 */
function getJsonFiles(folderPath) {
    try {
        if (!fs.existsSync(folderPath)) {
            console.log(`⚠️  ${path.basename(folderPath)} フォルダが存在しません（スキップ）`);
            return [];
        }
        
        const files = fs.readdirSync(folderPath);
        const jsonFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            const isJson = ext === '.json';
            const isNotHidden = !file.startsWith('.');
            return isJson && isNotHidden;
        }).sort();
        
        return jsonFiles;
    } catch (error) {
        console.error(`❌ ${folderPath} の読み込みエラー:`, error.message);
        return [];
    }
}

/**
 * rolesList.jsonを生成
 */
function generateRolesList() {
    console.log('📁 roles/yaml/ ディレクトリをスキャン中...\n');
    
    const rolesData = {
        _comment: 'yamlフォルダ内のJSONファイル名をリスト化',
        _update_info: '定期的にこのファイルを更新することで、追加・削除された役職が自動反映されます',
        roles: {}
    };
    
    let totalRoles = 0;
    let foundTeams = 0;
    
    // 各陣営フォルダのファイルを収集
    TEAM_FOLDERS.forEach(teamFolder => {
        const teamPath = path.join(YAML_DIR, teamFolder);
        const jsonFiles = getJsonFiles(teamPath);
        
        rolesData.roles[teamFolder] = jsonFiles;
        
        if (jsonFiles.length > 0) {
            foundTeams++;
            console.log(`✓ ${teamFolder.padEnd(15)} : ${jsonFiles.length}個の役職`);
        } else {
            console.log(`- ${teamFolder.padEnd(15)} : 0個（空）`);
        }
        
        totalRoles += jsonFiles.length;
    });
    
    // JSONファイルに書き込み
    try {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(rolesData, null, 4), 'utf8');
        console.log(`\n✅ rolesList.json を生成しました`);
        console.log(`📊 合計 ${totalRoles}個の役職を ${foundTeams}陣営に登録`);
        
        return true;
    } catch (error) {
        console.error('\n❌ ファイル書き込みエラー:', error.message);
        return false;
    }
}

/**
 * yamlディレクトリの存在確認
 */
function checkYamlDir() {
    if (!fs.existsSync(YAML_DIR)) {
        console.error(`\n❌ ${YAML_DIR} が見つかりません`);
        console.log('現在のディレクトリ:', process.cwd());
        console.log('\n💡 ヒント: このスクリプトは roles/ フォルダ内から実行してください');
        console.log('   正しい構造: project/roles/update-roles-list.js');
        return false;
    }
    return true;
}

// メイン処理
console.log('🚀 RolesList.json 自動生成開始...\n');

if (!checkYamlDir()) {
    process.exit(1);
}

const success = generateRolesList();

if (success) {
    console.log('\n✨ 完了！rolesList.jsonが更新されました');
    process.exit(0);
} else {
    console.log('\n⚠️  エラーが発生しました');
    process.exit(1);
}