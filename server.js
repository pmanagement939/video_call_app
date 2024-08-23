const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const ADMIN_PASSWORD = "admin123"; // This should be stored securely and not hardcoded in production
const rooms = {};

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    socket.on('createRoom', (data) => {
        console.log('Create Room Request:', data);  // Debugging log
        const { roomId, adminPassword } = data;
        if (adminPassword === ADMIN_PASSWORD) {
            if (!rooms[roomId]) {
                rooms[roomId] = [];
                socket.join(roomId);
                rooms[roomId].push(socket.id);
                socket.emit('roomJoined', roomId);
            } else {
                socket.emit('error', 'Room already exists');
            }
        } else {
            socket.emit('error', 'Invalid admin password');
        }
    });

    socket.on('joinRoom', (roomId) => {
        console.log('Join Room Request:', roomId);  // Debugging log
        if (rooms[roomId]) {  // Check if room exists
            if (rooms[roomId].length < 2) { // Limit to 2 participants
                socket.join(roomId);
                rooms[roomId].push(socket.id);
                socket.emit('roomJoined', roomId);
            } else {
                socket.emit('error', 'Room is full');
            }
        } else {
            socket.emit('error', 'Room not found');  // Room does not exist
        }
    });

    socket.on('offer', (data) => {
        console.log('Offer Received:', data);  // Debugging log
        socket.to(data.roomId).emit('offer', data);
    });

    socket.on('answer', (data) => {
        console.log('Answer Received:', data);  // Debugging log
        socket.to(data.roomId).emit('answer', data);
    });

    socket.on('candidate', (data) => {
        console.log('Candidate Received:', data);  // Debugging log
        socket.to(data.roomId).emit('candidate', data);
    });

    socket.on('endCall', (roomId) => {
        console.log('End Call Request:', roomId);  // Debugging log
        socket.to(roomId).emit('endCall');
        socket.leave(roomId);
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected');  // Debugging log
        for (const roomId in rooms) {
            rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
        }
    });
});

server.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
