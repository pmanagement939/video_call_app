const socket = io();
let localStream;
let remoteStream;
let peerConnection;
const servers = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        }
    ]
};

document.getElementById('createRoom').addEventListener('click', () => {
    const adminPassword = document.getElementById('adminPassword').value;
    const roomId = document.getElementById('roomId').value;
    if (adminPassword && roomId) {
        socket.emit('createRoom', { roomId, adminPassword });
    } else {
        alert("Please enter both the admin password and room ID.");
    }
});

document.getElementById('joinRoom').addEventListener('click', () => {
    const roomId = document.getElementById('roomId').value;
    if (roomId) {
        socket.emit('joinRoom', roomId);
    }
});

document.getElementById('startCall').addEventListener('click', async () => {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById('localVideo').srcObject = localStream;

    peerConnection = new RTCPeerConnection(servers);
    peerConnection.addTrack(localStream.getTracks()[0], localStream); // Add video track
    peerConnection.addTrack(localStream.getTracks()[1], localStream); // Add audio track

    peerConnection.ontrack = event => {
        if (!remoteStream) {
            remoteStream = new MediaStream();
            document.getElementById('remoteVideo').srcObject = remoteStream;
        }
        remoteStream.addTrack(event.track);
    };

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            socket.emit('candidate', {
                candidate: event.candidate,
                roomId: document.getElementById('currentRoomId').innerText
            });
        }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', {
        offer: peerConnection.localDescription,
        roomId: document.getElementById('currentRoomId').innerText
    });
});

document.getElementById('endCall').addEventListener('click', () => {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
    }
    document.getElementById('localVideo').srcObject = null;
    document.getElementById('remoteVideo').srcObject = null;
    socket.emit('endCall', document.getElementById('currentRoomId').innerText);
    window.location.reload(); // Redirect to the main page
});

socket.on('roomJoined', roomId => {
    console.log('Joined room:', roomId);  // Debugging log
    document.getElementById('home').classList.add('hidden');
    document.getElementById('room').classList.remove('hidden');
    document.getElementById('currentRoomId').innerText = roomId;
});

socket.on('offer', async (offer) => {
    console.log('Received offer:', offer);  // Debugging log
    if (!peerConnection) {
        peerConnection = new RTCPeerConnection(servers);
        peerConnection.ontrack = event => {
            if (!remoteStream) {
                remoteStream = new MediaStream();
                document.getElementById('remoteVideo').srcObject = remoteStream;
            }
            remoteStream.addTrack(event.track);
        };

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('candidate', {
                    candidate: event.candidate,
                    roomId: document.getElementById('currentRoomId').innerText
                });
            }
        };
    }

    await peerConnection.setRemoteDescription(offer.offer);
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById('localVideo').srcObject = localStream;
    peerConnection.addTrack(localStream.getTracks()[0], localStream); // Add video track
    peerConnection.addTrack(localStream.getTracks()[1], localStream); // Add audio track

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', {
        answer: peerConnection.localDescription,
        roomId: document.getElementById('currentRoomId').innerText
    });
});

socket.on('answer', async (answer) => {
    console.log('Received answer:', answer);  // Debugging log
    await peerConnection.setRemoteDescription(answer.answer);
});

socket.on('candidate', async (candidate) => {
    console.log('Received candidate:', candidate);  // Debugging log
    await peerConnection.addIceCandidate(candidate.candidate);
});

socket.on('error', message => {
    console.error('Error:', message);  // Debugging log
    if (message === 'Room not found') {
        alert('Room not found. Please make sure the room is created by an admin.');
    } else {
        alert(message);
    }
    window.location.reload(); // Redirect to the main page if there's an error
});

socket.on('endCall', () => {
    console.log('Call ended');  // Debugging log
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
    }
    document.getElementById('localVideo').srcObject = null;
    document.getElementById('remoteVideo').srcObject = null;
    window.location.reload(); // Redirect to the main page
});
