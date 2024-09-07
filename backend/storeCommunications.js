import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function savePhraseToDatabase(collectionName, email, phrase) {
  try {
    const db = client.db("Communications");
    const collection = db.collection(collectionName);

    // Find the document for the given user by email
    const userDocument = await collection.findOne({ email: email });
    if (userDocument) {
      // If the document exists, append the phrase to the existing array of phrases
      await collection.updateOne(
        { email: email },
        { $push: { phrases: phrase } } // Add the new phrase to the phrases array
      );

      console.log(`Phrase added to ${collectionName} for user ${email}`);
    } else {
      // If no document exists, create a new document with the email and phrase
      await collection.insertOne({
        email: email,
        phrases: [phrase], // Initialize the array with the new phrase
      });
      
      console.log(`New document created in ${collectionName} for user ${email}`);
    }
  } catch (error) {
    console.error(`Error saving phrase to ${collectionName}:`, error);
  }
}

export { savePhraseToDatabase };
