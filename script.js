var board;
var score = 0;
var rows = 4;
var columns = 4;

var undoStack = [];
var maxUndo = 20;
var gameOver = false;

const STORAGE_KEYS = {
    GAME_STATE: "gameState_2048",
    LEADERS: "leaders_2048"
};

window.onload = function() {

    document.getElementById("restart-btn").addEventListener("click", restartGame);
    document.getElementById("undo-btn").addEventListener("click", undoMove);
    document.getElementById("leaders-btn").addEventListener("click", openLeaders);
    document.getElementById("clear-leaders-btn").addEventListener("click", clearLeaders);

    document.getElementById("close-leaders-btn").addEventListener("click", closeLeaders);
    document.getElementById("play-again-btn").addEventListener("click", () => {
        closeGameOverModal();
        restartGame();
    });
    document.getElementById("save-score-btn").addEventListener("click", saveScore);
    document.getElementById("player-name").addEventListener("keydown", (e) => {
        if (e.key === "Enter") saveScore();
    });

    document.querySelectorAll("#mobile-controls .mobile-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (gameOver) return;
            const dir = btn.getAttribute("data-direction");
            handleMove(dir);
        });
    });

    document.addEventListener('keyup', (e) => {
        if (gameOver) return;
        if (e.code == "ArrowLeft") handleMove("left");
        else if (e.code == "ArrowRight") handleMove("right");
        else if (e.code == "ArrowUp") handleMove("up");
        else if (e.code == "ArrowDown") handleMove("down");
    });

    addSwipeListeners(document.getElementById("board"));

    const saved = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.board) {
                board = parsed.board;
                score = parsed.score || 0;
                undoStack = parsed.undoStack || [];
                gameOver = parsed.gameOver || false;
                renderBoard();
                updateScore();
                if (gameOver) {
                    showGameOverModal();
                }
                return;
            }
        } catch (err) {
            console.warn("Не удалось загрузить сохранённое состояние:", err);
        }
    }

    setGame();
}

function setGame() {
    score = 0;
    gameOver = false;
    undoStack = [];

    board = [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ];

    const boardEl = document.getElementById("board");
    while (boardEl.firstChild) {
        boardEl.removeChild(boardEl.firstChild);
    }

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            const tile = document.createElement("div");
            tile.id = `${r}-${c}`;
            updateTile(tile, board[r][c]);
            boardEl.appendChild(tile);
        }
    }

    const initial = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < initial; i++) {
        setTwo();
    }

    updateScore();
    saveGameState();
    showMobileControls();
}

function updateTile(tile, num) {
    tile.innerText = "";
    tile.classList.value = ""; 
    tile.classList.add("tile");
    if (num > 0) {
        tile.innerText = num.toString();
        if (num <= 4096) {
            tile.classList.add("x"+num.toString());
        } else {
            tile.classList.add("x8192");
        }                
    }
}

function renderBoard() {
    const boardEl = document.getElementById("board");
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            let tile = document.getElementById(`${r}-${c}`);
            if (!tile) {
                tile = document.createElement("div");
                tile.id = `${r}-${c}`;
                tile.classList.add("tile");
                boardEl.appendChild(tile);
            }
            updateTile(tile, board[r][c]);
        }
    }
}


function updateScore() {
    document.getElementById("score").innerText = score;
    document.getElementById("final-score").innerText = score;
}

function cloneBoard(b) {
    return b.map(row => row.slice());
}

function boardsEqual(a, b) {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            if (a[r][c] !== b[r][c]) return false;
        }
    }
    return true;
}

function pushUndo() {
    undoStack.push({
        board: cloneBoard(board),
        score: score
    });
    if (undoStack.length > maxUndo) undoStack.shift();
}

function undoMove() {
    if (gameOver) return; 
    if (undoStack.length === 0) return;
    const last = undoStack.pop();
    board = cloneBoard(last.board);
    score = last.score;
    renderBoard();
    updateScore();
    saveGameState();
}

function handleMove(direction) {

    pushUndo();

    const prevBoard = cloneBoard(board);
    const prevScore = score;

    if (direction === "left") slideLeft();
    else if (direction === "right") slideRight();
    else if (direction === "up") slideUp();
    else if (direction === "down") slideDown();

    if (boardsEqual(prevBoard, board)) {
        if (undoStack.length) undoStack.pop();
        return;
    }

    const emptyCount = countEmptyTiles();
    if (emptyCount > 0) {
        const toAdd = Math.min(emptyCount, (Math.random() < 0.2 ? 2 : 1)); 
        for (let i = 0; i < toAdd; i++) setTwo();
    }

    renderBoard();
    updateScore();
    saveGameState();

    if (!canMove()) {
        gameOver = true;
        showGameOverModal();

        undoStack = [];
        saveGameState();
    }
}

document.addEventListener('keyup', (e) => {

});

function filterZero(row){
    return row.filter(num => num != 0); 
}

function slide(row) {
    row = filterZero(row); 
    for (let i = 0; i < row.length-1; i++){
        if (row[i] == row[i+1]) {
            row[i] *= 2;
            row[i+1] = 0;
            score += row[i];
        }
    } 
    row = filterZero(row); 

    while (row.length < columns) {
        row.push(0);
    } 
    return row;
}

function slideLeft() {
    for (let r = 0; r < rows; r++) {
        let row = board[r].slice();
        row = slide(row);
        board[r] = row;
    }
}

function slideRight() {
    for (let r = 0; r < rows; r++) {
        let row = board[r].slice();         
        row.reverse();              
        row = slide(row);            
        board[r] = row.reverse();   
    }
}

function slideUp() {
    for (let c = 0; c < columns; c++) {
        let row = [board[0][c], board[1][c], board[2][c], board[3][c]];
        row = slide(row);

        for (let r = 0; r < rows; r++){
            board[r][c] = row[r];
        }
    }
}

function slideDown() {
    for (let c = 0; c < columns; c++) {
        let row = [board[0][c], board[1][c], board[2][c], board[3][c]];
        row.reverse();
        row = slide(row);
        row.reverse();

        for (let r = 0; r < rows; r++){
            board[r][c] = row[r];
        }
    }
}

function setTwo() {
    if (!hasEmptyTile()) {
        return;
    }
    let found = false;
    // 90% 2, 10% 4 — стандартное поведение
    const tileValue = (Math.random() < 0.1) ? 4 : 2;

    while (!found) {
        let r = Math.floor(Math.random() * rows);
        let c = Math.floor(Math.random() * columns);
        if (board[r][c] == 0) {
            board[r][c] = tileValue;
            found = true;
        }
    }
}

function hasEmptyTile() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            if (board[r][c] == 0) { 
                return true;
            }
        }
    }
    return false;
}

function countEmptyTiles() {
    let count = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            if (board[r][c] === 0) count++;
        }
    }
    return count;
}

function canMove() {
    if (hasEmptyTile()) return true;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            const v = board[r][c];
            if (c < columns - 1 && board[r][c+1] === v) return true;
            if (r < rows - 1 && board[r+1][c] === v) return true;
        }
    }
    return false;
}

function showGameOverModal() {
    renderBoard(); 
    updateScore();
    const modal = document.getElementById("game-over-modal");
    modal.style.display = "flex";
    document.getElementById("save-score-section").classList.remove("hidden");
    document.getElementById("score-saved-message").classList.add("hidden");
    document.getElementById("player-name").value = "";
    hideMobileControls();
}

function closeGameOverModal() {
    const modal = document.getElementById("game-over-modal");
    modal.style.display = "none";
    showMobileControls();
}

function saveScore() {
    const nameInput = document.getElementById("player-name");
    const name = nameInput.value.trim();
    if (!name) {
        nameInput.focus();
        return;
    }

    const leaders = getLeaders();
    const entry = {
        name: name,
        score: score,
        date: new Date().toISOString()
    };
    leaders.push(entry);
    leaders.sort((a, b) => b.score - a.score);

    const top = leaders.slice(0, 10);
    localStorage.setItem(STORAGE_KEYS.LEADERS, JSON.stringify(top));

    document.getElementById("save-score-section").classList.add("hidden");
    document.getElementById("score-saved-message").classList.remove("hidden");

    saveGameState(); 
}

function getLeaders() {
    const raw = localStorage.getItem(STORAGE_KEYS.LEADERS);
    if (!raw) return [];
    try {
        return JSON.parse(raw) || [];
    } catch (err) {
        return [];
    }
}

function openLeaders() {
    const modal = document.getElementById("leaders-modal");
    const list = document.getElementById("leaders-list");
    const clearBtn = document.getElementById("clear-leaders-btn");

    while (list.firstChild) {
        list.removeChild(list.firstChild);
    }

    const leaders = getLeaders();

    if (leaders.length === 0) {
        const msg = document.createElement("p");
        msg.textContent = "no records yet.";
        list.appendChild(msg);
        clearBtn.classList.add("hidden");
    } else {
        leaders.forEach(item => {
            const el = document.createElement("div");
            el.classList.add("leader-item");

            const nameEl = document.createElement("div");
            nameEl.classList.add("leader-name");
            nameEl.textContent = item.name;

            const scoreEl = document.createElement("div");
            scoreEl.classList.add("leader-score");
            scoreEl.textContent = item.score;

            const dateEl = document.createElement("div");
            dateEl.classList.add("leader-date");
            const d = new Date(item.date);
            dateEl.textContent = d.toLocaleString();

            el.appendChild(nameEl);
            el.appendChild(scoreEl);
            el.appendChild(dateEl);
            list.appendChild(el);
        });
        clearBtn.classList.remove("hidden");
    }

    modal.style.display = "flex";
    hideMobileControls();
}

function closeLeaders() {
    const modal = document.getElementById("leaders-modal");
    modal.style.display = "none";
    showMobileControls();
}

function restartGame() {
    localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
    setGame();
    closeLeaders();
    closeGameOverModal();
}

function saveGameState() {
    const payload = {
        board: board,
        score: score,
        undoStack: undoStack,
        gameOver: gameOver
    };
    localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(payload));
}

function hideMobileControls() {
    const el = document.getElementById("mobile-controls");
    if (el) el.classList.add("hidden");
}

function showMobileControls() {
    const el = document.getElementById("mobile-controls");
    if (!el) return;

    if (!gameOver && document.getElementById("leaders-modal").style.display !== "flex") {
        el.classList.remove("hidden");
    } else {
        el.classList.add("hidden");
    }
}

function addSwipeListeners(el) {
    if (!el) return;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    const threshold = 30; 

    el.addEventListener("touchstart", function(e) {
        if (gameOver) return;
        const t = e.changedTouches[0];
        touchStartX = t.screenX;
        touchStartY = t.screenY;
    }, {passive: true});

    el.addEventListener("touchend", function(e) {
        if (gameOver) return;
        const t = e.changedTouches[0];
        touchEndX = t.screenX;
        touchEndY = t.screenY;

        const dx = touchEndX - touchStartX;
        const dy = touchEndY - touchStartY;

        if (Math.abs(dx) > Math.abs(dy)) {
            if (Math.abs(dx) > threshold) {
                if (dx > 0) handleMove("right");
                else handleMove("left");
            }
        } else {
            if (Math.abs(dy) > threshold) {
                if (dy > 0) handleMove("down");
                else handleMove("up");
            }
        }
    }, {passive: true});
}

function renderBoard() {
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
            let tile = document.getElementById(r.toString() + "-" + c.toString());
            if (!tile) {
                tile = document.createElement("div");
                tile.id = r.toString() + "-" + c.toString();
                tile.classList.add("tile");
                document.getElementById("board").append(tile);
            }
            updateTile(tile, board[r][c]);
        }
    }
}

function updateTile(tile, num) {
    tile.innerText = "";
    tile.classList.value = ""; 
    tile.classList.add("tile");
    if (num > 0) {
        tile.innerText = num.toString();
        if (num <= 4096) {
            tile.classList.add("x"+num.toString());
        } else {
            tile.classList.add("x8192");
        }                
    }
}

function clearLeaders() {
    if (confirm("are u sure u want to clear leaders table?")) {
        localStorage.removeItem(STORAGE_KEYS.LEADERS);

        const list = document.getElementById("leaders-list");
        while (list.firstChild) {
            list.removeChild(list.firstChild);
        }

        const msg = document.createElement("p");
        msg.textContent = "table is empty!";
        list.appendChild(msg);

        document.getElementById("clear-leaders-btn").classList.add("hidden");
    }
}


window.addEventListener("beforeunload", function() {
    saveGameState();
});
