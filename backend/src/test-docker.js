const Docker = require('dockerode');
const docker = new Docker({
  socketPath: process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock'
});

async function testDocker() {
  try {
    const containers = await docker.listContainers({ all: true });
    console.log('Docker is accessible!');
    console.log('Found containers:', containers.length);
  } catch (error) {
    console.error('Docker error:', error);
  }
}

testDocker(); 