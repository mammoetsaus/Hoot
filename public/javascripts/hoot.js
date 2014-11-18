var socket = io.connect();

socket.on('message', function(message) {
    console.log(message);
});