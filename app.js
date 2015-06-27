var express = require('express');
//var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cloud = require('./cloud');
var log = require("./essential_modules/utils/logger.js").log
var logger = new log("App module");
var app = express();
var AV = require('leanengine');
var _ = require("underscore")
var req_lib = require("request");
app.use(cloud);


// 加载云代码方法

logger.info("App Module","Initializing The System");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

var _Installation = AV.Object.extend("_Installation");


var base_url_in_app_timeline = "http://senz_context_awareness.avosapps.com/users/"


app.get('/context/installations/:installation_id/', function(req, res) {

    var installation_id = req.params.installation_id
    logger.debug("Status module",installation_id)
    var query = new AV.Query(_Installation)
    query.include("user")
    query.get(installation_id,{
        success:function(installation){

            var userid = installation.get("user").id
            console.log(userid)

           req_lib.get(base_url_in_app_timeline + userid + "/context/",function(err,response,body_string){
            //req_lib("http://senz-test-senz-middleware-rabbitmq-type.daoapp.io/",function(err,response,body){
            var body = JSON.parse(body_string);
            console.log(typeof body)
            console.log(body["code"])
            if(err != null ||  (response.statusCode != 200 && response.statusCode !=201) || body.code == 1 ){
                    if(_.has(body,"message")){
                        console.log("Leancloud code error")
                        res.status(500).send({"code":1,"error":body.message})
                    }else {
                        console.log("Request lib error");
                        res.status(500).send({"code":1,"error":err})
                    }
                }else{
                    console.log("Data fetch succeed!")
                    res.send(body)
                }

            })

            //req_lib.post({
            //    "url":"http://senz-test-senz-middleware-rabbitmq-type.daoapp.io/test_post/",
            //    "json":{"s":"b"}
            //},function(err,response,body){
            //    console.log(typeof body)
            //})


        },
        error:function(object,error){
            console.log(error)
            res.status(500).send({"code":1,"error":error})
        }
    });




});



app.get('/events/installations/:installation_id/', function(req, res) {


    var limit = req.query.limit;
    if(_.has(req.query,"limit")){
        var params_string = "/events/?" + limit
    }else{
        var params_string = "/events/"
    }

    var installation_id = req.params.installation_id
    console.log(installation_id);
    logger.debug("Status module",installation_id)
    var query = new AV.Query(_Installation)
    query.include("user")
    query.get(installation_id,{
        success:function(installation){

            var userid = installation.get("user").id
            console.log(userid)

            req_lib.get(base_url_in_app_timeline + userid + params_string,function(err,response,body_string){

                var body = JSON.parse(body_string);
                if(err != null ||  (response.statusCode != 200 && response.statusCode !=201) || body.code == 1 ){
                    if(_.has(body,"message")){
                        res.status(500).send({"code":1,"error":body.message})
                    }else {
                        console.log("this is not the leancloud error");
                        res.status(500).send({"code":1,"error":err})
                    }
                }else{
                    res.send(body)
                }

            })


        },
        error:function(object,error){
            console.log(error)
            res.status(500).send({"code":1,"error":error})
        }
    });




});




module.exports = app;
