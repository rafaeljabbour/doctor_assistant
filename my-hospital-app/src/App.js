// src/App.js
import React, { createContext, useState } from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import SeatingPage from './pages/SeatingPage';
import AccountPage from './pages/AccountPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

// Create the AuthContext so child components can update auth state
export const AuthContext = createContext();

function App() {
  // Initialize auth state based on token in localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(localStorage.getItem('token')));

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
      <div className="App">
        <nav>
          {!isAuthenticated && (
            <>
              <Link to="/login">Login</Link> |{' '}
              <Link to="/signup">Sign Up</Link> |{' '}
              <Link to="/forgot-password">Forgot Password</Link>
            </>
          )}
          {isAuthenticated && (
            <>
              <Link to="/seating">Seating</Link> |{' '}
              <Link to="/account">Account</Link>
            </>
          )}
        </nav>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/seating" element={isAuthenticated ? <SeatingPage /> : <Navigate to="/login" />} />
          <Route path="/account" element={isAuthenticated ? <AccountPage /> : <Navigate to="/login" />} />
          <Route path="*" element={<Navigate to={isAuthenticated ? "/seating" : "/login"} />} />
        </Routes>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
