const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORAGE_FILE = path.join(DATA_DIR, 'databases.json');

async function ensureDirectoryExists() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

exports.saveDatabases = async (databases) => {
  await ensureDirectoryExists();
  await fs.writeFile(STORAGE_FILE, JSON.stringify(databases, null, 2));
};

exports.loadDatabases = async () => {
  await ensureDirectoryExists();
  try {
    const data = await fs.readFile(STORAGE_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, create it with an empty array
      await this.saveDatabases([]);
      return [];
    }
    throw error;
  }
};
