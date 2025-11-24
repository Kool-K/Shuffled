const board = document.getElementById("puzzle-board");
const moveCountDisplay = document.getElementById("move-count");
const timerDisplay = document.getElementById("timer");
const refImg = document.getElementById("ref-img");
const winModal = document.getElementById("win-modal");

// Modal & Control Elements
const galleryModal = document.getElementById("gallery-modal");
const galleryGrid = document.getElementById("gallery-grid");
const openGalleryBtn = document.getElementById("open-gallery-btn");
const closeGalleryBtn = document.getElementById("close-gallery");
const uploadInput = document.getElementById("upload-input");

const newGameBtn = document.getElementById("new-game-btn");
const playAgainBtn = document.getElementById("play-again-btn");

const modalGalleryBtn = document.getElementById("modal-gallery-btn");
const modalUploadBtn = document.getElementById("modal-upload-btn");

// Configuration
const GRID_SIZE = 4;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;

// State
let tiles = [];
let moves = 0;
let timerInterval;
let seconds = 0;
let isGameActive = false;
let currentImageSrc = ""; 

// --- LOCAL IMAGE CONFIGURATION ---
const galleryImages = [
    // need to convert all to webp so let's rewrite
    "1.webp", "2.webp", "3.webp", "4.webp",
    "5.webp", "6.webp", "7.webp", "8.webp",
    "9.webp", "10.webp", "11.webp", "12.webp",
    "13.webp", "14.webp", "15.webp", "16.webp"
];

// --- CORE IMAGE OPTIMIZER ---
function processImageAndStart(sourceUrl) {
    const img = new Image();
    img.crossOrigin = "Anonymous"; 
    
    img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Fixed performance size
        const maxSize = 600;
        canvas.width = maxSize;
        canvas.height = maxSize;

        // Center Crop Logic
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        // Draw to canvas
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, maxSize, maxSize);

        // Save optimized image
        currentImageSrc = canvas.toDataURL('image/jpeg', 0.85);
        
        // Start Game
        initGame();
    };

    img.src = sourceUrl;
}

// --- INITIALIZATION ---

function initGame() {
    resetStats();
    tiles = generateSolvableBoard();
    refImg.src = currentImageSrc;
    renderBoard();
    startTimer();
    isGameActive = true;
    winModal.classList.add("hidden");
}


// --- GALLERY & UPLOAD LOGIC ---

function initGallery() {
    galleryGrid.innerHTML = "";
    galleryImages.forEach(filename => {
        const img = document.createElement("img");
        const url = `images/${filename}`;
        
        img.src = url;
        img.classList.add("gallery-item");
        img.loading = "lazy";

        img.addEventListener("click", () => {
            galleryModal.classList.add("hidden");
            processImageAndStart(url);
        });
        galleryGrid.appendChild(img);
    });
}

// Handle Local Upload
uploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            processImageAndStart(event.target.result);
        };
        reader.readAsDataURL(file);
    }
});

// Start with the first image
window.onload = () => {
    processImageAndStart(`images/${galleryImages[0]}`);
};

// --- BOARD GENERATION & MATH ---

function generateSolvableBoard() {
    let newBoard = Array.from({ length: TOTAL_TILES }, (_, i) => (i + 1) % TOTAL_TILES);
    do {
        shuffleArray(newBoard);
    } while (!isSolvable(newBoard) || isSolved(newBoard));
    return newBoard;
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function isSolvable(boardState) {
    let inversions = 0;
    const emptyIndex = boardState.indexOf(0);
    const emptyRowFromBottom = GRID_SIZE - Math.floor(emptyIndex / GRID_SIZE);

    for (let i = 0; i < boardState.length; i++) {
        for (let j = i + 1; j < boardState.length; j++) {
            if (boardState[i] !== 0 && boardState[j] !== 0 && boardState[i] > boardState[j]) {
                inversions++;
            }
        }
    }

    if (emptyRowFromBottom % 2 !== 0) {
        return inversions % 2 === 0;
    } else {
        return inversions % 2 !== 0;
    }
}

// --- RENDERING (UPDATED FOR RESPONSIVE) ---

function renderBoard() {
    board.innerHTML = "";

    tiles.forEach((tileValue, index) => {
        const tile = document.createElement("div");
        tile.classList.add("tile");

        if (tileValue === 0) {
            tile.classList.add("empty-tile");
        } else {
            const originalIndex = tileValue - 1;
            const x = originalIndex % GRID_SIZE; // Column
            const y = Math.floor(originalIndex / GRID_SIZE); // Row

            // Background Image
            tile.style.backgroundImage = `url('${currentImageSrc}')`;

            // --- RESPONSIVE CALCULATION ---
            // 1. Image Size: 400% (Because it's a 4x4 grid, image must cover 4 tiles width)
            tile.style.backgroundSize = `${GRID_SIZE * 100}%`;

            // 2. Position: Calculated as percentage to be responsive
            // Formula: index * (100% / (GRID_SIZE - 1))
            const xPos = x * (100 / (GRID_SIZE - 1));
            const yPos = y * (100 / (GRID_SIZE - 1));

            tile.style.backgroundPosition = `${xPos}% ${yPos}%`;
            // -----------------------------

            // Interaction
            tile.addEventListener("click", () => handleMouseClick(index));
            tile.addEventListener("mousedown", (e) => handleDragStart(e, index));
            tile.addEventListener("touchstart", (e) => handleDragStart(e, index));
        }
        board.appendChild(tile);
    });
}

// --- MOVEMENT LOGIC ---

let draggedTileIndex = null;
let dragStartX = 0;
let dragStartY = 0;

function handleDragStart(e, index) {
    // Only track if game is active
    if (!isGameActive) return;

    if (e.type === 'mousedown') {
        e.preventDefault();
        dragStartX = e.clientX;
        dragStartY = e.clientY;
    } else if (e.type === 'touchstart') {
        // Don't preventDefault here to allow scrolling on non-tile areas,
        // but .tile CSS has touch-action: none so it should be fine.
        dragStartX = e.touches[0].clientX;
        dragStartY = e.touches[0].clientY;
    }
    draggedTileIndex = index;
}

document.addEventListener("mouseup", (e) => handleDragEnd(e, 'mouse'));
document.addEventListener("touchend", (e) => handleDragEnd(e, 'touch'));

function handleDragEnd(e, type) {
    if (!isGameActive || draggedTileIndex === null) return;

    let dragEndX, dragEndY;

    if (type === 'touch') {
        // Fallback if touch ended off-screen
        if (!e.changedTouches || e.changedTouches.length === 0) return;
        dragEndX = e.changedTouches[0].clientX;
        dragEndY = e.changedTouches[0].clientY;
    } else {
        dragEndX = e.clientX;
        dragEndY = e.clientY;
    }

    const diffX = dragEndX - dragStartX;
    const diffY = dragEndY - dragStartY;

    // Threshold of 15px to count as a drag
    if (Math.abs(diffX) > 15 || Math.abs(diffY) > 15) {
        attemptMove(draggedTileIndex, diffX, diffY);
    }
    draggedTileIndex = null;
}

function attemptMove(index, diffX, diffY) {
    const emptyIndex = tiles.indexOf(0);
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0) { 
            if (index + 1 === emptyIndex && index % GRID_SIZE !== GRID_SIZE - 1) swapTiles(index, emptyIndex);
        } else {
            if (index - 1 === emptyIndex && index % GRID_SIZE !== 0) swapTiles(index, emptyIndex);
        }
    } else {
        if (diffY > 0) {
            if (index + GRID_SIZE === emptyIndex) swapTiles(index, emptyIndex);
        } else {
            if (index - GRID_SIZE === emptyIndex) swapTiles(index, emptyIndex);
        }
    }
}

function handleMouseClick(index) {
    if (!isGameActive) return;
    const emptyIndex = tiles.indexOf(0);
    if (isAdjacent(index, emptyIndex)) {
        swapTiles(index, emptyIndex);
    }
}

document.addEventListener("keydown", (e) => {
    if (!isGameActive) return;
    
    // Prevent default scrolling for arrow keys
    if(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
    }

    const emptyIndex = tiles.indexOf(0);
    const row = Math.floor(emptyIndex / GRID_SIZE);
    const col = emptyIndex % GRID_SIZE;
    let targetIndex = -1;

    // Logic reversed for intuitive keyboard control
    // (If I press Down, I want the tile ABOVE the gap to move DOWN)
    if (e.key === "ArrowDown" && row > 0) targetIndex = emptyIndex - GRID_SIZE;
    else if (e.key === "ArrowUp" && row < GRID_SIZE - 1) targetIndex = emptyIndex + GRID_SIZE;
    else if (e.key === "ArrowRight" && col > 0) targetIndex = emptyIndex - 1;
    else if (e.key === "ArrowLeft" && col < GRID_SIZE - 1) targetIndex = emptyIndex + 1;

    if (targetIndex !== -1) swapTiles(targetIndex, emptyIndex);
});

function isAdjacent(idx1, idx2) {
    const r1 = Math.floor(idx1 / GRID_SIZE), c1 = idx1 % GRID_SIZE;
    const r2 = Math.floor(idx2 / GRID_SIZE), c2 = idx2 % GRID_SIZE;
    return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1;
}

function swapTiles(idx1, idx2) {
    [tiles[idx1], tiles[idx2]] = [tiles[idx2], tiles[idx1]];
    moves++;
    moveCountDisplay.innerText = moves;
    renderBoard();
    checkWin();
}

function checkWin() {
    if (isSolved(tiles)) {
        gameWon();
    }
}

function isSolved(currentTiles) {
    const solvedState = Array.from({ length: TOTAL_TILES }, (_, i) => (i + 1) % TOTAL_TILES);
    return currentTiles.every((val, index) => val === solvedState[index]);
}

function gameWon() {
    isGameActive = false;
    clearInterval(timerInterval);
    document.getElementById("final-moves").innerText = moves;
    document.getElementById("final-time").innerText = formatTime(seconds);
    winModal.classList.remove("hidden");
}

function startTimer() {
    clearInterval(timerInterval);
    seconds = 0;
    timerDisplay.innerText = "00:00";
    timerInterval = setInterval(() => {
        seconds++;
        timerDisplay.innerText = formatTime(seconds);
    }, 1000);
}

function formatTime(secs) {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function resetStats() {
    moves = 0;
    moveCountDisplay.innerText = "0";
}

newGameBtn.addEventListener("click", initGame);
playAgainBtn.addEventListener("click", initGame);

openGalleryBtn.addEventListener("click", () => {
    initGallery();
    galleryModal.classList.remove("hidden");
});
closeGalleryBtn.addEventListener("click", () => galleryModal.classList.add("hidden"));
window.addEventListener("click", (e) => {
    if (e.target === galleryModal) galleryModal.classList.add("hidden");


// --- NEW MODAL BUTTON LISTENERS ---

// 1. Gallery button inside the Win Modal
modalGalleryBtn.addEventListener("click", () => {
    winModal.classList.add("hidden"); // Hide win modal
    initGallery(); // Load images
    galleryModal.classList.remove("hidden"); // Show gallery modal
});

// 2. Upload button inside the Win Modal
modalUploadBtn.addEventListener("click", () => {
    // Clever hack: We just programmatically click the hidden input field in the sidebar
    uploadInput.click();
    winModal.classList.add("hidden"); // Hide the modal so they can see the file picker
});
});