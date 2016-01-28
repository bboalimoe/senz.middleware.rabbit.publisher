var AV = require("leanengine");
var ConfigObj  = AV.Object.extend("Config");



var get_wilddog_strategy = function(){
    var query = new AV.Query(ConfigObj);
    query.equalTo("name", "wilddog_strategy");
    return query.first();
};

exports.get_post_wilddog_config = function(ref, user_id, situation, sub_situation){
    console.log("get_post_wilddog_config");
};
