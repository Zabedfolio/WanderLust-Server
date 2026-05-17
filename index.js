const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();

dotenv.config();
const uri = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: [
        'http://localhost:3000',
        'https://wander-lust-zabedfolio.vercel.app'
    ],
    credentials: true
}));
app.use(express.json());

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyToken = (req, res, next) => {
    const authHeader = req?.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });
    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    next();
}

async function run() {
    try {
        await client.connect();

        const db = client.db('wanderlust');
        const destinationCollection = db.collection('destinations');
        const bookingCollection = db.collection('bookings');

        // ✅ PUBLIC - anyone can view destinations list
        app.get('/destination', async (req, res) => {
            const result = await destinationCollection.find().toArray();
            res.json(result);
        });

        // 🔒 PROTECTED - only logged in users can add
        app.post('/destination', verifyToken, async (req, res) => {
            const destinationData = req.body;
            const result = await destinationCollection.insertOne(destinationData);
            res.json(result);
        });

        // 🔒 PROTECTED - only logged in users can view details
        app.get('/destination/:id', verifyToken, async (req, res) => {
            const { id } = req.params;
            const result = await destinationCollection.findOne({ _id: new ObjectId(id) });
            res.json(result);
        });

        // 🔒 PROTECTED - only logged in users can edit
        app.patch('/destination/:id', verifyToken, async (req, res) => {
            const { id } = req.params;
            const updatedData = req.body;
            const result = await destinationCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            );
            res.json(result);
        });

        // 🔒 PROTECTED - only logged in users can delete
        app.delete('/destination/:id', verifyToken, async (req, res) => {
            const { id } = req.params;
            const result = await destinationCollection.deleteOne({ _id: new ObjectId(id) });
            res.json(result);
        });

        // 🔒 PROTECTED - only logged in users can view their bookings
        app.get('/booking/:userId', verifyToken, async (req, res) => {
            const { userId } = req.params;
            const result = await bookingCollection.find({ userId: userId }).toArray();
            res.json(result);
        });

        // 🔒 PROTECTED - only logged in users can book
        app.post('/booking', verifyToken, async (req, res) => {
            const bookingData = req.body;
            const result = await bookingCollection.insertOne(bookingData);
            res.json(result);
        });

        // 🔒 PROTECTED - only logged in users can cancel
        app.delete('/booking/:bookingId', verifyToken, async (req, res) => {
            const { bookingId } = req.params;
            const result = await bookingCollection.deleteOne({ _id: new ObjectId(bookingId) });
            res.json(result);
        });

        app.get('/', (req, res) => {
            res.send("Server is running");
        });

        console.log("Connected to MongoDB!");

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

    } catch (err) {
        console.error("Failed to connect to MongoDB:", err);
        process.exit(1);
    }
}

run();