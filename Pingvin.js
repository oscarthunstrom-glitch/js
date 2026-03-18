// --- INITIALISERING ---
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// --- TILLSTÅND ---
let gameState = 'menu';    // när man är i menyn
let currentLevel = 1;
let unlockedLevels = 1;
let totalCoins = 0;
let levelCoins = 0;
let distance = 0;
let upgrades = { speed: 0, glide: 0, income: 0 };

// Boostvariabler
let boostTimer = 0;
const BOOST_DURATION = 120; // 2 sekunder

const LANES = 4;    // hur många banor det finns
let penguin = { lane: 1, targetLane: 1, x: 0, transition: 0 };
let obstacles = [];
let coins = [];
let powerups = []; // För boosts

// NIVÅINSTÄLLNINGAR - varje nivå har olika hastighet, spawnrate och mål
const levelSettings = {
    1: { speed: 7, spawnRate: 0.05, target: 20000 }, 
    2: { speed: 10, spawnRate: 0.07, target: 45000 },  
    3: { speed: 14, spawnRate: 0.09, target: 80000 }   // fler hinder och snabbare hastighet i högre nivåer
};

// --- GLOBAL EXPOSURE (Gör funktionerna tillgängliga för knapparna i HTML) ---
window.startGame = function() {
    console.log("Startar spelet...");
    initLevel(1);
};

window.showUpgrades = function() {
    showScreen('upgrades-screen');
    updateUI();
};

window.backToMenu = function() {
    gameState = 'menu';
    showScreen('menu-screen');
};

window.buyUpgrade = function(type) {    // köpa uppgraderingar
    const cost = 50 * (upgrades[type] + 1);
    if (totalCoins >= cost) {   // kollar om man har råd med uppgraderingen
        totalCoins -= cost;    // pengar dras av totalen
        upgrades[type]++;
        save();    // sparar alla värden i local storage så när man ska spela igen senare så är allt kvar
        updateUI();
    }
};

window.nextLevel = function() {
    if (unlockedLevels > currentLevel) initLevel(currentLevel + 1);
};

// --- HJÄLPFUNKTIONER ---
function getLaneX(lane) {
    const spacing = canvas.width / LANES;
    return (lane * spacing) + (spacing / 2);
}

// Ritar schackrutig mållinje
function drawFinishLine(y) {
    const rows = 3; 
    const squaresAcross = LANES * 4; 
    const squareSize = canvas.width / squaresAcross;
    for (let r = 0; r < rows; r++) {
        for (let i = 0; i < squaresAcross; i++) {
            ctx.fillStyle = (i + r) % 2 === 0 ? "#000000" : "#ffffff";
            ctx.fillRect(i * squareSize, y + (r * squareSize), squareSize, squareSize);
        }
    }
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if(target) target.classList.remove('hidden');
    document.getElementById('ui-container').classList.add('hidden');
}

function hideScreens() {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById('ui-container').classList.remove('hidden');
}

// --- LOGIK ---
function initLevel(lvl) {
    currentLevel = lvl;
    distance = 0;
    levelCoins = 0;
    obstacles = [];
    coins = [];
    powerups = [];
    boostTimer = 0;
    penguin.lane = 1;
    penguin.targetLane = 1;
    penguin.transition = 0;    // sidoförflyttning
    gameState = 'playing';
    hideScreens();
}

window.addEventListener('keydown', e => {
    if (gameState !== 'playing') return;
    if ((e.key === 'ArrowLeft' || e.key === 'a') && penguin.targetLane > 0) {
        penguin.targetLane--;
    }
    if ((e.key === 'ArrowRight' || e.key === 'd') && penguin.targetLane < LANES - 1) {
        penguin.targetLane++;
    }
});

function update() {
    if (gameState !== 'playing') return;

    const config = levelSettings[currentLevel];
    let currentSpeed = config.speed + (upgrades.speed * 1.5);
    
    // Aktivera boost om timern är igång
    if (boostTimer > 0) {
        currentSpeed *= 2.5; 
        boostTimer--;
    }

    const slideSpeed = 0.15 + (upgrades.glide * 0.05);
    if (penguin.lane !== penguin.targetLane) {
        penguin.transition += slideSpeed;
        if (penguin.transition >= 1) {
            penguin.lane = penguin.targetLane;
            penguin.transition = 0;
        }
    }

    distance += currentSpeed;

    // Sluta skapa objekt precis innan mål
    if (distance < config.target - 1500) {
        // Hinder
        if (Math.random() < config.spawnRate) {
            const lane = Math.floor(Math.random() * LANES);
            if (obstacles.length === 0 || obstacles[obstacles.length-1].y > 120) {
                obstacles.push({ lane: lane, y: -50 });
            }
        }

        // Mynt
        if (Math.random() < 0.03) {
            coins.push({ lane: Math.floor(Math.random() * LANES), y: -50, collected: false });
        }

        // Boost 
        if (Math.random() < 0.001) { // Sällsynt spawn
            powerups.push({ lane: Math.floor(Math.random() * LANES), y: -50 });
        }
    }

    const pY = canvas.height * 0.75;
    const currentX = getLaneX(penguin.lane) + (getLaneX(penguin.targetLane) - getLaneX(penguin.lane)) * penguin.transition;
    penguin.x = currentX;

    // Kollision med hinder
    obstacles.forEach((o, index) => {
        o.y += currentSpeed;
        const laneX = getLaneX(o.lane);
        if (Math.abs(laneX - penguin.x) < 45 && Math.abs(o.y - pY) < 35) {
            if (boostTimer > 0) {
                obstacles.splice(index, 1); // Krossar hindret när man boostar
            } else {
                gameState = 'gameover';   // när man har krashat
                showGameOver(false);
            }
        }
    });

    // Kollisioner mynt
    coins.forEach(c => {
        c.y += currentSpeed;
        const laneX = getLaneX(c.lane);
        if (Math.abs(laneX - penguin.x) < 45 && Math.abs(c.y - pY) < 40 && !c.collected) {
            c.collected = true;
            levelCoins += (1 + upgrades.income);
        }
    });

    // Kollisioner boost
    powerups.forEach((p, index) => {
        p.y += currentSpeed;
        const laneX = getLaneX(p.lane);
        if (Math.abs(laneX - penguin.x) < 45 && Math.abs(p.y - pY) < 40) {
            boostTimer = BOOST_DURATION;
            powerups.splice(index, 1);
        }
    });

    obstacles = obstacles.filter(o => o.y < canvas.height + 50);
    coins = coins.filter(c => c.y < canvas.height + 50 && !c.collected);
    powerups = powerups.filter(p => p.y < canvas.height + 50);

    if (distance >= config.target) {
        totalCoins += levelCoins;
        if (currentLevel === unlockedLevels && unlockedLevels < 3) unlockedLevels++;
        save();
        gameState = 'gameover';    
        showGameOver(true);
    }
}

function showGameOver(win) {
    showScreen('game-over-screen');
    document.getElementById('game-over-title').textContent = win ? "LEVEL KLAR!" : "KRASCH!";
    document.getElementById('level-coins').textContent = levelCoins;
    const nextBtn = document.getElementById('next-lvl-btn');
    if(nextBtn) nextBtn.style.display = (win && currentLevel < 3) ? "inline-block" : "none";
}

function updateUI() {
    document.getElementById('speed-level').textContent = upgrades.speed;
    document.getElementById('glide-level').textContent = upgrades.glide;
    document.getElementById('income-level').textContent = upgrades.income;
    document.getElementById('speed-cost').textContent = 50 * (upgrades.speed + 1);
    document.getElementById('glide-cost').textContent = 50 * (upgrades.glide + 1);
    document.getElementById('income-cost').textContent = 50 * (upgrades.income + 1);
    document.getElementById('total-coins').textContent = totalCoins;
}

// ORIGINALDESIGN PINGVIN
function drawPenguin(x, y) {
    ctx.save();
    ctx.translate(x, y);
    
    // Aura vid boost
    if (boostTimer > 0) {
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 3;
        ctx.strokeRect(-30, -25, 60, 50);
    }

    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.ellipse(0, 0, 25, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.ellipse(0, 0, 18, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(0, -15, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(-4, -16, 3, 0, Math.PI * 2); ctx.arc(4, -16, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath(); ctx.arc(-4, -16, 1.5, 0, Math.PI * 2); ctx.arc(4, -16, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FF8C00';
    ctx.beginPath(); ctx.arc(0, -12, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FF6B6B';
    ctx.fillRect(-8, 12, 5, 3); ctx.fillRect(3, 12, 5, 3);
    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#e0f6ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === 'playing' || gameState === 'gameover') {
        const config = levelSettings[currentLevel];
        
        // RITA MÅLLINJEN (innan pingvinen så den hamnar under)
        const distToFinish = config.target - distance;
        if (distToFinish < canvas.height) {
            drawFinishLine(canvas.height * 0.75 - distToFinish);
        }

        // PROGRESS BAR
        if (gameState === 'playing') {        // Om man spelar
            const progress = Math.min(distance / config.target, 1);
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(canvas.width/4, 20, canvas.width/2, 10);
            ctx.fillStyle = boostTimer > 0 ? '#ff00ff' : '#00d4ff';
            ctx.fillRect(canvas.width/4, 20, (canvas.width/2) * progress, 10);
        }

        // BAN-LINJER
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.setLineDash([15, 15]);
        for(let i=1; i<LANES; i++) {
            let x = (canvas.width / LANES) * i;
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        ctx.setLineDash([]);

        // HINDER
        obstacles.forEach(o => {
            const laneX = getLaneX(o.lane);
            ctx.fillStyle = '#87ceeb';
            ctx.fillRect(laneX - 35, o.y - 20, 70, 45);
        });

        // COINS
        coins.forEach(c => {
            ctx.fillStyle = '#FFD700';
            ctx.beginPath(); ctx.arc(getLaneX(c.lane), c.y, 15, 0, Math.PI*2); ctx.fill();
        });

        // BOOSTS (Blixtar)
        powerups.forEach(p => {
            const lx = getLaneX(p.lane);
            ctx.fillStyle = '#ff00ff';
            ctx.beginPath();
            ctx.moveTo(lx, p.y - 20); ctx.lineTo(lx - 15, p.y); ctx.lineTo(lx, p.y);
            ctx.lineTo(lx - 5, p.y + 20); ctx.lineTo(lx + 15, p.y); ctx.lineTo(lx, p.y);
            ctx.fill();
        });

        drawPenguin(penguin.x, canvas.height * 0.75);
    }
}

function save() { localStorage.setItem('penguinData_v2', JSON.stringify({ upgrades, totalCoins, unlockedLevels })); }
function load() {
    const d = JSON.parse(localStorage.getItem('penguinData_v2'));
    if(d) { 
        upgrades = d.upgrades || upgrades; 
        totalCoins = d.totalCoins || 0; 
        unlockedLevels = d.unlockedLevels || 1; 
    }
}

function loop() {
    update();
    draw();
    if (gameState === 'playing') {
        const lvlNum = document.getElementById('level-num');
        const coinCnt = document.getElementById('coins-count');
        if(lvlNum) lvlNum.textContent = currentLevel;
        if(coinCnt) coinCnt.textContent = levelCoins;
    }
    requestAnimationFrame(loop);
}

// Starta allt
load();
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
loop();