var startButton = document.getElementById("start-button");
var stopButton = document.getElementById("stop-button");
var studentNameElement = document.getElementById("student-name");
var urlParams = new URLSearchParams(window.location.search);

function generateString() {
    return (
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)
    );
}

var meetingId = urlParams.get("meetingId");
var clientId = generateString();

const logger = new ChimeSDK.ConsoleLogger(
    "ChimeMeetingLogs",
    ChimeSDK.LogLevel.OFF
);

const deviceController = new ChimeSDK.DefaultDeviceController(logger);

let requestPath = `join?clientId=${clientId}`;
requestPath += `&meetingId=${meetingId}`;
startButton.innerText = "Join!";
startButton.style.display = "block";

var pusherMute = function(){
    console.log('you called pusherMute');
    window.meetingSession.audioVideo.chooseAudioInputDevice(null);
    console.log('completed pusherMute');
};
var pusherUnMute = function(){
    console.log('you called pusherUnMute');
    window.meetingSession.audioVideo.chooseAudioInputDevice(window.audioDeviceId);    
    console.log('completed pusherUnMute');
};

async function start() {
    if (window.meetingSession) {
        return
    }
    var studentName = studentNameElement.value;
    if(studentName == ""){
        alert("you must provide your name");
        return
    }
    console.log("studentName: " + studentName);
    try {
        var response = await fetch(requestPath, {
            method: "POST",
            headers: new Headers(),
        });

        const data = await response.json();
        meetingId = data.Info.Meeting.Meeting.MeetingId;

        const configuration = new ChimeSDK.MeetingSessionConfiguration(
            data.Info.Meeting.Meeting,
            data.Info.Attendee.Attendee
        );
        window.nathan = "asdf";
        console.log(window.nathan);
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

        const studentData = {name: studentName, AttendeeId: presentAttendeeId}
        fetch("/login_student", {
            method: 'POST',
            // mode: 'cors', // no-cors, *cors, same-origin
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            credentials: 'same-origin', // include, *same-origin, omit
            headers: {
              'Content-Type': 'application/json'
              // 'Content-Type': 'application/x-www-form-urlencoded',
            },
            redirect: 'follow', // manual, *follow, error
            referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            body: JSON.stringify(studentData) // body data type must match "Content-Type" header
        });

        console.log("your attendeeid is: " + presentAttendeeId);
        var options = {cluster: 'us2'}
        var pusher = new Pusher('b043f82f81ba511d2ff6', options);
        var channel = pusher.subscribe(presentAttendeeId);
        console.log("assigned pusher to channel " + presentAttendeeId);
        channel.bind('mute', pusherMute);
        channel.bind('unmute', pusherUnMute);
        // var professorchannel = pusher.subscribe(meetingId);
        // professorchannel.trigger("join_notification", {name: studentName, AttendeeId: presentAttendeeId});

        console.log("muting the user");
        await meetingSession.audioVideo.realtimeSetCanUnmuteLocalAudio(true);
        await meetingSession.audioVideo.realtimeMuteLocalAudio();

        console.log("we finished the race with quality");
    } catch (err) {
        // handle error
        console.log("oh shit there is an error");
        console.log(err);
    }
}

function updateTiles(meetingSession) {
    const tiles = meetingSession.audioVideo.getAllVideoTiles();
    console.log("tiles", tiles);
    tiles.forEach(tile => {
        let tileId = tile.tileState.tileId
        var videoElement = document.getElementById("video-" + tileId);

        if (!videoElement) {
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

window.addEventListener("DOMContentLoaded", () => {
    startButton.addEventListener("click", start);
});
