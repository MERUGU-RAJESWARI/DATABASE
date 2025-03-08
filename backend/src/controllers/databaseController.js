const { MongoClient } = require('mongodb');
//raji
const mysql = require('mysql2/promise');
const dockerService = require('../services/dockerService');
const { Client } = require('pg');
const { exec } = require('child_process');
const util = require('util');
const Redis = require('ioredis');
// const cassandra = require('cassandra-driver');

// Create promisified version of exec
const execPromise = util.promisify(exec);

async function viewDatabaseInfo(connectionInfo) {
  try {
    await dockerService.listDatabasesAndCollections(connectionInfo);
    await dockerService.viewCollectionData(connectionInfo, connectionInfo.name, connectionInfo.type === 'mysql' ? 'user' : 'sample');
  } catch (error) {
    console.error('Error viewing database info:', error);
  }
}

async function createRedisSample(connectionInfo) {
  const redis = new Redis(connectionInfo.url);
  
  try {
    // Set some sample key-value pairs
    await redis.set('user:1:name', 'John Doe');
    await redis.set('user:1:email', 'john@example.com');
    await redis.set('user:1:created', new Date().toISOString());

    // Get the sample data
    const sampleData = {
      name: await redis.get('user:1:name'),
      email: await redis.get('user:1:email'),
      created: await redis.get('user:1:created')
    };

    console.log('Sample data inserted in Redis');
    return sampleData;
  } catch (error) {
    console.error('Error creating Redis sample:', error);
    throw error;
  } finally {
    await redis.quit();
    console.log('Closed Redis connection');
  }
}

exports.createDatabase = async (req, res) => {
  let { type, name, username, password } = req.body;
  
  console.log('Received request with type:', type);
  
  // Normalize the database type
  type = type.toLowerCase().trim();
  
  console.log('Normalized type:', type);
  
  try {
    console.log(`Creating database connection for type: ${type}, name: ${name}`);
    const connectionInfo = await dockerService.createDatabaseConnection(type, name, username, password);
    
    let sampleData;
    
    switch (type) {
      case 'mongodb':
        sampleData = await createMongoDBSample(connectionInfo);
        break;
      case 'mysql':
        sampleData = await createMySQLSample(connectionInfo);
        break;
      case 'postgresql':
      case 'postgres':
        sampleData = await createPostgreSQLSample(connectionInfo);
        break;
      case 'sqlite':
        sampleData = await createSQLiteSample(connectionInfo);
        break;
      case 'redis':
        sampleData = await createRedisSample(connectionInfo);
        break;
      // case 'cassandra':
      //   sampleData = await createCassandraSample(connectionInfo);
      //   break;
      case 'mariadb':
        sampleData = await createMySQLSample(connectionInfo);
        break;
      default:
        throw new Error(`Unsupported database type: ${type}. Supported types are: mysql, mongodb, postgresql, sqlite, redis, cassandra, mariadb`);
    }
    
    res.json({
      ...connectionInfo,
      sampleData
    });
  } catch (error) {
    console.error('Error in createDatabase:', error);
    res.status(500).json({ 
      error: error.message,
      receivedType: type,
      validTypes: ['mongodb', 'mysql', 'postgresql', 'sqlite', 'redis', 'cassandra', 'mariadb']
    });
  }
};

async function createMongoDBSample(connectionInfo) {
  const client = new MongoClient(connectionInfo.url);
  
  try {
    await client.connect();
    const db = client.db(connectionInfo.name);
    const result = await db.collection('sample')
      .insertOne({
        name: 'Sample User',
        email: 'sample@example.com',
        createdAt: new Date()
      });


    console.log('Sample data inserted in MongoDB');
    
    return {
      data: await db.collection('sample').findOne({ _id: result.insertedId })
    };
  } catch (error) {
    console.error('Error creating sample data:', error);
    throw error;
  } finally {
    await client.close();
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
  const client = new Client({
    connectionString: connectionInfo.url
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL
      )
    `);

    const result = await client.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      ['John Doe', 'john@example.com']
    );

    console.log('Sample data inserted in PostgreSQL');
    return result.rows[0];
  } catch (error) {
    console.error('Error creating PostgreSQL sample:', error);
    throw error;
  } finally {
    await client.end();
    console.log('Closed PostgreSQL connection');
  }
}

async function createSQLiteSample(connectionInfo) {
  try {
    // Execute SQLite commands in the container
    await execPromise(`
      docker exec ${connectionInfo.containerName} sh -c '
        sqlite3 ${connectionInfo.url} "
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL
          );
          INSERT INTO users (name, email) VALUES ('\''John Doe'\'', '\''john@example.com'\'');
        "
      '
    `);

    // Query the inserted data
    const { stdout } = await execPromise(`
      docker exec ${connectionInfo.containerName} sh -c '
        sqlite3 ${connectionInfo.url} "SELECT * FROM users ORDER BY id DESC LIMIT 1;"
      '
    `);

    console.log('Sample data inserted in SQLite');
    return { data: stdout.trim() };
  } catch (error) {
    console.error('Error creating SQLite sample:', error);
    throw error;
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

function handleErrorResponse(res, error) {
  if (error.message.includes('pull access denied')) {
    res.status(500).json({ error: 'Failed to pull database image' });
  } else if (error.message.includes('docker: Error')) {
    res.status(500).json({ error: 'Docker error: ' + error.message });
  } else {
    res.status(500).json({ error: 'Failed to create database: ' + error.message });
  }
}

