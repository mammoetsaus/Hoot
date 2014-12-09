var mongoose = require('mongoose');
var statSchema = require('../schemas/stat.js');

var stat = mongoose.model('stat', statSchema, "stats");


module.exports = stat;