// 游戏常量
const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 10;
let ENEMY_SPEED = 2;
const COIN_SPEED = 3;
const POWERUP_SPEED = 2;
let ENEMY_SPAWN_INTERVAL = 1000;
const COIN_SPAWN_INTERVAL = 2000;
const POWERUP_SPAWN_INTERVAL = 5000;
const BOSS_SPAWN_SCORE = 500;
const BOSS_HEALTH = 100;
const EXPLOSION_DURATION = 30;
const SHOOT_VOLUME = 0.2; // 可以根据需要调整这个值，范围是 0 到 1

// 游戏状态
let gameState = {
    score: 0,
    level: 1,
    isGameOver: false,
    achievements: {}
};

// 游戏对象
let player;
let enemies = [];
let bullets = [];
let powerUps = [];
let coins = [];
let stars = [];
let boss = null;
let explosions = [];

// 获取Canvas和上下文
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 设置Canvas尺寸
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// 游戏类
class GameObject {
    constructor(x, y, width, height, color) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    collidesWith(other) {
        // 添加 null 检查
        if (!other) return false;
        return this.x < other.x + other.width &&
               this.x + this.width > other.x &&
               this.y < other.y + other.height &&
               this.y + this.height > other.y;
    }

    isOffScreen() {
        return this.y > CANVAS_HEIGHT || this.y < -this.height || 
               this.x > CANVAS_WIDTH || this.x < -this.width;
    }
}

class Player extends GameObject {
    constructor(x, y) {
        super(x, y, 30, 30, 'blue');
        this.health = 100;
        this.shield = 0;
        this.weaponType = 'normal';
        this.weaponLevel = 1;
        this.shootCooldown = 0;
    }

    move(dx, dy) {
        this.x = Math.max(0, Math.min(CANVAS_WIDTH - this.width, this.x + dx));
        this.y = Math.max(0, Math.min(CANVAS_HEIGHT - this.height, this.y + dy));
    }

    shoot() {
        if (this.shootCooldown > 0) return;

        let bullet;
        switch (this.weaponType) {
            case 'normal':
                bullet = bulletPool.get();
                bullet.init(this.x + this.width / 2, this.y, 'normal');
                bullets.push(bullet);
                this.shootCooldown = 10;
                break;
            case 'laser':
                bullet = bulletPool.get();
                bullet.init(this.x + this.width / 2, this.y, 'laser');
                bullets.push(bullet);
                this.shootCooldown = 5;
                break;
            case 'spread':
                for (let i = -1; i <= 1; i++) {
                    bullet = bulletPool.get();
                    bullet.init(this.x + this.width / 2, this.y, 'spread', i * 0.2);
                    bullets.push(bullet);
                }
                this.shootCooldown = 15;
                break;
            case 'homing':
                bullet = bulletPool.get();
                bullet.init(this.x + this.width / 2, this.y, 'homing');
                bullets.push(bullet);
                this.shootCooldown = 20;
                break;
        }

        // 添加发射音效
        playSound('shoot');
    }

    takeDamage(amount) {
        if (this.shield > 0) {
            this.shield -= amount;
            if (this.shield < 0) {
                this.health += this.shield;
                this.shield = 0;
            }
        } else {
            this.health -= amount;
        }
        if (this.health <= 0) {
            gameOver();
        }
    }

    draw() {
        super.draw();
        // Draw a triangle for the player
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.closePath();
        ctx.fill();
    }

    update() {
        if (this.shootCooldown > 0) this.shootCooldown--;
    }

    upgradeWeapon() {
        this.weaponLevel++;
        switch (this.weaponType) {
            case 'normal':
                if (this.weaponLevel > 3) this.weaponType = 'laser';
                break;
            case 'laser':
                if (this.weaponLevel > 6) this.weaponType = 'spread';
                break;
            case 'spread':
                if (this.weaponLevel > 9) this.weaponType = 'homing';
                break;
        }
    }
}

class Enemy extends GameObject {
    constructor(x, y, type) {
        super(x, y, 20, 20, 'red');
        this.type = type;
        this.health = 1;
        if (this.type === 'tank') {
            this.color = 'green';
            this.health = 3;
        } else if (this.type === 'plane') {
            this.color = 'orange';
            this.speed = ENEMY_SPEED * 1.5;
        }
    }

    move() {
        switch (this.type) {
            case 'normal':
                this.y += ENEMY_SPEED;
                break;
            case 'tank':
                this.y += ENEMY_SPEED * 0.5;
                break;
            case 'plane':
                this.y += ENEMY_SPEED * 1.5;
                this.x += Math.sin(this.y / 30) * 2;
                break;
        }
        
        // 随机射击
        if (Math.random() < 0.01) {
            this.shoot();
        }
    }

    shoot() {
        bullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height));
    }

    takeDamage() {
        this.health--;
        if (this.health <= 0) {
            const index = enemies.indexOf(this);
            if (index > -1) {
                enemies.splice(index, 1);
            }
            gameState.score += 10;
            if (Math.random() < 0.2) {
                coins.push(new Coin(this.x, this.y));
            }
        }
    }
}

class Bullet extends GameObject {
    constructor(x, y, type, angle = 0) {
        super(x, y, 5, 10, 'yellow');
        this.init(x, y, type, angle);
    }

    init(x, y, type, angle = 0) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.angle = angle;
        this.speed = BULLET_SPEED;

        switch (this.type) {
            case 'laser':
                this.width = 3;
                this.height = 20;
                this.color = 'cyan';
                this.speed = BULLET_SPEED * 1.5;
                break;
            case 'spread':
                this.width = 7;
                this.height = 7;
                this.color = 'orange';
                break;
            case 'homing':
                this.width = 8;
                this.height = 8;
                this.color = 'purple';
                this.speed = BULLET_SPEED * 0.8;
                break;
            default:
                this.width = 5;
                this.height = 10;
                this.color = 'yellow';
                break;
        }
    }

    move() {
        this.y -= this.speed * Math.cos(this.angle);
        this.x += this.speed * Math.sin(this.angle);

        if (this.type === 'homing') {
            const closestEnemy = this.findClosestEnemy();
            if (closestEnemy) {
                const dx = closestEnemy.x - this.x;
                const dy = closestEnemy.y - this.y;
                this.angle = Math.atan2(dx, -dy);
            }
        }
    }

    findClosestEnemy() {
        return enemies.concat(boss ? [boss] : []).reduce((closest, enemy) => {
            const distance = Math.hypot(enemy.x - this.x, enemy.y - this.y);
            return closest && closest.distance < distance ? closest : { enemy, distance };
        }, null)?.enemy;
    }
}

class Coin extends GameObject {
    constructor(x, y) {
        super(x, y, 10, 10, 'gold');
    }

    move() {
        this.y += COIN_SPEED;
    }
}

class PowerUp extends GameObject {
    constructor(x, y, type) {
        super(x, y, 15, 15, 'purple');
        this.type = type;
    }

    move() {
        this.y += POWERUP_SPEED;
    }
}

class Star {
    constructor() {
        this.x = Math.random() * CANVAS_WIDTH;
        this.y = Math.random() * CANVAS_HEIGHT;
        this.size = Math.random() * 2 + 1;
        this.speed = Math.random() * 3 + 1;
    }

    move() {
        this.y += this.speed;
        if (this.y > CANVAS_HEIGHT) {
            this.y = 0;
            this.x = Math.random() * CANVAS_WIDTH;
        }
    }

    draw() {
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

class Boss extends GameObject {
    constructor() {
        super(CANVAS_WIDTH / 2 - 50, -100, 100, 100, 'red');
        this.health = BOSS_HEALTH;
        this.maxHealth = BOSS_HEALTH;
        this.phase = 0;
        this.shootCooldown = 0;
    }

    move() {
        if (this.y < 50) {
            this.y += 1;
        } else {
            this.x += Math.sin(Date.now() / 1000) * 2;
        }
    }

    shoot() {
        if (this.shootCooldown > 0) return;

        switch (this.phase) {
            case 0:
                for (let i = -2; i <= 2; i++) {
                    bullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height, i * 0.2));
                }
                this.shootCooldown = 60;
                break;
            case 1:
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    bullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height / 2, 0, angle));
                }
                this.shootCooldown = 90;
                break;
            case 2:
                const targetAngle = Math.atan2(player.x - this.x, player.y - this.y);
                for (let i = -1; i <= 1; i++) {
                    bullets.push(new EnemyBullet(this.x + this.width / 2, this.y + this.height, 0, targetAngle + i * 0.2));
                }
                this.shootCooldown = 30;
                break;
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= this.maxHealth * 0.66 && this.phase === 0) {
            this.phase = 1;
        } else if (this.health <= this.maxHealth * 0.33 && this.phase === 1) {
            this.phase = 2;
        }

        if (this.health <= 0) {
            gameState.score += 100;
            boss = null;
            createExplosion(this.x + this.width / 2, this.y + this.height / 2, 100);
        }
    }

    draw() {
        super.draw();
        // Draw health bar
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x, this.y - 10, this.width * (this.health / this.maxHealth), 5);
    }

    update() {
        this.move();
        this.shoot();
        if (this.shootCooldown > 0) this.shootCooldown--;
    }
}

class EnemyBullet extends Bullet {
    constructor(x, y, angle = 0, speed = BULLET_SPEED / 2) {
        super(x, y, 'normal', angle);
        this.init(x, y, 'normal', angle, speed);
    }

    init(x, y, type, angle = 0, speed = BULLET_SPEED / 2) {
        super.init(x, y, type, angle);
        this.color = 'red';
        this.speed = speed;
    }

    move() {
        this.y += this.speed * Math.cos(this.angle);
        this.x += this.speed * Math.sin(this.angle);
    }
}

class ParticleSystem {
    constructor(x, y, color, count) {
        this.particles = [];
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    update() {
        this.particles = this.particles.filter(p => p.update());
    }

    draw() {
        this.particles.forEach(p => p.draw());
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 4 - 2;
        this.speedY = Math.random() * 4 - 2;
        this.life = 30;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life--;
        return this.life > 0;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

// 在文件顶部添加一个新的变量
let gameStarted = false;

// 游戏主循环
function gameLoop() {
    if (gameStarted && !gameState.isGameOver) {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
}

// 更新游戏状态
function update() {
    player.update();
    player.shoot();
    updateBullets();
    updateEnemies();
    updateCoins();
    updatePowerUps();
    updateStars();
    updateExplosions();
    if (boss) boss.update();
    checkCollisions();
    updateLevel();
    checkBossSpawn();
    checkAchievements();
}

function updateBullets() {
    bullets = bullets.filter(bullet => {
        bullet.move();
        if (bullet.isOffScreen()) {
            bulletPool.release(bullet);
            return false;
        }
        return true;
    });
}

function updateEnemies() {
    enemies.forEach((enemy, index) => {
        enemy.move();
        if (enemy.y > CANVAS_HEIGHT) {
            enemies.splice(index, 1);
        }
    });

    if (Math.random() < 0.02) {
        spawnEnemy();
    }
}

function updateCoins() {
    coins.forEach((coin, index) => {
        coin.move();
        if (coin.y > CANVAS_HEIGHT) {
            coins.splice(index, 1);
        }
    });
}

function updatePowerUps() {
    powerUps.forEach((powerUp, index) => {
        powerUp.move();
        if (powerUp.y > CANVAS_HEIGHT) {
            powerUps.splice(index, 1);
        }
    });

    if (Math.random() < 0.001) {
        spawnPowerUp();
    }
}

function updateStars() {
    stars.forEach(star => star.move());
}

function updateExplosions() {
    explosions = explosions.filter(explosion => {
        explosion.update();
        return explosion.duration > 0;
    });
}

function checkCollisions() {
    // Player-Enemy collisions
    for (let i = enemies.length - 1; i >= 0; i--) {
        if (player && player.collidesWith(enemies[i])) {
            const enemy = enemies[i];
            player.takeDamage(10);
            enemies.splice(i, 1);
            createExplosion(enemy.x, enemy.y, 20);
        }
    }

    // Bullet-Enemy collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (bullets[i] && enemies[j] && bullets[i].collidesWith(enemies[j])) {
                enemies[j].takeDamage();
                bullets.splice(i, 1);
                break;
            }
        }
    }

    // Player-Coin collisions
    for (let i = coins.length - 1; i >= 0; i--) {
        if (player && player.collidesWith(coins[i])) {
            coins.splice(i, 1);
            gameState.score += 5;
            playSound('powerup');
        }
    }

    // Player-PowerUp collisions
    for (let i = powerUps.length - 1; i >= 0; i--) {
        if (player && player.collidesWith(powerUps[i])) {
            applyPowerUp(powerUps[i].type);
            powerUps.splice(i, 1);
            playSound('powerup');
        }
    }

    // Boss collisions
    if (boss) {
        if (player && player.collidesWith(boss)) {
            player.takeDamage(20);
            createExplosion(player.x + player.width / 2, player.y + player.height / 2, 30);
        }

        for (let i = bullets.length - 1; i >= 0; i--) {
            if (bullets[i] && bullets[i].collidesWith(boss)) {
                const bullet = bullets[i];
                boss.takeDamage(1);
                bullets.splice(i, 1);
                createExplosion(bullet.x, bullet.y, 10);
            }
        }
    }

    // Enemy bullet collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        if (bullets[i] instanceof EnemyBullet && player && bullets[i].collidesWith(player)) {
            const bullet = bullets[i];
            player.takeDamage(10);
            bullets.splice(i, 1);
            createExplosion(bullet.x, bullet.y, 20);
        }
    }
}

const LEVELS = [
    { enemySpeed: 2, spawnRate: 0.02, bossHealth: 100 },
    { enemySpeed: 2.5, spawnRate: 0.03, bossHealth: 150 },
    { enemySpeed: 3, spawnRate: 0.04, bossHealth: 200 },
    // ... 更多关卡
];

function updateLevel() {
    const newLevel = Math.min(Math.floor(gameState.score / 500) + 1, LEVELS.length);
    if (newLevel > gameState.level) {
        gameState.level = newLevel;
        ENEMY_SPEED = LEVELS[newLevel - 1].enemySpeed;
        ENEMY_SPAWN_RATE = LEVELS[newLevel - 1].spawnRate;
        BOSS_HEALTH = LEVELS[newLevel - 1].bossHealth;
    }
}

function checkBossSpawn() {
    if (!boss && gameState.score >= BOSS_SPAWN_SCORE && gameState.score % BOSS_SPAWN_SCORE === 0) {
        boss = new Boss();
    }
}

function createExplosion(x, y, size) {
    explosions.push(new ParticleSystem(x, y, 'orange', 50));
    playSound('explosion');
}

// 绘制游戏画面
function draw() {
    // 清空画布
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 绘制背景
    drawBackground();

    // 绘制玩家、敌人、子弹等
    player.draw();
    enemies.forEach(enemy => enemy.draw());
    bullets.forEach(bullet => bullet.draw());
    powerUps.forEach(powerUp => powerUp.draw());
    coins.forEach(coin => coin.draw());
    if (boss) boss.draw();
    explosions.forEach(explosion => explosion.draw());

    // 更新UI
    updateUI();
}

// 绘制背景
function drawBackground() {
    ctx.fillStyle = 'rgba(0, 0, 50, 0.3)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    stars.forEach(star => star.draw());
}

function updateUI() {
    document.getElementById('scoreValue').textContent = gameState.score;
    document.getElementById('levelValue').textContent = gameState.level;
    document.getElementById('healthValue').textContent = player.health;
}

// 初始化游戏
function initGame() {
    player = new Player(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 50);
    gameState.score = 0;
    gameState.level = 1;
    gameState.isGameOver = false;
    enemies = [];
    bullets = [];
    powerUps = [];
    coins = [];
    stars = Array(100).fill().map(() => new Star());

    // 添加触摸事件监听器
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', handleTouchEnd);

    // 移除音频播放，我们在游戏开始播放
}

// 添加一个新的函数来启动游戏
function startGame() {
    gameStarted = true;
    document.getElementById('start-screen').style.display = 'none';
    sounds.bgm.play();
    gameLoop();
}

// 触摸事件处理函数
let touchStartX, touchStartY;

function handleTouchStart(event) {
    event.preventDefault();
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
}

function handleTouchMove(event) {
    event.preventDefault();
    const touchEndX = event.touches[0].clientX;
    const touchEndY = event.touches[0].clientY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    player.move(dx, dy);
    touchStartX = touchEndX;
    touchStartY = touchEndY;
}

function handleTouchEnd(event) {
    event.preventDefault();
}

// 游戏结束处理
function gameOver() {
    gameState.isGameOver = true;
    document.getElementById('game-over').classList.remove('hidden');
    document.getElementById('finalScore').textContent = gameState.score;
    sounds.bgm.pause();
    sounds.bgm.currentTime = 0;
    player = null; // 将 player 设置为 null
}

// 重启游戏
document.getElementById('restartButton').addEventListener('click', () => {
    document.getElementById('game-over').classList.add('hidden');
    initGame();
});

// 生成敌人
function spawnEnemy() {
    const types = ['normal', 'tank', 'plane'];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = Math.random() * (CANVAS_WIDTH - 20);
    enemies.push(new Enemy(x, -20, type));
}

// 生成道具
function spawnPowerUp() {
    const types = ['health', 'shield', 'weapon'];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = Math.random() * (CANVAS_WIDTH - 15);
    powerUps.push(new PowerUp(x, -15, type));
}

// 应用道具效果
function applyPowerUp(type) {
    switch (type) {
        case 'health':
            player.health = Math.min(player.health + 20, 100);
            break;
        case 'shield':
            player.shield = 50;
            break;
        case 'weapon':
            player.upgradeWeapon();
            break;
    }
}

// 添加音效系统
const sounds = {
    shoot: new Audio('270344__littlerobotsoundfactory__shoot_00.wav'),
    explosion: new Audio('621000__samsterbirdies__cannon-explosion-sound.flac'),
    powerup: new Audio('717770__1bob__level-passedpowerup.wav'),
    bgm: new Audio('03. Lightning strikes.mp3')
};

sounds.bgm.loop = true;
sounds.shoot.volume = SHOOT_VOLUME; // 设置射击音效的音量

function playSound(soundName) {
    sounds[soundName].currentTime = 0;
    sounds[soundName].play();
}

// 在文件底部添加以下代码来设置开始按钮的件监听器
document.getElementById('startButton').addEventListener('click', () => {
    initGame();
    startGame();
});

// 移除原来的 initGame() 调用
// initGame();

const ACHIEVEMENTS = {
    sharpshooter: { name: "Sharpshooter", condition: () => gameState.enemiesDestroyed >= 100 },
    survivor: { name: "Survivor", condition: () => gameState.timePlayed >= 300 },
    // ... 更多成就
};

function checkAchievements() {
    for (let key in ACHIEVEMENTS) {
        if (!gameState.achievements[key] && ACHIEVEMENTS[key].condition()) {
            gameState.achievements[key] = true;
            showAchievement(ACHIEVEMENTS[key].name);
        }
    }
}

function showAchievement(name) {
    // 显示成就获得的UI
}

function saveGame() {
    localStorage.setItem('spaceShooterHighScore', gameState.highScore);
    localStorage.setItem('spaceShooterAchievements', JSON.stringify(gameState.achievements));
}

function loadGame() {
    gameState.highScore = localStorage.getItem('spaceShooterHighScore') || 0;
    gameState.achievements = JSON.parse(localStorage.getItem('spaceShooterAchievements')) || {};
}

function addVirtualJoystick() {
    const joystick = new VirtualJoystick({
        container: document.body,
        mouseSupport: true
    });

    setInterval(() => {
        if (joystick.up()) player.move(0, -PLAYER_SPEED);
        if (joystick.down()) player.move(0, PLAYER_SPEED);
        if (joystick.left()) player.move(-PLAYER_SPEED, 0);
        if (joystick.right()) player.move(PLAYER_SPEED, 0);
    }, 1000 / 60);
}

class ObjectPool {
    constructor(objectType, initialSize) {
        this.objectType = objectType;
        this.pool = [];
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(new objectType());
        }
    }

    get() {
        if (this.pool.length > 0) {
            return this.pool.pop();
        }
        return new this.objectType();
    }

    release(object) {
        this.pool.push(object);
    }
}

// 使用对象池
const bulletPool = new ObjectPool(Bullet, 50);