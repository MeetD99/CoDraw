import { MongoClient } from 'mongodb';

// Cache the MongoDB client connection
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    const db = client.db('coDraw');
    
    // Cache the connection
    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { boardId, data } = req.body;

  // Validate request body
  if (!boardId || !data) {
    return res.status(400).json({ error: 'boardId and data are required' });
  }

  try {
    // Connect to MongoDB
    const { db } = await connectToDatabase();

    // Update or insert the whiteboard data
    await db.collection('whiteboards').updateOne(
      { _id: boardId },
      { 
        $set: { 
          data,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    return res.status(200).json({ message: 'Board auto-saved successfully' });
  } catch (error) {
    console.error('Auto-save error:', error);
    return res.status(500).json({ error: 'Failed to auto-save board' });
  }
} 