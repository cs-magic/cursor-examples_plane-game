/// <reference lib="dom" />
var SpaceShooterGame;
(function (SpaceShooterGame) {
    var powerUpTypes = [
        // 'health', 'shield', 'speedBoost', 
        // 'spreadShot', 
        // 'laserShot', 
        'flamethrower',
        // 'homingMissile',
    ];
    // 全局变量声明
    var canvas;
    var ctx;
    var player;
    var enemies = [];
    var bullets = [];
    var powerUps = [];
    var explosions = [];
    var gameRunning = false;
    var gameTime = 0;
    var gameDifficulty = 1;
    var level = 1;
    var totalScore = 0;
    var isPaused = false;
    var powerUpTimer = 0;
    var enemySpawnInterval;
    var backgroundMusicInterval;
    var currentLevel;
    var levels = [
        { number: 1, duration: 10, enemySpawnRate: 1, bossSpawnTime: 50, requiredScore: 100 },
        { number: 2, duration: 10, enemySpawnRate: 1.5, bossSpawnTime: 75, requiredScore: 250 },
        { number: 3, duration: 10, enemySpawnRate: 2, bossSpawnTime: 100, requiredScore: 500 },
        // 添加更多关卡...
    ];
    var isBossSpawned = false;
    // 游戏设置
    var gameSettings = {
        gameDuration: 60,
        initialHealth: 100,
        initialDifficulty: 'medium',
        bulletTypes: ['normal'],
        enemyTypes: ['normal'],
        difficulty: 'medium',
        soundVolume: 0.5,
        musicVolume: 0.5
    };
    // 常量
    var BULLET_TYPES = {
        NORMAL: 'normal',
        SPREAD: 'spread',
        LASER: 'laser',
        HOMING: 'homing',
        FLAME: 'flame'
    };
    var ENEMY_TYPES = ['normal', 'fast', 'tough', 'boss'];
    // 频相关
    var audioContext;
    var masterGainNode;
    var backgroundMusicSource = null;
    var soundEffects = {};
    // 触摸控制相关
    var isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    var joystickActive = false;
    var joystickPosition = { x: 0, y: 0 };
    // 添加键盘制
    SpaceShooterGame.keys = {
        ArrowLeft: false,
        ArrowRight: false,
        ArrowUp: false,
        ArrowDown: false,
        ' ': false // 空格键,用于射击
    };
    // 添加星星数组
    var stars = [];
    // 在全局变量声明部分添加
    var particles = [];
    // 在全局变量声明部分添加
    var achievements = [
        {
            id: 'firstKill',
            name: '初次击杀',
            description: '击败你的第一个敌人',
            isUnlocked: false,
            progress: 0,
            maxProgress: 1
        },
        {
            id: 'sharpshooter',
            name: '神射手',
            description: '连续击中10个敌人',
            isUnlocked: false,
            progress: 0,
            maxProgress: 10
        },
        {
            id: 'survivor',
            name: '生存专家',
            description: '在一局游戏中存活5分钟',
            isUnlocked: false,
            progress: 0,
            maxProgress: 300
        }
    ];
    // 在全局变量明部分添加
    var gameStats = {
        enemiesDestroyed: 0,
        bulletsFired: 0,
        powerUpsCollected: 0,
        timePlayedSeconds: 0
    };
    // 在namespace的开头添加以下变量声明
    var joystickElement;
    var joystickContainerElement;
    var chargeButtonElement;
    var specialButtonElement;
    // 在全局变量声明部分添加
    var bgmAudio;
    // 游戏初始化函数
    function initGame() {
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');
        // 设置画布大小
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        lastEnemySpawnTime = 0;
        // 初始化玩家
        player = {
            x: canvas.width / 2,
            y: canvas.height - 100,
            width: 60,
            height: 80,
            speed: 5,
            health: 100,
            maxHealth: 100,
            score: 0,
            shield: 0,
            specialWeapon: 0,
            shootCooldown: 0,
            shootInterval: 100,
            currentBulletType: BULLET_TYPES.NORMAL,
            specialWeaponDuration: 0,
            dx: 0,
            dy: 0,
            invincible: false,
            activeBulletTypes: new Set(['normal']),
            bulletDurations: {},
            laserCooldown: 0,
            lastHomingMissileTime: 0,
            lastFlameTime: 0,
        };
        // 初始化移动控制元素
        joystickElement = document.getElementById('joystick');
        joystickContainerElement = document.getElementById('joystickContainer');
        chargeButtonElement = document.getElementById('chargeButton');
        specialButtonElement = document.getElementById('specialButton');
        // 设置触摸事件监听器
        setupTouchListeners();
        // 隐藏所有屏幕，只示开始屏幕
        document.getElementById('startScreen').style.display = 'flex';
        document.getElementById('endScreen').style.display = 'none';
        document.getElementById('victoryScreen').style.display = 'none';
        document.getElementById('pauseScreen').style.display = 'none';
        document.getElementById('mobileControls').style.display = 'none';
    }
    SpaceShooterGame.initGame = initGame;
    // 添加 resizeCanvas 函数
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        // 如果游戏正在运行，重新定位玩家
        if (player) {
            player.x = canvas.width / 2 - player.width / 2;
            player.y = canvas.height - player.height - 20;
        }
    }
    // 添加setupTouchListeners函数
    function setupTouchListeners() {
        joystickContainerElement.addEventListener('touchstart', handleJoystickStart, false);
        joystickContainerElement.addEventListener('touchmove', handleJoystickMove, false);
        joystickContainerElement.addEventListener('touchend', handleJoystickEnd, false);
        chargeButtonElement.addEventListener('touchstart', handleChargeStart, false);
        chargeButtonElement.addEventListener('touchend', handleChargeEnd, false);
        specialButtonElement.addEventListener('touchstart', handleSpecialStart, false);
        specialButtonElement.addEventListener('touchend', handleSpecialEnd, false);
    }
    // 添加处理摇杆触摸的函数
    function handleJoystickStart(event) {
        event.preventDefault();
        joystickActive = true;
        updateJoystickPosition(event.touches[0]);
    }
    function handleJoystickMove(event) {
        event.preventDefault();
        if (joystickActive) {
            updateJoystickPosition(event.touches[0]);
        }
    }
    function handleJoystickEnd(event) {
        event.preventDefault();
        joystickActive = false;
        joystickPosition = { x: 0, y: 0 };
        joystickElement.style.transform = 'translate(-50%, -50%)';
    }
    function updateJoystickPosition(touch) {
        var rect = joystickContainerElement.getBoundingClientRect();
        var centerX = rect.left + rect.width / 2;
        var centerY = rect.top + rect.height / 2;
        var maxDistance = rect.width / 2;
        var dx = touch.clientX - centerX;
        var dy = touch.clientY - centerY;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > maxDistance) {
            dx *= maxDistance / distance;
            dy *= maxDistance / distance;
        }
        joystickPosition = {
            x: dx / maxDistance,
            y: dy / maxDistance
        };
        joystickElement.style.transform = "translate(".concat(dx, "px, ").concat(dy, "px)");
    }
    // 添���处理充能和特殊按钮函数
    function handleChargeStart(event) {
        event.preventDefault();
        // 实现充能逻辑
    }
    function handleChargeEnd(event) {
        event.preventDefault();
        // 实现充能结束逻辑
    }
    function handleSpecialStart(event) {
        event.preventDefault();
        // 实现特殊武器逻辑
    }
    function handleSpecialEnd(event) {
        event.preventDefault();
        // 实现特殊武器结束逻辑
    }
    // 游戏循环
    var lastTime = 0;
    var lastEnemySpawnTime = 0;
    function gameLoop(currentTime) {
        if (!gameRunning)
            return;
        if (isPaused) {
            requestAnimationFrame(gameLoop);
            return;
        }
        var deltaTime = currentTime - lastTime;
        lastTime = currentTime;
        // 更新游戏时间
        gameTime += deltaTime / 1000;
        // 检查是否需要进入下一关
        if (gameTime >= currentLevel.duration || player.score >= currentLevel.requiredScore) {
            if (currentLevel.number < levels.length) {
                startNextLevel();
            }
            else {
                victoryGame();
            }
        }
        // 生成敌人
        if (currentTime - lastEnemySpawnTime > 1000) { // 每秒生成一个敌人
            enemies.push(createEnemy());
            lastEnemySpawnTime = currentTime;
        }
        // 更新敌人
        updateEnemies(deltaTime);
        // 更新难度
        updateGameDifficulty();
        // 更新游戏统计
        updateGameStats(deltaTime);
        // 更新戏对象
        updateGameObjects(deltaTime);
        // 生成道具
        generatePowerUps(deltaTime);
        // 检查碰撞
        checkCollisions();
        // 渲染游戏画面
        render();
        // 添加玩家无敌状态的视觉效果
        if (player.invincible) {
            ctx.save();
            ctx.globalAlpha = 0.5;
            drawPlayer();
            ctx.restore();
        }
        requestAnimationFrame(gameLoop);
    }
    // 修改 createEnemy 函数，使其返回 Enemy 对象
    function createEnemy() {
        var enemy = {
            x: Math.random() * (canvas.width - 40), // 假设敌人宽度为 40
            y: -40, // 从屏幕顶部外开始
            width: 40,
            height: 40,
            speed: 2 + Math.random() * 2,
            health: 3,
            color: '#FF0000',
            type: 'normal',
            lastShot: 0,
            shootInterval: 1000,
            movePattern: 'straight',
            burning: false,
            burnTime: 0
        };
        return enemy;
    }
    function createFlameParticles(bullet) {
        for (var i = 0; i < 3; i++) {
            particles.push({
                x: bullet.x,
                y: bullet.y,
                radius: Math.random() * 2 + 1,
                color: "hsl(".concat(Math.random() * 60 + 15, ", 100%, 50%)"),
                velocity: {
                    x: (Math.random() - 0.5) * 2,
                    y: (Math.random() - 0.5) * 2
                },
                alpha: 1,
                life: 20
            });
        }
    }
    // 更新游戏对象
    function updateGameObjects(deltaTime) {
        updatePlayer(deltaTime);
        updateEnemies(deltaTime);
        updateBullets(deltaTime);
        updatePowerUps(deltaTime);
        updateParticles(deltaTime);
        updateExplosions(deltaTime);
        updateBulletDurations(deltaTime);
        generatePowerUps(deltaTime); // 添加这行
    }
    // 渲染游戏画面
    function render() {
        ctx.save();
        applyScreenShake();
        // 清屏
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // 绘制游戏对象
        drawStars();
        drawPlayer();
        enemies.forEach(drawEnemy);
        drawBullets();
        drawPowerUps(); // 确保这行存在
        drawParticles();
        drawExplosions();
        // 更新UI
        updateScore();
        updateAndDrawEffects(); // 添加这行
        drawUI(); // 如果这个函数还不存在，请添加它
        ctx.restore();
    }
    // 添加 updateScore 函数
    function updateScore() {
        var scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = "\u5206\u6570: ".concat(player.score);
        }
    }
    var lastLaserTime = 0;
    // 更新玩家位置
    function updatePlayer(deltaTime) {
        if (isTouchDevice && joystickActive) {
            player.dx = joystickPosition.x * player.speed;
            player.dy = joystickPosition.y * player.speed;
        }
        else {
            player.dx = 0;
            player.dy = 0;
            if (SpaceShooterGame.keys.ArrowLeft)
                player.dx -= player.speed;
            if (SpaceShooterGame.keys.ArrowRight)
                player.dx += player.speed;
            if (SpaceShooterGame.keys.ArrowUp)
                player.dy -= player.speed;
            if (SpaceShooterGame.keys.ArrowDown)
                player.dy += player.speed;
        }
        player.x += player.dx * (deltaTime / 16);
        player.y += player.dy * (deltaTime / 16);
        // 确保玩家不会出屏幕
        player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
        player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
        // 更新激光冷却时间
        if (player.laserCooldown > 0) {
            player.laserCooldown -= deltaTime;
        }
        // 激光发射逻辑
        if (player.activeBulletTypes.has(BULLET_TYPES.LASER)) {
            var currentTime = Date.now();
            if (currentTime - lastLaserTime >= 500) { // 每0.5秒
                createLaserBullet(player);
                lastLaserTime = currentTime;
            }
        }
        // 添加自动射击
        if (player.shootCooldown > 0) {
            player.shootCooldown -= deltaTime;
        }
        else {
            fireBullet(player);
            player.shootCooldown = player.shootInterval;
        }
    }
    // 玩家自动击
    function playerAutoShoot() {
        if (player.shootCooldown > 0) {
            player.shootCooldown -= 16; // 假设游戏以60FPS运行，帧约16毫秒
        }
        else {
            fireBullet(player);
            player.shootCooldown = player.shootInterval;
        }
    }
    // 绘制玩家飞机
    function drawPlayer() {
        ctx.save();
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
        // 主
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
    // 添加缺失的函数
    function checkCollisions() {
        // 检查子弹与敌人的碰撞
        bullets.forEach(function (bullet, bulletIndex) {
            if (bullet.isPlayerBullet) {
                enemies.forEach(function (enemy, enemyIndex) {
                    if (bullet.x < enemy.x + enemy.width &&
                        bullet.x + bullet.width > enemy.x &&
                        bullet.y < enemy.y + enemy.height &&
                        bullet.y + bullet.height > enemy.y) {
                        // 碰撞发生
                        bullets.splice(bulletIndex, 1);
                        enemy.health -= bullet.damage;
                        if (bullet.type === BULLET_TYPES.FLAME) {
                            if (!enemy.burning) {
                                enemy.burning = true;
                                enemy.burnTime = 2000; // 燃烧持续2秒
                            }
                        }
                        if (enemy.health <= 0) {
                            enemies.splice(enemyIndex, 1);
                            player.score += 10;
                            gameStats.enemiesDestroyed++;
                            createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width);
                        }
                    }
                });
            }
            else {
                // 敌人子弹击中玩家
                if (bullet.x < player.x + player.width &&
                    bullet.x + bullet.width > player.x &&
                    bullet.y < player.y + player.height &&
                    bullet.y + bullet.height > player.y) {
                    bullets.splice(bulletIndex, 1);
                    playerTakeDamage(bullet.damage);
                }
            }
        });
        // 修改玩家与敌人的碰撞检测
        enemies.forEach(function (enemy, index) {
            if (player.x < enemy.x + enemy.width &&
                player.x + player.width > enemy.x &&
                player.y < enemy.y + enemy.height &&
                player.y + player.height > enemy.y) {
                // 碰撞发生
                playerTakeDamage(10); // 减少伤害值，从20改为10
                enemy.health -= 50; // 敌机也受到伤害
                if (enemy.health <= 0) {
                    enemies.splice(index, 1);
                    createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width);
                }
            }
        });
        // 检查玩家是否碰到道具
        powerUps.forEach(function (powerUp, index) {
            if (player.x < powerUp.x + powerUp.width &&
                player.x + player.width > powerUp.x &&
                player.y < powerUp.y + powerUp.height &&
                player.y + player.height > powerUp.y) {
                console.log("Player collected power-up:", powerUp.type); // 添加日志
                applyPowerUp(powerUp);
                powerUps.splice(index, 1);
                playSound('powerUp');
            }
        });
    }
    function drawExplosions() {
        ctx.save();
        explosions.forEach(function (explosion) {
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 100, 0, ".concat(explosion.alpha, ")");
            ctx.fill();
        });
        ctx.restore();
    }
    function drawShield() {
        if (player.shield > 0) {
            ctx.strokeStyle = '#5AC8FA';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 2 + 10, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    function drawSpecialWeaponCharge() {
        ctx.fillStyle = '#FF9500';
        ctx.fillRect(10, 90, player.specialWeapon * 2, 10);
    }
    function updateAndDrawGameInfo() {
        ctx.fillStyle = '#FFF';
        ctx.font = '20px Arial';
        ctx.fillText("\u5173\u5361: ".concat(level), 10, 30);
        ctx.fillText("\u751F\u547D\u503C: ".concat(player.health, "/").concat(player.maxHealth), 10, 60);
        ctx.fillText("\u65F6\u95F4: ".concat(Math.floor(gameTime)), 10, 90);
        ctx.fillText("\u5F97\u5206: ".concat(player.score), 10, 120);
    }
    function checkGameEnd() {
        if (gameTime >= gameSettings.gameDuration || player.health <= 0) {
            endGame();
        }
    }
    function generatePowerUps(deltaTime) {
        powerUpTimer += deltaTime;
        if (powerUpTimer > 1500) { // 每1.5秒尝试生成一个道具（原来是3秒）
            powerUpTimer = 0;
            if (Math.random() < 0.7) { // 70%的概率生成道具（原来是50%）
                var type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
                var powerUp = {
                    x: Math.random() * (canvas.width - 30),
                    y: -30,
                    width: 30,
                    height: 30,
                    type: type,
                    speed: 2,
                    icon: getPowerUpIcon(type)
                };
                powerUps.push(powerUp);
                console.log("Power-up generated:", type);
            }
        }
    }
    function getPowerUpIcon(type) {
        switch (type) {
            case 'health': return '❤️';
            case 'shield': return '🛡️';
            case 'speedBoost': return '⚡';
            case 'spreadShot': return '🎇';
            case 'laserShot': return '📡';
            case 'homingMissile': return '🚀';
            case 'flamethrower': return '🔥';
        }
    }
    function drawPowerUps() {
        powerUps.forEach(function (powerUp) {
            ctx.save();
            ctx.fillStyle = getPowerUpColor(powerUp.type);
            ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
            // 添加边框
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
            // 添加图标或文字
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(powerUp.icon, powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2);
            ctx.restore();
        });
    }
    function getPowerUpColor(type) {
        switch (type) {
            case 'shield': return '#5AC8FA';
            case 'health': return '#4CD964';
            default: return '#FF9500';
        }
    }
    function createExplosion(x, y, size) {
        if (size === void 0) { size = 30; }
        explosions.push({
            x: x,
            y: y,
            radius: 1,
            maxRadius: size,
            alpha: 1
        });
        playSound('explosion');
        createExplosionParticles(x, y, size);
    }
    function spawnPowerUp(x, y) {
        var powerUpTypes = ['health', 'shield', 'speedBoost', 'spreadShot', 'laserShot', 'homingMissile', 'flamethrower'];
        var type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        powerUps.push({
            x: x,
            y: y,
            width: 30,
            height: 30,
            type: type,
            speed: 2,
            icon: getPowerUpIcon(type)
        });
    }
    // 修改 fireBullet 函数
    function fireBullet(shooter) {
        if (shooter === player) {
            var currentTime_1 = Date.now();
            player.activeBulletTypes.forEach(function (bulletType) {
                switch (bulletType) {
                    case BULLET_TYPES.SPREAD:
                        createSpreadBullet(player);
                        break;
                    case BULLET_TYPES.LASER:
                        if (currentTime_1 - lastLaserTime >= 500) { // 每0.5秒
                            createLaserBullet(player);
                            lastLaserTime = currentTime_1;
                        }
                        break;
                    case BULLET_TYPES.HOMING:
                        // 检查当前是否有活跃的导弹
                        var activeHomingMissile = bullets.find(function (b) { return b.type === BULLET_TYPES.HOMING && b.isPlayerBullet; });
                        if (!activeHomingMissile) {
                            var missile = createBullet(shooter, bulletType);
                            bullets.push(missile);
                            playSound('missile'); // 播放导弹发射音效
                        }
                        break;
                    // 其他子弹类型的处理...
                    default:
                        var bullet = createBullet(shooter, bulletType);
                        bullets.push(bullet);
                        break;
                }
            });
        }
        else {
            var bullet = createBullet(shooter, 'normal');
            bullets.push(bullet);
        }
        playSound('shoot');
        gameStats.bulletsFired++;
    }
    // 修改 createBullet 函数
    function createBullet(shooter, bulletType) {
        var _a;
        var bullet = getBulletFromPool();
        bullet.x = shooter.x + shooter.width / 2;
        bullet.y = shooter === player ? shooter.y : shooter.y + shooter.height;
        bullet.isPlayerBullet = shooter === player;
        bullet.range = 100;
        // 设置默认角度
        bullet.angle = shooter === player ? -Math.PI / 2 : Math.PI / 2;
        switch (bulletType) {
            case BULLET_TYPES.NORMAL:
                bullet.width = 4;
                bullet.height = 10;
                bullet.speed = 8;
                bullet.damage = 1; // 降低普通子弹的伤害
                break;
            case BULLET_TYPES.SPREAD:
                bullet.width = 4;
                bullet.height = 8;
                bullet.speed = 7;
                bullet.damage = 1; // 扩散子弹保持较低伤害
                break;
            case BULLET_TYPES.LASER:
                bullet.width = 4;
                bullet.height = 20;
                bullet.speed = 12;
                bullet.damage = 2; // 激光子弹伤害略高
                break;
            case BULLET_TYPES.HOMING:
                bullet.width = 8;
                bullet.height = 24;
                bullet.speed = 6; // 将速度从 3 提高到 6
                bullet.damage = 3; // 导弹伤害较高
                bullet.target = (_a = findNearestEnemy(bullet.x, bullet.y)) !== null && _a !== void 0 ? _a : undefined;
                break;
            case BULLET_TYPES.FLAME:
                bullet.width = 10;
                bullet.height = 20;
                bullet.speed = 6;
                bullet.damage = 0.5; // 持续伤害
                bullet.range = 200; // 火焰的射程
                bullet.burning = true;
                bullet.burnTime = 2000; // 燃烧持续2秒
                break;
        }
        bullet.type = bulletType;
        return bullet;
    }
    // 添加 findNearestEnemy 函数
    function findNearestEnemy(x, y) {
        var nearestEnemy = null;
        var nearestDistance = Infinity;
        for (var _i = 0, enemies_1 = enemies; _i < enemies_1.length; _i++) {
            var enemy = enemies_1[_i];
            var distance = Math.sqrt(Math.pow(enemy.x - x, 2) + Math.pow(enemy.y - y, 2));
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestEnemy = enemy;
            }
        }
        return nearestEnemy;
    }
    // 在创建子弹的函数中（可能是 fireBullet 或类似的函数）
    function createSpreadBullet(shooter) {
        var spreadCount = 5; // 每次发射的散弹数量
        var spreadAngle = Math.PI / 6; // 散弹的扩散角度
        for (var i = 0; i < spreadCount; i++) {
            var angle = -spreadAngle / 2 + (spreadAngle / (spreadCount - 1)) * i;
            var bullet = {
                x: shooter.x + shooter.width / 2,
                y: shooter.y,
                width: 4,
                height: 4,
                speed: 10,
                damage: 0.7,
                angle: -Math.PI / 2 + angle, // 基础向上方向加上扩散角度
                type: BULLET_TYPES.SPREAD,
                isPlayerBullet: true,
                range: 100
            };
            bullets.push(bullet);
        }
    }
    function createLaserBullet(shooter) {
        var laser = {
            x: shooter.x + shooter.width / 2,
            y: shooter.y,
            width: 4, // 可以根据需要调整激光宽度
            height: canvas.height,
            speed: 0,
            damage: 5,
            angle: 0,
            type: BULLET_TYPES.LASER,
            isPlayerBullet: true,
            duration: 18, // 0.3秒 (假设60帧/秒)
            alpha: 1, // 初始完全不透明
            range: 100
        };
        bullets.push(laser);
    }
    function createHomingBullet(shooter) {
        var bullet = {
            x: shooter.x + shooter.width / 2,
            y: shooter === player ? shooter.y : shooter.y + shooter.height,
            width: 8,
            height: 8,
            speed: 10,
            damage: 2,
            angle: shooter === player ? -Math.PI / 2 : Math.PI / 2,
            type: BULLET_TYPES.HOMING,
            isPlayerBullet: shooter === player,
            range: 100
        };
        bullets.push(bullet);
    }
    // 更新 drawBullets 函数
    function drawBullets() {
        bullets.forEach(function (bullet) {
            ctx.save();
            ctx.translate(bullet.x, bullet.y);
            switch (bullet.type) {
                case BULLET_TYPES.NORMAL:
                    ctx.fillStyle = bullet.isPlayerBullet ? '#5AC8FA' : '#FF3B30';
                    ctx.fillRect(-bullet.width / 2, -bullet.height / 2, bullet.width, bullet.height);
                    break;
                case BULLET_TYPES.SPREAD:
                    ctx.fillStyle = '#FFD700';
                    ctx.beginPath();
                    ctx.arc(0, 0, bullet.width / 2, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case BULLET_TYPES.LASER:
                    ctx.restore(); // 恢复上下文状态
                    drawLaserBullet(bullet); // 调用专门的激光绘制函数
                    return; // 提前返回，避免执行后面的 ctx.restore()
                case BULLET_TYPES.HOMING:
                    // 绘制火箭主体
                    ctx.fillStyle = '#FF9500';
                    ctx.beginPath();
                    ctx.moveTo(0, -bullet.height / 2);
                    ctx.lineTo(bullet.width / 2, bullet.height / 2);
                    ctx.lineTo(-bullet.width / 2, bullet.height / 2);
                    ctx.closePath();
                    ctx.fill();
                    // 绘制火箭尾翼
                    ctx.fillStyle = '#FF3B30';
                    ctx.beginPath();
                    ctx.moveTo(bullet.width / 2, bullet.height / 2);
                    ctx.lineTo(bullet.width, bullet.height / 4);
                    ctx.lineTo(bullet.width / 2, bullet.height / 4);
                    ctx.closePath();
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(-bullet.width / 2, bullet.height / 2);
                    ctx.lineTo(-bullet.width, bullet.height / 4);
                    ctx.lineTo(-bullet.width / 2, bullet.height / 4);
                    ctx.closePath();
                    ctx.fill();
                    // 绘制火箭推进器火焰
                    ctx.fillStyle = '#FFF700';
                    ctx.beginPath();
                    ctx.moveTo(bullet.width / 4, bullet.height / 2);
                    ctx.lineTo(0, bullet.height);
                    ctx.lineTo(-bullet.width / 4, bullet.height / 2);
                    ctx.closePath();
                    ctx.fill();
                    // 计算火箭的角度
                    var angle = void 0;
                    if (bullet.target) {
                        angle = Math.atan2(bullet.target.y - bullet.y, bullet.target.x - bullet.x);
                    }
                    else {
                        angle = -Math.PI / 2; // 默认向上
                    }
                    ctx.rotate(angle + Math.PI / 2);
                    break;
                case BULLET_TYPES.FLAME:
                    drawFlameBullet(bullet);
                    break;
                default:
                    ctx.rotate(bullet.angle + Math.PI / 2);
                    break;
            }
            ctx.restore();
        });
    }
    function drawFlameBullet(bullet) {
        var gradient = ctx.createLinearGradient(0, 0, 0, bullet.height);
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 165, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0.8)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-bullet.width / 2, bullet.height);
        ctx.lineTo(bullet.width / 2, bullet.height);
        ctx.closePath();
        ctx.fill();
        // 添加火花效果
        for (var i = 0; i < 3; i++) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc((Math.random() - 0.5) * bullet.width, Math.random() * bullet.height, Math.random() * 2 + 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    function spawnEnemy() {
        var enemyTypes = ['normal', 'fast', 'tough', 'small', 'large'];
        var enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        var enemy = {
            x: Math.random() * (canvas.width - 60),
            y: -60,
            width: 50,
            height: 50,
            speed: 2,
            health: 3, // 增加敌人的生命值
            color: '#FF3B30',
            type: enemyType,
            lastShot: 0,
            shootInterval: 2000 + Math.random() * 2000, // 2-4秒间隔
            movePattern: Math.random() < 0.3 ? 'zigzag' : 'straight', // 30%概率zigzag移动,
            burning: false,
            burnTime: 0
        };
        switch (enemyType) {
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
            case 'small':
                enemy.width = 30;
                enemy.height = 30;
                enemy.speed = 3;
                enemy.color = '#FF2D55';
                break;
            case 'normal':
            default:
                // 保持默认值
                break;
        }
        // 根据难度调整敌机速度
        enemy.speed *= gameDifficulty;
        enemies.push(enemy);
    }
    function createStars() {
        stars = [];
        for (var i = 0; i < 100; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 2,
                speed: Math.random() * 3 + 1
            });
        }
    }
    function drawStars() {
        ctx.fillStyle = '#FFF';
        stars.forEach(function (star) {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fill();
            star.y += star.speed;
            if (star.y > canvas.height) {
                star.y = 0;
            }
        });
    }
    function updateEnemies(deltaTime) {
        var now = Date.now();
        enemies.forEach(function (enemy, index) {
            // 处理燃烧效果
            if (enemy.burning) {
                enemy.health -= 0.05; // 每帧额外伤害
                enemy.burnTime -= deltaTime;
                if (enemy.burnTime <= 0) {
                    enemy.burning = false;
                }
            }
            if (enemy.type === 'boss') {
                updateBoss(enemy, deltaTime);
            }
            else {
                // 移动敌机
                if (enemy.movePattern === 'zigzag') {
                    enemy.x += Math.sin(enemy.y * 0.1) * 2; // 左右摆动
                }
                enemy.y += enemy.speed * (deltaTime / 16);
                // 敌机射击
                if (now - enemy.lastShot > enemy.shootInterval) {
                    fireBullet(enemy);
                    enemy.lastShot = now;
                }
                // 移除出屏幕的敌机
                if (enemy.y > canvas.height) {
                    enemies.splice(index, 1);
                }
            }
            // 绘制敌机
            drawEnemy(enemy);
        });
    }
    // 修改 drawEnemy 函数以绘制更精致的敌方图形
    function drawEnemy(enemy) {
        ctx.save();
        ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        ctx.rotate(Math.PI); // 旋转180度，使敌机朝下
        // 绘制主体
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.moveTo(0, -enemy.height / 2);
        ctx.lineTo(enemy.width / 2, enemy.height / 2);
        ctx.lineTo(-enemy.width / 2, enemy.height / 2);
        ctx.closePath();
        ctx.fill();
        // 绘制机翼
        ctx.fillStyle = lightenColor(enemy.color, 20);
        ctx.beginPath();
        ctx.moveTo(enemy.width / 2, 0);
        ctx.lineTo(enemy.width * 0.8, -enemy.height / 3);
        ctx.lineTo(enemy.width / 2, -enemy.height / 2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-enemy.width / 2, 0);
        ctx.lineTo(-enemy.width * 0.8, -enemy.height / 3);
        ctx.lineTo(-enemy.width / 2, -enemy.height / 2);
        ctx.closePath();
        ctx.fill();
        // 绘制驾驶舱
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, enemy.height / 6, enemy.width / 6, 0, Math.PI * 2);
        ctx.fill();
        // 绘制燃烧效果
        if (enemy.burning) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }
        ctx.restore();
    }
    // 添加一个辅助函数来调亮颜色
    function lightenColor(color, percent) {
        var num = parseInt(color.replace("#", ""), 16), amt = Math.round(2.55 * percent), R = (num >> 16) + amt, G = (num >> 8 & 0x00FF) + amt, B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
    function checkPlayerEnemyCollision() {
        enemies.forEach(function (enemy, index) {
            if (player.x < enemy.x + enemy.width &&
                player.x + player.width > enemy.x &&
                player.y < enemy.y + enemy.height &&
                player.y + player.height > enemy.y) {
                // 碰撞发生
                if (player.shield > 0) {
                    // 如果玩家有护盾，摧毁敌人并减少护盾
                    enemies.splice(index, 1);
                    player.shield -= 20;
                    createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                    playSound('explosion');
                }
                else {
                    // 如果没有护盾，减少玩家生命值
                    player.health -= 20;
                    createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                    playSound('playerHit');
                }
                // 检查玩家是否被击败
                if (player.health <= 0) {
                    endGame();
                }
            }
        });
    }
    function endGame() {
        gameRunning = false;
        clearInterval(enemySpawnInterval);
        stopBGM();
        playSound('gameOver');
        document.getElementById('endScreen').style.display = 'flex';
        document.getElementById('mobileControls').style.display = 'none';
        document.getElementById('finalScore').textContent = "\u6700\u7EC8\u5206: ".concat(player.score);
    }
    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            masterGainNode = audioContext.createGain();
            masterGainNode.connect(audioContext.destination);
            masterGainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        }
        // 加载音效
        loadSound('shoot', 'assets/shoot.mp3');
        loadSound('explosion', 'assets/explosion.mp3');
        loadSound('powerUp', 'assets/powerup.wav');
        loadSound('gameOver', 'assets/game-over.wav');
        loadSound('victory', 'assets/victory.wav');
        loadSound('missile', 'assets/missile.wav');
        // 初始化背景音乐
        bgmAudio = new Audio('assets/background.mp3');
        bgmAudio.loop = true;
        bgmAudio.volume = 0.3; // 设置初始音量
    }
    function loadSound(name, url) {
        fetch(url)
            .then(function (response) { return response.arrayBuffer(); })
            .then(function (arrayBuffer) { return audioContext.decodeAudioData(arrayBuffer); })
            .then(function (audioBuffer) {
            soundEffects[name] = audioBuffer;
        })
            .catch(function (error) { return console.error('Error loading sound:', error); });
    }
    function playSound(type) {
        if (soundEffects[type]) {
            var source = audioContext.createBufferSource();
            source.buffer = soundEffects[type];
            // 创建一个增益节点来控制音量
            var gainNode = audioContext.createGain();
            // 根据音效类型设置不同的音量
            switch (type) {
                case 'shoot':
                    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime); // 将普通射击音降低到 20%
                    break;
                case 'powerUp':
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // 将 powerUp 音效降低到 30%
                    break;
                case 'explosion':
                    gainNode.gain.setValueAtTime(0.8, audioContext.currentTime); // 爆炸音效保持较大音量
                    break;
                case 'playerHit':
                    gainNode.gain.setValueAtTime(0.6, audioContext.currentTime); // 玩家受击音效稍微降低
                    break;
                default:
                    gainNode.gain.setValueAtTime(1, audioContext.currentTime); // 其他音效保持原音量
            }
            // 连接音频节点
            source.connect(gainNode);
            gainNode.connect(masterGainNode);
            source.start();
        }
    }
    // 添加播放背景音乐的函数
    function playBGM() {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        bgmAudio.play();
    }
    // 添加停止背景音乐的函数
    function stopBGM() {
        bgmAudio.pause();
        bgmAudio.currentTime = 0;
    }
    // 开始游戏
    function startGame() {
        console.log("Is touch device:", isTouchDevice);
        console.log("startGame function called");
        // 初始化游戏态
        gameRunning = true;
        gameTime = 0;
        gameDifficulty = getDifficultyValue(gameSettings.initialDifficulty);
        player.health = gameSettings.initialHealth;
        player.score = 0;
        player.shield = 0;
        player.specialWeapon = 0;
        enemies = [];
        bullets = [];
        powerUps = [];
        explosions = [];
        powerUpTimer = 0;
        currentLevel = levels[0];
        // 隐藏开始屏幕，显示游戏画布和控制器
        document.getElementById('startScreen').style.display = 'none';
        canvas.style.display = 'block';
        // 只在触设备上显示动控制器
        if (isTouchDevice) {
            document.getElementById('mobileControls').style.display = 'flex';
        }
        else {
            document.getElementById('mobileControls').style.display = 'none';
        }
        document.getElementById('score').style.display = 'block';
        // 初始化游元素
        createStars();
        clearInterval(enemySpawnInterval);
        enemySpawnInterval = window.setInterval(spawnEnemy, 1000 / gameDifficulty);
        // 初始化音频并播放背景乐
        initAudio();
        playBGM();
        // 开始游戏循环
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
        updateHealthBar();
    }
    SpaceShooterGame.startGame = startGame;
    // 获取难度值
    function getDifficultyValue(difficulty) {
        switch (difficulty) {
            case 'easy': return 1;
            case 'medium': return 1.5;
            case 'hard': return 2;
            default: return 1.5;
        }
    }
    // 在这里添加其他游戏函数...
    function startNextLevel() {
        if (!currentLevel) {
            console.error('Current level is not initialized');
            return;
        }
        var nextLevelIndex = currentLevel.number + 1;
        if (nextLevelIndex >= levels.length) {
            console.log('Game completed! No more levels.');
            return;
        }
        currentLevel = levels[nextLevelIndex];
        gameTime = 0;
        isBossSpawned = false;
        // 可以在这里添加关卡过渡的逻辑
    }
    SpaceShooterGame.startNextLevel = startNextLevel;
    function victoryGame() {
        gameRunning = false;
        clearInterval(enemySpawnInterval);
        stopBGM();
        playSound('victory');
        document.getElementById('victoryScreen').style.display = 'flex';
        document.getElementById('finalScore').textContent = "\u6700\u7EC8\u5206\u6570: ".concat(player.score);
    }
    function spawnBoss() {
        var boss = {
            x: canvas.width / 2 - 75,
            y: -150,
            width: 150,
            height: 150,
            speed: 1,
            health: 100,
            maxHealth: 100,
            color: '#FF0000',
            type: 'boss',
            lastShot: 0,
            shootInterval: 1000,
            movePattern: 'complex',
            phase: 1,
            attackPattern: 'normal',
            specialAttackCooldown: 0,
            burning: false,
            burnTime: 0
        };
        enemies.push(boss);
        isBossSpawned = true;
    }
    function updateBoss(boss, deltaTime) {
        // Boss的移动模式
        boss.x += Math.sin(gameTime * 0.05) * 3 * (deltaTime / 16);
        boss.y = Math.min(boss.y + boss.speed * (deltaTime / 16), canvas.height / 4);
        // Boss的攻击模式
        if (Date.now() - boss.lastShot > boss.shootInterval) {
            switch (boss.attackPattern) {
                case 'normal':
                    fireBullet(boss);
                    break;
                case 'spread':
                    fireSpreadBullets(boss);
                    break;
                case 'laser':
                    fireLaser(boss);
                    break;
            }
            boss.lastShot = Date.now();
        }
        // Boss的特殊攻击
        boss.specialAttackCooldown -= deltaTime / 16;
        if (boss.specialAttackCooldown <= 0) {
            bossSpecialAttack(boss);
            boss.specialAttackCooldown = 300; // 5秒冷却间
        }
        // Boss的阶段变化
        if (boss.health < boss.maxHealth * 0.5 && boss.phase === 1) {
            boss.phase = 2;
            boss.attackPattern = 'spread';
            boss.shootInterval = 800;
        }
        else if (boss.health < boss.maxHealth * 0.25 && boss.phase === 2) {
            boss.phase = 3;
            boss.attackPattern = 'laser';
            boss.shootInterval = 1500;
        }
    }
    function drawBoss(boss) {
        ctx.fillStyle = boss.color;
        ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
        // 绘制Boss血条
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(boss.x, boss.y - 20, boss.width, 10);
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(boss.x, boss.y - 20, boss.width * (boss.health / boss.maxHealth), 10);
    }
    // 添加新的函
    function togglePause() {
        isPaused = !isPaused;
        if (isPaused) {
            bgmAudio.pause();
        }
        else {
            bgmAudio.play();
        }
        document.getElementById('pauseButton').textContent = isPaused ? '继续' : '暂停';
    }
    SpaceShooterGame.togglePause = togglePause;
    // 添加的函
    function saveSettings() {
        localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
    }
    function loadSettings() {
        var savedSettings = localStorage.getItem('gameSettings');
        if (savedSettings) {
            gameSettings = JSON.parse(savedSettings);
            applySettings();
        }
    }
    function applySettings() {
        gameDifficulty = getDifficultyValue(gameSettings.difficulty);
        masterGainNode.gain.setValueAtTime(gameSettings.soundVolume, audioContext.currentTime);
        updateBGMVolume(gameSettings.musicVolume);
    }
    // 置更新数
    function updateDifficulty(difficulty) {
        gameSettings.difficulty = difficulty;
        saveSettings();
    }
    SpaceShooterGame.updateDifficulty = updateDifficulty;
    function updateSoundVolume(volume) {
        gameSettings.soundVolume = volume;
        masterGainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        saveSettings();
    }
    SpaceShooterGame.updateSoundVolume = updateSoundVolume;
    function updateMusicVolume(volume) {
        gameSettings.musicVolume = volume;
        updateBGMVolume(volume);
        saveSettings();
    }
    SpaceShooterGame.updateMusicVolume = updateMusicVolume;
    // 添加 Boss 特殊攻击函数
    function bossSpecialAttack(boss) {
        switch (boss.phase) {
            case 1:
                // 第一阶段特殊攻击：环形子弹
                for (var i = 0; i < 12; i++) {
                    var angle = (i / 12) * Math.PI * 2;
                    createBossBullet(boss, 5, angle);
                }
                break;
            case 2:
                // 第二阶段殊攻击：追踪导弹
                for (var i = 0; i < 3; i++) {
                    createHomingBullet(boss);
                }
                break;
            case 3:
                // 第三阶段特殊攻击：激光扫射
                fireSweepingLaser(boss);
                break;
        }
    }
    // 添加 Boss 子弹创建函数
    function createBossBullet(boss, speed, angle) {
        var bullet = {
            x: boss.x + boss.width / 2,
            y: boss.y + boss.height,
            width: 8,
            height: 8,
            speed: speed,
            damage: 2,
            angle: angle,
            type: BULLET_TYPES.NORMAL,
            isPlayerBullet: false,
            range: 100
        };
        bullets.push(bullet);
    }
    // 添加激光扫射函数
    function fireSweepingLaser(boss) {
        var laser = {
            x: boss.x + boss.width / 2,
            y: boss.y + boss.height,
            width: 4,
            height: canvas.height,
            speed: 0,
            damage: 0.5,
            angle: Math.PI / 2,
            type: BULLET_TYPES.LASER,
            isPlayerBullet: false,
            duration: 120,
            range: 100
        };
        bullets.push(laser);
    }
    // 添加创建粒子函数
    function createParticle(x, y, color) {
        var particle = getParticleFromPool();
        // 设置粒子属性
        particle.x = x;
        particle.y = y;
        particle.color = color;
        // ... (其他属性设置)
        return particle;
    }
    // 添加更新粒子函数
    function updateParticles(deltaTime) {
        particles = particles.filter(function (particle) {
            particle.x += particle.velocity.x * (deltaTime / 16);
            particle.y += particle.velocity.y * (deltaTime / 16);
            particle.alpha -= deltaTime * 0.02;
            particle.life -= deltaTime / 16;
            return particle.alpha > 0 && particle.life > 0;
        });
    }
    // 添加绘制粒子函数
    function drawParticles() {
        particles.forEach(function (particle) {
            ctx.save();
            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }
    // 添加更新成就函数
    function updateAchievements() {
        achievements.forEach(function (achievement) {
            if (!achievement.isUnlocked) {
                switch (achievement.id) {
                    case 'firstKill':
                        if (player.score >= 10) {
                            achievement.progress = 1;
                        }
                        break;
                    case 'sharpshooter':
                        // 在击中敌人时更新
                        break;
                    case 'survivor':
                        achievement.progress = Math.min(gameTime, achievement.maxProgress);
                        break;
                }
                if (achievement.progress >= achievement.maxProgress) {
                    achievement.isUnlocked = true;
                    showAchievementNotification(achievement);
                }
            }
        });
    }
    // 添加显示成就通知函数
    function showAchievementNotification(achievement) {
        // 实现成就通知UI
        console.log("\u6210\u5C31\u89E3\u9501\uFF1A".concat(achievement.name));
    }
    // 添加应用道具效果函数
    function applyPowerUp(powerUp) {
        console.log("Applying power-up: ".concat(powerUp.type));
        switch (powerUp.type) {
            case 'health':
                player.health = Math.min(player.health + 20, player.maxHealth);
                createHealingEffect();
                console.log("Player health increased to ".concat(player.health));
                break;
            case 'shield':
                player.shield = Math.min(player.shield + 50, 100);
                createShieldEffect();
                console.log("Player shield increased to ".concat(player.shield));
                break;
            case 'speedBoost':
                player.speed *= 1.5;
                createSpeedTrail();
                setTimeout(function () {
                    player.speed /= 1.5;
                    removeSpeedTrail();
                }, 5000);
                break;
            case 'spreadShot':
                addBulletType(BULLET_TYPES.SPREAD, 10000);
                break;
            case 'laserShot':
                addBulletType(BULLET_TYPES.LASER, 10000);
                break;
            case 'homingMissile':
                addBulletType(BULLET_TYPES.HOMING, 10000);
                break;
            case 'flamethrower':
                addBulletType(BULLET_TYPES.FLAME, 10000);
                break;
        }
        gameStats.powerUpsCollected++;
        playSound('powerUp');
        createPowerUpCollectionEffect(powerUp);
    }
    // 添加清除所有敌人函数
    function clearAllEnemies() {
        enemies.forEach(function (enemy) {
            createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            player.score += 10;
        });
        enemies = [];
    }
    // 添加更新游戏难度函数
    function updateGameDifficulty() {
        gameDifficulty = 1 + (currentLevel.number - 1) * 0.5 + gameTime / 60;
        player.shootInterval = Math.max(50, 100 - gameDifficulty * 5);
    }
    // 添加更新游戏统计函数
    function updateGameStats(deltaTime) {
        gameStats.timePlayedSeconds += deltaTime / 1000;
    }
    // 添加绘制游戏统计函数
    function drawGameStats() {
        ctx.fillStyle = '#FFF';
        ctx.font = '14px Arial';
        ctx.fillText("\u654C\u4EBA\u6D88\u706D: ".concat(gameStats.enemiesDestroyed), canvas.width - 150, 30);
        ctx.fillText("\u5B50\u5F39\u53D1\u5C04: ".concat(gameStats.bulletsFired), canvas.width - 150, 50);
        ctx.fillText("\u9053\u5177\u6536\u96C6: ".concat(gameStats.powerUpsCollected), canvas.width - 150, 70);
        ctx.fillText("\u6E38\u620F\u65F6\u95F4: ".concat(Math.floor(gameStats.timePlayedSeconds), "s"), canvas.width - 150, 90);
    }
    // 添加视觉效果：屏幕震动
    var screenShake = 0;
    function shakeScreen() {
        screenShake = 10;
    }
    function applyScreenShake() {
        if (screenShake > 0) {
            var shakeX = (Math.random() - 0.5) * screenShake;
            var shakeY = (Math.random() - 0.5) * screenShake;
            ctx.translate(shakeX, shakeY);
            screenShake--;
        }
    }
    // 在适当的地方调用 shakeScreen 函数，例如在玩家受到伤害时
    function playerTakeDamage(damage) {
        if (player.shield > 0) {
            player.shield = Math.max(0, player.shield - damage);
            playSound('shieldHit');
        }
        else {
            player.health = Math.max(0, player.health - damage);
            playSound('playerHit');
            shakeScreen();
        }
        // 添加无敌时间
        player.invincible = true;
        setTimeout(function () {
            player.invincible = false;
        }, 1000); // 1秒无敌时间
        if (player.health <= 0) {
            endGame();
        }
        updateHealthBar();
    }
    // 优化性能：对象池
    var bulletPool = [];
    var particlePool = [];
    function getBulletFromPool() {
        return bulletPool.pop() || createNewBullet();
    }
    function returnBulletToPool(bullet) {
        bulletPool.push(bullet);
    }
    function getParticleFromPool() {
        return particlePool.pop() || createNewParticle();
    }
    function returnParticleToPool(particle) {
        particlePool.push(particle);
    }
    // 加 updatePowerUps 函数
    function updatePowerUps(deltaTime) {
        powerUps.forEach(function (powerUp, index) {
            powerUp.y += powerUp.speed * (deltaTime / 16);
            if (powerUp.y > canvas.height) {
                powerUps.splice(index, 1);
            }
        });
    }
    // 添加 drawUI 函数
    function drawUI() {
        drawShield();
        drawSpecialWeaponCharge();
        updateAndDrawGameInfo();
    }
    // 添加 fireSpreadBullets 函数
    function fireSpreadBullets(boss) {
        for (var i = -2; i <= 2; i++) {
            createBossBullet(boss, 5, Math.PI / 2 + i * Math.PI / 12);
        }
    }
    // 添加 fireLaser 函数
    function fireLaser(boss) {
        var laser = {
            x: boss.x + boss.width / 2,
            y: boss.y + boss.height,
            width: 4,
            height: canvas.height,
            speed: 0,
            damage: 0.5,
            angle: Math.PI / 2,
            type: BULLET_TYPES.LASER,
            isPlayerBullet: false,
            duration: 60,
            range: 100
        };
        bullets.push(laser);
    }
    // 添加 createNewBullet 和 createNewParticle 函数
    function createNewBullet() {
        return {
            x: 0,
            y: 0,
            width: 4,
            height: 10,
            speed: 0,
            damage: 1,
            angle: 0,
            type: BULLET_TYPES.NORMAL,
            isPlayerBullet: true,
            range: 100
        };
    }
    function createNewParticle() {
        return {
            x: 0,
            y: 0,
            radius: 1,
            color: '#FFFFFF',
            velocity: { x: 0, y: 0 },
            alpha: 1,
            life: 20
        };
    }
    // 添加 updateExplosions 函数
    function updateExplosions(deltaTime) {
        explosions = explosions.filter(function (explosion) {
            explosion.radius += deltaTime * 0.05;
            explosion.alpha -= deltaTime * 0.001;
            return explosion.alpha > 0;
        });
    }
    // 添加 createExplosionParticles 函数
    function createExplosionParticles(x, y, size) {
        var particleCount = Math.floor(size * 2);
        for (var i = 0; i < particleCount; i++) {
            var angle = Math.random() * Math.PI * 2;
            var speed = Math.random() * 5 + 2;
            particles.push({
                x: x,
                y: y,
                radius: Math.random() * 3 + 1,
                color: "hsl(".concat(Math.random() * 60 + 15, ", 100%, ").concat(Math.random() * 50 + 50, "%)"),
                velocity: {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed
                },
                alpha: 1,
                life: Math.random() * 20 + 10
            });
        }
    }
    // 添加 updateBGMVolume 函数
    function updateBGMVolume(volume) {
        if (bgmAudio) {
            bgmAudio.volume = volume;
        }
    }
    function updateHealthBar() {
        var healthBar = document.getElementById('healthBar');
        var healthBarContainer = document.getElementById('healthBarContainer');
        if (healthBar && healthBarContainer) {
            var healthPercentage = (player.health / player.maxHealth) * 100;
            healthBar.style.width = "".concat(healthPercentage, "%");
            console.log("Updating health bar: ".concat(healthPercentage, "%")); // 调试日志
            // 根据生命值改变颜色
            var hue = (healthPercentage / 100) * 120; // 0 是红色，120 是绿色
            healthBar.style.backgroundColor = "hsl(".concat(hue, ", 100%, 50%)");
            // 确保容器可见
            healthBarContainer.style.display = 'block';
        }
        else {
            console.error('Health bar elements not found!'); // 调试日志
        }
    }
    // 添加新的函数来播放道具音效
    function playPowerUpSound(bulletType) {
        // 为每种子弹类型播放独特的音效
        playSound("powerUp_".concat(bulletType));
    }
    // 添加新的函数来绘制特定类型的子弹
    function drawFireBullet(bullet) {
        ctx.fillStyle = '#FF9500';
        ctx.beginPath();
        ctx.moveTo(bullet.x, bullet.y);
        ctx.lineTo(bullet.x - bullet.width / 2, bullet.y + bullet.height);
        ctx.lineTo(bullet.x + bullet.width / 2, bullet.y + bullet.height);
        ctx.closePath();
        ctx.fill();
    }
    function drawLaserBullet(bullet) {
        ctx.save();
        // 创建渐变效果
        var gradient = ctx.createLinearGradient(bullet.x, bullet.y, bullet.x, 0);
        gradient.addColorStop(0, "rgba(0, 255, 255, ".concat(bullet.alpha, ")"));
        gradient.addColorStop(1, "rgba(0, 255, 255, 0)");
        ctx.strokeStyle = gradient;
        ctx.lineWidth = bullet.width;
        ctx.beginPath();
        ctx.moveTo(bullet.x, bullet.y);
        ctx.lineTo(bullet.x, 0);
        ctx.stroke();
        // 添加发光效果
        ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = bullet.width / 2;
        ctx.beginPath();
        ctx.moveTo(bullet.x, bullet.y);
        ctx.lineTo(bullet.x, 0);
        ctx.stroke();
        ctx.restore();
    }
    function drawSpreadBullet(bullet) {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.width / 2, 0, Math.PI * 2);
        ctx.fill();
    }
    // ... 为其他子弹类型添加类似的绘制函数
    // 添加新的函数来更新子弹持续时间
    function updateBulletDurations(deltaTime) {
        for (var bulletType in player.bulletDurations) {
            if (Object.prototype.hasOwnProperty.call(player.bulletDurations, bulletType)) {
                var duration = player.bulletDurations[bulletType];
                if (duration !== undefined) {
                    player.bulletDurations[bulletType] = duration - deltaTime;
                    if (player.bulletDurations[bulletType] <= 0) {
                        player.activeBulletTypes.delete(bulletType);
                        delete player.bulletDurations[bulletType];
                    }
                }
            }
        }
    }
    // 添加 updateBullets 函数
    function updateBullets(deltaTime) {
        bullets = bullets.filter(function (bullet, index) {
            var _a;
            if (bullet.type === BULLET_TYPES.HOMING) {
                if (bullet.target && !enemies.includes(bullet.target)) {
                    // 如果目标敌人不存在，寻找新目标
                    bullet.target = (_a = findNearestEnemy(bullet.x, bullet.y)) !== null && _a !== void 0 ? _a : undefined;
                }
                if (bullet.target) {
                    var dx = bullet.target.x - bullet.x;
                    var dy = bullet.target.y - bullet.y;
                    var distance = Math.sqrt(dx * dx + dy * dy);
                    // 使用插值来平滑火箭的移动
                    var t = Math.min(bullet.speed * (deltaTime / 16) / distance, 1);
                    bullet.x += dx * t;
                    bullet.y += dy * t;
                    // 更新火箭的角度，使其朝向目标
                    bullet.angle = Math.atan2(dy, dx);
                }
                else {
                    // 如果没有目标，直线飞行
                    bullet.y -= bullet.speed * (deltaTime / 16);
                }
            }
            else if (bullet.type === BULLET_TYPES.FLAME) {
                // 火焰弹的特殊行为
                bullet.range -= bullet.speed * (deltaTime / 16);
                if (bullet.range <= 0) {
                    return false; // 移除超出射程的火焰弹
                }
                // 创建火焰粒子效果
                createFlameParticles(bullet);
            }
            else {
                bullet.x += Math.cos(bullet.angle) * bullet.speed * (deltaTime / 16);
                bullet.y += Math.sin(bullet.angle) * bullet.speed * (deltaTime / 16);
            }
            // 移除出屏幕的子弹
            return !(bullet.y < 0 || bullet.y > canvas.height || bullet.x < 0 || bullet.x > canvas.width);
        });
    }
    function addBulletType(type, duration) {
        player.activeBulletTypes.add(type);
        player.bulletDurations[type] = duration;
        playPowerUpSound(type);
    }
    // 这里需要实现上面提到的所有视觉效果函数，例如：
    function createHealingEffect() {
        for (var i = 0; i < 20; i++) {
            particles.push({
                x: player.x + player.width / 2,
                y: player.y + player.height / 2,
                radius: Math.random() * 3 + 1,
                color: '#4CD964',
                velocity: {
                    x: (Math.random() - 0.5) * 3,
                    y: (Math.random() - 0.5) * 3
                },
                alpha: 1,
                life: 30
            });
        }
    }
    function createShieldEffect() {
        ctx.strokeStyle = 'rgba(90, 200, 250, 0.7)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(90, 200, 250, 0.3)';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width * 0.8, 0, Math.PI * 2);
        ctx.stroke();
    }
    var speedTrailInterval;
    function createSpeedTrail() {
        speedTrailInterval = window.setInterval(function () {
            particles.push({
                x: player.x + player.width / 2,
                y: player.y + player.height,
                radius: 2,
                color: '#5AC8FA',
                velocity: { x: 0, y: 2 },
                alpha: 0.7,
                life: 20
            });
        }, 50);
    }
    function removeSpeedTrail() {
        clearInterval(speedTrailInterval);
    }
    function createDoubleFiringEffect() {
        // 在玩家飞船两侧添加发光点
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(player.x + 5, player.y + 10, 3, 0, Math.PI * 2);
        ctx.arc(player.x + player.width - 5, player.y + 10, 3, 0, Math.PI * 2);
        ctx.fill();
    }
    function removeDoubleFiringEffect() {
        // 移除发光点效果（在下一帧绘制时自然消失）
    }
    function createScreenWipeEffect() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setTimeout(function () {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }, 100);
    }
    function createFireAura() {
        for (var i = 0; i < 10; i++) {
            var angle = Math.random() * Math.PI * 2;
            var distance = Math.random() * 30 + 20;
            particles.push({
                x: player.x + player.width / 2 + Math.cos(angle) * distance,
                y: player.y + player.height / 2 + Math.sin(angle) * distance,
                radius: Math.random() * 3 + 2,
                color: "hsl(".concat(Math.random() * 60 + 15, ", 100%, 50%)"),
                velocity: {
                    x: Math.cos(angle) * 2,
                    y: Math.sin(angle) * 2
                },
                alpha: 1,
                life: 30
            });
        }
    }
    function createLaserSights() {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        for (var i = -1; i <= 1; i += 0.5) {
            ctx.beginPath();
            ctx.moveTo(player.x + player.width / 2 + i * 10, player.y);
            ctx.lineTo(player.x + player.width / 2 + i * 50, 0);
            ctx.stroke();
        }
    }
    function createSpreadIndicators() {
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.lineWidth = 2;
        for (var i = -2; i <= 2; i++) {
            var angle = i * Math.PI / 12;
            ctx.beginPath();
            ctx.moveTo(player.x + player.width / 2, player.y);
            ctx.lineTo(player.x + player.width / 2 + Math.sin(angle) * 50, player.y - Math.cos(angle) * 50);
            ctx.stroke();
        }
    }
    function createMissileLaunchers() {
        ctx.fillStyle = '#808080';
        ctx.fillRect(player.x - 5, player.y + 20, 5, 10);
        ctx.fillRect(player.x + player.width, player.y + 20, 5, 10);
    }
    function createEmpField() {
        ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width, 0, Math.PI * 2);
        ctx.stroke();
    }
    function createFrostAura() {
        setInterval(function () {
            var angle = Math.random() * Math.PI * 2;
            particles.push({
                x: player.x + player.width / 2 + Math.cos(angle) * player.width / 2,
                y: player.y + player.height / 2 + Math.sin(angle) * player.height / 2,
                radius: Math.random() * 2 + 1,
                color: '#A5F2F3',
                velocity: {
                    x: Math.cos(angle) * 1.5,
                    y: Math.sin(angle) * 1.5
                },
                alpha: 0.7,
                life: 25
            });
        }, 50);
    }
    function createPiercingGlow() {
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(player.x, player.y, player.width, player.height);
        ctx.shadowBlur = 0;
    }
    function createSplitIndicators() {
        ctx.strokeStyle = 'rgba(255, 165, 0, 0.5)';
        ctx.lineWidth = 2;
        var splitAngle = Math.PI / 6;
        for (var i = -1; i <= 1; i += 2) {
            ctx.beginPath();
            ctx.moveTo(player.x + player.width / 2, player.y);
            ctx.lineTo(player.x + player.width / 2 + Math.sin(splitAngle * i) * 40, player.y - Math.cos(splitAngle * i) * 40);
            ctx.stroke();
        }
    }
    function createTimeDistortionEffect() {
        ctx.fillStyle = 'rgba(128, 0, 128, 0.2)';
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width * 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    function createGravityWellEffect() {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        for (var i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width * (0.5 + i * 0.3), 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    function createRainbowTrail() {
        setInterval(function () {
            var hue = (Date.now() / 20) % 360;
            particles.push({
                x: player.x + player.width / 2,
                y: player.y + player.height,
                radius: 3,
                color: "hsl(".concat(hue, ", 100%, 50%)"),
                velocity: { x: 0, y: 2 },
                alpha: 0.7,
                life: 30
            });
        }, 30);
    }
    function createQuantumFluctuations() {
        setInterval(function () {
            var x = player.x + Math.random() * player.width;
            var y = player.y + Math.random() * player.height;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
            setTimeout(function () {
                ctx.clearRect(x - 2, y - 2, 4, 4);
            }, 100);
        }, 50);
    }
    function createTargetingSystem() {
        enemies.forEach(function (enemy) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(player.x + player.width / 2, player.y);
            ctx.lineTo(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            ctx.stroke();
        });
    }
    function createWaveEmitters() {
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        for (var i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(player.x + player.width / 2, player.y, i * 20, 0, Math.PI, true);
            ctx.stroke();
        }
    }
    function createClusterIndicators() {
        ctx.fillStyle = 'rgba(255, 69, 0, 0.5)';
        for (var i = 0; i < 5; i++) {
            var angle = (i / 5) * Math.PI * 2;
            var x = player.x + player.width / 2 + Math.cos(angle) * player.width / 2;
            var y = player.y + player.height / 2 + Math.sin(angle) * player.height / 2;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    function createPowerUpCollectionEffect(powerUp) {
        for (var i = 0; i < 20; i++) {
            particles.push({
                x: powerUp.x + powerUp.width / 2,
                y: powerUp.y + powerUp.height / 2,
                radius: Math.random() * 3 + 1,
                color: getPowerUpColor(powerUp.type),
                velocity: {
                    x: (Math.random() - 0.5) * 5,
                    y: (Math.random() - 0.5) * 5
                },
                alpha: 1,
                life: 40
            });
        }
    }
    // 在游戏循环中调用这个函数来更新和绘制所有特效
    function updateAndDrawEffects() {
        if (player.shield > 0) {
            createShieldEffect();
            console.log("Drawing shield effect. Shield: ".concat(player.shield)); // 添加日志
        }
        if (player.speed > 5) {
            createSpeedTrail();
            console.log("Drawing speed trail. Speed: ".concat(player.speed)); // 添加日志
        }
        if (player.currentBulletType === BULLET_TYPES.DOUBLE) {
            createDoubleFiringEffect();
            console.log('Drawing double firing effect'); // 添加日志
        }
        // 遍历所有活跃的子弹类型
        player.activeBulletTypes.forEach(function (bulletType) {
            switch (bulletType) {
                case BULLET_TYPES.FIRE:
                    createFireAura();
                    console.log('Drawing fire aura'); // 添加日志
                    break;
                case BULLET_TYPES.LASER:
                    // createLaserSights();
                    console.log('Drawing laser sights'); // 添加日志
                    break;
                case BULLET_TYPES.SPREAD:
                    // createSpreadIndicators();
                    console.log('Drawing spread indicators'); // 添加日志
                    break;
                case BULLET_TYPES.MISSILE:
                    createMissileLaunchers();
                    console.log('Drawing missile launchers'); // 添加日志
                    break;
                case BULLET_TYPES.EMP:
                    createEmpField();
                    console.log('Drawing EMP field'); // 添加日志
                    break;
                case BULLET_TYPES.FREEZE:
                    createFrostAura();
                    console.log('Drawing frost aura'); // 添加日志
                    break;
                case BULLET_TYPES.PIERCE:
                    createPiercingGlow();
                    console.log('Drawing piercing glow'); // 添加日志
                    break;
                case BULLET_TYPES.SPLIT:
                    createSplitIndicators();
                    console.log('Drawing split indicators'); // 添加日志
                    break;
                case BULLET_TYPES.TIME_WARP:
                    createTimeDistortionEffect();
                    console.log('Drawing time distortion effect'); // 添加日志
                    break;
                case BULLET_TYPES.BLACK_HOLE:
                    createGravityWellEffect();
                    console.log('Drawing gravity well effect'); // 添加日志
                    break;
                case BULLET_TYPES.RAINBOW:
                    createRainbowTrail();
                    console.log('Drawing rainbow trail'); // 添加日志
                    break;
                case BULLET_TYPES.QUANTUM:
                    createQuantumFluctuations();
                    console.log('Drawing quantum fluctuations'); // 添加日志
                    break;
                case BULLET_TYPES.HOMING:
                    // createTargetingSystem();
                    console.log('Drawing targeting system'); // 添加日志
                    break;
                case BULLET_TYPES.WAVE:
                    createWaveEmitters();
                    console.log('Drawing wave emitters'); // 添加日志
                    break;
                case BULLET_TYPES.CLUSTER:
                    createClusterIndicators();
                    console.log('Drawing cluster indicators'); // 添加日志
                    break;
            }
        });
    }
})(SpaceShooterGame || (SpaceShooterGame = {}));
// 修改事件监听器，使用命名空间访问
document.addEventListener('keydown', function (e) {
    if (e.key in SpaceShooterGame.keys) {
        SpaceShooterGame.keys[e.key] = true;
    }
});
document.addEventListener('keyup', function (e) {
    if (e.key in SpaceShooterGame.keys) {
        SpaceShooterGame.keys[e.key] = false;
    }
});
// 在文档加载完成初始化游戏
document.addEventListener('DOMContentLoaded', function () {
    var _a, _b, _c, _d, _e, _f;
    SpaceShooterGame.initGame();
    (_a = document.getElementById('startButton')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', SpaceShooterGame.startGame);
    (_b = document.getElementById('restartButton')) === null || _b === void 0 ? void 0 : _b.addEventListener('click', SpaceShooterGame.startGame);
    (_c = document.getElementById('pauseButton')) === null || _c === void 0 ? void 0 : _c.addEventListener('click', SpaceShooterGame.togglePause);
    (_d = document.getElementById('difficultySelect')) === null || _d === void 0 ? void 0 : _d.addEventListener('change', function (e) {
        SpaceShooterGame.updateDifficulty(e.target.value);
    });
    (_e = document.getElementById('soundVolumeSlider')) === null || _e === void 0 ? void 0 : _e.addEventListener('input', function (e) {
        SpaceShooterGame.updateSoundVolume(parseFloat(e.target.value));
    });
    (_f = document.getElementById('musicVolumeSlider')) === null || _f === void 0 ? void 0 : _f.addEventListener('input', function (e) {
        SpaceShooterGame.updateMusicVolume(parseFloat(e.target.value));
    });
});
