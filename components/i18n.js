/* ============================================================
   UchuAddonWiki - i18n (多言語切替)
   ------------------------------------------------------------
   - localStorage キー: uchuLang ('ja' | 'en')
   - デフォルト: ja
   - data-i18n="key"        … テキストノード
   - data-i18n-html="key"   … innerHTML (改行<br>など保持)
   - data-i18n-placeholder="key" … input/textarea placeholder
   - data-i18n-title="key"       … title 属性
   - data-i18n-aria="key"        … aria-label 属性
   - data-i18n-lock="true"       … 翻訳除外(Credit等を固定表示)
   - MutationObserver でヘッダー/フッター等の後挿入DOMにも自動適用
   ============================================================ */
(function () {
    'use strict';

    // ---- 初期言語決定 (<html lang> 反映をチラつき防止のため即時実行) ----
    var saved = null;
    try { saved = localStorage.getItem('uchuLang'); } catch (e) { }
    var initialLang = (saved === 'ja' || saved === 'en') ? saved : 'ja';
    document.documentElement.setAttribute('lang', initialLang);

    // ---- 内部状態 ----
    var currentLang = initialLang;
    var dictionaries = { ja: null, en: null };
    var loadPromise = null;
    var mo = null; // MutationObserver（applyAll内でdisconnect/reconnectする）

    // ---- パス解決 ----
    function resolveI18nBase() {
        // 1) <script src=".../components/i18n.js"> から推定(最優先)
        var scripts = document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
            var src = scripts[i].src || '';
            var m = src.match(/^(.*\/components\/)i18n\.js(?:\?.*)?$/);
            if (m) return m[1] + 'i18n/';
        }
        // 2) /UchuAddonWiki/ を含むURLならそこから組み立てる
        var path = window.location.pathname;
        var idx = path.indexOf('/UchuAddonWiki/');
        if (idx !== -1) {
            return path.substring(0, idx) + '/UchuAddonWiki/components/i18n/';
        }
        // 3) フォールバック
        return '/UchuAddonWiki/components/i18n/';
    }

    function loadDictionaries() {
        if (loadPromise) return loadPromise;
        var base = resolveI18nBase();
        loadPromise = Promise.all([
            fetch(base + 'ja.json').then(function (r) { return r.json(); }),
            fetch(base + 'en.json').then(function (r) { return r.json(); })
        ]).then(function (res) {
            dictionaries.ja = res[0];
            dictionaries.en = res[1];
        }).catch(function (err) {
            console.error('[i18n] 辞書読み込み失敗:', err);
        });
        return loadPromise;
    }

    // ---- 辞書からキー解決 (ドット区切り対応) ----
    function lookup(lang, key) {
        var dict = dictionaries[lang];
        if (!dict || !key) return null;
        if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
        var parts = key.split('.');
        var cur = dict;
        for (var i = 0; i < parts.length; i++) {
            if (cur && typeof cur === 'object' && parts[i] in cur) {
                cur = cur[parts[i]];
            } else {
                return null;
            }
        }
        return (typeof cur === 'string') ? cur : null;
    }

    function translate(key) {
        if (!key) return null;
        var v = lookup(currentLang, key);
        if (v != null) return v;
        // フォールバック: 日本語
        var fb = lookup('ja', key);
        return fb != null ? fb : null;
    }

    // ---- 要素への適用 ----
    function applyToElement(el) {
        if (!el) return;
        // data-i18n-lock="true" を祖先に持つ要素は翻訳しない (Credit等の固定表示)
        if (el.closest && el.closest('[data-i18n-lock="true"]')) return;

        var k1 = el.getAttribute('data-i18n');
        if (k1) {
            var v1 = translate(k1);
            if (v1 != null) el.textContent = v1;
        }

        var k2 = el.getAttribute('data-i18n-html');
        if (k2) {
            var v2 = translate(k2);
            if (v2 != null) el.innerHTML = v2;
        }

        var k3 = el.getAttribute('data-i18n-placeholder');
        if (k3) {
            var v3 = translate(k3);
            if (v3 != null) el.setAttribute('placeholder', v3);
        }

        var k4 = el.getAttribute('data-i18n-title');
        if (k4) {
            var v4 = translate(k4);
            if (v4 != null) el.setAttribute('title', v4);
        }

        var k5 = el.getAttribute('data-i18n-aria');
        if (k5) {
            var v5 = translate(k5);
            if (v5 != null) el.setAttribute('aria-label', v5);
        }
    }

    function applyAll(root) {
        // DOM変更中はObserverを止めて無限ループを防ぐ
        if (mo) mo.disconnect();
        try {
            var scope = root || document;
            var selectors = '[data-i18n],[data-i18n-html],[data-i18n-placeholder],[data-i18n-title],[data-i18n-aria]';
            var list = scope.querySelectorAll ? scope.querySelectorAll(selectors) : [];
            for (var i = 0; i < list.length; i++) applyToElement(list[i]);

            // <title>
            var t = document.querySelector('title[data-i18n]');
            if (t) {
                var tv = translate(t.getAttribute('data-i18n'));
                if (tv != null) document.title = tv;
            }

            updateSwitcherActive();
            updateBodyLangAttr();
        } finally {
            // 翻訳完了後にObserver再開
            if (mo) mo.observe(document.body, { childList: true, subtree: true });
        }
    }

    function updateBodyLangAttr() {
        document.documentElement.setAttribute('lang', currentLang);
    }

    // ---- 言語切替ボタンUI ----
    function updateSwitcherActive() {
        var btns = document.querySelectorAll('.lang-switch-btn');
        for (var i = 0; i < btns.length; i++) {
            var b = btns[i];
            var l = b.getAttribute('data-lang');
            if (l === currentLang) b.classList.add('active');
            else b.classList.remove('active');
        }
    }

    function setLanguage(lang) {
        if (lang !== 'ja' && lang !== 'en') return;
        currentLang = lang;
        try { localStorage.setItem('uchuLang', lang); } catch (e) { }
        loadDictionaries().then(function () { applyAll(); });
    }

    // ---- イベントバインド ----
    document.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('.lang-switch-btn');
        if (!btn) return;
        var l = btn.getAttribute('data-lang');
        if (l) setLanguage(l);
    });

    // ---- 後挿入DOMの監視 (header/footer fetch後など) ----
    mo = new MutationObserver(function (mutations) {
        var needApply = false;
        for (var i = 0; i < mutations.length; i++) {
            var m = mutations[i];
            for (var j = 0; j < m.addedNodes.length; j++) {
                if (m.addedNodes[j].nodeType === 1) { needApply = true; break; }
            }
            if (needApply) break;
        }
        if (needApply && dictionaries[currentLang]) applyAll();
    });

    // ---- 初期化 ----
    function init() {
        loadDictionaries().then(function () { applyAll(); });
        mo.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ---- 外部公開API ----
    window.UchuI18n = {
        get lang() { return currentLang; },
        set: setLanguage,
        t: translate,
        apply: applyAll,
        reload: function () { loadPromise = null; dictionaries.ja = null; dictionaries.en = null; return loadDictionaries().then(function () { applyAll(); }); }
    };
})();
