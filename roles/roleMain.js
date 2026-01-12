// 役職データ管理
let allRoles = [];
let filteredRoles = [];
let activeFilters = {
    search: '',
    team: 'all',
    tags: []
};

// ページ読み込み時に実行
document.addEventListener('DOMContentLoaded', function() {
    // データベースから役職データを読み込む
    allRoles = getRoleData();
    filteredRoles = allRoles;
    
    // 統計情報を更新
    updateStats();
    
    setupEventListeners();
    renderTags();
    renderRoles();
});

// 統計情報を更新
function updateStats() {
    const statsHtml = `
        <span class="badge bg-primary me-2">${allRoles.length} 役職</span>
        <span class="badge bg-secondary">フィルター機能付き</span>
    `;
    // ヒーローセクションに統計を表示
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        const statsDiv = document.createElement('div');
        statsDiv.className = 'mt-4';
        statsDiv.innerHTML = statsHtml;
        heroSection.appendChild(statsDiv);
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
            <div class="role-card" onclick="showRoleDetails('${role.id}')" style="border-left: 4px solid ${role.color || '#667eea'};">
                <div class="role-header">
                    <div class="d-flex align-items-center mb-3">
                        <img src="${role.character_image || 'https://via.placeholder.com/80x120/667eea/white?text=' + role.name.charAt(0)}" 
                             alt="${role.name}" class="role-character">
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
        case 'クルー': return 'crew';
        case 'インポスター': return 'impostor';
        case 'ニュートラル': return 'neutral';
        default: return 'neutral';
    }
}

// 役職詳細を表示
function showRoleDetails(roleId) {
    const role = getRoleById(roleId);
    if (!role) return;

    const overlayContent = document.getElementById('overlayContent');
    overlayContent.innerHTML = `
        <div class="row">
            <div class="col-md-4 text-center mb-4 mb-md-0">
                <img src="${role.character_image || 'https://via.placeholder.com/200x300/667eea/white?text=' + role.name.charAt(0)}" 
                     alt="${role.name}" class="img-fluid rounded-3 shadow-lg" 
                     style="border: 3px solid ${role.color || '#667eea'};">
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