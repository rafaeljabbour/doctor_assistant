// src/pages/SignupPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../api/api';

const SignupPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Basic password confirmation check
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        try {
            const response = await API.post('/auth/signup', { email, password });
            if (response.data && response.data.success) {
                setSuccess("Signup successful! Please log in.");
                // Optionally wait a moment before redirecting:
                setTimeout(() => {
                    navigate('/login');
                }, 1500);
            } else {
                setError("Unexpected response format.");
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Signup failed');
        }
    };

    return (
        <div className="signup-container">
            <h2>Sign Up for Hospital Assistant</h2>
            <form onSubmit={handleSubmit} className="signup-form">
                <div>
                    <label>Email:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Password:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Confirm Password:</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
                {error && <p className="error">{error}</p>}
                {success && <p className="success">{success}</p>}
                <button type="submit">Sign Up</button>
            </form>
            <p>
                Already have an account? <Link to="/login">Login here</Link>.
            </p>
        </div>
    );
};

export default SignupPage;
