var Pusher = require('pusher');

var pusher = new Pusher({
    appId: process.env.PUSHER_APPID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: "us2",
    encrypted: true
});

module.exports = {
    sendPusher: async function (channelName, eventName, data) {
        var result = pusher.trigger(channelName, eventName, {
            data: data
       });
       return result
    },
    dosomethingelse: async function () {
      return 33;
    }
};