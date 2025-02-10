// src/components/Seat.js
import React from 'react';

const Seat = ({ seatId, occupied, patientName, onClick, location }) => {
  return (
    <div className={`seat ${occupied ? 'occupied' : 'empty'}`} onClick={onClick}>
      <h3>{seatId}</h3>
      {location && <p>({location.x}, {location.y})</p>}
      {occupied ? <p>{patientName}</p> : <p>Empty</p>}
    </div>
  );
};

export default Seat;
