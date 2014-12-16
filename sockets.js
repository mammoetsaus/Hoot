var sockets = function(server) {
    var rooms = {};
    var utils = require('./utils/utils.js');
    var statRepository = require('./data/repositories/genericRepository')('stat');
    var io = require('socket.io').listen(server);

    io.sockets.on('connection', function(socket) {
        notifyRoomUpdates();

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

                updateConnections();
            }
            else {
                socket.emit('p2p-room-full');
            }

            utils.log("Current rooms: " + JSON.stringify(rooms));
        });

        socket.on('chat-message', function (chat, room) {
            io.to(room.name).emit('chat-message', chat);

            updateMessages();
        });

        socket.on('buzzer-message', function(buzzer, room) {
            io.to(room.name).emit('buzzer-message', buzzer);

            updateBuzzers();
        });

        socket.on('quit', function (userID, room) {
            if (rooms[room.name].initiator === userID) {
                rooms[room.name].initiator = null;
                rooms[room.name].clients--;
            }
            else if (rooms[room.name].callee === userID) {
                rooms[room.name].callee = null;
                rooms[room.name].clients--;
            }

            if (rooms[room.name].clients === 0) {
                delete rooms[room.name];
            }
            else {
                io.to(room.name).emit('quit');
            }
        });
    });

    var updateMessages = function() {
        statRepository.getByID("548d9049fe3324b4c88e2ad2", function(stat) {
            stat[0].messages++;

            statRepository.update(stat[0], function(result) {
                if (1 == result) utils.log("Successfully updated messages");

                notifyRoomUpdates();
            });
        });
    };

    var updateBuzzers = function() {
        statRepository.getByID("548d9049fe3324b4c88e2ad2", function(stat) {
            stat[0].buzzers++;

            statRepository.update(stat[0], function(result) {
                if (1 == result) utils.log("Successfully updated buzzers");

                notifyRoomUpdates();
            });
        });
    };

    var updateConnections = function() {
        statRepository.getByID("548d9049fe3324b4c88e2ad2", function(stat) {
            stat[0].connections++;

            statRepository.update(stat[0], function(result) {
                if (1 == result) utils.log("Successfully updated connections");

                notifyRoomUpdates();
            });
        });
    };

    var notifyRoomUpdates = function() {
        statRepository.getByID("548d9049fe3324b4c88e2ad2", function(stat) {
            io.emit("update-stats", stat);
        });
    };
};


module.exports = sockets;