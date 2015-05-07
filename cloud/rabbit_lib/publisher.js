var rabbit = require('wascally');
var configuration = require('cloud/rabbit_lib/configuration.js');
var logger = require("cloud/utils/logger");

publishMsg = function(msg, event) {
    console.log('------ Sending ------');
    console.log('* The chosen event is ' + event + '\n* The content of Msg is ' + msg + '\n* Sending Msg...\n');
    if(event == "new_motion_arrival"){var routing_key = "motion";}
    if(event == "new_sound_arrival"){var routing_key = "sound";}
    if(event == "new_location_arrival"){var routing_key = "location";}
    //not right
    var type = "senz.message." + routing_key;
    logger.info("event is " + type);
    rabbit.publish(event, {
        type: type,
        body: msg
        //routingKey: routing_key
    });
};

exports.publishMessage = function(msg, event){
    logger.info("topo is " + JSON.stringify(configuration.topology) );
    rabbit.configure(configuration.topology)
        .then(publishMsg(msg, event));
};

