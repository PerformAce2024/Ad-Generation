import dotenv from 'dotenv';
dotenv.config();

import { connectToMongo } from './db.js';

let client;
console.log('Loading storeCommunications.js module');

async function savePhraseToDatabase(collectionName, email, phrase) {
  console.log(`savePhraseToDatabase called with collectionName: ${collectionName}, email: ${email}, phrase: ${phrase}`);

  try {
    const client = await connectToMongo();

    const db = client.db("Communications");
    console.log('Connected to Communications database');

    const collection = db.collection(collectionName);
    console.log(`Accessed collection: ${collectionName}`);

    // Upsert operation: if a document with the email exists, it updates it, otherwise it creates a new one
    console.log(`Upserting document for email: ${email}`);
    const updateResult = await collection.updateOne(
      { email: email },  // Search by email
      { $push: { phrases: phrase } },  // Add the new phrase to the phrases array
      { upsert: true }  // Create the document if it doesn't exist
    );

    if (updateResult.matchedCount > 0 || updateResult.upsertedCount > 0) {
      console.log(`Phrase added successfully to ${collectionName} for user ${email}`);
    } else {
      console.error('Failed to add phrase.');
    }

    return { success: true, message: `Phrase saved for user ${email}` };
  } catch (error) {
    console.error(`Error saving phrase to collection ${collectionName} for user ${email}:`, error);
    return { success: false, message: `Failed to save phrase for user ${email}`, error };
  }
}

export { savePhraseToDatabase };
