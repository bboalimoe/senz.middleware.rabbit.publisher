var express = require('express');
//var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
//var todos = require('./routes/todos');
var cloud = require('./cloud');
var log = require("./essential_modules/utils/logger.js").log
var logger = new log("App module");
var app = express();


//bugsnag initialization
var bugsnag = require("bugsnag");
logger.debug("",JSON.stringify(process.env));
if(process.env.APP_ENV === "prod"){
    bugsnag_token = "6d2d076a299f9c0bf"
}else{
    bugsnag_token = "464c8f44539ff84fc"
}
bugsnag.register(bugsnag_token);
logger.info("","bugsnag initialized");



app.use(cloud);

app.use(bugsnag.requestHandler); //To ensure that asynchronous errors are routed to the error handler, add the requestHandler middleware to your app as the first middleware


// 加载云代码方法

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(bugsnag.errorHandler); //make sure to add this after all other middleware, but before any "error" middleware:





app.get('/', function(req, res) {
    sb.sb
    res.send({"a":1})
});


// 如果任何路由都没匹配到，则认为 404
// 生成一个异常让后面的 err handler 捕获
//app.use(function(req, res, next) {
//    var err = new Error('Not Found');
//    err.status = 404;
//    next(err);
//});
//
//// error handlers
//
//// 如果是开发环境，则将异常堆栈输出到页面，方便开发调试
//if (app.get('env') === 'development') {
//    app.use(function(err, req, res, next) {
//        res.status(err.status || 500);
//        res.render('error', {
//            message: err.message,
//            error: err
//        });
//    });
//}
//
// 如果是非开发环境，则页面只输出简单的错误信息
app.use(function(err, req, res, next) {
    console.log("fuckn\n\n\n\n\n\aaa" + err + "\n\n\n\n\n\n\naljljglajldjfaljdlfajdslkjflajdslfjalkjdlfjlajdljfkajdf");
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});



module.exports = app;
