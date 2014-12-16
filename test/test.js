var assert = require('assert');
var utils = require('../utils/utils.js');

describe('Key Generator', function () {
    describe('Check length', function () {
        it("should return 8 for every generated key", function(done) {
            utils.getRandomKey(8, function(result){
                assert.strictEqual(result.length, 8);

                done();
            });
        });
    });
    describe('Unique values', function() {
        it("10000 keys", function(done) {
            var keys = [];

            for (var i = 0; i < 10000; i++) {
                utils.getRandomKey(8, function(result) {
                    keys.push(result);
                });
            }

            checkIfArrayIsUnique(keys);

            done();
        });
    });
});

function checkIfArrayIsUnique(arr)  {
    for (var i = 0; i < arr.length; i++) {
        if (arr.indexOf(arr[i]) !== arr.lastIndexOf(arr[i])) {
            return false;
        }
    }

    return true;
}