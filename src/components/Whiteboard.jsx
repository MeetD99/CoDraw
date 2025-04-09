import React, { useRef, useState, useEffect } from 'react';
import { Canvas, PencilBrush, Textbox, Rect, Circle as Cir } from 'fabric';
import { Square, Circle, Type, Move, Pencil, Trash2, Save, Download } from 'lucide-react';
import Settings from './Settings';
import axios from "axios";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import io from "socket.io-client";

const Whiteboard = () => {
  const { boardId } = useParams();
  const canvasRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [brushWidth, setBrushWidth] = useState(5);
  const [freeDrawingEnabled, setFreeDrawingEnabled] = useState(false);
  const [initialData, setInitialData] = useState(null);
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const location = useLocation();
  const isUpdatingFromSocketRef = useRef(false);
  const [copiedObjects, setCopiedObjects] = useState(null);
  

  // Load initial whiteboard data
  useEffect(() => {
    if (!location.state?.data) {
      axios.get(`https://co-draw-backend.onrender.com/api/whiteboards/${boardId}`, { withCredentials: true })
        .then(res => {
          if (res.data?.data) setInitialData(res.data.data);
        })
        .catch(err => {
          if (err.response && (err.response.status === 403 || err.response.status === 404)) {
            alert('Access Denied. Redirecting to Home...');
            navigate('/');
          } else {
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
        width: 1000,
        height: 600,
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
        const activeObjects = canvas.getActiveObjects();
        if ((event.ctrlKey || event.metaKey) && event.key === 'c' && activeObjects.length > 0) {
          const clonedObjects = [];
          activeObjects.forEach((obj) => {
            obj.clone((cloned) => {
              if (cloned && typeof cloned === 'object') {
                clonedObjects.push(cloned);
                if (clonedObjects.length === activeObjects.length) {
                  setCopiedObjects(clonedObjects);
                }
              }
            });
          });
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'v' && copiedObjects?.length > 0) {
          // Paste
          copiedObjects.forEach((cloned) => {
            cloned.clone((newObj) => {
              newObj.set({
                left: newObj.left + 20,
                top: newObj.top + 20,
                evented: true,
              });
              canvas.add(newObj);
            });
          });
          canvas.requestRenderAll();
        }

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
    <div className="flex flex-col gap-5 items-center bg-gray-400 py-5">
      <div className="toolbar bg-white rounded-[10px] flex gap-5 px-3 py-3 justify-center w-fit items-center">
        <button onClick={disableFreeDraw} className='cursor-pointer hover:bg-blue-200 p-1 rounded-[5px]' title='Move'><Move size={20} /></button>
        <button onClick={addRectangle} className='cursor-pointer hover:bg-blue-200 p-1 rounded-[5px]' title='Square'><Square size={20} /></button>
        <button onClick={addCircle} className='cursor-pointer hover:bg-blue-200 p-1 rounded-[5px]' title='Circle'><Circle size={20} /></button>
        <button onClick={addTextBox} className='cursor-pointer hover:bg-blue-200 p-1 rounded-[5px]' title='TextBox'><Type size={20} /></button>
        <button onClick={enableFreeDraw} className='cursor-pointer hover:bg-blue-200 p-1 rounded-[5px]' title='Free Draw'><Pencil size={20} /></button>

        {freeDrawingEnabled && (
          <div className='flex items-center gap-2 bg-gray-100 px-[10px] py-[6px] font-mono rounded-[10px] text-sm'>
            <input type="color" onChange={updateBrushColor} />
            <label className='flex items-center gap-1'>
              Width:
              <input type="number" min="1" max="50" value={brushWidth} className='pl-1 border border-gray-300' onChange={updateBrushWidth} />
            </label>
          </div>
        )}

        <button onClick={clearCanvas} className='cursor-pointer bg-gray-100 hover:bg-blue-100 flex items-center gap-2 p-[10px] font-mono rounded-[10px] text-sm'>
          <Trash2 size={15} /> clear canvas
        </button>

        <div className='h-[40px] w-[2px] bg-gray-200 block'></div>

        <button onClick={saveWhiteboard} className='cursor-pointer hover:bg-blue-200 p-1 rounded-[5px]' title='Save Whiteboard'><Save size={20} /></button>
        <button onClick={exportCanvasAsImage} className='cursor-pointer bg-gray-100 hover:bg-blue-100 flex items-center gap-2 p-[10px] font-mono rounded-[10px] text-sm'>
          <Download size={20} /> Export as PNG
        </button>
      </div>

      <Settings canvas={canvas} />
      <div className='flex'>
        <canvas id="canvas" ref={canvasRef}></canvas>
      </div>
    </div>
  );
};

export default Whiteboard;