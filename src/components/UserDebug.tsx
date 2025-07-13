import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Alert,
  Button
} from '@mui/material';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

const UserDebug: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'members'));
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography>Loading users...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">User Debug Information</Typography>
        <Button variant="outlined" onClick={loadUsers}>Refresh</Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 2 }}>
        This page shows all users created by the admin. Use these credentials to test login.
      </Alert>

      {users.length === 0 ? (
        <Alert severity="warning">
          No users found. Please create users using the admin panel first.
        </Alert>
      ) : (
        <>
          <Typography variant="h6" gutterBottom>
            Total Users: {users.length}
          </Typography>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>ID</strong></TableCell>
                  <TableCell><strong>Name</strong></TableCell>
                  <TableCell><strong>Username</strong></TableCell>
                  <TableCell><strong>Password</strong></TableCell>
                  <TableCell><strong>Group ID</strong></TableCell>
                  <TableCell><strong>Must Change Password</strong></TableCell>
                  <TableCell><strong>Created At</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>
                      <code>{user.username}</code>
                    </TableCell>
                    <TableCell>
                      <code>{user.password}</code>
                    </TableCell>
                    <TableCell>{user.groupId || 'N/A'}</TableCell>
                    <TableCell>
                      {user.mustChangePassword ? 'Yes' : 'No'}
                    </TableCell>
                    <TableCell>
                      {user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Login Instructions:
            </Typography>
            <Alert severity="success">
              <Typography variant="body2">
                1. Go to the login page<br/>
                2. Use any username and password from the table above<br/>
                3. If "Must Change Password" is "Yes", you'll be prompted to change it<br/>
                4. After login, you'll be redirected to your contributions page
              </Typography>
            </Alert>
          </Box>
        </>
      )}
    </Container>
  );
};

export default UserDebug; 