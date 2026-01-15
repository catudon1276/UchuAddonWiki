// ギャラリーデータ管理
let galleryData = {};
let currentCategory = 'all';

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', async function() {
    await loadGalleryData();
    setupEventListeners();
    renderGallery();
});

// ギャラリーデータを読み込む
async function loadGalleryData() {
    try {
        const response = await fetch('gallery.json');
        if (!response.ok) {
            console.error('gallery.json が見つかりません。空のギャラリーを表示します。');
            galleryData = {};
            return;
        }
        
        galleryData = await response.json();
        
        // メタデータフィールドを除外
        delete galleryData._comment;
        delete galleryData._update_info;
        delete galleryData._generated_at;
        
        console.log(`${getTotalImageCount()}個の画像を読み込みました`);
    } catch (error) {
        console.error('ギャラリーデータの読み込みに失敗しました:', error);
        galleryData = {};
    }
}

// 総画像数を取得（NoImage.pngを除外）
function getTotalImageCount() {
    let count = 0;
    Object.values(galleryData).forEach(category => {
        if (category.images) {
            const filteredImages = category.images.filter(filename => filename !== 'NoImage.png');
            count += filteredImages.length;
        }
    });
    return count;
}

// イベントリスナーを設定
function setupEventListeners() {
    const categoryButtons = document.getElementById('categoryButtons');
    
    // カテゴリボタンを生成
    Object.keys(galleryData).forEach(categoryId => {
        const category = galleryData[categoryId];
        if (!category.images) return;
        
        // NoImage.pngを除外してカウント
        const filteredCount = category.images.filter(filename => filename !== 'NoImage.png').length;
        
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.dataset.category = categoryId;
        btn.innerHTML = `<i class="fas fa-folder me-2"></i>${category.name} (${filteredCount})`;
        btn.addEventListener('click', function() {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentCategory = categoryId;
            renderGallery();
        });
        categoryButtons.appendChild(btn);
    });
    
    // 統計情報を更新
    document.getElementById('totalCount').textContent = getTotalImageCount();
    document.getElementById('categoryCount').textContent = Object.keys(galleryData).length;
}

// ギャラリーをレンダリング
function renderGallery() {
    const container = document.getElementById('galleryContent');
    container.innerHTML = '';
    
    if (Object.keys(galleryData).length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-images"></i>
                <p>画像がまだ登録されていません</p>
            </div>
        `;
        return;
    }
    
    // カテゴリボタンのactive状態を更新
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === currentCategory) {
            btn.classList.add('active');
        }
    });
    
    if (currentCategory === 'all') {
        // すべてのカテゴリを表示
        Object.keys(galleryData).forEach(categoryId => {
            renderCategory(categoryId, container);
        });
    } else {
        // 特定のカテゴリのみ表示
        renderCategory(currentCategory, container);
    }
}

// カテゴリをレンダリング
function renderCategory(categoryId, container) {
    const category = galleryData[categoryId];
    if (!category || !category.images || category.images.length === 0) return;
    
    // NoImage.pngを除外
    const filteredImages = category.images.filter(filename => filename !== 'NoImage.png');
    
    if (filteredImages.length === 0) return;
    
    const section = document.createElement('div');
    section.className = 'category-section';
    
    const title = document.createElement('h2');
    title.className = 'category-title';
    title.innerHTML = `
        <i class="fas fa-folder-open me-2"></i>${category.name}
        <small style="font-size: 0.7rem; color: #a0aec0; font-weight: normal; margin-left: 1rem;">
            ${category.description || ''} (${filteredImages.length}枚)
        </small>
    `;
    section.appendChild(title);
    
    const grid = document.createElement('div');
    grid.className = 'gallery-grid';
    
    filteredImages.forEach(filename => {
        const item = createGalleryItem(categoryId, filename);
        grid.appendChild(item);
    });
    
    section.appendChild(grid);
    container.appendChild(section);
}

// ギャラリーアイテムを作成
function createGalleryItem(categoryId, filename) {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    
    // パスを修正: logoカテゴリはresource直下、それ以外はサブフォルダ
    const imagePath = categoryId === 'logo' 
        ? `../resource/${filename}`
        : `../resource/${categoryId}/${filename}`;
    
    const img = document.createElement('img');
    img.className = 'gallery-image';
    img.src = imagePath;
    img.alt = filename;
    img.onerror = function() {
        this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150"%3E%3Crect fill="%23333" width="200" height="150"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%23666" font-family="Arial" font-size="12"%3EImage Not Found%3C/text%3E%3C/svg%3E';
    };
    
    item.appendChild(img);
    
    // ファイル名は一切表示しない
    
    // クリックでモーダル表示
    item.onclick = function() {
        openImageModal(imagePath, filename);
    };
    
    return item;
}

// 画像をダウンロード
function downloadImage(imagePath, filename) {
    const link = document.createElement('a');
    link.href = imagePath;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // ダウンロード成功のフィードバック
    showToast(`${filename} をダウンロードしました`);
}

// 画像モーダルを開く
function openImageModal(imagePath, filename) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalDownloadBtn = document.getElementById('modalDownloadBtn');
    
    modalImage.src = imagePath;
    modal.classList.add('active');
    
    // ダウンロードボタンのイベント
    modalDownloadBtn.onclick = function() {
        downloadImage(imagePath, filename);
    };
    
    // ESCキーで閉じる
    document.addEventListener('keydown', closeModalOnEsc);
}

// 画像モーダルを閉じる
function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.remove('active');
    document.removeEventListener('keydown', closeModalOnEsc);
}

// ESCキーでモーダルを閉じる
function closeModalOnEsc(e) {
    if (e.key === 'Escape') {
        closeImageModal();
    }
}

// モーダル初期化
document.addEventListener('DOMContentLoaded', function() {
    // 閉じるボタン
    document.getElementById('modalCloseBtn').addEventListener('click', closeImageModal);
    
    // モーダル背景クリックで閉じる
    document.getElementById('imageModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeImageModal();
        }
    });
});

// トースト通知を表示
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(45deg, #667eea, #764ba2);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    toast.innerHTML = `<i class="fas fa-check-circle me-2"></i>${message}`;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 2000);
}