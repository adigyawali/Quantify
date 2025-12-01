// App.js
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import Home from "./pages/Home/home";
import Login from "./pages/Login/login";
import Dashboard from "./pages/Dashboard/dashboard";
import Signup from "./pages/Login/signup";
import Sidebar from "./components/sidebar";
import "./index.css";
import { Menu } from "lucide-react"; 

function AppContent() {
    const location = useLocation();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Restore auth state on page load so refreshes keep the user logged in
    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("username");

        if (storedToken && storedUser) {
            setIsLoggedIn(true);
            setUsername(storedUser);
        }
    }, []);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <>
            <header className="app-header">
                <div className="logo-area">
                    <Link to="/" id="homePageLogo">Quantify</Link>
                </div>

                {/* Show Login/Signup only when not logged in and on home page */}
                {location.pathname === "/" && !isLoggedIn && (
                    <div className="auth-area">
                        <Link to="/login" id="login">Login/Signup</Link>
                    </div>
                )}

                {/* Show hamburger menu when logged in */}
                {isLoggedIn && (
                    <div className="menu-area">
                        <button 
                            className="hamburger-button" 
                            onClick={toggleSidebar}
                            aria-label="Open menu"
                        >
                            <Menu size={24} />
                        </button>
                    </div>
                )}
            </header>

            {/* Sidebar */}
            <Sidebar 
                isOpen={sidebarOpen} 
                onClose={() => setSidebarOpen(false)}
                username={username}
                onLogout={() => {
                    setIsLoggedIn(false);
                    setUsername("");
                    setSidebarOpen(false);
                    localStorage.removeItem("token");
                    localStorage.removeItem("username");
                }}
            />

            <Routes>
                <Route path="/" element={<Home />} />
                <Route 
                    path="/login" 
                    element={
                        <Login 
                            onLogin={(user) => {
                                setIsLoggedIn(true);
                                setUsername(user);
                            }} 
                        />
                    } 
                />
                <Route path="/signup" element={<Signup />} />
                <Route 
                    path="/dashboard" 
                    element={
                        <Dashboard 
                            username={username}
                        />
                    } 
                />
            </Routes>
        </>
    );
}

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;
