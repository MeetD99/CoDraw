import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const Navbar = () => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await axios.get("https://codraw-backend-hd97.onrender.com/api/auth/me", {
                    withCredentials: true,
                });
                setUser(response.data.user);
            } catch (error) {
                setUser(null);
                navigate('/login')
            }
        };
        fetchUser();
    }, []);

    const handleLogout = async () => {
        try {
            await axios.post("https://codraw-backend-hd97.onrender.com/api/auth/logout", {}, { withCredentials: true });
            setUser(null);
            navigate("/login");
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <nav className="flex items-center p-3 justify-between bg-gray-200 border-b-2 border-gray-600">
            <Link to="/"><img src="/logo.png" alt=""  width={150}/></Link>
            <div>
                {user ? (
                    <div className="flex items-center gap-4 text-xl font-mono">
                        <span>Welcome, {user.name}!</span>
                        <button onClick={handleLogout} className="bg-[#8f00ff] text-white px-3 py-1 rounded cursor-pointer">
                            Logout
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <Link to="/login" className="bg-[#8f00ff] text-white px-3 py-1 rounded">Login</Link>
                        <Link to="/register" className="bg-[#8f00ff] text-white px-3 py-1 rounded">Sign Up</Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
