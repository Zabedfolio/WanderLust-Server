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

        app.get('/destination', async (req, res) => {
            const result = await destinationCollection.find().toArray();
            res.json(result);
        });

        app.post('/destination', async (req, res) => {
            const destinationData = req.body;
            const result = await destinationCollection.insertOne(destinationData);
            res.json(result);
        });

        app.get('/destination/:id', async (req, res) => {
            const { id } = req.params;
            const result = await destinationCollection.findOne({ _id: new ObjectId(id) });
            res.json(result);
        });

        app.patch('/destination/:id', async (req, res) => {
            const { id } = req.params;
            const updatedData = req.body;
            const result = await destinationCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            );
            res.json(result);
        });

        app.delete('/destination/:id', async (req, res) => {
            const { id } = req.params;
            const result = await destinationCollection.deleteOne({ _id: new ObjectId(id) });
            res.json(result);
        });

        app.get('/booking/:userId', verifyToken, async (req, res) => {
            const { userId } = req.params;
            const result = await bookingCollection.find({ userId: userId }).toArray();
            res.json(result);
        });

        app.post('/booking', verifyToken, async (req, res) => {
            const bookingData = req.body;
            const result = await bookingCollection.insertOne(bookingData);
            res.json(result);
        });

        app.delete('/booking/:bookingId', verifyToken, async (req, res) => {
            const { bookingId } = req.params;
            const result = await bookingCollection.deleteOne({ _id: new ObjectId(bookingId) });
            res.json(result);
        });

        app.get('/', (req, res) => {
            res.send("Server is running");
        });

        console.log("Connected to MongoDB!");

        app.listen(PORT, () => {  // ← moved INSIDE run()
            console.log(`Server is running on port ${PORT}`);
        });

    } catch (err) {
        console.error("Failed to connect to MongoDB:", err);
        process.exit(1);
    }
}

run();