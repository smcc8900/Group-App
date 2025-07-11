import React, { useEffect, useState } from 'react';
import { Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Box, Alert, Card, CardContent, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, getDocs } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { fetchAndStorePaymentSettings, getStoredPaymentSettings, PaymentSettings, getStoredGroupInfo } from '../utils/paymentSettings';
import {
  getCurrentMonth,
  getContributionAmountForToday,
  getTimeLeft,
  getTimeLeftToNextMonth,
  getUpiQrString
} from '../utils/contributions';
import { generateReceiptPDF } from '../utils/receipt';
import { useNavigate, useLocation } from 'react-router-dom';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Backdrop from '@mui/material/Backdrop';
import { PulseLoader } from 'react-spinners';

interface Contribution {
  id: string;
  amount: number;
  month: string;
  status: string; // 'paid' | 'pending'
  dueDate?: string;
  paidDate?: string; // Added for paidDate
}

function MyContributions() {
  const [username, setUsername] = useState<string | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [paymentUploading, setPaymentUploading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [pendingPayment, setPendingPayment] = useState<any | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [statusAlert, setStatusAlert] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // On mount, get member from localStorage
  useEffect(() => {
    const memberStr = localStorage.getItem('member');
    if (memberStr) {
      const member = JSON.parse(memberStr);
      setUsername(member.username);
    } else {
      setUsername(null);
    }
  }, []);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, 'contribution'), where('username', '==', username));
    const unsub = onSnapshot(q, (snapshot) => {
      setContributions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contribution)));
      setLoading(false);
    }, (err) => {
      setError('Failed to fetch contributions');
      setLoading(false);
    });
    return () => unsub();
  }, [username]);

  // Timer to update countdowns every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const currentMonth = getCurrentMonth();
  const thisMonth = contributions.find(c => c.month === currentMonth);
  const groupInfo = getStoredGroupInfo();
  const defaultAmount = getContributionAmountForToday();
  const paymentLink = 'upi://pay?pa=your-upi-id@bank&pn=GroupContribution&am=' + (thisMonth?.amount || defaultAmount);
  const upcoming = contributions.filter(c => c.status === 'pending' && c.month > currentMonth);

  // Exclude current month from all payments
  const allPayments = contributions.filter(c => c.month !== currentMonth);

  // Find previous pending bills
  const previousPending = contributions.filter(c => c.status === 'pending' && c.month < currentMonth);
  const currentPending = thisMonth && thisMonth.status === 'pending' ? [thisMonth] : [];
  const allPending = [...previousPending, ...currentPending];
  const totalDue = allPending.reduce((sum, c) => sum + (c.amount || 0), 0) || (thisMonth && thisMonth.status === 'pending' ? defaultAmount : 0);

  // Get payment settings from localStorage
  const paymentSettings: PaymentSettings | null = getStoredPaymentSettings();

  // Check for latest payment request for this user/month
  useEffect(() => {
    if (!username || !currentMonth) {
      setPendingPayment(null);
      setPaymentStatus('none');
      return;
    }
    let unsub: (() => void) | undefined;
    if (paymentSettings && !paymentSettings.gatewayEnabled && paymentSettings.upiId) {
      const q = query(collection(db, 'payment_requests'), where('username', '==', username), where('month', '==', currentMonth));
      unsub = onSnapshot(q, (snap) => {
        if (snap.docs.length > 0) {
          // Get the latest request (by createdAt)
          const sorted = snap.docs.map(d => d.data()).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          setPendingPayment(sorted[0]);
          setPaymentStatus(sorted[0].status || 'none');
        } else {
          setPendingPayment(null);
          setPaymentStatus('none');
        }
      });
    } else {
      setPendingPayment(null);
      setPaymentStatus('none');
    }
    return () => { if (unsub) unsub(); };
  }, [username, currentMonth, paymentSettings]);

  // Show notification when payment is accepted or rejected
  useEffect(() => {
    if (paymentStatus === 'accepted') {
      setStatusAlert('Your payment has been approved!');
    } else if (paymentStatus === 'rejected') {
      setStatusAlert('Your payment was rejected. Please try again.');
    } else {
      setStatusAlert(null);
    }
  }, [paymentStatus]);

  // Payment submit handler
  const handlePaymentSubmit = async () => {
    setPaymentError('');
    setPaymentSuccess('');
    if (!username) return;
    if (!paymentScreenshot) {
      setPaymentError('Please upload payment screenshot');
      return;
    }
    setPaymentUploading(true);
    try {
      // Generate paymentID: PI + ddmmyyyy + random 4-digit number
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const rand = Math.floor(1000 + Math.random() * 9000);
      const paymentID = `PI${dd}${mm}${yyyy}${rand}`;
      // For demo: store screenshot as base64 in Firestore (in production, use storage!)
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result;
        await addDoc(collection(db, 'payment_requests'), {
          username: username,
          month: currentMonth,
          amount: thisMonth?.amount ?? defaultAmount,
          upiId: paymentSettings?.upiId,
          screenshot: base64,
          status: 'pending',
          createdAt: new Date().toISOString(),
          paymentID,
        });
        setPaymentSuccess('Payment submitted for admin review!');
        setPayDialogOpen(false);
        setPaymentScreenshot(null);
      };
      reader.readAsDataURL(paymentScreenshot);
    } catch (err) {
      setPaymentError('Failed to submit payment');
    } finally {
      setPaymentUploading(false);
    }
  };

  // Determine UI state for current month
  let showPaid = !!thisMonth && thisMonth.status === 'paid';
  let showPending = false;
  let showRejected = false;
  let canPay = false;
  let canDownloadReceipt = false;

  if (thisMonth) {
    if (thisMonth.status === 'paid') {
      showPaid = true;
      canDownloadReceipt = true;
      canPay = false;
    } else if (thisMonth.status === 'pending') {
      showPending = true;
      canPay = true;
      canDownloadReceipt = false;
    } else if (thisMonth.status === 'rejected') {
      showRejected = true;
      canPay = true;
      canDownloadReceipt = false;
    } else {
      canPay = true;
      canDownloadReceipt = false;
    }
  } else {
    // No record for this month
    if (paymentStatus === 'accepted') {
      // Edge case: payment accepted but not yet marked paid in contributions
      canDownloadReceipt = true;
      canPay = false;
    } else if (paymentStatus === 'pending') {
      showPending = true;
      canPay = false;
      canDownloadReceipt = false;
    } else if (paymentStatus === 'rejected') {
      showRejected = true;
      canPay = true;
      canDownloadReceipt = false;
    } else {
      canPay = true;
      canDownloadReceipt = false;
    }
  }

  // For receipt, prefer paymentID from payment request if available
  let receiptPaymentID: string | null = null;
  if (pendingPayment && pendingPayment.paymentID) {
    receiptPaymentID = pendingPayment.paymentID;
  }

  const handleDownloadReceipt = async () => {
    if (!username) return;
    let amount = thisMonth?.amount ?? defaultAmount;
    let status = thisMonth?.status ?? (paymentStatus === 'accepted' ? 'paid' : 'pending');
    let paidDate = thisMonth?.paidDate || (paymentStatus === 'accepted' ? new Date().toLocaleDateString() : '-');
    let paymentID = receiptPaymentID;
    generateReceiptPDF({
      userEmail: username,
      month: currentMonth,
      amount,
      status,
      paidDate,
      paymentID: paymentID || undefined,
    });
  };

  const handleDownloadReceiptFor = async (contribution: Contribution) => {
    if (!username) return;
    let paymentID = receiptPaymentID;
    generateReceiptPDF({
      userEmail: username,
      month: contribution.month,
      amount: contribution.amount,
      status: contribution.status,
      paidDate: contribution.paidDate || new Date().toLocaleDateString(),
      paymentID: paymentID || undefined,
    });
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (!username) {
    return <Container sx={{ mt: 8 }}><Alert severity="info">Please log in to view your contributions.</Alert></Container>;
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f6f8fa', py: 4 }}>
      <Container maxWidth="md" sx={{ px: { xs: 0.5, sm: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" gutterBottom>My Contributions</Typography>
          <Button variant="outlined" color="error" onClick={handleLogout}>Logout</Button>
        </Box>
        {location.pathname.includes('group-dashboard') && (
          <Button variant="outlined" color="primary" sx={{ mb: 2 }} onClick={() => navigate('/my-contributions')}>
            Back to Home
          </Button>
        )}
        {/* Tab Menu */}
        <Tabs
          value={location.pathname === '/group-dashboard' ? 1 : 0}
          onChange={(_, v) => {
            if (v === 0) navigate('/my-contributions');
            else navigate('/group-dashboard');
          }}
          sx={{ mb: 3 }}
        >
          <Tab label="My Contributions" />
          <Tab label="Group Dashboard" />
        </Tabs>
        {loading ? <CircularProgress /> : (
          <>
            {/* Show previous pending bills if any */}
            {allPending.length > 1 && (
              <Card sx={{ mb: 3, boxShadow: 4, border: '2px solid #f44336' }}>
                <CardContent>
                  <Typography variant="h6" color="error" gutterBottom>
                    You have previous pending bills!
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}>
                    <b>Total Due (including this month): ₹{totalDue}</b>
                  </Typography>
                  <TableContainer component={Paper} sx={{ mb: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Month</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {allPending.map((c) => (
                          <TableRow key={c.month}>
                            <TableCell>{c.month}</TableCell>
                            <TableCell>₹{c.amount}</TableCell>
                            <TableCell>
                              <span style={{ color: c.status === 'paid' ? 'green' : 'red' }}>
                                {c.status === 'paid' ? 'Paid' : 'Pending'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Typography variant="body2" color="text.secondary">
                    Please pay all pending bills together. Your payment will be adjusted for the oldest pending month first.
                  </Typography>
                </CardContent>
              </Card>
            )}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, mb: 3 }}>
              <Card sx={{ flex: 1, minWidth: 0, mb: { xs: 2, md: 0 }, boxShadow: 4, p: 1 }}>
                <CardContent>
                  <Typography variant="h6">This Month ({currentMonth})</Typography>
                  {paymentSettings && !paymentSettings.gatewayEnabled && (
                    <Typography color="primary" sx={{ mb: 1 }}>
                      <b>Pay via UPI ID:</b> {paymentSettings.upiId || <span style={{color:'red'}}>Not set</span>}
                    </Typography>
                  )}
                  {thisMonth ? (
                    <>
                      <Typography>
                        {thisMonth.status === 'paid' ? (
                          <span style={{ color: 'green' }}>Amount paid: <b>₹{thisMonth.amount ?? defaultAmount}</b></span>
                        ) : (
                          <span style={{ color: 'red' }}>Amount to be paid: <b>₹{thisMonth.amount ?? defaultAmount}</b></span>
                        )}
                      </Typography>
                      <Typography>
                        Status: <b style={{ color: thisMonth.status === 'paid' ? 'green' : 'red' }}>
                          {thisMonth.status === 'paid' ? 'Paid' : 'Pending'}
                        </b>
                      </Typography>
                    </>
                  ) : (
                    paymentStatus === 'accepted' ? (
                      <Typography>
                        <span style={{ color: 'green' }}>Amount paid: <b>₹{defaultAmount}</b></span>
                      </Typography>
                    ) : (
                      <Typography>
                        No contribution record for this month.<br/>
                        <span style={{ color: 'red' }}>Amount to be paid: <b>₹{defaultAmount}</b></span>
                      </Typography>
                    )
                  )}
                  <Button
                    variant="outlined"
                    sx={{ mt: 2, mr: 1 }}
                    onClick={handleDownloadReceipt}
                    disabled={!canDownloadReceipt}
                    fullWidth={false}
                  >
                    Download Receipt
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    sx={{ mt: 2 }}
                    onClick={() => setPayDialogOpen(true)}
                    disabled={loading || !canPay}
                  >
                    Pay
                  </Button>
                  {showPending && (
                    <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                      Approval pending for your payment. Please wait for admin review.
                    </Typography>
                  )}
                  {showRejected && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                      Payment rejected. Please try again.
                    </Typography>
                  )}
                  {showPaid && (
                    <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                      Payment approved! You can now download your receipt.
                    </Typography>
                  )}
                </CardContent>
              </Card>
              <Card sx={{ flex: 1, minWidth: 0, boxShadow: 4, p: 1 }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ textAlign: 'center' }}>Upcoming Payments</Typography>
                  {upcoming.length === 0 ? (
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                        {getTimeLeftToNextMonth(new Date(now))}
                      </Typography>
                      <Typography variant="subtitle1" sx={{ mt: 1 }}>
                        until next payment
                      </Typography>
                    </Box>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 20, textAlign: 'left' }}>
                      {upcoming.map(u => (
                        <li key={u.id} style={{ wordBreak: 'break-word' }}>
                          {u.month} - ₹{u.amount} (Due: {u.dueDate || 'N/A'})
                          {u.dueDate && (
                            <span style={{ marginLeft: 8, color: '#1976d2', fontWeight: 500 }}>
                              {getTimeLeft(u.dueDate)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </Box>
            <Typography variant="h6" sx={{ mt: 2 }}>All Payments:</Typography>
            <Box sx={{ width: '100%', overflowX: 'auto' }}>
              <TableContainer component={Paper} sx={{ minWidth: 400, boxShadow: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Month</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Paid Date</TableCell>
                      <TableCell>Receipt</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allPayments.map(c => (
                      <TableRow key={c.id}>
                        <TableCell>{c.month}</TableCell>
                        <TableCell>₹{c.amount}</TableCell>
                        <TableCell>
                          <span style={{ color: c.status === 'paid' ? 'green' : 'red' }}>
                            {c.status === 'paid' ? 'Paid' : 'Pending'}
                          </span>
                        </TableCell>
                        <TableCell>{c.status === 'paid' ? (c.paidDate || '-') : '-'}</TableCell>
                        <TableCell>
                          <IconButton
                            color="primary"
                            onClick={() => handleDownloadReceiptFor(c)}
                            disabled={c.status !== 'paid'}
                            aria-label="Download Receipt"
                          >
                            <ReceiptIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {statusAlert && (
          <Alert severity={paymentStatus === 'accepted' ? 'success' : 'error'} sx={{ mt: 2 }}>{statusAlert}</Alert>
        )}
        <Box sx={{ mt: 6, textAlign: 'center', color: '#888' }}>
          <Typography variant="body2">Made by Team OwnFactory 💙</Typography>
        </Box>
      </Container>
      {/* Payment Dialog */}
      <Dialog open={payDialogOpen} onClose={() => setPayDialogOpen(false)}>
        <DialogTitle>Make Payment</DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          {paymentSettings && !paymentSettings.gatewayEnabled && paymentSettings.upiId ? (
            <>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Scan this QR code with your UPI app to pay
              </Typography>
              <QRCodeSVG value={getUpiQrString(paymentSettings.upiId, thisMonth?.amount ?? defaultAmount)} size={200} />
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Upload Payment Screenshot (required)</Typography>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setPaymentScreenshot(e.target.files?.[0] || null)}
                  style={{ marginBottom: 8 }}
                />
                {paymentError && <Alert severity="error">{paymentError}</Alert>}
              </Box>
            </>
          ) : (
            <>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Scan this QR code with your UPI app to pay
              </Typography>
              <QRCodeSVG value={paymentLink} size={200} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayDialogOpen(false)} disabled={paymentUploading}>Close</Button>
          {paymentSettings && !paymentSettings.gatewayEnabled && paymentSettings.upiId && (
            <Button
              onClick={handlePaymentSubmit}
              disabled={paymentUploading || !paymentScreenshot}
              variant="contained"
              color="success"
            >
              {paymentUploading ? 'Submitting...' : 'Submit Payment'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <Backdrop open={loading || paymentUploading} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, backdropFilter: 'blur(4px)' }}>
        <PulseLoader color="#36d7b7" size={20} margin={6} />
      </Backdrop>
    </Box>
  );
}

export default MyContributions; 