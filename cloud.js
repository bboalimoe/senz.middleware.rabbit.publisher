var AV = require('leanengine');
var publisher = require('./essential_modules/rabbit_lib/publisher');
var log = require("./essential_modules/utils/logger").log;
var logger = new log("cloud hook");
var n = require("nonce")();
var uuid = require("uuid");
var createInstallation = require("./essential_modules/utils/lean_utils.js").createInstallation;
var createUser = require("./essential_modules/utils/lean_utils.js").createUser;
var converter = require("./essential_modules/utils/coordinate_trans.js");
var alertist = require("./essential_modules/utils/send_notify.js");
var apn = require("apn");
var zlib = require("zlib");
var Wilddog = require("wilddog");
var Installation = AV.Object.extend("_Installation");
var application = AV.Object.extend("Application");


var app_list = [
    "5678df1560b2f2e841665918",
    "564573f660b25b79f067aeef",
    "55bc5d8e00b0cb9c40dec37b"
];
var notification_cache = {};
var installation_map = {}; //key: installationId, value: installationObj;
var userId_insatalltionId = {}; //key uid, value: installationId;
var defaultExpire = 60;

var createOnBoot = function(){
    var installation_query = new AV.Query(Installation);
    var installation_promises = [];
    app_list.forEach(function(appId){
        var app = {
            "__type": "Pointer",
            "className": "Application",
            "objectId": appId
        };
        installation_query.equalTo("application", app);
        installation_query.descending("updatedAt");
        installation_promises.push(installation_query.find());
    });
    return AV.Promise.all(installation_promises)
        .then(function(installation_lists){
            var connection_promises = [];
            installation_lists.forEach(function(installations){ //every app's installation record
                var de_weight_installations = removeDupInstallation(installations);
                logger.debug("createOnBoot", de_weight_installations);
                de_weight_installations.forEach(function(installation){   //certain app's installations
                    connection_promises.push(createAIConnection(installation));
                })
            });
            return AV.Promise.all(connection_promises);
        })
        .catch(function(e){
            return AV.Promise.error(e);
        });
};

var removeDupInstallation = function(installations){
    var tmp = {};
    installations.forEach(function(item){
        var deviceType = item.get("deviceType");
        var token = item.get("token");

        if(token || deviceType === "android"){
            var uid = item.get("user").id;
            var time = item.createdAt;

            if(!tmp[uid] || tmp[uid].time < time){
                tmp[uid] = {time: time, installation: item};
            }
        }
    });
    var result = [];
    Object.keys(tmp).forEach(function(uid){
        result.push(tmp[uid].installation);
    });
    return result;
};

var createAIConnection = function(installation){
    if(!installation){
        return;
    }

    var deviceType = installation.get("deviceType");
    var installationId = installation.id;

    installation_map[installationId] = installation;

    resetExpire(installationId);

    notification_cache[installationId].deviceType = deviceType;

    if(deviceType === "ios"){
        var token = installation.get("token");
        if(token){
            notification_cache[installationId].device = new apn.Device(token);
        }

        var appId = installation.get("application").id;
        var app_query = new AV.Query(application);
        app_query.equalTo("objectId", appId);
        return app_query.first().then(
            function(app){
                var cert_url = app.get('cert_url') || "";
                var key_url = app.get('key_url') || "";
                return AV.Promise.all([
                    AV.Cloud.httpRequest({ url: cert_url }),
                    AV.Cloud.httpRequest({ url: key_url }),
                    app.get('passphrase')
                ]);
            })
            .then(
                function(response){
                    var cert = response[0].buffer;
                    var key = response[1].buffer;
                    var passpharse = response[2];
                    if(cert && key){
                        var apnConnection = new apn.Connection({cert: cert, key: key,
                                    production: true, passphrase: passpharse});
                        var apnConnection_dev = new apn.Connection({cert: cert, key: key,
                                    production: false, passphrase: passpharse});
                        notification_cache[installationId].apnConnection = apnConnection;
                        notification_cache[installationId].apnConnection_dev = apnConnection_dev;
                    }
                    return AV.Promise.as(notification_cache[installationId]);
                })
            .catch(
                function(e){
                    return AV.Promise.error(e);
                })
    }else{
        var uid = installation.get("user").id;
        userId_insatalltionId[uid] = installationId;
        var collect_data_ref = "https://notify.wilddogio.com/configuration/"+ uid + "/content/sensor/collector/period";
        var notify_ref = "https://notify.wilddogio.com/notification/"+ uid + "/content/";
        var updatedAt_ref = "https://notify.wilddogio.com/notification/"+ uid + "/updatedAt";
        notification_cache[installationId].collect_data_ref = collect_data_ref;
        notification_cache[installationId].notify_ref = notify_ref;
        notification_cache[installationId].updatedAt_ref = updatedAt_ref;
        return AV.Promise.as(notification_cache[installationId]);
    }

};

var resetExpire = function(id){
    if(!notification_cache[id]){
        notification_cache[id] = {};
    }

    notification_cache[id].expire = defaultExpire;
};
var incExpire = function(id){
    notification_cache[id].expire -= 1;
};

var maintainExpire = function(){
    Object.keys(notification_cache).forEach(function(installationId){
        incExpire(installationId);

        if(notification_cache[installationId].expire <= 0){
            var msg = {
                "type": "collect-data"
            };
            console.log(JSON.stringify(msg));
            pushAIMessage(installationId, msg);
            resetExpire(installationId);
            createAIConnection(installation_map[installationId]);
        }
    });
    logger.debug("maintainExpire", new Date().getTime());
    logger.info("maintainExpire", "Timer Schedule!");
};

var pushAIMessage = function(installationId, msg){
    logger.debug("pushAIMessage ", installationId);

    if(!notification_cache[installationId]){
        logger.error("pushAIMessage", "Invalid insatallationId");
        return;
    }
    var deviceType = notification_cache[installationId].deviceType;
    if(deviceType === "android"){
        if(msg.type === "collect_data"){
            var collect_data_ref = new Wilddog(notification_cache[installationId].collect_data_ref);
            collect_data_ref.set(Math.random()*10000, function(){
                logger.debug("\<Sended Android Msg....\>" , installationId + ": " + msg.type);
            });
        }else{
            var notify_ref = new Wilddog(notification_cache[installationId].notify_ref + msg.type);
            notify_ref.set({status: msg.value, timestamp: msg.timestamp, probability: 1}, function(){
                logger.debug("\<Sended Android Msg....\>" , installationId + ": " + msg.type);
            });
            var updatedAt_ref = new Wilddog(notification_cache[installationId].updatedAt_ref);
            updatedAt_ref.set(new Date().toString(), function(){
                logger.debug("\<Sended Android Msg....\>" , installationId + ": " + msg.type);
            })
        }
    }

    if(deviceType === "ios"){
        var config = notification_cache[installationId];
        if(!config) return;

        var apnConnection = config.apnConnection;
        var apnConnection_dev = config.apnConnection_dev;
        var device = config.device;

        var note = new apn.Notification();
        note.contentAvailable = 1;
        note.payload = {
            "senz-sdk-notify": msg
        };

        logger.debug("APN_MSG: "+installationId, JSON.stringify(note.payload));

        if(apnConnection && device){
            apnConnection.pushNotification(note, device);
            apnConnection_dev.pushNotification(note, device);
            logger.debug("\<Sended IOS Msg....\>" , installationId);
        }
    }
};

setInterval(function(){
    maintainExpire();
}, 10 * 1000);

createOnBoot();

AV.Cloud.define('pushAPNMessage', function(req, rep){
    var installationId = req.params.installationId;
    //var source = req.params.source;
    var msg = {
        type: req.params.type,
        status: req.params.status,
        timestamp: req.params.timestamp,
        probability: req.params.probability
    };
    logger.debug("pushAPNMessage", installationId + ": " +JSON.stringify(msg));

    //if(source == 'panel' || (!ios_msg_push_flag[installationId]) ||
    //    (ios_msg_push_flag[installationId] && ios_msg_push_flag[installationId][req.params.type] == true) ||
    //    (ios_msg_push_flag[installationId] && ios_msg_push_flag[installationId][req.params.type] == undefined)){
    //
    //    if (!ios_msg_push_flag[installationId]) {
    //        ios_msg_push_flag[installationId] = {};
    //    }
    //    ios_msg_push_flag[installationId][req.params.type] = false;
    //    setTimeout(function(){
    //        ios_msg_push_flag[installationId][req.params.type] = true;
    //    }, 3*60*1000);

        pushAIMessage(installationId, msg);
    //}
    rep.success("pushAPNMessage END!");
});

AV.Cloud.define('pushAndroidMessage', function(req, rep){
    var installationId = userId_insatalltionId[req.params.userId];
    var msg = {
        type: req.params.type,
        value: req.params.value || req.params.val,
        timestamp: req.params.timestamp
    };
    console.log(installationId);
    console.log(msg);
    logger.debug("pushAndroidMessage", installationId + ": " +JSON.stringify(msg));
    pushAIMessage(installationId, msg);
    rep.success("pushAndroidMessage END!");
});

AV.Cloud.define("pushToken", function(req, rep){
    var token = req.params.token;
    var installationId = req.params.installationId;

    var installation_query = new AV.Query(Installation);
    installation_query.equalTo('objectId', installationId);
    return installation_query.find()
        .then(
            function(results){
                var installation = results[0];
                installation.set('token', token);
                return installation.save();
            })
        .then(
            function(d){
                notification_cache[installationId] = {};
                resetExpire(installationId);
                rep.success('<'+d.id+'>: ' + "push token success!");
                return createAIConnection(installation_map[installationId]);
            })
        .catch(
            function(e){
                rep.error(e);
                logger.error("pushToken", JSON.stringify(e));
                return AV.Promise.error(e);
            });
});

AV.Cloud.define("createInstallation", function(request, response) {

    logger.debug("createInstallation",JSON.stringify(request.params));

    var appid = request.params.appid || request.params.appId,
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
        var source = "baidu offline converter WGS to baidu";
        var location = pre_location;
        location.latitude = c_location.lat;
        location.longitude = c_location.lng;
        request.object.set("pre_location",backup_location);
        request.object.set("location", location);
        request.object.set("source", source);
    }

    if ( (pre_type == "accSensor" || pre_type ==  "magneticSensor" || pre_type == "sensor" || pre_type == "motionLog")
        && (compressed == "gzip" || compressed == "gzipped") ){

        var pre_value = request.object.get("value");
        var compressed_base64_string = pre_value.events;
        var buffer = new Buffer(compressed_base64_string,"base64");
        zlib.unzip(buffer,function(err, buffer){
            if(!err) {
                pre_value.events = JSON.parse(buffer.toString());
                request.object.set("compressed","ungzipped");
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

    var msg = {};
    console.log("Log to Rabbitmq", type);
    if(type === "accSensor"){
        msg = {
            'object': request.object,
            'timestamp': Date.now()
        };
        console.log("Log to Rabbitmq",'The new motion object id: ' + request.object.id);
        publisher.publishMessage(msg, 'new_motion_arrival');

    }
    else if(type === "mic"){
        msg = {
            'objectId': request.object.id,
            'timestamp': Date.now()
        };
        console.log("Log to Rabbitmq",'The new sound object id: ' + request.object.id);
        publisher.publishMessage(msg, 'new_sound_arrival');
    }
    else if(type === "location"){
        var installation_object_id = request.object.get("installation").id;
        if (installation_object_id == "7EVwvG7hfaXz0srEtPGJpaxezs2JrHft" && Math.random() < 0.2  ){
            var geo_now = {lng: request.object.get("location").longitude ,lat: request.object.get("location").latitude };
            if(converter.isCoordinateInChaos(geo_now)){
                alertist.alert_user("shit you");
            }
            else{
                console.log("coordinate operated normally")
            }
        }
        msg = {
            'object': request.object,
            'timestamp': Date.now()
        };
        console.log("Log to Rabbitmq",'The new location object id: ' + request.object.id);
        publisher.publishMessage(msg, 'new_location_arrival');
    }
    else if(type === "calendar"){
        msg = {
            'object': request.object,
            'timestamp': Date.now()
        };
        console.log("Log to Rabbitmq",'The new calendar object id: ' + request.object.id);
        publisher.publishMessage(msg, 'new_calendar_arrival');
    }
    else if(type === "application"){
        msg = {
            'object': request.object,
            'timestamp': Date.now()
        };
        console.log("Log to Rabbitmq",'The new applist object id: ' + request.object.id);
        publisher.publishMessage(msg, 'new_applist_arrival');
    }
    else if(type === "predictedMotion"){
        msg = {
            'object': request.object,
            'timestamp': Date.now()
        };
        console.log("Log to Rabbitmq",'The new  object id: ' + request.object.id);
        publisher.publishMessage(msg, 'new_predicted_motion_arrival');
    }
    else if(type === "sensor"){
        msg = {
            'object': request.object,
            'timestamp': Date.now()
        };
        console.log("Log to Rabbitmq",'The new  object id: ' + request.object.id);
        publisher.publishMessage(msg, 'new_ios_motion_arrival');
    }
    else{
        logger.error("Log to Rabbitmq","just saved object type doesn't match any value [sensor],[mic],[location]")
    }
});

module.exports = AV.Cloud;
