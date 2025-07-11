import React, { useState } from 'react';
import { Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

const initialMembers = [
  { email: 'alice@example.com', name: 'Alice', paid: false },
  { email: 'bob@example.com', name: 'Bob', paid: true },
  { email: 'carol@example.com', name: 'Carol', paid: false },
  { email: 'dave@example.com', name: 'Dave', paid: true },
  { email: 'eve@example.com', name: 'Eve', paid: false },
  { email: 'frank@example.com', name: 'Frank', paid: false },
  { email: 'grace@example.com', name: 'Grace', paid: true },
  { email: 'heidi@example.com', name: 'Heidi', paid: false },
];

function getContributionAmount() {
  const today = new Date().getDate();
  if (today >= 1 && today <= 5) return 1000;
  if (today >= 6 && today <= 10) return 1100;
  return 1600;
}

function Dashboard() {
  const [members] = useState(initialMembers);
  const amount = getContributionAmount();
  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Group Dashboard</Typography>
      <Typography variant="subtitle1" gutterBottom>
        This month's contribution: <b>₹{amount}</b>
      </Typography>
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.email}>
                <TableCell>{member.name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>
                  {member.paid ? (
                    <span style={{ color: 'green' }}>Paid</span>
                  ) : (
                    <span style={{ color: 'red' }}>Pending</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
}

export default Dashboard; 