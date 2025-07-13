import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Card, CardContent, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Button } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { getCurrentMonth } from '../utils/contributions';
import { getContributionAmountForToday } from '../utils/contributions';
import { useNavigate } from 'react-router-dom';
import Backdrop from '@mui/material/Backdrop';
import { PulseLoader } from 'react-spinners';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A020F0', '#FF69B4', '#36d7b7', '#f44336'];

function GroupDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [memberData, setMemberData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [previousContribution, setPreviousContribution] = useState(0);
  const [error, setError] = useState('');
  const [memberList, setMemberList] = useState<any[]>([]); // [{name, username, paid, amount}]

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch group (assume only one group for now)
        const groupSnap = await getDocs(collection(db, 'groups'));
        let prev = 0;
        if (!groupSnap.empty) {
          const group = groupSnap.docs[0].data();
          prev = group.previousContribution ? Number(group.previousContribution) : 0;
          setPreviousContribution(prev);
        }
        // Fetch all members
        const membersSnap = await getDocs(collection(db, 'members'));
        const members = membersSnap.docs.map(doc => doc.data());
        console.log('All members:', members);
        // Fetch all paid contributions
        const contribSnap = await getDocs(query(collection(db, 'contribution'), where('status', '==', 'paid')));
        const contributions = contribSnap.docs.map(doc => doc.data());
        console.log('All paid contributions:', contributions);
        // Calculate member-wise totals with fine rules
        const memberTotals: Record<string, number> = {};
        contributions.forEach(c => {
          // Use username instead of userEmail for consistency
          const key = c.username || c.userEmail;
          if (!memberTotals[key]) memberTotals[key] = 0;
          // Use the calculated amount with fine rules instead of stored amount
          const calculatedAmount = getContributionAmountForToday();
          memberTotals[key] += calculatedAmount;
        });
        
        // Map to member names for pie chart
        const memberPie = members.map(m => ({
          name: m.name,
          value: memberTotals[m.username] || 0,
        })).filter(item => item.value > 0); // Only show members with contributions
        
        console.log('Member totals:', memberTotals);
        console.log('Member pie data:', memberPie);
        console.log('Total contributions found:', contributions.length);
        setMemberData(memberPie);
        // Calculate monthly totals for bar chart with fine rules
        const monthTotals: Record<string, number> = {};
        contributions.forEach(c => {
          if (!monthTotals[c.month]) monthTotals[c.month] = 0;
          // Use the calculated amount with fine rules instead of stored amount
          const calculatedAmount = getContributionAmountForToday();
          monthTotals[c.month] += calculatedAmount;
        });
        const monthlyArr = Object.entries(monthTotals).map(([month, total]) => ({ month, total }));
        // Sort months (optional, by date string)
        monthlyArr.sort((a, b) => a.month.localeCompare(b.month));
        setMonthlyData(monthlyArr);
        // Calculate total with fine rules
        const calculatedAmount = getContributionAmountForToday();
        const totalPaid = contributions.length * calculatedAmount; // Each contribution should include fines
        setTotal(totalPaid + prev);

        // Fetch all members
        const membersSnapAll = await getDocs(collection(db, 'members'));
        const membersAll = membersSnapAll.docs.map(doc => doc.data());
        // Fetch all paid and pending contributions for current month
        const currentMonth = getCurrentMonth();
        const contribSnapAll = await getDocs(query(collection(db, 'contribution'), where('month', '==', currentMonth)));
        const contribsAll = contribSnapAll.docs.map(doc => doc.data());
        // Map member to their paid status and amount for current month
        const memberList = membersAll.map(m => {
          const c = contribsAll.find(c => c.username === m.username);
          const calculatedAmount = getContributionAmountForToday();
          return {
            name: m.name,
            username: m.username,
            paid: c?.status === 'paid',
            amount: calculatedAmount, // Use calculated amount with fine rules
          };
        });
        setMemberList(memberList);

      } catch (e) {
        setError('Failed to fetch dashboard data');
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (error) {
    return <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Typography color="error">{error}</Typography></Box>;
  }

  return (
    <>
      <Backdrop open={loading} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, backdropFilter: 'blur(4px)' }}>
        <PulseLoader color="#36d7b7" size={20} margin={6} />
      </Backdrop>
      <Box sx={{ minHeight: '100vh', bgcolor: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', py: 4 }}>
        <Container maxWidth="lg">
          <Button variant="outlined" color="primary" sx={{ mb: 3 }} onClick={() => navigate('/my-contributions')}>
            Back to Home
          </Button>
          <Typography variant="h3" align="center" gutterBottom sx={{ fontWeight: 700, color: '#333', mb: 4 }}>
            Group Dashboard
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', mb: 4 }}>
            <Card sx={{ bgcolor: '#36d7b7', color: 'white', boxShadow: 6, minWidth: 280, flex: '1 1 300px' }}>
              <CardContent>
                <Typography variant="h6">Total Contributions</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>₹{total.toLocaleString()}</Typography>
                <Typography variant="body2">Including previous: ₹{previousContribution.toLocaleString()}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Per member: ₹{getContributionAmountForToday()} (includes fines)
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, mt: 2 }}>
            <Paper sx={{ p: 3, boxShadow: 4, flex: '2 1 400px', minWidth: 320 }}>
              <Typography variant="h6" gutterBottom>Monthly Contributions</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#36d7b7" radius={[8,8,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
            <Paper sx={{ p: 3, boxShadow: 4, flex: '1 1 300px', minWidth: 280 }}>
              <Typography variant="h6" gutterBottom>Group Contribution Distribution</Typography>
              {memberData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={memberData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label
                    >
                      {memberData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ 
                  height: 300, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexDirection: 'column',
                  color: '#666'
                }}>
                  <Typography variant="h6" color="text.secondary">
                    No contribution data available
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Members need to make payments to see the pie chart
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
          <Box sx={{ mt: 5 }}>
            <Typography variant="h6" gutterBottom>All Group Members - Current Month Status</Typography>
            <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {memberList.map((m, idx) => (
                    <TableRow key={m.username || idx}>
                      <TableCell>{m.name}</TableCell>
                      <TableCell>₹{m.amount}</TableCell>
                      <TableCell>
                        {m.paid ? (
                          <Chip label="Paid" color="success" size="small" />
                        ) : (
                          <Chip label="Not Paid" color="error" size="small" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Container>
      </Box>
    </>
  );
}

export default GroupDashboard; 