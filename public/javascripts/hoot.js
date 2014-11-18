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
var room = window.location.pathname.replace('/', '');


////////// ROOMS //////////
if (room !== '') {
    console.log('CLIENT:    Create or join room', room);
    socket.emit('create or join', room);
}

socket.on('created', function (room){
    console.log('CLIENT:    Created room ' + room);
    isInitiator = true;
});

socket.on('full', function (room){
    console.log('CLIENT:    The room: ' + room + ' is full');
});

socket.on('join', function (room){
    console.log('CLIENT:    Another peer made a request to join room ' + room);
    console.log('CLIENT:    This peer is the initiator of room ' + room + '!');

    isChannelReady = true;
});

socket.on('joined', function (room){
    console.log('CLIENT:    This peer has joined room ' + room);

    isChannelReady = true;
});


////////// MESSAGES //////////
socket.on('message', function(message) {
    if (message === 'got user media') {
        console.log("CLIENT:    Received message from server (got user media): " + message);

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

function sendMessage(message) {
    socket.emit('message', message);
}


////////// SETUP LOCAL //////////
var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

navigator.getUserMedia = navigator.webkitGetUserMedia;
navigator.getUserMedia({audio: true, video: true}, getUserMediaCallback, getUserMediaErrorCallback);

function getUserMediaCallback(stream) {
    localVideo.src = window.URL.createObjectURL(stream);
    localStream = stream;

    sendMessage('got user media');

    if (isInitiator) {
        tryStartup();
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
            candidate: event.candidate.candidate});
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
    sendMessage(sessionDescription);
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