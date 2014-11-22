var isChannelReady, isInitiator = false, isStarted = false;
var localStream, remoteStream, peerConnection;

var peerConnectionConfig = {
    'iceServers': [
        { 'url': 'stun:stun.l.google.com:19302' }
    ]
};
var sdpConstraints = {
    'mandatory': {
        'OfferToReceiveAudio':true,
        'OfferToReceiveVideo':true
    }
};

var socket = io.connect();

var userID;
var roomName = window.location.pathname.replace('/', '');
var room;


////////// ROOMS //////////
if (roomName !== '') {
    console.log('CLIENT:    Connecting to room', roomName);

    userID = getRandomKey(8);

    var roomObj = {
        name: roomName,
        clientID: userID
    };

    socket.emit('create or join', roomObj);
}

socket.on('p2p-room-created', function (data){
    console.log('CLIENT:    Created room ' + JSON.stringify(data));

    room = data;
    isInitiator = true;
});

socket.on('p2p-setup-done', function (data){
    console.log("CLIENT:    Setup done: " + JSON.stringify(data));

    room = data;
    isChannelReady = true;
});

socket.on('p2p-room-full', function (){
    console.log('CLIENT:    This room is full');
});

function getRandomKey(length) {
    var charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var result = '';

    for (var i = 0; i < length; i++) {
        var pos = Math.floor(Math.random() * charSet.length);
        result += charSet.substring(pos,pos+1);
    }
    return result;
}


////////// MESSAGES //////////
socket.on('p2p-message', function(message) {
    if (message === 'got-local-user-media') {
        tryStartup();
    }
    else if (message.type === 'offer') {
        if (!isInitiator && !isStarted) {
            tryStartup();
        }

        peerConnection.setRemoteDescription(new RTCSessionDescription(message));
        startAnswer();
    }
    else if (message.type === 'answer' && isStarted) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(message));
    }
    else if (message.type === 'candidate' && isStarted) {
        var candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        });
        peerConnection.addIceCandidate(candidate);
    }
    else if (message === 'bye' && isStarted) {
    }
});

function sendMessage(message, room) {
    socket.emit('p2p-message', message, room);
}


////////// SETUP LOCAL //////////
var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

navigator.getUserMedia = navigator.webkitGetUserMedia;
navigator.getUserMedia({audio: true, video: true}, getUserMediaCallback, getUserMediaErrorCallback);

function getUserMediaCallback(stream) {
    localVideo.src = window.URL.createObjectURL(stream);
    localStream = stream;

    if (typeof room !== 'undefined') {
        sendMessage('got-local-user-media', room);
    }
}

function getUserMediaErrorCallback(error) {
    console.log('Error while getting user media.');
}

function tryStartup() {
    if (!isStarted && typeof localStream != "undefined" && isChannelReady) {
        createPeerConnection();

        peerConnection.addStream(localStream);

        isStarted = true;

        if (isInitiator) {
            startCall();
        }
    }
}


////////// SETUP PEER CONNECTION //////////
function createPeerConnection() {
    try {
        peerConnection = new webkitRTCPeerConnection(peerConnectionConfig);
        peerConnection.onicecandidate = handleIceCandidate;
        peerConnection.onaddstream = handleRemoteStreamAdded;
        peerConnection.onremovestream = handleRemoteStreamRemoved;

        console.log("CLIENT:    Created peer connection.");
    }
    catch (e) {
        console.log("Failed to create RTCPeerConnection (" + e.message + ")");
        return;
    }
}

function handleIceCandidate(event) {
    console.log('CLIENT:    HandleIceCandidate event: ', event);
    if (event.candidate) {
        sendMessage({
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate}, room);
    } else {
        console.log('CLIENT:    End of candidates.');
    }
}

function handleRemoteStreamAdded(event) {
    console.log('CLIENT:    Remote stream added.');
    remoteVideo.src = window.URL.createObjectURL(event.stream);
    remoteStream = event.stream;
}

function handleRemoteStreamRemoved(event) {
    console.log('CLIENT:    Remote stream removed. Event: ', event);
}

function startCall() {
    console.log("CLIENT:    Sending offer to peer");
    peerConnection.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function startAnswer() {
    console.log("CLIENT:    Sending answer to peer");
    peerConnection.createAnswer(setLocalAndSendMessage, null, sdpConstraints);
}

function setLocalAndSendMessage(sessionDescription) {
    //sessionDescription.sdp = preferOpus(sessionDescription.sdp);          // audio codec not really needed?
    peerConnection.setLocalDescription(sessionDescription);
    console.log('CLIENT:    Sending description message:' + sessionDescription);
    sendMessage(sessionDescription, room);
}

function handleCreateOfferError() {
    console.log("Create offer error (" + e + ")");
}


////////// AUDIO CODEC //////////
function preferOpus(sdp) {
    var sdpLines = sdp.split('\r\n');
    var mLineIndex;
    // Search for m line.
    for (var i = 0; i < sdpLines.length; i++) {
        if (sdpLines[i].search('m=audio') !== -1) {
            mLineIndex = i;
            break;
        }
    }
    if (mLineIndex === null) {
        return sdp;
    }

    // If Opus is available, set it as the default in m line.
    for (i = 0; i < sdpLines.length; i++) {
        if (sdpLines[i].search('opus/48000') !== -1) {
            var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
            if (opusPayload) {
                sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
            }
            break;
        }
    }

    // Remove CN in m line and sdp.
    sdpLines = removeCN(sdpLines, mLineIndex);

    sdp = sdpLines.join('\r\n');
    return sdp;
}

function extractSdp(sdpLine, pattern) {
    var result = sdpLine.match(pattern);
    return result && result.length === 2 ? result[1] : null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
    var elements = mLine.split(' ');
    var newLine = [];
    var index = 0;
    for (var i = 0; i < elements.length; i++) {
        if (index === 3) { // Format of media starts from the fourth.
            newLine[index++] = payload; // Put target payload to the first.
        }
        if (elements[i] !== payload) {
            newLine[index++] = elements[i];
        }
    }
    return newLine.join(' ');
}

// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
    var mLineElements = sdpLines[mLineIndex].split(' ');
    // Scan from end for the convenience of removing an item.
    for (var i = sdpLines.length-1; i >= 0; i--) {
        var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
        if (payload) {
            var cnPos = mLineElements.indexOf(payload);
            if (cnPos !== -1) {
                // Remove CN payload from m line.
                mLineElements.splice(cnPos, 1);
            }
            // Remove CN line in sdp
            sdpLines.splice(i, 1);
        }
    }

    sdpLines[mLineIndex] = mLineElements.join(' ');
    return sdpLines;
}



////////// PAGE ///////////
document.getElementById('room-chat-input').onkeypress = function(e){
    if (!e) e = window.event;
    var keyCode = e.keyCode || e.which;
    if (keyCode == '13'){
        var inputLocalChat = document.getElementById('room-chat-input');

        var chatObj = {
            origin: userID,
            message: inputLocalChat.value
        };

        socket.emit('chat-message', chatObj, room);
        inputLocalChat.value = '';
    }
};

socket.on('chat-message', function(chat) {
    var localChatContainer = document.getElementById('room-chat-local-container');
    var remoteChatContainer = document.getElementById('room-chat-remote-container');

    console.log(JSON.stringify(chat));

    if (chat.origin === userID) {
        localChatContainer.insertAdjacentHTML('beforeend', '<p>' + chat.message + '</p>');
    }
    else {
        remoteChatContainer.insertAdjacentHTML('beforeend', '<p>' + chat.message + '</p>');
    }
});