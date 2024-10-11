console.log('加载关卡设计');

const levels = [
    {
        enemyCount: 10,
        enemySpeed: 2,
        powerUpFrequency: 3000
    },
    {
        enemyCount: 15,
        enemySpeed: 3,
        powerUpFrequency: 2500
    },
    {
        enemyCount: 20,
        enemySpeed: 4,
        powerUpFrequency: 2000
    }
];

function getLevelConfig(level) {
    const index = Math.min(level - 1, levels.length - 1);
    return levels[index];
}

console.log('关卡设计加载完成');