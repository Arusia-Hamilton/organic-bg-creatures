(function() {
    const mouse = { x: -1000, y: -1000 };
    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    const CONFIG = {
        defaultCount: 20,      // 生成数
        trailLength: 45,      // 尾の長さ
        sizeBase: 4,          // 本体のサイズ
        speedBase: 1.2,       // ゆっくり泳ぐ速度
        avoidRange: 180,      // マウスを察知する範囲
        avoidStrength: 0.12,  // 逃げる時の旋回性能
        zIndex: -9999,
        mergeSizeMultiplier: 1.1,   // 融合時のサイズ倍率
        mergeSpeedMultiplier: 1.1,  // 融合時の速度倍率
        maxMergeCount: 5,          // 融合回数の上限
        collisionMargin: 2,         // 融合しやすさの遊び（ピクセル）
        rippleMaxRadius: 100,       // 波紋の最大半径
        rippleDuration: 30          // 波紋の持続フレーム数
    };

    class Creature {
        constructor(canvas, x, y, inheritedColor) {
            this.canvas = canvas;
            this.init(x, y, inheritedColor);
        }

        init(x, y, inheritedColor) {
            this.x = x !== undefined ? x : Math.random() * this.canvas.width;
            this.y = y !== undefined ? y : Math.random() * this.canvas.height;
            this.angle = Math.random() * Math.PI * 2;
            
            this.mergeCount = 0;
            this.currentSpeedBase = CONFIG.speedBase + Math.random();
            this.radius = CONFIG.sizeBase + Math.random() * 3;
            this.speed = x !== undefined ? 12 + Math.random() * 5 : this.currentSpeedBase;
            
            this.flash = 0;
            this.trail = [];
            
            if (inheritedColor) {
                if (Math.random() < 0.05) {
                    const hue = Math.floor(Math.random() * 360);
                    this.color = `hsla(${hue}, 65%, 65%, 1)`;
                } else {
                    const h = parseInt(inheritedColor.match(/\d+/)[0]);
                    const newH = (h + (Math.random() * 40 - 20) + 360) % 360;
                    this.color = `hsla(${newH}, 65%, 65%, 1)`;
                }
            } else {
                const hue = Math.floor(Math.random() * 360);
                this.color = `hsla(${hue}, 65%, 65%, 1)`;
            }
        }

        grow() {
            this.mergeCount++;
            if (this.mergeCount <= CONFIG.maxMergeCount) {
                this.radius *= CONFIG.mergeSizeMultiplier;
                this.currentSpeedBase *= CONFIG.mergeSpeedMultiplier;
                this.flash = 1.0;
                return false;
            }
            return true;
        }

        update() {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > CONFIG.trailLength) this.trail.shift();
            if (this.flash > 0) this.flash -= 0.05;

            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < CONFIG.avoidRange) {
                const targetAngle = Math.atan2(dy, dx);
                let diff = targetAngle - this.angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.angle += diff * CONFIG.avoidStrength;
                this.speed = Math.max(this.speed, this.currentSpeedBase * 1.8);
            } else {
                this.angle += (Math.random() - 0.5) * 0.08;
                this.speed += (this.currentSpeedBase - this.speed) * 0.04;
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
            ctx.shadowBlur = 0;
            for (let i = 0; i < this.trail.length; i++) {
                const point = this.trail[i];
                const ratio = i / this.trail.length;
                ctx.beginPath();
                ctx.arc(point.x, point.y, this.radius * ratio * 0.8, 0, Math.PI * 2);
                ctx.fillStyle = this.color.replace('1)', `${ratio * 0.3})`);
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            if (this.flash > 0) {
                ctx.fillStyle = `hsla(0, 0%, 100%, ${this.flash})`;
                ctx.shadowBlur = 20;
                ctx.shadowColor = '#fff';
            } else {
                ctx.fillStyle = this.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = this.color;
            }
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    class Ripple {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.currentFrame = 0;
        }

        update() {
            this.currentFrame++;
        }

        draw(ctx) {
            const progress = this.currentFrame / CONFIG.rippleDuration; // 0.0 -> 1.0
            if (progress > 1) return;

            const radius = CONFIG.rippleMaxRadius * progress;
            const alpha = (1 - progress) * 0.8;

            ctx.beginPath();
            ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = this.color.replace('1)', `${alpha})`);
            ctx.lineWidth = 2 * (1 - progress);
            ctx.stroke();
        }

        isFinished() {
            return this.currentFrame >= CONFIG.rippleDuration;
        }
    }


    class OrganicSystem {
        constructor() {
            this.creatures = [];
            this.ripples = [];
            this.canvas = null;
            this.ctx = null;
        }

        init() {
            this.createCanvas();
            for (let i = 0; i < CONFIG.defaultCount; i++) {
                this.creatures.push(new Creature(this.canvas));
            }
            this.animate();
        }

        createCanvas() {
            this.canvas = document.createElement('canvas');
            Object.assign(this.canvas.style, {
                position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                zIndex: CONFIG.zIndex, pointerEvents: 'none'
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

        checkCollisions() {
            let toRemove = -1, toGrow = -1;
            for (let i = 0; i < this.creatures.length; i++) {
                for (let j = i + 1; j < this.creatures.length; j++) {
                    const c1 = this.creatures[i], c2 = this.creatures[j];
                    const dx = c1.x - c2.x, dy = c1.y - c2.y;
                    const minD = c1.radius + c2.radius + CONFIG.collisionMargin;
                    if (dx * dx + dy * dy < minD * minD) {
                        toGrow = i; toRemove = j; break;
                    }
                }
                if (toRemove !== -1) break;
            }

            if (toRemove !== -1) {
                const survivor = this.creatures[toGrow];
                const shouldSplit = survivor.grow();
                const startX = survivor.x, startY = survivor.y, color = survivor.color;

                this.creatures.splice(toRemove, 1);

                if (shouldSplit) {
                    this.ripples.push(new Ripple(startX, startY, color));

                    this.creatures.splice(this.creatures.indexOf(survivor), 1);
                    
                    const splitNum = (this.creatures.length < CONFIG.defaultCount) ? 3 : 1;
                    for (let n = 0; n < splitNum; n++) {
                        this.creatures.push(new Creature(this.canvas, startX, startY, color));
                    }
                } else {
                    if (this.creatures.length < CONFIG.defaultCount) {
                        this.creatures.push(new Creature(this.canvas));
                    }
                }
            }
        }

        animate() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.creatures.forEach(c => {
                c.update();
                c.draw(this.ctx);
            });
            this.checkCollisions();

            this.ripples = this.ripples.filter(ripple => {
                ripple.update();
                ripple.draw(this.ctx);
                return !ripple.isFinished();
            });

            requestAnimationFrame(() => this.animate());
        }
    }

    const system = new OrganicSystem();
    window.addEventListener('load', () => system.init());
})();
