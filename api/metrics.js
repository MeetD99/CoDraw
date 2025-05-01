import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { event, boardId, userId, timestamp } = req.body;

      const docRef = db.collection('metrics').doc();
      await docRef.set({
        event,
        boardId,
        userId: userId || null,
        timestamp: timestamp || new Date().toISOString(),
      });

      return res.status(200).json({ message: 'Metric stored' });
    } catch (err) {
      console.error('Error saving metric:', err);
      return res.status(500).json({ error: 'Failed to save metric' });
    }
  } else {
    return res.status(405).json({ error: 'Only POST allowed' });
  }
}
