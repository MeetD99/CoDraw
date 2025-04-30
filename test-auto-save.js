import { MongoClient } from 'mongodb';

// Replace this with your MongoDB connection string
const MONGODB_URI = 'mongodb+srv://meetdholakia2074:Meet%402074@nagrikaursamvidhan.c7eg7.mongodb.net/?retryWrites=true&w=majority&appName=NagrikAurSamvidhan';

const testAutoSave = async () => {
  const testBoardId = 'test-' + Date.now();
  const testData = {
    objects: [
      {
        type: 'rect',
        left: 100,
        top: 100,
        width: 50,
        height: 50,
        fill: 'red'
      }
    ]
  };

  let client;
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('coDraw');
    const collection = db.collection('whiteboards');

    console.log('Testing auto-save with boardId:', testBoardId);
    
    // Simulate auto-save
    const result = await collection.updateOne(
      { _id: testBoardId },
      { 
        $set: { 
          data: JSON.stringify(testData),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    console.log('Auto-save result:', result);

    // Verify the data was saved
    const savedDoc = await collection.findOne({ _id: testBoardId });
    console.log('Saved document:', savedDoc);

    if (savedDoc && savedDoc.data === JSON.stringify(testData)) {
      console.log('✅ Auto-save test successful!');
    } else {
      console.log('❌ Auto-save test failed: Data mismatch');
    }

    // Clean up: delete the test document
    await collection.deleteOne({ _id: testBoardId });
    console.log('Test document cleaned up');

  } catch (error) {
    console.error('❌ Auto-save test failed:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
};

testAutoSave(); 