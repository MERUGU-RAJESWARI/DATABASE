const { MongoClient } = require('mongodb');
const mysql = require('mysql2/promise');
const dockerService = require('../services/dockerService');
const { Client } = require('pg');

const validateCredentials = (username, password) => {
  const validUsername = 'durga';
  const validPassword = 'durga@2699';
  
  return username === validUsername && password === validPassword;
};

async function viewDatabaseInfo(connectionInfo) {
  try {
    await dockerService.listDatabasesAndCollections(connectionInfo);
    await dockerService.viewCollectionData(connectionInfo, connectionInfo.name, connectionInfo.type === 'mysql' ? 'user' : 'sample');
  } catch (error) {
    console.error('Error viewing database info:', error);
  }
}

exports.createDatabase = async (req, res) => {
  const { type, name, username, password } = req.body;
  
  if (!validateCredentials(username, password)) {
    return res.status(401).json({ 
      error: 'Authentication failed: Invalid username or password. Please use the correct credentials.' 
    });
  }
  
  try {
    const connectionInfo = await dockerService.createDatabaseConnection(type, name, username, password);
    
    let sampleData;
    if (type === 'mongodb') {
      sampleData = await createMongoDBSample(connectionInfo);
    } else if (type === 'mysql') {
      sampleData = await createMySQLSample(connectionInfo);
    } else if (type === 'postgresql') {
      sampleData = await createPostgreSQLSample(connectionInfo);
    } else {
      throw new Error(`Unsupported database type: ${type}`);
    }
    
    res.json({
      ...connectionInfo,
      sampleData
    });
  } catch (error) {
    console.error('Error in createDatabase:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
};

async function createMongoDBSample(connectionInfo) {
  const client = new MongoClient(connectionInfo.url);
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db(connectionInfo.name);
    const collection = db.collection('sample');
    const result = await collection.insertOne({ name: 'durga', email: 'john@example.com' });
    console.log('Sample data inserted');
    
    // Fetch the inserted document
    const insertedDoc = await collection.findOne({ _id: result.insertedId });
    return insertedDoc;
  } finally {
    await client.close();
    console.log('Closed MongoDB connection');
  }
}

async function createMySQLSample(connectionInfo) {
  const connection = await mysql.createConnection(connectionInfo.url);
  try {
    console.log('Connected to MySQL');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL
      )
    `);
    const [result] = await connection.execute(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      ['John Doe', 'john@example.com']
    );
    console.log('Sample data inserted');
    const [rows] = await connection.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
    return rows[0];
  } finally {
    await connection.end();
    console.log('Closed MySQL connection');
  }
}

async function createPostgreSQLSample(connectionInfo) {
  const client = new Client(connectionInfo.url);
  
  try {
    await client.connect();
    console.log('Connected to PostgreSQL');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL
      )
    `);
    
    // Insert sample data
    const result = await client.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      ['John Doe', 'john@example.com']
    );
    
    console.log('Sample data inserted');
    return result.rows[0];
  } finally {
    await client.end();
    console.log('Closed PostgreSQL connection');
  }
}

exports.removeDatabase = async (req, res) => {
  const { containerName } = req.body;
  
  try {
    await dockerService.removeDatabaseContainer(containerName);
    res.json({ message: 'Database removed successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to remove database' });
  }
};



exports.getCollections = async (req, res) => {
  const { containerName } = req.params;
  
  try {
    // Get container connection info from existing container
    const containerInfo = await dockerService.getContainerInfo(containerName);
    const collections = await dockerService.getCollections(containerInfo);
    
    res.json(collections);
  } catch (error) {
    console.error('Error getting collections:', error);
    res.status(500).json({ error: error.message });
  }
};

function handleErrorResponse(res, error) {
  if (error.message.includes('pull access denied')) {
    res.status(500).json({ error: 'Failed to pull database image. Please check your internet connection or Docker Hub credentials.' });
  } else if (error.message.includes('docker: Error')) {
    res.status(500).json({ error: 'Docker error: ' + error.message });
  } else {
    res.status(500).json({ error: 'Failed to create database: ' + error.message });
  }
}
