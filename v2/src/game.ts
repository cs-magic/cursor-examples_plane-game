/// <reference lib="dom" />

namespace SpaceShooterGame {
    // 将 Difficulty 类型定义移到命名空间的顶部，并标记为 export
    export type Difficulty = 'easy' | 'medium' | 'hard';

    // 其他类型和接口保持不变
    type BulletType = 'normal' | 'fire' | 'laser' | 'spread' | 'missile' | 'emp' | 'freeze' | 'pierce' | 'split' | 'timeWarp' | 'blackHole' | 'rainbow' | 'quantum' | 'homing' | 'wave' | 'cluster';
    type EnemyType = 'normal' | 'fast' | 'tough' | 'boss' | 'small' | 'large';

    interface Player {
        x: number;
        y: number;
        width: number;
        height: number;
        speed: number;
        health: number;
        score: number;
        shield: number;
        specialWeapon: number;
        shootCooldown: number;
        shootInterval: number;
        currentBulletType: BulletType;
        specialWeaponDuration: number;
        dx: number;
        dy: number;
        maxHealth: number;
        invincible: boolean;
    }

    interface Enemy {
        x: number;
        y: number;
        width: number;
        height: number;
        speed: number;
        health: number;
        color: string;
        type: EnemyType;
        lastShot: number;
        shootInterval: number;
        movePattern: 'zigzag' | 'straight' | 'complex';
    }

    interface Bullet {
        x: number;
        y: number;
        width: number;
        height: number;
        speed: number;
        damage: number;
        angle: number;
        type: BulletType;
        isPlayerBullet: boolean;
        duration?: number;
    }

    interface PowerUp {
        x: number;
        y: number;
        width: number;
        height: number;
        type: 'health' | 'shield' | 'speedBoost' | 'doubleFire' | 'bomb';
        speed: number;
    }

    interface GameSettings {
        gameDuration: number;
        initialHealth: number;
        initialDifficulty: Difficulty;
        bulletTypes: BulletType[];
        enemyTypes: EnemyType[];
        difficulty: Difficulty;
        soundVolume: number;
        musicVolume: number;
    }

    interface Explosion {
        x: number;
        y: number;
        radius: number;
        maxRadius: number;
        alpha: number;
    }

    interface Level {
        number: number;
        duration: number;
        enemySpawnRate: number;
        bossSpawnTime: number;
        requiredScore: number;
    }

    interface Boss extends Enemy {
        phase: number;
        maxHealth: number;
        attackPattern: string;
        specialAttackCooldown: number;
        movePattern: 'zigzag' | 'straight' | 'complex';
    }

    // 添加粒子接口
    interface Particle {
        x: number;
        y: number;
        radius: number;
        color: string;
        velocity: { x: number; y: number };
        alpha: number;
        life: number;
    }

    // 添加成就接口
    interface Achievement {
        id: string;
        name: string;
        description: string;
        isUnlocked: boolean;
        progress: number;
        maxProgress: number;
    }

    // 添加游戏统计接口
    interface GameStats {
        enemiesDestroyed: number;
        bulletsFired: number;
        powerUpsCollected: number;
        timePlayedSeconds: number;
    }

    // 全局变量声明
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;
    let player: Player;
    let enemies: Enemy[] = [];
    let bullets: Bullet[] = [];
    let powerUps: PowerUp[] = [];
    let explosions: Explosion[] = [];
    let gameRunning = false;
    let gameTime = 0;
    let gameDifficulty = 1;
    let level = 1;
    let totalScore = 0;
    let isPaused = false;
    let powerUpTimer = 0;
    let enemySpawnInterval: number;
    let backgroundMusicInterval: number;
    let currentLevel: Level;
    let levels: Level[] = [
        { number: 1, duration: 60, enemySpawnRate: 1, bossSpawnTime: 50, requiredScore: 100 },
        { number: 2, duration: 90, enemySpawnRate: 1.5, bossSpawnTime: 75, requiredScore: 250 },
        { number: 3, duration: 120, enemySpawnRate: 2, bossSpawnTime: 100, requiredScore: 500 },
        // 添加更多关卡...
    ];
    let isBossSpawned = false;

    // 游戏设置
    let gameSettings: GameSettings = {
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
    const BULLET_TYPES: Record<string, BulletType> = {
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
        QUANTUM: 'quantum',
        HOMING: 'homing',
        WAVE: 'wave',
        CLUSTER: 'cluster'
    };

    const ENEMY_TYPES: EnemyType[] = ['normal', 'fast', 'tough', 'boss'];

    // ��频相关
    let audioContext: AudioContext;
    let masterGainNode: GainNode;
    let backgroundMusicSource: OscillatorNode | null = null;
    let soundEffects: { [key: string]: AudioBuffer } = {};

    // 触摸控制相关
    let isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    let joystickActive = false;
    let joystickPosition = { x: 0, y: 0 };

    // 添加键盘控制
    export const keys: { [key: string]: boolean } = {
        ArrowLeft: false,
        ArrowRight: false,
        ArrowUp: false,
        ArrowDown: false,
        ' ': false  // 空格键,用于射击
    };

    // 添加星星数组
    let stars: { x: number; y: number; radius: number; speed: number }[] = [];

    // 在全局变量声明部分添加
    let particles: Particle[] = [];

    // 在全局变量声明部分添加
    let achievements: Achievement[] = [
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

    // 在全局变量声明部分添加
    let gameStats: GameStats = {
        enemiesDestroyed: 0,
        bulletsFired: 0,
        powerUpsCollected: 0,
        timePlayedSeconds: 0
    };

    // 在namespace的开头添加以下变量声明
    let joystickElement: HTMLElement;
    let joystickContainerElement: HTMLElement;
    let chargeButtonElement: HTMLElement;
    let specialButtonElement: HTMLElement;

    // 在全局变量声明部分添加
    let bgmAudio: HTMLAudioElement;

    // 游戏初始化函数
    export function initGame() {
        canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        ctx = canvas.getContext('2d')!;

        // 设置画布大小
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

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
        };

        // 初始化移动控制元素
        joystickElement = document.getElementById('joystick')!;
        joystickContainerElement = document.getElementById('joystickContainer')!;
        chargeButtonElement = document.getElementById('chargeButton')!;
        specialButtonElement = document.getElementById('specialButton')!;

        // 设置触摸事件监听器
        setupTouchListeners();

        // 隐藏所有屏幕，只示开始屏幕
        document.getElementById('startScreen')!.style.display = 'flex';
        document.getElementById('endScreen')!.style.display = 'none';
        document.getElementById('victoryScreen')!.style.display = 'none';
        document.getElementById('pauseScreen')!.style.display = 'none';
        document.getElementById('mobileControls')!.style.display = 'none';
    }

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
    function handleJoystickStart(event: TouchEvent) {
        event.preventDefault();
        joystickActive = true;
        updateJoystickPosition(event.touches[0]);
    }

    function handleJoystickMove(event: TouchEvent) {
        event.preventDefault();
        if (joystickActive) {
            updateJoystickPosition(event.touches[0]);
        }
    }

    function handleJoystickEnd(event: TouchEvent) {
        event.preventDefault();
        joystickActive = false;
        joystickPosition = { x: 0, y: 0 };
        joystickElement.style.transform = 'translate(-50%, -50%)';
    }

    function updateJoystickPosition(touch: Touch) {
        const rect = joystickContainerElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const maxDistance = rect.width / 2;

        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > maxDistance) {
            dx *= maxDistance / distance;
            dy *= maxDistance / distance;
        }

        joystickPosition = {
            x: dx / maxDistance,
            y: dy / maxDistance
        };

        joystickElement.style.transform = `translate(${dx}px, ${dy}px)`;
    }

    // 添加处理充能和特殊按钮的函数
    function handleChargeStart(event: TouchEvent) {
        event.preventDefault();
        // 实现充能逻辑
    }

    function handleChargeEnd(event: TouchEvent) {
        event.preventDefault();
        // 实现充能结束逻辑
    }

    function handleSpecialStart(event: TouchEvent) {
        event.preventDefault();
        // 实现特殊武器逻辑
    }

    function handleSpecialEnd(event: TouchEvent) {
        event.preventDefault();
        // 实现特殊武器结束逻辑
    }

    // 游戏循环
    let lastTime = 0;
    function gameLoop(currentTime: number) {
        if (!gameRunning) return;
        if (isPaused) {
            requestAnimationFrame(gameLoop);
            return;
        }

        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;

        // 更新游戏时间
        gameTime += deltaTime / 1000;

        // 检查是否需要进入下一关
        if (gameTime >= currentLevel.duration || player.score >= currentLevel.requiredScore) {
            if (currentLevel.number < levels.length) {
                startNextLevel();
            } else {
                victoryGame();
            }
        }

        // 更新难度
        updateGameDifficulty();

        // 更新游戏统计
        updateGameStats(deltaTime);

        // 更新游戏对象
        updateGameObjects(deltaTime);

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

    // 更��游戏对象
    function updateGameObjects(deltaTime: number) {
        updatePlayer(deltaTime);
        updateEnemies(deltaTime);
        updateBullets(deltaTime);
        updatePowerUps(deltaTime);
        updateParticles(deltaTime);
        updateExplosions(deltaTime);  // 添加这一行
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
        drawPowerUps();
        drawParticles();
        drawExplosions();  // 添加这一行

        // 更新UI
        updateScore();

        ctx.restore();
    }

    // 添加 updateScore 函数
    function updateScore() {
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = `分数: ${player.score}`;
        }
    }

    // 更新玩家位置
    function updatePlayer(deltaTime: number) {
        if (isTouchDevice && joystickActive) {
            player.dx = joystickPosition.x * player.speed;
            player.dy = joystickPosition.y * player.speed;
        } else {
            player.dx = 0;
            player.dy = 0;
            if (keys.ArrowLeft) player.dx -= player.speed;
            if (keys.ArrowRight) player.dx += player.speed;
            if (keys.ArrowUp) player.dy -= player.speed;
            if (keys.ArrowDown) player.dy += player.speed;
        }

        player.x += player.dx * (deltaTime / 16);
        player.y += player.dy * (deltaTime / 16);

        // 确保玩家不会移出屏幕
        player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
        player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

        // 添加自动射击
        if (player.shootCooldown > 0) {
            player.shootCooldown -= deltaTime;
        } else {
            fireBullet(player);
            player.shootCooldown = player.shootInterval;
        }
    }

    // 玩家自动射击
    function playerAutoShoot() {
        if (player.shootCooldown > 0) {
            player.shootCooldown -= 16; // 假设游戏以60FPS运行，帧约16毫秒
        } else {
            fireBullet(player);
            player.shootCooldown = player.shootInterval;
        }
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

    // 添加缺失的函数
    function checkCollisions() {
        // 检查子弹与敌人的碰撞
        bullets.forEach((bullet, bulletIndex) => {
            if (bullet.isPlayerBullet) {
                enemies.forEach((enemy, enemyIndex) => {
                    if (
                        bullet.x < enemy.x + enemy.width &&
                        bullet.x + bullet.width > enemy.x &&
                        bullet.y < enemy.y + enemy.height &&
                        bullet.y + bullet.height > enemy.y
                    ) {
                        // 碰撞发生
                        bullets.splice(bulletIndex, 1);
                        enemy.health -= bullet.damage;
                        if (enemy.health <= 0) {
                            enemies.splice(enemyIndex, 1);
                            player.score += 10;
                            gameStats.enemiesDestroyed++;
                            createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width);
                        }
                    }
                });
            } else {
                // 敌人子弹击中玩家
                if (
                    bullet.x < player.x + player.width &&
                    bullet.x + bullet.width > player.x &&
                    bullet.y < player.y + player.height &&
                    bullet.y + bullet.height > player.y
                ) {
                    bullets.splice(bulletIndex, 1);
                    playerTakeDamage(bullet.damage);
                }
            }
        });

        // 修改玩家与敌人的碰撞检测
        enemies.forEach((enemy, index) => {
            if (
                player.x < enemy.x + enemy.width &&
                player.x + player.width > enemy.x &&
                player.y < enemy.y + enemy.height &&
                player.y + player.height > enemy.y
            ) {
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
        powerUps.forEach((powerUp, index) => {
            if (
                player.x < powerUp.x + powerUp.width &&
                player.x + player.width > powerUp.x &&
                player.y < powerUp.y + powerUp.height &&
                player.y + player.height > powerUp.y
            ) {
                applyPowerUp(powerUp);
                powerUps.splice(index, 1);
            }
        });
    }

    function drawExplosions() {
        ctx.save();
        explosions.forEach(explosion => {
            ctx.beginPath();
            ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 100, 0, ${explosion.alpha})`;
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
        ctx.fillText(`关卡: ${level}`, 10, 30);
        ctx.fillText(`生命值: ${player.health}/${player.maxHealth}`, 10, 60);
        ctx.fillText(`时间: ${Math.floor(gameTime)}`, 10, 90);
        ctx.fillText(`得分: ${player.score}`, 10, 120);
    }

    function checkGameEnd() {
        if (gameTime >= gameSettings.gameDuration || player.health <= 0) {
            endGame();
        }
    }

    function generatePowerUps() {
        if (Math.random() < 0.005) { // 0.5% 概率生成道具
            spawnPowerUp(Math.random() * (canvas.width - 30), -30);
        }
    }

    function drawPowerUps() {
        powerUps.forEach((powerUp) => {
            ctx.fillStyle = getPowerUpColor(powerUp.type);
            ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height);
        });
    }

    function getPowerUpColor(type: PowerUp['type']): string {
        switch (type) {
            case 'shield': return '#5AC8FA';
            case 'health': return '#4CD964';
            default: return '#FF9500';
        }
    }

    function createExplosion(x: number, y: number, size: number = 30) {
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

    function spawnPowerUp(x: number, y: number) {
        const powerUpTypes: PowerUp['type'][] = ['health', 'shield', 'speedBoost', 'doubleFire', 'bomb'];
        const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        powerUps.push({
            x: x,
            y: y,
            width: 30,
            height: 30,
            type: type,
            speed: 2
        });
    }

    // 修改 fireBullet 函数以确保玩家子弹被创建
    function fireBullet(shooter: Player | Enemy) {
        const bulletSpeed = shooter === player ? 10 : 5;
        const angle = shooter === player ? -Math.PI / 2 : Math.PI / 2;
        const bulletType = shooter === player ? player.currentBulletType : BULLET_TYPES.NORMAL;

        let newBullet: Bullet;
        switch (bulletType) {
            case BULLET_TYPES.NORMAL:
                newBullet = createNormalBullet(shooter, bulletSpeed, angle);
                break;
            // ... 其他子弹类型的 case ...
            default:
                newBullet = createNormalBullet(shooter, bulletSpeed, angle);
        }

        bullets.push(newBullet);

        if (shooter === player) {
            gameStats.bulletsFired++;
            playSound('shoot');
        }
    }

    // 确保 createNormalBullet 函数正确创建子弹
    function createNormalBullet(shooter: Player | Enemy, speed: number, angle: number): Bullet {
        return {
            x: shooter.x + shooter.width / 2,
            y: shooter === player ? shooter.y : shooter.y + shooter.height,
            width: 4,
            height: 10,
            speed: speed,
            damage: shooter === player ? 1 : 0.5,
            angle: angle,
            type: BULLET_TYPES.NORMAL,
            isPlayerBullet: shooter === player
        };
    }

    function createFireBullet(shooter: Player) {
        const bullet: Bullet = {
            x: shooter.x + shooter.width / 2,
            y: shooter.y,
            width: 10,
            height: 20,
            speed: 15,
            damage: 2,
            angle: -Math.PI / 2,
            type: BULLET_TYPES.FIRE,
            isPlayerBullet: true
        };
        bullets.push(bullet);
    }

    function createLaserBullet(shooter: Player) {
        const laser: Bullet = {
            x: shooter.x + shooter.width / 2,
            y: shooter.y,
            width: 4,
            height: canvas.height,
            speed: 0,
            damage: 0.5,
            angle: -Math.PI / 2,
            type: BULLET_TYPES.LASER,
            isPlayerBullet: true,
            duration: 30
        };
        bullets.push(laser);
    }

    function createSpreadBullets(shooter: Player) {
        for (let i = -2; i <= 2; i++) {
            const bullet: Bullet = {
                x: shooter.x + shooter.width / 2,
                y: shooter.y,
                width: 6,
                height: 6,
                speed: 18,
                damage: 1,
                angle: -Math.PI / 2 + i * Math.PI / 12,
                type: BULLET_TYPES.SPREAD,
                isPlayerBullet: true
            };
            bullets.push(bullet);
        }
    }

    function createHomingBullet(shooter: Player | Enemy) {
        const bullet: Bullet = {
            x: shooter.x + shooter.width / 2,
            y: shooter === player ? shooter.y : shooter.y + shooter.height,
            width: 8,
            height: 8,
            speed: 10,
            damage: 2,
            angle: shooter === player ? -Math.PI / 2 : Math.PI / 2,
            type: BULLET_TYPES.HOMING,
            isPlayerBullet: shooter === player
        };
        bullets.push(bullet);
    }

    function createWaveBullet(shooter: Player) {
        const bullet: Bullet = {
            x: shooter.x + shooter.width / 2,
            y: shooter.y,
            width: 10,
            height: 10,
            speed: 8,
            damage: 1.5,
            angle: -Math.PI / 2,
            type: BULLET_TYPES.WAVE,
            isPlayerBullet: true
        };
        bullets.push(bullet);
    }

    function createClusterBullet(shooter: Player) {
        const bullet: Bullet = {
            x: shooter.x + shooter.width / 2,
            y: shooter.y,
            width: 12,
            height: 12,
            speed: 6,
            damage: 1,
            angle: -Math.PI / 2,
            type: BULLET_TYPES.CLUSTER,
            isPlayerBullet: true
        };
        bullets.push(bullet);
    }

    function updateBullets(deltaTime: number) {
        bullets.forEach((bullet, index) => {
            switch (bullet.type) {
                case BULLET_TYPES.NORMAL:
                case BULLET_TYPES.FIRE:
                case BULLET_TYPES.SPREAD:
                    bullet.y += bullet.speed * Math.sin(bullet.angle) * (deltaTime / 16);
                    bullet.x += bullet.speed * Math.cos(bullet.angle) * (deltaTime / 16);
                    break;
                case BULLET_TYPES.LASER:
                    if (bullet.duration !== undefined) {
                        bullet.duration -= deltaTime / 16;
                        if (bullet.duration <= 0) {
                            returnBulletToPool(bullet);
                            bullets.splice(index, 1);
                        }
                    }
                    break;
                case BULLET_TYPES.HOMING:
                    updateHomingBullet(bullet, deltaTime);
                    break;
                case BULLET_TYPES.WAVE:
                    updateWaveBullet(bullet, deltaTime);
                    break;
                case BULLET_TYPES.CLUSTER:
                    updateClusterBullet(bullet, deltaTime);
                    break;
            }

            if (bullet.y < 0 || bullet.y > canvas.height || bullet.x < 0 || bullet.x > canvas.width) {
                returnBulletToPool(bullet);
                bullets.splice(index, 1);
            }
        });
    }

    function updateHomingBullet(bullet: Bullet, deltaTime: number) {
        const target = findNearestEnemy(bullet.x, bullet.y);
        if (target) {
            const dx = target.x - bullet.x;
            const dy = target.y - bullet.y;
            const angle = Math.atan2(dy, dx);
            bullet.angle = angle;
        }
        bullet.x += bullet.speed * Math.cos(bullet.angle) * (deltaTime / 16);
        bullet.y += bullet.speed * Math.sin(bullet.angle) * (deltaTime / 16);
    }

    function updateWaveBullet(bullet: Bullet, deltaTime: number) {
        bullet.y -= bullet.speed * (deltaTime / 16);
        bullet.x += Math.sin(bullet.y * 0.1) * 3 * (deltaTime / 16);
    }

    function updateClusterBullet(bullet: Bullet, deltaTime: number) {
        bullet.y -= bullet.speed * (deltaTime / 16);
        if (bullet.y < canvas.height / 2) {
            splitClusterBullet(bullet);
        }
    }

    function splitClusterBullet(bullet: Bullet) {
        for (let i = -1; i <= 1; i += 2) {
            const newBullet: Bullet = {
                ...bullet,
                angle: -Math.PI / 2 + i * Math.PI / 6,
                speed: bullet.speed * 1.5,
                type: BULLET_TYPES.NORMAL
            };
            bullets.push(newBullet);
        }
        bullets = bullets.filter(b => b !== bullet);
    }

    function findNearestEnemy(x: number, y: number): Enemy | undefined {
        let nearestEnemy: Enemy | undefined;
        let minDistance = Infinity;
        enemies.forEach(enemy => {
            const distance = Math.sqrt(Math.pow(enemy.x - x, 2) + Math.pow(enemy.y - y, 2));
            if (distance < minDistance) {
                minDistance = distance;
                nearestEnemy = enemy;
            }
        });
        return nearestEnemy;
    }

    function drawBullets() {
        bullets.forEach(bullet => {
            switch (bullet.type) {
                case BULLET_TYPES.NORMAL:
                    ctx.fillStyle = bullet.isPlayerBullet ? '#5AC8FA' : '#FF3B30';
                    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
                    break;
                case BULLET_TYPES.FIRE:
                    ctx.fillStyle = '#FF9500';
                    ctx.beginPath();
                    ctx.moveTo(bullet.x, bullet.y);
                    ctx.lineTo(bullet.x - bullet.width / 2, bullet.y + bullet.height);
                    ctx.lineTo(bullet.x + bullet.width / 2, bullet.y + bullet.height);
                    ctx.closePath();
                    ctx.fill();
                    break;
                case BULLET_TYPES.LASER:
                    ctx.strokeStyle = '#00FFFF';
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
                case BULLET_TYPES.HOMING:
                    ctx.fillStyle = '#FF00FF';
                    ctx.beginPath();
                    ctx.arc(bullet.x, bullet.y, bullet.width / 2, 0, Math.PI * 2);
                    ctx.fill();
                    break;
                case BULLET_TYPES.WAVE:
                    ctx.strokeStyle = '#00FFFF';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(bullet.x - bullet.width / 2, bullet.y);
                    ctx.lineTo(bullet.x + bullet.width / 2, bullet.y);
                    ctx.stroke();
                    break;
                case BULLET_TYPES.CLUSTER:
                    ctx.fillStyle = '#FFFF00';
                    ctx.beginPath();
                    ctx.moveTo(bullet.x, bullet.y - bullet.height / 2);
                    ctx.lineTo(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2);
                    ctx.lineTo(bullet.x - bullet.width / 2, bullet.y + bullet.height / 2);
                    ctx.closePath();
                    ctx.fill();
                    break;
                // 添加其他子弹类型的绘制逻辑...
            }
        });
    }

    function spawnEnemy() {
        const enemyTypes: EnemyType[] = ['normal', 'fast', 'tough', 'small', 'large'];
        const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        const enemy: Enemy = {
            x: Math.random() * (canvas.width - 60),
            y: -60,
            width: 50,
            height: 50,
            speed: 2,
            health: 1,
            color: '#FF3B30',
            type: enemyType,
            lastShot: 0,
            shootInterval: 2000 + Math.random() * 2000, // 2-4秒间隔
            movePattern: Math.random() < 0.3 ? 'zigzag' : 'straight' // 30%概率zigzag移动
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
        for (let i = 0; i < 100; i++) {
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

    function updateEnemies(deltaTime: number) {
        const now = Date.now();
        enemies.forEach((enemy, index) => {
            if (enemy.type === 'boss') {
                updateBoss(enemy as Boss, deltaTime);
            } else {
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
    function drawEnemy(enemy: Enemy) {
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

        ctx.restore();
    }

    // 添加一个辅助函数来调亮颜色
    function lightenColor(color: string, percent: number): string {
        const num = parseInt(color.replace("#",""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        G = (num >> 8 & 0x00FF) + amt,
        B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255)).toString(16).slice(1);
    }

    function checkPlayerEnemyCollision() {
        enemies.forEach((enemy, index) => {
            if (
                player.x < enemy.x + enemy.width &&
                player.x + player.width > enemy.x &&
                player.y < enemy.y + enemy.height &&
                player.y + player.height > enemy.y
            ) {
                // 碰撞发生
                if (player.shield > 0) {
                    // 如果玩家有护盾，摧毁敌人并减少护盾
                    enemies.splice(index, 1);
                    player.shield -= 20;
                    createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                    playSound('explosion');
                } else {
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
        document.getElementById('endScreen')!.style.display = 'flex';
        document.getElementById('mobileControls')!.style.display = 'none';
        document.getElementById('finalScore')!.textContent = `最终分: ${player.score}`;
    }

    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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

        // 初始化背景音乐
        bgmAudio = new Audio('assets/background.mp3');
        bgmAudio.loop = true;
        bgmAudio.volume = 0.3; // 设置初始音量
    }

    function loadSound(name: string, url: string) {
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
            .then(audioBuffer => {
                soundEffects[name] = audioBuffer;
            })
            .catch(error => console.error('Error loading sound:', error));
    }

    function playSound(type: string) {
        if (soundEffects[type]) {
            const source = audioContext.createBufferSource();
            source.buffer = soundEffects[type];
            
            // 创建一个增益节点来控制音量
            const gainNode = audioContext.createGain();
            
            // 根据音效类型设置不同的音量
            switch(type) {
                case 'shoot':
                    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime); // 将普通射击音量降低到 20%
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
    export function startGame() {
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
        document.getElementById('startScreen')!.style.display = 'none';
        canvas.style.display = 'block';
        // 只在触摸设备上显示移动控制器
        if (isTouchDevice) {
            document.getElementById('mobileControls')!.style.display = 'flex';
        } else {
            document.getElementById('mobileControls')!.style.display = 'none';
        }
        document.getElementById('score')!.style.display = 'block';

        // 初始化游元素
        createStars();
        clearInterval(enemySpawnInterval);
        enemySpawnInterval = window.setInterval(spawnEnemy, 1000 / gameDifficulty);

        // 初始化音频并播放背景音乐
        initAudio();
        playBGM();

        // 开始游戏循环
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);

        updateHealthBar();
    }

    // 获取难度值
    function getDifficultyValue(difficulty: Difficulty): number {
        switch (difficulty) {
            case 'easy': return 1;
            case 'medium': return 1.5;
            case 'hard': return 2;
            default: return 1.5;
        }
    }

    // 在这里添加其他游戏函数...

    function startNextLevel() {
        currentLevel = levels[currentLevel.number];
        gameTime = 0;
        isBossSpawned = false;
        // 可以在这里添加关卡过渡的逻辑
    }

    function victoryGame() {
        gameRunning = false;
        clearInterval(enemySpawnInterval);
        stopBGM();
        playSound('victory');
        document.getElementById('victoryScreen')!.style.display = 'flex';
        document.getElementById('finalScore')!.textContent = `最终分数: ${player.score}`;
    }

    function spawnBoss() {
        const boss: Boss = {
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
        };
        enemies.push(boss as Enemy);
        isBossSpawned = true;
    }

    function updateBoss(boss: Boss, deltaTime: number) {
        // Boss的移动模式
        boss.x += Math.sin(gameTime * 0.05) * 3 * (deltaTime / 16);
        boss.y = Math.min(boss.y + boss.speed * (deltaTime / 16), canvas.height / 4);

        // Boss的攻击模式
        if (Date.now() - boss.lastShot > boss.shootInterval) {
            switch (boss.attackPattern) {
                case 'normal':
                    fireBullet(boss as Enemy);
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
        } else if (boss.health < boss.maxHealth * 0.25 && boss.phase === 2) {
            boss.phase = 3;
            boss.attackPattern = 'laser';
            boss.shootInterval = 1500;
        }
    }

    function drawBoss(boss: Boss) {
        ctx.fillStyle = boss.color;
        ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
        
        // 绘制Boss血条
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(boss.x, boss.y - 20, boss.width, 10);
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(boss.x, boss.y - 20, boss.width * (boss.health / boss.maxHealth), 10);
    }

    // 添加新的函数
    export function togglePause() {
        isPaused = !isPaused;
        if (isPaused) {
            bgmAudio.pause();
        } else {
            bgmAudio.play();
        }
        document.getElementById('pauseButton')!.textContent = isPaused ? '继续' : '暂停';
    }

    // 添加新的函数
    function saveSettings() {
        localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
    }

    function loadSettings() {
        const savedSettings = localStorage.getItem('gameSettings');
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
    export function updateDifficulty(difficulty: Difficulty) {
        gameSettings.difficulty = difficulty;
        saveSettings();
    }

    export function updateSoundVolume(volume: number) {
        gameSettings.soundVolume = volume;
        masterGainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        saveSettings();
    }

    export function updateMusicVolume(volume: number) {
        gameSettings.musicVolume = volume;
        updateBGMVolume(volume);
        saveSettings();
    }

    // 添加 Boss 特殊攻击函数
    function bossSpecialAttack(boss: Boss) {
        switch (boss.phase) {
            case 1:
                // 第一阶段特殊攻击：环形子弹
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    createBossBullet(boss, 5, angle);
                }
                break;
            case 2:
                // 第二阶段特殊攻击：追踪导弹
                for (let i = 0; i < 3; i++) {
                    createHomingBullet(boss as Enemy);
                }
                break;
            case 3:
                // 第三阶段特殊攻击：激光扫射
                fireSweepingLaser(boss);
                break;
        }
    }

    // 添加 Boss 子弹创建函数
    function createBossBullet(boss: Boss, speed: number, angle: number) {
        const bullet: Bullet = {
            x: boss.x + boss.width / 2,
            y: boss.y + boss.height,
            width: 8,
            height: 8,
            speed: speed,
            damage: 2,
            angle: angle,
            type: BULLET_TYPES.NORMAL,
            isPlayerBullet: false
        };
        bullets.push(bullet);
    }

    // 添加激光扫射函数
    function fireSweepingLaser(boss: Boss) {
        const laser: Bullet = {
            x: boss.x + boss.width / 2,
            y: boss.y + boss.height,
            width: 4,
            height: canvas.height,
            speed: 0,
            damage: 0.5,
            angle: Math.PI / 2,
            type: BULLET_TYPES.LASER,
            isPlayerBullet: false,
            duration: 120
        };
        bullets.push(laser);
    }

    // 添加创建粒子函数
    function createParticle(x: number, y: number, color: string): Particle {
        const particle = getParticleFromPool();
        // 设置粒子属性
        particle.x = x;
        particle.y = y;
        particle.color = color;
        // ... (其他属性设置)
        return particle;
    }

    // 添加更新粒子函数
    function updateParticles(deltaTime: number) {
        particles = particles.filter(particle => {
            particle.x += particle.velocity.x * (deltaTime / 16);
            particle.y += particle.velocity.y * (deltaTime / 16);
            particle.alpha -= deltaTime * 0.02;
            particle.life -= deltaTime / 16;
            return particle.alpha > 0 && particle.life > 0;
        });
    }

    // 添加绘制粒子函数
    function drawParticles() {
        particles.forEach(particle => {
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
        achievements.forEach(achievement => {
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
    function showAchievementNotification(achievement: Achievement) {
        // 实现成就通知UI
        console.log(`成就解锁：${achievement.name}`);
    }

    // 添加应用道具效果函数
    function applyPowerUp(powerUp: PowerUp) {
        switch (powerUp.type) {
            case 'health':
                player.health = Math.min(player.health + 20, 100);
                break;
            case 'shield':
                player.shield = Math.min(player.shield + 50, 100);
                break;
            case 'speedBoost':
                player.speed *= 1.5;
                setTimeout(() => { player.speed /= 1.5; }, 5000);
                break;
            case 'doubleFire':
                player.currentBulletType = BULLET_TYPES.DOUBLE;
                setTimeout(() => { player.currentBulletType = BULLET_TYPES.NORMAL; }, 10000);
                break;
            case 'bomb':
                clearAllEnemies();
                break;
        }
        gameStats.powerUpsCollected++;
        playSound('powerUp');
    }

    // 添加清除所有敌人函数
    function clearAllEnemies() {
        enemies.forEach(enemy => {
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
    function updateGameStats(deltaTime: number) {
        gameStats.timePlayedSeconds += deltaTime / 1000;
    }

    // 添加绘制游戏统计函数
    function drawGameStats() {
        ctx.fillStyle = '#FFF';
        ctx.font = '14px Arial';
        ctx.fillText(`敌人消灭: ${gameStats.enemiesDestroyed}`, canvas.width - 150, 30);
        ctx.fillText(`子弹发射: ${gameStats.bulletsFired}`, canvas.width - 150, 50);
        ctx.fillText(`道具收集: ${gameStats.powerUpsCollected}`, canvas.width - 150, 70);
        ctx.fillText(`游戏时间: ${Math.floor(gameStats.timePlayedSeconds)}s`, canvas.width - 150, 90);
    }

    // 添加视觉效果：屏幕震动
    let screenShake = 0;
    function shakeScreen() {
        screenShake = 10;
    }

    function applyScreenShake() {
        if (screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * screenShake;
            const shakeY = (Math.random() - 0.5) * screenShake;
            ctx.translate(shakeX, shakeY);
            screenShake--;
        }
    }



    // 在适当的地方调用 shakeScreen 函数，例如在玩家受到伤害时
    function playerTakeDamage(damage: number) {
        if (player.shield > 0) {
            player.shield = Math.max(0, player.shield - damage);
            playSound('shieldHit');
        } else {
            player.health = Math.max(0, player.health - damage);
            playSound('playerHit');
            shakeScreen();
        }

        // 添加无敌时间
        player.invincible = true;
        setTimeout(() => {
            player.invincible = false;
        }, 1000); // 1秒无敌时间

        if (player.health <= 0) {
            endGame();
        }

        updateHealthBar();
    }

    // 优化性能：对象池
    const bulletPool: Bullet[] = [];
    const particlePool: Particle[] = [];

    function getBulletFromPool(): Bullet {
        return bulletPool.pop() || createNewBullet();
    }

    function returnBulletToPool(bullet: Bullet) {
        bulletPool.push(bullet);
    }

    function getParticleFromPool(): Particle {
        return particlePool.pop() || createNewParticle();
    }

    function returnParticleToPool(particle: Particle) {
        particlePool.push(particle);
    }

    // 修改 createBullet 函数以使用对象池
    function createBullet(shooter: Player | Enemy, bulletType: BulletType): Bullet {
        const bullet = getBulletFromPool();
        // 设置子弹属性
        // ...
        return bullet;
    }






    // 加 updatePowerUps 函数
    function updatePowerUps(deltaTime: number) {
        powerUps.forEach((powerUp, index) => {
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
    function fireSpreadBullets(boss: Boss) {
        for (let i = -2; i <= 2; i++) {
            createBossBullet(boss, 5, Math.PI / 2 + i * Math.PI / 12);
        }
    }

    // 添加 fireLaser 函数
    function fireLaser(boss: Boss) {
        const laser: Bullet = {
            x: boss.x + boss.width / 2,
            y: boss.y + boss.height,
            width: 4,
            height: canvas.height,
            speed: 0,
            damage: 0.5,
            angle: Math.PI / 2,
            type: BULLET_TYPES.LASER,
            isPlayerBullet: false,
            duration: 60
        };
        bullets.push(laser);
    }

    // 添加 createNewBullet 和 createNewParticle 函数
    function createNewBullet(): Bullet {
        return {
            x: 0,
            y: 0,
            width: 4,
            height: 10,
            speed: 0,
            damage: 1,
            angle: 0,
            type: BULLET_TYPES.NORMAL,
            isPlayerBullet: true
        };
    }

    function createNewParticle(): Particle {
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
    function updateExplosions(deltaTime: number) {
        explosions = explosions.filter(explosion => {
            explosion.radius += deltaTime * 0.05;
            explosion.alpha -= deltaTime * 0.001;
            return explosion.alpha > 0;
        });
    }

    // 添加 createExplosionParticles 函数
    function createExplosionParticles(x: number, y: number, size: number) {
        const particleCount = Math.floor(size * 2);
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            particles.push({
                x: x,
                y: y,
                radius: Math.random() * 3 + 1,
                color: `hsl(${Math.random() * 60 + 15}, 100%, ${Math.random() * 50 + 50}%)`,
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
    function updateBGMVolume(volume: number) {
        if (bgmAudio) {
            bgmAudio.volume = volume;
        }
    }

    function updateHealthBar() {
        const healthBar = document.getElementById('healthBar');
        const healthBarContainer = document.getElementById('healthBarContainer');
        if (healthBar && healthBarContainer) {
            const healthPercentage = (player.health / player.maxHealth) * 100;
            healthBar.style.width = `${healthPercentage}%`;
            console.log(`Updating health bar: ${healthPercentage}%`); // 调试日志
            
            // 根据生命值改变颜色
            const hue = (healthPercentage / 100) * 120; // 0 是红色，120 是绿色
            healthBar.style.backgroundColor = `hsl(${hue}, 100%, 50%)`;
            
            // 确保容器可见
            healthBarContainer.style.display = 'block';
        } else {
            console.error('Health bar elements not found!'); // 调试日志
        }
    }
}

// 修改事件监听器，使用命名空间访问
document.addEventListener('keydown', (e) => {
    if (e.key in SpaceShooterGame.keys) {
        SpaceShooterGame.keys[e.key] = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key in SpaceShooterGame.keys) {
        SpaceShooterGame.keys[e.key] = false;
    }
});

// 在文档加载完成后初始化游戏
document.addEventListener('DOMContentLoaded', () => {
    SpaceShooterGame.initGame();
    document.getElementById('startButton')?.addEventListener('click', SpaceShooterGame.startGame);
    document.getElementById('pauseButton')?.addEventListener('click', SpaceShooterGame.togglePause);
    document.getElementById('difficultySelect')?.addEventListener('change', (e) => {
        SpaceShooterGame.updateDifficulty((e.target as HTMLSelectElement).value as SpaceShooterGame.Difficulty);
    });
    document.getElementById('soundVolumeSlider')?.addEventListener('input', (e) => {
        SpaceShooterGame.updateSoundVolume(parseFloat((e.target as HTMLInputElement).value));
    });
    document.getElementById('musicVolumeSlider')?.addEventListener('input', (e) => {
        SpaceShooterGame.updateMusicVolume(parseFloat((e.target as HTMLInputElement).value));
    });
});