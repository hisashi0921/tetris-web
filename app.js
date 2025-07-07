// ゲーム設定
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 30;

// ゲーム状態
let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let gameOver = false;
let paused = false;
let dropTime = 0;
let dropInterval = 1000; // 1秒

// キャンバス要素
const gameCanvas = document.getElementById('game-canvas');
const gameCtx = gameCanvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');

// UI要素
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');
const gameOverElement = document.getElementById('game-over');
const pauseOverlayElement = document.getElementById('pause-overlay');
const finalScoreElement = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

// テトリミノの定義
const TETROMINOS = {
    I: {
        shape: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        color: '#00f5ff'
    },
    O: {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: '#ffff00'
    },
    T: {
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#a000f0'
    },
    S: {
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        color: '#00f000'
    },
    Z: {
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        color: '#f00000'
    },
    J: {
        shape: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#0000f0'
    },
    L: {
        shape: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#ff7f00'
    }
};

// ピース クラス
class Piece {
    constructor(type) {
        this.type = type;
        this.shape = TETROMINOS[type].shape;
        this.color = TETROMINOS[type].color;
        this.x = Math.floor(BOARD_WIDTH / 2) - Math.floor(this.shape[0].length / 2);
        this.y = 0;
    }

    // ピースを回転
    rotate() {
        const rotated = this.shape[0].map((_, index) =>
            this.shape.map(row => row[index]).reverse()
        );
        
        const originalShape = this.shape;
        this.shape = rotated;
        
        // 回転後の位置調整（簡易SRS）
        if (!this.isValidPosition()) {
            // 左右に移動を試す
            this.x--;
            if (!this.isValidPosition()) {
                this.x += 2;
                if (!this.isValidPosition()) {
                    this.x--;
                    this.shape = originalShape; // 回転を戻す
                }
            }
        }
    }

    // 有効な位置かチェック
    isValidPosition(offsetX = 0, offsetY = 0) {
        for (let y = 0; y < this.shape.length; y++) {
            for (let x = 0; x < this.shape[y].length; x++) {
                if (this.shape[y][x]) {
                    const newX = this.x + x + offsetX;
                    const newY = this.y + y + offsetY;
                    
                    if (newX < 0 || newX >= BOARD_WIDTH || 
                        newY >= BOARD_HEIGHT || 
                        (newY >= 0 && board[newY][newX])) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    // ピースを移動
    move(dx, dy) {
        if (this.isValidPosition(dx, dy)) {
            this.x += dx;
            this.y += dy;
            return true;
        }
        return false;
    }

    // ハードドロップ
    hardDrop() {
        while (this.move(0, 1)) {
            // 落下し続ける
        }
    }
}

// ゲーム初期化
function initGame() {
    // ボードを初期化
    board = Array(BOARD_HEIGHT).fill().map(() => Array(BOARD_WIDTH).fill(0));
    
    // ゲーム状態をリセット
    score = 0;
    level = 1;
    lines = 0;
    gameOver = false;
    paused = false;
    dropTime = 0;
    dropInterval = 1000;
    
    // 新しいピースを生成
    nextPiece = createRandomPiece();
    spawnNewPiece();
    
    // UIを更新
    updateUI();
    gameOverElement.classList.add('hidden');
    pauseOverlayElement.classList.add('hidden');
}

// ランダムなピースを生成
function createRandomPiece() {
    const types = Object.keys(TETROMINOS);
    const randomType = types[Math.floor(Math.random() * types.length)];
    return new Piece(randomType);
}

// 新しいピースをスポーン
function spawnNewPiece() {
    currentPiece = nextPiece;
    nextPiece = createRandomPiece();
    
    if (!currentPiece.isValidPosition()) {
        gameOver = true;
        finalScoreElement.textContent = score;
        gameOverElement.classList.remove('hidden');
    }
}

// ピースをボードに固定
function lockPiece() {
    for (let y = 0; y < currentPiece.shape.length; y++) {
        for (let x = 0; x < currentPiece.shape[y].length; x++) {
            if (currentPiece.shape[y][x]) {
                const boardY = currentPiece.y + y;
                const boardX = currentPiece.x + x;
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.color;
                }
            }
        }
    }
    
    // ライン消去をチェック
    clearLines();
    
    // 新しいピースをスポーン
    spawnNewPiece();
}

// ライン消去
function clearLines() {
    let linesCleared = 0;
    
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(Array(BOARD_WIDTH).fill(0));
            linesCleared++;
            y++; // 同じ行を再チェック
        }
    }
    
    if (linesCleared > 0) {
        // スコア計算: 消去ライン数 × 消去ライン数 × 100
        score += linesCleared * linesCleared * 100;
        lines += linesCleared;
        
        // レベルアップ（10ライン毎）
        const newLevel = Math.floor(lines / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        }
        
        updateUI();
        playSound('lineClear');
    }
}

// UIを更新
function updateUI() {
    scoreElement.textContent = score;
    levelElement.textContent = level;
    linesElement.textContent = lines;
}

// ゲームループ
function gameLoop(timestamp) {
    if (!gameOver && !paused) {
        // ピースの自動落下
        if (timestamp - dropTime > dropInterval) {
            if (!currentPiece.move(0, 1)) {
                lockPiece();
            }
            dropTime = timestamp;
        }
        
        // 描画
        draw();
    }
    
    requestAnimationFrame(gameLoop);
}

// 描画
function draw() {
    // ゲームボードをクリア
    gameCtx.fillStyle = '#000';
    gameCtx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
    
    // ボードを描画
    for (let y = 0; y < BOARD_HEIGHT; y++) {
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (board[y][x]) {
                gameCtx.fillStyle = board[y][x];
                gameCtx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                gameCtx.strokeStyle = '#333';
                gameCtx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
            }
        }
    }
    
    // 現在のピースを描画
    if (currentPiece) {
        gameCtx.fillStyle = currentPiece.color;
        for (let y = 0; y < currentPiece.shape.length; y++) {
            for (let x = 0; x < currentPiece.shape[y].length; x++) {
                if (currentPiece.shape[y][x]) {
                    const drawX = (currentPiece.x + x) * BLOCK_SIZE;
                    const drawY = (currentPiece.y + y) * BLOCK_SIZE;
                    gameCtx.fillRect(drawX, drawY, BLOCK_SIZE, BLOCK_SIZE);
                    gameCtx.strokeStyle = '#333';
                    gameCtx.strokeRect(drawX, drawY, BLOCK_SIZE, BLOCK_SIZE);
                }
            }
        }
    }
    
    // 次のピースを描画
    drawNextPiece();
}

// 次のピースを描画
function drawNextPiece() {
    nextCtx.fillStyle = '#000';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (nextPiece) {
        const blockSize = 20;
        const offsetX = (nextCanvas.width - nextPiece.shape[0].length * blockSize) / 2;
        const offsetY = (nextCanvas.height - nextPiece.shape.length * blockSize) / 2;
        
        nextCtx.fillStyle = nextPiece.color;
        for (let y = 0; y < nextPiece.shape.length; y++) {
            for (let x = 0; x < nextPiece.shape[y].length; x++) {
                if (nextPiece.shape[y][x]) {
                    const drawX = offsetX + x * blockSize;
                    const drawY = offsetY + y * blockSize;
                    nextCtx.fillRect(drawX, drawY, blockSize, blockSize);
                    nextCtx.strokeStyle = '#333';
                    nextCtx.strokeRect(drawX, drawY, blockSize, blockSize);
                }
            }
        }
    }
}

// 効果音を再生（Web Audio API使用）
function playSound(type) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        switch (type) {
            case 'lineClear':
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.3);
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                break;
            case 'hardDrop':
                oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                break;
        }
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        // 音声再生に失敗した場合は無視
    }
}

// キーボードイベント
document.addEventListener('keydown', (e) => {
    if (gameOver) return;
    
    switch (e.code) {
        case 'ArrowLeft':
            e.preventDefault();
            if (!paused && currentPiece) {
                currentPiece.move(-1, 0);
            }
            break;
        case 'ArrowRight':
            e.preventDefault();
            if (!paused && currentPiece) {
                currentPiece.move(1, 0);
            }
            break;
        case 'ArrowDown':
            e.preventDefault();
            if (!paused && currentPiece) {
                currentPiece.move(0, 1);
            }
            break;
        case 'KeyZ':
            e.preventDefault();
            if (!paused && currentPiece) {
                currentPiece.rotate();
            }
            break;
        case 'KeyX':
            e.preventDefault();
            if (!paused && currentPiece) {
                currentPiece.rotate();
            }
            break;
        case 'Space':
            e.preventDefault();
            if (!paused && currentPiece) {
                currentPiece.hardDrop();
                playSound('hardDrop');
                lockPiece();
            }
            break;
        case 'KeyP':
            e.preventDefault();
            paused = !paused;
            if (paused) {
                pauseOverlayElement.classList.remove('hidden');
            } else {
                pauseOverlayElement.classList.add('hidden');
            }
            break;
    }
});

// リスタートボタンのイベント
restartBtn.addEventListener('click', () => {
    initGame();
});

// ゲーム開始
initGame();
gameLoop(0);

