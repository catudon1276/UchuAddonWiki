// ==========================================
// Coin Toss Physics - coin.js
// ==========================================

const CoinTosser = (() => {
    let canvas, ctx;
    let coins = [];
    let isTossing = false;
    let onComplete = null;

    const config = {
        count: 3,
        coinRadius: 24,
        coinThickness: 4,
        bowlRadius: 70,
        safeRadius: 55,
        shonbenChance: 0.08, // コインが皿から落ちる確率
        bowlEnabled: true
    };

    // モノクローム（グレー）のテーマ設定
    const THEME = {
        coinBase: '#cccccc',
        coinEdge: '#999999',
        coinFace: '#b0b0b0',
        coinHighlight: '#e0e0e0',
        coinShadow: '#888888',
        headsColor: '#333333',
        tailsColor: '#666666'
    };

    class Coin {
        constructor(id) {
            this.id = id;
            this.reset();
        }

        reset() {
            this.x = canvas.width / 2;
            this.y = canvas.height / 2;
            this.z = 0;
            this.vx = 0;
            this.vy = 0;
            this.vz = 0;
            this.rotationX = 0; // コインの回転（表裏判定用）
            this.rotationY = 0; // 傾き
            this.rotVelX = 0;
            this.rotVelY = 0;
            this.result = null; // 'H' or 'T'
            this.targetResult = null;
            this.fixed = false;
            this.stopped = true;
            this.isShonben = false;
            this.shake = 0;
            this.scale = 1;
            this.alpha = 1;
        }

        toss(dir, forceShonben = false, targetResult = null, shonbenTarget = false) {
            this.stopped = false;
            this.fixed = false;
            this.isShonben = false;
            this.targetResult = targetResult;
            this.result = null;
            this.scale = 1;
            this.alpha = 1;

            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            // 開始位置と速度を設定
            let sx, sy, bvx, bvy;
            switch (dir) {
                case 'top':
                    sx = cx + (Math.random() - 0.5) * 40;
                    sy = -20;
                    bvx = (Math.random() - 0.5) * 2;
                    bvy = 4 + Math.random() * 2;
                    break;
                case 'left':
                    sx = -20;
                    sy = cy + (Math.random() - 0.5) * 40;
                    bvx = 4 + Math.random() * 2;
                    bvy = (Math.random() - 0.5) * 2;
                    break;
                case 'right':
                    sx = canvas.width + 20;
                    sy = cy + (Math.random() - 0.5) * 40;
                    bvx = -(4 + Math.random() * 2);
                    bvy = (Math.random() - 0.5) * 2;
                    break;
                default: // bottom
                    sx = cx + (Math.random() - 0.5) * 40;
                    sy = canvas.height + 20;
                    bvx = (Math.random() - 0.5) * 2;
                    bvy = -(4 + Math.random() * 2);
            }

            this.x = sx;
            this.y = sy;
            this.z = 100;
            this.vx = bvx + (Math.random() - 0.5) * 1.5;
            this.vy = bvy + (Math.random() - 0.5) * 1.5;
            this.vz = -1.5;
            this.rotationX = Math.random() * Math.PI * 2;
            this.rotationY = (Math.random() - 0.5) * 0.3;
            this.rotVelX = 0.3 + Math.random() * 0.5; // 回転速度
            this.rotVelY = (Math.random() - 0.5) * 0.1;

            // ションベン強制
            if (shonbenTarget || forceShonben) {
                const a = Math.random() * Math.PI * 2;
                this.vx += Math.cos(a) * 4;
                this.vy += Math.sin(a) * 4;
            }

            // 結果を事前に決定
            if (targetResult) {
                setTimeout(() => {
                    this.result = targetResult;
                    this.fixed = true;
                }, 200);
            }
        }

        update() {
            if (this.stopped) return;

            // 位置更新
            this.x += this.vx;
            this.y += this.vy;
            this.z += this.vz;

            // 回転更新
            this.rotationX += this.rotVelX;
            this.rotationY += this.rotVelY;

            // 重力
            this.vz -= 0.08;

            // 着地判定
            if (this.z <= 0) {
                this.z = 0;
                this.vz = -this.vz * 0.3;
                this.vx *= 0.7;
                this.vy *= 0.7;
                this.rotVelX *= 0.6;
                this.rotVelY *= 0.5;
                this.shake = 4;

                // 結果確定
                if (!this.fixed) {
                    if (this.targetResult) {
                        this.result = this.targetResult;
                    } else {
                        // 回転角度から表裏を決定
                        let rotX = this.rotationX % (Math.PI * 2);
                        if (rotX < 0) rotX += Math.PI * 2;
                        this.result = (rotX < Math.PI / 2 || rotX > (Math.PI * 3) / 2) ? 'H' : 'T';
                    }
                    this.fixed = true;
                }
            }

            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const dx = this.x - cx;
            const dy = this.y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // 皿外判定
            if (config.bowlEnabled && dist > config.bowlRadius + 15 && !this.isShonben) {
                this.isShonben = true;
                this.alpha = 0.6;
            }

            // 皿なしモードでは常にションベン
            if (!config.bowlEnabled && !this.isShonben && this.z <= 0) {
                this.isShonben = true;
                this.alpha = 0.6;
            }

            // 壁反射（皿モード時のみ）
            if (config.bowlEnabled && !this.isShonben && dist > config.safeRadius) {
                const nx = dx / dist;
                const ny = dy / dist;
                this.vx *= 0.5;
                this.vy *= 0.5;
                const push = (dist - config.safeRadius) * 0.15;
                this.vx -= nx * push;
                this.vy -= ny * push;
                if (dist > config.bowlRadius - config.coinRadius) {
                    const ov = dist - (config.bowlRadius - config.coinRadius);
                    this.x -= nx * ov;
                    this.y -= ny * ov;
                }
            }

            // ションベン落下演出
            if (this.isShonben) {
                this.scale *= 0.96;
                this.alpha *= 0.95;
                if (this.alpha < 0.1) this.stopped = true;
            }

            // 停止判定
            if (!this.isShonben && this.fixed) {
                const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (spd < 0.05 && this.z < 1 && Math.abs(this.rotVelX) < 0.02) {
                    this.vx = 0;
                    this.vy = 0;
                    this.rotVelX = 0;
                    this.rotVelY = 0;
                    // 最終的な向きを確定
                    this.rotationX = this.result === 'H' ? 0 : Math.PI;
                    this.rotationY = 0;
                    this.stopped = true;
                }
            }
        }

        draw() {
            if (this.alpha <= 0) return;
            ctx.globalAlpha = this.alpha;

            // 影描画
            if (!this.isShonben) {
                ctx.save();
                ctx.translate(this.x, this.y);
                const shadowScale = (1 + this.z / 150) * this.scale;
                ctx.scale(shadowScale, shadowScale * 0.3);
                ctx.fillStyle = 'rgba(0,0,0,0.15)';
                ctx.beginPath();
                ctx.ellipse(2, 2, config.coinRadius, config.coinRadius, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // コイン本体
            ctx.save();
            ctx.translate(this.x, this.y - this.z * 0.5);

            // シェイク効果
            if (this.shake > 0) {
                ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
                this.shake *= 0.7;
            }

            // スケール（落下時の縮小）
            const coinScale = (1 + this.z / 200) * this.scale;
            ctx.scale(coinScale, coinScale);

            // 回転による表裏の見え方を計算
            const rotX = this.rotationX % (Math.PI * 2);
            const cosRot = Math.cos(rotX);
            const isShowingHeads = cosRot > 0;

            // コインの見かけの厚さ（回転による変形）
            const thickness = Math.abs(Math.sin(rotX)) * config.coinThickness;

            // エッジ（厚み）描画
            if (thickness > 0.5) {
                ctx.fillStyle = THEME.coinEdge;
                ctx.beginPath();
                ctx.ellipse(0, thickness / 2, config.coinRadius, config.coinRadius * Math.abs(cosRot), 0, 0, Math.PI * 2);
                ctx.fill();
            }

            // 表面描画
            const faceScaleY = Math.abs(cosRot);
            if (faceScaleY > 0.1) {
                ctx.save();
                ctx.scale(1, faceScaleY);

                // 基本の円
                const gradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, config.coinRadius);
                gradient.addColorStop(0, THEME.coinHighlight);
                gradient.addColorStop(0.7, THEME.coinBase);
                gradient.addColorStop(1, THEME.coinShadow);

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(0, 0, config.coinRadius, 0, Math.PI * 2);
                ctx.fill();

                // 外縁
                ctx.strokeStyle = THEME.coinEdge;
                ctx.lineWidth = 2;
                ctx.stroke();

                // 内側の縁
                ctx.strokeStyle = THEME.coinHighlight;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(0, 0, config.coinRadius - 4, 0, Math.PI * 2);
                ctx.stroke();

                // 表裏の文字
                ctx.fillStyle = isShowingHeads ? THEME.headsColor : THEME.tailsColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = `bold ${config.coinRadius * 0.8}px Arial`;
                ctx.fillText(isShowingHeads ? 'H' : 'T', 0, 0);

                ctx.restore();
            }

            ctx.restore();
            ctx.globalAlpha = 1;
        }
    }

    function init(canvasId) {
        canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn('CoinTosser: Canvas not found:', canvasId);
            return;
        }
        ctx = canvas.getContext('2d');

        const parent = canvas.parentElement;
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;

        config.bowlRadius = Math.min(canvas.width, canvas.height) / 2 - 10;
        config.safeRadius = config.bowlRadius - 15;

        resetCoins();
        animate();
    }

    function resetCoins() {
        coins = [];
        for (let i = 0; i < config.count; i++) {
            coins.push(new Coin(i));
        }
    }

    /**
     * コインを投げる
     * @param {string} dir - 投げる方向 ('bottom', 'top', 'left', 'right')
     * @param {Array<string>|null} targetResults - 指定結果 ['H', 'T', 'H'] など
     * @param {boolean} forceShonben - 強制ションベン
     */
    function toss(dir = 'bottom', targetResults = null, forceShonben = false) {
        if (isTossing) return;
        isTossing = true;

        const doShonben = forceShonben || (!config.bowlEnabled) || Math.random() < config.shonbenChance;
        const shonbenIds = doShonben ? [Math.floor(Math.random() * config.count)] : [];

        coins.forEach((c, i) => {
            const target = targetResults ? targetResults[i] : null;
            c.toss(dir, forceShonben, target, shonbenIds.includes(i));
        });

        checkComplete();
    }

    /**
     * ランダムにコインを投げる
     */
    function tossRandom(dir = 'bottom') {
        toss(dir, null, false);
    }

    /**
     * 指定した結果でコインを投げる
     */
    function tossWithResults(dir, results) {
        toss(dir, results, false);
    }

    /**
     * 強制ションベン
     */
    function tossShonben(dir = 'bottom') {
        toss(dir, null, true);
    }

    function checkComplete() {
        const interval = setInterval(() => {
            if (coins.every(c => c.stopped)) {
                clearInterval(interval);
                isTossing = false;

                const results = coins.map(c => c.result);
                const shonben = coins.some(c => c.isShonben);
                const headsCount = coins.filter(c => c.result === 'H' && !c.isShonben).length;
                const tailsCount = coins.filter(c => c.result === 'T' && !c.isShonben).length;

                if (onComplete) {
                    onComplete({
                        results,
                        shonben,
                        headsCount,
                        tailsCount,
                        validCoins: config.count - coins.filter(c => c.isShonben).length
                    });
                }
            }
        }, 80);
    }

    function animate() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Z順でソート（奥から描画）
        const sorted = [...coins].sort((a, b) => a.z - b.z);
        coins.forEach(c => c.update());
        sorted.forEach(c => c.draw());

        requestAnimationFrame(animate);
    }

    // ===========================================
    // Public API
    // ===========================================

    function setCoinCount(n) {
        if (isTossing) return;
        config.count = n;
        resetCoins();
    }

    function setBowl(enabled) {
        config.bowlEnabled = enabled;
    }

    function setOnComplete(fn) {
        onComplete = fn;
    }

    function getIsTossing() {
        return isTossing;
    }

    function getConfig() {
        return { ...config };
    }

    return {
        init,
        toss,
        tossRandom,
        tossWithResults,
        tossShonben,
        setCoinCount,
        setBowl,
        setOnComplete,
        isTossing: getIsTossing,
        resetCoins,
        getConfig
    };
})();

// グローバルに公開
window.CoinTosser = CoinTosser;
