var startButton = document.getElementById("start-button");
var stopButton = document.getElementById("stop-button");
var attendeesButton = document.getElementById("get_attendees");
var attendeeIdInput = document.getElementById("attendee_id");
var unmuteAttendeeButton = document.getElementById("unmute_attendee");
var muteAttendeeButton = document.getElementById("mute_attendee");

var urlParams = new URLSearchParams(window.location.search);

function generateString() {
    return (
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)
    );
}

var isMeetingHost = false;
var meetingId = urlParams.get("meetingId");
var clientId = generateString();

const logger = new ChimeSDK.ConsoleLogger(
    "ChimeMeetingLogs",
    ChimeSDK.LogLevel.OFF
);

const deviceController = new ChimeSDK.DefaultDeviceController(logger);

let requestPath = `join?clientId=${clientId}`;
if (!meetingId) {
    isMeetingHost = true;
} else {
    requestPath += `&meetingId=${meetingId}`;
}

if (!isMeetingHost) {
    startButton.innerText = "Join!";
} else {
    startButton.innerText = "Start!";
    stopButton.style.display = "block";
    attendeesButton.style.display = "block";
    attendeeIdInput.style.display = "block";
}

muteAttendeeButton.style.display = "block";
unmuteAttendeeButton.style.display = "block";

startButton.style.display = "block";


var pusherJoinNotification = function(data){
    console.log('you called pusherJoinNotification');
    console.log(data);
    console.log('completed pusherJoinNotification');
};

async function start() {
    if (window.meetingSession) {
        return
    }
    try {
        var response = await fetch(requestPath, {
            method: "POST",
            headers: new Headers(),
        });

        const data = await response.json();
        meetingId = data.Info.Meeting.Meeting.MeetingId;

        var meetingLink = window.location.href + "?meetingId=" + meetingId;
        meetingLink = meetingLink.replace("professor", "student");
        document.getElementById("meeting-link").innerText = meetingLink;
        
        const configuration = new ChimeSDK.MeetingSessionConfiguration(
            data.Info.Meeting.Meeting,
            data.Info.Attendee.Attendee
        );

        window.meetingSession = new ChimeSDK.DefaultMeetingSession(
            configuration,
            logger,
            deviceController
        );

        const audioInputs = await meetingSession.audioVideo.listAudioInputDevices();
        const videoInputs = await meetingSession.audioVideo.listVideoInputDevices();

        window.audioDeviceId = audioInputs[0].deviceId;
        window.videoDeviceId = videoInputs[0].deviceId;
        console.log("here are the device ids");
        console.log(window.audioDeviceId);
        console.log(window.videoDeviceId);


        await meetingSession.audioVideo.chooseAudioInputDevice(
            audioInputs[0].deviceId
        );
        await meetingSession.audioVideo.chooseVideoInputDevice(
            videoInputs[0].deviceId
        );

        const observer = {
            // videoTileDidUpdate is called whenever a new tile is created or tileState changes.
            videoTileDidUpdate: (tileState) => {
                console.log("VIDEO TILE DID UPDATE");
                console.log(tileState);
                // Ignore a tile without attendee ID and other attendee's tile.
                if (!tileState.boundAttendeeId) {
                    return;
                }
                updateTiles(meetingSession);
            },
        };

        meetingSession.audioVideo.addObserver(observer);

        meetingSession.audioVideo.startLocalVideoTile();

        const audioOutputElement = document.getElementById("meeting-audio");
        meetingSession.audioVideo.bindAudioElement(audioOutputElement);
        meetingSession.audioVideo.start();


        const presentAttendeeId = meetingSession.configuration.credentials.attendeeId;
        console.log("your attendeeid is: " + presentAttendeeId);


        var options = {cluster: 'us2'}
        var pusher = new Pusher('b043f82f81ba511d2ff6', options);
        var channel = pusher.subscribe(meetingId);
        console.log("assigned pusher to channel " + meetingId);
        channel.bind('join_notification', pusherJoinNotification);
        

    } catch (err) {
        // handle error
        console.log("oh shit there is an error");
        console.log(err);
    }
}

function updateTiles(meetingSession) {
    const tiles = meetingSession.audioVideo.getAllVideoTiles();
    console.log("updating tiles");
    console.log("tiles", tiles);
    tiles.forEach(tile => {
        let tileId = tile.tileState.tileId
        let boundAttendeeId = tile.tileState.boundAttendeeId
        var videoElement = document.getElementById("video-" + tileId);

        if (!videoElement) {

            nElement = document.createElement("div");
            nElement.id = "div-" + boundAttendeeId;
            // nElement.innerText = "jonathan davis: " + boundAttendeeId;
            nElement.innerText = "pending";
            document.getElementById("video-list").append(nElement);

            videoElement = document.createElement("video");
            videoElement.id = "video-" + tileId;
            document.getElementById("video-list").append(videoElement);
            meetingSession.audioVideo.bindVideoElement(
                tileId,
                videoElement
            );
        }
    })
}

async function stop() {
    const response = await fetch("end", {
        body: JSON.stringify({
            meetingId: meetingId,
        }),
        method: "POST",
        headers: new Headers(),
    });
    const data = await response.json();
    console.log(data);
}

async function get_attendees(){
    console.log("calling uri get_attendees?meetingId=" + meetingId);
    const response = await fetch("get_attendees?meetingId=" + meetingId, {
        method: "GET",
        headers: new Headers(),
    });
    const data = await response.json();
    console.log(data);
    console.log("complete");
}

async function unmuteAttendee(){
    console.log("you called unmute");
    console.log(attendeeIdInput.value);


}

async function muteAttendee(){
    console.log("you called mute");
    console.log(attendeeIdInput.value);

    // window.audioDeviceId = audioInputs[0].deviceId;
    // window.videoDeviceId = videoInputs[0].deviceId;
    console.log("here are the device ids");
    console.log(window.audioDeviceId);
    console.log(window.videoDeviceId);
    
    await meetingSession.audioVideo.chooseAudioInputDevice(null);

}

window.addEventListener("DOMContentLoaded", () => {
    startButton.addEventListener("click", start);
    unmuteAttendeeButton.addEventListener("click", unmuteAttendee);
    muteAttendeeButton.addEventListener("click", muteAttendee);

    if (isMeetingHost) {
        stopButton.addEventListener("click", stop);
        attendeesButton.addEventListener("click", get_attendees);
    }
});
