import React, { useRef, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Canvas } from "fabric";
import io from "socket.io-client";
import { Download, Group, Save } from "lucide-react";
import axios from "axios";
import GroupVoiceChat from "./GroupVoiceChat";

const ViewWhiteboard = () => {
  const { boardId } = useParams();
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [fullId, setFullId] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const initCanvas = new Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
      selection: false,
      enableRetinaScaling: true
    });
    initCanvas.backgroundColor = "#fff";

    initCanvas.on("object:added", (e) => {
        if (e.target) {
          e.target.selectable = false;
          e.target.evented = false; 
        }
      });

    initCanvas.renderAll();
    setCanvas(initCanvas);
    console.log("Canvas rendered")

    return () => {
      initCanvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (!canvas) return;

    const socket = io("https://codraw-backend-hd97.onrender.com");
    socketRef.current = socket;

    socket.emit("join-board", {boardId, data: null, role: 'viewer'});

    const handleInitialRender = ({data, boardId}) => {
      // console.log(data);
      // console.log(data);
      // console.log(boardId)
      setFullId(boardId);
      canvas.loadFromJSON(data, () => {
          canvas.renderAll();
          canvas.calcOffset();
          canvas.requestRenderAll();
          console.log("Canvas Drawn")
        });
    }

    socket.on('send-current-data', handleInitialRender);

    const handleCanvasUpdate = ({ boardId: incomingId, data }) => {
        // console.log(data)
      if (incomingId.slice(-6) === boardId) {
        canvas.loadFromJSON(data, () => {
        canvas.getObjects().forEach((obj) => {
            obj.selectable = false;
            obj.evented = false;
            });
          canvas.renderAll();
          canvas.calcOffset();
          canvas.requestRenderAll();
        });
      }
    };

    socket.on("canvas-data", handleCanvasUpdate);

    return () => {
      socket.off("canvas-data", handleCanvasUpdate);
      socket.disconnect();
    };
  }, [boardId, canvas]);

  const exportCanvasAsImage = () => {
    if (!canvas) return;
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1.0 });
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `whiteboard-${boardId}.png`;
    link.click();
  };

  const saveWhiteboard = async () => {
    if (!canvas) return;
    const whiteboardData = JSON.stringify(canvas.toJSON());
    const previewImage = canvas.toDataURL('image/png');

    try {
      await axios.post(
        "https://codraw-backend-hd97.onrender.com/api/whiteboards/save",
        { boardId: crypto.randomUUID(), data: whiteboardData, previewImage },
        { withCredentials: true }
      );
      alert("Whiteboard saved successfully!");
    } catch (error) {
      console.error("Error saving whiteboard:", error);
      alert("Failed to save whiteboard");
    }
  };

  return (
    <div className="relative flex overflow-hidden min-h-screen">
      <canvas ref={canvasRef} />
      <div className="toolbar absolute top-[2%] z-[20] shadow-lg left-1/2 -translate-x-1/2 bg-gray-100 rounded-[10px] flex gap-5 px-3 py-3 justify-center  items-center">
        <button onClick={saveWhiteboard} className='cursor-pointer bg-gray-100 hover:bg-blue-100 flex items-center gap-2 p-[10px] font-mono rounded-[10px] text-sm' title='Save Whiteboard'>
          <Save size={20} /> Save Whiteboard
          </button>
        <button onClick={exportCanvasAsImage} className='cursor-pointer bg-gray-100 hover:bg-blue-100 flex items-center gap-2 p-[10px] font-mono rounded-[10px] text-sm'>
          <Download size={20} /> Export as PNG
        </button>
        {fullId && <GroupVoiceChat boardId={fullId}/>}
      </div>
      
    </div>
  );
};

export default ViewWhiteboard;
