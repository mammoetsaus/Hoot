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
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


homeController = require('./routes/index.js')(app);


app.set('port', process.env.PORT || 3000);
var server = app.listen(app.get('port'), function() {
    utils.log("Server started on port " + server.address().port);
});

var io = require('socket.io').listen(server);
io.sockets.on('connection', function(socket) {
    utils.log("Client (" + socket.request.connection.remoteAddress + ") connected");

    socket.emit('message', "Client connected");
});

module.exports = app;