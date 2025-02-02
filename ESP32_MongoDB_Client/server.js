// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

//====================================
// MongoDB Connection
//====================================
const MONGO_URI = 'mongodb+srv://GooDMaN:TqktaUPJc3V4qKB5@cluster0.rtmsg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const app = express();
app.use(cors());
app.use(express.json());

mongoose
    .connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => console.log('Connected to MongoDB!'))
    .catch((err) => console.error('MongoDB connection error:', err));

//====================================
// Mongoose Schema & Model
//====================================
const PostSchema = new mongoose.Schema(
    {
        title: String,
        description: String // Stored as a JSON string containing patient details
    },
    { timestamps: true }
);

const Post = mongoose.model('Post', PostSchema);

//====================================
// GET: Retrieve All Posts
//====================================
app.get('/api/posts/all-posts', async (req, res) => {
    try {
        const posts = await Post.find();
        res.json({
            success: true,
            message: 'posts',
            data: posts
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

//====================================
// POST: Create a New Post
//====================================
app.post('/api/posts', async (req, res) => {
    try {
        const { title, description } = req.body;
        const newPost = new Post({
            title,
            description
        });
        await newPost.save();
        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            data: newPost
        });
    } catch (error) {
        console.error('Error saving post:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

//====================================
// POST: Add Symptoms to a Patient's Record
//====================================
app.post('/api/posts/add-symptoms', async (req, res) => {
    const { healthCard, symptoms } = req.body;
    try {
        // Find the post whose description JSON contains the matching healthCard.
        const posts = await Post.find();
        let postFound = null;
        for (const post of posts) {
            try {
                const details = JSON.parse(post.description);
                if (
                    details.healthCard != null &&
                    String(details.healthCard).trim() === String(healthCard).trim()
                ) {
                    postFound = post;
                    break;
                }
            } catch (e) {
                console.error("Error parsing post description:", e);
            }
        }
        if (!postFound) {
            return res
                .status(404)
                .json({ success: false, message: 'Patient not found for health card ' + healthCard });
        }

        let patientData;
        try {
            patientData = JSON.parse(postFound.description);
        } catch (err) {
            return res.status(500).json({ success: false, message: 'Invalid patient data in description' });
        }
        if (!Array.isArray(patientData.visits)) {
            patientData.visits = [];
        }

        const currentSeat = patientData.seatId;
        if (!currentSeat) {
            return res.status(400).json({ success: false, message: 'No seat assigned; cannot record symptoms.' });
        }

        const visits = patientData.visits;
        const lastVisit = visits.length > 0 ? visits[visits.length - 1] : null;

        if (lastVisit && lastVisit.seatId === currentSeat) {
            let existingSymptoms = lastVisit.symptoms;
            if (existingSymptoms && existingSymptoms.trim().length > 0) {
                existingSymptoms = existingSymptoms + ', ' + symptoms;
            } else {
                existingSymptoms = symptoms;
            }
            lastVisit.symptoms = existingSymptoms;
        } else {
            visits.push({
                seatId: currentSeat,
                symptoms: symptoms,
                timestamp: new Date().toISOString()
            });
        }

        postFound.description = JSON.stringify(patientData);
        await postFound.save();
        res.status(200).json({ success: true, message: 'Symptoms added successfully', data: postFound });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

//====================================
// POST: Update Visit Flag (__v) for a Patient
//====================================
app.post('/api/posts/update-visit', async (req, res) => {
    const { healthCard, visitFlag } = req.body;
    try {
        const posts = await Post.find();
        let postFound = null;
        for (const post of posts) {
            try {
                const details = JSON.parse(post.description);
                if (
                    details.healthCard != null &&
                    String(details.healthCard).trim() === String(healthCard).trim()
                ) {
                    postFound = post;
                    break;
                }
            } catch (e) {
                console.error("Error parsing description:", e);
            }
        }
        if (!postFound) {
            return res
                .status(404)
                .json({ success: false, message: 'Post not found for health card ' + healthCard });
        }
        // Update the __v field as a flag (0 = not visited, 1 = visiting, 2 = visited)
        postFound.__v = visitFlag;
        await postFound.save();
        res.status(200).json({ success: true, message: 'Visit flag updated successfully', data: postFound });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error', error: err.message });
    }
});

//====================================
// Start the Server
//====================================
const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
