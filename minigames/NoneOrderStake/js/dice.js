// ==========================================
// 🎮 Dice Roller - dice.js (完全版)
// dice.htmlの実装をGame統合版に適応
// ==========================================

const DiceRoller = (() => {
    // ========================================
    // ゲーム状態
    // ========================================
    let gameState = {
        diceCount: 3,
        diceFaces: 6,
        diceLabels: null,
        diceSpriteSheet: null,
        bowlEnabled: true,
        bowlRadius: 220,
        bowlSafeRadius: 180,
        shonbenChance: 0.15,
        shonbenMinDice: 1,
        shonbenMaxDice: 3,
        diceSize: 48,
        normalVariance: 20,
        fixedVariance: 5
    };

    let DICE_SIZE = gameState.diceSize;
    let RADIUS = gameState.bowlRadius;
    let SAFE_RADIUS = gameState.bowlSafeRadius;
    let NORMAL_VARIANCE = gameState.normalVariance;
    let FIXED_VARIANCE = gameState.fixedVariance;
    let SHONBEN_CHANCE = gameState.shonbenChance;

    let canvas, ctx;
    let dices = [];
    let isRolling = false;
    let shonbenDiceIds = [];
    let spriteImage = null;
    let spriteImageLoaded = false;

    // ========================================
    // Diceクラス定義
    // ========================================
    class Dice {
        constructor(id) {
            this.id = id;
            this.reset();
        }

        reset() {
            this.x = canvas.width / 2;
            this.y = canvas.height + 200;
            this.z = 0;
            this.vx = 0;
            this.vy = 0;
            this.vz = 0;
            this.gravity = 0.8;
            this.displayValue = 1;
            this.targetValue = null;
            this.angle = 0;
            this.vAngle = 0;
            this.isStopped = true;
            this.isValueFixed = false;
            this.isShonben = false;
            this.fallScale = 1.0;
            this.opacity = 1.0;
            this.shakeAmount = 0;
            this.shuffleTimer = 0;
        }

        roll(direction = 'bottom', forceShonben = false, forceValue = null, isShonbenTarget = false) {
            this.isStopped = false;
            this.isValueFixed = false;
            this.isShonben = false;
            this.fallScale = 1.0;
            this.opacity = 1.0;

            // 皿なし時は強制的にションベン対象にする（最優先）
            if (!gameState.bowlEnabled) {
                isShonbenTarget = true;
                forceValue = null;
            }

            this.targetValue = forceValue;

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            let targetX, targetY;

            if (forceShonben || isShonbenTarget) {
                const angle = Math.random() * Math.PI * 2;
                const r = RADIUS + 50 + Math.random() * 100;
                targetX = centerX + Math.cos(angle) * r;
                targetY = centerY + Math.sin(angle) * r;
            } else {
                const variance = (forceValue !== null) ? FIXED_VARIANCE : NORMAL_VARIANCE;
                const angle = Math.random() * Math.PI * 2;
                const r = Math.pow(Math.random(), 2.0) * variance;
                targetX = centerX + Math.cos(angle) * r;
                targetY = centerY + Math.sin(angle) * r;
            }

            let startX, startY, baseVx, baseVy;
            const throwDistance = 420;

            switch (direction) {
                case 'top':
                    startX = centerX + (Math.random() - 0.5) * 60;
                    startY = centerY - throwDistance;
                    baseVx = (targetX - startX) / 35;
                    baseVy = (targetY - startY) / 35 + 2;
                    break;
                case 'left':
                    startX = centerX - throwDistance;
                    startY = centerY + (Math.random() - 0.5) * 60;
                    baseVx = (targetX - startX) / 35 + 2;
                    baseVy = (targetY - startY) / 35;
                    break;
                case 'right':
                    startX = centerX + throwDistance;
                    startY = centerY + (Math.random() - 0.5) * 60;
                    baseVx = (targetX - startX) / 35 - 2;
                    baseVy = (targetY - startY) / 35;
                    break;
                case 'bottom':
                default:
                    startX = centerX + (Math.random() - 0.5) * 60;
                    startY = centerY + throwDistance;
                    baseVx = (targetX - startX) / 35;
                    baseVy = (targetY - startY) / 35 - 2;
                    break;
            }

            this.x = startX;
            this.y = startY;

            if (forceShonben || isShonbenTarget) {
                this.z = 80;
                this.vx = baseVx + (Math.random() - 0.5) * 3;
                this.vy = baseVy + (Math.random() - 0.5) * 3;
                this.vz = 4 + Math.random() * 2;
                this.vAngle = (Math.random() - 0.5) * 4;
                this.gravity = 0.6;
            } else {
                this.z = 200;
                this.vx = baseVx + (Math.random() - 0.5) * 0.5;
                this.vy = baseVy + (Math.random() - 0.5) * 0.5;
                this.vz = 3.5 + Math.random() * 1.5;
                this.vAngle = (Math.random() - 0.5) * 2;
                this.gravity = 0.75;
            }

            this.shuffleTimer = 0;
        }

        update() {
            if (this.isStopped) return;

            this.x += this.vx;
            this.y += this.vy;
            this.z += this.vz;
            this.vz -= this.gravity;

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const dx = this.x - centerX;
            const dy = this.y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (this.z <= 0) {
                this.z = 0;

                const isShonbenDice = shonbenDiceIds.includes(this.id);
                if (dist > RADIUS || isShonbenDice) {
                    if (!this.isShonben) {
                        this.isShonben = true;
                        this.vz = 0;
                        this.vx *= 1.2;
                        this.vy = 8;
                        this.gravity = 0.3;
                    }
                } else {
                    if (!this.isValueFixed) {
                        this.isValueFixed = true;
                        this.displayValue = this.targetValue || (Math.floor(Math.random() * gameState.diceFaces) + 1);
                        this.shakeAmount = 15;
                    }
                    this.vz *= -0.25;
                    this.vx *= 0.6;
                    this.vy *= 0.6;
                    this.vAngle *= 0.5;
                }
            }

            if (this.isShonben) {
                this.vy += 0.3;
                this.fallScale *= 0.985;
                this.opacity *= 0.97;
                if (this.y > canvas.height + 100 || this.opacity < 0.05) {
                    this.isStopped = true;
                }
            }

            if (!this.isValueFixed) {
                this.angle += this.vAngle;
                this.shuffleTimer++;
                if (this.shuffleTimer % 4 === 0) {
                    this.displayValue = Math.floor(Math.random() * gameState.diceFaces) + 1;
                }
            } else {
                this.angle *= 0.9;
            }

            if (!this.isShonben && this.z < 80) {
                const wallDist = dist;
                const safeRadius = RADIUS - DICE_SIZE;

                if (wallDist > safeRadius) {
                    const nx = dx / dist;
                    const ny = dy / dist;

                    const dot = this.vx * nx + this.vy * ny;
                    if (dot > 0) {
                        this.vx -= 2.5 * dot * nx;
                        this.vy -= 2.5 * dot * ny;

                        this.vx *= 0.65;
                        this.vy *= 0.65;

                        const pushForce = (wallDist - safeRadius) * 0.15;
                        this.vx -= nx * pushForce;
                        this.vy -= ny * pushForce;

                        if (wallDist > RADIUS - DICE_SIZE / 2) {
                            const overlap = wallDist - (RADIUS - DICE_SIZE / 2);
                            this.x -= nx * overlap;
                            this.y -= ny * overlap;
                        }
                    }
                }
            }

            dices.forEach(other => {
                if (other === this || other.isStopped || other.isShonben) return;
                const dx_d = this.x - other.x;
                const dy_d = this.y - other.y;
                const d2 = dx_d * dx_d + dy_d * dy_d;
                const minDist = DICE_SIZE * 0.9;
                if (d2 < minDist * minDist && Math.abs(this.z - other.z) < 25) {
                    const d = Math.sqrt(d2) || 1;
                    const nx = dx_d / d;
                    const ny = dy_d / d;
                    const pushForce = 0.5;
                    this.vx += nx * pushForce;
                    this.vy += ny * pushForce;
                    other.vx -= nx * pushForce;
                    other.vy -= ny * pushForce;

                    const overlap = minDist - d;
                    this.x += nx * overlap * 0.5;
                    this.y += ny * overlap * 0.5;
                    other.x -= nx * overlap * 0.5;
                    other.y -= ny * overlap * 0.5;
                }
            });

            if (!this.isShonben && this.isValueFixed) {
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (speed < 0.15 && this.z < 1) {
                    this.vx = 0;
                    this.vy = 0;
                    this.vz = 0;
                    this.z = 0;
                    this.isStopped = true;
                }
            }
        }

        draw() {
            if (this.opacity <= 0) return;
            ctx.globalAlpha = this.opacity;

            if (!this.isShonben) {
                ctx.save();
                ctx.translate(this.x, this.y);
                const sScale = (1 + this.z / 200) * this.fallScale;
                ctx.scale(sScale, sScale);
                ctx.fillStyle = "rgba(0,0,0,0.15)";
                ctx.beginPath();
                ctx.roundRect(-DICE_SIZE / 2 + 4, -DICE_SIZE / 2 + 4, DICE_SIZE, DICE_SIZE, 12);
                ctx.fill();
                ctx.restore();
            }

            ctx.save();
            ctx.translate(this.x, this.y - this.z);
            if (this.shakeAmount > 0) {
                ctx.translate((Math.random() - 0.5) * this.shakeAmount, (Math.random() - 0.5) * this.shakeAmount);
                this.shakeAmount *= 0.85;
            }
            ctx.rotate(this.angle);
            const drawScale = (1 + this.z / 300) * this.fallScale;
            ctx.scale(drawScale, drawScale);
            this.drawDiceFace(this.displayValue);
            ctx.restore();

            ctx.globalAlpha = 1.0;
        }

        drawDiceFace(val) {
            const s = DICE_SIZE;
            const r = 10;

            ctx.fillStyle = "#cbd5e1";
            ctx.beginPath();
            ctx.roundRect(-s / 2, -s / 2 + 5, s, s, r);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.roundRect(-s / 2, -s / 2, s, s, r);
            ctx.fill();

            this.drawNumber(val);
        }

        drawNumber(val) {
            const s = DICE_SIZE;

            // スプライトシートが設定されている場合
            if (gameState.diceSpriteSheet && spriteImageLoaded && spriteImage) {
                const config = gameState.diceSpriteSheet;
                const frameIndex = val - 1;

                if (frameIndex >= 0 && frameIndex < config.frames) {
                    let sx, sy;
                    if (config.direction === 'horizontal') {
                        sx = frameIndex * config.frameWidth;
                        sy = 0;
                    } else {
                        sx = 0;
                        sy = frameIndex * config.frameHeight;
                    }

                    ctx.drawImage(
                        spriteImage,
                        sx, sy, config.frameWidth, config.frameHeight,
                        -s / 2, -s / 2, s, s
                    );
                    return;
                }
            }

            // カスタム文字またはデフォルトの数字描画
            ctx.fillStyle = val === 1 ? "#e11d48" : "#1e293b";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            let displayText = val;
            if (gameState.diceLabels && val >= 1 && val <= gameState.diceLabels.length) {
                displayText = gameState.diceLabels[val - 1];
            }

            ctx.font = `bold ${s * 0.7}px 'Arial'`;
            ctx.fillText(displayText, 0, 0);
        }
    }

    // ========================================
    // 公開API関数
    // ========================================

    function init(canvasId) {
        canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error('Canvas element not found:', canvasId);
            return;
        }

        console.log(`📍 Canvas element:`, {
            tagName: canvas.tagName,
            id: canvas.id,
            className: canvas.className,
            offsetWidth: canvas.offsetWidth,
            offsetHeight: canvas.offsetHeight
        });

        const parent = canvas.parentElement;
        console.log(`📍 Parent element:`, {
            tagName: parent.tagName,
            className: parent.className,
            offsetWidth: parent.offsetWidth,
            offsetHeight: parent.offsetHeight,
            display: window.getComputedStyle(parent).display,
            visibility: window.getComputedStyle(parent).visibility
        });

        ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('❌ Failed to get 2D context');
            return;
        }

        let width = parent.offsetWidth;
        let height = parent.offsetHeight;

        // フォールバック：offsetWidthが0の場合
        if (width === 0 || height === 0) {
            const rect = parent.getBoundingClientRect();
            width = rect.width || 200;
            height = rect.height || 200;
            console.log(`⚠️ Using getBoundingClientRect: ${width}x${height}`);
        }

        canvas.width = width;
        canvas.height = height;

        console.log(`✅ Canvas set to: ${canvas.width}x${canvas.height}`);

        RADIUS = Math.min(canvas.width, canvas.height) / 2.2;
        SAFE_RADIUS = RADIUS - 30;
        gameState.bowlRadius = RADIUS;
        gameState.bowlSafeRadius = SAFE_RADIUS;

        resetDices();
        animate();

        console.log(`🎲 DiceRoller initialized: ${canvas.width}x${canvas.height}, RADIUS: ${RADIUS}`);
    }

    function setBowl(enabled) {
        gameState.bowlEnabled = enabled;
    }

    function setDiceFaces(faces) {
        gameState.diceFaces = faces;
    }

    function setDiceLabels(labels) {
        gameState.diceLabels = labels;
    }

    function setDiceSpriteSheet(urlOrConfig, frameWidth, frameHeight, frames, direction = 'vertical') {
        if (urlOrConfig === null) {
            gameState.diceSpriteSheet = null;
            spriteImage = null;
            spriteImageLoaded = false;
            return;
        }

        let config;
        if (typeof urlOrConfig === 'string') {
            config = {
                url: urlOrConfig,
                frameWidth: frameWidth,
                frameHeight: frameHeight,
                frames: frames,
                direction: direction
            };
        } else {
            config = {
                url: urlOrConfig.url,
                frameWidth: urlOrConfig.frameWidth,
                frameHeight: urlOrConfig.frameHeight,
                frames: urlOrConfig.frames,
                direction: urlOrConfig.direction || 'vertical'
            };
        }

        gameState.diceSpriteSheet = config;

        spriteImage = new Image();
        spriteImageLoaded = false;
        spriteImage.onload = () => {
            spriteImageLoaded = true;
        };
        spriteImage.onerror = () => {
            console.error('Failed to load sprite sheet:', config.url);
            gameState.diceSpriteSheet = null;
            spriteImage = null;
        };
        spriteImage.src = config.url;
    }

    function setDiceCount(count) {
        if (isRolling) return;
        gameState.diceCount = count;
        resetDices();
    }

    function rollWithValues(direction, values) {
        if (isRolling) {
            console.warn('Already rolling, ignoring rollWithValues');
            return;
        }
        console.log(`🎲 rollWithValues: direction=${direction}, values=${values}`);
        isRolling = true;
        shonbenDiceIds = [];

        dices.forEach((d, i) => {
            const targetValue = values[i] || null;
            d.roll(direction, false, targetValue, false);
        });

        startResultCheck();
    }

    function rollDice(direction) {
        console.log(`🎲 rollDice: direction=${direction}`);
        startRoll(direction, 'normal');
    }

    function rollShonben(direction) {
        console.log(`🎲 rollShonben: direction=${direction}`);
        startRoll(direction, 'force-shonben');
    }

    function startRoll(direction, mode = 'normal') {
        if (isRolling) {
            console.warn('Already rolling, ignoring startRoll');
            return;
        }
        console.log(`🎲 startRoll: direction=${direction}, mode=${mode}, diceCount=${gameState.diceCount}`);
        isRolling = true;
        shonbenDiceIds = [];

        let targetValues = new Array(gameState.diceCount).fill(null);

        if (mode === 'force-shonben') {
            const minCount = Math.min(gameState.shonbenMinDice, gameState.diceCount);
            const maxCount = Math.min(gameState.shonbenMaxDice, gameState.diceCount);
            const shonbenCount = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;

            const allIds = dices.map((_, i) => i);
            for (let i = allIds.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allIds[i], allIds[j]] = [allIds[j], allIds[i]];
            }
            shonbenDiceIds = allIds.slice(0, shonbenCount);
        } else if (!gameState.bowlEnabled) {
            shonbenDiceIds = dices.map((_, i) => i);
        } else {
            if (Math.random() < SHONBEN_CHANCE) {
                const minCount = Math.min(gameState.shonbenMinDice, gameState.diceCount);
                const maxCount = Math.min(gameState.shonbenMaxDice, gameState.diceCount);
                const shonbenCount = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;

                const allIds = dices.map((_, i) => i);
                for (let i = allIds.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [allIds[i], allIds[j]] = [allIds[j], allIds[i]];
                }
                shonbenDiceIds = allIds.slice(0, shonbenCount);
            }
        }

        dices.forEach((d, i) => {
            const isShonbenTarget = shonbenDiceIds.includes(i);
            d.roll(direction, (mode === 'force-shonben'), targetValues[i], isShonbenTarget);
        });

        startResultCheck();
    }

    function startResultCheck() {
        const checkStatus = setInterval(() => {
            if (dices.every(d => d.isStopped)) {
                clearInterval(checkStatus);
                isRolling = false;
            }
        }, 100);
    }

    function resetDices() {
        dices = [];
        for (let i = 0; i < gameState.diceCount; i++) {
            dices.push(new Dice(i));
        }
    }

    let animateFrameCount = 0;
    function animate() {
        if (!ctx) {
            console.error('❌ Canvas context lost!');
            return;
        }

        animateFrameCount++;
        if (animateFrameCount % 30 === 0) {
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const sortedDices = [...dices].sort((a, b) => a.z - b.z);
        dices.forEach(d => d.update());
        sortedDices.forEach(d => d.draw());
        requestAnimationFrame(animate);
    }

    function getIsRolling() {
        return isRolling;
    }

    // ========================================
    // 公開API
    // ========================================
    return {
        init,
        setBowl,
        setDiceFaces,
        setDiceLabels,
        setDiceSpriteSheet,
        setDiceCount,
        rollWithValues,
        rollDice,
        rollShonben,
        isRolling: getIsRolling,
        resetDices
    };
})();

window.DiceRoller = DiceRoller;
