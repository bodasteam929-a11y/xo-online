const firebaseConfig = {
    apiKey: "AIzaSyB66cpOFZkbZ6V3SlITgGPCJpz1pYZsiY0",
    authDomain: "old-games-6a7d1.firebaseapp.com",
    databaseURL: "https://old-games-6a7d1-default-rtdb.firebaseio.com/",
    projectId: "old-games-6a7d1",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let roomCode = "", mySymbol = "", myName = "";

function createRoom() {
    myName = document.getElementById('playerName').value;
    if (!myName) return alert("اكتب اسمك الأول!");
    roomCode = Math.floor(1000 + Math.random() * 9000).toString();
    mySymbol = "X";
    db.ref('rooms/' + roomCode).set({
        p1: myName, p2: "", board: ["","","","","","","","",""],
        turn: "X", status: "waiting", winner: "", rematchRequest: false
    });
    initRoom();
}

function joinRoom() {
    myName = document.getElementById('playerName').value;
    roomCode = document.getElementById('roomCodeInput').value;
    if (!myName || !roomCode) return alert("اكمل البيانات!");
    db.ref('rooms/' + roomCode).once('value', snap => {
        if (snap.exists() && snap.val().p2 === "") {
            mySymbol = "O";
            db.ref('rooms/' + roomCode).update({ p2: myName });
            initRoom();
        } else { alert("الغرفة غير موجودة أو ممتلئة!"); }
    });
}

function initRoom() {
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('waitingRoom').style.display = 'block';
    document.getElementById('displayRoomCode').innerText = roomCode;
    
    db.ref('rooms/' + roomCode).on('value', snap => {
        const data = snap.val();
        if (!data) return;
        document.getElementById('p1-slot').innerText = "X: " + data.p1;
        document.getElementById('p2-slot').innerText = "O: " + (data.p2 || "انتظار...");
        if (mySymbol === "X" && data.p2) document.getElementById('startBtn').style.display = 'block';
        
        // مراقبة طلب إعادة اللعب
        const rematchModal = document.getElementById('rematchModal');
        if (data.rematchRequest === true && mySymbol === "O") {
            rematchModal.style.display = 'flex';
        } else {
            rematchModal.style.display = 'none';
        }

        if (data.status === "playing") {
            document.getElementById('waitingRoom').style.display = 'none';
            document.getElementById('resultModal').style.display = 'none';
            document.getElementById('gameZone').style.display = 'block';
            drawBoard(data.board);
            updateUI(data.turn, data.winner);
        }
    });
}

function startGame() { db.ref('rooms/' + roomCode).update({ status: "playing" }); }

function drawBoard(board) {
    const cells = document.querySelectorAll('.cell');
    board.forEach((v, i) => { 
        cells[i].innerText = v; 
        cells[i].style.color = v === "X" ? "#e94560" : "#38bdf8";
    });
}

function updateUI(turn, winner) {
    const modal = document.getElementById('resultModal');
    if (winner !== "") {
        modal.style.display = 'flex';
        document.getElementById('winnerMessage').innerText = winner === "Draw" ? "🤝 تعادل!" : `🎉 الفائز: ${winner}`;
        document.getElementById('adminControls').style.display = mySymbol === "X" ? "block" : "none";
        document.getElementById('waitMessage').style.display = mySymbol === "O" ? "block" : "none";
    } else {
        modal.style.display = 'none';
        document.getElementById('turnStatus').innerText = turn === mySymbol ? "دوارك الآن! 🔥" : "انتظر الخصم... ⏳";
    }
}

function makeMove(i) {
    db.ref('rooms/' + roomCode).once('value', snap => {
        const d = snap.val();
        if (d.turn === mySymbol && d.board[i] === "" && d.winner === "" && d.status === "playing") {
            d.board[i] = mySymbol;
            let next = mySymbol === "X" ? "O" : "X";
            db.ref('rooms/' + roomCode).update({ board: d.board, turn: next });
            checkWin(d.board, d.p1, d.p2);
        }
    });
}

function checkWin(b, p1, p2) {
    const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (let l of lines) {
        if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[0]] === b[l[2]]) {
            return db.ref('rooms/' + roomCode).update({ winner: b[l[0]] === "X" ? p1 : p2 });
        }
    }
    if (!b.includes("")) db.ref('rooms/' + roomCode).update({ winner: "Draw" });
}

// طلب إعادة اللعب
function requestRestart() {
    db.ref('rooms/' + roomCode).update({ rematchRequest: true });
    document.getElementById('adminControls').style.display = 'none';
    document.getElementById('winnerMessage').innerText = "⏳ في انتظار رد الخصم...";
}

// الموافقة على إعادة اللعب
function acceptRematch() {
    db.ref('rooms/' + roomCode).update({
        board: ["","","","","","","","",""], turn: "X", winner: "", status: "playing", rematchRequest: false
    });
}

function goToLobby() { db.ref('rooms/' + roomCode).remove().then(() => location.reload()); }