const AWS = require("aws-sdk");
const chime = new AWS.Chime();
const { v4: uuidv4 } = require("uuid");
const api = require('./api');
const pusher = require('./pusher');
// Set the AWS SDK Chime endpoint. The global endpoint is https://service.chime.aws.amazon.com.
chime.endpoint = new AWS.Endpoint("https://service.chime.aws.amazon.com");

const json = (statusCode, contentType, body) => {
    return {
        statusCode,
        headers: { "content-type": contentType },
        body: JSON.stringify(body),
    };
};

exports.join = async (event, context, callback) => {
    const query = event.queryStringParameters;
    let meetingId = null;
    let meeting = null;
    let professorName = null;
    let studentName = null;
    if(query.professorName){
        professorName = query.professorName;
    }
    if(query.studentName){
        studentName = query.studentName;
    }
    if (!query.meetingId) {
        //new meeting
        meetingId = uuidv4();
        meeting = await chime
            .createMeeting({
                ClientRequestToken: meetingId,
                MediaRegion: "eu-west-1",
                ExternalMeetingId: meetingId,
            })
            .promise();
    } else {
        //join to old meeting
        meetingId = query.meetingId;
        meeting = await chime
            .getMeeting({
                MeetingId: meetingId,
            })
            .promise();
    }

    //We've initialized our meeting! Now let's add attendees.
    const attendee = await chime
        .createAttendee({
            //ID of the meeting
            MeetingId: meeting.Meeting.MeetingId,

            //User ID that we want to associate to
            ExternalUserId: `${uuidv4().substring(0, 8)}#${query.clientId}`,
        })
        .promise();

    return json(200, "application/json", {
        Info: {
            Meeting: meeting,
            Attendee: attendee,
        },
    });
};

exports.end = async (event, context, callback) => {
    const body = JSON.parse(event.body);
    const deleteRequest = await chime.deleteMeeting({
        MeetingId: body.meetingId
    }).promise();
    return json(200, "application/json", {});
};

exports.get_attendees = async (event, context, callback) => {
    /*
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Chime.html#listAttendees-property
    const query = event.queryStringParameters;
    meetingId = query.meetingId;
    const attendees = await chime
        .listAttendees({
            //ID of the meeting
            MeetingId: meetingId
        })
        .promise();
    // var vwait_time = await api.get_wait_time();
    // var attendees = await api.get_attendees_list(8);
    var response = {meetingId:meetingId, attendees:attendees};
    return json(200, "application/json", response);
    */
   return json(200, "application/json", {"first_name": "johnaban5", "mysql": process.env.MYSQL_HOST, "last_name": "ell"});
};

exports.loginProfessor = async (event, context, callback) => {
    const body = event.body;
    var response = {success: true};
    return json(200, "application/json", response);
};

exports.loginStudent = async (event, context, callback) => {
    const body = JSON.parse(event.body);
    if (body.meetingId) {
        result = await pusher.sendPusher(body.meetingId, "join_notification", event.body);
    }
    var response = {success: true};
    return json(200, "application/json", response);
};

exports.onDeck = async (event, context, callback) => {
    const body = JSON.parse(event.body);
    if (body.meetingId) {
        result = await pusher.sendPusher(body.meetingId, "on_deck", event.body);
    }
    var response = {success: true};
    return json(200, "application/json", response);
};

const StaticFileHandler = require('serverless-aws-static-file-handler')

exports.index = async (event, context, callback) => {
    const clientFilesPath = __dirname + "/html/";
    const fileHandler = new StaticFileHandler(clientFilesPath)
    return await fileHandler.get(event,context);
}