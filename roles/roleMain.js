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
    '第3陣営': 'neutral',
    'モディファイア': 'modifier',
    '幽霊': 'ghost'
};

// 出典元のマッピング
const FROM_SOURCES = {
    'ExR': 'ExtremeRoles',
    'SNR': 'SuperNewRoles'
};

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
    for (const [code, name] of Object.entries(FROM_SOURCES)) {
        const btn = document.createElement('button');
        btn.className = 'from-btn';
        btn.dataset.from = code;
        btn.textContent = name;
        btn.addEventListener('click', function() {
            document.querySelectorAll('.from-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            activeFilters.from = code;
            filterAndRender();
        });
        container.appendChild(btn);
    }
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
    container.innerHTML = filteredRoles.map(role => {
        const iconPath = role.english_name ? `../resource/roleicon/${role.english_name}.png` : '';
        
        return `
        <div class="col-lg-6 col-xl-4 mb-4">
            <div class="role-card" onclick='showRoleDetails(${JSON.stringify(role).replace(/'/g, "&apos;")})' style="border-left: 4px solid ${role.color || '#667eea'};">
                <div class="role-header">
                    <div class="d-flex align-items-center mb-3">
                        ${iconPath ? `<img src="${iconPath}" alt="${role.name}" class="role-icon" onerror="this.style.display='none'">` : ''}
                        <div class="ms-3">
                            <div class="role-name">${role.name}</div>
                            <div class="role-team-badge team-${getTeamClass(role.team)}">${role.team}</div>
                        </div>
                    </div>
                </div>
                ${role.intro ? `<div class="role-intro">${role.intro}</div>` : ''}
                <div class="role-description">${role.description}</div>
            </div>
        </div>
    `}).join('');
}

// チームクラスを取得
function getTeamClass(team) {
    switch(team) {
        case 'クルーメイト': return 'crew';
        case 'インポスター': return 'impostor';
        case '第3陣営': return 'neutral';
        case 'モディファイア': return 'modifier';
        case '幽霊': return 'ghost';
        default: return 'neutral';
    }
}

// 役職詳細を表示
function showRoleDetails(role) {
    const overlayContent = document.getElementById('overlayContent');
    
    // 画像パス生成
    const iconPath = role.english_name ? `../resource/roleicon/${role.english_name}.png` : '';
    const characterPath = role.english_name ? `../resource/roleimage/${role.english_name}.png` : '';
    const fromLogoPath = role.from ? `../resource/from/${role.from}.png` : '';
    
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
    
    // ギャラリーセクション生成
    const galleryHTML = role.gallery && role.gallery.length > 0 ? `
        <div class="gallery-section mb-4">
            <h5 class="text-primary mb-3"><i class="fas fa-images me-2"></i>ギャラリー</h5>
            <div class="gallery-grid">
                ${role.gallery.map(img => `
                    <img src="../resource/rolepicture/${img}" 
                         alt="ギャラリー画像" 
                         class="gallery-image"
                         onerror="this.style.display='none'">
                `).join('')}
            </div>
        </div>
    ` : '';
    
    overlayContent.innerHTML = `
        <div class="role-detail-header mb-4">
            <div class="d-flex justify-content-between align-items-start">
                <div class="d-flex align-items-center">
                    ${iconPath ? `<img src="${iconPath}" alt="${role.name}" class="role-detail-icon me-3" onerror="this.style.display='none'">` : ''}
                    <div>
                        <h2 class="role-detail-name mb-2" style="color: ${role.color || '#667eea'};">${role.name}</h2>
                        <div class="role-team-badge team-${getTeamClass(role.team)} d-inline-block">${role.team}</div>
                    </div>
                </div>
                ${fromLogoPath ? `<img src="${fromLogoPath}" alt="出典" class="from-logo" onerror="this.style.display='none'">` : ''}
            </div>
            ${role.intro ? `<div class="role-detail-intro mt-3">${role.intro}</div>` : ''}
        </div>
        
        <div class="row">
            <div class="col-md-4 text-center mb-4">
                ${characterPath ? `
                    <div class="character-container">
                        <img src="${characterPath}" 
                             alt="${role.name}" 
                             class="character-image"
                             onerror="this.style.display='none'">
                    </div>
                ` : ''}
            </div>
            
            <div class="col-md-8">
                <div class="mb-4">
                    <h5 class="text-primary mb-3"><i class="fas fa-info-circle me-2"></i>概要</h5>
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
        
        <div class="text-center mt-4">
            <button class="btn btn-primary btn-lg px-4 py-2" onclick="closeOverlay()">
                <i class="fas fa-times me-2"></i>閉じる
            </button>
        </div>
    `;

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