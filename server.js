// 1. بنستدعي الادوات
const express = require('express'); // عشان نعمل موقع
const http = require('http');
const { Server } = require("socket.io"); // عشان الصوت المباشر

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let rooms = []; // هنا هنحفظ الغرف

// 2. دي الصفحة اللي الناس هتشوفها - كلها HTML جوه الكود
app.get('/', (req,res)=>{
res.send(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>حكايتي - بث صوتي</title>
<style>
body{background:#0a0a1a;color:#fff;font-family:sans-serif;text-align:center}
.container{max-width:600px;margin:30px auto;padding:20px;background:#1a1a3a;border-radius:20px}
h1{color:#ff0050}
input{width:80%;padding:12px;border-radius:10px;border:none;margin:10px}
.btn{padding:15px 25px;margin:10px;border:none;border-radius:15px;font-size:18px;cursor:pointer;font-weight:900}
.btn-live{background:#ff0050;color:#fff}
.btn-join{background:#00f2ea;color:#000}
.room{background:#222;padding:15px;border-radius:15px;margin:10px;cursor:pointer}
#liveRoom{display:none}
</style>
</head>
<body>
<div class="container">
<h1>📖 حكايتي</h1>
<input id="name" placeholder="اكتب اسمك">

<div>
<button class="btn btn-live" onclick="startLive()">🎤 ابدأ بث</button>
</div>

<h2>الغرف المباشرة</h2>
<div id="roomsList">جاري التحميل...</div>

<div id="liveRoom">
<h2 id="roomTitle"></h2>
<p id="status">جار تشغيل المايك...</p>
<button class="btn" id="micBtn" onclick="toggleMic()">🎤 كتم</button>
<button class="btn btn-join" onclick="leaveRoom()">خروج</button>
</div>

</div>

<script src="/socket.io/socket.io.js"></script>
<script>
const socket = io(); // بنتصل بالسيرفر
let localStream; let currentRoom = null; let isMicOn = true;

function startLive(){
    let name = document.getElementById('name').value || 'مجهول';
    let roomName = prompt('اسم الغرفة:');
    if(!roomName) return;
    socket.emit('createRoom', {name: roomName, host: name}); // بنقول للسيرفر اعمل غرفة
    joinRoom(socket.id);
}

socket.on('rooms', (rooms)=>{ // بنستقبل قائمة الغرف من السيرفر
    let html = '';
    rooms.forEach(r=>{
        html += \`<div class="room" onclick="joinRoom('\${r.id}')">
            <h3>\${r.name}</h3>
            <p>المستضيف: \${r.host} | 👥 \${r.count}</p>
        </div>\`;
    });
    document.getElementById('roomsList').innerHTML = html || 'لا يوجد غرف';
});

function joinRoom(id){
    let name = document.getElementById('name').value || 'مجهول';
    currentRoom = id;
    socket.emit('joinRoom', {roomId: id, name: name});
    document.getElementById('liveRoom').style.display='block';
    document.getElementById('roomTitle').innerText = 'انت في الغرفة';
    startAudio();
}

async function startAudio(){
    localStream = await navigator.mediaDevices.getUserMedia({audio:true}); // بنطلب المايك
    document.getElementById('status').innerText = 'المايك شغال';
}

function toggleMic(){
    isMicOn = !isMicOn;
    localStream.getAudioTracks()[0].enabled = isMicOn;
    document.getElementById('micBtn').innerText = isMicOn ? '🎤 كتم' : '🔇 فتح';
}

function leaveRoom(){
    localStream.getTracks().forEach(t=>t.stop());
    socket.emit('leaveRoom', currentRoom);
    document.getElementById('liveRoom').style.display='none';
}
</script>
</body>
</html>`)});

// 3. دي اوامر السيرفر
io.on('connection', (socket)=>{
    socket.emit('rooms', rooms); // اول ما حد يدخل نبعتله الغرف

    socket.on('createRoom', (data)=>{
        let room = {id: socket.id, name: data.name, host: data.host, count: 1};
        rooms.push(room);
        socket.join(room.id);
        io.emit('rooms', rooms); // بنبعت لكل الناس ان في غرفة جديدة
    });

    socket.on('joinRoom', (data)=>{
        socket.join(data.roomId);
        let room = rooms.find(r=>r.id===data.roomId);
        if(room) room.count++;
        io.emit('rooms', rooms);
    });

    socket.on('leaveRoom', (roomId)=>{
        socket.leave(roomId);
        let room = rooms.find(r=>r.id===roomId);
        if(room) room.count--;
        io.emit('rooms', rooms);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log('التطبيق شغال'));
