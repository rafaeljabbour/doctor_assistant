// src/pages/SeatingPage.js
import React, { useEffect, useState } from 'react';
import API from '../api/api';
import Seat from '../components/Seat';
import RegistrationModal from '../components/RegistrationModal';
import PatientModal from '../components/PatientModal';
import { useNavigate } from 'react-router-dom';

// Define your seat IDs (example: 4x4 grid)
const seatIds = [
    'A1', 'A2', 'A3', 'A4',
    'B1', 'B2', 'B3', 'B4',
    'C1', 'C2', 'C3', 'C4',
    'D1', 'D2', 'D3', 'D4'
];

const SeatingPage = () => {
    const navigate = useNavigate();
    const [seatsData, setSeatsData] = useState({}); // mapping: seatId => patient record
    const [selectedSeat, setSelectedSeat] = useState(null);
    const [modalType, setModalType] = useState(null); // "register" or "patient"

    // Fetch all patient records with a non-null seatId
    const fetchSeatsData = async () => {
        try {
            const res = await API.get('/posts/all-posts');
            const data = {};
            res.data.data.forEach(post => {
                try {
                    const details = JSON.parse(post.description);
                    if (details.seatId) {
                        // Store the record keyed by seatId (include postId)
                        data[details.seatId] = { ...details, postId: post._id };
                    }
                } catch (e) {
                    console.error('Error parsing post description', e);
                }
            });
            setSeatsData(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchSeatsData();
    }, []);

    const handleSeatClick = (seatId) => {
        setSelectedSeat(seatId);
        if (seatsData[seatId]) {
            setModalType('patient');
        } else {
            setModalType('register');
        }
    };

    const closeModal = () => {
        setSelectedSeat(null);
        setModalType(null);
        fetchSeatsData(); // Refresh data after modal closes
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <div className="seating-page">
            <header>
                <h2>Waiting Room Seating</h2>
                <button onClick={handleLogout}>Logout</button>
            </header>
            <div className="seats-grid">
                {seatIds.map(seatId => (
                    <Seat
                        key={seatId}
                        seatId={seatId}
                        occupied={!!seatsData[seatId]}
                        patientName={seatsData[seatId] ? `${seatsData[seatId].firstName} ${seatsData[seatId].lastName}` : ''}
                        onClick={() => handleSeatClick(seatId)}
                    />
                ))}
            </div>
            {modalType === 'register' && selectedSeat && (
                <RegistrationModal seatId={selectedSeat} onClose={closeModal} />
            )}
            {modalType === 'patient' && selectedSeat && (
                <PatientModal seatId={selectedSeat} patientData={seatsData[selectedSeat]} onClose={closeModal} />
            )}
        </div>
    );
};

export default SeatingPage;
