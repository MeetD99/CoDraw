import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Home = () => {
    const navigate = useNavigate();
    const [whiteboards, setWhiteboards] = useState([]);
    const [joinCode, setJoinCode] = useState("");

    useEffect(() => {
        axios.get("http://localhost:5000/api/whiteboards", {
            withCredentials: true // include the cookie
        })
        .then(res => {
            setWhiteboards(res.data);
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
        <div className="min-h-screen flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl">Your Whiteboards</h1>
                <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Enter join code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="border border-gray-400 rounded px-3 py-2 w-full max-w-sm"
                />
                <button
                    onClick={handleJoinWhiteboard}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                >
                    Join
                </button>
            </div>
                <button onClick={createWhiteboard} className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer">Create Whiteboard</button>
            </div>

            
            
            <div className="mt-5">
                {whiteboards.length === 0 ? (
                    <p>No whiteboards yet</p>
                ) : (
                    <div className="flex gap-2 flex-wrap">
                        {whiteboards.map(board => (
                            <div key={board._id} className="p-2 cursor-pointer bg-gray-400" onClick={() => navigate(`/board/${board._id}`, { state: { data: board.data } })}>
                                <img src={board.previewImage} alt="" width={300}/>
                                <p>Whiteboard {board._id.slice(-6)} (Created on {new Date(board.createdAt).toLocaleDateString()})</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;
