// src/components/PatientModal.js
import React, { useState } from 'react';
import API from '../api/api';

const PatientModal = ({ seatId, patientData, onClose }) => {
    const [newSymptoms, setNewSymptoms] = useState('');
    const [error, setError] = useState('');
    const [localPatientData, setLocalPatientData] = useState(patientData);

    // Add a new visit
    const addNewVisit = async (e) => {  
        e.preventDefault();
        const updatedPatientData = { ...localPatientData };
        if (!updatedPatientData.visits) {
            updatedPatientData.visits = [];
        }
        updatedPatientData.visits.push({
            symptoms: newSymptoms,
            timestamp: new Date().toISOString()
        });
        try {
            const payload = {
                title: `Seat ${seatId}`,
                description: JSON.stringify(updatedPatientData),
                userId: "dummy"
            };
            await API.put(`/posts/update-post?_id=${updatedPatientData.postId}`, payload);
            setLocalPatientData(updatedPatientData);
            setNewSymptoms('');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to update patient record');
        }
    };

    // Clear the seat (set seatId to null)
    const clearSeat = async () => {
        const updatedPatientData = { ...localPatientData, seatId: null };
        try {
            const payload = {
                title: `No Seat Assigned`,
                description: JSON.stringify(updatedPatientData),
                userId: "dummy"
            };
            await API.put(`/posts/update-post?_id=${updatedPatientData.postId}`, payload);
            setLocalPatientData(updatedPatientData);
            onClose();  // Close modal so seating page refreshes
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to clear seat');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h2>Patient Info for Seat {seatId}</h2>
                <p><strong>Name:</strong> {localPatientData.firstName} {localPatientData.lastName}</p>
                <p><strong>Email:</strong> {localPatientData.email}</p>
                <p><strong>Phone:</strong> {localPatientData.phone}</p>
                <h3>Visit History:</h3>
                <ul>
                    {localPatientData.visits && localPatientData.visits.map((visit, index) => (
                        <li key={index}>
                            <p><strong>Date:</strong> {new Date(visit.timestamp).toLocaleString()}</p>
                            <p><strong>Symptoms:</strong> {visit.symptoms}</p>
                        </li>
                    ))}
                </ul>
                <form onSubmit={addNewVisit}>
                    <div>
                        <label>Add New Visit Symptoms:</label>
                        <textarea value={newSymptoms} onChange={(e) => setNewSymptoms(e.target.value)} required></textarea>
                    </div>
                    {error && <p className="error">{error}</p>}
                    <button type="submit">Add Visit</button>
                </form>
                <button onClick={clearSeat}>Clear Seat</button>
                <button onClick={onClose}>Close</button>
            </div>
        </div>
    );
};

export default PatientModal;
