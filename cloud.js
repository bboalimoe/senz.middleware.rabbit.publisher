var AV = require('leanengine');
var publisher = require('./essential_modules/rabbit_lib/publisher');
var log = require("./essential_modules/utils/logger").log;
var logger = new log("cloud module");
var _ = require("underscore");
var n = require("nonce")();
var uuid = require("uuid");
var createInstallation = require("./essential_modules/utils/lean_utils.js").createInstallation;
var createUser = require("./essential_modules/utils/lean_utils.js").createUser;
var bugsnag = require("bugsnag");


/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function(request, response) {

    if(process.env.APP_ENV === "prod"){
        bugsnag_token = "6d2d076a299f9c0bf18e06312fa00065"
    }else{
        bugsnag_token = "464c8f44539ff84fe3aa5e4059d35e9c"
    }

    bugsnag.register(bugsnag_token);
    bugsnag.notify(1111);


    //var bugsnag = require("bugsnag");
            //var bug_init = require("./essential_modules/utils/bug_catch.js");
            //bug_init();
    logger.info("","bugsnag initialized");
    
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

    logger.debug("createInstallation",JSON.stringify(request.params));

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
    user_promise.then(
        function(user){
            logger.info("createInstallation","User created!");

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
                    logger.debug("createInstallation","_Installation object is " + JSON.stringify(installation))
                    //var ca = installation.get("createdAt");
                    var createdAt = installation.createdAt
                    response.success({"id": installation.id,"createdAt": createdAt});
                },
                error: function (object, error) {
                    var err = "_Installation object " + JSON.stringify(object) + "retrieve meets " + JSON.stringify(error);
                    logger.error("createInstallation",err);
                    response.error({"error": err})
                }
            })
        },
        function (error) {
            logger.error("createInstallation",error);
            response.error({"error": error})

        }
    );
});




var UserStatus = AV.Object.extend("UserStatus");


AV.Cloud.afterSave("_User",function(request){


    logger.info("UserStatus Hook","A new user is created.");
    var user_id = request.object.id;
    var user_status = new UserStatus();
    var user_pointer = AV.Object.createWithoutData("_User", user_id);

    user_status.set("user", user_pointer);
    user_status.save().then(
        function (result){
            logger.info("UserStatus Hook","A new user status is created.");
            // response.success({
            //         code: 0,
            //         userStatusId: result.id,
            //         message: "A new user status is created.."
            // });
        },
        function (error){
            logger.error("UserStatus Hook","A user's status created failed. error msg: " + JSON.stringify(error));
            // response.error(error);
        }
    );
});



AV.Cloud.afterSave('Log', function(request) {


    var type = request.object.get("type");
    logger.debug("Log to Rabbitmq", type);
    if(type === "sensor"){

        logger.info("Log to Rabbitmq",'There is a new motion comming.');
        msg = {
            'objectId': request.object.id,
            'timestamp': Date.now()
        };
        logger.info("Log to Rabbitmq",'The new motion object id: ' + request.object.id);
        publisher.publishMessage(msg, 'new_motion_arrival');

    }
    else if(type === "mic"){
        logger.info("Log to Rabbitmq",'There is a new sound comming.');
        msg = {
            'objectId': request.object.id,
            'timestamp': Date.now()
        };
        logger.info("Log to Rabbitmq",'The new sound object id: ' + request.object.id);
        publisher.publishMessage(msg, 'new_sound_arrival');
    }
    else if(type === "location"){

        logger.info("Log to Rabbitmq",'There is a new location comming.');
        msg = {
            'objectId': request.object.id,
            'timestamp': Date.now()
        };
        logger.info("Log to Rabbitmq",'The new location object id: ' + request.object.id);
        publisher.publishMessage(msg, 'new_location_arrival');
    }
    else{

        logger.error("Log to Rabbitmq","just saved object type doesn't match any value [sensor],[mic],[location]")
    }

});



module.exports = AV.Cloud;
