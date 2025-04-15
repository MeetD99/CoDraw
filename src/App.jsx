import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Login from './pages/Login'
import Register from './pages/Register'
import Whiteboard from "./components/Whiteboard";
import MainLayout from "./layouts/MainLayout";
import AuthLayout from "./layouts/AuthLayout";
import ViewWhiteboard from './components/ViewWhiteboard';

const App = () => {
    return (
        <Router>
            <Routes>
                <Route element={<MainLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/board/:boardId" element={<Whiteboard />} />
                    <Route path="/viewBoard/:boardId" element={<ViewWhiteboard />} />
                </Route>

                {/* Routes without Navbar & Footer */}
                <Route element={<AuthLayout />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                </Route>
            </Routes>
        </Router>
    );
};

export default App;
