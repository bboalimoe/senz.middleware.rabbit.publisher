var publisher = require('cloud/rabbit_lib/publisher');
//var express = require("express");
//var middle = require("./middlewares");
//var location = require("cloud/places/init");
//var sound = require("cloud/sounds/init");
//var motion = require("cloud/motions/init");
var logger = require("cloud/utils/logger");

//
AV.Cloud.define("hello", function(request, response) {

    logger.debug(JSON.stringify(request));
    response.success("Hello world!");
});

AV.Cloud.afterSave('UserLocation', function(request) {
    logger.info('There is a new location comming.');
    msg = {
        'objectId': request.object.id,
        'timestamp': Date.now()
    };
    logger.info('The new location object id: ' + request.object.id);
    publisher.publishMessage(msg, 'new_location_arrival');
});

AV.Cloud.afterSave('UserMic', function(request) {
    logger.info('There is a new sound comming.');
    msg = {
        'objectId': request.object.id,
        'timestamp': Date.now()
    };
    logger.info('The new sound object id: ' + request.object.id);
    publisher.publishMessage(msg, 'new_sound_arrival');
});

AV.Cloud.afterSave('UserSensor', function(request) {
    logger.info('There is a new motion comming.');
    msg = {
        'objectId': request.object.id,
        'timestamp': Date.now()
    };
    logger.info('The new motion object id: ' + request.object.id);
    publisher.publishMessage(msg, 'new_motion_arrival');
});