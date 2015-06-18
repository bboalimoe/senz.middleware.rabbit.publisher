var express = require('express');
//var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cloud = require('./cloud');
var log = require("./essential_modules/utils/logger.js").log
var logger = new log("App module");
var app = express();


app.use(cloud);




// 加载云代码方法

logger.info("App Module","Initializing The System");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());






app.get('/', function(req, res) {

    res.send({"a":1})
});




module.exports = app;
