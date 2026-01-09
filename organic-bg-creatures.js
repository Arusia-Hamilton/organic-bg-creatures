(function() {
    const mouse = { x: -1000, y: -1000 };
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    const CONFIG = {
        defaultCount: 5,      // デフォルトの生成数
        trailLength: 40,      // 尾の長さ
        sizeBase: 5,          // 基本サイズ
        speedBase: 1.5,       // 基本速度
        avoidRange: 150,      // マウスに反応する距離
        avoidStrength: 0.15,  // 避ける強さ
        zIndex: -9999         // 最背面レイヤー
    };

    class Creature {
        constructor(canvas) {
            this.canvas = canvas;
            this.init();
        }

        init() {
            this.x = Math.random() * this.canvas.width;
            this.y = Math.random() * this.canvas.height;
            this.angle = Math.random() * Math.PI * 2;
            this.speed = CONFIG.speedBase + Math.random();
            const hue = Math.floor(Math.random() * 360);
            this.color = `hsla(${hue}, 70%, 60%, 1)`;
            this.radius = CONFIG.sizeBase + Math.random() * 3;
            this.trail = [];
        }

        update() {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > CONFIG.trailLength) this.trail.shift();

            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < CONFIG.avoidRange) {
                const targetAngle = Math.atan2(dy, dx);
                let angleDiff = targetAngle - this.angle;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

                this.angle += angleDiff * CONFIG.avoidStrength;
                this.speed = CONFIG.speedBase * 2.0;
            } else {
                this.angle += (Math.random() - 0.5) * 0.15;

                this.speed += (CONFIG.speedBase - this.speed) * 0.05;
            }

            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;

            const margin = 100;
            const centerDistX = this.canvas.width / 2 - this.x;
            const centerDistY = this.canvas.height / 2 - this.y;

            if (this.x < margin || this.x > this.canvas.width - margin || 
                this.y < margin || this.y > this.canvas.height - margin) {
        
                const angleToCenter = Math.atan2(centerDistY, centerDistX);
                let diff = angleToCenter - this.angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;

                this.angle += diff * 0.05;
            }
        }

        draw(ctx) {
            // 軌跡（尾）の描画
            for (let i = 0; i < this.trail.length; i++) {
                const point = this.trail[i];
                const ratio = i / this.trail.length;

                const size = this.radius * ratio;
                const alpha = ratio * 0.6;

                ctx.beginPath();
                ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
                ctx.fillStyle = this.color.replace('1)', `${alpha})`);
                ctx.fill();
            }

            // 本体の描画
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    class OrganicSystem {
        constructor() { this.creatures = []; this.canvas = null; this.ctx = null; }
        init(count = CONFIG.defaultCount) {
            this.createCanvas();
            this.createCreatures(count);
            this.animate();
            window.addEventListener('resize', () => {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
            });
        }
        createCanvas() {
            this.canvas = document.createElement('canvas');
            this.canvas.style.position = 'fixed';
            this.canvas.style.top = '0';
            this.canvas.style.left = '0';
            this.canvas.style.zIndex = CONFIG.zIndex;
            this.canvas.style.pointerEvents = 'none';
            document.body.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }
        createCreatures(count) {
            for (let i = 0; i < count; i++) this.creatures.push(new Creature(this.canvas));
        }
        animate() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.creatures.forEach(c => { c.update(); c.draw(this.ctx); });
            requestAnimationFrame(() => this.animate());
        }
    }

    window.OrganicCreatures = new OrganicSystem();
    window.addEventListener('DOMContentLoaded', () => window.OrganicCreatures.init(5));
})();
