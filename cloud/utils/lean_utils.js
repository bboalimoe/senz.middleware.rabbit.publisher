/**
 * Created by zhanghengyang on 15/5/25.
 */


var logger = require("cloud/utils/logger.js");
var createUser = function(params,promise){


    //var promise = new AV.Promise();
    //create the user
    var user = new AV.User();
    //var keys =  Object.keys(params);
    //var _ = require("underscore");
    //_.each(keys,function(key){
    //    user.set(key, params[key]);
    //});

    //keys.forEach(
    //    function(key) {
    //        logger.error("fuck here");
    //
    //        user.set(key, params[key]);
    //    });
    user.signUp(params, {
        success: function(user) {
            // Hooray! Let them use the app now.
            logger.debug("created user id is " + user.id );

            logger.error("inner userpromise is " + JSON.stringify(promise));

            promise.resolve(user)
        },
        error: function(user, error) {
            // Show the error message somewhere and let the user try again.
            logger.error("Error: " + error.code + " " + error.message);
            promise.reject({"error":error.message});
        }
    });
    //return promise;
};


var createInstallation = function(params){

    var promise = new AV.Promise();
    var installation = new AV.Object.extend("_Installation");
    var i = new installation();

    i.save(params,{
        success:function(i){
            logger.debug("1");
            promise.resolve(i.get("user"));
        },
        error:function(i,error){
            promise.reject(error);
        }
    })
    //
    //
    return promise;

};

exports.createInstallation = createInstallation;
exports.createUser = createUser;