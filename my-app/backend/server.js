// server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection string (update as needed)
const MONGO_URI =
  'mongodb+srv://GooDMaN:TqktaUPJc3V4qKB5@cluster0.rtmsg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Connected to MongoDB!'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Define the Mongoose schema/model.
// The "description" field stores a JSON string that includes patient details and a "visits" array.
const PostSchema = new mongoose.Schema(
  {
    title: String,
    description: String, // JSON string (patient details, including visits array)
    userId: String
  },
  { timestamps: true }
);
const Post = mongoose.model('Post', PostSchema);

// =======================================
// GET /api/posts/search?healthCard=1
// =======================================
// This endpoint searches for a patient using their health card number.
app.get('/api/posts/search', async (req, res) => {
  const { healthCard } = req.query;
  console.log("Searching for healthCard:", healthCard);
  try {
    const posts = await Post.find();
    let patient = null;
    posts.forEach(post => {
      try {
        const details = JSON.parse(post.description);
        // Compare stored healthCard and query healthCard (case-insensitive)
        if (
          details.healthCard != null &&
          String(details.healthCard).trim().toLowerCase() === String(healthCard).trim().toLowerCase()
        ) {
          patient = { ...details, postId: post._id.toString() };
        }
      } catch (e) {
        console.error("Error parsing post description:", e);
      }
    });
    if (patient) {
      return res.status(200).json({ success: true, patient });
    } else {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =======================================
// POST /api/posts/add-symptoms
// =======================================
// This endpoint receives a JSON body with { postId, symptoms }.
// It updates the patient record as follows:
//  - It retrieves the current patient data (including the assigned seatId).
//  - If the patient is currently assigned a seat (i.e. seatId is not null):
//       * If the last visit in the visits array has the same seatId, it appends the new symptoms.
//       * Otherwise, it creates a new visit entry for the current seat session.
//  - If no seat is assigned, it returns an error.
app.post('/api/posts/add-symptoms', async (req, res) => {
  const { postId, symptoms } = req.body;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    let patientData;
    try {
      patientData = JSON.parse(post.description);
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Invalid patient data in description' });
    }
    if (!Array.isArray(patientData.visits)) {
      patientData.visits = [];
    }

    // Get the current seat assignment from the patient data.
    const currentSeat = patientData.seatId;
    if (!currentSeat) {
      return res.status(400).json({ success: false, message: 'No seat assigned; cannot record symptoms.' });
    }

    // Check if the most recent visit is part of the current seat session.
    const visits = patientData.visits;
    const lastVisit = visits.length > 0 ? visits[visits.length - 1] : null;
    
    if (lastVisit && lastVisit.seatId === currentSeat) {
      // Append new symptoms to the existing visit.
      let existingSymptoms = lastVisit.symptoms;
      if (existingSymptoms && existingSymptoms.trim().length > 0) {
        existingSymptoms = existingSymptoms + ', ' + symptoms;
      } else {
        existingSymptoms = symptoms;
      }
      lastVisit.symptoms = existingSymptoms;
    } else {
      // Create a new visit entry for the current seat session.
      visits.push({
        seatId: currentSeat,
        symptoms: symptoms,
        timestamp: new Date().toISOString()
      });
    }

    // Update the description field with the updated patient data.
    post.description = JSON.stringify(patientData);
    const updatedPost = await post.save();
    return res.status(200).json({ success: true, message: 'Symptoms added successfully', data: updatedPost });
  } catch (err) {
    console.error("Error in add-symptoms:", err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

const PORT = 5001;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
