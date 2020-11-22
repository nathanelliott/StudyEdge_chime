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

let requestPath = `join?clientId=${clientId}`;
requestPath += `&meetingId=${meetingId}`;
startButton.innerText = "Join!";
startButton.style.display = "block";

// var pusherMute = function(){
    // console.log('you called pusherMute');
    // window.meetingSession.audioVideo.chooseAudioInputDevice(null);
    // console.log('completed pusherMute');
// };
// var pusherUnMute = function(){
    // console.log('you called pusherUnMute');
    // window.meetingSession.audioVideo.chooseAudioInputDevice(window.audioDeviceId);    
    // console.log('completed pusherUnMute');
// };
var pusherOnDeck = function(data){
    console.log('you called pusherOnDeck');
    console.log(data);
    data = JSON.parse(data.data);
    ondeckAttendeeId = data.AttendeeId;
    ondeck_name.innerText = data.studentName;
    console.log("updated the ondeckAttendeeId: " + ondeckAttendeeId);
    updateTiles(window.meetingSession);
    console.log('completed updateTiles');
    if(ondeckAttendeeId == presentAttendeeId){
        console.log('unmuting this user');
        window.meetingSession.audioVideo.chooseAudioInputDevice(window.audioDeviceId);    
    }else{
        console.log('muting this user');
        window.meetingSession.audioVideo.chooseAudioInputDevice(null);
    }
    console.log('completed pusherOnDeck');
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
    my_name.innerText = studentName;
    studentNameElement.style.display = "none";
    startButton.style.display = "none";

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

        presentAttendeeId = meetingSession.configuration.credentials.attendeeId;

        const studentData = {name: studentName, AttendeeId: presentAttendeeId, meetingId: meetingId}
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
        var channel = pusher.subscribe(meetingId);
        channel.bind('on_deck', pusherOnDeck);
        channel.bind('mute', pusherMute);
        channel.bind('unmute', pusherUnMute);

        console.log("muting the user");
        await meetingSession.audioVideo.realtimeSetCanUnmuteLocalAudio(true);
        await meetingSession.audioVideo.realtimeMuteLocalAudio();
        pusherMute();

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
        let tileId = tile.tileState.tileId;
        let boundAttendeeId = tile.tileState.boundAttendeeId;
        let containerId = null;

        console.log("boundAttendeeId: " + boundAttendeeId);
        console.log("professorAttendeeId: " + professorAttendeeId);
        console.log("ondeckAttendeeId: " + ondeckAttendeeId);
        console.log("presentAttendeeId: " + presentAttendeeId);

        if(boundAttendeeId == professorAttendeeId){
            containerId = "video-professor";
        }else if(boundAttendeeId == ondeckAttendeeId){
            containerId = "video-ondeck"
        }else if(boundAttendeeId == presentAttendeeId){
            containerId = "video-me"
        }
        console.log("boundAttendeeId: " + boundAttendeeId);
        console.log("containerId: " + containerId);
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
    console.log(data);
}

window.addEventListener("DOMContentLoaded", () => {
    startButton.addEventListener("click", start);
});
