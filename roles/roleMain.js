// 役職データ管理
let allRoles = [];
let filteredRoles = [];
let activeFilters = {
    search: '',
    team: 'all',
    from: 'all'
};

// 役職フォルダのマッピング
const ROLE_FOLDERS = {
    'クルーメイト': 'crewmate',
    'インポスター': 'impostor',
    'ニュートラル': 'neutral',
    'モディファイア': 'modifier',
    'ゴースト': 'ghost'
};

// 出典元のマッピング（表示順）
const FROM_SOURCES = [
    { code: 'Original', name: 'Uchu Addon' },
    { code: 'ExR', name: 'Extreme Roles' },
    { code: 'SNR', name: 'Super New Roles' },
    { code: 'TOR', name: 'The Other Roles' },
    { code: 'TOHK', name: 'Town Of Host-K' },
    { code: 'TOHY', name: 'Town Of Host-Y' },
    { code: 'TOU', name: 'Town Of Us' }
];

// 陣営アイコンのフォールバック
const TEAM_ICONS = {
    'クルーメイト': 'Crewmate.png',
    'インポスター': 'Impostor.png',
    'ニュートラル': 'Neutral.png',
    'モディファイア': 'Modifier.png',
    'ゴースト': 'Ghost.png'
};

// アイコンの色を変換（赤→役職カラー、青→白）
function recolorIcon(imagePath, roleColor, callback) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // RGB値を取得（"72, 187, 120" → [72, 187, 120]）
        const targetRGB = roleColor ? roleColor.split(',').map(n => parseInt(n.trim())) : [102, 126, 234];
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            // 赤色の検出（赤が強く、緑青が弱い）
            if (r > 150 && g < 100 && b < 100) {
                // 赤→役職カラーに変換
                data[i] = targetRGB[0];
                data[i + 1] = targetRGB[1];
                data[i + 2] = targetRGB[2];
            }
            // 青色の検出（青が強く、赤緑が弱い）
            else if (b > 150 && r < 100 && g < 100) {
                // 青→白に変換
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        callback(canvas.toDataURL());
    };
    
    img.onerror = function() {
        callback(null);
    };
    
    img.src = imagePath;
}

// YAMLフォルダから役職リストを自動生成
const YAML_FOLDER = 'yaml';

// rolesList.json から役職リストを取得
const ROLE_LIST_FILE = 'rolesList.json';

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', async function() {
    await loadAllRoles();
    setupEventListeners();
    renderFromFilters();
    renderRoles();
});

// すべての役職データを読み込む
async function loadAllRoles() {
    try {
        // rolesList.json から役職リストを取得
        const response = await fetch('rolesList.json');
        if (!response.ok) {
            console.error('rolesList.json が見つかりません。');
            allRoles = [];
            filteredRoles = [];
            return;
        }
        
        const rolesList = await response.json();
        
        // 各陣営のフォルダから役職を読み込む
        const loadingPromises = [];
        
        // yamlフォルダ内の各陣営フォルダから読み込み
        for (const [teamName, folderName] of Object.entries(ROLE_FOLDERS)) {
            const roles = rolesList.roles[folderName] || [];
            roles.forEach(fileName => {
                loadingPromises.push(loadRoleFromJSON(`${YAML_FOLDER}/${folderName}/${fileName}`, teamName));
            });
        }
        
        const results = await Promise.all(loadingPromises);
        
        // 成功した読み込みのみをフィルター
        allRoles = results.filter(role => role !== null);
        filteredRoles = allRoles;
        
        console.log(`${allRoles.length}個の役職を読み込みました`);
    } catch (error) {
        console.error('役職データの読み込みに失敗しました:', error);
        allRoles = [];
        filteredRoles = [];
    }
}

// JSONファイルから役職データを読み込む
async function loadRoleFromJSON(filePath, teamName) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            console.warn(`${filePath} の読み込みに失敗しました（削除された可能性があります）`);
            return null;
        }
        const role = await response.json();
        
        // teamが指定されていない場合、フォルダ名から自動設定
        if (!role.team) {
            role.team = teamName;
        }
        
        return role;
    } catch (error) {
        console.error(`${filePath} の読み込みエラー:`, error);
        return null;
    }
}

// イベントリスナーを設定
function setupEventListeners() {
    // 検索ボックス
    document.getElementById('searchInput').addEventListener('input', function(e) {
        activeFilters.search = e.target.value.toLowerCase();
        filterAndRender();
    });

    // チームフィルター
    document.querySelectorAll('.team-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            activeFilters.team = this.dataset.team;
            filterAndRender();
        });
    });
}

// 出典フィルターをレンダリング
function renderFromFilters() {
    const container = document.getElementById('fromContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    // すべてボタン
    const allBtn = document.createElement('button');
    allBtn.className = 'from-btn active';
    allBtn.dataset.from = 'all';
    allBtn.innerHTML = '<i class="fas fa-globe me-2"></i>すべて';
    allBtn.addEventListener('click', function() {
        document.querySelectorAll('.from-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        activeFilters.from = 'all';
        filterAndRender();
    });
    container.appendChild(allBtn);
    
    // 出典元ボタン
    FROM_SOURCES.forEach(source => {
        const btn = document.createElement('button');
        btn.className = 'from-btn';
        btn.dataset.from = source.code;
        btn.textContent = source.name;
        btn.addEventListener('click', function() {
            document.querySelectorAll('.from-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            activeFilters.from = source.code;
            filterAndRender();
        });
        container.appendChild(btn);
    });
}

// フィルター処理
function filterAndRender() {
    filteredRoles = allRoles.filter(role => {
        // 検索フィルター
        if (activeFilters.search) {
            const searchMatch = role.name.toLowerCase().includes(activeFilters.search) || 
                              role.description.toLowerCase().includes(activeFilters.search) ||
                              (role.english_name && role.english_name.toLowerCase().includes(activeFilters.search));
            if (!searchMatch) return false;
        }

        // チームフィルター
        if (activeFilters.team !== 'all' && role.team !== activeFilters.team) {
            return false;
        }

        // 出典フィルター
        if (activeFilters.from !== 'all' && role.from !== activeFilters.from) {
            return false;
        }

        return true;
    });

    renderRoles();
}

// 役職カードをレンダリング
function renderRoles() {
    const container = document.getElementById('rolesContainer');
    const noResults = document.getElementById('noResults');
    
    if (filteredRoles.length === 0) {
        container.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }

    noResults.style.display = 'none';
    
    // カードを生成
    const cardsHTML = filteredRoles.map((role, index) => {
        const roleColor = role.color ? `rgb(${role.color})` : 'rgb(102, 126, 234)';
        const cardId = `role-card-${index}`;
        
        return `
        <div class="col-lg-6 col-xl-4 mb-4">
            <div class="role-card" onclick='showRoleDetails(${JSON.stringify(role).replace(/'/g, "&apos;")})' style="border-left: 4px solid ${roleColor};">
                <img id="${cardId}-icon" class="role-card-icon" alt="${role.name}" style="display:none;">
                <div class="role-card-content">
                    <div class="role-name">${role.name}</div>
                    <div class="role-description">${role.description}</div>
                </div>
            </div>
        </div>
    `}).join('');
    
    container.innerHTML = cardsHTML;
    
    // アイコンを色変換して表示
    filteredRoles.forEach((role, index) => {
        const cardId = `role-card-${index}`;
        const iconElement = document.getElementById(`${cardId}-icon`);
        const iconPath = role.english_name ? `../resource/roleicon/${role.english_name}.png` : '';
        const fallbackIcon = TEAM_ICONS[role.team] ? `../resource/roleicon/${TEAM_ICONS[role.team]}` : '';
        
        if (iconPath) {
            recolorIcon(iconPath, role.color, (recoloredDataURL) => {
                if (recoloredDataURL) {
                    iconElement.src = recoloredDataURL;
                    iconElement.style.display = 'block';
                } else if (fallbackIcon) {
                    // フォールバック
                    recolorIcon(fallbackIcon, role.color, (fallbackDataURL) => {
                        if (fallbackDataURL) {
                            iconElement.src = fallbackDataURL;
                            iconElement.style.display = 'block';
                        }
                    });
                }
            });
        }
    });
}

// チームクラスを取得
function getTeamClass(team) {
    switch(team) {
        case 'クルーメイト': return 'crew';
        case 'インポスター': return 'impostor';
        case 'ニュートラル': return 'neutral';
        case 'モディファイア': return 'modifier';
        case 'ゴースト': return 'ghost';
        default: return 'neutral';
    }
}

// 役職詳細を表示
function showRoleDetails(role) {
    const overlayContent = document.getElementById('overlayContent');
    
    // 画像パス生成
    const iconPath = role.english_name ? `../resource/roleicon/${role.english_name}.png` : '';
    const fallbackIcon = TEAM_ICONS[role.team] ? `../resource/roleicon/${TEAM_ICONS[role.team]}` : '';
    const characterPath = role.english_name ? `../resource/roleimage/${role.english_name}.png` : '';
    const fromLogoPath = role.from ? `../resource/from/${role.from}.png` : '';
    const roleColor = role.color ? `rgb(${role.color})` : 'rgb(102, 126, 234)';
    
    // 能力セクション生成
    const abilitiesHTML = role.abilities && role.abilities.length > 0 ? `
        <div class="abilities-section mb-4">
            <h5 class="text-primary mb-3"><i class="fas fa-bolt me-2"></i>固有能力</h5>
            ${role.abilities.map(ability => `
                <div class="ability-item mb-3">
                    <div class="d-flex align-items-start">
                        <div class="ability-button-container">
                            <img src="../resource/rolebutton/${ability.button}" 
                                 alt="${ability.name}" 
                                 class="ability-button"
                                 onerror="this.src='../resource/rolebutton/NoImage.png'">
                        </div>
                        <div class="ability-content ms-3">
                            <h6 class="ability-name">${ability.name}</h6>
                            <p class="ability-description">${ability.description}</p>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    ` : '';
    
    // ギャラリーセクション生成（画像がある場合のみ）
    const galleryHTML = role.gallery && role.gallery.length > 0 ? `
        <div class="gallery-section mb-4">
            <h5 class="text-primary mb-3"><i class="fas fa-images me-2"></i>使用イメージ画像</h5>
            <div class="gallery-grid">
                ${role.gallery.map(img => `
                    <img src="../resource/rolepicture/${img}" 
                         alt="使用イメージ" 
                         class="gallery-image"
                         onerror="this.style.display='none'">
                `).join('')}
            </div>
        </div>
    ` : '';
    
    overlayContent.innerHTML = `
        ${characterPath ? `
            <div class="character-background" style="background-image: url('${characterPath}');"></div>
        ` : ''}
        
        <div class="role-detail-header">
            <div class="role-detail-title-section">
                <div class="role-detail-intro-section">
                    <img id="detail-icon" class="role-detail-icon-large" alt="${role.name}" style="display:none;">
                    <div class="role-detail-content-wrapper">
                        <h2 class="role-detail-name" style="color: ${roleColor};">
                            ${role.name}
                            ${role.english_name ? `<span class="role-detail-english-inline">${role.english_name}</span>` : ''}
                        </h2>
                        ${role.intro ? `<div class="role-detail-intro-text">${role.intro}</div>` : ''}
                    </div>
                    ${fromLogoPath ? `
                        <img src="${fromLogoPath}" alt="出典" class="role-detail-from-logo" onerror="this.style.display='none'">
                    ` : ''}
                </div>
                
                <div class="role-badges">
                    <div class="role-team-badge team-${getTeamClass(role.team)}">${role.team}</div>
                    ${role.from ? `
                        <div class="from-source-badge">${FROM_SOURCES.find(s => s.code === role.from)?.name || role.from}</div>
                    ` : ''}
                </div>
            </div>
        </div>
        
        <div class="row position-relative" style="z-index: 2;">
            <div class="col-md-12">
                <div class="mb-4">
                    <p class="role-detail-description">${role.description}</p>
                </div>
                
                ${abilitiesHTML}
                
                ${role.tips ? `
                    <div class="mb-4">
                        <h5 class="text-primary mb-3"><i class="fas fa-lightbulb me-2"></i>豆知識</h5>
                        <p class="tips-text">${role.tips}</p>
                    </div>
                ` : ''}
            </div>
        </div>
        
        ${galleryHTML}
        
        <div class="text-center mt-4 position-relative" style="z-index: 2;">
            <button class="btn btn-primary btn-lg px-4 py-2" onclick="closeOverlay()">
                <i class="fas fa-times me-2"></i>閉じる
            </button>
        </div>
    `;

    // アイコンを色変換して表示
    const detailIconElement = document.getElementById('detail-icon');
    if (iconPath) {
        recolorIcon(iconPath, role.color, (recoloredDataURL) => {
            if (recoloredDataURL) {
                detailIconElement.src = recoloredDataURL;
                detailIconElement.style.display = 'block';
            } else if (fallbackIcon) {
                recolorIcon(fallbackIcon, role.color, (fallbackDataURL) => {
                    if (fallbackDataURL) {
                        detailIconElement.src = fallbackDataURL;
                        detailIconElement.style.display = 'block';
                    }
                });
            }
        });
    }

    document.getElementById('overlay').style.display = 'block';
}

// オーバーレイを閉じる
function closeOverlay() {
    document.getElementById('overlay').style.display = 'none';
}

// オーバーレイ外クリックで閉じる
document.getElementById('overlay').addEventListener('click', function(e) {
    if (e.target === this) {
        closeOverlay();
    }
});

// ESCキーでオーバーレイを閉じる
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeOverlay();
    }
});