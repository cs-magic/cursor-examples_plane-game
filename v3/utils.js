console.log('加载工具函数');

function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

function collision(obj1, obj2) {
    return distance(obj1.x, obj1.y, obj2.x, obj2.y) < (obj1.radius + obj2.radius);
}

function drawCircle(ctx, x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.closePath();
}

console.log('工具函数加载完成');