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



var fs = require('fs');
var heapdump = require('heapdump');

app.post('/snapshot', function(req, res, next)
    {
        console.log("wocaonidayeeyyeyyeyeyeyey");
        var name = 'dump_' + Date.now() + '.heapsnapshot';
        console.log("file name is ")
        console.log(name)
        heapdump.writeSnapshot('/tmp/' + name, function(err, filename) {
            if(err) {
                console.log(JSON.stringify(err))
                res.send(JSON.stringify(err))
            }
            fs.readFile(filename, function(err, data) {
                if(err) {
                    console.log(JSON.stringify(err))
                    res.send(JSON.stringify(err))
                }
            var theFile = new AV.File(name, {base64: data.toString('base64')});
                theFile.save().then(
                    function(theFile){
                    res.send('dump written to _File, name: ' + name); },
                    function(err) {
                        if(err) {
                            console.log()
                            res.send(JSON.stringify(err))


                        }
                });
            });
        });

    });

app.get("/test", function(req,res,next){
    console.log("fuckyouaaaaaa")
    res.send("fuck")
})


app.use(function(err, req, res, next) { // jshint ignore:line
    res.status(err.status || 500);
    res.render('error', {
        message: err.message || err,
        error: {}
    });
});

module.exports = app;
