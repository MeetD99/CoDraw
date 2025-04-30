import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, PencilBrush, Textbox, Rect, Circle as Cir } from 'fabric';
import { Square, Circle, Type, Move, Pencil, Trash2, Save, Download, Copy } from 'lucide-react';
import Settings from './Settings';
import axios from "axios";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import GroupVoiceChat from './GroupVoiceChat';
import debounce from 'lodash.debounce';

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
  const [lastSaved, setLastSaved] = useState(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [cloudStatus, setCloudStatus] = useState({
    lastSaved: null,
    isAutoSaving: false,
    operation: null,
    documentSize: 0
  });
  const [cloudMetrics, setCloudMetrics] = useState({
    region: '',
    saveCount: 0,
    lastSave: null,
    dataSize: '0 KB',
    backupStatus: '',
    processingNode: 0,
    latency: '0ms',
    throughput: '0 KB/s',
    cpuUtilization: '0%',
    memoryUsage: '0%',
    activeConnections: 0,
    replicationStatus: '',
    infrastructure: {
      processingNodes: 0,
      loadBalancerStatus: '',
      replicationFactor: 0
    }
  });
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');

  // Load initial whiteboard data
  useEffect(() => {
    if (!location.state?.data) {
      axios.get(`https://codraw-backend-hd97.onrender.com/api/whiteboards/${boardId}`, { withCredentials: true })
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
                "https://codraw-backend-hd97.onrender.com/api/whiteboards/save",
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
    const socket = io("https://codraw-backend-hd97.onrender.com"); // adjust backend URL if needed
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
        "https://codraw-backend-hd97.onrender.com/api/whiteboards/save",
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

  // Auto-save function using existing backend endpoint
  const autoSave = useCallback(
    debounce(async () => {
      if (!canvas || cloudStatus.isAutoSaving) return;

      try {
        setCloudStatus(prev => ({ ...prev, isAutoSaving: true }));
        const whiteboardData = JSON.stringify(canvas.toJSON());
        const previewImage = canvas.toDataURL('image/png');

        const response = await axios.post(
          "https://codraw-backend-hd97.onrender.com/api/whiteboards/save",
          { boardId, data: whiteboardData, previewImage },
          { withCredentials: true }
        );

        setCloudStatus({
          lastSaved: new Date(),
          isAutoSaving: false,
          operation: 'update',
          documentSize: whiteboardData.length
        });

        console.log("Cloud auto-save successful:", response.data);
      } catch (error) {
        console.error("Cloud auto-save failed:", error);
        setCloudStatus(prev => ({ ...prev, isAutoSaving: false }));
      }
    }, 180000), // 3 minutes
    [canvas, boardId]
  );

  // Set up auto-save triggers
  useEffect(() => {
    if (!canvas) return;

    const emitOnAdd = () => {
      if (!isUpdatingFromSocketRef.current) {
        emitCanvasData();
        autoSave();
      }
    };

    const emitOnModify = () => {
      if (!isUpdatingFromSocketRef.current) {
        emitCanvasData();
        autoSave();
      }
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
      autoSave.cancel(); // Cancel any pending auto-saves
    };
  }, [canvas, autoSave]);

  const handleAutoSave = async () => {
    if (!boardId || !user) return;

    try {
      setAutoSaveStatus('saving');
      const response = await fetch(`${API_URL}/whiteboard/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          boardId,
          data: canvasData,
          previewImage: canvasRef.current.toDataURL('image/jpeg', 0.5)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCloudMetrics(data.cloudMetrics);
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      } else {
        setAutoSaveStatus('error');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      setAutoSaveStatus('error');
      setTimeout(() => setAutoSaveStatus('idle'), 2000);
    }
  };

  return (
    <div className="relative overflow-hidden">
      <div className="toolbar absolute top-[2%] z-[20] shadow-lg left-1/2 -translate-x-1/2 bg-gray-100 rounded-[10px] flex gap-5 px-3 py-3 justify-center items-center">
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

        {/* Enhanced Cloud Status Indicator */}
        <div className="cloud-status bg-white hover:bg-[#8f00ff]/10 transition-all duration-300 flex items-center gap-2 px-4 py-2 rounded-[10px] shadow-sm border border-gray-200">
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${cloudStatus.isAutoSaving ? 'bg-[#8f00ff]/80 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-sm font-mono text-gray-700">
                {cloudStatus.isAutoSaving ? 'Auto-saving...' : 'Cloud Connected'}
              </span>
            </div>
            {cloudStatus.lastSaved && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  Last saved: {new Date(cloudStatus.lastSaved).toLocaleTimeString()}
                </span>
                {cloudStatus.operation && (
                  <span className="text-xs text-[#8f00ff]/80 font-mono">
                    ({cloudStatus.operation})
                  </span>
                )}
              </div>
            )}
            {cloudStatus.documentSize > 0 && (
              <div className="text-xs text-gray-500 font-mono">
                Size: {(cloudStatus.documentSize / 1024).toFixed(2)} KB
              </div>
            )}
          </div>
        </div>
      </div>

      <Settings canvas={canvas} />
      <div className='flex'>
        <canvas id="canvas" ref={canvasRef}></canvas>
      </div>
      
      <div className="cloud-status-container">
        <div className="cloud-status-header">
          <div className="status-indicator">
            <div className={`status-dot ${autoSaveStatus}`} />
            <span className="status-text">
              {autoSaveStatus === 'saving' ? 'Processing in Cloud...' : 
               autoSaveStatus === 'saved' ? 'Cloud Sync Complete' : 
               autoSaveStatus === 'error' ? 'Cloud Error' : 'Cloud Connected'}
            </span>
          </div>
          <div className="region-info">
            <span className="region-label">Cloud Region:</span>
            <span className="region-value">{cloudMetrics.region}</span>
          </div>
        </div>

        <div className="cloud-metrics-grid">
          <div className="metric-section">
            <h3 className="section-title">Performance</h3>
            <div className="metric-item">
              <span className="metric-label">Processing Node:</span>
              <span className="metric-value">Node {cloudMetrics.processingNode}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Latency:</span>
              <span className="metric-value">{cloudMetrics.latency}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Throughput:</span>
              <span className="metric-value">{cloudMetrics.throughput}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">CPU Usage:</span>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: cloudMetrics.cpuUtilization }}
                />
                <span className="progress-text">{cloudMetrics.cpuUtilization}</span>
              </div>
            </div>
            <div className="metric-item">
              <span className="metric-label">Memory Usage:</span>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: cloudMetrics.memoryUsage }}
                />
                <span className="progress-text">{cloudMetrics.memoryUsage}</span>
              </div>
            </div>
          </div>

          <div className="metric-section">
            <h3 className="section-title">Infrastructure</h3>
            <div className="metric-item">
              <span className="metric-label">Active Nodes:</span>
              <span className="metric-value">{cloudMetrics.infrastructure.processingNodes}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Load Balancer:</span>
              <span className={`metric-value ${cloudMetrics.infrastructure.loadBalancerStatus.toLowerCase()}`}>
                {cloudMetrics.infrastructure.loadBalancerStatus}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Replication:</span>
              <span className="metric-value">x{cloudMetrics.infrastructure.replicationFactor}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Active Connections:</span>
              <span className="metric-value">{cloudMetrics.activeConnections}</span>
            </div>
          </div>

          <div className="metric-section">
            <h3 className="section-title">Data</h3>
            <div className="metric-item">
              <span className="metric-label">Total Saves:</span>
              <span className="metric-value">{cloudMetrics.saveCount}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Data Size:</span>
              <span className="metric-value">{cloudMetrics.dataSize}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Last Save:</span>
              <span className="metric-value">
                {cloudMetrics.lastSave ? new Date(cloudMetrics.lastSave).toLocaleTimeString() : 'Never'}
              </span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Backup Status:</span>
              <span className={`metric-value ${cloudMetrics.backupStatus.toLowerCase()}`}>
                {cloudMetrics.backupStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .cloud-status-container {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(0, 0, 0, 0.1);
          max-width: 400px;
          font-family: 'Inter', sans-serif;
        }

        .cloud-status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
        }

        .status-indicator {
          display: flex;
          align-items: center;
        }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-right: 8px;
        }

        .status-dot.idle {
          background-color: #4CAF50;
          box-shadow: 0 0 8px rgba(76, 175, 80, 0.5);
        }

        .status-dot.saving {
          background-color: #FFC107;
          animation: pulse 1s infinite;
        }

        .status-dot.saved {
          background-color: #4CAF50;
          animation: pulse 1s;
        }

        .status-dot.error {
          background-color: #F44336;
          box-shadow: 0 0 8px rgba(244, 67, 54, 0.5);
        }

        .status-text {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }

        .region-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .region-label {
          font-size: 12px;
          color: #666;
        }

        .region-value {
          font-size: 12px;
          font-weight: 500;
          color: #333;
        }

        .cloud-metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        .metric-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .section-title {
          font-size: 12px;
          font-weight: 600;
          color: #333;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metric-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .metric-label {
          font-size: 11px;
          color: #666;
        }

        .metric-value {
          font-size: 12px;
          font-weight: 500;
          color: #333;
        }

        .metric-value.active {
          color: #4CAF50;
        }

        .metric-value.inactive {
          color: #F44336;
        }

        .progress-bar {
          width: 100%;
          height: 6px;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 3px;
          overflow: hidden;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4CAF50, #8BC34A);
          transition: width 0.3s ease;
        }

        .progress-text {
          position: absolute;
          right: 4px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 10px;
          color: #333;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Whiteboard;