// src/components/RegistrationModal.js
import React, { useState } from 'react';
import API from '../api/api';
import { seatLocations } from '../config/seatLocations';

const RegistrationModal = ({ seatId, onClose }) => {
    // Required fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [healthCard, setHealthCard] = useState(''); // required unique identifier
    // Optional fields
    const [phone, setPhone] = useState('');
    const [initialSymptoms, setInitialSymptoms] = useState('');

    // For storing an existing patient record (if found)
    const [existingPatient, setExistingPatient] = useState(null);
    // For displaying a message after checking the health card
    const [fetchMessage, setFetchMessage] = useState('');
    const [error, setError] = useState('');

    // Fetch an existing patient using the health card number when the "Check" button is clicked
    const fetchPatient = async () => {
        if (!healthCard.trim()) return;
        console.log("Fetching patient with healthCard:", healthCard);
        try {
            const res = await API.get(`/posts/search?healthCard=${healthCard}`);
            console.log("Fetch response:", res.data);
            if (res.data && res.data.patient) {
                const patient = res.data.patient;
                setExistingPatient(patient);
                // Auto-populate fields using data from the fetched record
                setFirstName(patient.firstName || '');
                setLastName(patient.lastName || '');
                setEmail(patient.email || '');
                setPhone(patient.phone || '');
                setFetchMessage("Patient found. Data loaded. The seat assignment will be updated on submission.");
            } else {
                setExistingPatient(null);
                setFetchMessage("No patient found with that health card number. A new record will be created.");
            }
        } catch (err) {
            if (err.response && err.response.status === 404) {
                console.log("Patient not found.");
                setExistingPatient(null);
                setFetchMessage("No patient found with that health card number. A new record will be created.");
            } else {
                setError(err.response?.data?.message || 'Error fetching patient data');
                setFetchMessage("");
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Use the configuration to get the seat location.
        // If the seat is not defined in the config, default to {x: 0, y: 0}
        const location = seatLocations[seatId] || { x: 0, y: 0 };

        // Normalize the health card value
        let normalizedHealthCard = String(healthCard).trim().toLowerCase();
        let patientDetails = {
            firstName,
            lastName,
            email,
            healthCard: normalizedHealthCard,
            phone: phone || null,
            seatId, // assign this seat
            location, // store the seat location (in meters)
            visits: []
        };

        if (initialSymptoms.trim() !== '') {
            patientDetails.visits.push({
                symptoms: initialSymptoms,
                timestamp: new Date().toISOString()
            });
        }

        try {
            if (existingPatient) {
                // Update the existing record.
                const updatedPatient = {
                    ...existingPatient,
                    firstName,
                    lastName,
                    email,
                    healthCard: normalizedHealthCard,
                    phone: phone || existingPatient.phone,
                    seatId, // update with new seat assignment
                    location, // update location based on seatId from config
                    visits: existingPatient.visits ? [...existingPatient.visits] : []
                };
                if (initialSymptoms.trim() !== '') {
                    updatedPatient.visits.push({
                        symptoms: initialSymptoms,
                        timestamp: new Date().toISOString()
                    });
                }
                const payload = {
                    title: `Seat ${seatId}`,
                    description: JSON.stringify(updatedPatient),
                    userId: "dummy"
                };
                await API.put(`/posts/update-post?_id=${existingPatient.postId}`, payload);
            } else {
                // Create a new patient record.
                const payload = {
                    title: `Seat ${seatId}`,
                    description: JSON.stringify(patientDetails),
                    userId: "dummy"
                };
                await API.post('/posts/create-post', payload);
            }
            onClose();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h2>Register Patient for Seat {seatId}</h2>
                <form onSubmit={handleSubmit}>
                    <div>
                        <label>First Name:</label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={e => setFirstName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label>Last Name:</label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={e => setLastName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label>Email:</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label>Health Card Number:</label>
                        <input
                            type="text"
                            value={healthCard}
                            onChange={e => setHealthCard(e.target.value)}
                            required
                        />
                        <button type="button" onClick={fetchPatient}>Check</button>
                        {fetchMessage && <p>{fetchMessage}</p>}
                    </div>
                    <div>
                        <label>Phone Number (optional):</label>
                        <input
                            type="text"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                        />
                    </div>
                    <div>
                        <label>Initial Symptoms (optional):</label>
                        <textarea
                            value={initialSymptoms}
                            onChange={e => setInitialSymptoms(e.target.value)}
                        ></textarea>
                    </div>
                    {error && <p className="error">{error}</p>}
                    <button type="submit">Register Patient</button>
                    <button type="button" onClick={onClose}>Cancel</button>
                </form>
            </div>
        </div>
    );
};

export default RegistrationModal;
