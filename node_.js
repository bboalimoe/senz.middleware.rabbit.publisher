var publisher = require('./essential_modules/rabbit_lib/publisher');

[1,2,3,4,4,5,6,7,7,7,8,8,9,99,9,9,9,9,].forEach(function(id){
    var msg = {
        'objectId': id,
        'timestamp': Date.now()
    };
    publisher.publishMessage(msg, 'new_motion_arrival');
});
