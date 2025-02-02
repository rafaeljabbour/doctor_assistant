// ReactMic.js
import React, { useState, useEffect } from 'react';
import { ReactMic } from 'react-mic';

export const Mic = ({ postId }) => {
  const [record, setRecord] = useState(false);

  useEffect(() => {
    // Reset conversation history when the page reloads
    fetch('http://localhost:5000/reset', { method: 'POST' })
      .then(response => response.json())
      .then(data => console.log(data.message))
      .catch(error => console.error("Error resetting conversation:", error));
  }, []);

  const startRecording = () => {
    setRecord(true);
  };

  const stopRecording = () => {
    setRecord(false);
  };

  const onData = (recordedBlob) => {
    console.log('Chunk of real-time data is: ', recordedBlob);
  };

  const onStop = async (recordedBlob) => {
    console.log('Recorded blob is: ', recordedBlob);

    const formData = new FormData();
    formData.append('file', recordedBlob.blob, 'recording.wav');

    // Optionally include the postId if available
    if (postId) {
      formData.append('postId', postId);
    }

    try {
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      console.log('Success:', result);
      const audio = new Audio(`${result.url}?t=${Date.now()}`);
      audio.play();
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  return (
    <div>
      <ReactMic
        record={record}
        className="sound-wave"
        onStop={onStop}
        onData={onData}
        strokeColor="#000000"
        backgroundColor="#FF4081"
      />
      <div>
        <button onClick={startRecording} type="button">Start</button>
        <button onClick={stopRecording} type="button">Stop</button>
      </div>
    </div>
  );
};
