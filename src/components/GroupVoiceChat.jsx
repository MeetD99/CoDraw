import React, { useRef, useState } from "react";
import Peer from "peerjs";
import { io } from "socket.io-client";
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, Phone } from "lucide-react";

const socket = io("https://co-draw-backend.onrender.com");

export default function GroupVoiceChat({ boardId }) {
  const [peerId, setPeerId] = useState("");
  const [peers, setPeers] = useState({});
  const [micOn, setMicOn] = useState(true);
  const [mutedPeers, setMutedPeers] = useState({});
  const [hasJoined, setHasJoined] = useState(false);

  const localStreamRef = useRef(null);
  const audioContainerRef = useRef(null);
  const peerRef = useRef(null);

  const joinVoiceChat = async () => {
    if (hasJoined) return;
    setHasJoined(true);

    const peer = new Peer();
    peerRef.current = peer;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;

    peer.on("open", (id) => {
      setPeerId(id);
      socket.emit("join-voice", { boardId, peerId: id });
    });

    peer.on("call", (call) => {
      call.answer(stream);
      call.on("stream", (remoteStream) => addAudio(remoteStream, call.peer));
    });

    socket.on("all-peers", (peerIds) => {
      peerIds.forEach((id) => {
        if (id !== peer.id && !peers[id]) {
          const call = peer.call(id, stream);
          if (call) {
            call.on("stream", (remoteStream) =>
              addAudio(remoteStream, call.peer)
            );
            call.on("error", (err) => console.error("Call error:", err));
            setPeers((prev) => ({ ...prev, [id]: call }));
          }
        }
      });
    });

    socket.on("user-joined-voice", ({ peerId: newPeerId }) => {
      const call = peer.call(newPeerId, stream);
      if (call) {
        call.on("stream", (remoteStream) =>
          addAudio(remoteStream, call.peer)
        );
        setPeers((prev) => ({ ...prev, [newPeerId]: call }));
      }
    });

    socket.on("user-left-voice", ({ peerId: leftPeerId }) => {
      removeAudio(leftPeerId);
      setPeers((prev) => {
        const copy = { ...prev };
        delete copy[leftPeerId];
        return copy;
      });
    });
  };

  const leaveVoiceChat = () => {
    if (!hasJoined) return;
    setHasJoined(false);

    if (peerRef.current) {
      peerRef.current.destroy();
      socket.emit("leave-voice", { boardId, peerId });
    }

    Object.values(peers).forEach((call) => call.close());
    setPeers({});
    setMutedPeers({});
    setPeerId("");

    if (audioContainerRef.current) {
      audioContainerRef.current.innerHTML = "";
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const addAudio = async (stream, id) => {
    if (
      !audioContainerRef.current ||
      audioContainerRef.current.querySelector(`#audio-${id}`)
    )
      return;

    const audio = document.createElement("audio");
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.id = `audio-${id}`;
    audio.muted = false;

    try {
      if (typeof audio.setSinkId === "function") {
        await audio.setSinkId("default");
      }
    } catch (error) {
      console.warn("setSinkId not supported or failed", error);
    }

    audioContainerRef.current.appendChild(audio);
  };

  const removeAudio = (id) => {
    const audio = document.getElementById(`audio-${id}`);
    if (audio) audio.remove();
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const micTrack = localStreamRef.current.getAudioTracks()[0];
      micTrack.enabled = !micTrack.enabled;
      setMicOn(micTrack.enabled);
    }
  };

  const togglePeerVolume = (id) => {
    setMutedPeers((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      const audio = document.getElementById(`audio-${id}`);
      if (audio) audio.muted = updated[id];
      return updated;
    });
  };

  return (
    <div className="bg-white  rounded-xl flex gap-4 items-center p-2">
      {!hasJoined ? (
        <button
          onClick={joinVoiceChat}
          className="cursor-pointer text-nowrap font-mono rounded-full flex items-center gap-2"
        >
          <Phone size={20}/>Join VC
        </button>
      ) : (
        <>
          <button
            onClick={toggleMic}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            {micOn ? (
              <Mic className="text-green-600" size={20}/>
            ) : (
              <MicOff className="text-red-500" size={20}/>
            )}
          </button>

          {Object.keys(peers).map((id) => (
            <button
              key={id}
              onClick={() => togglePeerVolume(id)}
              className="p-2 rounded-full hover:bg-gray-100 transition"
            >
              {mutedPeers[id] ? (
                <VolumeX className="text-gray-500" />
              ) : (
                <Volume2 className="text-[#8f00ff]/80" />
              )}
            </button>
          ))}

          <button
            onClick={leaveVoiceChat}
            className="p-2 rounded-full hover:bg-red-100 transition"
          >
            <PhoneOff className="text-red-500" size={20}/>
          </button>
        </>
      )}

      <div ref={audioContainerRef} className="hidden" />
    </div>
  );
}
