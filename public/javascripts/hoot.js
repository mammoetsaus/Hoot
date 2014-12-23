var isChannelReady, isInitiator = false, isStarted = false;
var localStream, remoteStream, peerConnection;

var peerConnectionConfig = {
    'iceServers': [
        {
            'url': 'stun:stun.l.google.com:19302'
        },
        {
            'url': 'turn:192.158.30.23:3478?transport=udp',
            'credential': '0MGZpeb8Z8yjT+aLlwIPkLqfQEI=',
            'username': '1417376336:hoot'
        },
        {
            'url': 'turn:192.158.30.23:3478?transport=tcp',
            'credential': '0MGZpeb8Z8yjT+aLlwIPkLqfQEI=',
            'username': '1417376336:hoot'
        }
    ]
};
var sdpConstraints = {
    'mandatory': {
        'OfferToReceiveAudio':true,
        'OfferToReceiveVideo':true
    }
};

var socket = io.connect();

var roomName = window.location.pathname.replace('/', '');
var room, userID;


////////// ROOMS //////////
if (roomName !== '') {
    console.log('CLIENT:    Connecting to room', roomName);

    getRandomKey(8, function(key) {
        userID = key;

        var roomObj = {
            name: roomName,
            clientID: userID
        };

        socket.emit('create or join', roomObj);
    });
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

    enableControls();

    document.getElementById('room-stats').style.display = "block";
});

socket.on('p2p-room-full', function (){
    document.getElementById('room-error').style.display = "block";
    document.getElementById('room-stats').style.display = "none";
});

function getRandomKey(length, gotKeyCallback) {
    var charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var result = '';

    for (var i = 0; i < length; i++) {
        var pos = Math.floor(Math.random() * charSet.length);
        result += charSet.substring(pos,pos+1);
    }

    gotKeyCallback(result);
}

function enableControls() {
    var inputElement = document.getElementById('room-chat-input');
    inputElement.disabled = false;
    inputElement.style.opacity = 1;
    inputElement.focus();

    var buzzerElement = document.getElementById('fab-room-buzzer');
    buzzerElement.style.display = "block";

    document.getElementById('fab-room-buzzer').onclick = function () {
        var buzzerObj = {
            origin: userID
        };

        socket.emit('buzzer-message', buzzerObj, room);
    };
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
});

socket.on('quit', function() {
    isInitiator = true;
    isStarted = false;
    isChannelReady = false;

    peerConnection.close();
    peerConnection = null;

    tryStartup();
});

function sendMessage(message, room) {
    socket.emit('p2p-message', message, room);
}


////////// SETUP LOCAL //////////
var localVideo = document.querySelector('#local-video');
var remoteVideo = document.querySelector('#remote-video');

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
window.onbeforeunload = function(e) {
    socket.emit('quit', userID, room);
}

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

document.getElementById('room-link-copy').onclick = function(e) {
    console.log("copying the shit");
    var item = document.getElementById('room-link-text');
    item.select();

    document.execCommand('copy', null, '');
};

document.getElementById('room-error').onclick = function(e) {
    window.location.assign("/Index/");
}

socket.on('chat-message', function(chat) {
    var localChatContainer = document.getElementById('local-chat-container');
    var remoteChatContainer = document.getElementById('remote-chat-container');

    console.log(JSON.stringify(chat));

    if (chat.origin === userID) {
        checkUrl(chat.message, function(success) {
            if (success) {
                localChatContainer.insertAdjacentHTML('afterbegin', '<a href="' + chat.message +'" target="_blank">' + chat.message + '</a>');
            }
            else {
                localChatContainer.insertAdjacentHTML('afterbegin', '<p>' + chat.message + '</p>');
            }
        });
    }
    else {
        checkUrl(chat.message, function(success) {
            if (success) {
                remoteChatContainer.insertAdjacentHTML('afterbegin', '<a href="' + chat.message +'" target="_blank">' + chat.message + '</a>');
            }
            else {
                remoteChatContainer.insertAdjacentHTML('afterbegin', '<p>' + chat.message + '</p>');
            }
        });
    }
});

socket.on('buzzer-message', function(buzzer) {
    var buzzerSound = document.getElementById('sound-buzzer');
    buzzerSound.play();

    if (buzzer.origin === userID) {
        var remoteVideo = document.getElementById('remote-video');
        remoteVideo.classList.add("buzzer-animation");
        setTimeout(function() {
            remoteVideo.classList.remove("buzzer-animation");
        }, 500);
    }
    else {
        var container = document.getElementById('room-content-container');
        container.classList.add("buzzer-animation");
        setTimeout(function() {
            container.classList.remove("buzzer-animation");
        }, 500);
    }
});

socket.on('update-stats', function(stat) {
    var elements = document.getElementById('room-stats').getElementsByTagName("p");

    elements[0].innerHTML = stat[0].connections + " connections";
    elements[1].innerHTML = stat[0].messages + " messages";
    elements[2].innerHTML = stat[0].buzzers + " buzzers";
});

function checkUrl(str, checkUrlCallback) {
    var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
        '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    if(!pattern.test(str)) {
        checkUrlCallback(false);
    } else {
        checkUrlCallback(true);
    }
}