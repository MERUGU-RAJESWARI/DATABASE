import React, { useState, useEffect } from 'react';
import DatabaseForm from './components/DatabaseForm';
import { createDatabase, fetchDockerContainers } from './api/databaseApi';

function App() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch containers from Docker on mount and every 30 seconds
  useEffect(() => {
    const fetchContainers = async () => {
      try {
        const dockerContainers = await fetchDockerContainers();
        setContainers(dockerContainers);
        // Store in localStorage
        localStorage.setItem('databaseContainers', JSON.stringify(dockerContainers));
      } catch (error) {
        console.error('Error fetching containers:', error);
      }
    };

    // Initial fetch
    fetchContainers();

    // Set up polling
    const interval = setInterval(fetchContainers, 30000);

    return () => clearInterval(interval);
  }, []);

  // Load containers from localStorage on mount
  useEffect(() => {
    const savedContainers = localStorage.getItem('databaseContainers');
    if (savedContainers) {
      setContainers(JSON.parse(savedContainers));
    }
  }, []);

  const handleSubmit = async (databaseData) => {
    setLoading(true);
    try {
      const createdContainer = await createDatabase(databaseData);
      setContainers(prev => [...prev, createdContainer]);
      localStorage.setItem('databaseContainers', JSON.stringify([...containers, createdContainer]));
    } catch (error) {
      console.error('Error creating database:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Database Management</h1>
      <DatabaseForm 
        onSubmit={handleSubmit}
        loading={loading}
        containers={containers}
      />
    </div>
  );
}

export default App;