// src/pages/AccountPage.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/api';
import { AuthContext } from '../App';

const AccountPage = () => {
    const navigate = useNavigate();
    const { setIsAuthenticated } = useContext(AuthContext);

    // States for account verification
    const [verifEmail, setVerifEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [verifMessage, setVerifMessage] = useState('');

    // States for changing password
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [changeMessage, setChangeMessage] = useState('');

    // Send verification code
    const sendVerificationCode = async () => {
        try {
            const res = await API.patch('/auth/send-verification-code', { email: verifEmail });
            setVerifMessage(res.data.message);
        } catch (err) {
            console.error(err);
            setVerifMessage(err.response?.data?.message || 'Error sending verification code');
        }
    };

    // Verify the code
    const verifyVerificationCode = async (e) => {
        e.preventDefault();
        try {
            const res = await API.patch('/auth/verify-verification-code', {
                email: verifEmail,
                providedCode: verificationCode,
            });
            setVerifMessage(res.data.message);
        } catch (err) {
            console.error(err);
            setVerifMessage(err.response?.data?.message || 'Error verifying code');
        }
    };

    // Change password
    const changePassword = async (e) => {
        e.preventDefault();
        try {
            const res = await API.patch('/auth/change-password', { oldPassword, newPassword });
            setChangeMessage(res.data.message);
        } catch (err) {
            console.error(err);
            setChangeMessage(err.response?.data?.message || 'Error changing password');
        }
    };

    // Sign out: Remove token, update auth state, and navigate to login
    const signOut = async () => {
        try {
            await API.post('/auth/signout');
        } catch (err) {
            console.error(err);
        }
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        navigate('/login');
    };

    return (
        <div className="account-page">
            <h2>Account Settings</h2>

            <section className="verification-section">
                <h3>Account Verification</h3>
                <div>
                    <label>Email:</label>
                    <input
                        type="email"
                        value={verifEmail}
                        onChange={(e) => setVerifEmail(e.target.value)}
                        placeholder="Your email"
                        required
                    />
                    <button onClick={sendVerificationCode}>Send Verification Code</button>
                </div>
                <form onSubmit={verifyVerificationCode}>
                    <div>
                        <label>Enter Verification Code:</label>
                        <input
                            type="text"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit">Verify Code</button>
                </form>
                {verifMessage && <p>{verifMessage}</p>}
            </section>

            <section className="change-password-section">
                <h3>Change Password</h3>
                <form onSubmit={changePassword}>
                    <div>
                        <label>Old Password:</label>
                        <input
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
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
                    <button type="submit">Change Password</button>
                </form>
                {changeMessage && <p>{changeMessage}</p>}
            </section>

            <section className="signout-section">
                <button onClick={signOut}>Sign Out</button>
            </section>
        </div>
    );
};

export default AccountPage;
