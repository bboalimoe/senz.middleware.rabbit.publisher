/**
 * Created by zhanghengyang on 15/11/17.
 */

//ref: https://github.com/shanelau/sendcloud
var sendcloud = require('sendcloud');
//var sc = new sendcloud('senz_test_3xTpiB', '3jYo1mY4akFzvk2Z', 'cloud@petchat.io', 'senz', 'apiUserBatch')
var req = require("request")
//sendcloud.init('senz_test_3xTpiB', 'yYLtw5WBbXsNYqnM', 'cloud@petchat.io', 'senz', 'apiUserBatch');

// send email
//sendcloud.sendEmail('apps@petchat.io', '邮件测试', '<h1>Hello world!<h1>').then(function(info){
//    console.log(info);
//});
url = "http://sendcloud.sohu.com/webapi/mail.send.json"
API_USER = 'senz_test_3xTpiB'
API_KEY = '3jYo1mY4akFzvk2Z'

params = {
    "api_user": "senz_test_3xTpiB",  // 使用api_user和api_key进行验证
    "api_key" : "3jYo1mY4akFzvk2Z",
    "to" : "apps@petchat.io", // 收件人地址, 用正确邮件地址替代, 多个地址用';'分隔
    "from" : "cloud@petchat.io",  // 发信人, 用正确邮件地址替代
    "fromname" : "senz",
    "subject" : "Ios的经纬度又乱了",
    "html": "Ios的经纬度又乱了！卧槽了",
    "resp_email_id": "true",
}



alert_user = function(msg){

    req.post(
        {
            url: url,
            headers:{
                "Content-Type":"application/json"
            },
            json: params
        },
        function(err,res,body){
            console.log(JSON.stringify(body))

        });
        //sc.sendEmail('apps@petchat.io', 'Ios的经纬度又乱了！卧槽了', 'testest').then(function(info){
        //    console.log("发送ios经纬度混乱通知成功");
        //    console.log(info);
        //});
};

exports.alert_user = alert_user

//alert_user("fuck")
