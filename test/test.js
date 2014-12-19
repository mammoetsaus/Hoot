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
        it("should generate 100000 unique keys (mocha --timeout 150000)", function(done) {
            var keys = [];

            for (var i = 0; i < 100000; i++) {
                utils.getRandomKey(8, function(result) {
                    keys.push(result);
                });
            }

            var unigueKeys = keys.filter(onlyUnique);

            assert.strictEqual(keys.length, unigueKeys.length);

            done();
        });
    });
});

function onlyUnique(value, index, self)  {
    return self.indexOf(value) === index;
}