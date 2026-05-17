const express = require('express');
const dotenv = require('dotenv')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');
const app = express();

dotenv.config()
const uri = process.env.MONGODB_URI;

const PORT = process.env.PORT;
app.use(cors());
app.use(express.json());

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const JWKS = createRemoteJWKSet(
    new URL("http://localhost:3001/api/auth/jwks")
)

const verifyToken = async(req,res,next)=>{
            const authHeader = req?.headers.authorization
            if(!authHeader){
                return res.status(401).json({message: "Unauthorized"})
            }
            const token = authHeader.split(" ")[1]

            if(!token){
                return res.status(401).json({message: "Unauthorized"})
            }
            // console.log(token)

            try {
                const {payload} = await jwtVerify(token,JWKS)
                 next()
            } catch (error) {
                return res.status(403).json({message: "Forbidden"})
            }

            
            // if(header === 'logged in'){
           


            // } else{
                // res.status(401).json({message: "Unauthorized"})
            // }
        }

async function run() {
    try {
        await client.connect();

        const db = client.db('wanderlust');
        const destinationCollection = db.collection('destinations');
        const bookingCollection = db.collection('bookings');

        app.get('/destination',async(req,res)=>{
            const result = await destinationCollection.find().toArray();
            res.json(result);
        })

        app.post('/destination',async(req,res)=>{
            const destinationData =  req.body
            console.log(destinationData)
            const result = await destinationCollection.insertOne(destinationData);
            res.json(result);
        })

        app.get('/destination/:id', verifyToken,  async(req,res)=>{
            const {id} = req.params;
            const result = await destinationCollection.findOne({_id: new ObjectId(id)});

            res.json(result);
        })

        app.patch('/destination/:id',async(req,res)=>{
            const {id} = req.params;
            const updatedData = req.body;
            const result = await destinationCollection.updateOne(
                {_id: new ObjectId(id)},
                {$set: updatedData}
            )

            res.json(result);
        })

        app.delete('/destination/:id',async(req,res)=>{
            const {id} = req.params;
            const result = await destinationCollection.deleteOne({_id: new ObjectId(id)});
            res.json(result);
        })

        app.get('/booking/:userId', async(req,res)=>{
            const {userId} = req.params
            const result = await bookingCollection.find({userId: userId}).toArray()
            res.json(result)
        })

        app.post('/booking', verifyToken, async(req,res)=>{
            const bookingData = req.body;
            const result = await bookingCollection.insertOne(bookingData);


            res.json(result);
        })

        app.delete('/booking/:bookingId', verifyToken, async(req,res)=>{
            const {bookingId} = req.params;
            const result = await bookingCollection.deleteOne({_id: new ObjectId(bookingId)})
            res.json(result)
        })



        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send("Server is running")
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})