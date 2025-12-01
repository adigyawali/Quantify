import React, { useState } from "react";
import "./login.css";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";


function Login({ onLogin }) {
    const [username, setUsername] = useState("");
    const [usernameGiven, setUsernameGiven] = useState(false);
    const [password, setPassword] = useState("");
    const [passwordGiven, setPasswordGiven] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [invalidLogin, setInvalidLogin] = useState(false);
    const navigate = useNavigate();

    // Log the user in
    const handleLogin = (e) => {
        if (usernameGiven === true && passwordGiven === true) {
            e.preventDefault();

            axios
                .post("http://127.0.0.1:5000/login",
                    { username, password })
                .then((response) => {
                    let token = response.data.token;

                    // Save the item to local storage
                    localStorage.setItem("token", token);
                    localStorage.setItem("username", username);

                    // Update auth state in the parent only after successful login
                    onLogin(username);
                    setInvalidLogin(false);

                    //Redirect Back home
                    console.log("User logged in successfully");
                    navigate("/"); // Redirect to home page after login

                })
                .catch((err) => {
                    setInvalidLogin(true);
                });

        } else {
            console.log("Please enter both username and password");
        }
    };

    
    // Actual Page
    return (
        <div className="loginContainer">
            <h1>Login</h1>

            <div id="loginBubble">

                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => {
                        setUsernameGiven(true);
                        setUsername(e.target.value);
                    }}
                    className="userInfo"
                />

                {/*Original Password */}
                <div className="input-wrapper">
                    <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => {
                            setPasswordGiven(true);
                            setPassword(e.target.value);
                        }}
                        className="userInfo"
                    />
                    <button
                        type="button"
                        className="eye-button"
                        onClick={() => setShowPassword((prev) => !prev)}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>

                {invalidLogin && (
                    <p id = "invalidLogin">Username or Password is Incorrect</p>
                )}    
                </div>

                <button onClick={handleLogin}>Login</button>
                <button onClick={() => navigate("/signup")}>Create Account</button>

            </div>
        </div>
    );
}

export default Login;
