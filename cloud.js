var AV = require('leanengine');
var publisher = require('./essential_modules/rabbit_lib/publisher');
var log = require("./essential_modules/utils/logger").log;
var logger = new log("cloud hook");
//var _ = require("underscore");
var n = require("nonce")();
var uuid = require("uuid");
var createInstallation = require("./essential_modules/utils/lean_utils.js").createInstallation;
var createUser = require("./essential_modules/utils/lean_utils.js").createUser;
//var bugsnag = require("bugsnag");
var converter = require("./essential_modules/utils/coordinate_trans.js");
var alertist = require("./essential_modules/utils/send_notify.js");
var apn = require("apn");
var zlib = require("zlib");
var Installation = AV.Object.extend("_Installation");
var application = AV.Object.extend("Application");

ios_log_flag = {};


var createConnection = function(installationId){
    if(!ios_log_flag[installationId]){
        flagReset(installationId);
    }

    if(!ios_log_flag[installationId].apnConnection || !ios_log_flag[installationId].device){
        var installation_query = new AV.Query(Installation);
        installation_query.equalTo("objectId", installationId);
        return installation_query.find()
            .then(
                function(installation_array){
                    var installation = installation_array[0];
                    var token = installation.get('token');
                    if(token){
                        ios_log_flag[installationId].device = new apn.Device(token);
                        ios_log_flag[installationId].has_token = token ? true: false;
                    }else{
                        ios_log_flag[installationId].device = null;
                        ios_log_flag[installationId].has_token = token ? true: false;
                        return AV.Promise.error("don't have token");
                    }

                    var appId = installation.get('application').id;
                    var app_query = new AV.Query(application);
                    app_query.equalTo("objectId", appId);
                    return app_query.find();
                },
                function(e){
                    return AV.Promise.error(e);
                })
            .then(
                function(app_array){
                    var app = app_array[0];
                    var cert_url = app.get('cert_url') || "";
                    var key_url = app.get('key_url') || "";
                    return AV.Promise.all([
                        AV.Cloud.httpRequest({ url: cert_url }),
                        AV.Cloud.httpRequest({ url: key_url }),
                        app.get('passphrase')
                    ]);
                },
                function(e){
                    return AV.Promise.error(e);
                })
            .then(
                function(response) {
                    var cert = response[0].buffer;
                    var key = response[1].buffer;
                    var passpharse = response[2];

                    if(cert && key){
                        var apnConnection =
                            new apn.Connection({
                                cert: cert,
                                key: key,
                                production: false,
                                passphrase: passpharse
                            });
                    }else{
                        apnConnection = null;
                    }
                    ios_log_flag[installationId].apnConnection = apnConnection;
                    ios_log_flag[installationId].has_cert = apnConnection ? true : false;

                    return AV.Promise.as(ios_log_flag[installationId]);
                },
                function(e){
                    return AV.Promise.error(e);
                });
    }else{
        return AV.Promise.as(ios_log_flag[installationId]);
    }
};

var flagReset = function(installationId){
    if(!ios_log_flag[installationId]){
        ios_log_flag[installationId] = {};
    }

    ios_log_flag[installationId].expire = 5;
};

var flagInc = function(installationId){
    ios_log_flag[installationId].expire -= 1;
};

var pushMessage = function(installationId, msg){
    var config = ios_log_flag[installationId];
    if(!config) return;

    var apnConnection = config.apnConnection;
    var device = config.device;

    var note = new apn.Notification();
    note.expiry = Math.floor(Date.now() / 1000) + 3600;
    note.contentAvailable = 1;
    note.payload = {
        "senz-sdk-notify": msg['senz-sdk-notify']
    };

    if(apnConnection && device){
        apnConnection.pushNotification(note, device);
        console.log("\<Sended Msg....\>  " + installationId);
    }
};

AV.Cloud.define('pushAPNMessage', function(req, rep){
    var installationId = req.params.installationId;
    var msg = req.params.msg;
    createConnection(installationId)
        .then(
            function(){
                pushMessage(installationId, msg);
                rep.success("end");
            },
            function(e){
                rep.error(e);
            });
});

AV.Cloud.define("pushToken", function(req, rep){
    var token = req.params.token;
    var installationId = req.params.installationId;

    var installation_query = new AV.Query(Installation);
    installation_query.equalTo('objectId', installationId);
    installation_query.find()
        .then(
            function(results){
                var installation = results[0];
                installation.set('token', token);
                return installation.save();
            },
            function(e){
                return AV.Promise.error(e);
            })
        .then(
            function(d){
                flagReset(installationId);
                rep.success('<'+d.id+'>: ' + "push token success!");
                return createConnection(installationId);
            },
            function(e){
                rep.error(e);
                return AV.Promise.error(e);
            })
});

AV.Cloud.define("maintainFlag", function(req, rep){
    Object.keys(ios_log_flag).forEach(function(installationId){
        flagInc(installationId);

        if(ios_log_flag[installationId].expire <= 0){
            var msg = {'senz-sdk-notify': {
                "type": "collect-data"
            }};
            pushMessage(installationId, msg);
            flagReset(installationId);
        }
    });
    console.log("Timer:  ");
    console.log(ios_log_flag);
    rep.success("OK");
});

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
                    logger.debug("createInstallation","_Installation object is " + JSON.stringify(installation));
                    //var ca = installation.get("createdAt");
                    var createdAt = installation.createdAt;
                    var userId = installation.get("user").id;
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

AV.Cloud.beforeSave("Log", function(request, response){

    var pre_type = request.object.get("type");
    var pre_source = request.object.get("source");
    var pre_location = request.object.get("location");
    var compressed = request.object.get("compressed");

    if( pre_type == "location" && pre_source == "internal"){
        var backup_location = {"lat":pre_location.latitude, "lng":pre_location.longitude};
        var c_location = converter.toBaiduCoordinate(pre_location.longitude, pre_location.latitude);
        console.log("fuck");
        source = "baidu offline converter WGS to baidu";
        var location = pre_location;
        location.latitude = c_location.lat;
        location.longitude = c_location.lng;
        request.object.set("pre_location",backup_location);
        request.object.set("location", location);
        request.object.set("source", source);
        //request.object.set("pre_location",pre_location)
    }

    if ( (pre_type == "accSensor" || pre_type ==  "magneticSensor" || pre_type == "sensor" || pre_type == "motionLog")
        && (compressed == "gzip" || compressed == "gzipped") ){

        //console.log(pre_type)
        //console.log(compressed)
        var pre_value = request.object.get("value");
        var compressed_base64_string = pre_value.events;
        var buffer = new Buffer(compressed_base64_string,"base64");
        zlib.unzip(buffer,function(err, buffer){
            if(!err) {
                //console.log(JSON.stringify(buffer.toString()))
                pre_value.events = JSON.parse(buffer.toString());
                request.object.set("compressed","ungzipped");
                //console.log(pre_value)
                request.object.set("value", pre_value);

                response.success();
            }
            else{
                console.log(JSON.stringify(err));
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
    console.log('afterSave', type);

    var installationId = request.object.get('installation').id;
    var sdkVserion = request.object.get('sdkVersion');
    if(sdkVserion.slice(-3) == "ios"){
        flagReset(installationId);
        createConnection(installationId);
    }

    var msg = {};
    logger.debug("Log to Rabbitmq", type);
    if(type === "accSensor"){

        logger.info("Log to Rabbitmq",'There is a new motion comming.');
        msg = {
            'object': request.object,
            'timestamp': Date.now()
        };
        logger.info("Log to Rabbitmq",'The new motion object id: ' + request.object.id);
        publisher.publishMessage(msg, 'new_motion_arrival');

    }
    else if(type === "mic"){
        //logger.info("Log to Rabbitmq",'There is a new sound comming.');
        msg = {
            'objectId': request.object.id,
            'timestamp': Date.now()
        };
        //logger.info("Log to Rabbitmq",'The new sound object id: ' + request.object.id);
        publisher.publishMessage(msg, 'new_sound_arrival');
    }
    else if(type === "location"){

        //check if the coordinate system of ios changes
        var installation_object_id = request.object.get("installation").id;
        if (installation_object_id == "7EVwvG7hfaXz0srEtPGJpaxezs2JrHft" && Math.random() < 0.2  ){
            geo_now = {lng: request.object.get("location").longitude ,lat: request.object.get("location").latitude };
            if(converter.isCoordinateInChaos(geo_now)){
                alertist.alert_user("shit you");
            }
            else{
                console.log("coordinate operated normally")
            }
        }
        //send data to rabbitmq
        //logger.info("Log to Rabbitmq",'There is a new location comming.');
        msg = {
            'object': request.object,
            'timestamp': Date.now()
        };
        //logger.info("Log to Rabbitmq",'The new location object id: ' + request.object.id);
        publisher.publishMessage(msg, 'new_location_arrival');
    }
    else if(type === "calendar"){

        //logger.info("Log to Rabbitmq",'There is a new calendar comming.');
        msg = {
            'object': request.object,
            'timestamp': Date.now()
        };
        //logger.info("Log to Rabbitmq",'The new calendar object id: ' + request.object.id);
        publisher.publishMessage(msg, 'new_calendar_arrival');
    }
    else if(type === "application"){
        //logger.info("Log to Rabbitmq",'There is a new applist comming.');
        msg = {
            'object': request.object,
            'timestamp': Date.now()
        };
        //logger.info("Log to Rabbitmq",'The new applist object id: ' + request.object.id);
        publisher.publishMessage(msg, 'new_applist_arrival');
    }
    else if(type === "predictedMotion"){

        //logger.info("Log to Rabbitmq",'There is a new predicted motion comming.');
        msg = {
            'object': request.object,
            'timestamp': Date.now()
        };
        //logger.info("Log to Rabbitmq",'The new  object id: ' + request.object.id);
        //console.log(msg)
        publisher.publishMessage(msg, 'new_predicted_motion_arrival');
    }
    else if(type === "sensor"){

        //logger.info("Log to Rabbitmq",'There is a new ios motion sensors data comming.');
        msg = {
            'object': request.object,
            'timestamp': Date.now()
        };
        //logger.info("Log to Rabbitmq",'The new  object id: ' + request.object.id);
        //console.log(msg)
        publisher.publishMessage(msg, 'new_ios_motion_arrival');
    }
    else{
        logger.error("Log to Rabbitmq","just saved object type doesn't match any value [sensor],[mic],[location]")
    }
});


//
//AV.Cloud.afterUpdate('Log', function(request) {
//    var type = request.object.get("type");
//    logger.debug("Log to Rabbitmq", type);
//    if(type === "accSensor"){
//
//        logger.info("Log to Rabbitmq",'There is a new motion comming.');
//        msg = {
//            'objectId': request.object.id,
//            'timestamp': Date.now()
//        };
//        logger.info("Log to Rabbitmq",'The new motion object id: ' + request.object.id);
//        publisher.publishMessage(msg, 'new_motion_arrival');
//
//    }
//    else if(type === "mic"){
//        logger.info("Log to Rabbitmq",'There is a new sound comming.');
//        msg = {
//            'objectId': request.object.id,
//            'timestamp': Date.now()
//        };
//        logger.info("Log to Rabbitmq",'The new sound object id: ' + request.object.id);
//        publisher.publishMessage(msg, 'new_sound_arrival');
//    }
//    else if(type === "location"){
//
//        logger.info("Log to Rabbitmq",'There is a new location comming.');
//        msg = {
//            'objectId': request.object.id,
//            'timestamp': Date.now()
//        };
//        logger.info("Log to Rabbitmq",'The new location object id: ' + request.object.id);
//        publisher.publishMessage(msg, 'new_location_arrival');
//    }
//    else if(type === "calendar"){
//
//        logger.info("Log to Rabbitmq",'There is a new calendar comming.');
//        msg = {
//            'object': request.object,
//            'timestamp': Date.now()
//        };
//        logger.info("Log to Rabbitmq",'The new calendar object id: ' + request.object.id);
//        publisher.publishMessage(msg, 'new_calendar_arrival');
//    }else if(type === "application"){
//
//        logger.info("Log to Rabbitmq",'There is a new applist comming.');
//        msg = {
//            'object': request.object,
//            'timestamp': Date.now()
//        };
//        logger.info("Log to Rabbitmq",'The new applist object id: ' + request.object.id);
//        publisher.publishMessage(msg, 'new_applist_arrival');
//    }else if(type === "predictedMotion"){
//
//        logger.info("Log to Rabbitmq",'There is a new predicted motion comming.');
//        msg = {
//            'object': request.object,
//            'timestamp': Date.now()
//        };
//        logger.info("Log to Rabbitmq",'The new  object id: ' + request.object.id);
//        //console.log(msg)
//        publisher.publishMessage(msg, 'new_predicted_motion_arrival');
//    }
//    else if(type === "sensor"){
//        console.log("fuck update sensor object");
//        logger.info("Log to Rabbitmq",'There is a new ios motion sensors data comming.');
//        msg = {
//            'object': request.object,
//            'timestamp': Date.now()
//        };
//        logger.info("Log to Rabbitmq",'The new  object id: ' + request.object.id);
//        //console.log(msg)
//        publisher.publishMessage(msg, 'new_ios_motion_arrival');
//    }
//    else{
//        logger.error("Log to Rabbitmq","just saved object type doesn't match any value [sensor],[mic],[location]")
//    }
//
//});

module.exports = AV.Cloud;
