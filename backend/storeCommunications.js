import { MongoClient } from "mongodb";

const uri = 'mongodb+srv://PerformAce:Vj9h8pK4F78EySs0@cluster0.gmysq.mongodb.net/Communications?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function connectToMongoDB() {
    try {
        await client.connect();
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        throw new Error("MongoDB connection failed");
    }
}

// Ensure connection is established once at server startup
connectToMongoDB();

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
        throw error; // Re-throw the error to ensure it's logged on the client side too
    }
}

export { savePhraseToDatabase };
