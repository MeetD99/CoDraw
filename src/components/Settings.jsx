import React, { useEffect, useState } from "react";

const fontList = [
    "Arial", "Verdana", "Times New Roman", "Courier New", "Georgia", "Comic Sans MS", "Impact", "Tahoma", "Trebuchet MS"
];

const Settings = ({ canvas }) => {
    const [selectedObject, setSelectedObject] = useState(null);
    const [width, setWidth] = useState("");
    const [height, setHeight] = useState("");
    const [diameter, setDiameter] = useState("");
    const [color, setColor] = useState("");
    const [strokeWidth, setStrokeWidth] = useState("");
    const [font, setFont] = useState("Arial");
    const [fontSize, setFontSize] = useState(16);
    const [textColor, setTextColor] = useState("#000000");
    const [opacity, setOpacity] = useState(100);

    useEffect(() => {
        if (canvas) {
            canvas.on("selection:created", (event) => {
                handleObjectSelection(event.selected[0]);
            });
            canvas.on("selection:updated", (event) => {
                handleObjectSelection(event.selected[0]);
            });
            canvas.on("selection:cleared", () => {
                setSelectedObject(null);
                clearSettings();
            });
            canvas.on("object:modified", (event) => {
                handleObjectSelection(event.target);
            });
            canvas.on("object:scaling", (event) => {
                handleObjectSelection(event.target);
            });
        }
    }, [canvas]);

    const handleObjectSelection = (object) => {
        if (!object) return;
        setSelectedObject(object);
        setOpacity((object.opacity || 1) * 100);

        if (object.type === "rect") {
            setWidth(Math.round(object.width * object.scaleX));
            setHeight(Math.round(object.height * object.scaleY));
            setColor(object.fill);
            setDiameter("");
            setStrokeWidth("");
        } else if (object.type === "circle") {
            setDiameter(Math.round(object.radius * 2 * object.scaleX));
            setColor(object.fill);
            setWidth("");
            setHeight("");
            setStrokeWidth("");
        } else if (object.type === "path") {
            setColor(object.fill);
            setStrokeWidth(object.strokeWidth);
            setWidth("");
            setHeight("");
            setDiameter("");
        } else if (object.type === "textbox") {
            setFont(object.fontFamily || "Arial");
            setFontSize(object.fontSize || 16);
            setTextColor(object.fill || "#000000");
        }
    };

    const clearSettings = () => {
        setWidth("");
        setHeight("");
        setColor("");
        setDiameter("");
        setStrokeWidth("");
        setFont("Arial");
        setFontSize(16);
        setTextColor("#000000");
        setOpacity(100);
    };

    const handleWidthChange = (e) => {
        const value = e.target.value.replace(/,/g, "");
        const intValue = parseInt(value, 10);

        setWidth(intValue);

        if (selectedObject && selectedObject.type === "rect" && intValue >= 0) {
            selectedObject.set({ width: intValue / selectedObject.scaleX });
            canvas.renderAll();
        }
    }

    const handleHeightChange = (e) => {
        const value = e.target.value.replace(/,/g, "");
        const intValue = parseInt(value, 10);

        setHeight(intValue);

        if (selectedObject && selectedObject.type === "rect" && intValue >= 0) {
            selectedObject.set({ height: intValue / selectedObject.scaleY });
            canvas.renderAll();
        }
    }

    const handleDiameterChange = (e) => {
        const value = e.target.value.replace(/,/g, "");
        const intValue = parseInt(value, 10);

        setDiameter(intValue);

        if (selectedObject && selectedObject.type === "circle" && intValue >= 0) {
            selectedObject.set({ radius: intValue / 2 / selectedObject.scaleX });
            canvas.renderAll();
        }
    }

    const handleColorChange = (e) => {
        const value = e.target.value;
        setColor(value);

        if (selectedObject) {
            selectedObject.set({ fill: value });
            canvas.renderAll();
        }
    }

    const handleStrokeColor = (e) => {
        const value = e.target.value;
        setColor(value);

        if (selectedObject) {
            selectedObject.set({ stroke: color });
            canvas.renderAll();
        }
    }

    const handleStrokeWidthChange = (e) => {
        const value = e.target.value.replace(/,/g, "");
        const intValue = parseInt(value, 10);

        setStrokeWidth(intValue);

        if (selectedObject && selectedObject.type === "path" && intValue >= 0) {
            selectedObject.set({ strokeWidth: intValue });
            canvas.renderAll();
        }
    }

    const handleFontChange = (e) => {
        const selectedFont = e.target.value;
        setFont(selectedFont);
        if (selectedObject && selectedObject.type === "textbox") {
            selectedObject.set({ fontFamily: selectedFont });
            canvas.renderAll();
        }
    };

    const handleFontSizeChange = (e) => {
        const value = parseInt(e.target.value, 10);
        setFontSize(value);
        if (selectedObject && selectedObject.type === "textbox" && value > 0) {
            selectedObject.set({ fontSize: value });
            canvas.renderAll();
        }
    };

    const handleTextColorChange = (e) => {
        const value = e.target.value;
        setTextColor(value);
        if (selectedObject && selectedObject.type === "textbox") {
            selectedObject.set({ fill: value });
            canvas.renderAll();
        }
    };

    const handleOpacityChange = (e) => {
        const value = parseInt(e.target.value, 10);
        setOpacity(value);
        if (selectedObject) {
            selectedObject.set({ opacity: value / 100 }); // Convert back to 0-1 range
            canvas.renderAll();
        }
    };

    return (
        <>
        {selectedObject && (<div className="settings bg-gray-100 rounded-[10px] z-[20] p-5 absolute top-1/3 left-[2%] shadow-lg flex flex-col gap-5 -translate-y-1/3">
            {selectedObject.type === "rect" && (
                <div className="max-w-[200px]">
                    <div className="flex flex-col gap-2">
                        <label className="text-black text-sm">Opacity:</label>
                        <div className="flex gap-2 items-center">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                className="max-w-[150px]"
                                value={opacity}
                                onChange={handleOpacityChange}
                                
                            />
                            <span>{opacity}%</span>
                        </div>
                        
                    </div>
                    
                        <label className="text-black text-sm">Width:</label>
                        <input type="text" value={width} onChange={handleWidthChange} className="border-1 border-gray-300 pl-2"/>
                        <label className="text-black text-sm">Height:</label>
                        <input type="text" value={height} onChange={handleHeightChange} className="border-1 border-gray-300 pl-2"/>
                        <label className="text-black text-sm">Color:</label>
                        <input type="color" value={color} onChange={handleColorChange} className="block"/>
                </div>
            )}
            { selectedObject.type === "circle" && (
                <div className="max-w-[200px]">
                    <div className="flex flex-col gap-2">
                        <label className="text-black text-sm">Opacity:</label>
                        <div className="flex gap-2 items-center">
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={opacity}
                            className="max-w-[150px]"
                            onChange={handleOpacityChange}
                        />
                        <span>{opacity}%</span>
                        </div>
                    </div>
                        <label className="text-black text-sm">Diameter:</label>
                        <input type="text" value={diameter} onChange={handleDiameterChange} className="border-1 border-gray-300 pl-2"/>
                        <label className="text-black text-sm">Color:</label>
                        <input type="color" value={color} onChange={handleColorChange} className="block"/>
                </div>
            )}
            { selectedObject.type === "path" && (
                <div className="max-w-[200px]">
                    <div className="flex flex-col gap-2">
                        <label className="text-black text-sm">Opacity:</label>
                        <div className="flex gap-2 items-center">
                        <input
                            type="range"
                            min="0"
                            max="100"
                            className="max-w-[150px]"
                            value={opacity}
                            onChange={handleOpacityChange}
                        />
                        <span>{opacity}%</span>
                        </div>
                    </div>
                        <label className="text-black text-sm">Color:</label>
                        <input type="color" value={color} onChange={handleStrokeColor} className="block"/>
                        <label className="text-black text-sm">Stroke Width:</label>
                        <input type="text" value={strokeWidth} onChange={handleStrokeWidthChange} className="border-1 border-gray-300 pl-2"/>
                </div>
            )}
            { selectedObject.type === "textbox" && (
                <div className="max-w-[200px]">
                    <div className="flex flex-col gap-2">
                        <label className="text-black text-sm">Opacity:</label>
                        <div className="flex gap-2 items-center">
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={opacity}
                            className="max-w-[150px]"
                            onChange={handleOpacityChange}
                        />
                        <span>{opacity}%</span>
                        </div>
                    </div>
                        <label className="text-black text-sm">Font:</label>
                        <select value={font} onChange={handleFontChange} className="border-1 border-gray-300 block">
                            {fontList.map((f) => (
                                <option key={f} value={f}>{f}</option>
                            ))}
                        </select>
                        <label className="text-black text-sm">Font Size:</label>
                        <input type="number" value={fontSize} onChange={handleFontSizeChange} className="border-1 border-gray-300 pl-2"/>
                        <label className="text-black text-sm">Text Color:</label> 
                        <input type="color" value={textColor} onChange={handleTextColorChange} className="block"/>
                </div>
            )}
        </div>)}
        </>
    );
};

export default Settings;
