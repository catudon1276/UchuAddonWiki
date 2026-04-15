// 役職データ管理
let allRoles = [];
let secretRoles = []; // シークレット役職
let filteredRoles = [];
let activeFilters = {
    search: '',
    teams: [], // 配列に変更（複数選択対応）
    froms: []  // 配列に変更（複数選択対応）
};

// 役職フォルダのマッピング
const ROLE_FOLDERS = {
    'クルーメイト': 'crewmate',
    'インポスター': 'impostor',
    'ニュートラル': 'neutral',
    'モディファイア': 'modifier',
    'ゴースト': 'ghost',
    'パーク': 'perk',
    'シークレット': 'secret'
};

// 出典元のマッピング（表示順）
const FROM_SOURCES = [
    { code: 'Original', name: 'Uchu Addon' },
    { code: 'ExR', name: 'Extreme Roles' },
    { code: 'SNR', name: 'Super New Roles' },
    { code: 'TOR', name: 'TheOtherRoles' },
    { code: 'TORGM', name: 'TheOtherRoles-GM' },
    { code: 'TOHK', name: 'TownOfHost-K' },
    { code: 'TOHY', name: 'TownOfHost-Y' },
    { code: 'TOU', name: 'TownOfUs' }
];

// 陣営フォールバックアイコン（役職にiconが未設定の場合）
const TEAM_FALLBACK_ICON = {
    'クルーメイト': 'Crewmate.png',
    'インポスター': 'Impsoter.png',
    'ニュートラル': 'Neutral.png',
    'モディファイア': 'Modifiers.png',
    'ゴースト': 'Ghost.png',
    'パーク': 'Neutral.png'
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

// JSONのiconフィールドからアイコンパスを取得
function getRoleIconPath(role) {
    const iconFile = role.icon || TEAM_FALLBACK_ICON[role.team];
    if (!iconFile) return null;
    return `../resource/roleicon/${iconFile}`;
}

function applyRoleIcon(iconElement, role) {
    if (!iconElement) return;
    const iconPath = getRoleIconPath(role);
    if (!iconPath) return;

    recolorIcon(iconPath, role.color, dataUrl => {
        if (!dataUrl) return;
        iconElement.src = dataUrl;
        iconElement.style.display = 'block';
    });
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
            secretRoles = [];
            filteredRoles = [];
            return;
        }

        const rolesList = await response.json();

        // 各陣営のフォルダから役職を読み込む
        const loadingPromises = [];
        const secretLoadingPromises = [];

        // yamlフォルダ内の各陣営フォルダから読み込み
        for (const [teamName, folderName] of Object.entries(ROLE_FOLDERS)) {
            const roles = rolesList.roles[folderName] || [];
            roles.forEach(fileName => {
                if (folderName === 'secret') {
                    // シークレット役職は別配列
                    secretLoadingPromises.push(loadRoleFromJSON(`${YAML_FOLDER}/${folderName}/${fileName}`, teamName));
                } else {
                    loadingPromises.push(loadRoleFromJSON(`${YAML_FOLDER}/${folderName}/${fileName}`, teamName));
                }
            });
        }

        const results = await Promise.all(loadingPromises);
        const secretResults = await Promise.all(secretLoadingPromises);

        // 成功した読み込みのみをフィルター
        allRoles = results.filter(role => role !== null);
        secretRoles = secretResults.filter(role => role !== null);
        filteredRoles = allRoles;

        console.log(`${allRoles.length}個の役職を読み込みました`);
        console.log(`${secretRoles.length}個のシークレット役職を読み込みました`);
    } catch (error) {
        console.error('役職データの読み込みに失敗しました:', error);
        allRoles = [];
        secretRoles = [];
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

        // シークレットフォルダから読み込まれた役職にフラグを追加
        if (teamName === 'シークレット') {
            role._isSecret = true;
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

    // チームフィルター（複数選択対応）
    document.querySelectorAll('.team-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const team = this.dataset.team;

            if (team === 'all') {
                // すべて選択時は他を解除
                activeFilters.teams = [];
                document.querySelectorAll('.team-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            } else {
                // すべてボタンを解除
                document.querySelector('.team-btn[data-team="all"]').classList.remove('active');

                // トグル動作
                const index = activeFilters.teams.indexOf(team);
                if (index > -1) {
                    activeFilters.teams.splice(index, 1);
                    this.classList.remove('active');
                } else {
                    activeFilters.teams.push(team);
                    this.classList.add('active');
                }

                // 何も選択されていない場合は「すべて」を有効化
                if (activeFilters.teams.length === 0) {
                    document.querySelector('.team-btn[data-team="all"]').classList.add('active');
                }
            }

            filterAndRender();
        });
    });

    // オーバーレイ外クリックで閉じる
    const overlay = document.getElementById('overlay');
    if (overlay) {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                closeOverlay();
            }
        });
    }

    // ESCキーでオーバーレイを閉じる
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeOverlay();
        }
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
    allBtn.textContent = 'すべて';
    allBtn.addEventListener('click', function() {
        // すべて選択時は他を解除
        activeFilters.froms = [];
        document.querySelectorAll('.from-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        filterAndRender();
    });
    container.appendChild(allBtn);

    // 出典元ボタン（複数選択対応）
    FROM_SOURCES.forEach(source => {
        const btn = document.createElement('button');
        btn.className = 'from-btn';
        btn.dataset.from = source.code;
        btn.textContent = source.name;
        btn.addEventListener('click', function() {
            const from = source.code;

            if (this.classList.contains('active')) {
                // 選択中をクリック → 「すべて」に戻す
                activeFilters.froms = [];
                document.querySelectorAll('.from-btn').forEach(b => b.classList.remove('active'));
                document.querySelector('.from-btn[data-from="all"]').classList.add('active');
            } else {
                // 別の出典を選択 → 他をすべて解除してこれだけ有効化（最大1個）
                activeFilters.froms = [from];
                document.querySelectorAll('.from-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            }

            filterAndRender();
        });
        container.appendChild(btn);
    });
}

// フィルター処理（複数選択対応）
function filterAndRender() {
    // シークレット役職の検索（大文字小文字を無視して完全一致）
    const searchLower = activeFilters.search.trim();
    const secretMatches = secretRoles.filter(role =>
        role.search_keywords && role.search_keywords.some(keyword =>
            keyword.toLowerCase() === searchLower.toLowerCase()
        )
    );

    console.log('🔍 検索キーワード:', searchLower);
    console.log('🔐 シークレットマッチ:', secretMatches.length, '件');

    // 通常の役職フィルタリング
    filteredRoles = allRoles.filter(role => {
        // 検索フィルター
        if (activeFilters.search) {
            const searchMatch = role.name.toLowerCase().includes(activeFilters.search) ||
                              role.description.toLowerCase().includes(activeFilters.search) ||
                              (role.english_name && role.english_name.toLowerCase().includes(activeFilters.search));
            if (!searchMatch) return false;
        }

        // チームフィルター（複数選択：いずれかに該当すればOK）
        if (activeFilters.teams.length > 0) {
            if (!activeFilters.teams.includes(role.team)) {
                return false;
            }
        }

        // 出典フィルター（複数選択：いずれかに該当すればOK）
        if (activeFilters.froms.length > 0) {
            if (!activeFilters.froms.includes(role.from)) {
                return false;
            }
        }

        return true;
    });

    // シークレット役職がマッチした場合は追加
    if (secretMatches.length > 0) {
        filteredRoles = [...secretMatches, ...filteredRoles];
    }

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
        <div class="role-card" onclick='showRoleDetails(${JSON.stringify(role).replace(/'/g, "&apos;")})' style="--role-color: ${roleColor};">
            <div class="role-hex-border">
                <div class="role-hex-inner">
                    <img id="${cardId}-icon" class="role-icon-img" alt="${role.name}" style="display:none;">
                </div>
            </div>
            <div class="role-name-wrap">
                <span class="role-name">${role.name}</span>
            </div>
        </div>
    `}).join('');

    container.innerHTML = cardsHTML;

    // アイコンを色変換して表示
    filteredRoles.forEach((role, index) => {
        const cardId = `role-card-${index}`;
        const iconElement = document.getElementById(`${cardId}-icon`);
        applyRoleIcon(iconElement, role);
    });

    // 文字長体＋フォントサイズ縮小
    requestAnimationFrame(() => applyRoleNameFit());
}

// チームクラスを取得
function getTeamClass(team) {
    switch(team) {
        case 'クルーメイト': return 'crew';
        case 'インポスター': return 'impostor';
        case 'ニュートラル': return 'neutral';
        case 'モディファイア': return 'modifier';
        case 'ゴースト': return 'ghost';
        case 'パーク': return 'perk';
        default: return 'neutral';
    }
}

// 役職名のはみ出し圧縮処理
function applyRoleNameFit() {
    const isMobile = window.innerWidth <= 768;

    document.querySelectorAll('.role-name-wrap').forEach(wrap => {
        const nameEl = wrap.querySelector('.role-name');
        if (!nameEl) return;
        nameEl.style.transform = '';
        nameEl.style.fontSize = '';

        const wrapW = wrap.clientWidth;
        if (wrapW <= 0) return;

        const textW = nameEl.scrollWidth;
        if (textW <= wrapW) return;

        const ratio = wrapW / textW;

        // PC では微小なはみ出し（12%未満）は無視してフォント差異を許容
        if (!isMobile && ratio >= 0.88) return;

        if (ratio >= 0.7) {
            // 軽度のはみ出し：scaleX のみ
            nameEl.style.transform = `scaleX(${ratio})`;
        } else {
            // 重度のはみ出し：フォントサイズ縮小 → 残りを scaleX で調整
            const basePx = parseFloat(getComputedStyle(nameEl).fontSize);
            const targetPx = Math.max(basePx * 0.6, basePx * ratio / 0.7);
            nameEl.style.fontSize = `${targetPx}px`;
            const newTextW = nameEl.scrollWidth;
            if (newTextW > wrapW && newTextW > 0) {
                nameEl.style.transform = `scaleX(${wrapW / newTextW})`;
            }
        }
    });
}

// フォント読み込み完了後に再計測（描画幅を正確に取得）
document.fonts.ready.then(() => applyRoleNameFit());

// 画面回転・リサイズ時に再適用
window.addEventListener('resize', () => requestAnimationFrame(() => applyRoleNameFit()));

// シークレット役職かどうか判定するヘルパー関数
function isSecretRole(role) {
    return role._isSecret === true ||
           role.team === 'SECRET' ||
           role.team === 'シークレット' ||
           (role.search_keywords && Array.isArray(role.search_keywords) && role.search_keywords.length > 0);
}

// 役職詳細を表示
function showRoleDetails(role) {
    // シークレット役職の判定（複数条件で確実に判定）
    const isSecret = isSecretRole(role);

    console.log('📋 showRoleDetails called:', role.name, 'team:', role.team, 'isSecret:', isSecret, '_isSecret:', role._isSecret, 'search_keywords:', role.search_keywords);

    if (isSecret) {
        showSecretDetails(role);
        return;
    }

    const overlayContent = document.getElementById('overlayContent');

    // 画像パス生成
    const characterPath = role.illust ? `../resource/roleimage/${role.illust}` : '';
    const fromLogoPath = role.from ? `../resource/from/${role.from}.png` : '';
    const roleColor = role.color ? `rgb(${role.color})` : 'rgb(102, 126, 234)';

    // 能力セクション生成
    let abilitiesHTML = '';
    if (role.abilities && role.abilities.length > 0) {
        const abilitiesItems = role.abilities.map(ability => {
            const buttonSrc = `../resource/rolebutton/${ability.button}`;
            return `
                <div class="ability-item mb-3">
                    <div class="d-flex align-items-start">
                        <div class="ability-button-container">
                            <img src="${buttonSrc}"
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
            `;
        }).join('');

        abilitiesHTML = `
            <div class="abilities-section mb-4">
                <h5 class="text-primary mb-3"><i class="fas fa-bolt me-2"></i>固有能力</h5>
                ${abilitiesItems}
            </div>
        `;
    }

    // ギャラリーセクション生成（画像がある場合のみ）
    let galleryHTML = '';
    if (role.gallery && role.gallery.length > 0) {
        const galleryImages = role.gallery.map(img => {
            return `
                <img src="../resource/rolepicture/${img}"
                     alt="使用イメージ"
                     class="gallery-image"
                     onerror="this.style.display='none'">
            `;
        }).join('');

        galleryHTML = `
            <div class="gallery-section mb-4">
                <h5 class="text-primary mb-3"><i class="fas fa-images me-2"></i>使用イメージ画像</h5>
                <div class="gallery-grid">
                    ${galleryImages}
                </div>
            </div>
        `;
    }

    // 出典名を取得
    const fromSourceName = role.from ? (FROM_SOURCES.find(s => s.code === role.from)?.name || role.from) : '';

    overlayContent.innerHTML = `
        ${characterPath ? `<div class="character-background" style="background-image: url('${characterPath}');"></div>` : ''}

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
                    ${fromLogoPath ? `<img src="${fromLogoPath}" alt="出典" class="role-detail-from-logo" onerror="this.style.display='none'">` : ''}
                </div>

                <div class="role-badges">
                    <div class="role-team-badge team-${getTeamClass(role.team)}">${role.team}</div>
                    ${fromSourceName ? `<div class="from-source-badge">${fromSourceName}</div>` : ''}
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
    applyRoleIcon(detailIconElement, role);

    document.getElementById('overlay').style.display = 'block';
}

// オーバーレイを閉じる
function closeOverlay() {
    document.getElementById('overlay').style.display = 'none';
}

// シークレット役職詳細を表示
function showSecretDetails(role) {
    console.log('🔐 showSecretDetails が呼ばれました:', role);

    const overlayContent = document.getElementById('overlayContent');


    // 画像パス生成
    const iconPath = `../resource/roleicon/Jargonword.png`;
    const thumbnailPath = role.thumbnail ? `../resource/rolepicture/${role.thumbnail}` : '';
    const roleColor = role.color ? `rgb(${role.color})` : 'rgb(138, 43, 226)';

    // ボタンHTML生成
    let buttonHTML = '';
    if (role.button && role.button.url) {
        buttonHTML = `
            <div style="text-align: center; margin-top: 1.5rem;">
                <a href="${role.button.url}"
                   target="_blank"
                   class="btn btn-primary btn-lg"
                   style="display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; padding: 12px 24px;">
                    <i class="fas fa-external-link-alt"></i> ${role.button.text || 'リンクを開く'}
                </a>
            </div>
        `;
    }

    overlayContent.innerHTML = `
        <div style="padding: 2rem;">
            <!-- ヘッダー部分 -->
            <div style="display: flex; align-items: flex-start; gap: 1.5rem; margin-bottom: 2rem;">
                <img id="secret-detail-icon"
                     style="width: 80px; height: 80px; object-fit: contain; flex-shrink: 0; display: none;"
                     alt="Secret">
                <div style="flex: 1;">
                    <h2 style="color: ${roleColor}; font-size: 2rem; font-weight: bold; margin: 0 0 1rem 0; line-height: 1.2;">
                        🔐 ${role.name}
                    </h2>
                    <div style="display: inline-block; padding: 0.4rem 1rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; background: ${roleColor}; color: #fff; border: 1px solid ${roleColor};">
                        SECRET
                    </div>
                </div>
            </div>

            <!-- コンテンツ部分 -->
            <div style="display: grid; grid-template-columns: ${thumbnailPath ? '200px 1fr' : '1fr'}; gap: 2rem; align-items: start;">
                ${thumbnailPath ? `
                    <div>
                        <img src="${thumbnailPath}"
                             alt="${role.name}"
                             style="width: 200px; height: 200px; object-fit: cover; border-radius: 15px; border: 3px solid ${roleColor}; display: block;"
                             onerror="this.parentElement.style.display='none'">
                    </div>
                ` : ''}

                <div>
                    <!-- 警告ボックス -->
                    <div style="background: ${roleColor.replace('rgb', 'rgba').replace(')', ', 0.15)')}; border-left: 4px solid ${roleColor}; padding: 1.25rem; border-radius: 8px; margin-bottom: 1.5rem;">
                        <strong style="color: ${roleColor}; font-size: 1rem; display: block; margin-bottom: 0.5rem;">
                            ⚠️ シークレット役職
                        </strong>
                        <span style="color: #cbd5e0; font-size: 0.9rem; line-height: 1.6;">
                            この役職は特定のキーワードで検索した場合のみ表示されます。
                        </span>
                    </div>

                    <!-- 説明文 -->
                    <p style="color: #cbd5e0; font-size: 1.1rem; line-height: 1.8; white-space: pre-wrap; margin: 0;">
                        ${role.description}
                    </p>

                    ${buttonHTML}
                </div>
            </div>
        </div>

        <!-- 閉じるボタン -->
        <div style="text-align: center; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.1);">
            <button class="btn btn-primary btn-lg px-4 py-2" onclick="closeOverlay()">
                <i class="fas fa-times me-2"></i>閉じる
            </button>
        </div>
    `;

    // Jargonwordアイコンを色変換して表示
    const secretIconElement = document.getElementById('secret-detail-icon');
    recolorIcon(iconPath, role.color, (recoloredDataURL) => {
        if (recoloredDataURL) {
            secretIconElement.src = recoloredDataURL;
            secretIconElement.style.display = 'block';
        } else {
            // フォールバック：元画像をそのまま表示
            secretIconElement.src = iconPath;
            secretIconElement.style.display = 'block';
        }
    });

    document.getElementById('overlay').style.display = 'block';
}
