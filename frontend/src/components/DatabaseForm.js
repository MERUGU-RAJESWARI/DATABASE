import React, { useState } from 'react';
import {
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography ,
  Grid,
} from '@mui/material';
import DockerContainerList from './DockerContainerList';

function DatabaseForm({ onSubmit, onRemove, loading, containers = [] }) {
  const [dbType, setDbType] = useState('mongodb');
  const [dbName, setDbName] = useState('');
  const [dbUsername, setDbUsername] = useState('');
  const [dbPassword, setDbPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    
    try {
      const response = await onSubmit({ type: dbType, name: dbName, username: dbUsername, password: dbPassword });
      // Handle successful creation
    } catch (error) {
      if (error.response?.status === 401) {
        setError('Invalid username or password. Please use username: durga and password: durga@2699');
      } else {
        setError('An error occurred while creating the database. Please try again.');
      }
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="db-type-label">Database Type</InputLabel>
              <Select
                labelId="db-type-label"
                value={dbType}
                label="Database Type"
                onChange={(e) => setDbType(e.target.value)}
              >
                <MenuItem value="mongodb">MongoDB</MenuItem>
                <MenuItem value="mysql">MySQL</MenuItem>
                <MenuItem value="postgresql">PostgreSQL</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Database Name"
              variant="outlined"
              value={dbName}
              onChange={(e) => setDbName(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Username"
              variant="outlined"
              value={dbUsername}
              onChange={(e) => setDbUsername(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Password"
              type="password"
              variant="outlined"
              value={dbPassword}
              onChange={(e) => setDbPassword(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              type="submit"
              disabled={loading || !dbName || !dbUsername || !dbPassword}
            >
              Create Database
            </Button>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              onClick={() => onRemove(dbName)}
              disabled={loading || !dbName}
            >
              Remove Database
            </Button>
          </Grid>
        </Grid>
      </form>
      {containers && containers.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            Docker Containers
          </Typography>
          <DockerContainerList containers={containers} />
        </>
      )}
    </>
  );
}

export default DatabaseForm;
