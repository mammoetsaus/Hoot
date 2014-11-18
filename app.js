var utils = require('./utils/utils.js');

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(favicon(__dirname + '/public/favicon.ico'));
//app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


homeController = require('./routes/index.js')(app);

app.set('domain', 'hoot.azurewebsites.net');
app.set('port', process.env.PORT || 3000);
var server = app.listen(app.get('port'), function() {
    utils.log("Server started on port " + server.address().port);
});

var io = require('socket.io').listen(server);
io.sockets.on('connection', function(socket) {
    socket.on('message', function (message) {
        if (typeof message !== 'object') {
            utils.log("Received message: " + message);
        }
        socket.broadcast.emit('message', message);      // target only people in room...???
    });

    socket.on('create or join', function (room) {
        var clients = io.sockets.adapter.rooms[room];
        var numClients = (typeof clients !== 'undefined') ? Object.keys(clients).length : 0;

        utils.log("Room (" + room + ") has " + numClients + " client(s)");
        utils.log("User (" + socket.request.connection.remoteAddress + ") requests to join or create room " + room);

        if (numClients == 0){
            socket.join(room);
            socket.emit('created', room);
        }
        else if (numClients == 1) {
            io.sockets.in(room).emit('join', room);
            socket.join(room);
            socket.emit('joined', room);
        }
        else {
            socket.emit('full', room);
        }
    });
});

module.exports = app;