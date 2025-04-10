import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Loader } from 'lucide-react'

const Login = () => {
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            await axios.post("https://co-draw-backend.onrender.com/api/auth/login", formData, { withCredentials: true });
            navigate("/");
        } catch (error) {
            setError(error.response?.data?.message || "Login failed");
        }
    };

    return (
        <div className="flex h-screen">
            <div className="flex-3 bg-[#6f00c4] flex items-center justify-center overflow-hidden">
                <img src="/login-bg.png" alt="" width={800}/>
            </div>
            <div className="flex-2 font-mono font-bold flex flex-col bg-gray-200 text-black items-center justify-center">
                <h2 className="text-[4vw]">&lt;Login/&gt;</h2>
                <form onSubmit={handleSubmit} className="flex font-mono flex-col gap-3 mt-5">
                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        className="p-4 w-[450px] border rounded text-2xl"
                        required
                    />
                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        className="p-4 w-[450px] border rounded text-2xl"
                        required
                    />
                    {error && <p className="text-red-500">{error}</p>}
                    <button type="submit" className="bg-[#8f00ff] text-white text-2xl p-2 text-center rounded-[10px] cursor-pointer flex items-center justify-center gap-2">Login {loading && <Loader size={15}/>}</button>
                    <p>Don't have an account? <Link to={'/register'} className="underline">Register</Link></p>
                </form>
            </div>
            
        </div>
    );
};

export default Login;
