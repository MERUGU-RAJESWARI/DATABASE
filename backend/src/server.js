const express = require('express');
const cors = require('cors');
const Docker = require('dockerode');
const docker = new Docker();
const databaseController = require('./controllers/databaseController');

const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/databases', databaseController.createDatabase);

app.post('/api/docker/databases', async (req, res) => {
  try {
    const { type, name, username, password } = req.body;
    
    let containerConfig;
    if (type === 'postgresql') {
      containerConfig = {
        Image: 'postgres:latest',
        name: `postgresql-${name}`,
        Env: [
          'POSTGRES_USER=postgres',
          `POSTGRES_PASSWORD=${password}`,
          `POSTGRES_DB=${name}`
        ],
        ExposedPorts: { '5432/tcp': {} },
        HostConfig: {
          PortBindings: { '5432/tcp': [{ HostPort: '5432' }] }
        }
      };
    } else if (type === 'mongodb') {
      containerConfig = {
        Image: 'mongo:latest',
        name: `mongodb-${name}`,
        Env: [
          `MONGO_INITDB_ROOT_USERNAME=${username}`,
          `MONGO_INITDB_ROOT_PASSWORD=${password}`
        ],
        ExposedPorts: { '27017/tcp': {} },
        HostConfig: {
          PortBindings: { '27017/tcp': [{ HostPort: '27017' }] }
        }
      };
    } else if (type === 'mysql') {
      containerConfig = {
        Image: 'mysql:latest',
        name: `mysql-${name}`,
        Env: [
          `MYSQL_ROOT_PASSWORD=${password}`,
          `MYSQL_USER=${username}`,
          `MYSQL_PASSWORD=${password}`,
          `MYSQL_DATABASE=${name}`
        ],
        ExposedPorts: { '3306/tcp': {} },
        HostConfig: {
          PortBindings: { '3306/tcp': [{ HostPort: '3306' }] }
        }
      };
    }

    const container = await docker.createContainer(containerConfig);
    await container.start();

    const containerInfo = await container.inspect();
    
    res.json({
      id: containerInfo.Id,
      name: containerInfo.Name,
      type,
      status: containerInfo.State.Status,
      ports: containerInfo.NetworkSettings.Ports
    });
  } catch (error) {
    console.error('Error creating container:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/docker/containers', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const databaseContainers = containers.filter(container => 
      container.Image.includes('mongo') || container.Image.includes('mysql')
    );
    res.json(databaseContainers);
  } catch (error) {
    console.error('Error listing containers:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
