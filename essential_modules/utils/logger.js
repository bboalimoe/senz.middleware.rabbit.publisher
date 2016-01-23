/**
 * Created by zhanghengyang on 15/5/4.
 */

var config = require("./config.json");
var debug = config.debug;

var log = function(log_tag) {

    if (debug) {
        var log = require("tracer").colorConsole(
            {
                format: "{{timestamp}} <{{title}}> {{message}} (in {{file}}:{{line}})",
                dateformat: "isoDateTime"
            }
        );
    }
    else {
        if(process.env.APP_ENV === "prod"){
            var token = "0e58e820-ec05-46a3-98ee-ba31f16e301c"
        }
        else{
            token = '52f63fc6-4162-46a9-839b-4977f64dc11f'
        }

        var logentries = require('node-logentries');
        log = logentries.logger({
            token: token
        });
    }

    return {
        "info": function (id, info) {
            log.info(log_tag + " <" + id + "> " + info);
        },

        "debug": function (id, debug) {
            log.debug(log_tag + " <" + id + "> " + debug);
        },

        ////exports.notice = function(notice){
        //    log.notice(log_tag + notice);
        //}


        "warn": function (id, warn) {
            if (debug) {
                log.warn(log_tag + " <" + id + "> " + warn);
            }
            else {
                log.warning(log_tag + " <" + id + "> " + warn);
            }
        },

        "error": function (id, err) {
            if (debug) {
                log.error(log_tag + " <" + id + "> " + err);
            }
            else {
                log.err(log_tag + " <" + id + "> " + err);
            }
        }
    }


//exports.alert = function(alert){
//    log.alert(log_tag + alert);
//}


}


exports.log = log;
