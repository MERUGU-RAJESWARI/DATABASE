const express = require('express');
const cors = require('cors');
const Docker = require('dockerode');
const docker = new Docker();
const databaseController = require('./controllers/databaseController');

const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/databases', databaseController.createDatabase);



app.get('/api/docker/containers', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const containerDetails = containers.map(container => ({
      Id: container.Id,
      Names: container.Names,
      Image: container.Image,
      State: container.State,
      Status: container.Status
    }));
    res.json(containerDetails);
  } catch (error) {
    console.error('Error listing containers:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
