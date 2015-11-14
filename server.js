//initialize the APP_ENV
process.env["APP_ENV"] = "prod"
//initialize the APP_ENV


var AV = require('leanengine');
var log = require("./essential_modules/utils/logger.js").log;
var logger = new log("Entrance module");
var APP_ID = process.env.LC_APP_ID;
var APP_KEY = process.env.LC_APP_KEY;
var MASTER_KEY = process.env.LC_APP_MASTER_KEY;
var memwatch = require("memwatch-next");

memwatch.on("leak", function(info){
    console.log("mem leaks !!")
    console.log(info)
    console.log("mem leaks info end")
})

memwatch.on("stats", function(stats){
    console.log("mem heap usage !!")
    console.log(stats)
    console.log("mem heap usage info end")
})

AV.initialize(APP_ID, APP_KEY, MASTER_KEY);

var app = require('./app');

// 端口一定要从环境变量 `LC_APP_PORT` 中获取。
// LeanEngine 运行时会分配端口并赋值到该变量。
var PORT = parseInt(process.env.LC_APP_PORT || 3000);
var server = app.listen(PORT, function () {
    logger.info("hello senz",'Node app is running, port:', PORT);
});
