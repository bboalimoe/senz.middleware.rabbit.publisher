var rabbit = require('wascally');
var configuration = require('./configuration.js');
var log = require("../utils/logger").log;
var logger = new log("rabbitmq pub");


var env = null;
if(process.env.APP_ENV === "prod"){
    env = "_prod"

}else {

    env = "_test"
}

publishMsg = function(msg, event) {
    logger.info("",'------ Sending ------');
    logger.info("",'* The chosen event is ' + event + '\n* The content of Msg is ' + msg + '\n* Sending Msg...\n');
    if(event == "new_motion_arrival"){var routing_key = "motion";}
    if(event == "new_sound_arrival"){var routing_key = "sound";}
    if(event == "new_location_arrival"){var routing_key = "location";}
    if(event == "new_calendar_arrival"){var routing_key = "calendar";}
    //not right
    var type = "senz.message." + routing_key + env;
    logger.info("","event is " + type);
    rabbit.publish(event + env, {
        type: type,
        body: msg
        //routingKey: routing_key
    });
};

exports.publishMessage = function(msg, event){
    logger.info("","topo is " + JSON.stringify(configuration.topology) );
    rabbit.configure(configuration.topology)
        .then(publishMsg(msg, event));
};

