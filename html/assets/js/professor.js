var startButton = document.getElementById("start-button");
var stopButton = document.getElementById("stop-button");
// var attendeesButton = document.getElementById("get_attendees");
// var attendeeIdInput = document.getElementById("attendee_id");
var professorNameElement = document.getElementById("professor-name");
var urlParams = new URLSearchParams(window.location.search);
var professorAttendeeId = "pending 1";
var ondeckAttendeeId = "pending 2";
var attendeeNames = [];

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

startButton.innerText = "Launch Office Hours Session!";
startButton.style.display = "block";

var pusherJoinNotification = function(data){
    data = JSON.parse(data.data);
    let attendee = {meetingId: data.meetingId, attendeeId: data.AttendeeId, name: data.name}
    attendeeNames.push(attendee);
    setAttendeeName(data.AttendeeId);
};


function nextOnDeck(AttendeeId, meetingId, studentName){
    ondeckAttendeeId = AttendeeId;
    const onDeckData = {AttendeeId: AttendeeId, meetingId: meetingId, studentName: studentName}
    fetch("on_deck", {
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
    updateTiles(window.meetingSession);
    document.getElementById("student_name").innerText = studentName;
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
    document.getElementById("professor_name").innerText = professorName;
    try {
        let requestPath = `join?clientId=${clientId}&professorName=${professorName}`;
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


        var meetingLink = window.location.href + "?meetingId=" + meetingId + "&professorId=" + professorAttendeeId;
        meetingLink = meetingLink.replace("professor", "student");
        meetingLink = "<A href='" + meetingLink + "' target='_blank'>" + meetingLink + "</A>";
        document.getElementById("meeting-link").innerHTML = meetingLink;

        var options = {cluster: 'us2'}
        var pusher = new Pusher('b043f82f81ba511d2ff6', options);
        var channel = pusher.subscribe(meetingId);
        channel.bind('join_notification', pusherJoinNotification);
        
        // Make everything visible
        stopButton.style.display = "block";
        startButton.style.display = "none";
        professorNameElement.style.display = "none";

    } catch (err) {
        console.log(err);
    }
}


function setAttendeeName(attendeeId){
    nElement = document.getElementById("div-" + attendeeId);
    if(nElement){
        for (x in attendeeNames){
            if(attendeeNames[x].attendeeId == attendeeId){
                AttendeeInfo = "<BR><HR><BR><A href=\"JAVASCRIPT:nextOnDeck('" + attendeeNames[x].attendeeId + "', '" + attendeeNames[x].meetingId + "', '" + attendeeNames[x].name + "');\">";
                AttendeeInfo = AttendeeInfo + "Student: " + attendeeNames[x].name;
                AttendeeInfo = AttendeeInfo + "</A>";
                nElement.innerHTML = AttendeeInfo;
                break;
            }
        }
    }
}

function updateTiles(meetingSession) {
    const tiles = meetingSession.audioVideo.getAllVideoTiles();
    tiles.forEach(tile => {
        let tileId = tile.tileState.tileId;
        let boundAttendeeId = tile.tileState.boundAttendeeId;
        let containerId = null;

        if(boundAttendeeId == professorAttendeeId){
            containerId = "video-professor";
        }else if(boundAttendeeId == ondeckAttendeeId){
            containerId = "video-ondeck";
        }else{
            containerId = "video-list";
        }
        let videoId = containerId + "-video-" + tileId;
        let videoElement = document.getElementById(containerId);
        
        if(containerId == "video-ondeck" || containerId == "video-professor"){
            // remove them from the queue
            meetingSession.audioVideo.unbindVideoElement(tileId);
            // replace at the top
            meetingSession.audioVideo.bindVideoElement(
                tileId,
                videoElement
            );
        }else{
            let newVideoElement = document.getElementById(videoId);
            if (!newVideoElement) {
                if(containerId == "video-list"){
                    nElement = document.createElement("div");
                    nElement.id = "div-" + boundAttendeeId;
                    nElement.innerHTML = "tbd";
                    videoElement.append(nElement);
                    setAttendeeName(boundAttendeeId);
                }
                newVideoElement = document.createElement("video");
                newVideoElement.id = videoId;
                newVideoElement.style.width = "200px";
                newVideoElement.style.height = "auto";
                videoElement.append(newVideoElement);
    
                meetingSession.audioVideo.bindVideoElement(
                    tileId,
                    newVideoElement
                );
            }
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

// async function get_attendees(){
    // const response = await fetch("get_attendees?meetingId=" + meetingId, {
        // method: "GET",
        // headers: new Headers(),
    // });
    // const data = await response.json();
// }


window.addEventListener("DOMContentLoaded", () => {
    startButton.addEventListener("click", start);
    stopButton.addEventListener("click", stop);
    // attendeesButton.addEventListener("click", get_attendees);
});
