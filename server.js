process.env["APP_ENV"] = "prod";
var AV = require('leanengine');
var log = require("./essential_modules/utils/logger.js").log;
var logger = new log("Entrance module");
var APP_ID = process.env.LC_APP_ID;
var APP_KEY = process.env.LC_APP_KEY;
var MASTER_KEY = process.env.LC_APP_MASTER_KEY;
//var memwatch = require("memwatch-next");
//var request = require("request");
//var express = require("express");
//var bodyParser = require('body-parser');


AV.initialize(APP_ID, APP_KEY, MASTER_KEY);

var app = require('./app');

//app.use(bodyParser);

// 端口一定要从环境变量 `LC_APP_PORT` 中获取。
// LeanEngine 运行时会分配端口并赋值到该变量。
var PORT = parseInt(process.env.LC_APP_PORT || 3000);
var server = app.listen(PORT, function () {
    logger.info("hello senz",'Node app is running, port:', PORT);
});
