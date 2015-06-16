var AV = require('leanengine');
var publisher = require('cloud/rabbit_lib/publisher');
var logger = require("cloud/utils/logger");
var _ = require("underscore");
var n = require("nonce")();
var uuid = require("uuid");
var createInstallation = require("cloud/utils/lean_utils.js").createInstallation;
var createUser = require("cloud/utils/lean_utils.js").createUser;

/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function(request, response) {
    response.success('Hello world!');
});




//var installation_params = {
//    "androidID":"123",
//    "deviceID":"234",
//    "_Installation":"14ljalsdjgaouojlajdfl",
//    "macAddress":"d8:e5:6d:a1:de:a2",
//    "simSerialNumber":"12ljljljl"
//
//
//};

//
var Installation = AV.Object.extend("_Installation");
var application = AV.Object.extend("Application");

AV.Cloud.define("createInstallation", function(request, response) {

    logger.debug(JSON.stringify(request.params));

    var appid = request.params.appid;
    var hardwareId = request.params.hardwareId;
    var deviceType = request.params.deviceType;
    var installationIdForBroadcasting = uuid.v4();


    var installation_params = {
        "hardwareId": hardwareId,
        "deviceType": deviceType,
        "installationId":installationIdForBroadcasting
    };
    //now policy is one user corresponds to one hardwareid
    //
    var user_promise = new AV.Promise();

    var user_query = new AV.Query(AV.User);

    user_query.startsWith("username",hardwareId);
    //logger.error("fuck here")

    user_query.find({
        success:function(users){
            if(!users.length){
                createUser({
                    "username": hardwareId + n() + "anonymous",
                    "password": hardwareId
                    //"isAnonymous":true
                },user_promise);
            }
            else{
                var user = users[0];
                user_promise.resolve(user);
            }
        },
        error:function(error){
            user_promise.reject(error);
        }
    });


    var app_query = new AV.Query(application);
    var promise = new AV.Promise();
    logger.error("outer userpromise is " + JSON.stringify(user_promise));
    user_promise.then(
        function(user){
            logger.error("fuck herer");

            app_query.get(appid, {
                success: function (app) {
                    installation_params["application"] = app;
                    installation_params["user"] = user;
                    promise.resolve(installation_params);
                },
                error: function (object, error) {

                    if (error.code === AV.Error.OBJECT_NOT_FOUND) {
                        promise.reject("app object " + JSON.stringify(object) + "does not exist!");
                    }
                    else {
                        promise.reject("app object " + JSON.stringify(object) + "retrieve meets " + JSON.stringify(error));
                    }
                }
            });

        },
        function(error){
            promise.reject(error);
        }
    );

    promise.then(
        function (params) {
            var i = new Installation();
            i.save(params, {
                success: function (installation) {
                    logger.debug("_Installation object is " + JSON.stringify(installation))
                    logger.debug(_.has(installation,"createdAt"));
                    //var ca = installation.get("createdAt");
                    var createdAt = installation.createdAt
                    //logger.error(cb);
                    response.success({"id": installation.id,"createdAt": createdAt});
                },
                error: function (object, error) {
                    var err = "_Installation object " + JSON.stringify(object) + "retrieve meets " + JSON.stringify(error);
                    logger.error(err);
                    response.error({"error": err})
                }
            })
        },
        function (error) {
            logger.error(error);
            response.error({"error": error})

        }
    );
});






var UserStatus = AV.Object.extend("UserStatus");


AV.Cloud.afterSave("_User",function(request){
    console.log("A new user is created.");
    var user_id = request.object.id;
    var user_status = new UserStatus();
    console.log("fuck here");
    var user_pointer = AV.Object.createWithoutData("_User", user_id);

    user_status.set("user", user_pointer);
    user_status.save().then(
        function (result){
            console.log("A new user status is created.");
            // response.success({
            //         code: 0,
            //         userStatusId: result.id,
            //         message: "A new user status is created.."
            // });
        },
        function (error){
            console.log("A user's status created failed. error msg:" + JSON.stringify(error));
            // response.error(error);
        }
    );
});



AV.Cloud.afterSave('Log', function(request) {


    var type = request.object.get("type");
    logger.debug(type);
    if(type === "sensor"){

        logger.info('There is a new motion comming.');
        msg = {
            'objectId': request.object.id,
            'timestamp': Date.now()
        };
        logger.info('The new motion object id: ' + request.object.id);
        publisher.publishMessage(msg, 'new_motion_arrival');

    }
    else if(type === "mic"){
        logger.info('There is a new sound comming.');
        msg = {
            'objectId': request.object.id,
            'timestamp': Date.now()
        };
        logger.info('The new sound object id: ' + request.object.id);
        publisher.publishMessage(msg, 'new_sound_arrival');
    }
    else if(type === "location"){

        logger.info('There is a new location comming.');
        msg = {
            'objectId': request.object.id,
            'timestamp': Date.now()
        };
        logger.info('The new location object id: ' + request.object.id);
        publisher.publishMessage(msg, 'new_location_arrival');
    }
    else{

        logger.error("just saved object type doesn't match any value [sensor],[mic],[location]")
    }

});



module.exports = AV.Cloud;
