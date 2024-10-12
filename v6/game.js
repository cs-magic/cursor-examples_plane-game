let scene, camera, renderer, player, enemies = [], bullets = [], particles = [], lastTime = 0;
let gameActive = false;
let keys = {};
let lastShootTime = 0;
const shootInterval = 200; // 射击间隔（毫秒）
let gameStarted = false;
const objectPool = {
    enemies: [],
    bullets: [],
    particles: []
};
let shootSound, explosionSound, backgroundMusic;

const GAME_WIDTH = 6;  // 游戏宽度
const GAME_HEIGHT = 8; // 游戏高度
const PLAYER_SIZE = 0.3; // 玩家飞机的大小

function init() {
    // 创建场景
    scene = new THREE.Scene();

    // 创建相机
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = GAME_HEIGHT / 2;

    // 创建渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);

    // 添加背景
    createBackground();

    // 创建玩家飞机
    createPlayer();

    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // 添加平行光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 0);
    scene.add(directionalLight);

    // 添加事件监听器
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('touchmove', onTouchMove, false);
    document.addEventListener('touchstart', onTouchStart, false);
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);

    // 创建开始界面
    createStartScreen();

    // 加载音效
    loadSounds();

    // 开始游戏循环
    gameActive = true;
    lastTime = performance.now();
    animate();
}

function animate(time) {
    if (!gameActive || !gameStarted) return;

    requestAnimationFrame(animate);

    const delta = (time - lastTime) / 1000;
    lastTime = time;

    updateGameLogic(delta);
    renderer.render(scene, camera);
}

function createBackground() {
    const loader = new THREE.TextureLoader();
    const texture = loader.load('assets/space_background.jpg', () => {
        const rt = new THREE.WebGLCubeRenderTarget(texture.image.height);
        rt.fromEquirectangularTexture(renderer, texture);
        scene.background = rt.texture;
    });
}

function createPlayer() {
    const geometry = new THREE.ConeGeometry(PLAYER_SIZE, PLAYER_SIZE * 2, 32);
    const material = new THREE.MeshPhongMaterial({ color: 0x00ff00, shininess: 100 });
    player = new THREE.Mesh(geometry, material);
    player.rotation.x = Math.PI;
    player.position.set(0, -GAME_HEIGHT / 2 + PLAYER_SIZE, 0);
    scene.add(player);
}

function onTouchStart(event) {
    event.preventDefault();
    shootBullet();
}

function shootBullet() {
    const currentTime = Date.now();
    if (currentTime - lastShootTime < shootInterval) return;
    
    lastShootTime = currentTime;
    
    let bullet;
    if (objectPool.bullets.length > 0) {
        bullet = objectPool.bullets.pop();
        bullet.position.set(player.position.x, player.position.y + PLAYER_SIZE, player.position.z);
    } else {
        const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    }
    scene.add(bullet);
    bullets.push(bullet);

    shootSound.play();
}

function createEnemy() {
    let enemy;
    if (objectPool.enemies.length > 0) {
        enemy = objectPool.enemies.pop();
        enemy.position.set(
            Math.random() * GAME_WIDTH - GAME_WIDTH / 2,
            GAME_HEIGHT / 2,
            0
        );
    } else {
        const geometry = new THREE.TetrahedronGeometry(PLAYER_SIZE);
        const material = new THREE.MeshPhongMaterial({ color: 0xff0000, shininess: 100 });
        enemy = new THREE.Mesh(geometry, material);
    }
    enemy.rotation.x = Math.random() * Math.PI;
    enemy.rotation.y = Math.random() * Math.PI;
    scene.add(enemy);
    enemies.push(enemy);
}

function createExplosion(position) {
    const particleCount = 20;
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    for (let i = 0; i < particleCount; i++) {
        positions.push((Math.random() - 0.5) * 0.5);
        positions.push((Math.random() - 0.5) * 0.5);
        positions.push((Math.random() - 0.5) * 0.5);

        colors.push(1);
        colors.push(Math.random() * 0.5 + 0.5);
        colors.push(0);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({ size: 0.1, vertexColors: true });
    const points = new THREE.Points(geometry, material);
    points.position.copy(position);
    scene.add(points);
    particles.push({ points, createdAt: Date.now() });

    explosionSound.play();
}

function updateGameLogic(delta) {
    // 更新子弹位置
    bullets.forEach((bullet, index) => {
        bullet.position.y += 10 * delta;
        if (bullet.position.y > 5) {
            scene.remove(bullet);
            bullets.splice(index, 1);
            objectPool.bullets.push(bullet);
        }
    });

    // 生成敌人
    if (Math.random() < 0.02) {
        createEnemy();
    }

    // 更新敌人位置
    enemies.forEach((enemy, index) => {
        enemy.position.y -= 2 * delta;
        enemy.rotation.x += 1 * delta;
        enemy.rotation.y += 1 * delta;
        if (enemy.position.y < -5) {
            scene.remove(enemy);
            enemies.splice(index, 1);
            objectPool.enemies.push(enemy);
        }
    });

    // 更新粒子效果
    particles.forEach((particle, index) => {
        if (Date.now() - particle.createdAt > 1000) {
            scene.remove(particle.points);
            particles.splice(index, 1);
        }
    });

    // 检测碰撞
    checkCollisions();

    // 更新玩家位置
    const moveSpeed = 5;
    if (keys['ArrowLeft'] || keys['KeyA']) player.position.x -= moveSpeed * delta;
    if (keys['ArrowRight'] || keys['KeyD']) player.position.x += moveSpeed * delta;
    if (keys['ArrowUp'] || keys['KeyW']) player.position.y += moveSpeed * delta;
    if (keys['ArrowDown'] || keys['KeyS']) player.position.y -= moveSpeed * delta;

    // 限制玩家移动范围
    player.position.x = Math.max(-GAME_WIDTH / 2 + PLAYER_SIZE, Math.min(GAME_WIDTH / 2 - PLAYER_SIZE, player.position.x));
    player.position.y = Math.max(-GAME_HEIGHT / 2 + PLAYER_SIZE, Math.min(GAME_HEIGHT / 2 - PLAYER_SIZE, player.position.y));

    // 连续射击
    if (keys['Space']) {
        shootBullet();
    }
}

function checkCollisions() {
    // 检测子弹和敌人的碰撞
    bullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (bullet.position.distanceTo(enemy.position) < 0.5) {
                createExplosion(enemy.position);
                scene.remove(bullet);
                scene.remove(enemy);
                bullets.splice(bulletIndex, 1);
                enemies.splice(enemyIndex, 1);
                updateScore(100);
            }
        });
    });

    // 检测玩家和敌人的碰撞
    enemies.forEach((enemy, index) => {
        if (player.position.distanceTo(enemy.position) < 0.5) {
            createExplosion(enemy.position);
            scene.remove(enemy);
            enemies.splice(index, 1);
            updateHealth(-10);
        }
    });
}

function gameOver() {
    gameActive = false;
    alert('游戏结束！');
    // 重置游戏状态
    resetGame();
}

function resetGame() {
    // 清除所有敌人和子弹
    enemies.forEach(enemy => scene.remove(enemy));
    bullets.forEach(bullet => scene.remove(bullet));
    particles.forEach(particle => scene.remove(particle.points));
    enemies = [];
    bullets = [];
    particles = [];

    // 重置玩家位置
    player.position.set(0, 0, 0);

    // 重置分数和生命值
    document.getElementById('score-value').textContent = '0';
    document.getElementById('health-value').textContent = '100';

    // 重新开始游戏
    gameActive = true;
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onTouchMove(event) {
    event.preventDefault();
    const touch = event.touches[0];
    const x = (touch.clientX / window.innerWidth) * 2 - 1;
    const y = -(touch.clientY / window.innerHeight) * 2 + 1;
    player.position.x = x * 3;
    player.position.y = y * 2;
}

function updateScore(points) {
    const scoreElement = document.getElementById('score-value');
    scoreElement.textContent = parseInt(scoreElement.textContent) + points;
}

function updateHealth(change) {
    const healthElement = document.getElementById('health-value');
    const newHealth = Math.max(0, parseInt(healthElement.textContent) + change);
    healthElement.textContent = newHealth;
    if (newHealth <= 0) {
        gameOver();
    }
}

function onKeyDown(event) {
    keys[event.code] = true;
    if (event.code === 'Space') {
        shootBullet();
    }
}

function onKeyUp(event) {
    keys[event.code] = false;
}

function createStartScreen() {
    const startScreen = document.createElement('div');
    startScreen.id = 'start-screen';
    startScreen.innerHTML = `
        <h1>雷电风暴</h1>
        <p>使用方向键或WASD移动，空格键射击</p>
        <button id="start-button">开始游戏</button>
    `;
    document.body.appendChild(startScreen);

    document.getElementById('start-button').addEventListener('click', startGame);
}

function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    gameStarted = true;
    gameActive = true;
    lastTime = performance.now();
    animate();

    backgroundMusic.play();
}

function loadSounds() {
    const listener = new THREE.AudioListener();
    camera.add(listener);

    shootSound = new THREE.Audio(listener);
    explosionSound = new THREE.Audio(listener);
    backgroundMusic = new THREE.Audio(listener);

    const audioLoader = new THREE.AudioLoader();

    audioLoader.load('assets/shoot.mp3', function(buffer) {
        shootSound.setBuffer(buffer);
    });

    audioLoader.load('assets/explosion.mp3', function(buffer) {
        explosionSound.setBuffer(buffer);
    });

    audioLoader.load('assets/background.mp3', function(buffer) {
        backgroundMusic.setBuffer(buffer);
        backgroundMusic.setLoop(true);
        backgroundMusic.setVolume(0.5);
    });
}

// 初始化游戏
init();
