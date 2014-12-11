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
        if (req.body.roomname) {
            var roomName = req.body.roomname;

            res.redirect('/' + roomName);
        }
        else {
            res.redirect('/');
        }
    });
};