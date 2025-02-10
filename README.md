# Senioritis

**An AI-Powered, Autonomous Robot to Streamline Pre-Screening in Medical Waiting Rooms**

Senioritis is a proof-of-concept robot designed to reduce operational inefficiencies in walk-in clinic waiting rooms. With AI-driven conversations, autonomous navigation, and real-time database updates, Senioritis aims to minimize patient wait times, reduce staff workload, and improve overall patient satisfaction.

## Table of Contents
- [Introduction](#introduction)
- [Key Features](#key-features)
- [Research & Motivation](#research--motivation)
- [System Architecture](#system-architecture)
  - [Hardware](#hardware)
  - [Software](#software)
  - [AI Integration](#ai-integration)
  - [Communication](#communication)
  - [Database Structure](#database-structure)
- [Getting Started](#getting-started)
- [Usage & Workflow](#usage--workflow)
- [Future Enhancements](#future-enhancements)
- [Team & Acknowledgments](#team--acknowledgments)

## Introduction
Senioritis was built during **UTRA Hacks 2025**, hosted by the University of Toronto Robotics Association, where it won **Best Use of MongoDB**. The project addresses the long-standing problem of patient wait times and inefficient patient screening in medical clinics. By automating the pre-screening process, Senioritis helps clinic staff allocate their time more effectively and offers patients a more engaging and less stressful waiting experience.

## Key Features
- **Autonomous Robot Navigation:** An ESP32-driven chassis that can move to any assigned seat in the waiting room.
- **Queue-Based Patient Prioritization:** Ensures a fair “first-in-first-out” approach to patient visits.
- **AI-Driven Conversations:** Powered by OpenAI APIs for speech-to-text, text-to-speech, and symptom extraction.
- **Real-Time Database Updates:** Uses MongoDB Atlas to store and retrieve patient data, seating assignments, and user logins in real time.
- **Admin Dashboard:** A React-based web application for staff to manage patient seating, monitor active patients, and review past visit information.

## Research & Motivation
Medical waiting rooms often suffer from long wait times and inefficient pre-screening, leading to:
- Patient dissatisfaction & stress
- Delayed care & worse health outcomes
- Economic inefficiencies for healthcare providers

**Supporting Literature:**
- **Bleustein et al. (2014):** Demonstrated the direct correlation between wait times and patient dissatisfaction (*The American Journal of Managed Care*).
- **Pines et al. (2011):** Highlighted the global issue of emergency department crowding and its impact on wait times (*Academic Emergency Medicine*).
- **Collins (2020):** Discussed the use of robots in hospitals to minimize human contact and reduce virus transmission risks (COVID-19 related).
- **Hollander & Carr (2020):** Showed how telemedicine and AI chatbots can reduce wait times and bottlenecks (Telemedicine and AI adoption during the pandemic).

## System Architecture

### Hardware
- **ESP32**
  - Handles WiFi connectivity and HTTP requests.
  - Controls two motors for autonomous navigation.
- **Motor Driver & Chassis**
  - Enables precise movement from one coordinate (a, b) to another (c, d).
  - The system updates its position after each successful movement.
- **(Future Upgrade) Microphone & Speaker**
  - Will replace the current phone-based audio system.
  - **Adafruit I2S MEMS Microphone Breakout 3421** for audio input.
  - **PSR-28N08A-JQ** for audio output.

### Software
- **React Admin Dashboard**
  - Allows clinic staff to manage seating arrangements in real time.
  - Stores new and past patient data in MongoDB.
  - Provides quick retrieval of patient history.
- **MongoDB Atlas**
  - Central storage for patient data, seat assignments, and login credentials.
  - Stores each patient’s historical visits indefinitely.
- **Flask Server**
  - Hosts AI modules and connects to OpenAI APIs.
  - Provides a simple front-end for text generation, text-to-speech, speech recognition, and symptom extraction.
- **ESP32 HTTP Endpoints**
  - **GET** requests to retrieve seat assignments and patient queue order.
  - **POST** requests to update symptom data in real time.

### AI Integration
- **Text-to-Speech & Speech-to-Text:** Converts spoken input from patients into text, and synthesizes spoken responses from the AI.
- **Continuous Conversations:** Maintains a conversation history with GPT to provide context-aware follow-up questions and more personalized patient interactions.
- **Symptom Extraction:** Parses transcripts for medical symptoms, building a comprehensive overview of the patient’s condition.

### Communication
- **WiFi Connectivity:** The ESP32 securely connects to clinic WiFi.
- **HTTP Requests:** Retrieves seating info from MongoDB and updates patient symptom details.
- **Real-Time Updates:** Ensures the staff dashboard and robot are always in sync with current patient statuses.

### Database Structure
Senioritis uses MongoDB Atlas with the following collections:
- **patients**
  - Contains patient details, seat number, entry time, and past visit history.
  - Updated in real time when a patient arrives, moves, or completes screening.
- **logins**
  - Stores user credentials for doctors, nurses, and secretaries.
- **robotCoordinates** (or integrated into patients documents)
  - Tracks each patient’s seat location and entry time for the robot’s queue-based navigation.

## Getting Started

### Clone the Repository
```bash
git clone https://github.com/yourusername/Senioritis.git
cd Senioritis

### Install Dependencies

**Frontend (React Dashboard):**
```bash
cd client
npm install
```

**Backend (Flask Server):**
```bash
cd server
pip install -r requirements.txt
```

**ESP32 Firmware:**
- Use the Arduino IDE or PlatformIO to flash the ESP32 code.
- Update the WiFi credentials and server endpoint in the firmware.

### Set Up MongoDB
- Create a MongoDB Atlas cluster and obtain the connection URI.
- Update the `.env` or configuration file with your MongoDB connection string.

### Run the Project

**React App:**
```bash
cd client
npm start
```

**Flask Server:**
```bash
cd server
python app.py
```

**ESP32:**
- Flash the firmware to your ESP32 and ensure it’s connected to the same network.

## Usage & Workflow

1. **Staff Checks In Patients**
   - Assigns each patient a seat from the React Admin Dashboard.
   - The new seating information is instantly stored in MongoDB.

2. **Robot Retrieves Queue Info**
   - Makes a GET request to fetch seat coordinates and patient entry times.
   - Prioritizes patients based on arrival time (FIFO).

3. **Autonomous Navigation**
   - The ESP32 calculates the path from its current location to the patient’s seat.
   - Moves the robot there using its motor control logic.

4. **AI-Powered Conversation**
   - Once the robot arrives, it uses AI to conduct a pre-screening conversation.
   - Speech recognition and text-to-speech facilitate natural interaction.

5. **Real-Time Symptom Updates**
   - The robot (via ESP32) posts the extracted symptom data to MongoDB.
   - Staff can see updated patient info in the dashboard immediately.

6. **Repeat for All Patients**
   - The robot cycles through the queue, ensuring each patient gets screened in order.

## Future Enhancements
- **Dedicated Microphone & Speaker**
  - Integrate I2S microphone and speakers to eliminate the need for phone-based audio I/O.
- **Multiple Robots**
  - Scale the solution for larger clinics with multiple robots working in tandem.
  - Implement more advanced path-planning and collision avoidance.
- **Advanced Analytics**
  - Track wait times, patient flow, and staff workload for data-driven improvements.
- **Enhanced AI & Symptom Detection**
  - Integrate medical knowledge bases to provide more accurate triage and recommendations.

## Team & Acknowledgments
**Contributors:**
- Rafael Jabbour (Me)
- Alina Khan
- Robert Solomon Saab
- Constantine Dean Priftakis

A huge thank you to the University of Toronto Robotics Association for organizing UTRA Hacks 2025. We appreciate the opportunity to develop such an innovative project and look forward to continuing our work on Senioritis and other robotics solutions!
```
