var utils = require('./utils/utils.js');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var dbcon = require('./data/context/context.js');

var app = express();
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

homeController = require('./routes/index.js')(app);

app.set('domain', 'hoot.azurewebsites.net');
app.set('port', process.env.PORT || 3000);
var server = app.listen(app.get('port'), function() {
    utils.log("Server started on port " + server.address().port);
});

require('./sockets.js')(server);

module.exports = app;