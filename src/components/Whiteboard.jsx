import React, { useRef, useState, useEffect } from 'react';
import { Canvas, PencilBrush, Textbox, Rect, Circle as Cir } from 'fabric';
import { Square, Circle, Type, Move, Pencil, Trash2, Save, Download, Copy } from 'lucide-react';
import Settings from './Settings';
import axios from "axios";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import GroupVoiceChat from './GroupVoiceChat';

const Whiteboard = () => {
  const { boardId } = useParams();
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [brushWidth, setBrushWidth] = useState(5);
  const [freeDrawingEnabled, setFreeDrawingEnabled] = useState(false);
  const [initialData, setInitialData] = useState(null);
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const isUpdatingFromSocketRef = useRef(false);
  

  // Load initial whiteboard data
  useEffect(() => {
    if (!location.state?.data) {
      axios.get(`https://co-draw-backend.onrender.com/api/whiteboards/${boardId}`, { withCredentials: true })
        .then(res => {
          if (res.data?.data) setInitialData(res.data.data);
        })
        .catch(err => {
          if (err.response && (err.response.status === 403)) {
            alert('Access Denied. Redirecting to Home...');
            navigate('/');
          }else if(err.response && err.response.status === 404){
            console.warn('Whiteboard not found. Creating new one...');
            if (canvas) {
              const whiteboardData = JSON.stringify(canvas.toJSON());
              const previewImage = canvas.toDataURL('image/png');

              axios.post(
                "https://co-draw-backend.onrender.com/api/whiteboards/save",
                { boardId, data: whiteboardData, previewImage },
                { withCredentials: true }
              )
              .then(() => console.log("New whiteboard created and saved."))
              .catch(err => console.error("Failed to create new whiteboard on 404:", err));
            }
          } 
          else {
            console.error('Error fetching whiteboard:', err);
          }
          
        });
    } else {
      setInitialData(location.state.data);
    }
  }, [boardId, location.state?.data]);

  

  const emitCanvasData = () => {
    if (!isUpdatingFromSocketRef.current && canvas && socketRef.current) {
      const json = JSON.stringify(canvas.toJSON());
      socketRef.current.emit("canvas-data", { boardId, data: json });
      console.log("Change emitted")
    }
  };

  // Initialize canvas on mount
  useEffect(() => {
    if (canvasRef.current) {
      const initCanvas = new Canvas(canvasRef.current, {
        width: window.innerWidth,
        height: window.innerHeight,
        enableRetinaScaling: true
      });

      initCanvas.backgroundColor = '#fff';
      initCanvas.renderAll();
      setCanvas(initCanvas);
      return () => initCanvas.dispose();
    }
  }, []);

  useEffect(() => {
    if (!canvas) return;
  
    const emitOnAdd = () => {
      if (!isUpdatingFromSocketRef.current) emitCanvasData();
    };
  
    const emitOnModify = () => {
      if (!isUpdatingFromSocketRef.current) emitCanvasData();
    };
  
    canvas.on("object:added", emitOnAdd);
    canvas.on("object:modified", emitOnModify);
    canvas.on("object:removed", emitOnModify);
    canvas.on("path:created", emitOnAdd);
  
    return () => {
      canvas.off("object:added", emitOnAdd);
      canvas.off("object:modified", emitOnModify);
      canvas.off("object:removed", emitOnModify);
      canvas.off("path:created", emitOnAdd);
    };
  }, [canvas]);
  

  
  // Load existing whiteboard data into canvas
  useEffect(() => {
    if (canvas && initialData) {
      isUpdatingFromSocketRef.current = true;
      canvas.loadFromJSON(initialData, () => {
        canvas.renderAll();
        canvas.calcOffset();
        canvas.requestRenderAll();
        isUpdatingFromSocketRef.current = false;
      });
      socketRef.current.emit("join-board", {boardId, data: initialData, role: "host"});
    }
  }, [canvas, initialData]);

  useEffect(() => {
    if(!canvas) return;
    const socket = io("https://co-draw-backend.onrender.com"); // adjust backend URL if needed
    socketRef.current = socket;
  
    const handleCanvasUpdate = ({ boardId: incomingId, data }) => {
      if (incomingId === boardId && canvas) {
        isUpdatingFromSocketRef.current = true;
        canvas.loadFromJSON(data, () => {
          canvas.renderAll();
          isUpdatingFromSocketRef.current = false;
        });
      }
    };

    // Listen for updates
    socket.on("canvas-data", handleCanvasUpdate);
  
    return () => {
      socket.off("canvas-data", handleCanvasUpdate);
      socket.disconnect();
    };
  }, [boardId, canvas]);

  // Save canvas to backend
  const saveWhiteboard = async () => {
    if (!canvas) return;
    const whiteboardData = JSON.stringify(canvas.toJSON());
    const previewImage = canvas.toDataURL('image/png');

    try {
      await axios.post(
        "https://co-draw-backend.onrender.com/api/whiteboards/save",
        { boardId, data: whiteboardData, previewImage },
        { withCredentials: true }
      );
      alert("Whiteboard saved successfully!");
    } catch (error) {
      console.error("Error saving whiteboard:", error);
      alert("Failed to save whiteboard");
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (canvas) {
      const handleKeyDown = (event) => {
        if (event.key == "Delete" || event.keyCode == 46 && canvas.getActiveObjects().length > 0) {
          canvas.getActiveObjects().forEach(obj => canvas.remove(obj));
          canvas.discardActiveObject();
          canvas.renderAll();
        }
        if (event.key === "Escape") {
          disableFreeDraw();
          canvas.discardActiveObject();
          canvas.renderAll();
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [canvas]);

  // Drawing and shape tools
  const addCircle = () => {
    if (canvas) {
      disableFreeDraw();
      const cir = new Cir({ radius: 50, top: 250, left: 350, fill: "#000" });
      canvas.add(cir);
    }
  };

  const addRectangle = () => {
    if (canvas) {
      disableFreeDraw();
      const rect = new Rect({ top: 250, left: 350, width: 100, height: 100, fill: "#000" });
      canvas.add(rect);
    }
  };

  const addTextBox = () => {
    if (canvas) {
      disableFreeDraw();
      const tb = new Textbox("Enter Text", {
        top: 250,
        left: 350,
        width: 150,
        fontSize: 20,
        textAlign: 'center',
        fixedWidth: 150
      });

      canvas.on('text:changed', (opt) => {
        const t1 = opt.target;
        if (t1.width > t1.fixedWidth) {
          t1.fontSize *= t1.fixedWidth / (t1.width + 1);
          t1.width = t1.fixedWidth;
        }
      });

      canvas.add(tb);
    }
  };

  const enableFreeDraw = () => {
    if (canvas) {
      setFreeDrawingEnabled(true);
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new PencilBrush(canvas);
      canvas.freeDrawingBrush.color = '#000000';
      canvas.freeDrawingBrush.width = brushWidth;
    }
  };

  const disableFreeDraw = () => {
    if (canvas) {
      setFreeDrawingEnabled(false);
      canvas.isDrawingMode = false;
      canvas.selection = true;
      canvas.forEachObject((obj) => (obj.selectable = true));
    }
  };

  const updateBrushColor = (e) => {
    if (canvas) canvas.freeDrawingBrush.color = e.target.value;
  };

  const updateBrushWidth = (e) => {
    const newWidth = parseInt(e.target.value, 10) || 1;
    setBrushWidth(newWidth);
    if (canvas?.isDrawingMode) canvas.freeDrawingBrush.width = newWidth;
  };

  const clearCanvas = () => {
    if (canvas) {
      canvas.clear();
      canvas.backgroundColor = "#fff";
      canvas.renderAll();
    }
  };

  const exportCanvasAsImage = () => {
    if (!canvas) return;
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1.0 });
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `whiteboard-${boardId}.png`;
    link.click();
  };

  return (
    <div className="relative overflow-hidden">
      <div className="toolbar absolute top-[2%] z-[20] shadow-lg left-1/2 -translate-x-1/2 bg-gray-100 rounded-[10px] flex gap-5 px-3 py-3 justify-center  items-center">
        <button onClick={disableFreeDraw} className='cursor-pointer hover:bg-[#8f00ff]/80 hover:text-white p-1 rounded-[5px]' title='Move'><Move size={20} /></button>
        <button onClick={addRectangle} className='cursor-pointer hover:bg-[#8f00ff]/80 hover:text-white p-1 rounded-[5px]' title='Square'><Square size={20} /></button>
        <button onClick={addCircle} className='cursor-pointer hover:bg-[#8f00ff]/80 hover:text-white p-1 rounded-[5px]' title='Circle'><Circle size={20} /></button>
        <button onClick={addTextBox} className='cursor-pointer hover:bg-[#8f00ff]/80 hover:text-white p-1 rounded-[5px]' title='TextBox'><Type size={20} /></button>
        <button onClick={enableFreeDraw} className='cursor-pointer hover:bg-[#8f00ff]/80 hover:text-white p-1 rounded-[5px]' title='Free Draw'><Pencil size={20} /></button>

        {freeDrawingEnabled && (
          <div className='flex items-center gap-2 bg-gray-100 px-[10px] py-[6px] font-mono rounded-[10px] text-sm'>
            <input type="color" onChange={updateBrushColor} />
            <label className='flex items-center gap-1'>
              Width:
              <input type="number" min="1" max="50" value={brushWidth} className='pl-1 border border-gray-300' onChange={updateBrushWidth} />
            </label>
          </div>
        )}

        <button onClick={clearCanvas} className='cursor-pointer bg-gray-100 hover:bg-[#8f00ff]/80 hover:text-white flex items-center gap-2 p-[10px] text-nowrap font-mono rounded-[10px] text-sm'>
          <Trash2 size={15} /> clear canvas
        </button>

        <div className='h-[40px] w-[2px] bg-gray-200 block'></div>

        <button onClick={saveWhiteboard} className='cursor-pointer hover:bg-[#8f00ff]/80 hover:text-white p-1 rounded-[5px]' title='Save Whiteboard'><Save size={20} /></button>
        <button onClick={exportCanvasAsImage} className='cursor-pointer bg-white hover:bg-[#8f00ff]/80 hover:text-white flex items-center gap-2 p-[10px] font-mono text-nowrap rounded-[10px] text-sm'>
          <Download size={20} /> Export as PNG
        </button>
        <div className='bg-white  flex items-center font-mono gap-2 rounded-[10px] py-[5px] px-[8px]'>
          <h1 className='text-nowrap'>Join Code:</h1> 
          <div 
            className='cursor-pointer w-full bg-gray-100 hover:bg-[#8f00ff]/80 hover:text-white flex items-center gap-2 p-[5px] font-mono rounded-[5px] text-sm' 
            onClick={() => {
              const joinCode = boardId.slice(-6);
              navigator.clipboard.writeText(joinCode)
                .then(() => {
                  alert('Copied to Clipboard');
                })
                .catch(err => {
                  console.error('Failed to copy:', err);
                });
            }}
          >
            {boardId.slice(-6)} <Copy size={15}/>
          </div>
        </div>
        <GroupVoiceChat boardId={boardId}/>
      </div>

      <Settings canvas={canvas} />
      <div className='flex'>
        <canvas id="canvas" ref={canvasRef}></canvas>
      </div>
      
    </div>
  );
};

export default Whiteboard;