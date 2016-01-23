var rabbit = require('wascally');
var configuration = require('./configuration.js');


var env = null;
if(process.env.APP_ENV === "prod"){
    env = "_prod"

}else {
    env = "_test"
}

publishMsg = function(msg, event) {
    console.log('* The chosen event is ' + event + '\n* The content of Msg is ' + JSON.stringify(msg) + '\n* Sending Msg...\n');

    var routing_key = null;
    if(event == "new_motion_arrival"){routing_key = "motion";}
    if(event == "new_sound_arrival"){routing_key = "sound";}
    if(event == "new_location_arrival"){routing_key = "location";}
    if(event == "new_calendar_arrival"){routing_key = "calendar";}
    if(event == "new_applist_arrival"){routing_key = "applist";}
    if(event == "new_predicted_motion_arrival") {routing_key = "predicted_motion";}
    if(event == "new_ios_motion_arrival")  {routing_key = "ios_motion";}
    //not right
    var type = "senz.message." + routing_key + env;
    console.log("event is " + type);

    rabbit.publish(event + env, {
        type: type,
        body: msg
        //routingKey: routing_key
    });

};

exports.publishMessage = function(msg, event){
    rabbit.configure(configuration.topology)
        .then(publishMsg(msg, event));
};

