const AWS = require("aws-sdk");

module.exports = {
    get_wait_time: async function () {
        // You shouldn't hard-code your keys in production! 
        // http://docs.aws.amazon.com/AWSJavaScriptSDK/guide/node-configuring.html
        console.log("getting the wait time");
        const params = {
            FunctionName: 'WaitTime-WaitTimeFunction-1TODJ6QSA8MWV', 
            Payload: JSON.stringify({
            'attendee_id': 122, 
            }),
        };
        const result = await (new AWS.Lambda().invoke(params).promise());
        console.log('Success!');
        console.log(result);
        return result;
    },
    get_attendees_list: async function () {
      return 33;
    }
};