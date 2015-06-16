/**
 * Created by zhanghengyang on 15/5/25.
 */

var AV = require("leanengine");
var log = require("./logger.js");
var logger = new log("lean_utils");
var _Installation = AV.Object.extend("_Installation");

var createUser = function(params,promise){


    var user = new AV.User();

    user.save(params, {
        success: function(user) {
            // Hooray! Let them use the app now.
            logger.debug("","created user id is " + user.id );
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
    var i = new _Installation();

    i.save(params,{
        success:function(i){
            logger.debug("","Installation created successfully, Object is " + JSON.stringify(i));
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