console.log('加载游戏实体');

class Entity {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    draw(ctx) {
        // 将在子类中实现
    }
}

class Player extends Entity {
    constructor(x, y) {
        super(x, y, 40, 60);
        this.health = 100;
        this.energy = 100;
        this.speed = 5;
    }

    draw(ctx) {
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height);
        ctx.lineTo(this.x + this.width / 2, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height);
        ctx.closePath();
        ctx.fill();
    }

    move(dx, dy) {
        this.x += dx * this.speed;
        this.y += dy * this.speed;
        this.x = Math.max(0, Math.min(game.width - this.width, this.x));
        this.y = Math.max(0, Math.min(game.height - this.height, this.y));
    }

    shoot() {
        if (this.energy >= 10) {
            game.bullets.push(new Bullet(this.x + this.width / 2, this.y, 0, -10));
            this.energy -= 10;
            playSound('shoot');
            console.log('玩家发射子弹');
        }
    }
}

class Enemy extends Entity {
    constructor(x, y, width, height, color, health, speed) {
        super(x, y, width, height);
        this.color = color;
        this.health = health;
        this.speed = speed;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.y += this.speed;
        if (this.y > game.height) {
            const index = game.enemies.indexOf(this);
            if (index > -1) {
                game.enemies.splice(index, 1);
            }
        }
    }
}

class Bullet extends Entity {
    constructor(x, y, dx, dy) {
        super(x, y, 5, 15);
        this.dx = dx;
        this.dy = dy;
    }

    draw(ctx) {
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;
        if (this.y < -this.height || this.y > game.height) {
            const index = game.bullets.indexOf(this);
            if (index > -1) {
                game.bullets.splice(index, 1);
            }
        }
    }
}

class PowerUp extends Entity {
    constructor(x, y, type) {
        super(x, y, 30, 30);
        this.type = type;
        this.speed = 2;
    }

    draw(ctx) {
        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        this.y += this.speed;
        if (this.y > game.height) {
            const index = game.powerUps.indexOf(this);
            if (index > -1) {
                game.powerUps.splice(index, 1);
            }
        }
    }

    applyEffect(player) {
        switch (this.type) {
            case 'health':
                player.health = Math.min(player.health + 20, 100);
                break;
            case 'energy':
                player.energy = Math.min(player.energy + 30, 100);
                break;
            case 'speed':
                player.speed *= 1.5;
                setTimeout(() => player.speed /= 1.5, 5000);
                break;
        }
        playSound('powerUp');
        console.log(`玩家获得道具: ${this.type}`);
    }
}

console.log('游戏实体加载完成');