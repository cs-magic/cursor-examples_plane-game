// 在文件顶部，其他全局变量声明附近添加：
let backgroundMusicNodes;
let powerUpTimer = 0;
let audioContext;
let backgroundMusicSource;
let masterGainNode;
let backgroundMusicInterval;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 450;
canvas.height = 800;
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');

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
    specialWeaponDuration: 0
};

// 敌机数组
let enemies = [];

// 子弹数组
let bullets = [];

// 按键状态
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    ' ': false  // 空格键,用于射击
};

// 星星数组（用于背景）
let stars = [];

// 创建星星背景
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

// 绘制玩家飞机
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

// 游戏循环
function gameLoop() {
    if (!gameRunning) return;
    if (isPaused) {
        requestAnimationFrame(gameLoop);
        return;
    }

    // 更新游戏时间
    gameTime += 1/60;

    // 更新难度
    gameDifficulty = 1 + (level - 1) * 0.5 + gameTime / 10;

    // 清空画布
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制星星背景
    drawStars();

    // 更新玩家位置
    if (keys.ArrowLeft && player.x > 0) player.x -= player.speed;
    if (keys.ArrowRight && player.x < canvas.width - player.width) player.x += player.speed;
    if (keys.ArrowUp && player.y > 0) player.y -= player.speed;
    if (keys.ArrowDown && player.y < canvas.height - player.height) player.y += player.speed;

    // 玩家自动射
    if (player.shootCooldown > 0) {
        player.shootCooldown -= 16; // 假设游戏以60FPS运行，每帧约16毫秒
    } else {
        fireBullet(player);
        player.shootCooldown = player.shootInterval;
    }

    // 绘制玩家飞机
    drawPlayer();

    // 更新敌机
    updateEnemies();

    // 更新特殊武器持续时间
    if (player.specialWeaponDuration > 0) {
        player.specialWeaponDuration -= 1/60; // 假设游戏以60FPS运行
        if (player.specialWeaponDuration <= 0) {
            player.currentBulletType = BULLET_TYPES.NORMAL;
        }
    }

    // 更新子弹位置
    updateBullets();

    // 绘制子弹
    drawBullets();

    // 为了调试，我们可以添加一个计数器
    let enemyBulletCount = bullets.filter(b => !b.isPlayerBullet).length;
    ctx.fillStyle = '#FFF';
    ctx.font = '14px Arial';
    ctx.fillText(`敌方子弹数: ${enemyBulletCount}`, 10, 120);

    // 碰撞检测
    bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y
            ) {
                bullets.splice(bulletIndex, 1);
                enemy.health -= bullet.damage;
                if (enemy.health <= 0) {
                    enemies.splice(enemyIndex, 1);
                    updateScore(10); // 使用 updateScore 函数
                    createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                    playSound('explosion');
                } else {
                    playSound('enemyHit');
                }
            }
        });
    });

    // 绘制爆炸效果
    drawExplosions();

    // 绘制能量护盾
    if (player.shield > 0) {
        ctx.strokeStyle = '#5AC8FA';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 2 + 10, 0, Math.PI * 2);
        ctx.stroke();
    }

    // 绘制特殊武器充能
    ctx.fillStyle = '#FF9500';
    ctx.fillRect(10, 90, player.specialWeapon * 2, 10);

    // 更新并绘制游戏信息
    ctx.fillStyle = '#FFF';
    ctx.font = '20px Arial';
    ctx.fillText(`关卡: ${level}`, 10, 30);
    ctx.fillText(`生命值: ${player.health}`, 10, 60);
    ctx.fillText(`时间: ${Math.floor(gameTime)}`, 10, 90);

    // 检查游戏是否结束
    if (gameTime >= 30) {
        if (player.health > 0) {
            victory();
        } else {
            endGame();
        }
        return;
    }

    // 生成道具
    powerUpTimer += 1/60; // 假设游戏以60FPS运行
    if (powerUpTimer >= 1) { // 每秒检查是否生成道具
        spawnPowerUp();
        powerUpTimer = 0;
    }

    // 绘制道具
    drawPowerUps();

    // 添加玩家与敌机的碰撞检测
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

    // 根据难度调敌机速度
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

// 新增跟踪导弹
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

function drawPowerUps() {
    powerUps.forEach((powerUp, index) => {
        // 确保道具的尺寸和位置是有效的
        if (powerUp.width <= 0 || powerUp.height <= 0 || isNaN(powerUp.x) || isNaN(powerUp.y)) {
            console.warn('Invalid powerUp detected:', powerUp);
            powerUps.splice(index, 1);
            return;
        }

        ctx.save();
        ctx.translate(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2);

        switch (powerUp.type) {
            case BULLET_TYPES.FIRE:
                ctx.fillStyle = '#FF4500';
                drawTriangle(powerUp);
                break;
            case BULLET_TYPES.LASER:
                ctx.strokeStyle = '#00FFFF';
                drawLine(powerUp);
                break;
            case BULLET_TYPES.SPREAD:
                ctx.fillStyle = '#FFD700';
                drawMultipleDots(powerUp);
                break;
            case BULLET_TYPES.MISSILE:
                ctx.fillStyle = '#FF6B6B';
                drawRocket(powerUp);
                break;
            case BULLET_TYPES.EMP:
                ctx.strokeStyle = '#0000FF';
                drawCircle(powerUp);
                break;
            case BULLET_TYPES.FREEZE:
                ctx.fillStyle = '#00FFFF';
                drawSnowflake(powerUp);
                break;
            case BULLET_TYPES.PIERCE:
                ctx.fillStyle = '#FF1493';
                drawArrow(powerUp);
                break;
            case BULLET_TYPES.SPLIT:
                ctx.fillStyle = '#FFA500';
                drawSplitIcon(powerUp);
                break;
            case BULLET_TYPES.TIME_WARP:
                ctx.fillStyle = '#9932CC';
                drawClock(powerUp);
                break;
            case BULLET_TYPES.BLACK_HOLE:
                drawBlackHole(powerUp);
                break;
            case BULLET_TYPES.RAINBOW:
                drawRainbow(powerUp);
                break;
            case BULLET_TYPES.QUANTUM:
                ctx.fillStyle = '#7FFF00';
                drawQuantumIcon(powerUp);
                break;
            case 'shield':
                ctx.strokeStyle = '#5AC8FA';
                drawShield(powerUp);
                break;
            case 'health':
                ctx.fillStyle = '#4CD964';
                drawHealth(powerUp);
                break;
        }

        ctx.restore();

        powerUp.y += powerUp.speed;

        // 检测与玩家的碰撞
        if (
            player.x < powerUp.x + powerUp.width &&
            player.x + player.width > powerUp.x &&
            player.y < powerUp.y + powerUp.height &&
            player.y + player.height > powerUp.y
        ) {
            if (Object.values(BULLET_TYPES).includes(powerUp.type)) {
                player.currentBulletType = powerUp.type;
                player.specialWeaponDuration = 10; // 10秒特殊武器持续时间
            } else if (powerUp.type === 'shield') {
                player.shield = 100;
            } else if (powerUp.type === 'health') {
                player.health = Math.min(player.health + 20, 100);
            }
            powerUps.splice(index, 1);
            playSound('powerUp');
        }

        // 移除超出屏幕的道具
        if (powerUp.y > canvas.height) {
            powerUps.splice(index, 1);
        }
    });
}

// 添加绘制各种道具图标的辅助函数
function drawTriangle(powerUp) {
    ctx.beginPath();
    ctx.moveTo(0, -powerUp.height / 2);
    ctx.lineTo(powerUp.width / 2, powerUp.height / 2);
    ctx.lineTo(-powerUp.width / 2, powerUp.height / 2);
    ctx.closePath();
    ctx.fill();
}

function drawLine(powerUp) {
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -powerUp.height / 2);
    ctx.lineTo(0, powerUp.height / 2);
    ctx.stroke();
}

function drawMultipleDots(powerUp) {
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(i * powerUp.width / 3, 0, powerUp.width / 6, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawRocket(powerUp) {
    ctx.beginPath();
    ctx.moveTo(0, -powerUp.height / 2);
    ctx.lineTo(powerUp.width / 4, powerUp.height / 4);
    ctx.lineTo(-powerUp.width / 4, powerUp.height / 4);
    ctx.closePath();
    ctx.fill();
}

function drawCircle(powerUp) {
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, powerUp.width / 2, 0, Math.PI * 2);
    ctx.stroke();
}

function drawSnowflake(powerUp) {
    for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.rotate(i * Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -powerUp.height / 2);
        ctx.stroke();
        ctx.restore();
    }
}

function drawArrow(powerUp) {
    ctx.beginPath();
    ctx.moveTo(0, -powerUp.height / 2);
    ctx.lineTo(powerUp.width / 4, 0);
    ctx.lineTo(0, powerUp.height / 2);
    ctx.lineTo(-powerUp.width / 4, 0);
    ctx.closePath();
    ctx.fill();
}

function drawSplitIcon(powerUp) {
    ctx.beginPath();
    ctx.arc(0, 0, powerUp.width / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-powerUp.width / 2, 0);
    ctx.lineTo(powerUp.width / 2, 0);
    ctx.stroke();
}

function drawClock(powerUp) {
    ctx.beginPath();
    ctx.arc(0, 0, powerUp.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -powerUp.height / 4);
    ctx.moveTo(0, 0);
    ctx.lineTo(powerUp.width / 4, 0);
    ctx.stroke();
}

function drawBlackHole(powerUp) {
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, powerUp.width / 2);
    gradient.addColorStop(0, 'black');
    gradient.addColorStop(1, 'purple');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, powerUp.width / 2, 0, Math.PI * 2);
    ctx.fill();
}

function drawRainbow(powerUp) {
    const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet'];
    const maxRadius = Math.min(powerUp.width, powerUp.height) / 2;
    const step = maxRadius / colors.length;

    colors.forEach((color, index) => {
        const radius = maxRadius - index * step;
        if (radius > 0) {  // 确保半径始终为正值
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI, true);
            ctx.fill();
        }
    });
}

function drawQuantumIcon(powerUp) {
    ctx.beginPath();
    ctx.arc(-powerUp.width / 4, 0, powerUp.width / 6, 0, Math.PI * 2);
    ctx.arc(powerUp.width / 4, 0, powerUp.width / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-powerUp.width / 4, 0);
    ctx.lineTo(powerUp.width / 4, 0);
    ctx.stroke();
}

function drawShield(powerUp) {
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, powerUp.width / 2, 0, Math.PI * 2);
    ctx.moveTo(-powerUp.width / 4, 0);
    ctx.lineTo(powerUp.width / 4, 0);
    ctx.stroke();
}

function drawHealth(powerUp) {
    ctx.fillRect(-powerUp.width / 2, -powerUp.height / 2, powerUp.width, powerUp.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '20px Arial';
    ctx.fillText('+', -5, 7);
}

// 添加Boss系统
let boss = null;

function spawnBoss() {
    boss = {
        x: canvas.width / 2 - 100,
        y: -200,
        width: 200,
        height: 200,
        speed: 1,
        health: 100,
        phase: 1
    };
}

function drawBoss() {
    if (!boss) return;

    ctx.fillStyle = '#FF3B30';
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);

    // 绘制Boss血条
    ctx.fillStyle = '#4CD964';
    ctx.fillRect(boss.x, boss.y - 20, boss.width * (boss.health / 100), 10);

    boss.y += boss.speed;

    // Boss攻击模式
    if (boss.y > 50) {
        boss.y = 50;
        if (Math.random() < 0.05) {
            fireBossBullet();
        }
    }
}

function fireBossBullet() {
    for (let i = 0; i < 5; i++) {
        const bullet = {
            x: boss.x + boss.width / 2,
            y: boss.y + boss.height,
            width: 10,
            height: 10,
            speed: 5,
            angle: (Math.PI / 4) * i
        };
        enemies.push(bullet);
    }
}

// 在游戏循环中添加Boss逻辑
// 在 gameLoop 函数中添加：
if (boss) {
    drawBoss();
} else if (player.score > 0 && player.score % 500 === 0) {
    spawnBoss();
}

// 修改碰撞检测以处理Boss
// 在碰撞检测部分添加：
if (boss) {
    bullets.forEach((bullet, bulletIndex) => {
        if (
            bullet.x < boss.x + boss.width &&
            bullet.x + bullet.width > boss.x &&
            bullet.y < boss.y + boss.height &&
            bullet.y + bullet.height > boss.y
        ) {
            bullets.splice(bulletIndex, 1);
            boss.health -= bullet.damage;
            if (boss.health <= 0) {
                updateScore(100); // 使用 updateScore 函数
                createExplosion(boss.x + boss.width / 2, boss.y + boss.height / 2);
                boss = null;
            }
        }
    });
}

// 在音频系统部分添加这个函数
function playSound(soundName) {
    if (sounds[soundName] && sounds[soundName].play) {
        sounds[soundName].play();
    }
}

// 添加胜利函数
function victory() {
    gameRunning = false;
    clearInterval(enemySpawnInterval);
    stopBackgroundMusic(); // 确保停止背景音乐
    playSound('victorySound'); // 如果有胜利音效的话
    document.getElementById('victoryScreen').style.display = 'flex';
    document.getElementById('victoryScore').textContent = `总得分: ${totalScore}`;
}

// 添加下一关函数
function nextLevel() {
    level++;
    startGame();
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
    settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
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

// 确保这个函数在文件中被定义
function startGame() {
    if (!audioContext) {
        initAudio();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    stopBackgroundMusic(); // 确保在开始新游戏前停止之前可能还在播放的背景音乐
    gameRunning = true;
    gameTime = 0;
    gameDifficulty = 1 + (level - 1) * 0.5;
    player.health = 100;
    player.score = 0;
    player.shield = 0;
    player.specialWeapon = 0;
    enemies = [];
    bullets = [];
    powerUps = [];
    explosions = [];
    powerUpTimer = 0;
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('endScreen').style.display = 'none';
    document.getElementById('victoryScreen').style.display = 'none';
    createStars();
    enemySpawnInterval = setInterval(() => {
        spawnEnemy();
    }, 1000 / gameDifficulty);
    playBackgroundMusic(); // 使用新的函数来播放背景音乐
    gameLoop();
}

// 确保这个事件监听器被正确添加
document.getElementById('startButton').addEventListener('click', startGame);

function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    masterGainNode = audioContext.createGain();
    masterGainNode.connect(audioContext.destination);
    masterGainNode.gain.setValueAtTime(0.5, audioContext.currentTime); // 设置主音量
}

const sounds = {
    normalShoot: { play: () => playSynthSound('normalShoot'), volume: 0.3 },
    fireShoot: { play: () => playSynthSound('fireShoot'), volume: 0.4 },
    laserShoot: { play: () => playSynthSound('laserShoot'), volume: 0.4 },
    spreadShoot: { play: () => playSynthSound('spreadShoot'), volume: 0.4 },
    missileShoot: { play: () => playSynthSound('missileShoot'), volume: 0.4 },
    empShoot: { play: () => playSynthSound('empShoot'), volume: 0.4 },
    freezeShoot: { play: () => playSynthSound('freezeShoot'), volume: 0.4 },
    pierceShoot: { play: () => playSynthSound('pierceShoot'), volume: 0.4 },
    splitShoot: { play: () => playSynthSound('splitShoot'), volume: 0.4 },
    timeWarpShoot: { play: () => playSynthSound('timeWarpShoot'), volume: 0.4 },
    blackHoleShoot: { play: () => playSynthSound('blackHoleShoot'), volume: 0.4 },
    rainbowShoot: { play: () => playSynthSound('rainbowShoot'), volume: 0.4 },
    quantumShoot: { play: () => playSynthSound('quantumShoot'), volume: 0.4 },
    explosion: { play: () => playSynthSound('explosion'), volume: 0.5 },
    enemyHit: { play: () => playSynthSound('enemyHit'), volume: 0.3 },
    powerUp: { play: () => playSynthSound('powerUp'), volume: 0.4 },
    backgroundMusic: { play: () => playBackgroundMusic(), stop: stopBackgroundMusic, volume: 0.3 }
};

function playBackgroundMusic() {
    if (!audioContext) return;

    stopBackgroundMusic(); // 确保先停止之前的景音乐

    backgroundMusicSource = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    backgroundMusicSource.type = 'sine';
    backgroundMusicSource.frequency.setValueAtTime(220, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

    backgroundMusicSource.connect(gainNode);
    gainNode.connect(masterGainNode);

    backgroundMusicSource.start();

    // 创建简单的背景音乐旋律
    backgroundMusicInterval = setInterval(() => {
        const now = audioContext.currentTime;
        backgroundMusicSource.frequency.setValueAtTime(220, now);
        backgroundMusicSource.frequency.setValueAtTime(330, now + 0.5);
        backgroundMusicSource.frequency.setValueAtTime(440, now + 1);
        backgroundMusicSource.frequency.setValueAtTime(330, now + 1.5);
    }, 2000);
}

function stopBackgroundMusic() {
    if (backgroundMusicSource) {
        backgroundMusicSource.stop();
        backgroundMusicSource = null;
    }
    if (backgroundMusicInterval) {
        clearInterval(backgroundMusicInterval);
        backgroundMusicInterval = null;
    }
}

function playSynthSound(type) {
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(masterGainNode);

    switch (type) {
        case 'normalShoot':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'fireShoot':
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
            break;
        case 'laserShoot':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(440, audioContext.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
            break;
        case 'explosion':
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(10, audioContext.currentTime + 0.5);
            gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
            break;
        case 'enemyHit':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'powerUp':
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
            break;
    }
}

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

// 辅助函数：分裂子弹
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

// 修改道具系统
let powerUps = [];

function spawnPowerUp() {
    const types = [
        BULLET_TYPES.FIRE,
        BULLET_TYPES.LASER,
        BULLET_TYPES.SPREAD,
        BULLET_TYPES.MISSILE,
        BULLET_TYPES.EMP,
        BULLET_TYPES.FREEZE,
        BULLET_TYPES.PIERCE,
        BULLET_TYPES.SPLIT,
        BULLET_TYPES.TIME_WARP,
        BULLET_TYPES.BLACK_HOLE,
        BULLET_TYPES.RAINBOW,
        BULLET_TYPES.QUANTUM,
        'shield',
        'health'
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    powerUps.push({
        x: Math.random() * (canvas.width - 30),
        y: -30,
        width: 30,
        height: 30,
        speed: 2,
        type: type
    });
}

// 添加键盘事件监听器
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

function handleKeyDown(e) {
    if (e.key in keys) {
        keys[e.key] = true;
    }
}

function handleKeyUp(e) {
    if (e.key in keys) {
        keys[e.key] = false;
    }
}

// 添加音量控制功能
function setMasterVolume(volume) {
    if (masterGainNode) {
        masterGainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    }
}

// 在游戏初始化时调用 initAudio
// 例如，在 window.onload 事件中或者在 startGame 函数的开始处
window.onload = function() {
    initAudio();
    // ... 其他初始化代码 ...
};

// 在文件顶部添加游戏设计资料
const gameDesignInfo = {
    NORMAL: "普通子弹: 基础攻击,无特殊效果",
    FIRE: "火焰子弹: 造成持续伤害",
    LASER: "激光: 瞬间击中目标,穿透敌人",
    SPREAD: "散射: 一次发射多颗子弹",
    MISSILE: "导弹: 追踪最近的敌人",
    EMP: "电磁脉冲: 短暂瘫痪敌人",
    FREEZE: "冰冻射线: 减缓敌人移动速度",
    PIERCE: "穿透子弹: 可以穿过多个敌人",
    SPLIT: "分裂子弹: 击中敌人后分裂",
    TIME_WARP: "时间扭曲: 短暂减缓敌人和子弹速度",
    BLACK_HOLE: "黑洞: 吸引周围敌人和子弹",
    RAINBOW: "彩虹波: 随机效果",
    QUANTUM: "量子纠缠: 两个子弹相互影响"
};

// 添加事件监听器
document.getElementById('helpButton').addEventListener('click', showHelp);
document.getElementById('closeHelpButton').addEventListener('click', hideHelp);

function showHelp() {
    pauseGame(); // 显示帮助时暂停游戏
    const helpContent = document.getElementById('helpContent');
    helpContent.innerHTML = '';
    for (const [type, description] of Object.entries(gameDesignInfo)) {
        helpContent.innerHTML += `<p><strong>${type}:</strong> ${description}</p>`;
    }
    document.getElementById('helpPanel').style.display = 'flex';
}

function hideHelp() {
    document.getElementById('helpPanel').style.display = 'none';
    resumeGame(); // 关闭帮助时恢复游戏
}

// 添加暂停和恢复函数
function pauseGame() {
    isPaused = true;
    document.getElementById('pauseScreen').style.display = 'flex';
}

function resumeGame() {
    isPaused = false;
    document.getElementById('pauseScreen').style.display = 'none';
}

// 在文件底部添加事件监听器
document.getElementById('pauseButton').addEventListener('click', pauseGame);
document.getElementById('resumeButton').addEventListener('click', resumeGame);

// Add this function after the updateEnemies function

function checkPlayerEnemyCollision() {
    enemies.forEach((enemy, index) => {
        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        ) {
            // Collision detected
            player.health -= 10; // Reduce player health
            enemies.splice(index, 1); // Remove the enemy
            createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            playSound('explosion');

            // Check if player is defeated
            if (player.health <= 0) {
                endGame();
            }
        }
    });
}

// Make sure the endGame function is defined
function endGame() {
    gameRunning = false;
    clearInterval(enemySpawnInterval);
    stopBackgroundMusic();
    document.getElementById('endScreen').style.display = 'flex';
    document.getElementById('finalScore').textContent = `最终得分: ${totalScore}`;
}