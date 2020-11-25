var startButton = document.getElementById("start-button");
var stopButton = document.getElementById("stop-button");
var studentNameElement = document.getElementById("student-name");
var urlParams = new URLSearchParams(window.location.search);
var professor_name = document.getElementById("professor_name");
var ondeck_name = document.getElementById("ondeck_name");
var my_name = document.getElementById("my_name");

function generateString() {
    return (
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)
    );
}

var meetingId = urlParams.get("meetingId");
var clientId = generateString();
var professorAttendeeId = urlParams.get("professorId");;
var presentAttendeeId = 0;
var ondeckAttendeeId = 0;

const logger = new ChimeSDK.ConsoleLogger(
    "ChimeMeetingLogs",
    ChimeSDK.LogLevel.OFF
);

const deviceController = new ChimeSDK.DefaultDeviceController(logger);


startButton.innerText = "Join!";
startButton.style.display = "block";

var pusherMute = function(){
    MuteMe();
};
var pusherUnMute = function(){
    UnmuteMe();
};

var pusherOnDeck = function(data){
    data = JSON.parse(data.data);
    ondeckAttendeeId = data.AttendeeId;
    ondeck_name.innerText = data.studentName;
    updateTiles(window.meetingSession);
    if(ondeckAttendeeId == presentAttendeeId){
        UnmuteMe();
    }else{
        MuteMe();
    }
};

function MuteMe(){
    window.meetingSession.audioVideo.realtimeMuteLocalAudio();
}

function UnmuteMe(){
    window.meetingSession.audioVideo.realtimeUnmuteLocalAudio();
}

async function start() {
    if (window.meetingSession) {
        return
    }
    var studentName = studentNameElement.value;
    if(studentName == ""){
        alert("you must provide your name");
        return
    }
    my_name.innerText = studentName;
    studentNameElement.style.display = "none";
    startButton.style.display = "none";

    try {
        let requestPath = `join?clientId=${clientId}&meetingId=${meetingId}&studentName=${studentName}`;
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

        window.meetingSession = new ChimeSDK.DefaultMeetingSession(
            configuration,
            logger,
            deviceController
        );

        const audioInputs = await meetingSession.audioVideo.listAudioInputDevices();
        const videoInputs = await meetingSession.audioVideo.listVideoInputDevices();

        window.audioDeviceId = audioInputs[0].deviceId;
        window.videoDeviceId = videoInputs[0].deviceId;

        await meetingSession.audioVideo.chooseAudioInputDevice(
            audioInputs[0].deviceId
        );
        await meetingSession.audioVideo.chooseVideoInputDevice(
            videoInputs[0].deviceId
        );

        const observer = {
            // videoTileDidUpdate is called whenever a new tile is created or tileState changes.
            videoTileDidUpdate: (tileState) => {
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

        presentAttendeeId = meetingSession.configuration.credentials.attendeeId;

        const studentData = {name: studentName, AttendeeId: presentAttendeeId, meetingId: meetingId}
        fetch("login_student", {
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

        var options = {cluster: 'us2'}
        var pusher = new Pusher('b043f82f81ba511d2ff6', options);
        var channel = pusher.subscribe(meetingId);
        channel.bind('on_deck', pusherOnDeck);
        channel.bind('mute', pusherMute);
        channel.bind('unmute', pusherUnMute);

        await meetingSession.audioVideo.realtimeSetCanUnmuteLocalAudio(true);
        MuteMe();
    } catch (err) {
        // handle error
        console.log(err);
    }
}

function updateTiles(meetingSession) {
    const tiles = meetingSession.audioVideo.getAllVideoTiles();
    // console.log("tiles", tiles);
    tiles.forEach(tile => {
        let tileId = tile.tileState.tileId;
        let boundAttendeeId = tile.tileState.boundAttendeeId;
        let containerId = null;

        if(boundAttendeeId == professorAttendeeId){
            containerId = "video-professor";
        }else if(boundAttendeeId == ondeckAttendeeId){
            containerId = "video-ondeck"
        }else if(boundAttendeeId == presentAttendeeId){
            containerId = "video-me"
        }

        if(containerId != null){
            let videoElement = document.getElementById(containerId);
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
}

window.addEventListener("DOMContentLoaded", () => {
    startButton.addEventListener("click", start);
});
