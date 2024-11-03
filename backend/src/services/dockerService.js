const { exec } = require('child_process');
const util = require('util');
const { MongoClient } = require('mongodb');
const mysql = require('mysql2/promise');

const execPromise = util.promisify(exec);

const generateUniqueName = (baseName) => {
  return `${baseName}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
};

const waitForMySQLContainer = async (containerName, password, maxAttempts = 60, delay = 2000) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      console.log(`Attempt ${i + 1}/${maxAttempts}: Checking MySQL status...`);
      
      // Check container logs
      const { stdout: logs } = await execPromise(`docker logs ${containerName}`);
      console.log("Container logs:", logs);

      // Check if MySQL is ready
      const { stdout } = await execPromise(`docker exec ${containerName} mysqladmin ping -h localhost -u root --password=${password}`);
      if (stdout.includes('mysqld is alive')) {
        console.log('MySQL container is ready');
        return;
      }
    } catch (error) {
      console.log(`Waiting for MySQL container to be ready... (Attempt ${i + 1}/${maxAttempts})`);
      console.log("Error details:", error.message);
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error('MySQL container failed to become ready');
};

const checkMongoDBService = async (containerName) => {
  try {
    const { stdout } = await execPromise(`docker exec ${containerName} mongosh --eval "db.runCommand({ping:1})" --quiet`);
    console.log("MongoDB check result:", stdout);
    return stdout.trim() === '{ ok: 1 }';
  } catch (error) {
    console.error('Error checking MongoDB service:', error.message);
    return false;
  }
};

const waitForMongoDBContainer = async (containerName, maxAttempts = 60, delay = 2000) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      console.log(`Attempt ${i + 1}/${maxAttempts}: Checking MongoDB status...`);
      
      // Check if MongoDB service is running
      const isServiceRunning = await checkMongoDBService(containerName);
      if (isServiceRunning) {
        console.log('MongoDB container is ready');
        return;
      }

      console.log('MongoDB service is not fully ready yet');
    } catch (error) {
      console.log(`Error checking MongoDB status: ${error.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error('MongoDB container failed to become ready');
};

const waitForPostgreSQLContainer = async (containerName, password, maxAttempts = 60, delay = 2000) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      console.log(`Attempt ${i + 1}/${maxAttempts}: Checking PostgreSQL status...`);
      
      const { stdout } = await execPromise(
        `docker exec ${containerName} pg_isready -U postgres`
      );
      if (stdout.includes('accepting connections')) {
        console.log('PostgreSQL container is ready');
        return;
      }
    } catch (error) {
      console.log(`Waiting for PostgreSQL container... (Attempt ${i + 1}/${maxAttempts})`);
      console.log("Error details:", error.message);
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error('PostgreSQL container failed to become ready');
};

exports.createDatabaseConnection = async (type, name, username, password) => {
  console.log(`Creating ${type} database connection for ${name}`);
  const containerName = `${type}-${name}-${Date.now()}`;
  
  // Normalize the database type to handle potential case mismatches
  const normalizedType = type.toLowerCase();
  
  if (normalizedType === 'mysql') {
    const command = `docker run -d --name ${containerName} \
      -p 3306 \
      -e MYSQL_ROOT_PASSWORD=${password} \
      -e MYSQL_DATABASE=${name} \
      -e MYSQL_USER=${username} \
      -e MYSQL_PASSWORD=${password} \
      mysql:latest`;
    
    try {
      console.log(`Creating container with name: ${containerName}`);
      console.log(`Executing Docker command: ${command}`);
      const { stdout } = await execPromise(command);
      const containerId = stdout.trim();
      console.log(`Container created: ${containerId}`);

      await waitForMySQLContainer(containerName, password);

      const { stdout: portMapping } = await execPromise(`docker port ${containerName} 3306`);
      const hostPort = portMapping.split(':')[1].trim();

      const url = `mysql://${username}:${password}@localhost:${hostPort}/${name}`;
      console.log(`MySQL connection established: ${url}`);
      return { type, name, url, containerId, containerName };
    } catch (error) {
      console.error('Error in createMySQLConnection:', error);
      throw error;
    }
  } else if (normalizedType === 'mongodb') {
    const command = `docker run -d --name ${containerName} -p 27017 -e MONGO_INITDB_ROOT_USERNAME=${username} -e MONGO_INITDB_ROOT_PASSWORD=${password} mongo:latest`;
    
    try {
      console.log(`Creating container with name: ${containerName}`);
      console.log(`Executing Docker command: ${command}`);
      const { stdout } = await execPromise(command);
      const containerId = stdout.trim();
      console.log(`Container created: ${containerId}`);

      await waitForMongoDBContainer(containerName, 60, 2000);

      // Get the mapped port
      const { stdout: portMapping } = await execPromise(`docker port ${containerName} 27017`);
      console.log(`Port mapping: ${portMapping}`);
      const hostPort = portMapping.split(':')[1].trim();

      // Encode the username and password to handle special characters
      const encodedUsername = encodeURIComponent(username);
      const encodedPassword = encodeURIComponent(password);

      const url = `mongodb://${encodedUsername}:${encodedPassword}@localhost:${hostPort}/${name}?authSource=admin`;
      console.log(`MongoDB connection established: ${url}`);
      return { type, name, url, containerId, containerName };
    } catch (error) {
      console.error('Error in createMongoDBConnection:', error);
      // Attempt to clean up the container if it was created
      try {
        await exports.removeDatabaseContainer(containerName);
      } catch (cleanupError) {
        console.error('Error cleaning up container:', cleanupError);
      }
      throw error;
    }
  } else if (normalizedType === 'postgresql') {
    const command = `docker run -d --name ${containerName} \
      -p 5432 \
      -e POSTGRES_DB=${name} \
      -e POSTGRES_USER=${username} \
      -e POSTGRES_PASSWORD=${password} \
      postgres:latest`;
    
    try {
      console.log(`Creating container with name: ${containerName}`);
      console.log(`Executing Docker command: ${command}`);
      const { stdout } = await execPromise(command);
      const containerId = stdout.trim();
      console.log(`Container created: ${containerId}`);

      await waitForPostgreSQLContainer(containerName, password);

      const { stdout: portMapping } = await execPromise(`docker port ${containerName} 5432`);
      const hostPort = portMapping.split(':')[1].trim();

      const url = `postgresql://${username}:${encodeURIComponent(password)}@localhost:${hostPort}/${name}`;
      console.log(`PostgreSQL connection established: ${url}`);
      return { type: 'postgresql', name, url, containerId, containerName };
    } catch (error) {
      console.error('Error in createPostgreSQLConnection:', error);
      // Attempt to clean up the container if it was created
      try {
        await exports.removeDatabaseContainer(containerName);
      } catch (cleanupError) {
        console.error('Error cleaning up container:', cleanupError);
      }
      throw error;
    }
  } else {
    throw new Error(`Unsupported database type: ${type}. Supported types are: mysql, mongodb, postgresql`);
  }
};

exports.removeDatabaseContainer = async (name) => {
  try {
    await execPromise(`docker stop ${name}`);
    await execPromise(`docker rm ${name}`);
    console.log(`Container ${name} stopped and removed`);
  } catch (error) {
    console.error(`Error removing container ${name}:`, error);
    throw error;
  }
};

exports.getContainerInfo = async (containerName) => {
  try {
    const { stdout } = await execPromise(`docker inspect ${containerName}`);
    const containerInfo = JSON.parse(stdout)[0];
    return {
      id: containerInfo.Id.slice(0, 12),
      name: containerInfo.Name.slice(1),
      image: containerInfo.Config.Image,
      status: containerInfo.State.Status,
      ports: Object.keys(containerInfo.NetworkSettings.Ports || {}).join(', '),
      created: new Date(containerInfo.Created).toLocaleString()
    };
  } catch (error) {
    console.error('Error getting container info:', error);
    throw error;
  }
};

exports.listDatabasesAndCollections = async (connectionInfo) => {
  if (connectionInfo.type === 'mongodb') {
    const client = new MongoClient(connectionInfo.url);
    try {
      await client.connect();
      const adminDb = client.db().admin();
      const dbList = await adminDb.listDatabases();
      console.log("Databases:");
      for (let db of dbList.databases) {
        console.log(`- ${db.name}`);
        const collections = await client.db(db.name).listCollections().toArray();
        for (let collection of collections) {
          console.log(`  - ${collection.name}`);
        }
      }
    } finally {
      await client.close();
    }
  } else if (connectionInfo.type === 'mysql') {
    await exports.listMySQLDatabases(connectionInfo);
  }
};

exports.viewCollectionData = async (connectionInfo, dbName, collectionName) => {
  if (connectionInfo.type === 'mongodb') {
    const client = new MongoClient(connectionInfo.url);
    try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection(collectionName);
      const data = await collection.find().limit(10).toArray();
      console.log(`First 10 documents in ${dbName}.${collectionName}:`);
      console.log(JSON.stringify(data, null, 2));
    } finally {
      await client.close();
    }
  } else if (connectionInfo.type === 'mysql') {
    await exports.viewMySQLTableData(connectionInfo, collectionName);
  }
};

exports.listMySQLDatabases = async (connectionInfo) => {
  const connection = await mysql.createConnection(connectionInfo.url);
  try {
    const [rows] = await connection.query('SHOW DATABASES');
    console.log("MySQL Databases:");
    rows.forEach(row => console.log(`- ${row.Database}`));
  } catch (error) {
    console.error('Error listing MySQL databases:', error);
  } finally {
    await connection.end();
  }
};

exports.viewMySQLTableData = async (connectionInfo, tableName) => {
  const connection = await mysql.createConnection(connectionInfo.url);
  try {
    const [rows] = await connection.query(`SELECT * FROM ${tableName} LIMIT 10`);
    console.log(`First 10 rows in MySQL table ${connectionInfo.name}.${tableName}:`);
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error('Error viewing MySQL table data:', error);
  } finally {
    await connection.end();
  }
};

exports.getCollections = async (connectionInfo) => {
  if (connectionInfo.type === 'mongodb') {
    const client = new MongoClient(connectionInfo.url);
    try {
      await client.connect();
      const db = client.db(connectionInfo.name);
      const collections = await db.listCollections().toArray();
      
      // Get sample data for each collection
      const collectionsWithData = await Promise.all(collections.map(async (collection) => {
        const data = await db.collection(collection.name)
          .find()
          .limit(1)
          .toArray();
          
        return {
          name: collection.name,
          sampleData: data[0] || null
        };
      }));
      
      return collectionsWithData;
    } finally {
      await client.close();
    }
  }
  return [];
};