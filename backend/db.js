import { MongoClient } from 'mongodb';
import 'dotenv/config';

let client = null;

async function connectToMongo() {
    if (!client) {
        client = new MongoClient(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        await client.connect();
        console.log('MongoDB connected successfully');
    }
    return client; // Return the MongoClient object
}

export { connectToMongo };
