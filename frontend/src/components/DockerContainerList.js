import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Collapse, Box, Typography } from '@mui/material';

function DockerContainerList({ containers }) {
  const [open, setOpen] = React.useState({});

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
