var mongoose = require('mongoose');

var statSchema = new mongoose.Schema({
    connections: { type:Number, required:true },
    messages: { type:Number, required:true },
    buzzers: { type:Number, required:true }
});


module.exports = statSchema;