const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose'); // ← use 'jose' not 'jose-cjs'

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- Remove trailing slash from CLIENT_URL ---
const clientUrl = (process.env.CLIENT_URL || '').replace(/\/$/, '');
const authOrigin = (process.env.BETTER_AUTH_URL || clientUrl || 'http://localhost:3000').replace(/\/$/, '');

// --- JWKS from your live Next.js app ---
const JWKS = createRemoteJWKSet(
    new URL('/api/auth/jwks', authOrigin)
);

app.use(cors({
    origin: clientUrl,
    credentials: true
}));
app.use(express.json());

// --- Cached MongoDB connection ---
let cachedClient = null;

async function getClient() {
    if (cachedClient) return cachedClient;
    const client = new MongoClient(process.env.MONGODB_URI, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    });
    await client.connect();
    cachedClient = client;
    return client;
}

// --- JWT verification via JWKS ---
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    try {
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: authOrigin,
            audience: authOrigin,
        });
        req.user = payload;
        next();
    } catch (err) {
        return res.status(403).json({ message: "Forbidden: invalid or expired token" });
    }
};

// --- Async wrapper ---
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// --- Routes ---
app.get('/', (req, res) => res.send("Server is running"));

app.get('/destination', asyncHandler(async (req, res) => {
    const client = await getClient();
    const result = await client.db('wanderlust').collection('destinations').find().toArray();
    res.json(result);
}));

app.post('/destination', asyncHandler(async (req, res) => {
    const client = await getClient();
    const result = await client.db('wanderlust').collection('destinations').insertOne(req.body);
    res.json(result);
}));

app.get('/destination/:id', asyncHandler(async (req, res) => {
    const client = await getClient();
    const result = await client.db('wanderlust').collection('destinations')
        .findOne({ _id: new ObjectId(req.params.id) });
    if (!result) return res.status(404).json({ message: "Destination not found" });
    res.json(result);
}));

app.patch('/destination/:id', asyncHandler(async (req, res) => {
    const client = await getClient();
    const result = await client.db('wanderlust').collection('destinations')
        .updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
    res.json(result);
}));

app.delete('/destination/:id', asyncHandler(async (req, res) => {
    const client = await getClient();
    const result = await client.db('wanderlust').collection('destinations')
        .deleteOne({ _id: new ObjectId(req.params.id) });
    res.json(result);
}));

app.get('/booking/:userId', verifyToken, asyncHandler(async (req, res) => {
    const client = await getClient();
    const result = await client.db('wanderlust').collection('bookings')
        .find({ userId: req.params.userId }).toArray();
    res.json(result);
}));

app.post('/booking', verifyToken, asyncHandler(async (req, res) => {
    const client = await getClient();
    const result = await client.db('wanderlust').collection('bookings').insertOne(req.body);
    res.json(result);
}));

app.delete('/booking/:bookingId', verifyToken, asyncHandler(async (req, res) => {
    const client = await getClient();
    const result = await client.db('wanderlust').collection('bookings')
        .deleteOne({ _id: new ObjectId(req.params.bookingId) });
    res.json(result);
}));

// --- Global error handler ---
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ message: "Internal server error", error: err.message });
});

// --- Local dev only ---
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;