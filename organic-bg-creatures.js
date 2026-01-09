(function() {
    const mouse = { x: -1000, y: -1000 };
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    const CONFIG = {
        defaultCount: 5,      // 生成数
        trailLength: 45,      // 尾の長さ
        sizeBase: 4,          // 本体のサイズ
        speedBase: 1.2,       // ゆっくり泳ぐ速度
        avoidRange: 180,      // マウスを察知する範囲
        avoidStrength: 0.12,  // 逃げる時の旋回性能
        zIndex: -9999
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
            this.color = `hsla(${hue}, 65%, 65%, 1)`;
            this.radius = CONFIG.sizeBase + Math.random() * 3;
            
            this.trail = [];
        }

        update() {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > CONFIG.trailLength) {
                this.trail.shift();
            }

            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < CONFIG.avoidRange) {
                const targetAngle = Math.atan2(dy, dx);
                let diff = targetAngle - this.angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                
                this.angle += diff * CONFIG.avoidStrength;
                this.speed = CONFIG.speedBase * 1.8;
            } else {
                this.angle += (Math.random() - 0.5) * 0.08;
                this.speed += (CONFIG.speedBase - this.speed) * 0.04;
            }

            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;

            const margin = 50;
            if (this.x < -margin) this.x = this.canvas.width + margin;
            else if (this.x > this.canvas.width + margin) this.x = -margin;
            if (this.y < -margin) this.y = this.canvas.height + margin;
            else if (this.y > this.canvas.height + margin) this.y = -margin;
        }

        draw(ctx) {
            for (let i = 0; i < this.trail.length; i++) {
                const point = this.trail[i];
                const ratio = i / this.trail.length;
                const alpha = ratio * 0.4; 
                
                ctx.beginPath();
                ctx.arc(point.x, point.y, this.radius * ratio * 0.8, 0, Math.PI * 2);
                ctx.fillStyle = this.color.replace('1)', `${alpha})`);
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 12;
            ctx.shadowColor = this.color;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    class OrganicSystem {
        constructor() {
            this.creatures = [];
            this.canvas = null;
            this.ctx = null;
        }

        init(count = CONFIG.defaultCount) {
            this.createCanvas();
            for (let i = 0; i < count; i++) {
                this.creatures.push(new Creature(this.canvas));
            }
            this.animate();
        }

        createCanvas() {
            this.canvas = document.createElement('canvas');
            Object.assign(this.canvas.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                zIndex: CONFIG.zIndex,
                pointerEvents: 'none',
                background: 'transparent'
            });
            document.body.appendChild(this.canvas);
            this.ctx = this.canvas.getContext('2d');
            
            this.handleResize();
            window.addEventListener('resize', () => this.handleResize());
        }

        handleResize() {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        }

        animate() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.creatures.forEach(c => {
                c.update();
                c.draw(this.ctx);
            });
            requestAnimationFrame(() => this.animate());
        }
    }

    const system = new OrganicSystem();
    if (document.readyState === 'complete') {
        system.init(5);
    } else {
        window.addEventListener('load', () => system.init(5));
    }
})();
