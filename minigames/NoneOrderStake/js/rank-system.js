/**
 * RankSystem - 役表表示システム
 * ==========================================
 * RankSystem 関数説明
 * ==========================================
 * 1. clear():
 * 表示中の役リストをすべて削除します。新しく表を作り直す際に使用。
 *
 * 2. addSection(label):
 * 「通常」や「役物」といった区切り線（見出し）を追加します。
 * - label: 表示する文字列
 *
 * 3. addRank(name, mult, dice, targetIndex, isSpecial):
 * 役の行を追加します。
 * - name: 役の名前（例: "シゴロ"）
 * - mult: 倍率（数値。プラスなら黄色、マイナスなら赤色で表示）
 * - dice: ダイスの目の配列（[1, 2, 3]など）
 * - targetIndex: 強調表示（黄色）したいダイスのインデックス(0~2)。なければ-1。
 * - isSpecial: trueにするとダイスが「? ? ?」になります。
 *
 * 4. setDiceName(name):
 * ヘッダー下の「通常賽」などの名前を変更します。
 *
 * 5. setInfoText(html):
 * 最下部の注釈エリアの内容を変更します。HTMLタグ使用可。
 *
 * 6. render():
 * 上記の設定を反映して画面上のHTMLを再構築します。
 * ==========================================
 */

export const RankSystem = {
    currentDiceName: "通常賽",
    infoMessage: `<span style="color: #fbbf24; font-weight: bold;">●</span> 黄色がその役の「目」です。`,
    ranks: [],

    clear() {
        this.ranks = [];
    },

    addSection(label) {
        this.ranks.push({ type: 'label', text: label });
    },

    addRank(name, mult, dice, targetIndex = -1, isSpecial = false) {
        this.ranks.push({
            type: 'rank',
            name: name,
            mult: mult,
            dice: dice,
            t: targetIndex,
            isSpecial: isSpecial
        });
    },

    setDiceName(name) {
        this.currentDiceName = name;
        const el = document.getElementById('rank-mode');
        if(el) el.innerText = name;
    },

    setInfoText(html) {
        this.infoMessage = html;
        const el = document.getElementById('info-text');
        if(el) el.innerHTML = html;
    },

    render() {
        const list = document.getElementById('rank-list');
        if (!list) return;

        list.innerHTML = this.ranks.map(r => {
            if (r.type === 'label') {
                return `<div class="rank-section"><span>${r.text}</span></div>`;
            }

            let dHtml;
            if (r.isSpecial) {
                dHtml = `<div class="rank-die dim">?</div><div class="rank-die dim">?</div><div class="rank-die dim">?</div>`;
            } else {
                dHtml = r.dice.map((d, i) => {
                    const isRed = (d === 1 && r.t !== i);
                    const isTarget = (r.t === i);
                    return `<div class="rank-die ${isTarget ? 'target' : ''} ${isRed ? 'red' : ''}">${d}</div>`;
                }).join('');
            }

            const multDisplay = r.mult > 0 ? `x${r.mult}` : `x${r.mult}`;
            const multClass = r.mult < 0 ? 'negative' : '';

            return `<div class="rank-item">
                <div class="rank-dice">${dHtml}</div>
                <div class="rank-info">
                    <div class="rank-name">${r.name}</div>
                    <div class="rank-mult ${multClass}">${multDisplay}</div>
                </div>
            </div>`;
        }).join('');

        this.setDiceName(this.currentDiceName);
        this.setInfoText(this.infoMessage);
    }
};
