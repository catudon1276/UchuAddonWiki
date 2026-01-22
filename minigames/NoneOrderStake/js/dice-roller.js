/**
 * 🎲 Dice Roller System
 * Dice.htmlのサイコロ演出システムを統合
 */

// ========================================
// 🎮 ゲーム状態
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

let spriteImage = null;
let spriteImageLoaded = false;

// ========================================
// 🔧 公開API関数
// ========================================

function setBowl(enabled) {
    gameState.bowlEnabled = enabled;
    const bowlElement = document.getElementById('dice-bowl-bg');
    if (bowlElement) {
        bowlElement.style.display = enabled ? 'block' : 'none';
    }
}

function setDiceFaces(faces) {
    gameState.diceFaces = Math.max(3, faces);
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
        config = { url: urlOrConfig, frameWidth, frameHeight, frames, direction };
    } else {
        config = urlOrConfig;
    }
    
    gameState.diceSpriteSheet = config;
    
    spriteImage = new Image();
    spriteImageLoaded = false;
    spriteImage.onload = () => { spriteImageLoaded = true; };
    spriteImage.onerror = () => {
        console.error('スプライトシート読み込み失敗:', config.url);
        gameState.diceSpriteSheet = null;
        spriteImage = null;
        spriteImageLoaded = false;
    };
    spriteImage.src = config.url;
}

function setDiceCount(count) {
    gameState.diceCount = Math.max(1, count);
    resetDices();
}

function rollDice(direction = 'bottom') {
    startRoll(direction, 'normal');
}

function rollWithValues(direction = 'bottom', values = []) {
    startRoll(direction, 'force-values', values);
}

function rollShonben(direction = 'bottom') {
    startRoll(direction, 'force-shonben');
}

// ========================================
// Canvas初期化
// ========================================
const canvas = document.getElementById('diceCanvas');
const ctx = canvas.getContext('2d');
const resultDisplay = document.getElementById('dice-result-display');
const canvasContainer = document.getElementById('dice-canvas-container');

canvas.width = 600;
canvas.height = 600;

const GROUND_Y = canvas.height / 2;
const CEILING_Y = canvas.height / 2;

let dices = [];
let isRolling = false;
let shonbenRoute = false;
let shonbenDiceIds = [];

// ========================================
// サイコロクラス
// ========================================
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
        this.angleSpeed = 0;
        this.displayValue = Math.floor(Math.random() * gameState.diceFaces) + 1;
        this.finalValue = this.displayValue;
        this.isStopped = false;
        this.isShonben = false;
        this.bounces = 0;
        this.shakeAmount = 0;
        this.fallScale = 1.0;
    }

    roll(direction, forceShonben, targetValue, isShonbenTarget) {
        this.reset();
        this.isStopped = false;
        this.isShonben = false;
        
        if (targetValue !== null && targetValue !== undefined) {
            this.finalValue = targetValue;
        } else {
            this.finalValue = Math.floor(Math.random() * gameState.diceFaces) + 1;
        }
        
        if (!gameState.bowlEnabled || forceShonben || isShonbenTarget) {
            this.isShonben = true;
        }
        
        const spawnDistance = 150;
        const speed = 8 + Math.random() * 3;
        
        switch (direction) {
            case 'bottom':
                this.x = canvas.width / 2 + (Math.random() - 0.5) * 200;
                this.y = canvas.height + 100;
                this.vy = -speed;
                this.vx = (Math.random() - 0.5) * 4;
                break;
            case 'top':
                this.x = canvas.width / 2 + (Math.random() - 0.5) * 200;
                this.y = -100;
                this.vy = speed;
                this.vx = (Math.random() - 0.5) * 4;
                break;
            case 'left':
                this.x = -100;
                this.y = canvas.height / 2 + (Math.random() - 0.5) * 200;
                this.vx = speed;
                this.vy = (Math.random() - 0.5) * 4;
                break;
            case 'right':
                this.x = canvas.width + 100;
                this.y = canvas.height / 2 + (Math.random() - 0.5) * 200;
                this.vx = -speed;
                this.vy = (Math.random() - 0.5) * 4;
                break;
        }
        
        this.angleSpeed = (Math.random() - 0.5) * 0.3;
        this.z = Math.random() * 50;
        this.vz = (Math.random() - 0.5) * 2;
        this.fallScale = 0.3;
    }

    update() {
        if (this.isStopped) return;
        
        this.x += this.vx;
        this.y += this.vy;
        this.z += this.vz;
        this.angle += this.angleSpeed;
        
        if (this.fallScale < 1.0) {
            this.fallScale = Math.min(1.0, this.fallScale + 0.05);
        }
        
        const distFromCenter = Math.hypot(this.x - canvas.width / 2, this.y - canvas.height / 2);
        
        if (this.isShonben) {
            this.vy += 0.15;
            this.angleSpeed *= 0.98;
            
            if (this.y > canvas.height + 100 || this.x < -100 || this.x > canvas.width + 100) {
                this.isStopped = true;
            }
        } else {
            if (distFromCenter < SAFE_RADIUS) {
                this.vx *= 0.92;
                this.vy *= 0.92;
                this.angleSpeed *= 0.95;
                
                if (Math.abs(this.vx) < 0.2 && Math.abs(this.vy) < 0.2) {
                    this.vx = 0;
                    this.vy = 0;
                    this.angleSpeed = 0;
                    this.isStopped = true;
                    this.displayValue = this.finalValue;
                    this.angle = 0;
                }
            } else if (distFromCenter > RADIUS - DICE_SIZE / 2) {
                const angle = Math.atan2(this.y - canvas.height / 2, this.x - canvas.width / 2);
                const overlap = distFromCenter - (RADIUS - DICE_SIZE / 2);
                
                this.x -= Math.cos(angle) * overlap;
                this.y -= Math.sin(angle) * overlap;
                
                const normalX = Math.cos(angle);
                const normalY = Math.sin(angle);
                const dotProduct = this.vx * normalX + this.vy * normalY;
                
                this.vx -= 2 * dotProduct * normalX * 0.7;
                this.vy -= 2 * dotProduct * normalY * 0.7;
                
                this.bounces++;
                this.shakeAmount = 10;
                
                if (this.bounces > 3) {
                    const dist = Math.hypot(this.vx, this.vy);
                    if (dist < 1.5) {
                        this.vx = 0;
                        this.vy = 0;
                        this.angleSpeed = 0;
                        this.isStopped = true;
                        this.displayValue = this.finalValue;
                        this.angle = 0;
                    }
                }
            }
            
            if (Math.random() < 0.05) {
                this.displayValue = Math.floor(Math.random() * gameState.diceFaces) + 1;
            }
        }
    }

    draw() {
        ctx.globalAlpha = 1.0; // 最初に確実にリセット
        
        if (!this.isStopped || !this.isShonben) {
            const shadowDist = Math.min(this.z + 10, 40);
            const sScale = 1 + (shadowDist / 100);
            ctx.globalAlpha = Math.max(0.1, 0.4 - shadowDist / 100);
            ctx.save();
            ctx.translate(this.x + 6, GROUND_Y + shadowDist);
            ctx.scale(sScale, sScale);
            ctx.fillStyle = "rgba(0,0,0,0.15)";
            ctx.beginPath();
            ctx.roundRect(-DICE_SIZE/2 + 4, -DICE_SIZE/2 + 4, DICE_SIZE, DICE_SIZE, 12);
            ctx.fill();
            ctx.restore();
            ctx.globalAlpha = 1.0; // 影描画後に再度リセット
        }

        ctx.save();
        ctx.translate(this.x, this.y - this.z);
        if (this.shakeAmount > 0) {
            ctx.translate((Math.random()-0.5)*this.shakeAmount, (Math.random()-0.5)*this.shakeAmount);
            this.shakeAmount *= 0.85;
        }
        ctx.rotate(this.angle);
        const drawScale = (1 + this.z / 300) * this.fallScale;
        ctx.scale(drawScale, drawScale);
        this.drawDiceFace(this.displayValue);
        ctx.restore();

        ctx.globalAlpha = 1.0; // 最後にも確実にリセット
    }

    drawDiceFace(val) {
        const s = DICE_SIZE;
        const r = 10;
        
        ctx.fillStyle = "#cbd5e1";
        ctx.beginPath();
        ctx.roundRect(-s/2, -s/2 + 5, s, s, r);
        ctx.fill();
        
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(-s/2, -s/2, s, s, r);
        ctx.fill();
        
        this.drawNumber(val);
    }

    drawNumber(val) {
        const s = DICE_SIZE;
        
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
                    -s/2, -s/2, s, s
                );
                return;
            }
        }
        
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
// 初期化
// ========================================
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

for (let i = 0; i < gameState.diceCount; i++) {
    dices.push(new Dice(i));
}

function startRoll(direction, mode = 'normal', forceValues = []) {
    if (isRolling) return;
    
    // Canvas表示
    if (canvasContainer) {
        canvasContainer.classList.add('active');
    }
    
    isRolling = true;
    shonbenRoute = false;
    shonbenDiceIds = [];
    
    if (resultDisplay) {
        resultDisplay.classList.remove('show', 'shonben');
    }
    
    let targetValues = new Array(gameState.diceCount).fill(null);
    
    if (mode === 'force-values' && forceValues.length > 0) {
        targetValues = forceValues;
    } else if (mode === 'force-shonben') {
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

    const checkStatus = setInterval(() => {
        if (dices.every(d => d.isStopped)) {
            clearInterval(checkStatus);
            
            const shonbenOccurred = dices.some(d => d.isShonben);
            
            setTimeout(() => {
                if (shonbenOccurred) {
                    if (resultDisplay) {
                        resultDisplay.textContent = "ションベン";
                        resultDisplay.classList.add('show', 'shonben');
                    }
                } else {
                    const res = dices.map(d => {
                        if (gameState.diceLabels && d.displayValue >= 1 && d.displayValue <= gameState.diceLabels.length) {
                            return gameState.diceLabels[d.displayValue - 1];
                        }
                        return d.displayValue;
                    });
                    if (resultDisplay) {
                        resultDisplay.textContent = res.join(" ");
                        resultDisplay.classList.add('show');
                    }
                }
                
                isRolling = false;
                
                // コールバック発火（ゲームロジック側で使用）
                if (window.onDiceRollComplete) {
                    const results = dices.map(d => d.displayValue);
                    const isShonben = dices.some(d => d.isShonben);
                    window.onDiceRollComplete(results, isShonben);
                }
            }, 500);
        }
    }, 100);
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sortedDices = [...dices].sort((a, b) => a.z - b.z);
    dices.forEach(d => d.update());
    sortedDices.forEach(d => d.draw());
    requestAnimationFrame(animate);
}

animate();

// ========================================
// API公開
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
    hideCanvas: () => {
        if (canvasContainer) {
            canvasContainer.classList.remove('active');
        }
    },
    showCanvas: () => {
        if (canvasContainer) {
            canvasContainer.classList.add('active');
        }
    }
};

console.log('🎲 Dice Roller API loaded!');