Utils = (function() {
    var log = function(message) {
        console.log("SERVER:    " + message + ".");
    };

    var getRandomKey = function(length) {
        var charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var result = '';

        for (var i = 0; i < length; i++) {
            var pos = Math.floor(Math.random() * charSet.length);
            result += charSet.substring(pos,pos+1);
        }
        return result;
    }

    return {
        log: log,
        getRandomKey: getRandomKey
    };
})();

module.exports = Utils;