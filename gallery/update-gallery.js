/**
 * gallery/gallery.json を自動生成するスクリプト
 * 
 * 役職リスト自動化（update-roles-list.js）と同じパターン
 * resource/ 内の画像を自動検出してgallery.jsonを更新
 */

const fs = require('fs');
const path = require('path');

// 設定
const RESOURCE_DIR = path.join(__dirname, '..', 'resource');
const OUTPUT_FILE = path.join(__dirname, 'gallery.json');

// カテゴリ設定（表示順も含む）
// 使用するカテゴリのみ定義
const CATEGORY_CONFIG = {
    'logo': {
        name: 'ロゴ・タイトル',
        description: 'UchuAddonの公式ロゴ',
        order: 1,
        fixedFiles: ['UchuAddonTitleFront.png', 'UchuAddonTitleLogo.png']  // 固定ファイル
    },
    'roleimage': {
        name: '役職立ち絵',
        description: '役職詳細ページの背景画像・立ち絵',
        order: 2
    },
    'rolebutton': {
        name: '能力ボタン',
        description: '役職の能力ボタン画像',
        order: 3
    }
};

// 画像ファイルの拡張子
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'];

/**
 * 指定ディレクトリ内の画像ファイルを取得
 */
function getImageFiles(dirPath, categoryConfig) {
    // 固定ファイルが指定されている場合はそれを返す
    if (categoryConfig.fixedFiles) {
        console.log(`  固定ファイル設定を使用: ${categoryConfig.fixedFiles.length}個`);
        // 固定ファイルが実際に存在するか確認
        const existingFiles = categoryConfig.fixedFiles.filter(file => {
            const fullPath = path.join(RESOURCE_DIR, file);
            return fs.existsSync(fullPath);
        });
        if (existingFiles.length !== categoryConfig.fixedFiles.length) {
            console.log(`  ⚠️  一部のファイルが見つかりません`);
        }
        return existingFiles;
    }
    
    try {
        if (!fs.existsSync(dirPath)) {
            console.log(`⚠️  ${path.basename(dirPath)} フォルダが存在しません（スキップ）`);
            return [];
        }
        
        const files = fs.readdirSync(dirPath);
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            const isImage = IMAGE_EXTENSIONS.includes(ext);
            const isNotHidden = !file.startsWith('.');
            return isImage && isNotHidden;
        }).sort();
        
        return imageFiles;
    } catch (error) {
        console.error(`❌ ${dirPath} の読み込みエラー:`, error.message);
        return [];
    }
}

/**
 * gallery.jsonを生成
 */
function generateGalleryJson() {
    console.log('📁 resourceディレクトリをスキャン中...\n');
    
    const galleryData = {
        _comment: 'ギャラリーページで表示する画像リスト。このファイルは自動生成されています。',
        _update_info: 'resourceフォルダに画像を追加すると、GitHub Actions経由で自動更新されます',
        _generated_at: new Date().toISOString()
    };
    
    let totalImages = 0;
    let foundCategories = 0;
    
    // 各カテゴリの画像を収集
    Object.keys(CATEGORY_CONFIG)
        .sort((a, b) => CATEGORY_CONFIG[a].order - CATEGORY_CONFIG[b].order)
        .forEach(categoryId => {
            const categoryConfig = CATEGORY_CONFIG[categoryId];
            const categoryPath = path.join(RESOURCE_DIR, categoryId);
            const images = getImageFiles(categoryPath, categoryConfig);
            
            galleryData[categoryId] = {
                name: categoryConfig.name,
                description: categoryConfig.description,
                images: images
            };
            
            if (images.length > 0) {
                foundCategories++;
                console.log(`✓ ${categoryId.padEnd(15)} : ${images.length}個の画像`);
            } else {
                console.log(`- ${categoryId.padEnd(15)} : 0個（空）`);
            }
            
            totalImages += images.length;
        });
    
    // JSONファイルに書き込み
    try {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(galleryData, null, 4), 'utf8');
        console.log(`\n✅ gallery.json を生成しました`);
        console.log(`📊 合計 ${totalImages}個の画像を ${foundCategories}カテゴリに登録`);
        
        return true;
    } catch (error) {
        console.error('\n❌ ファイル書き込みエラー:', error.message);
        return false;
    }
}

/**
 * resourceディレクトリの存在確認
 */
function checkResourceDir() {
    if (!fs.existsSync(RESOURCE_DIR)) {
        console.error(`\n❌ ${RESOURCE_DIR} が見つかりません`);
        console.log('現在のディレクトリ:', process.cwd());
        console.log('\n💡 ヒント: このスクリプトは gallery/ フォルダ内から実行してください');
        console.log('   正しい構造: project/gallery/update-gallery.js');
        return false;
    }
    return true;
}

// メイン処理
console.log('🚀 Gallery.json 自動生成開始...\n');

if (!checkResourceDir()) {
    process.exit(1);
}

const success = generateGalleryJson();

if (success) {
    console.log('\n✨ 完了！gallery.jsonが更新されました');
    process.exit(0);
} else {
    console.log('\n⚠️  エラーが発生しました');
    process.exit(1);
}