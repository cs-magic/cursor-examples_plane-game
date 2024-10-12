const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score-value');
const startButton = document.getElementById('start-button');
const muteButton = document.getElementById('mute-button');

// 在文件开头添加以下代码，替换之前的音频相关代码

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let isMuted = false;

// 创建主音量控制
const masterGainNode = audioContext.createGain();
masterGainNode.connect(audioContext.destination);
masterGainNode.gain.setValueAtTime(0.5, audioContext.currentTime);

// 创建效果器
const reverbNode = audioContext.createConvolver();
const reverbTime = 2;
const reverbRate = audioContext.sampleRate; // 使用音频上下文的实际采样率
const reverbLength = reverbRate * reverbTime;
const reverbBuffer = audioContext.createBuffer(2, reverbLength, reverbRate);
for (let channel = 0; channel < 2; channel++) {
    const channelData = reverbBuffer.getChannelData(channel);
    for (let i = 0; i < reverbLength; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / reverbLength, reverbTime);
    }
}
reverbNode.buffer = reverbBuffer;

// 创建合成器
function createSynth(type, freq) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioContext.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, audioContext.currentTime);
    filter.Q.setValueAtTime(10, audioContext.currentTime);

    osc.connect(gain);
    gain.connect(filter);
    filter.connect(reverbNode);
    reverbNode.connect(masterGainNode);

    return { osc, gain, filter };
}

// 创建音序器
function createSequencer(notes, duration, synth) {
    let index = 0;
    const sequence = setInterval(() => {
        if (isMuted) return;
        const note = notes[index % notes.length];
        synth.osc.frequency.setValueAtTime(note, audioContext.currentTime);
        synth.gain.gain.setValueAtTime(0.3, audioContext.currentTime);
        synth.gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
        index++;
    }, duration);
    return sequence;
}

// 创建鼓点
function createDrums() {
    const kick = audioContext.createOscillator();
    const kickGain = audioContext.createGain();
    kick.connect(kickGain);
    kickGain.connect(masterGainNode);

    const snare = audioContext.createBufferSource();
    const snareBuff = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate);
    const snareData = snareBuff.getChannelData(0);
    for (let i = 0; i < snareBuff.length; i++) {
        snareData[i] = Math.random() * 2 - 1;
    }
    snare.buffer = snareBuff;
    const snareGain = audioContext.createGain();
    snare.connect(snareGain);
    snareGain.connect(masterGainNode);

    kick.start();

    setInterval(() => {
        if (isMuted) return;
        kick.frequency.setValueAtTime(150, audioContext.currentTime);
        kickGain.gain.setValueAtTime(1, audioContext.currentTime);
        kick.frequency.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        kickGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        if (Math.random() > 0.5) {
            const newSnare = audioContext.createBufferSource();
            newSnare.buffer = snareBuff;
            newSnare.connect(snareGain);
            snareGain.gain.setValueAtTime(0.5, audioContext.currentTime + 0.25);
            newSnare.start(audioContext.currentTime + 0.25);
            snareGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        }
    }, 500);
}

// 生成音乐
function generateMusic() {
    const bpm = 140;
    const beatDuration = 60 / bpm;

    const bassNotes = [220, 220, 165, 165];
    const bassSynth = createSynth('sawtooth', bassNotes[0]);
    bassSynth.osc.start();
    createSequencer(bassNotes, beatDuration * 1000, bassSynth);

    const leadNotes = [440, 495, 550, 660, 550, 495, 440, 330];
    const leadSynth = createSynth('square', leadNotes[0]);
    leadSynth.osc.start();
    createSequencer(leadNotes, beatDuration * 500, leadSynth);

    createDrums();
}

// 开始/停止背景音乐
function toggleBgMusic() {
    if (isMuted) {
        masterGainNode.gain.setValueAtTime(0, audioContext.currentTime);
    } else {
        masterGainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        generateMusic();
    }
}

// 修改静音按钮的事件监听器
muteButton.addEventListener('click', () => {
    isMuted = !isMuted;
    muteButton.textContent = isMuted ? '取消静音' : '静音';
    toggleBgMusic();
});

// 在开始游戏按钮的事件监听器中启动音乐
startButton.addEventListener('click', () => {
    toggleBgMusic();
    gameLoop();
    startButton.style.display = 'none';
});

canvas.width = 320;
canvas.height = 480;

let score = 0;
let level = 1;
let gameOver = false;

// 绘制飞船
function drawShip(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    ctx.fill();
}

// 绘制子弹
function drawBullet(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
}

// 绘制敌人
function drawEnemy(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y + height);
    ctx.lineTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.closePath();
    ctx.fill();
}

// 绘制道具
function drawPowerup(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + width / 2, y);
    ctx.lineTo(x + width, y + height / 2);
    ctx.lineTo(x + width / 2, y + height);
    ctx.lineTo(x, y + height / 2);
    ctx.closePath();
    ctx.fill();
}

class Player {
    constructor() {
        this.width = 32;
        this.height = 32;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - this.height - 10;
        this.speed = 5;
        this.health = 100;
        this.maxHealth = 100;
        this.shieldActive = false;
        this.weapons = {
            normal: { level: 1, active: true },
            laser: { level: 0, active: false },
            spread: { level: 0, active: false },
            homing: { level: 0, active: false }
        };
        this.speedY = 5; // 添加垂直速度
    }

    draw() {
        drawShip(this.x, this.y, this.width, this.height, '#00f');
        
        // 绘制生命条
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 10, this.width, 5);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y - 10, this.width * (this.health / this.maxHealth), 5);

        // 绘制护盾
        if (this.shieldActive) {
            ctx.strokeStyle = 'cyan';
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2 + 5, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    moveLeft() {
        if (this.x > 0) {
            this.x -= this.speed;
        }
    }

    moveRight() {
        if (this.x < canvas.width - this.width) {
            this.x += this.speed;
        }
    }

    moveUp() {
        if (this.y > 0) {
            this.y -= this.speedY;
        }
    }

    moveDown() {
        if (this.y < canvas.height - this.height) {
            this.y += this.speedY;
        }
    }

    upgradeWeapon(type) {
        if (this.weapons[type]) {
            // 如果武器已经激活，只提升等级
            if (this.weapons[type].active) {
                this.weapons[type].level = Math.min(this.weapons[type].level + 1, 3);
            } else {
                // 如果武器未激活，激活它并设置等级为1
                this.weapons[type].active = true;
                this.weapons[type].level = 1;
            }
        }
    }
}

class Bullet {
    constructor(x, y, type = 'normal', level = 1) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.level = level;
        this.width = 4;
        this.height = 10;
        this.speed = 7;
        this.damage = 1;

        switch (type) {
            case 'normal':
                this.color = '#ff0';
                this.damage = level;
                break;
            case 'laser':
                this.color = '#0ff';
                this.width = 2;
                this.height = canvas.height / 2; // 将激光长度限制为画布高度的一半
                this.damage = level * 0.5;
                break;
            case 'spread':
                this.color = '#f0f';
                this.angle = (Math.random() - 0.5) * Math.PI / 4;
                this.damage = level * 0.7;
                break;
            case 'homing':
                this.color = '#0f0';
                this.target = null;
                this.damage = level * 1.2;
                break;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        if (this.type === 'laser') {
            ctx.fillRect(this.x, this.y - this.height, this.width, this.height);
        } else {
            ctx.beginPath();
            ctx.ellipse(this.x, this.y, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    update() {
        switch (this.type) {
            case 'normal':
            case 'laser': // 激光也需要向上移动
                this.y -= this.speed;
                break;
            case 'spread':
                this.x += Math.sin(this.angle) * this.speed;
                this.y -= Math.cos(this.angle) * this.speed;
                break;
            case 'homing':
                if (!this.target || this.target.health <= 0) {
                    this.target = enemies.find(enemy => enemy.health > 0);
                }
                if (this.target) {
                    const dx = this.target.x - this.x;
                    const dy = this.target.y - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    this.x += (dx / distance) * this.speed;
                    this.y += (dy / distance) * this.speed;
                } else {
                    this.y -= this.speed;
                }
                break;
        }
    }
}

// 修改这些全局变量
const scrollSpeed = 0.2; // 降低背景滚动速度
const enemySpawnInterval = 2000; // 每2秒生成一个敌人
let lastEnemySpawnTime = 0;
let isBossActive = false;

class Enemy {
    constructor(type = 'normal') {
        this.width = 30;
        this.height = 30;
        this.type = type;
        
        switch (this.type) {
            case 'turret':
                this.x = Math.random() * canvas.width;
                this.y = -this.height;
                this.speed = 0;
                this.health = 3;
                this.movementPattern = this.turretMovement.bind(this);
                break;
            case 'tank':
                this.x = Math.random() * canvas.width;
                this.y = -this.height;
                this.speed = 0.2; // 降低坦克速度
                this.health = 5;
                this.movementPattern = this.tankMovement.bind(this);
                break;
            case 'aircraft':
                this.x = Math.random() * canvas.width;
                this.y = -this.height;
                this.speed = 0.8; // 降低飞机速度
                this.health = 2;
                this.movementPattern = this.aircraftMovement.bind(this);
                break;
            default: // 'normal' type
                this.x = Math.random() * canvas.width;
                this.y = -this.height;
                this.speed = 0.5; // 降低普通敌人速度
                this.health = 1;
                this.movementPattern = this.normalMovement.bind(this);
        }
        
        this.shootInterval = Math.random() * 1000 + 1000;
        this.lastShot = 0;
    }

    normalMovement() {
        this.y += this.speed + scrollSpeed;
    }

    tankMovement() {
        this.y += scrollSpeed;
        this.x += Math.sin(this.y * 0.02) * 0.5;
    }

    aircraftMovement() {
        this.y += this.speed + scrollSpeed;
        this.x += Math.sin(this.y * 0.05) * 2;
    }

    turretMovement() {
        this.y += scrollSpeed; // 炮台只随背景移动
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        
        switch (this.type) {
            case 'turret':
                ctx.fillStyle = '#888';
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                ctx.fillStyle = '#444';
                ctx.fillRect(-this.width / 4, -this.height / 2, this.width / 2, this.height / 2);
                break;
            case 'tank':
                ctx.fillStyle = '#060';
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                ctx.fillStyle = '#030';
                ctx.fillRect(-this.width / 2, -this.height / 4, this.width, this.height / 2);
                break;
            case 'aircraft':
                ctx.fillStyle = '#600';
                ctx.beginPath();
                ctx.moveTo(0, -this.height / 2);
                ctx.lineTo(-this.width / 2, this.height / 2);
                ctx.lineTo(this.width / 2, this.height / 2);
                ctx.closePath();
                ctx.fill();
                break;
            default:
                ctx.fillStyle = '#f00';
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        }
        
        ctx.restore();
    }

    update(currentTime) {
        this.movementPattern();

        // 边界检查
        if (this.x < -this.width || this.x > game.canvas.width || 
            this.y > game.canvas.height) {
            return false;
        }

        // 射击逻辑
        if (currentTime - this.lastShot > this.shootInterval) {
            this.shoot();
            this.lastShot = currentTime;
        }

        return true;
    }

    shoot() {
        const angle = Math.atan2(game.player.y - this.y, game.player.x - this.x);
        game.enemyBullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height / 2, angle));
    }
}

// 添加 Boss 类
class Boss {
    constructor() {
        this.width = 100;
        this.height = 100;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = -this.height;
        this.speed = 0.5;
        this.health = 100;
        this.maxHealth = 100;
        this.shootInterval = 1000;
        this.lastShot = 0;
        this.movementPhase = 0;
    }

    draw() {
        ctx.fillStyle = '#800';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 绘制生命条
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x, this.y - 10, this.width, 5);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y - 10, this.width * (this.health / this.maxHealth), 5);
    }

    update(currentTime) {
        if (this.y < 50) {
            this.y += this.speed;
        } else {
            this.x += Math.sin(this.movementPhase) * 2;
            this.movementPhase += 0.05;
        }

        if (currentTime - this.lastShot > this.shootInterval) {
            this.shoot();
            this.lastShot = currentTime;
        }

        return this.health > 0;
    }

    shoot() {
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI / 4) * i;
            enemyBullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height, angle));
        }
    }
}

let boss = null;

class Powerup {
    constructor() {
        this.width = 20;
        this.height = 20;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height;
        this.speed = 1;
        this.types = ['health', 'shield', 'normal', 'laser', 'spread', 'homing'];
        this.type = this.types[Math.floor(Math.random() * this.types.length)];
        this.angle = 0;
        this.swingSpeed = 0.05;
        this.swingAmplitude = 2;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.angle);
        let color;
        switch (this.type) {
            case 'health': color = 'green'; break;
            case 'shield': color = 'cyan'; break;
            case 'normal': color = 'yellow'; break;
            case 'laser': color = '#0ff'; break;
            case 'spread': color = '#f0f'; break;
            case 'homing': color = '#0f0'; break;
        }
        drawPowerup(-this.width / 2, -this.height / 2, this.width, this.height, color);
        ctx.restore();
    }

    update() {
        this.y += this.speed;
        this.x += Math.sin(this.angle) * this.swingAmplitude;
        this.angle += this.swingSpeed;
    }
}

class Explosion {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.particles = [];
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: this.x,
                y: this.y,
                radius: Math.random() * 3 + 1,
                color: `hsl(${Math.random() * 60 + 15}, 100%, 50%)`,
                velocity: {
                    x: Math.random() * 6 - 3,
                    y: Math.random() * 6 - 3
                },
                alpha: 1
            });
        }
    }

    draw() {
        this.particles.forEach(particle => {
            ctx.globalAlpha = particle.alpha;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fillStyle = particle.color;
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    update() {
        this.particles.forEach(particle => {
            particle.x += particle.velocity.x;
            particle.y += particle.velocity.y;
            particle.alpha -= 0.02;
        });
        this.particles = this.particles.filter(particle => particle.alpha > 0);
        return this.particles.length > 0;
    }
}

class EnemyBullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 4;
        this.speed = 3;
        this.angle = angle;
    }

    draw() {
        ctx.fillStyle = '#f00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        return this.x >= 0 && this.x <= canvas.width && this.y >= 0 && this.y <= canvas.height;
    }
}

// 在文件顶部添加 Coin 类定义
class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.speed = 2;
    }

    update() {
        this.y += this.speed;
    }

    draw(ctx) {
        ctx.fillStyle = 'gold';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Add this line near the top of the file, where other arrays are declared
let coins = [];

// Update the Game class
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.player = new Player();
        this.bullets = [];
        this.enemies = [];
        this.powerups = [];
        this.explosions = [];
        this.coins = [];
        this.enemyBullets = [];
        this.score = 0;
        this.level = 1;
        this.gameOver = false;
        this.lastEnemySpawnTime = 0;
        this.enemySpawnInterval = 2000;
        this.isBossActive = false;
        this.boss = null;
        this.scrollY = 0;
        this.scrollSpeed = 0.2;
    }

    update() {
        const currentTime = Date.now();

        // Update player
        // (Add player update logic here if needed)

        // Update bullets
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            return bullet.y > 0;
        });

        // Update enemies
        this.enemies = this.enemies.filter(enemy => {
            return enemy.update(currentTime);
        });

        // Update powerups
        this.powerups = this.powerups.filter(powerup => {
            powerup.update();
            return powerup.y <= this.canvas.height;
        });

        // Update explosions
        this.explosions = this.explosions.filter(explosion => {
            return explosion.update();
        });

        // Update coins
        this.coins = this.coins.filter(coin => {
            coin.update();
            if (coin.y > this.canvas.height) {
                return false;
            }
            if (this.checkCollision(this.player, coin)) {
                this.score += 5; // Collect coin, increase score
                return false;
            }
            return true;
        });

        // Spawn enemies
        if (!this.isBossActive && currentTime - this.lastEnemySpawnTime > this.enemySpawnInterval) {
            const enemyTypes = ['normal', 'turret', 'tank', 'aircraft'];
            const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            this.enemies.push(new Enemy(randomType));
            this.lastEnemySpawnTime = currentTime;
        }

        // Check for boss spawn
        if (this.score > 0 && this.score % 500 === 0 && !this.isBossActive && !this.boss) {
            this.boss = new Boss();
            this.isBossActive = true;
        }

        // Update boss
        if (this.boss) {
            if (this.boss.update(currentTime)) {
                if (this.boss.health <= 0) {
                    this.explosions.push(new Explosion(this.boss.x + this.boss.width / 2, this.boss.y + this.boss.height / 2));
                    playExplosionSound();
                    this.score += 100;
                    this.boss = null;
                    this.isBossActive = false;
                }
            } else {
                this.boss = null;
                this.isBossActive = false;
            }
        }

        // Spawn powerups
        if (Math.random() < 0.01) {
            this.powerups.push(new Powerup());
        }

        // Update level
        if (this.score > this.level * 100) {
            this.level++;
        }
    }

    drawBackground() {
        this.ctx.fillStyle = '#000033';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw stars
        this.ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * this.canvas.width;
            const y = (Math.random() * this.canvas.height + this.scrollY) % this.canvas.height;
            this.ctx.fillRect(x, y, 1, 1);
        }

        // Draw clouds
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        for (let i = 0; i < 5; i++) {
            const x = Math.random() * this.canvas.width;
            const y = (Math.random() * this.canvas.height + this.scrollY * 0.1) % this.canvas.height;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 30, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.scrollY += this.scrollSpeed;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawBackground();

        this.player.draw(this.ctx);
        this.bullets.forEach(bullet => bullet.draw(this.ctx));
        this.enemies.forEach(enemy => enemy.draw(this.ctx));
        this.powerups.forEach(powerup => powerup.draw(this.ctx));
        this.explosions.forEach(explosion => explosion.draw(this.ctx));
        this.coins.forEach(coin => coin.draw(this.ctx));
        this.enemyBullets.forEach(bullet => bullet.draw(this.ctx));

        if (this.boss) {
            this.boss.draw(this.ctx);
        }

        // Draw score and level
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`Score: ${this.score}`, 10, 20);
        this.ctx.fillText(`Level: ${this.level}`, 10, 40);
        this.ctx.fillText(`Health: ${this.player.health}`, 10, 60);
    }

    checkCollisions() {
        // ... (keep existing collision logic)
    }

    checkCollision(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }
}

// Update the gameLoop function
function gameLoop() {
    if (game.gameOver) {
        game.ctx.fillStyle = 'white';
        game.ctx.font = '30px Arial';
        game.ctx.fillText('游戏结束', game.canvas.width / 2 - 60, game.canvas.height / 2);
        game.ctx.fillText(`得分: ${game.score}`, game.canvas.width / 2 - 60, game.canvas.height / 2 + 40);
        return;
    }

    game.update();
    game.checkCollisions();
    game.draw();

    requestAnimationFrame(gameLoop);
}

// Create a game instance
const game = new Game(canvas);

// Start the game loop
gameLoop();

// Remove these redundant declarations
// const player = new Player();
// let bullets = [];
// let enemies = [];
// let powerups = [];
// let explosions = [];
// let enemyBullets = [];
// let scrollY = 0;

// Remove this redundant function
// function drawBackground() { ... }

let touchStartX = 0;
let isShooting = false;

// 更新摸事件处理
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    isShooting = true;
    shoot();
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    // 计算玩家应该移动到的位置
    const targetX = touchX - game.player.width / 2;
    const targetY = touchY - game.player.height / 2;
    
    // 平滑移动
    game.player.x += (targetX - game.player.x) * 0.1;
    game.player.y += (targetY - game.player.y) * 0.1;
    
    // 确保玩家不会移出画布
    game.player.x = Math.max(0, Math.min(game.canvas.width - game.player.width, game.player.x));
    game.player.y = Math.max(0, Math.min(game.canvas.height - game.player.height, game.player.y));
}

function handleTouchEnd(e) {
    e.preventDefault();
    isShooting = false;
}

function shoot() {
    if (isShooting) {
        playShootSound();
        
        Object.entries(game.player.weapons).forEach(([type, weapon]) => {
            if (weapon.active) {
                switch (type) {
                    case 'normal':
                        game.bullets.push(new Bullet(game.player.x + game.player.width / 2, game.player.y, 'normal', weapon.level));
                        break;
                    case 'laser':
                        game.bullets.push(new Bullet(game.player.x + game.player.width / 2, game.player.y, 'laser', weapon.level));
                        break;
                    case 'spread':
                        for (let i = 0; i < 3; i++) {
                            game.bullets.push(new Bullet(game.player.x + game.player.width / 2, game.player.y, 'spread', weapon.level));
                        }
                        break;
                    case 'homing':
                        game.bullets.push(new Bullet(game.player.x + game.player.width / 2, game.player.y, 'homing', weapon.level));
                        break;
                }
            }
        });

        // Use the highest level weapon to determine fire rate
        const maxLevel = Math.max(...Object.values(game.player.weapons).map(w => w.active ? w.level : 0));
        setTimeout(shoot, 200 / maxLevel);
    }
}

// 在文件顶部的音频相关代码后添加以下函数

// 创建简单的音效
function createSound(freq, type, duration) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioContext.currentTime);
    osc.connect(gain);
    gain.connect(masterGainNode);
    osc.start();
    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    osc.stop(audioContext.currentTime + duration);
}

// 射击音效
function playShootSound() {
    if (isMuted) return;
    createSound(880, 'square', 0.1);
}

// 命中音效
function playHitSound() {
    if (isMuted) return;
    createSound(440, 'sawtooth', 0.1);
}

// 爆炸音效
function playExplosionSound() {
    if (isMuted) return;
    const noise = audioContext.createBufferSource();
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.5, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = buffer;
    const gain = audioContext.createGain();
    noise.connect(gain);
    gain.connect(masterGainNode);
    noise.start();
    gain.gain.setValueAtTime(1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
}

// 碰撞音效
function playCollisionSound() {
    if (isMuted) return;
    createSound(110, 'sine', 0.3);
}

// 获得道具音效
function playPowerupSound() {
    if (isMuted) return;
    createSound(660, 'sine', 0.2);
    setTimeout(() => createSound(880, 'sine', 0.2), 100);
}