import axios from 'axios';
//API client for backend communication

const API_URL = 'http://localhost:5000/api'; 

export const createDatabase = async (databaseData) => {
  try {
    const response = await axios.post(`${API_URL}/databases`, databaseData);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      throw new Error(error.response.data.error || 'Invalid credentials');
    }
    console.error('Error creating database:', error);
    throw error;
  }
};

export const removeDatabase = async (containerName) => {
  try {
    const response = await axios.delete(`${API_URL}/databases/${containerName}`);
    console.log('Remove database response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error removing database:', error);
    throw error;
  }
};

export const fetchDockerContainers = async () => {
  try {
    const response = await axios.get(`${API_URL}/containers`);
    if (!response.ok) {
      throw new Error('Failed to fetch containers');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching containers:', error);
    throw error;
  }
};
