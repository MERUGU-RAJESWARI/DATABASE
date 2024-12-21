import React, { useEffect } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Collapse, Box, Typography } from '@mui/material';


function DockerContainerList({ containers: initialContainers, onContainerDelete }) {
  const [open, setOpen] = React.useState({});
  const [containers, setContainers] = React.useState(initialContainers);

  // Add Docker container monitoring
  useEffect(() => {
    const checkDockerContainers = async () => {
      try {
        // Fetch current Docker containers
        const response = await fetch('http://localhost:5000/api/docker/containers');
        const activeContainers = await response.json();
        
        // Get container names/IDs from Docker
        const activeContainerIds = activeContainers.map(c => c.Id);
        const activeContainerNames = activeContainers.map(c => c.Names[0].replace('/', ''));

        // Update UI state by filtering out containers that no longer exist in Docker
        setContainers(prevContainers => 
          prevContainers.filter(container => {
            const containerExists = activeContainerNames.includes(container.name) || 
                                  activeContainerIds.includes(container.containerId);
            
            // If container doesn't exist anymore, notify parent
            if (!containerExists && onContainerDelete) {
              onContainerDelete(container.name || container.containerName);
            }
            
            return containerExists;
          })
        );
      } catch (error) {
        console.error('Error checking Docker containers:', error);
      }
    };

    // Check immediately and then every 2 seconds
    checkDockerContainers();
    const interval = setInterval(checkDockerContainers, 2000);

    return () => clearInterval(interval);
  }, [onContainerDelete]);

  const handleClick = (containerName) => {
    setOpen(prev => ({ ...prev, [containerName]: !prev[containerName] }));
  };

 

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Image</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Port(s)</TableCell>
            <TableCell>Created</TableCell>
           
          </TableRow>
        </TableHead>
        <TableBody>
          {containers.map((container) => (
            <React.Fragment key={container.containerName}>
              <TableRow onClick={() => handleClick(container.containerName)} style={{cursor: 'pointer'}}>
                <TableCell>{container.containerName}</TableCell>
                <TableCell>{container.image || `${container.type}:latest`}</TableCell>
                <TableCell>{container.status || 'Running'}</TableCell>
                <TableCell>{container.ports || '-'}</TableCell>
                <TableCell>{container.created || 'Just now'}</TableCell>
                
              </TableRow>
              <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                  <Collapse in={open[container.containerName]} timeout="auto" unmountOnExit>
                    <Box margin={1}>
                      <Typography variant="h6" gutterBottom component="div">
                        Sample Data
                      </Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Email</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {container.sampleData && (
                            <TableRow>
                              <TableCell>{container.sampleData.name}</TableCell>
                              <TableCell>{container.sampleData.email}</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </Box>
                  </Collapse>
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default DockerContainerList;
