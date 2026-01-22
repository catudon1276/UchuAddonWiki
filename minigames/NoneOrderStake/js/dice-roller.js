/**
 * 🎲 Dice Roller System
 * オリジナルDice.htmlを忠実に移植
 * 
 * ========================================
 * 🎮 公開API関数リファレンス
 * ========================================
 * 
 * 【基本設定】
 * 
 * 1. DiceRoller.setBowl(enabled)
 *    皿の表示/非表示を設定
 *    - enabled: true=皿あり, false=皿なし（全部落ちる）
 * 
 * 2. DiceRoller.setDiceFaces(faces)
 *    サイコロの面数を設定
 *    - faces: 面数（3, 6, 10, 20など任意の数）
 * 
 * 3. DiceRoller.setDiceLabels(labels)
 *    サイコロにカスタム文字を設定
 *    - labels: 文字の配列、またはnullで数字に戻す
 * 
 * 4. DiceRoller.setDiceSpriteSheet(urlOrConfig, frameWidth, frameHeight, frames, direction)
 *    スプライトシート画像を設定
 * 
 * 5. DiceRoller.setDiceCount(count)
 *    サイコロの数を設定
 * 
 * 【サイコロを振る】
 * 
 * 6. DiceRoller.rollDice(direction)
 *    通常のランダム振り
 *    - direction: 'bottom', 'top', 'left', 'right'
 * 
 * 7. DiceRoller.rollWithValues(direction, values)
 *    指定した目でサイコロを振る
 *    ※ 皿なし時は指定値より優先してションベンになります
 * 
 * 8. DiceRoller.rollShonben(direction)
 *    強制ションベン
 * 
 * 【コールバック】
 * 
 * window.onDiceRollComplete = function(results, isShonben) { ... }
 *    サイコロが止まった時に呼ばれる
 *    - results: 出目の配列 [3, 5, 2]
 *    - isShonben: ションベンが発生したか
 */

(function() {
    'use strict';

    // ========================================
    // 🎮 ゲーム状態
    // ========================================
    const gameState = {
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

    // スプライトシート画像の管理
    let spriteImage = null;
    let spriteImageLoaded = false;

    // ========================================
    // DOM要素
    // ========================================
    let canvas = null;
    let ctx = null;
    let resultDisplay = null;
    let bowlElement = null;

    let dices = [];
    let isRolling = false;
    let shonbenRoute = false;
    let shonbenDiceIds = [];

    // ========================================
    // 🔧 公開API関数
    // ========================================

    /**
     * 皿の表示/非表示を設定
     */
    function setBowl(enabled) {
        gameState.bowlEnabled = enabled;
        if (bowlElement) {
            bowlElement.style.display = enabled ? 'block' : 'none';
        }
    }

    /**
     * サイコロの面数を設定
     */
    function setDiceFaces(faces) {
        gameState.diceFaces = faces;
    }

    /**
     * サイコロにカスタム文字を設定
     */
    function setDiceLabels(labels) {
        gameState.diceLabels = labels;
    }

    /**
     * スプライトシートを設定
     */
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
            console.log('✅ スプライトシート読み込み完了:', config.url);
        };
        spriteImage.onerror = () => {
            console.error('❌ スプライトシート読み込み失敗:', config.url);
            gameState.diceSpriteSheet = null;
            spriteImage = null;
        };
        spriteImage.src = config.url;
    }

    /**
     * サイコロの数を設定
     */
    function setDiceCount(count) {
        if (isRolling) return;
        gameState.diceCount = count;
        resetDices();
    }

    /**
     * 指定した目でサイコロを振る
     */
    function rollWithValues(direction, values) {
        if (isRolling) return;
        isRolling = true;
        shonbenRoute = false;
        shonbenDiceIds = [];

        if (resultDisplay) {
            resultDisplay.classList.remove('show', 'shonben');
        }

        dices.forEach((d, i) => {
            const targetValue = values[i] || null;
            d.roll(direction, false, targetValue, false);
        });

        startResultCheck();
    }

    /**
     * 通常のサイコロ振り（ランダム）
     */
    function rollDice(direction) {
        startRoll(direction, 'normal');
    }

    /**
     * 強制ションベン
     */
    function rollShonben(direction) {
        startRoll(direction, 'force-shonben');
    }

    // ========================================
    // 内部関数
    // ========================================

    function startResultCheck() {
        const checkStatus = setInterval(() => {
            if (dices.every(d => d.isStopped)) {
                clearInterval(checkStatus);

                const shonbenOccurred = dices.some(d => d.isShonben);

                if (shonbenOccurred) {
                    setTimeout(() => {
                        if (resultDisplay) {
                            resultDisplay.textContent = "ションベン";
                            resultDisplay.classList.add('show', 'shonben');
                        }
                        isRolling = false;
                        fireCallback([], true);
                    }, 500);
                } else {
                    const res = dices.map(d => {
                        if (gameState.diceLabels && d.displayValue >= 1 && d.displayValue <= gameState.diceLabels.length) {
                            return gameState.diceLabels[d.displayValue - 1];
                        }
                        return d.displayValue;
                    });
                    const numericResults = dices.map(d => d.displayValue);
                    
                    if (resultDisplay) {
                        resultDisplay.textContent = res.join(" ");
                        resultDisplay.classList.add('show');
                    }
                    isRolling = false;
                    fireCallback(numericResults, false);
                }
            }
        }, 100);
    }

    function fireCallback(results, isShonben) {
        if (typeof window.onDiceRollComplete === 'function') {
            window.onDiceRollComplete(results, isShonben);
        }
    }

    function resetDices() {
        dices = [];
        for (let i = 0; i < gameState.diceCount; i++) {
            dices.push(new Dice(i));
        }
        if (resultDisplay) {
            resultDisplay.textContent = Array(gameState.diceCount).fill('?').join(' ');
            resultDisplay.classList.remove('show', 'shonben');
        }
    }

    function startRoll(direction, mode = 'normal') {
        if (isRolling) return;
        isRolling = true;
        shonbenRoute = false;
        shonbenDiceIds = [];

        if (resultDisplay) {
            resultDisplay.classList.remove('show', 'shonben');
        }

        let targetValues = new Array(gameState.diceCount).fill(null);

        if (mode === 'force-shonben') {
            shonbenRoute = true;
            const minCount = Math.min(gameState.shonbenMinDice, gameState.diceCount);
            const maxCount = Math.min(gameState.shonbenMaxDice, gameState.diceCount);
            const shonbenCount = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;

            const allIds = dices.map((_, i) => i);
            for (let i = allIds.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [allIds[i], allIds[j]] = [allIds[j], allIds[i]];
            }
            shonbenDiceIds = allIds.slice(0, shonbenCount);
        } else if (mode === 'force-pin') {
            targetValues = new Array(gameState.diceCount).fill(1);
        } else {
            if (!gameState.bowlEnabled) {
                shonbenRoute = true;
                shonbenDiceIds = dices.map((_, i) => i);
            } else {
                if (Math.random() < SHONBEN_CHANCE) {
                    shonbenRoute = true;
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
        }

        dices.forEach((d, i) => {
            const isShonbenTarget = shonbenDiceIds.includes(i);
            d.roll(direction, (mode === 'force-shonben'), targetValues[i], isShonbenTarget);
        });

        startResultCheck();
    }

    // ========================================
    // Diceクラス定義
    // ========================================
    class Dice {
        constructor(id) {
            this.id = id;
            this.reset();
        }

        reset() {
            this.x = canvas ? canvas.width / 2 : 300;
            this.y = canvas ? canvas.height + 200 : 800;
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

            // サイコロ同士の衝突
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

            // 影の描画
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

            // サイコロ本体
            ctx.save();
            ctx.translate(this.x, this.y - this.z);
            if (this.shakeAmount > 0) {
                ctx.translate((Math.random() - 0.5) * this.shakeAmount, (Math.random() - 0.5) * this.shakeAmount);
                this.shakeAmount *= 0.85;
            }
            ctx.rotate(this.angle);
            const drawScale = (1 + this.z / 200) * this.fallScale;
            ctx.scale(drawScale, drawScale);
            this.drawDiceFace(this.displayValue);
            ctx.restore();

            ctx.globalAlpha = 1.0;
        }

        drawDiceFace(val) {
            const s = DICE_SIZE;
            const r = 10;

            // 影部分
            ctx.fillStyle = "#cbd5e1";
            ctx.beginPath();
            ctx.roundRect(-s / 2, -s / 2 + 5, s, s, r);
            ctx.fill();

            // 本体
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
    // アニメーションループ
    // ========================================
    function animate() {
        if (!canvas || !ctx) {
            requestAnimationFrame(animate);
            return;
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const sortedDices = [...dices].sort((a, b) => a.z - b.z);
        dices.forEach(d => d.update());
        sortedDices.forEach(d => d.draw());
        requestAnimationFrame(animate);
    }

    // ========================================
    // 初期化
    // ========================================
    function init() {
        canvas = document.getElementById('diceCanvas');
        if (!canvas) {
            console.warn('⚠️ #diceCanvas が見つかりません。後で初期化してください。');
            return false;
        }
        
        ctx = canvas.getContext('2d');
        resultDisplay = document.getElementById('result-display');
        bowlElement = document.getElementById('bowl-bg');

        // リサイズ処理
        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();

        // 皿の初期化
        setBowl(gameState.bowlEnabled);
        if (bowlElement) {
            bowlElement.style.width = gameState.bowlRadius * 2 + 'px';
            bowlElement.style.height = gameState.bowlRadius * 2 + 'px';
        }

        // サイコロの初期化
        resetDices();

        console.log('🎲 Dice Roller initialized!');
        return true;
    }

    // DOM読み込み完了後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            init();
            animate();
        });
    } else {
        // すでに読み込み済み
        if (init()) {
            animate();
        } else {
            // canvasがまだない場合はアニメーションだけ開始
            animate();
        }
    }

    // ========================================
    // Canvas表示制御
    // ========================================
    function showCanvas() {
        const container = document.getElementById('canvas-container');
        if (container) {
            container.classList.remove('hidden');
            container.classList.add('active');
        }
    }

    function hideCanvas() {
        const container = document.getElementById('canvas-container');
        if (container) {
            container.classList.add('hidden');
            container.classList.remove('active');
        }
    }

    // ========================================
    // グローバルAPIの公開
    // ========================================
    window.DiceRoller = {
        setBowl,
        setDiceFaces,
        setDiceLabels,
        setDiceSpriteSheet,
        setDiceCount,
        rollDice,
        rollWithValues,
        rollShonben,
        
        // Canvas表示制御
        showCanvas,
        hideCanvas,
        
        // 追加ユーティリティ
        init: init,
        isRolling: () => isRolling,
        getResults: () => dices.map(d => d.displayValue),
        reset: resetDices
    };

    console.log('🎲 Dice Roller API loaded!');
    console.log('使用例: DiceRoller.rollDice("bottom")');

})();