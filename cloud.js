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
var converter = require("./essential_modules/utils/coordinate_trans.js")
var zlib = require("zlib");


/**
 * 一个简单的云代码方法
 */
AV.Cloud.define('hello', function(request, response) {

    //bugsnag deprecated!
    //if(process.env.APP_ENV === "prod"){
    //    bugsnag_token = "6d2d076a299f9c0bf18e06312fa00065"
    //}else{
    //    bugsnag_token = "464c8f44539ff84fe3aa5e4059d35e9c"
    //}
    //
    //bugsnag.register(bugsnag_token);
    //
    //

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

    var appid = request.params.appid,
        hardwareId = request.params.hardwareId,
        deviceType = request.params.deviceType,
        installationIdForBroadcasting = uuid.v4(),
        deviceToken = uuid.v4() ;

    var installation_params = {
        "hardwareId": hardwareId,
        "deviceType": deviceType,
        "installationId":installationIdForBroadcasting,
        "deviceToken":deviceToken
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
                    "password": hardwareId,
                    "os": deviceType
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
                    var userId = installation.get("user").id
                    response.success({"id": installation.id,"createdAt": createdAt, "userId": userId});
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



//AV.Cloud.afterSave("_Installation",function(request){
//
//    var installation_object = request.object;
//    logger.info("_Installation Hook",JSON.stringify(installation_object));
//    var appid = "168j9dwlm7vycnljl4h8x3jmkpokc7rq5ywf4nd7ffww3mbz";
//    var appkey = "gdvh4n189as9flc999ei21lc1bnya7cr4q3d1bfdh43u5l2t";
//    delete installation_object.updatedAt
//    delete installation_object.createdAt
//
//    lean_post(appid,appkey,installation_object,"_Installation")
//
//});
//
//
//var lean_post = function (APP_ID, APP_KEY, params,classname) {
//
//    logger.info("Post installation", "Lean post started");
//    req.post(
//        {
//            url: "https://leancloud.cn/1.1/classes/"+classname,
//            headers:{
//                "X-AVOSCloud-Application-Id":APP_ID,
//                "X-AVOSCloud-Application-Key":APP_KEY
//            },
//            json: params
//        },
//        function(err,res,body){
//            if(err != null || (res.statusCode != 200 && res.statusCode !=201) ) {
//                logger.error("Post installation","Request error log is" + err);
//            }
//            else {
//                var body_str = JSON.stringify(body)
//                logger.info("Post installation","Body is " + body_str);
//            }
//        }
//    );
//
//};

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





AV.Cloud.beforeSave("Log", function(request, response){

    var pre_type = request.object.get("type")
    var pre_source = request.object.get("source")
    var pre_location = request.object.get("location")
    var compressed = request.object.get("compressed")

    if( pre_type == "location" && pre_source == "internal"){
        c_location = converter.toBaiduCoordinate(pre_location.longitude, pre_location.latitude)
        source = "baidu offline converter"
        location = pre_location
        location.latitude = c_location.lat
        location.longitude = c_location.lng
        request.object.set("location", location)
        request.object.set("source", source)
    }

    if (pre_type == "accSensor" && compressed == "gzip" ){

        var pre_value = request.object.get("value")
        var compressed_base64_string = pre_value.events
        var buffer = new Buffer(compressed_base64_string,"base64");
        zlib.unzip(buffer,function(err, buffer){
            if(!err) {
                //console.log(JSON.stringify(buffer.toString()))
                pre_value.events = JSON.parse(buffer.toString())
                request.object.set("compressed","ungzipped")
                request.object.set("value", pre_value)

                response.success();
            }
            else{
                console.log(JSON.stringify(err))
                response.error(err)
            }
        })


    }
    else{
        response.success();
    }





});


AV.Cloud.afterSave('Log', function(request) {


    var type = request.object.get("type");
    logger.debug("Log to Rabbitmq", type);
    if(type === "accSensor"){

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
    else if(type === "calendar"){

        logger.info("Log to Rabbitmq",'There is a new calendar comming.');
        msg = {
            'object': request.object,
            'timestamp': Date.now()
        };
        logger.info("Log to Rabbitmq",'The new calendar object id: ' + request.object.id);
        publisher.publishMessage(msg, 'new_calendar_arrival');
    }else if(type === "application"){

        logger.info("Log to Rabbitmq",'There is a new applist comming.');
        msg = {
            'object': request.object,
            'timestamp': Date.now()
        };
        logger.info("Log to Rabbitmq",'The new applist object id: ' + request.object.id);
        publisher.publishMessage(msg, 'new_applist_arrival');
    }else if(type === "predictedMotion"){

        logger.info("Log to Rabbitmq",'There is a new predicted motion comming.');
        msg = {
            'object': request.object,
            'timestamp': Date.now()
        };
        logger.info("Log to Rabbitmq",'The new applist object id: ' + request.object.id);
        console.log(msg)
        publisher.publishMessage(msg, 'new_predicted_motion_arrival');
    }
    else{
        logger.error("Log to Rabbitmq","just saved object type doesn't match any value [sensor],[mic],[location]")
    }

});



module.exports = AV.Cloud;
