var mongoose = require('mongoose');
var dbURL = 'mongodb://hoot:gohd55ran6fOLODkeIKc6HiI65EM.QJxvnTmkInhyrg-@ds045087.mongolab.com:45087/hoot';

module.exports = (function() {
    var db = mongoose.connect(dbURL);

    mongoose.connection.on("open", function() {
        console.log("Connection open with: " + dbURL);
    });
})();