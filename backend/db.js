import { MongoClient } from 'mongodb';
import 'dotenv/config';

let client = null;

async function connectToMongo() {
    if (!client) {
      client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      console.log('MongoDB connected successfully');
    }
    return client;
  }  

export { connectToMongo };
