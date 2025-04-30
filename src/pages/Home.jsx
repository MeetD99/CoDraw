import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Trash, Trash2 } from "lucide-react";

const Home = () => {
    const navigate = useNavigate();
    const [whiteboards, setWhiteboards] = useState([]);
    const [joinCode, setJoinCode] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        
        setLoading(true);
        axios.get("https://codraw-backend-hd97.onrender.com/api/whiteboards", {
            withCredentials: true // include the cookie
        })
        .then(res => {
            setWhiteboards(res.data);
            setLoading(false);
            console.log("Whiteboards fetched:", res.data);
        })
        .catch(err => {
            console.error("Error fetching whiteboards:", err);
        });
    }, []);

    const createWhiteboard = () => {
        const boardId = crypto.randomUUID();
        navigate(`/board/${boardId}`);
    };

    const handleJoinWhiteboard = () => {
        if (joinCode.trim()) {
            navigate(`/viewBoard/${joinCode.trim()}`);
        }
    };

    return (
        <div className="min-h-screen flex flex-col gap-4 p-5 bg-white">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl uppercase font-mono font-bold">Your Whiteboards</h1>
                <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Enter Join Code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="border border-black rounded px-3 py-2 w-full max-w-sm"
                />
                <button
                    onClick={handleJoinWhiteboard}
                    className="bg-black cursor-pointer text-nowrap text-white px-4 py-2 rounded"
                >
                    Join a Whiteboard!
                </button>
            </div>
                <button onClick={createWhiteboard} className="bg-black text-white px-4 py-2 rounded cursor-pointer">Create Whiteboard</button>
            </div>

            
            {loading && <p>Loading....</p>}
            <div className="mt-5">
                {!loading && whiteboards.length === 0 ? (
                    <p>No whiteboards yet</p>
                ) : (
                    <div className="flex gap-3 flex-wrap">
                        {whiteboards.map(board => (
                            <div key={board._id} className="p-3 group cursor-pointer bg-black hover:bg-gray-800 rounded-md flex flex-col gap-2 relative" onClick={() => navigate(`/board/${board._id}`, { state: { data: board.data } })}>
                                <img src={board.previewImage} alt="" width={300}/>
                                <p className="font-mono text-white">Board {board._id.slice(-6)} (Created on {new Date(board.createdAt).toLocaleDateString()})</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
