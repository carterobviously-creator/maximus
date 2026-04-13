// Angry Birds Clone - TypeScript Game Engine
// Matter.js physics-based game

interface Bird {
    body: any;
    launched: boolean;
    trail: Array<{x: number, y: number}>;
}

interface Pig {
    body: any;
    health: number;
    hit: boolean;
}

interface Box {
    body: any;
    type: 'wood' | 'stone' | 'glass';
}

class AngryBirdsGame {
    private engine: any;
    private render: any;
    private world: any;
    private canvas: HTMLCanvasElement;
    private mouseConstraint: any;
    private birds: Bird[] = [];
    private pigs: Pig[] = [];
    private boxes: Box[] = [];
    private score: number = 0;
    private birdsRemaining: number = 3;
    private currentBird: Bird | null = null;
    private slingshot: {x: number, y: number};
    private slingshotConstraint: any = null;
    private isRetroMode: boolean = false;
    private particles: any[] = [];

    constructor() {
        this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        this.canvas.width = 1200;
        this.canvas.height = 700;
        
        this.slingshot = {x: 200, y: 500};
        
        this.initPhysics();
        this.createLevel();
        this.setupControls();
        this.startGameLoop();
    }

    private initPhysics(): void {
        const { Engine, Render, World, Bodies, Mouse, MouseConstraint, Events } = Matter;
        
        this.engine = Engine.create({
            gravity: { x: 0, y: 1 }
        });
        
        this.world = this.engine.world;
        
        this.render = Render.create({
            canvas: this.canvas,
            engine: this.engine,
            options: {
                width: this.canvas.width,
                height: this.canvas.height,
                wireframes: false,
                background: 'transparent'
            }
        });

        // Ground
        const ground = Bodies.rectangle(600, 690, 1200, 20, {
            isStatic: true,
            render: {
                fillStyle: '#8B4513'
            }
        });
        World.add(this.world, ground);

        Render.run(this.render);
        const runner = Matter.Runner.create();
        Matter.Runner.run(runner, this.engine);
    }

    private createLevel(): void {
        const { Bodies, World } = Matter;

        // Create structure with boxes
        const structureX = 900;
        const structureY = 600;

        // Bottom layer - wood
        for (let i = 0; i < 3; i++) {
            const box = Bodies.rectangle(
                structureX + i * 60,
                structureY,
                50, 100,
                {
                    density: 0.001,
                    restitution: 0.3,
                    friction: 0.5,
                    render: { fillStyle: '#8B4513' }
                }
            );
            World.add(this.world, box);
            this.boxes.push({ body: box, type: 'wood' });
        }

        // Middle layer - stone
        for (let i = 0; i < 2; i++) {
            const box = Bodies.rectangle(
                structureX + 30 + i * 60,
                structureY - 120,
                50, 100,
                {
                    density: 0.002,
                    restitution: 0.2,
                    friction: 0.7,
                    render: { fillStyle: '#696969' }
                }
            );
            World.add(this.world, box);
            this.boxes.push({ body: box, type: 'stone' });
        }

        // Top layer - glass
        const glassBox = Bodies.rectangle(
            structureX + 60,
            structureY - 240,
            50, 100,
            {
                density: 0.0005,
                restitution: 0.1,
                friction: 0.3,
                render: { fillStyle: '#87CEEB', opacity: 0.6 }
            }
        );
        World.add(this.world, glassBox);
        this.boxes.push({ body: glassBox, type: 'glass' });

        // Create pigs
        this.createPig(structureX + 30, structureY - 50);
        this.createPig(structureX + 90, structureY - 50);
        this.createPig(structureX + 60, structureY - 170);

        // Create first bird
        this.createBird();
    }

    private createPig(x: number, y: number): void {
        const { Bodies, World } = Matter;
        
        const pig = Bodies.circle(x, y, 25, {
            density: 0.001,
            restitution: 0.5,
            friction: 0.5,
            render: {
                fillStyle: '#90EE90'
            }
        });
        
        World.add(this.world, pig);
        this.pigs.push({ body: pig, health: 100, hit: false });
    }

    private createBird(): void {
        const { Bodies, World, Body } = Matter;
        
        const bird = Bodies.circle(
            this.slingshot.x,
            this.slingshot.y,
            20,
            {
                density: 0.002,
                restitution: 0.8,
                friction: 0.5,
                render: {
                    fillStyle: '#FF4500'
                }
            }
        );
        
        World.add(this.world, bird);
        
        this.currentBird = {
            body: bird,
            launched: false,
            trail: []
        };
        
        this.birds.push(this.currentBird);
    }

    private setupControls(): void {
        const { Mouse, MouseConstraint, Events, Body, Vector } = Matter;
        
        const mouse = Mouse.create(this.canvas);
        this.mouseConstraint = MouseConstraint.create(this.engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: { visible: false }
            }
        });

        let isDragging = false;
        let startX = 0, startY = 0;

        Events.on(this.mouseConstraint, 'mousedown', (event: any) => {
            if (this.currentBird && !this.currentBird.launched) {
                const mousePos = event.mouse.position;
                const birdPos = this.currentBird.body.position;
                const distance = Vector.magnitude(Vector.sub(mousePos, birdPos));
                
                if (distance < 30) {
                    isDragging = true;
                    startX = mousePos.x;
                    startY = mousePos.y;
                }
            }
        });

        Events.on(this.mouseConstraint, 'mouseup', (event: any) => {
            if (isDragging && this.currentBird && !this.currentBird.launched) {
                const mousePos = event.mouse.position;
                const force = Vector.mult(
                    Vector.sub(
                        { x: this.slingshot.x, y: this.slingshot.y },
                        mousePos
                    ),
                    0.001
                );

                Body.applyForce(this.currentBird.body, this.currentBird.body.position, force);
                this.currentBird.launched = true;
                isDragging = false;

                setTimeout(() => {
                    this.birdsRemaining--;
                    this.updateHUD();
                    
                    if (this.birdsRemaining > 0) {
                        setTimeout(() => {
                            if (!this.checkWinCondition()) {
                                this.createBird();
                            }
                        }, 3000);
                    } else {
                        setTimeout(() => {
                            if (!this.checkWinCondition()) {
                                this.gameOver();
                            }
                        }, 3000);
                    }
                }, 100);
            }
            isDragging = false;
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' || e.key === 'R') {
                location.reload();
            }
            if (e.key === ' ') {
                this.toggleRetroMode();
            }
        });
    }

    private startGameLoop(): void {
        setInterval(() => {
            this.checkCollisions();
            this.updateTrails();
            this.updateParticles();
            this.drawSlingshot();
        }, 1000 / 60);
    }

    private checkCollisions(): void {
        const { Vector } = Matter;

        this.pigs.forEach((pig, index) => {
            if (pig.hit) return;

            this.birds.forEach(bird => {
                if (bird.launched) {
                    const distance = Vector.magnitude(
                        Vector.sub(bird.body.position, pig.body.position)
                    );

                    if (distance < 45) {
                        const velocity = Vector.magnitude(bird.body.velocity);
                        if (velocity > 3) {
                            pig.health -= velocity * 10;
                            this.createParticleExplosion(pig.body.position.x, pig.body.position.y, '#90EE90');
                            
                            if (pig.health <= 0) {
                                pig.hit = true;
                                Matter.World.remove(this.world, pig.body);
                                this.score += 1000;
                                this.updateHUD();
                                this.createParticleExplosion(pig.body.position.x, pig.body.position.y, '#FFD700');
                            }
                        }
                    }
                }
            });

            // Check collisions with boxes
            this.boxes.forEach(box => {
                const distance = Vector.magnitude(
                    Vector.sub(box.body.position, pig.body.position)
                );

                if (distance < 60) {
                    const velocity = Vector.magnitude(box.body.velocity);
                    if (velocity > 5) {
                        pig.health -= velocity * 5;
                        if (pig.health <= 0 && !pig.hit) {
                            pig.hit = true;
                            Matter.World.remove(this.world, pig.body);
                            this.score += 1000;
                            this.updateHUD();
                            this.createParticleExplosion(pig.body.position.x, pig.body.position.y, '#FFD700');
                        }
                    }
                }
            });
        });
    }

    private updateTrails(): void {
        this.birds.forEach(bird => {
            if (bird.launched) {
                bird.trail.push({
                    x: bird.body.position.x,
                    y: bird.body.position.y
                });

                if (bird.trail.length > 20) {
                    bird.trail.shift();
                }
            }
        });
    }

    private updateParticles(): void {
        this.particles = this.particles.filter(p => p.life > 0);
        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.5;
            p.life--;
        });
    }

    private createParticleExplosion(x: number, y: number, color: string): void {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 30,
                color: color
            });
        }
    }

    private drawSlingshot(): void {
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;

        // Draw slingshot
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(this.slingshot.x - 20, this.slingshot.y + 30);
        ctx.lineTo(this.slingshot.x - 20, this.slingshot.y - 50);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(this.slingshot.x + 20, this.slingshot.y + 30);
        ctx.lineTo(this.slingshot.x + 20, this.slingshot.y - 50);
        ctx.stroke();

        // Draw elastic bands if bird not launched
        if (this.currentBird && !this.currentBird.launched) {
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.slingshot.x - 20, this.slingshot.y - 50);
            ctx.lineTo(this.currentBird.body.position.x, this.currentBird.body.position.y);
            ctx.lineTo(this.slingshot.x + 20, this.slingshot.y - 50);
            ctx.stroke();
        }

        // Draw trails
        this.birds.forEach(bird => {
            bird.trail.forEach((point, i) => {
                ctx.fillStyle = `rgba(255, 69, 0, ${i / bird.trail.length * 0.5})`;
                ctx.beginPath();
                ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        });

        // Draw particles
        this.particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / 30;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        });
    }

    private updateHUD(): void {
        const scoreEl = document.getElementById('score');
        const birdCountEl = document.getElementById('bird-count');
        
        if (scoreEl) scoreEl.textContent = this.score.toString();
        if (birdCountEl) birdCountEl.textContent = this.birdsRemaining.toString();
    }

    private checkWinCondition(): boolean {
        const allPigsDefeated = this.pigs.every(pig => pig.hit);
        
        if (allPigsDefeated) {
            this.victory();
            return true;
        }
        return false;
    }

    private victory(): void {
        const winScreen = document.getElementById('win-screen');
        const winScore = document.getElementById('win-score');
        
        if (winScreen && winScore) {
            winScore.textContent = this.score.toString();
            winScreen.style.display = 'block';
        }
    }

    private gameOver(): void {
        const gameOverScreen = document.getElementById('game-over-screen');
        const finalScore = document.getElementById('final-score');
        
        if (gameOverScreen && finalScore) {
            finalScore.textContent = this.score.toString();
            gameOverScreen.style.display = 'block';
        }
    }

    public toggleRetroMode(): void {
        this.isRetroMode = !this.isRetroMode;
        const canvas = document.getElementById('game-canvas');
        
        if (canvas) {
            if (this.isRetroMode) {
                canvas.classList.add('retro-mode');
            } else {
                canvas.classList.remove('retro-mode');
            }
        }
    }
}

// Global function for button
function toggleRetroMode(): void {
    if ((window as any).game) {
        (window as any).game.toggleRetroMode();
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    (window as any).game = new AngryBirdsGame();
});
