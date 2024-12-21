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


const checkMongoDBService = async (containerName, username, password) => {
  try {
    const { stdout } = await execPromise(
      `docker exec ${containerName} mongosh --username ${username} --password ${password} --authenticationDatabase admin --eval "db.runCommand({ping:1})" --quiet`
    );
    console.log("MongoDB check result:", stdout);
    return stdout.trim() === '{ ok: 1 }';
  } catch (error) {
    console.error('Error checking MongoDB service:', error.message);
    return false;
  }
};

const waitForMongoDBContainer = async (containerName, username, password, maxAttempts = 60, delay = 2000) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      console.log(`Attempt ${i + 1}/${maxAttempts}: Checking MongoDB status...`);
      
      // Check container logs
      const { stdout: logs } = await execPromise(`docker logs ${containerName}`);
      console.log("Container logs:", logs);

      // Check if MongoDB is ready
      const { stdout } = await execPromise(
        `docker exec ${containerName} mongosh --username ${username} --password ${password} --authenticationDatabase admin --eval "db.runCommand({ping:1})" --quiet`
      );
      if (stdout.trim() === '{ ok: 1 }') {
        console.log('MongoDB container is ready');
        return;
      }
    } catch (error) {
      console.log(`Waiting for MongoDB container to be ready... (Attempt ${i + 1}/${maxAttempts})`);
      console.log("Error details:", error.message);
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error('MongoDB container failed to become ready');
};

const waitForPostgreSQLContainer = async (containerName, username, password, maxAttempts = 60, delay = 2000) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      console.log(`Attempt ${i + 1}/${maxAttempts}: Checking PostgreSQL status...`);
      
      // Check if PostgreSQL is ready
      const { stdout } = await execPromise(
        `docker exec ${containerName} pg_isready -h localhost`
      );
      
      if (stdout.includes('accepting connections')) {
        try {
          // Try to authenticate with provided credentials
          const authCommand = `docker exec -e PGPASSWORD="${password}" ${containerName} psql -U "${username}" -d postgres -c "SELECT current_user;"`;
          const result = await execPromise(authCommand);

          if (!result.stdout.includes(username)) {
            console.error('Authentication failed: Wrong user');
            throw new Error('Authentication failed');
          }

          console.log('PostgreSQL authentication successful');
          return true;
        } catch (authError) {
          console.error('Authentication failed:', authError.message);
          throw new Error('Authentication failed');
        }
      }
    } catch (error) {
      if (error.message.includes('Authentication failed')) {
        throw error;
      }
      console.log(`Waiting for PostgreSQL container... (Attempt ${i + 1}/${maxAttempts})`);
      console.log("Error details:", error.message);
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error('PostgreSQL container failed to become ready');
};

const waitForSQLiteContainer = async (containerName, maxAttempts = 30, delay = 1000) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      console.log(`Attempt ${i + 1}/${maxAttempts}: Checking SQLite status...`);
      
      // Check if sqlite3 is installed and working
      const { stdout } = await execPromise(
        `docker exec ${containerName} sqlite3 -version`
      );
      if (stdout) {
        console.log('SQLite container is ready');
        return;
      }
    } catch (error) {
      console.log(`Waiting for SQLite container... (Attempt ${i + 1}/${maxAttempts})`);
      console.log("Error details:", error.message);
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error('SQLite container failed to become ready');
};

const waitForRedisContainer = async (containerName, username, password, maxAttempts = 60, delay = 2000) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      console.log(`Attempt ${i + 1}/${maxAttempts}: Checking Redis status...`);
      
      // Check container logs
      const { stdout: logs } = await execPromise(`docker logs ${containerName}`);
      console.log("Container logs:", logs);

      // Test Redis connection with authentication
      const pingCmd = password 
        ? `docker exec ${containerName} redis-cli -a "${password}" ping`
        : `docker exec ${containerName} redis-cli ping`;
      
      const { stdout } = await execPromise(pingCmd);
      
      if (stdout.trim() === 'PONG') {
        console.log('Redis is ready and responding to PING');
        return true;
      }
    } catch (error) {
      console.log(`Attempt ${i + 1} failed:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Redis container failed to become ready');
};

const waitForCassandraContainer = async (containerName, username,password, maxAttempts = 120, delay = 2000) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      console.log(`Attempt ${i + 1}/${maxAttempts}: Checking Cassandra status...`);
      
      // First check if container is running
      const { stdout: containerStatus } = await execPromise(
        `docker exec ${containerName} cqlsh -e "SELECT now() FROM system.local;"`
      );
      
      if (containerStatus) {
        console.log('Cassandra container is ready');
        return;
      }
    } catch (error) {
      console.log(`Waiting for Cassandra container... (Attempt ${i + 1}/${maxAttempts})`);
      console.log("Error details:", error.message);
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error('Cassandra container failed to become ready');
};

const waitForMariaDBContainer = async (containerName, username, password, maxAttempts = 60, delay = 2000) => {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      console.log(`Attempt ${i + 1}/${maxAttempts}: Checking MariaDB status...`);
      
      // Check container logs
      const { stdout: logs } = await execPromise(`docker logs ${containerName}`);
      console.log("Container logs:", logs);

      // Check if MariaDB is ready with root
      const { stdout: rootCheck } = await execPromise(
        `docker exec ${containerName} mysqladmin ping -h localhost -u root --password=${password}`
      );

      if (rootCheck.includes('mysqld is alive')) {
        console.log('MariaDB is running, verifying user access...');

        // Create user if it doesn't exist and grant privileges
        try {
          await execPromise(`
            docker exec ${containerName} mysql -u root --password=${password} -e "
              CREATE USER IF NOT EXISTS '${username}'@'%' IDENTIFIED BY '${password}';
              GRANT ALL PRIVILEGES ON *.* TO '${username}'@'%' WITH GRANT OPTION;
              FLUSH PRIVILEGES;
            "
          `);
          console.log(`User ${username} configured successfully`);
          return;
        } catch (userError) {
          console.log('Error configuring user:', userError.message);
          throw userError;
        }
      }
    } catch (error) {
      console.log(`Waiting for MariaDB container... (Attempt ${i + 1}/${maxAttempts})`);
      console.log("Error details:", error.message);
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error('MariaDB container failed to become ready');
};
//maria db
const pullDockerImage = async (imageName, maxRetries = 3, retryDelay = 5000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}: Pulling Docker image: ${imageName}`);
      
      // Check if image already exists locally
      const { stdout: images } = await execPromise('docker images --format "{{.Repository}}:{{.Tag}}"');
      if (images.includes(imageName)) {
        console.log(`Image ${imageName} already exists locally`);
        return true;
      }

      // Try to pull the image
      await execPromise(`docker pull ${imageName}`);
      console.log(`Successfully pulled ${imageName}`);
      return true;
    } catch (error) {
      console.error(`Attempt ${attempt} failed to pull ${imageName}:`, error.message);
      
      if (attempt === maxRetries) {
        console.error('All pull attempts failed');
        return false;
      }

      // Wait before retrying
      console.log(`Waiting ${retryDelay/1000} seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  return false;
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
  } 
  
  else if (normalizedType === 'mongodb') {
    const command = `docker run -d --name ${containerName} -p 27017 -e MONGO_INITDB_ROOT_USERNAME=${username} -e MONGO_INITDB_ROOT_PASSWORD=${password} mongo:latest`;
    
    try {
      console.log(`Creating container with name: ${containerName}`);
      console.log(`Executing Docker command: ${command}`);
      const { stdout } = await execPromise(command);
      const containerId = stdout.trim();
      console.log(`Container created: ${containerId}`);

      await waitForMongoDBContainer(containerName, username, password, 60, 2000);

      // Get the mapped port
      const { stdout: portMapping } = await execPromise(`docker port ${containerName} 27017`);
      console.log(`Port mapping: ${portMapping}`);
      const hostPort = portMapping.split(':')[1].trim();

      // Encode the username and password to handle special characters
      const encodedUsername = encodeURIComponent(username);
      const encodedPassword = encodeURIComponent(password);

      const connectionUrl = `mongodb://${encodedUsername}:${encodedPassword}@localhost:${hostPort}/${name}?authSource=admin`;
      console.log(`MongoDB connection established: ${connectionUrl}`);
      return { type, name, url: connectionUrl, containerId, containerName };
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
    // Validate inputs
    if (!username || username.length < 1) {
      throw new Error('PostgreSQL username is required');
    }
    if (!password || password.length < 4) {
      throw new Error('PostgreSQL password must be at least 4 characters long');
    }

    const command = `docker run -d --name ${containerName} \
      -p 5432 \
      -e POSTGRES_DB=${name} \
      -e POSTGRES_USER=${username} \
      -e POSTGRES_PASSWORD=${password} \
      -e POSTGRES_HOST_AUTH_METHOD=md5 \
      -e POSTGRES_INITDB_ARGS="--auth-local=md5 --auth-host=md5" \
      postgres:latest`;
    
    try {
      console.log(`Creating container with name: ${containerName}`);
      const { stdout } = await execPromise(command);
      const containerId = stdout.trim();
      console.log(`Container created: ${containerId}`);

      // Give PostgreSQL time to initialize
      await new Promise(resolve => setTimeout(resolve, 5000));

      try {
        // Wait and verify authentication
        await waitForPostgreSQLContainer(containerName, username, password);

        const { stdout: portMapping } = await execPromise(`docker port ${containerName} 5432`);
        const hostPort = portMapping.split(':')[1].trim();

        const url = `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@localhost:${hostPort}/${name}?sslmode=disable`;
        console.log(`PostgreSQL connection established: ${url}`);
        return { type: 'postgresql', name, url, containerId, containerName };
      } catch (authError) {
        // If authentication fails, safely remove container
        console.error('Authentication error:', authError.message);
        await safeRemoveContainer(containerName);
        throw new Error('Failed to authenticate: Invalid credentials');
      }
    } catch (error) {
      console.error('Error in createPostgreSQLConnection:', error);
      // Ensure cleanup happens safely
      await safeRemoveContainer(containerName);
      throw error;
    }
  } else if (normalizedType === 'sqlite') {
    // Simpler approach without volume mounting
    const command = [
      'docker', 'run', '-d',
      '--name', containerName,
      'alpine:latest',
      '/bin/sh', '-c',
      '"apk add --no-cache sqlite && mkdir -p /data && tail -f /dev/null"'
    ].join(' ');
    
    try {
      console.log(`Creating container with name: ${containerName}`);
      console.log(`Executing Docker command: ${command}`);
      
      const { stdout } = await execPromise(command);
      const containerId = stdout.trim();
      console.log(`Container created: ${containerId}`);

      // Wait for SQLite container
      await waitForSQLiteContainer(containerName);

      const dbPath = `/data/${name}.db`;
      console.log(`SQLite database path: ${dbPath}`);
      
      // Create the database file inside the container
      await execPromise(`docker exec ${containerName} touch ${dbPath}`);
      
      return { 
        type: 'sqlite', 
        name, 
        url: dbPath,
        containerId, 
        containerName 
      };
    } catch (error) {
      console.error('Error in createSQLiteConnection:', error);
      try {
        await exports.removeDatabaseContainer(containerName);
      } catch (cleanupError) {
        console.error('Error cleaning up container:', cleanupError);
      }
      throw error;
    }
  } else if (normalizedType === 'redis') {
    const command = `docker run -d --name ${containerName} \
      -p 6379 \
      redis:latest`;
    
    try {
      console.log(`Creating container with name: ${containerName}`);
      console.log(`Executing Docker command: ${command}`);
      const { stdout } = await execPromise(command);
      const containerId = stdout.trim();
      console.log(`Container created: ${containerId}`);

      await waitForRedisContainer(containerName);

      const { stdout: portMapping } = await execPromise(`docker port ${containerName} 6379`);
      const hostPort = portMapping.split(':')[1].trim();

      const url = `redis://localhost:${hostPort}`;
      console.log(`Redis connection established: ${url}`);
      return { type: 'redis', name, url, containerId, containerName };
    } catch (error) {
      console.error('Error in createRedisConnection:', error);
      try {
        await exports.removeDatabaseContainer(containerName);
      } catch (cleanupError) {
        console.error('Error cleaning up container:', cleanupError);
      }
      throw error;
    }
  } else if (normalizedType === 'cassandra') {
    try {
      const command = `docker run -d --name ${containerName} \
        -p 9042:9042 \
        -e CASSANDRA_CLUSTER_NAME=MyCluster \
        -e CASSANDRA_DC=datacenter1 \
        -e CASSANDRA_BROADCAST_ADDRESS=localhost \
        -e CASSANDRA_LISTEN_ADDRESS=localhost \
        -e CASSANDRA_RPC_ADDRESS=0.0.0.0 \
        -e CASSANDRA_AUTHENTICATOR=PasswordAuthenticator \
        -e CASSANDRA_SUPERUSER_USERNAME=${username} \
        -e CASSANDRA_SUPERUSER_PASSWORD=${password} \
        cassandra:4.1`;
      
      console.log('Pulling Cassandra image...');
      await execPromise('docker pull cassandra:4.1');
      
      console.log(`Creating container with name: ${containerName}`);
      const { stdout } = await execPromise(command);
      const containerId = stdout.trim();
      console.log(`Container created: ${containerId}`);

      // Wait for Cassandra to be fully initialized
      console.log('Waiting for Cassandra to initialize...');
      let isReady = false;
      const maxAttempts = 30;
      for (let i = 0; i < maxAttempts; i++) {
        try {
          await new Promise(resolve => setTimeout(resolve, 10000));
          const { stdout: logs } = await execPromise(`docker logs ${containerName}`);
          if (logs.includes('Starting listening for CQL clients')) {
            console.log('Cassandra is ready to accept connections');
            isReady = true;
            break;
          }
        } catch (error) {
          console.log(`Attempt ${i + 1}/${maxAttempts}: Waiting for Cassandra...`);
        }
      }

      if (!isReady) {
        throw new Error('Cassandra failed to initialize in time');
      }

      // Additional wait to ensure system is fully operational
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Verify connection with the new superuser credentials
      try {
        const verifyCmd = `docker exec ${containerName} cqlsh -u ${username} -p ${password} -e "SELECT now() FROM system.local;"`;
        await execPromise(verifyCmd);
        console.log('Successfully connected with new superuser credentials');

        // Create keyspace
        const createKeyspaceCmd = `docker exec ${containerName} cqlsh -u ${username} -p ${password} -e "CREATE KEYSPACE IF NOT EXISTS ${name} WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};"`;
        await execPromise(createKeyspaceCmd);
        console.log(`Created keyspace: ${name}`);
      } catch (error) {
        console.error('Error verifying connection:', error);
        throw error;
      }

      return { 
        type: 'cassandra', 
        name,
        url: 'localhost:9042',  // Use fixed port 9042
        containerId, 
        containerName,
        username,
        password
      };
    } catch (error) {
      console.error('Error in createCassandraConnection:', error);
      try {
        await exports.removeDatabaseContainer(containerName);
      } catch (cleanupError) {
        console.error('Error cleaning up container:', cleanupError);
      }
      throw error;
    }
  } else if (normalizedType === 'mariadb') {
    const imageName = 'mariadb:10.6';
    
    try {
      // Try to pull the image first with retries
      const pullSuccess = await pullDockerImage(imageName);
      if (!pullSuccess) {
        // If pull fails, try to use a local image if available
        const { stdout: localImages } = await execPromise('docker images mariadb --format "{{.Repository}}:{{.Tag}}"');
        if (!localImages) {
          throw new Error(
            'Failed to pull MariaDB image and no local image found. ' +
            'Please check your internet connection or try manually pulling the image with: ' +
            `docker pull ${imageName}`
          );
        }
        console.log('Using existing local MariaDB image');
      }

      const command = `docker run -d --name ${containerName} \
        -p 3306 \
        -e MYSQL_ROOT_PASSWORD=${password} \
        -e MYSQL_DATABASE=${name} \
        -e MYSQL_USER=${username} \
        -e MYSQL_PASSWORD=${password} \
        ${imageName}`;
      
      console.log(`Creating container with name: ${containerName}`);
      console.log(`Executing Docker command: ${command}`);
      const { stdout } = await execPromise(command);
      const containerId = stdout.trim();
      console.log(`Container created: ${containerId}`);

      await waitForMariaDBContainer(containerName, username, password);

      const { stdout: portMapping } = await execPromise(`docker port ${containerName} 3306`);
      const hostPort = portMapping.split(':')[1].trim();

      const url = `mysql://${username}:${password}@localhost:${hostPort}/${name}`;
      console.log(`MariaDB connection established: ${url}`);
      return { type: 'mariadb', name, url, containerId, containerName };
    } catch (error) {
      console.error('Error in createMariaDBConnection:', error);
      if (error.message.includes('Failed to pull MariaDB image')) {
        throw new Error(
          'Connection failed. Please ensure:\n' +
          '1. You have a working internet connection\n' +
          '2. Docker is running and accessible\n' +
          '3. You have permissions to pull Docker images\n' +
          `4. Try manually pulling the image: docker pull ${imageName}`
        );
      }
      try {
        await exports.removeDatabaseContainer(containerName);
      } catch (cleanupError) {
        console.error('Error cleaning up container:', cleanupError);
      }
      throw error;
    }
  } else {
    throw new Error(`Unsupported database type: ${type}. Supported types are: mysql, mongodb, postgresql, sqlite, redis, cassandra, mariadb`);
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

exports.createRedisConnection = async (name, username, password) => {
  try {
    const containerName = `redis-${name}-${Date.now()}`;
    
    // Start Redis with password authentication
    const runCmd = password
      ? `docker run -d --name ${containerName} -p 6379 redis:latest --requirepass "${password}"`
      : `docker run -d --name ${containerName} -p 6379 redis:latest`;
    
    console.log('Executing Docker command:', runCmd);
    const { stdout: containerId } = await execPromise(runCmd);
    console.log('Container created:', containerId);

    // Wait for Redis to be ready
    await waitForRedisContainer(containerName, username, password);

    // Get the port mapping
    const { stdout: portMapping } = await execPromise(`docker port ${containerName} 6379`);
    const hostPort = portMapping.split(':')[1].trim();

    // Construct connection URL
    const url = password
      ? `redis://:${password}@localhost:${hostPort}`
      : `redis://localhost:${hostPort}`;
      
    console.log(`Redis connection established: ${url}`);
    return { type: 'redis', name, url, containerId, containerName };
  } catch (error) {
    console.error('Error in createRedisConnection:', error);
    // ... rest of error handling
  }
};

// Helper function to safely remove container
const safeRemoveContainer = async (containerName) => {
  try {
    // Check if container exists first
    const { stdout: containers } = await execPromise('docker ps -a --format "{{.Names}}"');
    if (containers.includes(containerName)) {
      await execPromise(`docker rm -f ${containerName}`);
      console.log(`Container ${containerName} removed`);
    }
  } catch (error) {
    console.log(`Container ${containerName} was already removed or doesn't exist`);
  }
};