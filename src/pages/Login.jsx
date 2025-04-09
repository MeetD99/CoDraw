import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
        <div className="flex flex-col items-center mt-10">
            <h2 className="text-2xl">Login</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-80 mt-4">
                <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    className="p-2 border rounded"
                    required
                />
                <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    className="p-2 border rounded"
                    required
                />
                {error && <p className="text-red-500">{error}</p>}
                <button type="submit" className="bg-blue-500 text-white p-2 rounded cursor-pointer flex items-center gap-2">Login {loading && <Loader size={15}/>}</button>
            </form>
        </div>
    );
};

export default Login;
