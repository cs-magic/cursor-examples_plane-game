console.log('游戏初始化开始');

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let game = {
    width: 0,
    height: 0,
    player: null,
    enemies: [],
    bullets: [],
    powerUps: [],
    level: 1,
    score: 0,
    isRunning: false,
    lastTime: 0,
    enemySpawnTimer: 0,
    powerUpSpawnTimer: 0
};

function resizeCanvas() {
    const aspectRatio = 9 / 16;
    const windowRatio = window.innerWidth / window.innerHeight;
    
    if (windowRatio > aspectRatio) {
        canvas.height = window.innerHeight;
        canvas.width = canvas.height * aspectRatio;
    } else {
        canvas.width = window.innerWidth;
        canvas.height = canvas.width / aspectRatio;
    }

    game.width = canvas.width;
    game.height = canvas.height;
    console.log(`画布大小调整为 ${game.width}x${game.height}`);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function initGame() {
    console.log('初始化游戏');
    game.player = new Player(game.width / 2, game.height - 50);
    game.isRunning = true;
    game.level = 1;
    game.score = 0;
    game.enemies = [];
    game.bullets = [];
    game.powerUps = [];
    updateUI();

    // 添加用户交互检查
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            playBGM();
            requestAnimationFrame(gameLoop);
        });
    } else {
        playBGM();
        requestAnimationFrame(gameLoop);
    }
}

function gameLoop(currentTime) {
    const deltaTime = (currentTime - game.lastTime) / 1000;
    game.lastTime = currentTime;

    update(deltaTime);
    render();

    if (game.isRunning) {
        requestAnimationFrame(gameLoop);
    }
}

function update(deltaTime) {
    const levelConfig = getLevelConfig(game.level);

    game.player.energy = Math.min(game.player.energy + 5 * deltaTime, 100);

    game.enemySpawnTimer += deltaTime;
    if (game.enemySpawnTimer > 1 && game.enemies.length < levelConfig.enemyCount) {
        spawnEnemy();
        game.enemySpawnTimer = 0;
    }

    game.powerUpSpawnTimer += deltaTime;
    if (game.powerUpSpawnTimer > levelConfig.powerUpFrequency / 1000) {
        spawnPowerUp();
        game.powerUpSpawnTimer = 0;
    }

    game.enemies.forEach(enemy => enemy.update());
    game.bullets.forEach(bullet => bullet.update());
    game.powerUps.forEach(powerUp => powerUp.update());

    checkCollisions();

    if (game.enemies.length === 0 && game.level <= levels.length) {
        levelComplete();
    }

    updateUI();
}

function render() {
    ctx.clearRect(0, 0, game.width, game.height);
    game.player.draw(ctx);
    game.enemies.forEach(enemy => enemy.draw(ctx));
    game.bullets.forEach(bullet => bullet.draw(ctx));
    game.powerUps.forEach(powerUp => powerUp.draw(ctx));
}

function spawnEnemy() {
    const levelConfig = getLevelConfig(game.level);
    const x = randomBetween(0, game.width - 40);
    const y = -60;
    const width = 40;
    const height = 60;
    const color = `rgb(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255})`;
    const health = Math.ceil(levelConfig.enemyHealth);
    const speed = levelConfig.enemySpeed;
    game.enemies.push(new Enemy(x, y, width, height, color, health, speed));
    console.log('生成新敌人');
}

function spawnPowerUp() {
    const x = randomBetween(0, game.width - 30);
    const y = -30;
    const types = ['health', 'energy', 'speed'];
    const type = types[Math.floor(Math.random() * types.length)];
    game.powerUps.push(new PowerUp(x, y, type));
    console.log(`生成新道具: ${type}`);
}

function checkCollisions() {
    for (let i = game.enemies.length - 1; i >= 0; i--) {
        const enemy = game.enemies[i];
        if (collision(game.player, enemy)) {
            game.player.health -= 10;
            game.enemies.splice(i, 1);
            playSound('explosion');
            console.log('玩家与敌人碰撞');
            if (game.player.health <= 0) {
                gameOver();
            }
        }

        for (let j = game.bullets.length - 1; j >= 0; j--) {
            const bullet = game.bullets[j];
            if (collision(bullet, enemy)) {
                enemy.health -= 10;
                game.bullets.splice(j, 1);
                if (enemy.health <= 0) {
                    game.enemies.splice(i, 1);
                    game.score += 100;
                    playSound('explosion');
                    console.log('敌人被击毁');
                }
                break;
            }
        }
    }

    for (let i = game.powerUps.length - 1; i >= 0; i--) {
        const powerUp = game.powerUps[i];
        if (collision(game.player, powerUp)) {
            powerUp.applyEffect(game.player);
            game.powerUps.splice(i, 1);
        }
    }
}

function collision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

function updateUI() {
    document.getElementById('score').textContent = `得分: ${game.score}`;
    document.getElementById('health-bar').style.width = `${game.player.health}%`;
    document.getElementById('energy-bar').style.width = `${game.player.energy}%`;
}

function levelComplete() {
    game.isRunning = false;
    stopBGM();
    playSound('powerUp'); // 使用 powerUp 音效作为关卡完成的音效
    document.getElementById('level-complete').classList.remove('hidden');
    console.log(`第 ${game.level} 关完成`);
}

function gameOver() {
    game.isRunning = false;
    stopBGM();
    playSound('gameOver');
    document.getElementById('game-over').classList.remove('hidden');
    console.log('游戏结束');
}

document.addEventListener('keydown', (e) => {
    if (!game.isRunning) return;

    switch (e.key) {
        case 'ArrowLeft':
            game.player.move(-1, 0);
            break;
        case 'ArrowRight':
            game.player.move(1, 0);
            break;
        case 'ArrowUp':
            game.player.move(0, -1);
            break;
        case 'ArrowDown':
            game.player.move(0, 1);
            break;
        case ' ':
            game.player.shoot();
            break;
    }
});

document.getElementById('menu-button').addEventListener('click', toggleMenu);
document.getElementById('next-level').addEventListener('click', startNextLevel);
document.getElementById('restart').addEventListener('click', restartGame);

function toggleMenu() {
    console.log('切换菜单');
    const menu = document.getElementById('menu');
    menu.classList.toggle('hidden');
    game.isRunning = menu.classList.contains('hidden');
    if (game.isRunning) {
        playBGM();
    } else {
        stopBGM();
    }
}

function startNextLevel() {
    console.log('开始下一关');
    game.level++;
    document.getElementById('level-complete').classList.add('hidden');
    initLevel(game.level);
}

function restartGame() {
    console.log('重新开始游戏');
    document.getElementById('game-over').classList.add('hidden');
    initGame();
}

function initLevel(level) {
    console.log(`初始化第 ${level} 关`);
    game.enemies = [];
    game.bullets = [];
    game.powerUps = [];
    game.player.health = 100;
    game.player.energy = 100;
    game.isRunning = true;
    playBGM();
}

console.log('游戏初始化完成');
initGame();