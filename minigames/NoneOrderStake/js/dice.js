// ==========================================
// Dice Physics - dice.js
// ==========================================

const DiceRoller = (() => {
    let canvas, ctx;
    let dices = [];
    let isRolling = false;
    let onComplete = null;

    const config = {
        count: 3,
        faces: 6,
        size: 28,
        bowlRadius: 70,
        safeRadius: 55,
        shonbenChance: 0.12
    };

    class Dice {
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
            this.angle = 0;
            this.va = 0;
            this.value = Math.floor(Math.random() * config.faces) + 1;
            this.targetValue = null;
            this.fixed = false;
            this.stopped = true;
            this.isShonben = false;
            this.shake = 0;
            this.scale = 1;
            this.alpha = 1;
        }

        roll(dir, forceShonben = false, targetVal = null, shonbenTarget = false) {
            this.stopped = false;
            this.fixed = false;
            this.isShonben = false;
            this.targetValue = targetVal;
            this.scale = 1;
            this.alpha = 1;

            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            // 開始位置
            let sx, sy, bvx, bvy;
            switch (dir) {
                case 'top':
                    sx = cx + (Math.random() - 0.5) * 40;
                    sy = -20;
                    bvx = (Math.random() - 0.5) * 2;
                    bvy = 5 + Math.random() * 2;
                    break;
                case 'left':
                    sx = -20;
                    sy = cy + (Math.random() - 0.5) * 40;
                    bvx = 5 + Math.random() * 2;
                    bvy = (Math.random() - 0.5) * 2;
                    break;
                case 'right':
                    sx = canvas.width + 20;
                    sy = cy + (Math.random() - 0.5) * 40;
                    bvx = -(5 + Math.random() * 2);
                    bvy = (Math.random() - 0.5) * 2;
                    break;
                default: // bottom
                    sx = cx + (Math.random() - 0.5) * 40;
                    sy = canvas.height + 20;
                    bvx = (Math.random() - 0.5) * 2;
                    bvy = -(5 + Math.random() * 2);
            }

            this.x = sx;
            this.y = sy;
            this.z = 80;
            this.vx = bvx + (Math.random() - 0.5) * 1.5;
            this.vy = bvy + (Math.random() - 0.5) * 1.5;
            this.vz = -1.2;
            this.angle = Math.random() * Math.PI * 2;
            this.va = (Math.random() - 0.5) * 0.25;

            if (shonbenTarget || forceShonben) {
                const a = Math.random() * Math.PI * 2;
                this.vx += Math.cos(a) * 3;
                this.vy += Math.sin(a) * 3;
            }

            if (targetVal) {
                setTimeout(() => {
                    this.value = targetVal;
                    this.fixed = true;
                }, 150);
            }
        }

        update() {
            if (this.stopped) return;

            this.x += this.vx;
            this.y += this.vy;
            this.z += this.vz;
            this.angle += this.va;

            // シャッフル表示
            if (!this.fixed && !this.targetValue) {
                this.value = Math.floor(Math.random() * config.faces) + 1;
            }

            // 着地
            if (this.z <= 0) {
                this.z = 0;
                this.vz = -this.vz * 0.25;
                this.vx *= 0.75;
                this.vy *= 0.75;
                this.va *= 0.5;
                this.shake = 3;

                if (!this.fixed && this.targetValue) {
                    this.value = this.targetValue;
                    this.fixed = true;
                } else if (!this.fixed) {
                    this.fixed = true;
                }
            }

            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const dx = this.x - cx;
            const dy = this.y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // 皿外判定
            if (dist > config.bowlRadius + 20 && !this.isShonben) {
                this.isShonben = true;
                this.alpha = 0.6;
            }

            // 壁反射
            if (!this.isShonben && dist > config.safeRadius) {
                const nx = dx / dist;
                const ny = dy / dist;
                this.vx *= 0.5;
                this.vy *= 0.5;
                const push = (dist - config.safeRadius) * 0.1;
                this.vx -= nx * push;
                this.vy -= ny * push;
                if (dist > config.bowlRadius - config.size / 2) {
                    const ov = dist - (config.bowlRadius - config.size / 2);
                    this.x -= nx * ov;
                    this.y -= ny * ov;
                }
            }

            // ションベン落下
            if (this.isShonben) {
                this.scale *= 0.97;
                this.alpha *= 0.96;
                if (this.alpha < 0.1) this.stopped = true;
            }

            // 停止判定
            if (!this.isShonben && this.fixed) {
                const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (spd < 0.08 && this.z < 1) {
                    this.vx = 0;
                    this.vy = 0;
                    this.stopped = true;
                }
            }
        }

        draw() {
            if (this.alpha <= 0) return;
            ctx.globalAlpha = this.alpha;

            // 影
            if (!this.isShonben) {
                ctx.save();
                ctx.translate(this.x, this.y);
                const ss = (1 + this.z / 120) * this.scale;
                ctx.scale(ss, ss);
                ctx.fillStyle = 'rgba(0,0,0,0.12)';
                ctx.beginPath();
                ctx.roundRect(-config.size / 2 + 2, -config.size / 2 + 2, config.size, config.size, 5);
                ctx.fill();
                ctx.restore();
            }

            // ダイス本体
            ctx.save();
            ctx.translate(this.x, this.y - this.z);
            if (this.shake > 0) {
                ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
                this.shake *= 0.75;
            }
            ctx.rotate(this.angle);
            const ds = (1 + this.z / 150) * this.scale;
            ctx.scale(ds, ds);

            // 背面
            ctx.fillStyle = '#b0b8c4';
            ctx.beginPath();
            ctx.roundRect(-config.size / 2, -config.size / 2 + 2, config.size, config.size, 5);
            ctx.fill();

            // 前面
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.roundRect(-config.size / 2, -config.size / 2, config.size, config.size, 5);
            ctx.fill();

            // 数字
            ctx.fillStyle = this.value === 1 ? '#ef4444' : '#1a1f2e';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `bold ${config.size * 0.55}px Arial`;
            ctx.fillText(this.value, 0, 0);

            ctx.restore();
            ctx.globalAlpha = 1;
        }
    }

    function init(canvasId) {
        canvas = document.getElementById(canvasId);
        if (!canvas) return;
        ctx = canvas.getContext('2d');

        const parent = canvas.parentElement;
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;

        config.bowlRadius = Math.min(canvas.width, canvas.height) / 2 - 10;
        config.safeRadius = config.bowlRadius - 15;

        resetDices();
        animate();
    }

    function resetDices() {
        dices = [];
        for (let i = 0; i < config.count; i++) {
            dices.push(new Dice(i));
        }
    }

    function roll(dir = 'bottom', targetValues = null, forceShonben = false) {
        if (isRolling) return;
        isRolling = true;

        const doShonben = forceShonben || Math.random() < config.shonbenChance;
        const shonbenIds = doShonben ? [Math.floor(Math.random() * config.count)] : [];

        dices.forEach((d, i) => {
            const target = targetValues ? targetValues[i] : null;
            d.roll(dir, forceShonben, target, shonbenIds.includes(i));
        });

        checkComplete();
    }

    function checkComplete() {
        const interval = setInterval(() => {
            if (dices.every(d => d.stopped)) {
                clearInterval(interval);
                isRolling = false;
                const results = dices.map(d => d.value);
                const shonben = dices.some(d => d.isShonben);
                if (onComplete) onComplete(results, shonben);
            }
        }, 80);
    }

    function animate() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const sorted = [...dices].sort((a, b) => a.z - b.z);
        dices.forEach(d => d.update());
        sorted.forEach(d => d.draw());
        requestAnimationFrame(animate);
    }

    function setFaces(n) { config.faces = n; }
    function setOnComplete(fn) { onComplete = fn; }
    function getIsRolling() { return isRolling; }

    return {
        init,
        roll,
        setFaces,
        setOnComplete,
        isRolling: getIsRolling,
        resetDices
    };
})();

window.DiceRoller = DiceRoller;