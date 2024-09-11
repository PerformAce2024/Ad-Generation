import dotenv from 'dotenv';
dotenv.config();

import { connectToMongo } from './db.js';
let client;
console.log('Loading storeCommunications.js module');

try {
  // Initialize client connection
  client = await connectToMongo();
  console.log("MongoDB connected successfully");
} catch (error) {
  console.error("MongoDB connection error:", error);
  process.exit(1); // Optionally terminate if the connection fails
}

async function savePhraseToDatabase(collectionName, email, phrase) {
  console.log(`savePhraseToDatabase called with collectionName: ${collectionName}, email: ${email}, phrase: ${phrase}`);

  try {
    const db = client.db("Communications");
    console.log('Connected to Communications database');

    const collection = db.collection(collectionName);
    console.log(`Accessed collection: ${collectionName}`);

    // Find the document for the given user by email
    console.log(`Searching for user document with email: ${email}`);
    const userDocument = await collection.findOne({ email: email });

    if (userDocument) {
      console.log(`User document found for email: ${email}`);

      // If the document exists, append the phrase to the existing array of phrases
      console.log(`Updating document for email: ${email} by adding phrase: ${phrase}`);
      const updateResult = await collection.updateOne(
        { email: email },
        { $push: { phrases: phrase } }  // Add the new phrase to the phrases array
      );

      // Check for successful update
      if (updateResult.matchedCount > 0 && updateResult.modifiedCount > 0) {
        console.log(`Phrase added successfully to ${collectionName} for user ${email}`);
      } else {
        console.warn(`No documents were updated. Matched count: ${updateResult.matchedCount}, Modified count: ${updateResult.modifiedCount}`);
      }
    } else {
      console.log(`No user document found for email: ${email}. Creating new document.`);

      // If no document exists, create a new document with the email and phrase
      const insertResult = await collection.insertOne({
        email: email,
        phrases: [phrase],  // Initialize the array with the new phrase
      });

      // Check for successful insertion
      if (insertResult.acknowledged) {
        console.log(`New document created in ${collectionName} for user ${email}`);
      } else {
        console.error('Failed to insert new document.');
      }
    }
    
    return { success: true, message: `Phrase saved for user ${email}` };
  } catch (error) {
    console.error(`Error saving phrase to collection ${collectionName} for user ${email}:`, error);
    return { success: false, message: `Failed to save phrase for user ${email}`, error };
  }
}

export { savePhraseToDatabase };
