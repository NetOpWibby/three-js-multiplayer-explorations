/*
 *
 * This uses code from a THREE.js Multiplayer boilerplate made by Or Fleisher:
 * https://github.com/juniorxsound/THREE.Multiplayer
 * And a WEBRTC chat app made by Mikołaj Wargowski:
 * https://github.com/Miczeq22/simple-chat-app
 *
 * Aidan Nelson, April 2020
 *
 */

const peers = {};
const videoFrameRate = 15;
const videoHeight = 60;
const videoWidth = 80;

let localMediaStream = null; // webcam and microphone stream
let myScene;
let mySocket;

// Constraints for our local audio/video stream
const mediaConstraints = {
  audio: true,
  video: {
    frameRate: videoFrameRate,
    height: videoHeight,
    width: videoWidth
  }
};

////////////////////////////////////////////////////////////////////////////////
// Start-Up Sequence:
////////////////////////////////////////////////////////////////////////////////

window.onload = async() => {
  console.log("Window loaded.");

  // first get user media
  localMediaStream = await getMedia(mediaConstraints);

  createLocalVideoElement();

  // then initialize socket connection
  initSocketConnection();

  // finally create the threejs scene
  console.log("Creating three.js scene...");
  myScene = new Scene();

  // start sending position data to the server
  setInterval(() => {
    mySocket.emit("move", myScene.getPlayerPosition());
  }, 200);
};

////////////////////////////////////////////////////////////////////////////////
// Local media stream setup
////////////////////////////////////////////////////////////////////////////////

// https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
async function getMedia(mediaConstraints) {
  let stream = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
  } catch(err) {
    console.log("Failed to get user media!");
    console.warn(err);
  }

  return stream;
}

////////////////////////////////////////////////////////////////////////////////
// Socket.io
////////////////////////////////////////////////////////////////////////////////

// establishes socket connection
function initSocketConnection() {
  console.log("Initializing socket.io...");
  mySocket = io();

  mySocket.on("connect", () => {
    console.log("My socket ID:", mySocket.id);
  });

  //On connection server sends the client his ID and a list of all keys
  mySocket.on("introduction", otherClientIds => {
    // for each existing user, add them as a client and add tracks to their peer connection
    for (let i = 0; i < otherClientIds.length; i++) {
      if (otherClientIds[i] !== mySocket.id) {
        const theirId = otherClientIds[i];

        console.log(`Adding client with id ${theirId}`);
        peers[theirId] = {};

        const pc = createPeerConnection(theirId, true);
        peers[theirId].peerConnection = pc;

        createClientMediaElements(theirId);
        myScene.addClient(theirId);
      }
    }
  });

  // when a new user has entered the server
  mySocket.on("newUserConnected", theirId => {
    if (theirId !== mySocket.id && !(theirId in peers)) {
      console.log(`A new user connected with the ID: ${theirId}`);
      console.log(`Adding client with id ${theirId}`);

      peers[theirId] = {};
      createClientMediaElements(theirId);
      myScene.addClient(theirId);
    }
  });

  mySocket.on("userDisconnected", (clientCount, id, _ids) => {
    // Update the data from the server
    if (id !== mySocket.id) {
      console.log(`A user disconnected with the id: ${id}`);

      myScene.removeClient(id);
      removeClientVideoElementAndCanvas(id);
      delete peers[id];
    }
  });

  mySocket.on("signal", (to, from, data) => {
    // console.log("Got a signal from the server: ", to, from, data);

    // to should be us
    if (to !== mySocket.id)
      console.log("Socket IDs don't match");

    // Look for the right simplepeer in our array
    let peer = peers[from];

    if (peer.peerConnection) {
      peer.peerConnection.signal(data);
    } else {
      console.log("Never found right simplepeer object");
      // Let's create it then, we won't be the "initiator"
      // let theirSocketId = from;
      const peerConnection = createPeerConnection(from, false);

      peers[from].peerConnection = peerConnection;

      // Tell the new simplepeer that signal
      peerConnection.signal(data);
    }
  });

  // Update when one of the users moves in space
  mySocket.on("positions", clientProps => {
    myScene.updateClientPositions(clientProps);
  });
}

////////////////////////////////////////////////////////////////////////////////
// Clients / WebRTC
////////////////////////////////////////////////////////////////////////////////

// this function sets up a peer connection and corresponding DOM elements for a specific client
function createPeerConnection(theirSocketId, isInitiator = false) {
  console.log(`Connecting to peer with ID ${theirSocketId}`);
  console.log(`initiating? ${isInitiator}`);

  const peerConnection = new SimplePeer({ initiator: isInitiator });

  // simplepeer generates signals which need to be sent across socket
  peerConnection.on("signal", data => {
    // console.log('signal');
    mySocket.emit("signal", theirSocketId, mySocket.id, data);
  });

  // When we have a connection, send our stream
  peerConnection.on("connect", () => {
    // Let's give them our stream
    peerConnection.addStream(localMediaStream);
    console.log("Send our stream");
  });

  // Stream coming in to us
  peerConnection.on("stream", stream => {
    console.log("Incoming Stream");
    updateClientMediaElements(theirSocketId, stream);
  });

  peerConnection.on("close", () => {
    console.log("Got close event");
    // Should probably remove from the array of simplepeers
  });

  peerConnection.on("error", err => {
    console.log(err);
  });

  return peerConnection;
}

// temporarily pause the outgoing stream
// function disableOutgoingStream() {
//   localMediaStream.getTracks().forEach(track => track.enabled = false);
// }

// // enable the outgoing stream
// function enableOutgoingStream() {
//   localMediaStream.getTracks().forEach(track => track.enabled = true);
// }

////////////////////////////////////////////////////////////////////////////////
// Three.js
////////////////////////////////////////////////////////////////////////////////

// function onPlayerMove() {
//   // console.log('Sending movement update to server.');
// }

//////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////
// Utilities 🚂

// created <video> element for local mediastream
function createLocalVideoElement() {
  const gallery = document.querySelector(".gallery");
  const videoElement = document.createElement("video");

  videoElement.id = "local_video";
  videoElement.autoplay = true;
  videoElement.width = videoWidth;
  videoElement.height = videoHeight;
  // videoElement.style = "visibility: hidden;";

  if (localMediaStream) {
    const videoStream = new MediaStream([localMediaStream.getVideoTracks()[0]]);
    videoElement.srcObject = videoStream;
  }

  gallery.appendChild(videoElement);
}

// created <video> element using client ID
function createClientMediaElements(id) {
  console.log(`Creating <html> media elements for client with ID: ${id}`);
  const gallery = document.querySelector(".gallery");
  const videoElement = document.createElement("video");

  videoElement.id = `${id}_video`;
  videoElement.autoplay = true;
  // videoElement.style = "visibility: hidden;";

  gallery.appendChild(videoElement);

  // create audio element for client
  const audioEl = document.createElement("audio");

  audioEl.setAttribute("id", `${id}_audio`);
  audioEl.controls = "controls";
  audioEl.volume = 1;

  gallery.appendChild(audioEl);
  audioEl.addEventListener("loadeddata", () => audioEl.play());
}

function updateClientMediaElements(id, stream) {
  const videoStream = new MediaStream([stream.getVideoTracks()[0]]);
  const audioStream = new MediaStream([stream.getAudioTracks()[0]]);

  const videoElement = document.getElementById(`${id}_video`);
  videoElement.srcObject = videoStream;

  const audioEl = document.getElementById(`${id}_audio`);
  audioEl.srcObject = audioStream;
}

// remove <video> element and corresponding <canvas> using client ID
function removeClientVideoElementAndCanvas(id) {
  console.log(`Removing <video> element for client with id: ${id}`);
  const videoEl = document.getElementById(`${id}_video`);

  if (videoEl !== null)
    videoEl.remove();
}
