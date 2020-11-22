var startButton = document.getElementById("start-button");
var stopButton = document.getElementById("stop-button");
// var attendeesButton = document.getElementById("get_attendees");
// var attendeeIdInput = document.getElementById("attendee_id");
var professorNameElement = document.getElementById("professor-name");
var urlParams = new URLSearchParams(window.location.search);
var professorAttendeeId = "pending 1";
var ondeckAttendeeId = "pending 2";

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

startButton.innerText = "Launch Office Hours Session!";
startButton.style.display = "block";

var pusherJoinNotification = function(data){
    console.log('you called pusherJoinNotification');
    console.log(data);
    data = JSON.parse(data.data);
    nElement = document.getElementById("div-" + data.AttendeeId);
    if(nElement){
        AttendeeInfo = "<BR><HR><BR><A href=\"JAVASCRIPT:nextOnDeck('" + data.AttendeeId + "', '" + data.meetingId + "', '" + data.name + "');\">";
        AttendeeInfo = AttendeeInfo + "Student: " + data.name;
        AttendeeInfo = AttendeeInfo + "</A>";
        nElement.innerHTML = AttendeeInfo;
        console.log(AttendeeInfo);
    }else{
        console.log("CANNOT FIND ELEMENT: div-" + data.AttendeeId);
    }
    console.log('completed pusherJoinNotification');
};

function nextOnDeck(AttendeeId, meetingId, studentName){
    console.log("calling nextOnDeck");
    ondeckAttendeeId = AttendeeId;
    const onDeckData = {AttendeeId: AttendeeId, meetingId: meetingId, studentName: studentName}
    fetch("/on_deck", {
        method: 'POST',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify(onDeckData)
    });
    
    console.log("updated the ondeckAttendeeId: " + ondeckAttendeeId);
    updateTiles(window.meetingSession);
    console.log("Finished nextOnDeck");
}

async function start() {
    if (window.meetingSession) {
        return
    }
    var professorName = professorNameElement.value;
    if(professorName == ""){
        alert("you must provide your name");
        return
    }
    console.log("professorName: " + professorName);
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

        window.meetingSession = new ChimeSDK.DefaultMeetingSession(
            configuration,
            logger,
            deviceController
        );

        professorAttendeeId = meetingSession.configuration.credentials.attendeeId;
        console.log("your attendeeid is: " + professorAttendeeId);

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


        var meetingLink = window.location.href + "?meetingId=" + meetingId + "&professorId=" + professorAttendeeId;
        meetingLink = meetingLink.replace("professor", "student");
        meetingLink = "<A href='" + meetingLink + "' target='_blank'>" + meetingLink + "</A>";
        document.getElementById("meeting-link").innerHTML = meetingLink;

        var options = {cluster: 'us2'}
        var pusher = new Pusher('b043f82f81ba511d2ff6', options);
        var channel = pusher.subscribe(meetingId);
        console.log("assigned pusher to channel " + meetingId);
        channel.bind('join_notification', pusherJoinNotification);
        
        // Make everything visible
        stopButton.style.display = "block";
        startButton.style.display = "none";
        professorNameElement.style.display = "none";

    } catch (err) {
        console.log("oh shit there is an error");
        console.log(err);
    }
}

function updateTiles(meetingSession) {
    const tiles = meetingSession.audioVideo.getAllVideoTiles();
    console.log("updating tiles");
    console.log("tiles", tiles);
    tiles.forEach(tile => {
        let tileId = tile.tileState.tileId;
        let boundAttendeeId = tile.tileState.boundAttendeeId;
        let containerId = null;
        console.log("boundAttendeeId: " + boundAttendeeId);
        console.log("professorAttendeeId: " + professorAttendeeId);
        console.log("ondeckAttendeeId: " + ondeckAttendeeId);

        if(boundAttendeeId == professorAttendeeId){
            containerId = "video-professor";
        }else if(boundAttendeeId == ondeckAttendeeId){
            containerId = "video-ondeck";
        }else{
            containerId = "video-list";
        }
        console.log("container id is: " + containerId);
        let videoId = containerId + "-video-" + tileId;
        let videoElement = document.getElementById(containerId);
        let newVideoElement = document.getElementById(videoId);
        if(containerId == "video-ondeck"){
            //remove the elements added from append
            // videoElement.remove();
            videoElement.innerHTML = "asdf";
        }
        if (!newVideoElement) {
            if(containerId == "video-list"){
                nElement = document.createElement("div");
                nElement.id = "div-" + boundAttendeeId;
                console.log("SETTING video list attendee element div-" + boundAttendeeId);
                nElement.innerHTML = "tbd";
                videoElement.append(nElement);
            }

            newVideoElement = document.createElement("video");
            newVideoElement.id = videoId;
            newVideoElement.style.width = "300px";
            newVideoElement.style.height = "200px";
            videoElement.append(newVideoElement);

            meetingSession.audioVideo.bindVideoElement(
                tileId,
                newVideoElement
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

// async function get_attendees(){
    // console.log("calling uri get_attendees?meetingId=" + meetingId);
    // const response = await fetch("get_attendees?meetingId=" + meetingId, {
        // method: "GET",
        // headers: new Headers(),
    // });
    // const data = await response.json();
    // console.log(data);
    // console.log("complete");
// }

// async function unmuteAttendee(){
    // console.log("you called unmute");
    // console.log(attendeeIdInput.value);
// }

/*
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
*/

window.addEventListener("DOMContentLoaded", () => {
    startButton.addEventListener("click", start);

    if (isMeetingHost) {
        stopButton.addEventListener("click", stop);
        // attendeesButton.addEventListener("click", get_attendees);
    }
});
