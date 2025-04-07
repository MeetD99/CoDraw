import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const Navbar = () => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await axios.get("https://co-draw-backend.vercel.app/api/auth/me", {
                    withCredentials: true,
                });
                // console.log(response.data.user)
                setUser(response.data.user);
            } catch (error) {
                setUser(null);
            }
        };
        fetchUser();
    }, []);

    const handleLogout = async () => {
        try {
            await axios.post("https://co-draw-backend.vercel.app/api/auth/logout", {}, { withCredentials: true });
            setUser(null);
            navigate("/login");
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <nav className="flex items-center justify-between p-3 bg-blue-500 text-white">
            <Link to="/"><h2 className="text-[2vw] cursor-pointer">Collaborative Whiteboard</h2></Link>
            <div>
                {user ? (
                    <div className="flex items-center gap-4">
                        <span>Welcome, {user.name}!</span>
                        <button onClick={handleLogout} className="bg-red-500 px-3 py-1 rounded cursor-pointer">
                            Logout
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <Link to="/login" className="bg-green-500 px-3 py-1 rounded">Login</Link>
                        <Link to="/register" className="bg-yellow-500 px-3 py-1 rounded">Sign Up</Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
