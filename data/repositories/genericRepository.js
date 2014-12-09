var genericRepository = function(model) {
    var generic = require('../models/' + model + '.js');

    all = function(resultCallback) {
        generic.find({}).exec(function(err, document) {
            if (err) console.log("All error: " + err);

            resultCallback(document);
        });
    };

    getByID = function(id, resultCallback) {
        generic.find({ _id: id }).exec(function(err, document) {
            if (err) console.log("GetByID error: " + err);

            resultCallback(document);
        });
    };

    insert = function(object, resultCallback) {
        object.save(function(err, response) {
            if (err) console.log("Insert error: " + err);

            resultCallback(response);
        });
    };

    update = function(object, resultCallback) {
        generic.findOne({ _id: object._id }, function(err, document) {
            if (err) console.log("Find error: " + err);
            else if (document == null) console.log("Update error: Object doesn't exist.");
            else {
                document.update(object, function(err, response) {
                    if (err) console.log("Update error: " + err);

                    resultCallback(response);
                });
            }
        });
    };

    remove = function(id, resultCallback) {
        generic.findOne({ _id: id }, function(err, document) {
            if (err) console.log("Find error: " + err);
            else if (document == null) console.log("Delete error: Object doesn't exist.");
            else {
                document.remove(function(err, response) {
                    if (err) console.log("Delete error: " + err);

                    resultCallback(response);
                })
            }
        });
    };

    return {
        all: all,
        getByID: getByID,
        insert: insert,
        update: update,
        remove: remove
    };
};


module.exports = genericRepository;