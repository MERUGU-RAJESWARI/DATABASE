//RAJESWARI
//RAJESWARI123
//rajeswari12345
import React, { useState } from 'react';
import {
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Grid,
  Alert,
  Snackbar
} from '@mui/material';
import DockerContainerList from './DockerContainerList';

 

function DatabaseForm({ onSubmit, onRemove, loading, containers = [] }) {
  const [dbType, setDbType] = useState('mongodb');
  const [dbName, setDbName] = useState('');
  const [dbUsername, setDbUsername] = useState('');
  const [dbPassword, setDbPassword] = useState('');
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
   

    try {
      await onSubmit({ type: dbType, name: dbName, username: dbUsername, password: dbPassword });
      // Reset form on success
      setDbName('');
      setDbUsername('');
      setDbPassword('');
      setError('');
    } catch (err) {
      setError(err.message);
      setShowError(true);
    }
  };

  const handleCloseError = () => {
    setShowError(false);
  };

  return (
    <>
      <Snackbar open={showError} autoHideDuration={6000} onClose={handleCloseError}>
        <Alert onClose={handleCloseError} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
           
          </Grid>
          
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
               
                <MenuItem value="Sqlite">Sqlite</MenuItem>
                <MenuItem value="Redis">Redis</MenuItem>
                <MenuItem value="MariaDB">MariaDB</MenuItem>
                

                
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
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Username"
           
              value={dbUsername}
              onChange={(e) => setDbUsername(e.target.value)}
              required
          
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Password"
              type="password"
            
              value={dbPassword}
              onChange={(e) => setDbPassword(e.target.value)}
              required
             
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
              {loading ? 'Creating...' : 'Create Database'}
            </Button>
          </Grid>
          {/* <Grid item xs={12} sm={6}>
            <Button
              fullWidth
              variant="contained"
              color="secondary"
              onClick={() => onRemove(dbName)}
              disabled={loading || !dbName}
            >
              Remove Database
            </Button>
          </Grid> */}
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