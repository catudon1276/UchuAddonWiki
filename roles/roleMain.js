// 役職データ管理
let allRoles = [];
let filteredRoles = [];
let activeFilters = {
    search: '',
    team: 'all',
    tags: []
};

// 役職フォルダのマッピング
const ROLE_FOLDERS = {
    'クルーメイト': 'crewmate',
    'インポスター': 'impostor',
    '第3陣営': 'neutral',
    'モディファイア': 'modifier',
    '幽霊': 'ghost'
};

// YAMLフォルダから役職リストを自動生成
const YAML_FOLDER = 'yaml';

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', async function() {
    await loadAllRoles();
    setupEventListeners();
    renderTags();
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

// タグをレンダリング
function renderTags() {
    const tagsContainer = document.getElementById('tagsContainer');
    const allTags = [...new Set(allRoles.flatMap(role => role.tags))];
    
    tagsContainer.innerHTML = '';
    allTags.forEach(tag => {
        const tagElement = document.createElement('div');
        tagElement.className = 'tag-filter';
        tagElement.textContent = tag;
        tagElement.addEventListener('click', function() {
            this.classList.toggle('active');
            const tagIndex = activeFilters.tags.indexOf(tag);
            if (tagIndex > -1) {
                activeFilters.tags.splice(tagIndex, 1);
            } else {
                activeFilters.tags.push(tag);
            }
            filterAndRender();
        });
        tagsContainer.appendChild(tagElement);
    });
}

// フィルター処理
function filterAndRender() {
    filteredRoles = allRoles.filter(role => {
        // 検索フィルター
        if (activeFilters.search) {
            const searchMatch = role.name.toLowerCase().includes(activeFilters.search) || 
                              role.description.toLowerCase().includes(activeFilters.search) ||
                              role.tags.some(tag => tag.toLowerCase().includes(activeFilters.search));
            if (!searchMatch) return false;
        }

        // チームフィルター
        if (activeFilters.team !== 'all' && role.team !== activeFilters.team) {
            return false;
        }

        // タグフィルター
        if (activeFilters.tags.length > 0) {
            const hasAllTags = activeFilters.tags.every(tag => role.tags.includes(tag));
            if (!hasAllTags) return false;
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
    container.innerHTML = filteredRoles.map(role => `
        <div class="col-lg-6 col-xl-4 mb-4">
            <div class="role-card" onclick='showRoleDetails(${JSON.stringify(role).replace(/'/g, "&apos;")})' style="border-left: 4px solid ${role.color || '#667eea'};">
                <div class="role-header">
                    <div class="d-flex align-items-center mb-3">
                        <img src="${role.character_image || 'https://via.placeholder.com/80x120/667eea/white?text=' + encodeURIComponent(role.name.charAt(0))}" 
                             alt="${role.name}" class="role-character" onerror="this.src='https://via.placeholder.com/80x120/667eea/white?text=' + encodeURIComponent('${role.name.charAt(0)}')">
                        <div class="ms-3">
                            <div class="role-name">${role.name}</div>
                            <div class="role-team-badge team-${getTeamClass(role.team)}">${role.team}</div>
                        </div>
                    </div>
                </div>
                <div class="role-description">${role.description}</div>
                <div class="role-tags">
                    ${role.tags.map(tag => `<span class="role-tag">${tag}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
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
    overlayContent.innerHTML = `
        <div class="row">
            <div class="col-md-4 text-center mb-4 mb-md-0">
                <img src="${role.character_image || 'https://via.placeholder.com/200x300/667eea/white?text=' + encodeURIComponent(role.name.charAt(0))}" 
                     alt="${role.name}" class="img-fluid rounded-3 shadow-lg" 
                     style="border: 3px solid ${role.color || '#667eea'};"
                     onerror="this.src='https://via.placeholder.com/200x300/667eea/white?text=' + encodeURIComponent('${role.name.charAt(0)}')">
                <div class="mt-3">
                    <div class="role-team-badge team-${getTeamClass(role.team)} d-inline-block px-3 py-2">
                        ${role.team}
                    </div>
                </div>
            </div>
            <div class="col-md-8">
                <div class="text-center mb-4">
                    <h2 class="role-name" style="font-size: 2.5rem;">${role.name}</h2>
                    <div class="badge bg-gradient px-3 py-2" style="background: ${role.color || '#667eea'};">
                        <i class="fas fa-signal me-2"></i>難易度: ${role.difficulty}
                    </div>
                </div>
                
                <div class="mb-4">
                    <h5 class="text-primary mb-3"><i class="fas fa-info-circle me-2"></i>説明</h5>
                    <p class="role-description" style="font-size: 1.1rem;">${role.description}</p>
                </div>
                
                ${role.abilities ? `
                <div class="mb-4">
                    <h5 class="text-primary mb-3"><i class="fas fa-bolt me-2"></i>能力</h5>
                    <ul class="list-unstyled">
                        ${role.abilities.map(ability => `
                            <li class="mb-2">
                                <i class="fas fa-check-circle text-success me-2"></i>${ability}
                            </li>
                        `).join('')}
                    </ul>
                </div>
                ` : ''}
                
                ${role.win_condition ? `
                <div class="mb-4">
                    <h5 class="text-primary mb-3"><i class="fas fa-trophy me-2"></i>勝利条件</h5>
                    <p class="text-light">${role.win_condition}</p>
                </div>
                ` : ''}
                
                ${role.tips && role.tips.length > 0 ? `
                <div class="mb-4">
                    <h5 class="text-primary mb-3"><i class="fas fa-lightbulb me-2"></i>プレイのコツ</h5>
                    <ul class="list-unstyled">
                        ${role.tips.map(tip => `
                            <li class="mb-2">
                                <i class="fas fa-star text-warning me-2"></i>${tip}
                            </li>
                        `).join('')}
                    </ul>
                </div>
                ` : ''}
                
                <div class="row mb-4">
                    <div class="col-12">
                        <h5 class="text-primary mb-3"><i class="fas fa-tags me-2"></i>タグ</h5>
                        <div class="role-tags">
                            ${role.tags.map(tag => `<span class="role-tag" style="font-size: 0.9rem;">${tag}</span>`).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="text-center mt-4">
                    <button class="btn btn-primary btn-lg px-4 py-2" onclick="closeOverlay()">
                        <i class="fas fa-times me-2"></i>閉じる
                    </button>
                </div>
            </div>
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