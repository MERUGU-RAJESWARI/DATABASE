import React from 'react';
import { Typography, Paper, Box } from '@mui/material';

function ConnectionInfo({ connectionInfo }) {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Connection Information
      </Typography>
      <Paper elevation={2} sx={{ p: 2 }}>
        <pre>{JSON.stringify(connectionInfo, null, 2)}</pre>
      </Paper>
    </Box>
  );
}

export default ConnectionInfo;