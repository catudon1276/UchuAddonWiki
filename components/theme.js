// ---- テーマ初期化（チラつき防止） ----
(function () {
    if (localStorage.getItem('uchuTheme') === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
})();

// ---- ボタン操作・アイコン更新 ----
document.addEventListener('click', function (e) {
    const btn = e.target.closest('#themeToggle');
    if (!btn) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('uchuTheme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('uchuTheme', 'dark');
    }
    updateIcon();
});

function updateIcon() {
    const icon = document.getElementById('themeIcon');
    if (!icon) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

// ヘッダー読み込み後にアイコンを合わせる
const headerObserver = new MutationObserver(function () {
    if (document.getElementById('themeToggle')) {
        updateIcon();
        headerObserver.disconnect();
    }
});
headerObserver.observe(document.body, { childList: true, subtree: true });
