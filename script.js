// Game Configuration
let config = {
    type: Phaser.AUTO,
    width: 500,
    height: 480,
    parent: 'phaser-game-canvas',
    backgroundColor: '#111827',
    scene: { create: create, update: update }
};

let game = new Phaser.Game(config);
let sceneRef;

// Game Settings
let gridSize = 3;
let movesLeft = 10;
let currentStreak = 0;
let bestStreak = localStorage.getItem('bestStreak') || 0;
let startTime, timerEvent;

// Core Logic Arrays
let playerGrid = [];
let targetGrid = [];
let playerBlocks = [];
let targetBlocks = [];

// DOM Elements
const movesDisplay = document.getElementById('moves-count');
const streakDisplay = document.getElementById('streak-count');
const bestStreakDisplay = document.getElementById('best-streak');
const timerDisplay = document.getElementById('timer-display');
const overlay = document.getElementById('game-overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMessage = document.getElementById('overlay-message');

// Sound Synth Helper (Generates dynamic sound effects without external files)
function playSound(type) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        
        if (type === 'click') {
            osc.frequency.setValueAtTime(450, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            osc.start(); osc.stop(ctx.currentTime + 0.08);
        } else if (type === 'win') {
            osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
            osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            osc.start(); osc.stop(ctx.currentTime + 0.35);
        } else if (type === 'lose') {
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.setValueAtTime(140, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            osc.start(); osc.stop(ctx.currentTime + 0.4);
        }
    } catch(e) { console.log("Audio not supported yet"); }
}

function create() {
    sceneRef = this;
    bestStreakDisplay.innerText = bestStreak;
    initGameSetup();
    
    // UI Button Listeners
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            gridSize = parseInt(e.target.dataset.size);
            currentStreak = 0;
            streakDisplay.innerText = currentStreak;
            initGameSetup();
        });
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
        currentStreak = 0;
        streakDisplay.innerText = currentStreak;
        initGameSetup();
    });

    document.getElementById('overlay-action-btn').addEventListener('click', () => {
        overlay.classList.add('hidden');
        initGameSetup();
    });
}

function update() {
    if (startTime && !overlay.classList.contains('hidden') === false) {
        let elapsed = Math.floor((new Date() - startTime) / 1000);
        let mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        let secs = String(elapsed % 60).padStart(2, '0');
        timerDisplay.innerText = `${mins}:${secs}`;
    }
}

function initGameSetup() {
    // Set dynamic moves based on grid complexity
    movesLeft = gridSize === 3 ? 10 : gridSize === 5 ? 22 : 40;
    movesDisplay.innerText = movesLeft;
    startTime = new Date();
    overlay.classList.add('hidden');

    // Clean up old graphics
    playerBlocks.forEach(b => b.destroy());
    targetBlocks.forEach(b => b.destroy());
    playerBlocks = [];
    targetBlocks = [];
    playerGrid = [];
    targetGrid = [];

    // Core Drawing calculations
    let padding = 6;
    let startY = 110;
    
    // Player Grid Dimensions (Left Side)
    let pAreaWidth = 220;
    let pBoxSize = (pAreaWidth - (padding * (gridSize - 1))) / gridSize;
    let startX_Player = 15;

    // Target Grid Dimensions (Right Side)
    let tAreaWidth = 180;
    let tBoxSize = (tAreaWidth - (padding * (gridSize - 1))) / gridSize;
    let startX_Target = 290;

    // Headings for Grids
    if(!sceneRef.pText) {
        sceneRef.pText = sceneRef.add.text(startX_Player, 65, 'PLAY MATRIX ENGINE', { font: 'bold 13px sans-serif', fill: '#38bdf8' });
        sceneRef.tText = sceneRef.add.text(startX_Target, 65, 'TARGET CONFIG SPEC', { font: 'bold 13px sans-serif', fill: '#94a3b8' });
    }

    // Generate Randomized Target Grid and Default Player Grid
    for (let r = 0; r < gridSize; r++) {
        playerGrid[r] = [];
        targetGrid[r] = [];
        for (let c = 0; c < gridSize; c++) {
            playerGrid[r][c] = 0; // 0 = Dark Grey
            targetGrid[r][c] = Math.random() > 0.5 ? 1 : 0; // 1 = Sky Blue
        }
    }

    // Make sure they aren't identical at the start
    if (JSON.stringify(playerGrid) === JSON.stringify(targetGrid)) {
        targetGrid[0][0] = targetGrid[0][0] === 0 ? 1 : 0;
    }

    // Render Player Interactive Grid
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            let x = startX_Player + c * (pBoxSize + padding);
            let y = startY + r * (pBoxSize + padding);
            
            let block = sceneRef.add.rectangle(x + pBoxSize/2, y + pBoxSize/2, pBoxSize, pBoxSize, 0x1f2937);
            block.setInteractive();
            block.setStrokeStyle(1.5, 0x334155);
            
            block.row = r;
            block.col = c;

            block.on('pointerdown', () => {
                if (movesLeft <= 0 || !overlay.classList.contains('hidden')) return;
                
                playSound('click');
                // Toggle state
                playerGrid[r][c] = playerGrid[r][c] === 0 ? 1 : 0;
                block.setFillStyle(playerGrid[r][c] === 1 ? 0x0284c7 : 0x1f2937);
                block.setStrokeStyle(1.5, playerGrid[r][c] === 1 ? 0x38bdf8 : 0x334155);

                movesLeft--;
                movesDisplay.innerText = movesLeft;
                checkGameStatus();
            });

            playerBlocks.push(block);
        }
    }

    // Render Target Reference Grid
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            let x = startX_Target + c * (tBoxSize + padding);
            let y = startY + r * (tBoxSize + padding) + 20; // centered alignment
            
            let color = targetGrid[r][c] === 1 ? 0x0284c7 : 0x1f2937;
            let strokeColor = targetGrid[r][c] === 1 ? 0x38bdf8 : 0x334155;
            
            let block = sceneRef.add.rectangle(x + tBoxSize/2, y + tBoxSize/2, tBoxSize, tBoxSize, color);
            block.setStrokeStyle(1, strokeColor);
            targetBlocks.push(block);
        }
    }
}

function checkGameStatus() {
    let isMatched = true;
    for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
            if (playerGrid[r][c] !== targetGrid[r][c]) {
                isMatched = false;
                break;
            }
        }
    }

    if (isMatched) {
        playSound('win');
        currentStreak++;
        streakDisplay.innerText = currentStreak;
        if (currentStreak > bestStreak) {
            bestStreak = currentStreak;
            localStorage.setItem('bestStreak', bestStreak);
            bestStreakDisplay.innerText = bestStreak;
        }
        showOverlay("🏆 SUCCESS!", "Grid Matched Perfectly!", "NEXT LEVEL");
    } else if (movesLeft === 0) {
        playSound('lose');
        currentStreak = 0;
        streakDisplay.innerText = currentStreak;
        showOverlay("💥 GAME OVER", "Out of moves! Try again.", "TRY AGAIN");
    }
}

function showOverlay(title, msg, btnText) {
    overlayTitle.innerText = title;
    overlayMessage.innerText = msg;
    document.getElementById('overlay-action-btn').innerText = btnText;
    overlay.classList.remove('hidden');
}
