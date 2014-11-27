var utils = require('./utils/utils.js');

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');


var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));


homeController = require('./routes/index.js')(app);

var rooms = {};

//app.set('domain', 'hoot.azurewebsites.net');
app.set('domain', '172.30.26.22');
app.set('port', process.env.PORT || 3000);
var server = app.listen(app.get('port'), function() {
    utils.log("Server started on port " + server.address().port);
});

var io = require('socket.io').listen(server);
io.sockets.on('connection', function(socket) {
    socket.on('p2p-message', function (message, room) {
        io.to(room.name).emit('p2p-message', message);
    });

    socket.on('create or join', function (room) {
        var numberOfClients = 0;
        if (typeof rooms[room.name] !== 'undefined') {
            numberOfClients = rooms[room.name].clients;
        }
        var roomName = room.name;

        utils.log("Room (" + room.name + ") has " + numberOfClients + " client(s)");
        utils.log("User (" + socket.request.connection.remoteAddress + ") requests to join or create room " + room.name);

        if (numberOfClients == 0){
            rooms[roomName] = {
                initiator: room.clientID,
                callee: null,
                name: room.name,
                clients: 1
            };

            socket.join(room.name);
            io.to(room.name).emit('p2p-room-created', rooms[roomName]);
        }
        else if (numberOfClients == 1) {
            rooms[roomName].callee = room.clientID;
            rooms[roomName].clients = 2;

            socket.join(room.name);
            io.to(room.name).emit('p2p-setup-done', rooms[roomName]);
        }
        else {
            socket.emit('p2p-room-full');
        }

        utils.log("Current rooms: " + JSON.stringify(rooms));
    });

    socket.on('chat-message', function (chat, room) {
        io.to(room.name).emit('chat-message', chat);
    });

    socket.on('buzzer-message', function(buzzer, room) {
        io.to(room.name).emit('buzzer-message', buzzer);
    });
});

module.exports = app;