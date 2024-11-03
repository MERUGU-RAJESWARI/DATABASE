const express = require('express');
const router = express.Router();
const Docker = require('dockerode');

const docker = new Docker({
  socketPath: process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock'
});

// GET /api/containers
router.get('/', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const mongoContainers = containers
      .filter(container => container.Image.includes('mongo'))
      .map(container => ({
        id: container.Id,
        containerName: container.Names[0].replace('/', ''),
        type: 'mongodb',
        status: container.State,
        image: container.Image,
        created: container.Created,
        ports: container.Ports
      }));

    res.json(mongoContainers);
  } catch (error) {
    console.error('Error listing containers:', error);
    res.status(500).json({ 
      error: 'Failed to list containers',
      message: error.message 
    });
  }
});

module.exports = router; 