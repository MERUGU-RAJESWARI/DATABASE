import React from 'react';
import { List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Collapse } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DockerContainerList from './DockerContainerList';

function DatabaseList({ databases, onEdit, onDelete }) {
  const [expanded, setExpanded] = React.useState({});

  const handleExpand = (dbName) => {
    setExpanded(prev => ({ ...prev, [dbName]: !prev[dbName] }));
  };

  return (
    <List>
      {databases.map((db) => (
        <React.Fragment key={db.name}>
          <ListItem>
            <ListItemText primary={db.name} secondary={`Type: ${db.type}`} />
            <ListItemSecondaryAction>
              <IconButton edge="end" aria-label="expand" onClick={() => handleExpand(db.name)}>
                {expanded[db.name] ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              <IconButton edge="end" aria-label="edit" onClick={() => onEdit(db)}>
                <EditIcon />
              </IconButton>
              <IconButton edge="end" aria-label="delete" onClick={() => onDelete(db.name)}>
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
          <Collapse in={expanded[db.name]} timeout="auto" unmountOnExit>
            <DockerContainerList containers={[db]} />
          </Collapse>
        </React.Fragment>
      ))}
    </List>
  );
}

export default DatabaseList;
