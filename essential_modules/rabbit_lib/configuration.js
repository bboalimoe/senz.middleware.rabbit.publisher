var topology = {
    connection: {
        user: 'senz', pass: 'senz', server: '182.92.72.69', port: 5672, vhost: 'senz'
    },
    exchanges:[
        { name: 'new_motion_arrival_test', type: 'fanout' },
        { name: 'new_sound_arrival_test', type: 'fanout' },
        { name: 'new_location_arrival_test', type: 'fanout' },
        { name: 'new_calendar_arrival_test', type: 'fanout' },
        { name: 'new_applist_arrival_test', type: 'fanout' },
        { name: 'new_predicted_motion_arrival_test', type: 'fanout' },
        { name: 'new_ios_motion_arrival_test', type: 'fanout'},

        { name: 'new_motion_arrival_prod', type: 'fanout' },
        { name: 'new_sound_arrival_prod', type: 'fanout' },
        { name: 'new_location_arrival_prod', type: 'fanout' },
        { name: 'new_calendar_arrival_prod', type: 'fanout' },
        { name: 'new_applist_arrival_prod', type: 'fanout' },
        { name: 'new_predicted_motion_arrival_prod', type: 'fanout' },
<<<<<<< HEAD
        { name: 'new_ios_motion_arrival_prod', type: 'fanout'},
        { name: 'new_location_arrival_o_prod', type: 'fanout' }
=======
        { name: 'new_ios_motion_arrival_prod', type: 'fanout'}
>>>>>>> 4763624898d7e91d6735343c82cae3a170a8733d



    ],
    queues:[],
    bindings:[]
};

exports.topology   = topology;
