var utils = require('../utils/utils.js');

module.exports = function(app) {
    app.get('/', function(req, res) {
        res.render('home/index');
    });

    app.get('/:room', function(req, res) {
        var data = {
            room: req.params.room
        };

        res.render('home/room', data);
    });

    app.post('/room', function(req, res) {
        if (req.body.home_username) {
            var roomName = utils.getRandomKey(8);

            res.redirect('/' + roomName);
        }
        else {
            res.redirect('/');
        }
    });
};