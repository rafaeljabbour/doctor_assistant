// src/pages/ForgotPasswordPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/api';

const ForgotPasswordPage = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [forgotCode, setForgotCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');
    const [step, setStep] = useState(1); // Step 1: send code, Step 2: verify & reset

    // Send forgot password code
    const sendForgotPasswordCode = async () => {
        try {
            const res = await API.patch('/auth/send-forgot-password-code', { email });
            setMessage(res.data.message);
            setStep(2);
        } catch (err) {
            console.error(err);
            setMessage(err.response?.data?.message || 'Error sending forgot password code');
        }
    };

    // Verify the code and reset password
    const verifyForgotPasswordCode = async (e) => {
        e.preventDefault();
        try {
            const res = await API.patch('/auth/verify-forgot-password-code', {
                email,
                providedCode: forgotCode,
                newPassword,
            });
            setMessage(res.data.message);
            // Optionally, redirect to login after successful reset
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            console.error(err);
            setMessage(err.response?.data?.message || 'Error verifying forgot password code');
        }
    };

    return (
        <div className="forgot-password-page">
            <h2>Forgot Password</h2>
            {step === 1 && (
                <div>
                    <label>Email:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <button onClick={sendForgotPasswordCode}>Send Forgot Password Code</button>
                </div>
            )}
            {step === 2 && (
                <form onSubmit={verifyForgotPasswordCode}>
                    <div>
                        <label>Enter Code:</label>
                        <input
                            type="text"
                            value={forgotCode}
                            onChange={(e) => setForgotCode(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label>New Password:</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit">Reset Password</button>
                </form>
            )}
            {message && <p>{message}</p>}
        </div>
    );
};

export default ForgotPasswordPage;
