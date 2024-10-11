window.onerror = function(message, source, lineno, colno, error) {
    console.error("Global error:", message, "at", source, ":", lineno, ":", colno);
    console.error("Error object:", error);
};

console.log("game.js loaded");

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded");
    
    const startButton = document.getElementById('startButton');
    const settingsButton = document.getElementById('settingsButton');
    const settingsPanel = document.getElementById('settingsPanel');
    const saveSettingsButton = document.getElementById('saveSettingsButton');
    const closeSettingsButton = document.getElementById('closeSettingsButton');

    if (startButton) {
        startButton.addEventListener('click', function() {
            console.log("Start button clicked");
            startGame();
        });
    } else {
        console.error("Start button not found");
    }

    if (settingsButton) {
        settingsButton.addEventListener('click', function() {
            console.log("Settings button clicked");
            settingsPanel.style.display = 'block';
        });
    } else {
        console.error("Settings button not found");
    }

    if (saveSettingsButton) {
        saveSettingsButton.addEventListener('click', saveSettings);
    } else {
        console.error("Save settings button not found");
    }

    if (closeSettingsButton) {
        closeSettingsButton.addEventListener('click', function() {
            settingsPanel.style.display = 'none';
        });
    } else {
        console.error("Close settings button not found");
    }

    // Call addTouchEventListeners here
    addTouchEventListeners();
    // preventDefaultTouchBehavior();
});

// 在文件顶部，将这行代码：
// document.addEventListener('touchmove', function(e) {
//     e.preventDefault();
// }, { passive: false });
// 改为：
document.addEventListener('touchmove', function(e) {
    if (!e.target.closest('#settingsPanel')) {
        e.preventDefault();
    }
}, { passive: false });

// 在文件顶部，其他全局变量声明附近添加：
let backgroundMusicNodes;
let powerUpTimer = 0;
let audioContext;
let backgroundMusicSource;
let masterGainNode;
let backgroundMusicInterval;
let enemySpawnInterval;
let sounds = {};

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 450;
canvas.height = 800;
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');

// 保留这个 keys 对象，删除后面重复的声明
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    ' ': false  // 空格键,用于射击
};

document.addEventListener('keydown', (e) => {
    if (e.key in keys) {
        keys[e.key] = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key in keys) {
        keys[e.key] = false;
    }
});

// 修改子弹类型
const BULLET_TYPES = {
    NORMAL: 'normal',
    FIRE: 'fire',
    LASER: 'laser',
    SPREAD: 'spread',
    MISSILE: 'missile',
    EMP: 'emp',
    FREEZE: 'freeze',
    PIERCE: 'pierce',
    SPLIT: 'split',
    TIME_WARP: 'timeWarp',
    BLACK_HOLE: 'blackHole',
    RAINBOW: 'rainbow',
    QUANTUM: 'quantum'
};

const ENEMY_TYPES = ['normal', 'fast', 'tough', 'boss'];

// 玩家飞机
const player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: 60,
    height: 80,
    speed: 5,
    health: 100,
    score: 0,
    shield: 0,
    specialWeapon: 0,
    shootCooldown: 0,
    shootInterval: 100, // 每100毫秒发射一次子弹
    currentBulletType: BULLET_TYPES.NORMAL,
    specialWeaponDuration: 0,
    dx: 0,
    dy: 0,
};

// 敌机数组
let enemies = [];

// 子弹数组
let bullets = [];

// 星星数组（用于背景）
let stars = [];

// 创星星景
function createStars() {
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 2,
            speed: Math.random() * 3 + 1
        });
    }
}

// 绘制星星背景
function drawStars() {
    ctx.fillStyle = '#FFF';
    stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
        }
    });
}

// 绘制家飞机
function drawPlayer() {
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);

    // 主体
    ctx.fillStyle = '#4A90E2';
    ctx.beginPath();
    ctx.moveTo(0, -player.height / 2);
    ctx.lineTo(player.width / 2, player.height / 2);
    ctx.lineTo(-player.width / 2, player.height / 2);
    ctx.closePath();
    ctx.fill();

    // 机翼
    ctx.fillStyle = '#5AC8FA';
    ctx.beginPath();
    ctx.moveTo(player.width / 2, player.height / 4);
    ctx.lineTo(player.width, player.height / 2);
    ctx.lineTo(player.width / 2, player.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-player.width / 2, player.height / 4);
    ctx.lineTo(-player.width, player.height / 2);
    ctx.lineTo(-player.width / 2, player.height / 2);
    ctx.closePath();
    ctx.fill();

    // 驾驶舱
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0, 0, player.width / 6, player.height / 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// 绘制敌机
function drawEnemy(enemy) {
    ctx.save();
    ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
    ctx.rotate(Math.PI); // 旋转180度，使敌机朝下

    // 主体
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.moveTo(0, -enemy.height / 2);
    ctx.lineTo(enemy.width / 2, enemy.height / 3);
    ctx.lineTo(enemy.width / 4, enemy.height / 2);
    ctx.lineTo(-enemy.width / 4, enemy.height / 2);
    ctx.lineTo(-enemy.width / 2, enemy.height / 3);
    ctx.closePath();
    ctx.fill();

    // 机翼
    ctx.fillStyle = '#FF3B30';
    ctx.beginPath();
    ctx.moveTo(enemy.width / 2, 0);
    ctx.lineTo(enemy.width * 0.8, enemy.height / 4);
    ctx.lineTo(enemy.width / 2, enemy.height / 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-enemy.width / 2, 0);
    ctx.lineTo(-enemy.width * 0.8, enemy.height / 4);
    ctx.lineTo(-enemy.width / 2, enemy.height / 2);
    ctx.closePath();
    ctx.fill();

    // 驾驶舱
    ctx.fillStyle = '#1C1C1E';
    ctx.beginPath();
    ctx.ellipse(0, -enemy.height / 6, enemy.width / 8, enemy.height / 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 敌机引擎火焰
    ctx.fillStyle = '#FF9500';
    ctx.beginPath();
    ctx.moveTo(-enemy.width / 6, enemy.height / 2);
    ctx.lineTo(0, enemy.height * 0.7);
    ctx.lineTo(enemy.width / 6, enemy.height / 2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

// 游戏状态
let gameRunning = false;

// 添加游戏时间和难度变量
let gameTime = 0;
let gameDifficulty = 1;

let level = 1;
let totalScore = 0;
let backgroundMusic;

// 在文件顶部添加一个新的变量
let isPaused = false;

// 定义道具数组
let powerUps = [];

// 生成道具的函数
function spawnPowerUp() {
    const powerUpTypes = Object.values(BULLET_TYPES).concat(['shield', 'health']);
    const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    const powerUp = {
        x: Math.random() * (canvas.width - 30),
        y: -30,
        width: 30,
        height: 30,
        type: type,
        speed: 2
    };
    powerUps.push(powerUp);
}

// 环
function gameLoop() {
    if (!gameRunning) return;
    if (isPaused) {
        requestAnimationFrame(gameLoop);
        return;
    }

    // 新游戏时间
    gameTime += 1/60;

    // 更新难度
    gameDifficulty = getDifficultyValue(gameSettings.initialDifficulty) + (level - 1) * 0.5 + gameTime / 10;

    // 清屏
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制星星背景
    drawStars();

    // 更新玩家位置
    updatePlayerPosition();

    // 玩家自动射击
    updatePlayerShooting();

    // 绘制玩家飞机
    drawPlayer();

    // 更新敌机
    updateEnemies();

    // 更新特殊武器持续时间
    updateSpecialWeapon();

    // 更新子弹位置
    updateBullets();

    // 绘制子弹
    drawBullets();

    // 碰撞检测
    checkCollisions();

    // 绘制爆炸效果
    drawExplosions();

    // 绘制能量护盾
    drawShield();

    // 绘制特殊武器充能
    drawSpecialWeaponCharge();

    // 更新并绘制游戏信息
    updateAndDrawGameInfo();

    // 检查游戏是否结束
    if (gameTime >= gameSettings.gameDuration) {
        victory();
        return;
    }

    // 生成道具
    spawnPowerUps();

    // 绘制道具
    drawPowerUps();

    // 添加玩家敌机的碰撞检测
    checkPlayerEnemyCollision();

    // 请求下一帧动画
    requestAnimationFrame(gameLoop);
}

// 生成敌机
function spawnEnemy() {
    const enemyTypes = ['small', 'large', 'fast', 'tough'];
    const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    const enemy = {
        x: Math.random() * (canvas.width - 60),
        y: -60,
        width: 50,
        height: 50,
        speed: 2,
        health: 1,
        color: '#FF3B30',
        type: enemyType,
        lastShot: 0,
        shootInterval: 2000 + Math.random() * 2000, // 2-4秒间机
        movePattern: Math.random() < 0.3 ? 'zigzag' : 'straight' // 30%概率zigzag移动
    };

    switch (enemyType) {
        case 'small':
            break;
        case 'large':
            enemy.width = 70;
            enemy.height = 70;
            enemy.health = 2;
            enemy.color = '#FF9500';
            break;
        case 'fast':
            enemy.speed = 4;
            enemy.color = '#5AC8FA';
            break;
        case 'tough':
            enemy.health = 3;
            enemy.color = '#4A90E2';
            break;
    }

    // 根据难度调机速度
    enemy.speed *= gameDifficulty;

    enemies.push(enemy);
}

// 修改发射子弹函数
function fireBullet(shooter) {
    const bulletSpeed = shooter === player ? 20 : 5;
    const angle = shooter === player ? -Math.PI / 2 : Math.PI / 2;
    const bulletType = shooter === player ? player.currentBulletType : BULLET_TYPES.NORMAL;

    switch (bulletType) {
        case BULLET_TYPES.NORMAL:
            createBullet(shooter, bulletSpeed, angle, bulletType);
            playSound('normalShoot');
            break;
        case BULLET_TYPES.FIRE:
            createFireBullet(shooter);
            playSound('fireShoot');
            break;
        case BULLET_TYPES.LASER:
            createLaserBullet(shooter);
            playSound('laserShoot');
            break;
        case BULLET_TYPES.SPREAD:
            createSpreadBullets(shooter);
            playSound('spreadShoot');
            break;
        case BULLET_TYPES.MISSILE:
            createMissile(shooter);
            playSound('missileShoot');
            break;
        case BULLET_TYPES.EMP:
            createEMP(shooter);
            playSound('empShoot');
            break;
        case BULLET_TYPES.FREEZE:
            createFreezeBullet(shooter);
            playSound('freezeShoot');
            break;
        case BULLET_TYPES.PIERCE:
            createPierceBullet(shooter);
            playSound('pierceShoot');
            break;
        case BULLET_TYPES.SPLIT:
            createSplitBullet(shooter);
            playSound('splitShoot');
            break;
        case BULLET_TYPES.TIME_WARP:
            createTimeWarpBullet(shooter);
            playSound('timeWarpShoot');
            break;
        case BULLET_TYPES.BLACK_HOLE:
            createBlackHoleBullet(shooter);
            playSound('blackHoleShoot');
            break;
        case BULLET_TYPES.RAINBOW:
            createRainbowBullet(shooter);
            playSound('rainbowShoot');
            break;
        case BULLET_TYPES.QUANTUM:
            createQuantumBullet(shooter);
            playSound('quantumShoot');
            break;
    }
}

function createBullet(shooter, speed, angle, type) {
    const bullet = {
        x: shooter.x + shooter.width / 2,
        y: shooter === player ? shooter.y : shooter.y + shooter.height,
        width: 4,
        height: 10,
        speed: speed,
        damage: shooter === player ? 1 : 0.5,
        angle: angle,
        type: type,
        isPlayerBullet: shooter === player
    };
    bullets.push(bullet);
}

function createFireBullet(shooter) {
    const bullet = {
        x: shooter.x + shooter.width / 2,
        y: shooter.y,
        width: 10,
        height: 20,
        speed: 15,
        damage: 2,
        type: BULLET_TYPES.FIRE,
        isPlayerBullet: true,
        particles: []
    };
    bullets.push(bullet);
}

function createLaserBullet(shooter) {
    const laser = {
        x: shooter.x + shooter.width / 2,
        y: shooter.y,
        width: 4,
        height: canvas.height,
        damage: 0.5,
        type: BULLET_TYPES.LASER,
        isPlayerBullet: true,
        duration: 30,
        opacity: 1
    };
    bullets.push(laser);
}

function createSpreadBullets(shooter) {
    for (let i = -2; i <= 2; i++) {
        const bullet = {
            x: shooter.x + shooter.width / 2,
            y: shooter.y,
            width: 6,
            height: 6,
            speed: 18,
            damage: 1,
            angle: i * Math.PI / 12,
            type: BULLET_TYPES.SPREAD,
            isPlayerBullet: true
        };
        bullets.push(bullet);
    }
}

// 增跟踪导弹
function createMissile(shooter) {
    const missile = {
        x: shooter.x + shooter.width / 2,
        y: shooter.y,
        width: 10,
        height: 20,
        speed: 10,
        damage: 3,
        type: BULLET_TYPES.MISSILE,
        isPlayerBullet: true,
        target: null
    };
    bullets.push(missile);
}

// 新增电磁脉冲
function createEMP(shooter) {
    const emp = {
        x: shooter.x + shooter.width / 2,
        y: shooter.y,
        radius: 10,
        maxRadius: 200,
        damage: 1,
        type: BULLET_TYPES.EMP,
        isPlayerBullet: true,
        growthRate: 5
    };
    bullets.push(emp);
}

// 新增冰冻射线
function createFreezeBullet(shooter) {
    const freezeBullet = {
        x: shooter.x + shooter.width / 2,
        y: shooter.y,
        width: 8,
        height: 15,
        speed: 15,
        damage: 1,
        type: BULLET_TYPES.FREEZE,
        isPlayerBullet: true,
        freezeDuration: 60 // 冻结时间（帧数）
    };
    bullets.push(freezeBullet);
}

// 新增穿透子弹
function createPierceBullet(shooter) {
    const pierceBullet = {
        x: shooter.x + shooter.width / 2,
        y: shooter.y,
        width: 6,
        height: 20,
        speed: 25,
        damage: 2,
        type: BULLET_TYPES.PIERCE,
        isPlayerBullet: true,
        pierceCount: 3 // 可以穿透的敌人数量
    };
    bullets.push(pierceBullet);
}

// 新增分裂子弹
function createSplitBullet(shooter) {
    const splitBullet = {
        x: shooter.x + shooter.width / 2,
        y: shooter.y,
        width: 10,
        height: 10,
        speed: 15,
        damage: 1,
        type: BULLET_TYPES.SPLIT,
        isPlayerBullet: true,
        splitCount: 2, // 分裂次数
        childCount: 3 // 每次分裂产生的子弹数量
    };
    bullets.push(splitBullet);
}

// 新增时间扭曲子弹
function createTimeWarpBullet(shooter) {
    const timeWarpBullet = {
        x: shooter.x + shooter.width / 2,
        y: shooter.y,
        width: 12,
        height: 12,
        speed: 10,
        damage: 1,
        type: BULLET_TYPES.TIME_WARP,
        isPlayerBullet: true,
        slowFactor: 0.5, // 减速因子
        slowDuration: 120 // 减速持续时间（帧数）
    };
    bullets.push(timeWarpBullet);
}

// 新增黑洞子弹
function createBlackHoleBullet(shooter) {
    const blackHoleBullet = {
        x: shooter.x + shooter.width / 2,
        y: shooter.y,
        radius: 5,
        maxRadius: 50,
        damage: 0.1,
        type: BULLET_TYPES.BLACK_HOLE,
        isPlayerBullet: true,
        duration: 180, // 持续时间（帧数）
        pullForce: 0.5 // 吸引力
    };
    bullets.push(blackHoleBullet);
}

// 新增彩虹波
function createRainbowBullet(shooter) {
    const rainbowBullet = {
        x: shooter.x + shooter.width / 2,
        y: shooter.y,
        width: 20,
        height: 10,
        speed: 12,
        damage: 2,
        type: BULLET_TYPES.RAINBOW,
        isPlayerBullet: true,
        colorIndex: 0,
        colors: ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet']
    };
    bullets.push(rainbowBullet);
}

// 新增量子纠缠子弹
function createQuantumBullet(shooter) {
    const quantumBullet1 = {
        x: shooter.x + shooter.width / 2 - 10,
        y: shooter.y,
        width: 8,
        height: 8,
        speed: 15,
        damage: 1,
        type: BULLET_TYPES.QUANTUM,
        isPlayerBullet: true,
        paired: null
    };
    const quantumBullet2 = {
        x: shooter.x + shooter.width / 2 + 10,
        y: shooter.y,
        width: 8,
        height: 8,
        speed: 15,
        damage: 1,
        type: BULLET_TYPES.QUANTUM,
        isPlayerBullet: true,
        paired: null
    };
    quantumBullet1.paired = quantumBullet2;
    quantumBullet2.paired = quantumBullet1;
    bullets.push(quantumBullet1, quantumBullet2);
}

// 添加更新分数的函数
function updateScore(newScore) {
    totalScore += newScore;
    const scoreElement = document.getElementById('score');
    scoreElement.textContent = totalScore;
    scoreElement.style.transform = 'scale(1.2)';
    setTimeout(() => {
        scoreElement.style.transform = 'scale(1)';
    }, 300);
}

// 添加设置按钮事件监听器
document.getElementById('settingsButton').addEventListener('click', () => {
    const settingsPanel = document.getElementById('settingsPanel');
    const display = settingsPanel.style.display
    console.log('display:', display);
    settingsPanel.style.display =  'block'
    document.getElementById('startScreen').style.display = 'none';
});

// 添加下一关按钮事件监听器
document.getElementById('nextLevelButton').addEventListener('click', nextLevel);

// 修改敌机更新逻辑
function updateEnemies() {
    const now = Date.now();
    enemies.forEach((enemy, index) => {
        // 移动敌机
        if (enemy.movePattern === 'zigzag') {
            enemy.x += Math.sin(enemy.y * 0.1) * 2; // 左右摆动
        }
        enemy.y += enemy.speed;

        // 敌机射击
        if (now - enemy.lastShot > enemy.shootInterval) {
            fireEnemyBullet(enemy);
            enemy.lastShot = now;
        }

        // 移除出屏幕的敌机
        if (enemy.y > canvas.height) {
            enemies.splice(index, 1);
        }

        // 绘制机
        drawEnemy(enemy);
    });
}

// 添加敌机射击函数
function fireEnemyBullet(enemy) {
    const bullet = {
        x: enemy.x + enemy.width / 2,
        y: enemy.y + enemy.height,
        width: 4,
        height: 10,
        speed: 5,
        damage: 0.5,
        angle: Math.PI,
        isPlayerBullet: false
    };
    bullets.push(bullet);
}

// 确保这个函在文件中被定义
function startGame() {
    console.log("startGame function called");
    
    // 初始化游戏状态
    gameRunning = true;
    gameTime = 0;
    gameDifficulty = getDifficultyValue(gameSettings.initialDifficulty);

    // 重新初始化 player 对象
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    player.width = 60;
    player.height = 80;
    player.speed = 5;
    player.health = gameSettings.initialHealth;
    player.score = 0;
    player.shield = 0;
    player.specialWeapon = 0;
    player.shootCooldown = 0;
    player.shootInterval = 100;
    player.currentBulletType = BULLET_TYPES.NORMAL;
    player.specialWeaponDuration = 0;
    player.dx = 0;
    player.dy = 0;

    enemies = [];
    bullets = [];
    powerUps = [];
    explosions = [];
    powerUpTimer = 0;

    // 隐藏开始屏幕，显示游戏画布
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('endScreen').style.display = 'none';
    document.getElementById('victoryScreen').style.display = 'none';
    canvas.style.display = 'block';

    // 初始化游戏元素
    createStars();
    clearInterval(enemySpawnInterval);
    enemySpawnInterval = setInterval(spawnEnemy, 1000 / gameDifficulty);

    // 开始游戏循环
    gameLoop();
}

// 添加一个新函数来获取难度值
function getDifficultyValue(difficulty) {
    switch (difficulty) {
        case 'easy': return 1;
        case 'medium': return 1.5;
        case 'hard': return 2;
        default: return 1.5;
    }
}

// 确保这个事件监听器被正确添加
document.getElementById('startButton').addEventListener('click', startGame);

// 删除或注释掉这部分代码（如果存在的话）：
// let audioContext;
// let masterGainNode;
// let sounds = {};

// 修改 initAudio 函数
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        masterGainNode = audioContext.createGain();
        masterGainNode.connect(audioContext.destination);
        masterGainNode.gain.setValueAtTime(0.5, audioContext.currentTime); // 设置主音量
    }
}

// 播放音效函数保持不变
function playSound(type) {
    // ... (保持不变) ...
}

// 在游戏初始化时调用 initAudio
function init() {
    // ... 其他初始化代码 ...
    initAudio();
    // ... 其他初始化代码 ...
}

// 确保在用户交互后初始化音频上下文
document.addEventListener('click', function initAudioContext() {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    document.removeEventListener('click', initAudioContext);
}, { once: true });

// 确保调用 init 函数
init();

function updateBullets() {
    bullets.forEach((bullet, index) => {
        switch (bullet.type) {
            case BULLET_TYPES.NORMAL:
            case BULLET_TYPES.FIRE:
            case BULLET_TYPES.SPREAD:
            case BULLET_TYPES.FREEZE:
            case BULLET_TYPES.PIERCE:
            case BULLET_TYPES.RAINBOW:
                bullet.y -= bullet.speed;
                break;
            case BULLET_TYPES.LASER:
                bullet.duration--;
                bullet.opacity = bullet.duration / 30;
                if (bullet.duration <= 0) {
                    bullets.splice(index, 1);
                }
                break;
            case BULLET_TYPES.MISSILE:
                if (!bullet.target || bullet.target.health <= 0) {
                    bullet.target = findNearestEnemy(bullet);
                }
                if (bullet.target) {
                    const dx = bullet.target.x - bullet.x;
                    const dy = bullet.target.y - bullet.y;
                    const angle = Math.atan2(dy, dx);
                    bullet.x += Math.cos(angle) * bullet.speed;
                    bullet.y += Math.sin(angle) * bullet.speed;
                } else {
                    bullet.y -= bullet.speed;
                }
                break;
            case BULLET_TYPES.EMP:
                bullet.radius += bullet.growthRate;
                if (bullet.radius >= bullet.maxRadius) {
                    bullets.splice(index, 1);
                }
                break;
            case BULLET_TYPES.SPLIT:
                bullet.y -= bullet.speed;
                if (bullet.y < canvas.height * 0.7 && bullet.splitCount > 0) {
                    splitBullet(bullet);
                    bullets.splice(index, 1);
                }
                break;
            case BULLET_TYPES.TIME_WARP:
                bullet.y -= bullet.speed;
                break;
            case BULLET_TYPES.BLACK_HOLE:
                bullet.radius = Math.min(bullet.radius + 0.5, bullet.maxRadius);
                bullet.duration--;
                if (bullet.duration <= 0) {
                    bullets.splice(index, 1);
                }
                break;
            case BULLET_TYPES.QUANTUM:
                bullet.y -= bullet.speed;
                if (bullet.paired && Math.random() < 0.05) {
                    const temp = { x: bullet.x, y: bullet.y };
                    bullet.x = bullet.paired.x;
                    bullet.y = bullet.paired.y;
                    bullet.paired.x = temp.x;
                    bullet.paired.y = temp.y;
                }
                break;
        }

        // 移除超出屏幕的子弹
        if (bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(index, 1);
        }
    });
}

// 辅助函数：寻找最近的敌人（用于跟踪导弹）
function findNearestEnemy(bullet) {
    let nearestEnemy = null;
    let minDistance = Infinity;
    enemies.forEach(enemy => {
        const dx = enemy.x - bullet.x;
        const dy = enemy.y - bullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < minDistance) {
            minDistance = distance;
            nearestEnemy = enemy;
        }
    });
    return nearestEnemy;
}

// 辅助函数：裂子弹
function splitBullet(bullet) {
    for (let i = 0; i < bullet.childCount; i++) {
        const angle = -Math.PI / 2 + (Math.PI / (bullet.childCount - 1)) * i;
        const newBullet = {
            x: bullet.x,
            y: bullet.y,
            width: bullet.width * 0.8,
            height: bullet.height * 0.8,
            speed: bullet.speed * 0.9,
            damage: bullet.damage * 0.8,
            type: BULLET_TYPES.SPLIT,
            isPlayerBullet: true,
            splitCount: bullet.splitCount - 1,
            childCount: bullet.childCount
        };
        newBullet.x += Math.cos(angle) * 20;
        newBullet.y += Math.sin(angle) * 20;
        bullets.push(newBullet);
    }
}

function drawBullets() {
    bullets.forEach((bullet) => {
        switch (bullet.type) {
            case BULLET_TYPES.NORMAL:
                ctx.fillStyle = bullet.isPlayerBullet ? '#5AC8FA' : '#FF3B30';
                ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
                break;
            case BULLET_TYPES.FIRE:
                drawFireBullet(bullet);
                break;
            case BULLET_TYPES.LASER:
                ctx.strokeStyle = `rgba(0, 255, 255, ${bullet.opacity})`;
                ctx.lineWidth = bullet.width;
                ctx.beginPath();
                ctx.moveTo(bullet.x, bullet.y);
                ctx.lineTo(bullet.x, 0);
                ctx.stroke();
                break;
            case BULLET_TYPES.SPREAD:
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(bullet.x, bullet.y, bullet.width / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case BULLET_TYPES.MISSILE:
                ctx.fillStyle = '#FF6B6B';
                ctx.beginPath();
                ctx.moveTo(bullet.x, bullet.y);
                ctx.lineTo(bullet.x - bullet.width / 2, bullet.y + bullet.height);
                ctx.lineTo(bullet.x + bullet.width / 2, bullet.y + bullet.height);
                ctx.closePath();
                ctx.fill();
                break;
            case BULLET_TYPES.EMP:
                ctx.strokeStyle = `rgba(0, 191, 255, ${1 - bullet.radius / bullet.maxRadius})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case BULLET_TYPES.FREEZE:
                ctx.fillStyle = '#00FFFF';
                ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
                break;
            case BULLET_TYPES.PIERCE:
                ctx.fillStyle = '#FF1493';
                ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
                break;
            case BULLET_TYPES.SPLIT:
                ctx.fillStyle = '#FFA500';
                ctx.beginPath();
                ctx.arc(bullet.x, bullet.y, bullet.width / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case BULLET_TYPES.TIME_WARP:
                ctx.fillStyle = '#9932CC';
                ctx.beginPath();
                ctx.arc(bullet.x, bullet.y, bullet.width / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case BULLET_TYPES.BLACK_HOLE:
                const gradient = ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, bullet.radius);
                gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
                gradient.addColorStop(1, 'rgba(75, 0, 130, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
                ctx.fill();
                break;
            case BULLET_TYPES.RAINBOW:
                ctx.fillStyle = bullet.colors[Math.floor(bullet.colorIndex)];
                ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
                bullet.colorIndex = (bullet.colorIndex + 0.2) % bullet.colors.length;
                break;
            case BULLET_TYPES.QUANTUM:
                ctx.fillStyle = '#7FFF00';
                ctx.beginPath();
                ctx.arc(bullet.x, bullet.y, bullet.width / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
    });
}

function drawFireBullet(bullet) {
    const gradient = ctx.createLinearGradient(bullet.x, bullet.y, bullet.x, bullet.y + bullet.height);
    gradient.addColorStop(0, 'yellow');
    gradient.addColorStop(0.5, 'orange');
    gradient.addColorStop(1, 'red');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y);
    ctx.lineTo(bullet.x + bullet.width, bullet.y);
    ctx.lineTo(bullet.x + bullet.width / 2, bullet.y + bullet.height);
    ctx.closePath();
    ctx.fill();

    // 绘制火焰粒子
    bullet.particles.forEach(particle => {
        ctx.fillStyle = `rgba(255, ${Math.floor(Math.random() * 200) + 55}, 0, ${particle.life / 20})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

// 爆炸效果
let explosions = [];

function createExplosion(x, y) {
    explosions.push({ x, y, radius: 1, maxRadius: 30, alpha: 1 });
}

function drawExplosions() {
    explosions.forEach((explosion, index) => {
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 100, 0, ${explosion.alpha})`;
        ctx.fill();

        explosion.radius += 1;
        explosion.alpha -= 0.02;

        if (explosion.alpha <= 0 || explosion.radius >= explosion.maxRadius) {
            explosions.splice(index, 1);
        }
    });
}

// 修改 gameSettings 对象
let gameSettings = {
    gameDuration: 60,
    initialHealth: 100,
    initialDifficulty: 'medium',
    bulletTypes: ['normal'],
    enemyTypes: ['normal']
};

// 修改 loadCurrentSettings 函数
function loadCurrentSettings() {
    const gameDurationElement = document.getElementById('gameDuration');
    const initialHealthElement = document.getElementById('initialHealth');
    const initialDifficultyElement = document.getElementById('initialDifficulty');

    if (gameDurationElement) {
        gameDurationElement.value = gameSettings.gameDuration;
    } else {
        console.error('Element with id "gameDuration" not found');
    }

    if (initialHealthElement) {
        initialHealthElement.value = gameSettings.initialHealth;
    } else {
        console.error('Element with id "initialHealth" not found');
    }

    if (initialDifficultyElement) {
        initialDifficultyElement.value = gameSettings.initialDifficulty;
    } else {
        console.error('Element with id "initialDifficulty" not found');
    }

    // 动态创建子弹类型复选框
    const bulletTypeCheckboxes = document.getElementById('bulletTypeCheckboxes');
    if (bulletTypeCheckboxes) {
        bulletTypeCheckboxes.innerHTML = '';
        Object.values(BULLET_TYPES).forEach(type => {
            const checkboxContainer = document.createElement('div');
            checkboxContainer.className = 'checkbox-container';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `bullet-${type}`;
            checkbox.name = 'bulletType';
            checkbox.value = type;
            checkbox.checked = gameSettings.bulletTypes.includes(type);
            
            const label = document.createElement('label');
            label.htmlFor = `bullet-${type}`;
            label.textContent = type;
            
            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(label);
            bulletTypeCheckboxes.appendChild(checkboxContainer);
        });
    } else {
        console.error('Element with id "bulletTypeCheckboxes" not found');
    }
    
    // 动态创建敌人类型复选框
    const enemyTypeCheckboxes = document.getElementById('enemyTypeCheckboxes');
    if (enemyTypeCheckboxes) {
        enemyTypeCheckboxes.innerHTML = '';
        ENEMY_TYPES.forEach(type => {
            const checkboxContainer = document.createElement('div');
            checkboxContainer.className = 'checkbox-container';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `enemy-${type}`;
            checkbox.name = 'enemyType';
            checkbox.value = type;
            checkbox.checked = gameSettings.enemyTypes.includes(type);
            
            const label = document.createElement('label');
            label.htmlFor = `enemy-${type}`;
            label.textContent = type;
            
            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(label);
            enemyTypeCheckboxes.appendChild(checkboxContainer);
        });
    } else {
        console.error('Element with id "enemyTypeCheckboxes" not found');
    }

    // 为复选框添加触摸事件监听器
    document.querySelectorAll('.checkbox-container').forEach(container => {
        container.addEventListener('touchstart', handleCheckboxTouch);
    });

    // 启用移动设备输入
    enableMobileInputs();
}

// 添加这个函数来处理复选框的触摸
function handleCheckboxTouch(e) {
    e.preventDefault();
    const checkbox = this.querySelector('input[type="checkbox"]');
    checkbox.checked = !checkbox.checked;
}

// 确保这个函数被定义
function handleMobileSelect(selectElement) {
    if (isTouchDevice) {
        selectElement.addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // 创建并触发一个点击事件
            var event = new MouseEvent('mousedown', {
                view: window,
                bubbles: true,
                cancelable: true
            });
            this.dispatchEvent(event);
            
            // 如果上面的方法不起作用，尝试直接打开选择菜单
            this.focus();
            this.click();
        });
    }
}

// 修改 enableMobileInputs 函数
function enableMobileInputs() {
    const settingsPanel = document.getElementById('settingsPanel');
    
    // 允许设置面板自由滚动
    settingsPanel.style.overflowY = 'auto';
    settingsPanel.style.webkitOverflowScrolling = 'touch';
    
    // 防止设置面板内的滚动传播到游戏画布
    settingsPanel.addEventListener('touchmove', function(e) {
        e.stopPropagation();
    }, { passive: true });

    const inputs = document.querySelectorAll('input[type="number"], select');
    inputs.forEach(input => {
        input.addEventListener('touchstart', function(e) {
            e.stopPropagation();
        });
        input.addEventListener('touchend', function(e) {
            e.stopPropagation();
            this.focus();
        });
    });
}

// 删除或注释掉这行代码（如果存在的话）
// settingsPanel.removeEventListener('touchmove', handleSettingsPanelScroll);

// 修改 document 的 touchmove 事件监听器
document.addEventListener('touchmove', function(e) {
    if (!e.target.closest('#settingsPanel')) {
        e.preventDefault();
    }
}, { passive: false });

// 修改 DOMContentLoaded 事件监听器
document.addEventListener('DOMContentLoaded', function() {
    loadSavedSettings();
    loadCurrentSettings(); // 确保这个函数被调用
    
    const startButton = document.getElementById('startButton');
    const settingsButton = document.getElementById('settingsButton');
    const settingsPanel = document.getElementById('settingsPanel');
    const saveSettingsButton = document.getElementById('saveSettingsButton');
    const closeSettingsButton = document.getElementById('closeSettingsButton');

    addTouchEvent(startButton, startGame);
    addTouchEvent(settingsButton, () => {
        console.log("Settings button touched");
        settingsPanel.style.display = 'block';
        settingsPanel.scrollTop = 0; // 重置滚动位置
        enableMobileInputs();
    });
    addTouchEvent(saveSettingsButton, () => {
        saveSettings();
        settingsPanel.style.display = 'none';
    });
    addTouchEvent(closeSettingsButton, () => {
        settingsPanel.style.display = 'none';
    });

    // 启用移动设备输入
    enableMobileInputs();

    // 确保在设置面板打开时重新应用移动设备的选择处理
    settingsButton.addEventListener('click', () => {
        setTimeout(() => {
            const difficultySelect = document.getElementById('initialDifficulty');
            handleMobileSelect(difficultySelect);
        }, 0);
    });

    // ... 其他初始化代码 ...
});

// 修改 saveSettings 函数以使用触摸友好的选择器
function saveSettings() {
    gameSettings.gameDuration = parseInt(document.getElementById('gameDuration').value);
    gameSettings.initialHealth = parseInt(document.getElementById('initialHealth').value);
    gameSettings.initialDifficulty = document.getElementById('initialDifficulty').value;
    
    gameSettings.bulletTypes = Array.from(document.querySelectorAll('#bulletTypeCheckboxes input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);
    
    gameSettings.enemyTypes = Array.from(document.querySelectorAll('#enemyTypeCheckboxes input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);
    
    console.log('Settings saved:', gameSettings);
    localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
}

// 在游戏初始化时加载保存的设置
function loadSavedSettings() {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
        gameSettings = JSON.parse(savedSettings);
    }
}

// 修改 initializeGame 函数以使用新的设置
function initializeGame() {
    player.health = gameSettings.initialHealth;
    gameTime = 0;
    gameDifficulty = gameSettings.initialDifficulty === 'easy' ? 1 : 
                     gameSettings.initialDifficulty === 'medium' ? 1.5 : 2;
    
    // 初始化可用的子弹类型
    availableBulletTypes = gameSettings.bulletTypes;
    
    // 初始化敌人类型
    availableEnemyTypes = gameSettings.enemyTypes;
    
    // 其他游戏初始化逻辑...
}

// 添加玩家与敌机的碰撞检测函数
function checkPlayerEnemyCollision() {
    enemies.forEach((enemy, index) => {
        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        ) {
            // 玩家与敌机相撞
            player.health -= 10; // 玩家损生命值
            enemies.splice(index, 1); // 移除敌机
            createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            playSound('explosion');

            if (player.health <= 0) {
                endGame();
            }
        }
    });
}

function endGame() {
    gameRunning = false;
    clearInterval(enemySpawnInterval);
    stopBackgroundMusic();
    document.getElementById('endScreen').style.display = 'flex';
    document.getElementById('finalScore').textContent = `最终得分: ${totalScore}`;
}

// 在文件顶部添加以下变量
let joystick = null;
let joystickContainer = null;
let chargeButton = null;
let specialButton = null;
let isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// 在 document.addEventListener('DOMContentLoaded', function() { ... }) 内添加以下代码
if (isTouchDevice) {
    joystickContainer = document.getElementById('joystickContainer');
    joystick = document.getElementById('joystick');
    chargeButton = document.getElementById('chargeButton');
    specialButton = document.getElementById('specialButton');

    initJoystick();
    initActionButtons();
}

// 添加以下函数
function initJoystick() {
    let joystickActive = false;
    let joystickOrigin = { x: 0, y: 0 };

    joystickContainer.addEventListener('touchstart', (e) => {
        e.preventDefault();
        joystickActive = true;
        updateJoystickPosition(e.touches[0]);
    });

    document.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (joystickActive) {
            updateJoystickPosition(e.touches[0]);
        }
    }, { passive: false });

    document.addEventListener('touchend', (e) => {
        e.preventDefault();
        joystickActive = false;
        joystick.style.transform = 'translate(-50%, -50%)';
        player.dx = 0;
        player.dy = 0;
    });

    function updateJoystickPosition(touch) {
        const containerRect = joystickContainer.getBoundingClientRect();
        const maxDistance = containerRect.width / 2;

        let dx = touch.clientX - (containerRect.left + containerRect.width / 2);
        let dy = touch.clientY - (containerRect.top + containerRect.height / 2);

        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > maxDistance) {
            dx *= maxDistance / distance;
            dy *= maxDistance / distance;
        }

        joystick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        player.dx = dx / maxDistance * player.speed;
        player.dy = dy / maxDistance * player.speed;
    }
}

function initActionButtons() {
    let isCharging = false;
    let chargeLevel = 0;

    chargeButton.addEventListener('touchstart', () => {
        isCharging = true;
    });

    chargeButton.addEventListener('touchend', () => {
        isCharging = false;
        if (chargeLevel > 0) {
            fireChargedShot(chargeLevel);
        }
        chargeLevel = 0;
    });

    specialButton.addEventListener('touchstart', () => {
        useSpecialAbility();
    });

    function updateCharge() {
        if (isCharging && chargeLevel < 100) {
            chargeLevel++;
            chargeButton.textContent = `蓄力 ${chargeLevel}%`;
        } else if (!isCharging && chargeLevel > 0) {
            chargeButton.textContent = '蓄力';
        }
    }

    setInterval(updateCharge, 50);
}

function fireChargedShot(level) {
    // 实现蓄力射击逻辑
    console.log(`发射蓄力等级 ${level} 的子弹`);
}

function useSpecialAbility() {
    // 实现特殊能力逻辑
    console.log('使用特殊能力');
}

// Add this function definition near the top of the file, after the initial variable declarations

function addTouchEventListeners() {
    const startButton = document.getElementById('startButton');
    const settingsButton = document.getElementById('settingsButton');
    const settingsPanel = document.getElementById('settingsPanel');
    const saveSettingsButton = document.getElementById('saveSettingsButton');
    const closeSettingsButton = document.getElementById('closeSettingsButton');
    const restartButton = document.getElementById('restartButton');
    const nextLevelButton = document.getElementById('nextLevelButton');
    const resumeButton = document.getElementById('resumeButton');
    const pauseButton = document.getElementById('pauseButton');
    const helpButton = document.getElementById('helpButton');
    const closeHelpButton = document.getElementById('closeHelpButton');

    addTouchEvent(startButton, startGame);
    addTouchEvent(settingsButton, () => {
        console.log("Settings button touched");
        settingsPanel.style.display = 'block';
    });
    addTouchEvent(saveSettingsButton, saveSettings);
    addTouchEvent(closeSettingsButton, () => {
        settingsPanel.style.display = 'none';
    });
    addTouchEvent(restartButton, startGame);
    addTouchEvent(nextLevelButton, nextLevel);
    addTouchEvent(resumeButton, resumeGame);
    addTouchEvent(pauseButton, pauseGame);
    addTouchEvent(helpButton, showHelp);
    addTouchEvent(closeHelpButton, closeHelp);
}

function addTouchEvent(element, callback) {
    if (element) {
        element.addEventListener('touchend', (e) => {
            e.preventDefault();
            callback();
        });
    } else {
        console.error(`Element not found for touch event`);
    }
}

// Also, make sure these functions are defined if they're not already in your code:

function resumeGame() {
    isPaused = false;
    document.getElementById('pauseScreen').style.display = 'none';
    gameLoop();
}

function pauseGame() {
    isPaused = true;
    document.getElementById('pauseScreen').style.display = 'flex';
}

function showHelp() {
    document.getElementById('helpPanel').style.display = 'flex';
}

function closeHelp() {
    document.getElementById('helpPanel').style.display = 'none';
}

function updatePlayerPosition() {
    if (isTouchDevice) {
        player.x += player.dx;
        player.y += player.dy;
    } else {
        if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
        if (keys.ArrowRight && player.x < canvas.width - player.width) player.x += player.speed;
        if (keys.ArrowUp && player.y > 0) player.y -= player.speed;
        if (keys.ArrowDown && player.y < canvas.height - player.height) player.y += player.speed;
    }

    // 确保玩家不会移出屏幕
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
}

function updatePlayerShooting() {
    if (player.shootCooldown > 0) {
        player.shootCooldown -= 16; // 假设游戏以60FPS运行，每帧约16毫秒
    } else {
        fireBullet(player);
        player.shootCooldown = player.shootInterval;
    }
}

function fireBullet(shooter) {
    const bulletSpeed = shooter === player ? 20 : 5;
    const angle = shooter === player ? -Math.PI / 2 : Math.PI / 2;
    const bulletType = shooter === player ? player.currentBulletType : BULLET_TYPES.NORMAL;

    switch (bulletType) {
        case BULLET_TYPES.NORMAL:
            createBullet(shooter, bulletSpeed, angle, bulletType);
            playSound('normalShoot');
            break;
        case BULLET_TYPES.FIRE:
            createFireBullet(shooter);
            playSound('fireShoot');
            break;
        case BULLET_TYPES.LASER:
            createLaserBullet(shooter);
            playSound('laserShoot');
            break;
        // 添加其他子弹类型的处理...
    }
}

function createBullet(shooter, speed, angle, type) {
    const bullet = {
        x: shooter.x + shooter.width / 2,
        y: shooter === player ? shooter.y : shooter.y + shooter.height,
        width: 4,
        height: 10,
        speed: speed,
        damage: shooter === player ? 1 : 0.5,
        angle: angle,
        type: type,
        isPlayerBullet: shooter === player
    };
    bullets.push(bullet);
}

// 添加其子弹创建函数，如 createFireBullet, createLaserBullet 等...

function updateSpecialWeapon() {
    if (player.specialWeaponDuration > 0) {
        player.specialWeaponDuration -= 1/60; // 假设游戏以60FPS运行
        if (player.specialWeaponDuration <= 0) {
            player.currentBulletType = BULLET_TYPES.NORMAL;
        }
    }
}

function checkCollisions() {
    // 检查玩家子弹与敌人的碰撞
    bullets.forEach((bullet, bulletIndex) => {
        if (bullet.isPlayerBullet) {
            enemies.forEach((enemy, enemyIndex) => {
                if (
                    bullet.x < enemy.x + enemy.width &&
                    bullet.x + bullet.width > enemy.x &&
                    bullet.y < enemy.y + enemy.height &&
                    bullet.y + bullet.height > enemy.y
                ) {
                    // 子弹击中敌人
                    enemy.health -= bullet.damage;
                    bullets.splice(bulletIndex, 1);
                    if (enemy.health <= 0) {
                        enemies.splice(enemyIndex, 1);
                        player.score += 10;
                        createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                        playSound('explosion');
                    } else {
                        playSound('enemyHit');
                    }
                }
            });
        } else {
            // 检查敌人子弹与玩家的碰撞
            if (
                bullet.x < player.x + player.width &&
                bullet.x + bullet.width > player.x &&
                bullet.y < player.y + player.height &&
                bullet.y + bullet.height > player.y
            ) {
                // 敌人子弹击中玩家
                player.health -= bullet.damage;
                bullets.splice(bulletIndex, 1);
                if (player.health <= 0) {
                    endGame();
                } else {
                    playSound('playerHit');
                }
            }
        }
    });

    // 检查玩家与道具的碰撞
    powerUps.forEach((powerUp, index) => {
        if (
            player.x < powerUp.x + powerUp.width &&
            player.x + player.width > powerUp.x &&
            player.y < powerUp.y + powerUp.height &&
            player.y + player.height > powerUp.y
        ) {
            // 玩家碰到道具
            applyPowerUp(powerUp);
            powerUps.splice(index, 1);
            playSound('powerUp');
        }
    });
}

function createExplosion(x, y) {
    explosions.push({
        x: x,
        y: y,
        radius: 1,
        maxRadius: 30,
        opacity: 1
    });
}

function applyPowerUp(powerUp) {
    switch (powerUp.type) {
        case 'health':
            player.health = Math.min(player.health + 20, 100);
            break;
        case 'shield':
            player.shield = 100;
            break;
        default:
            player.currentBulletType = powerUp.type;
            player.specialWeaponDuration = 10; // 10秒特殊器持续时间
            break;
    }
}

function drawShield() {
    if (player && player.shield > 0) {
        ctx.strokeStyle = '#5AC8FA';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 2 + 10, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function nextLevel() {
    level++;
    gameTime = 0;
    gameDifficulty = getDifficultyValue(gameSettings.initialDifficulty) + (level - 1) * 0.5;
    
    // 增加玩家生命值作为奖励，但不超过最大值
    player.health = Math.min(player.health + 20, 100);
    
    // 清除现有的敌人和子弹
    enemies = [];
    bullets = [];
    
    // 重置玩家位置
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - player.height - 20;
    
    // 隐藏胜利屏幕
    document.getElementById('victoryScreen').style.display = 'none';
    
    // 更新难度相关的游戏参数
    clearInterval(enemySpawnInterval);
    enemySpawnInterval = setInterval(spawnEnemy, 1000 / gameDifficulty);
    
    // 显示新关卡信息
    showLevelInfo();
    
    // 继续游戏环
    gameRunning = true;
    gameLoop();
}

function showLevelInfo() {
    const levelInfo = document.createElement('div');
    levelInfo.textContent = `第 ${level} 关`;
    levelInfo.style.position = 'absolute';
    levelInfo.style.top = '50%';
    levelInfo.style.left = '50%';
    levelInfo.style.transform = 'translate(-50%, -50%)';
    levelInfo.style.fontSize = '48px';
    levelInfo.style.color = '#FFFFFF';
    levelInfo.style.textShadow = '2px 2px 4px #000000';
    document.body.appendChild(levelInfo);
    
    setTimeout(() => {
        document.body.removeChild(levelInfo);
    }, 2000);
}

// 确保调用 init 函数
init();

function drawSpecialWeaponCharge() {
    if (player.specialWeapon > 0) {
        const chargeWidth = 100; // 充能条的宽度
        const chargeHeight = 10; // 充能条的高度
        const chargeX = 10; // 充能条的X坐标
        const chargeY = 100; // 充能条的Y坐标

        // 绘制充能条背景
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(chargeX, chargeY, chargeWidth, chargeHeight);

        // 绘制当前充能量
        const currentCharge = (player.specialWeapon / 100) * chargeWidth; // 假设最大充能为100
        ctx.fillStyle = '#FF9500';
        ctx.fillRect(chargeX, chargeY, currentCharge, chargeHeight);

        // 绘制充能条边框
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(chargeX, chargeY, chargeWidth, chargeHeight);

        // 绘制充能文字
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px Arial';
        ctx.fillText('特殊武器', chargeX, chargeY - 5);
    }
}

function updateAndDrawGameInfo() {
    // 更新分数显示
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
        scoreElement.textContent = player.score;
    }

    // 在画布上绘制游戏信息
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // 绘制关卡信息
    ctx.fillText(`关卡: ${level}`, 10, 10);

    // 绘制生命值
    ctx.fillText(`生命值: ${player.health}`, 10, 40);

    // 绘制游戏时间
    const minutes = Math.floor(gameTime / 60);
    const seconds = Math.floor(gameTime % 60);
    ctx.fillText(`时间: ${minutes}:${seconds.toString().padStart(2, '0')}`, 10, 70);

    // 如果有其他需要显示的游戏信息，可以在这里添加
}