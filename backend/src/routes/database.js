const express = require('express');
const databaseController = require('../controllers/databaseController');
const { MongoClient } = require('mongodb');
const router = express.Router();

router.post('/', databaseController.createDatabase);
router.delete('/', databaseController.removeDatabase);
router.get('/api/databases/:containerName/collections', async (req, res) => {
    try {
      const { containerName } = req.params;
      
      // Create a fresh connection each time
      const client = await MongoClient.connect(`mongodb://localhost:27017/${containerName}`, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      const db = client.db(containerName);
      
      // Force refresh of collection list
      const collections = await db.listCollections().toArray();
      
      // Get sample data for each collection
      const collectionsWithData = await Promise.all(
        collections.map(async (collection) => {
          try {
            const sampleData = await db.collection(collection.name)
              .findOne({}, { maxTimeMS: 1000 });
            return {
              name: collection.name,
              sampleData
            };
          } catch (err) {
            return {
              name: collection.name,
              sampleData: null
            };
          }
        })
      );
  
      await client.close();
      res.json(collectionsWithData);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Failed to fetch collections' });
    }
  });
  
  router.get('/api/databases', async (req, res) => {
    let client;
    try {
      // Connect to MongoDB admin database
      client = await MongoClient.connect('mongodb://localhost:27017/admin', {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      // Get list of all databases
      const adminDb = client.db('admin');
      const dbs = await adminDb.admin().listDatabases();
      
      // Format the response to match your container structure
      const containers = dbs.databases
        .filter(db => !['admin', 'config', 'local'].includes(db.name)) // Filter out system databases
        .map(db => ({
          containerName: `mongodb-${db.name}-${Date.now()}`, // You might want to adjust this naming
          type: 'mongodb',
          image: 'mongodb:latest',
          status: 'Running',
          created: 'Existing',
          name: db.name
        }));
  
      res.json(containers);
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Failed to fetch databases' });
    } finally {
      if (client) {
        await client.close();
      }
    }
  });
  
  router.post('/api/databases', async (req, res) => {
    let client;
    try {
      const { databaseName } = req.body;
      
      // Connect and create database
      client = await MongoClient.connect(`mongodb://localhost:27017/${databaseName}`, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      
      // Create a collection to ensure database is created
      const db = client.db(databaseName);
      await db.createCollection('_init');
      
      // Store container information (you might want to use a separate collection/database for this)
      const adminDb = client.db('admin');
      await adminDb.collection('containers').insertOne({
        containerName: `mongodb-${databaseName}-${Date.now()}`,
        type: 'mongodb',
        image: 'mongodb:latest',
        status: 'Running',
        created: new Date().toISOString(),
        name: databaseName
      });
  
      res.json({ success: true });
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Failed to create database' });
    } finally {
      if (client) {
        await client.close();
      }
    }
  });
  
module.exports = router;