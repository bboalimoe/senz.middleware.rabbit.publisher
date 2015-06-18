//bugsnag initialization
var bugsnag = require("bugsnag");


var aa = function(){

    if(process.env.APP_ENV === "prod"){
        bugsnag_token = "6d2d076a299f9c0bf18e06312fa00065"
    }else{
        bugsnag_token = "464c8f44539ff84fe3aa5e4059d35e9c"
    }

    bugsnag.register(bugsnag_token);


};

module.exports = aa