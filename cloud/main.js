var publisher = require('cloud/rabbit_lib/publisher');
//var express = require("express");
//var middle = require("./middlewares");
//var location = require("cloud/places/init");
//var sound = require("cloud/sounds/init");
//var motion = require("cloud/motions/init");
var logger = require("cloud/utils/logger");
var _ = require("underscore");
var n = require("nonce")();
var uuid = require("uuid");
var createInstallation = require("cloud/utils/lean_utils.js").createInstallation;
var createUser = require("cloud/utils/lean_utils.js").createUser;

//var installation_params = {
//    "androidID":"123",
//    "deviceID":"234",
//    "installation":"14ljalsdjgaouojlajdfl",
//    "macAddress":"d8:e5:6d:a1:de:a2",
//    "simSerialNumber":"12ljljljl"
//
//
//};

//
var Installation = AV.Object.extend("_Installation");
var application = AV.Object.extend("Application");

AV.Cloud.define("installation", function(request, response) {

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
    )

    promise.then(
        function (params) {
            var i = new Installation();
            i.save(params, {
                success: function (installation) {
                    logger.debug("_Installation object is " + JSON.stringify(installation))
                    response.success({"_InstallationId": installation.id});
                },
                error: function (object, error) {
                    var err = "installation object " + JSON.stringify(object) + "retrieve meets " + JSON.stringify(error);
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




    //
    //
    //var installation_params = request.params;
    //var installation_string = request.params.installation;
    //logger.error(installation_string);
    //var query = new AV.Query(installation);
    //query.equalTo("installation",installation_string);
    //var p = new AV.Promise();
    //
    //query.find({
    //    success:function(results){
    //        logger.error("installed objects is " + JSON.stringify(results));
    //        if(results.length == 0) {
    //
    //            var user_params = {};
    //            user_params["username"] = "anonymous#" + installation_string;
    //            user_params["password"] = installation_string;
    //            var p2 = createUser(user_params);
    //
    //            p2.then(
    //                function (user) {
    //                    installation_params["user"] = user;
    //                    createInstallation(installation_params).then(
    //                        function(user){
    //                            logger.debug("2");
    //
    //                            logger.error("user is " + JSON.stringify(user));
    //                            p.resolve(user);
    //                    });
    //                },
    //                function (error) {
    //                    p.reject(error);
    //                });
    //
    //        } else {
    //            if (results.length > 1) {//clear the residual installations
    //
    //                logger.warn("there are more than 2 installation with same string, contact the admin");
    //                var rest_installations = _.rest(results);//_can not be userd another time
    //                var destroy_promise = AV.Object.destroyAll(rest_installations);//if there are location mic or sensor data related to the deleted installation
    //            }                                                                   //it doesn't matter
    //
    //           // logger.error("object user is " + JSON.stringify(Object.keys()) );
    //
    //            p.resolve(results[0].get("user"));
    //        }
    //    },
    //    error:function(error){
    //        logger.error("error is " + JSON.stringify(error));
    //        if(error.code === AV.Error.OBJECT_NOT_FOUND){
    //            p.reject("error is AV.Error.OBJECT_NOT_FOUND")
    //        }
    //        else{
    //            p.reject(error);
    //        }
    //    }
    //});

//    var p1 = new AV.Promise();
//    var promise = p.then(
//
//        function(installation_object) {
//        var usr_query = new AV.Query(AV.User);
//
//        logger.error("retrieved user object is "
//                      +
//        JSON.stringify(installation_object));
//
//        usr_query.equalTo("objectId",installation_object.user.id );
//        return usr_query.find({
//            success: function (results) {
//                logger.error("user objects " + JSON.stringify(results) );
//                if(results.length == 0){
//                    var user_params = {};
//                    user_params["installation"] = installation_obj;
//                    user_params["username"] = "anonymous#" + installation_obj;
//                    user_params["password"] = installation_obj.installation;
//                    //user.set("email", "shixiang@petchat.io");
//// other fields can be set just like with AV.Object
//                    user.set("phone", "13311280378");
//                    p1 = createUser(user_params);
//                }
//                else {
//                    p1.resolve(results[0]);
//                }
//            },
//            error: function (error) {
//                if (error.code === AV.Error.OBJECT_NOT_FOUND) {
//                    p.reject("error is AV.Error.OBJECT_NOT_FOUND");
//                }
//                else {
//                    p1.reject(error); // https://leancloud.cn/docs/js_guide.html#错误处理-1
//                }
//            }
//        });
//        },
//        function(error){
//            p1.reject(error);
//        }
//    );

//    p.then(
//        function(user){
//            //logger.debug("3");
//
//            //logger.error("user is " + JSON.stringify(user) );
//            response.success({"userId":user.id});
//
//        },
//        function(error){
//
//            response.error({"error":error});
//        }
//    )
//});






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

