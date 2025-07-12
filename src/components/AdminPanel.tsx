import React, { useState, useEffect } from 'react';
import { Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, TextField, Box, CircularProgress, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, setDoc, getDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getCurrentMonth } from '../utils/contributions';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Backdrop from '@mui/material/Backdrop';
import { PulseLoader } from 'react-spinners';

type MaybeDeleted<T> = T & { deleted?: boolean; active?: boolean };

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

function AdminPanel() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [login, setLogin] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginTouched, setLoginTouched] = useState({ username: false, password: false });
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Member management state (move under group logic)
  const [memberForm, setMemberForm] = useState({ name: '', username: '', password: '' });
  const [memberFormTouched, setMemberFormTouched] = useState({ name: false, username: false, password: false });
  const isMemberNameValid = memberForm.name.trim().length > 0;
  const isMemberUsernameValid = memberForm.username.trim().length > 0;
  const isMemberPasswordValid = memberForm.password.length >= 6;
  const isMemberFormValid = isMemberNameValid && isMemberUsernameValid && isMemberPasswordValid;

  // Payment settings state
  const [gatewayEnabled, setGatewayEnabled] = useState(true);
  const [upiId, setUpiId] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState('');

  // Payment requests state
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [paymentRequestsLoading, setPaymentRequestsLoading] = useState(true);
  const [paymentRequestsError, setPaymentRequestsError] = useState('');

  // Group management state
  const [group, setGroup] = useState<any | null>(null);
  const [groupForm, setGroupForm] = useState({ name: '', baseAmount: '', fineRules: [], previousContribution: '' });
  const [groupFormTouched, setGroupFormTouched] = useState({ name: false, baseAmount: false, previousContribution: false });
  // For group creation
  const isCreateGroupFormValid = groupForm.name.trim() && groupForm.baseAmount;
  // For group edit dialog (if separate state is used, otherwise reuse groupForm)
  const isEditGroupFormValid = groupForm.name.trim() && groupForm.baseAmount;

  // Fine rules state for group form
  const [fineRules, setFineRules] = useState<{fromDate: string, toDate: string, amount: string}[]>([]);

  // Add/remove fine rule handlers
  const addFineRule = () => setFineRules([...fineRules, { fromDate: '', toDate: '', amount: '' }]);
  const removeFineRule = (idx: number) => setFineRules(fineRules.filter((_, i) => i !== idx));
  const updateFineRule = (idx: number, field: string, value: string) => setFineRules(fineRules.map((r, i) => i === idx ? { ...r, [field]: value } : r));

  const [groupLoading, setGroupLoading] = useState(true);
  // const isGroupFormValid = groupForm.name.trim() && groupForm.baseAmount; // This line was removed

  const [editingGroup, setEditingGroup] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isUsernameValid = login.username.trim().length > 0;
  const isPasswordValid = login.password.trim().length > 0;
  const isLoginFormValid = isUsernameValid && isPasswordValid;

  const [members, setMembers] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | false>('group');
  const handleAccordionChange = (panel: string) => (_event: any, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [deleteMemberDialog, setDeleteMemberDialog] = useState<any | null>(null);

  const [showMemberPassword, setShowMemberPassword] = useState(false);
  const [showEditMemberPassword, setShowEditMemberPassword] = useState(false);

  useEffect(() => {
    const admin = localStorage.getItem('admin');
    if (admin) {
      setIsAdmin(true);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    // Real-time updates
    const unsub = onSnapshot(collection(db, 'contribution'), (snapshot) => {
      // setMembers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as any)); // This line was removed
      // setLoading(false); // This line was removed
    });
    return () => unsub();
  }, [isAdmin]);

  // Fetch settings on mount
  useEffect(() => {
    if (!isAdmin) return;
    setSettingsLoading(true);
    getDoc(doc(db, 'static', 'settings')).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGatewayEnabled(!!data.gatewayEnabled);
        setUpiId(data.upiId || '');
      }
      setSettingsLoading(false);
    }).catch(() => {
      setSettingsError('Failed to load settings');
      setSettingsLoading(false);
    });
  }, [isAdmin]);

  // Fetch payment requests
  useEffect(() => {
    if (!isAdmin) return;
    setPaymentRequestsLoading(true);
    const unsub = onSnapshot(collection(db, 'payment_requests'), (snap) => {
      setPaymentRequests(
        snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as MaybeDeleted<any>))
          .filter(req => req.deleted !== true && req.active !== false)
      );
      setPaymentRequestsLoading(false);
    }, () => {
      setPaymentRequestsError('Failed to load payment requests');
      setPaymentRequestsLoading(false);
    });
    return () => unsub();
  }, [isAdmin]);

  // Fetch group on mount
  useEffect(() => {
    if (!isAdmin) return;
    setGroupLoading(true);
    const unsub = onSnapshot(collection(db, 'groups'), (snap) => {
      if (!snap.empty) {
        setGroup({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setGroup(null);
      }
      setGroupLoading(false);
    });
    return () => unsub();
  }, [isAdmin]);

  // Fetch members for the group
  useEffect(() => {
    if (!isAdmin || !group) return;
    const q = query(collection(db, 'members'), where('groupId', '==', group.id));
    const unsub = onSnapshot(q, (snap) => {
      setMembers(
        snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as MaybeDeleted<any>))
          .filter(m => m.deleted !== true && m.active !== false)
      );
    });
    return () => unsub();
  }, [isAdmin, group]);

  const handleAdd = async () => {
    if (isMemberFormValid) {
      await addDoc(collection(db, 'contribution'), {
        name: memberForm.name,
        username: memberForm.username, // Assuming email is username for contribution
        paid: false
      });
      setMemberForm({ name: '', username: '', password: '' });
      setMemberFormTouched({ name: false, username: false, password: false });
    }
  };

  const handleRemove = async (id: string) => {
    await deleteDoc(doc(db, 'contribution', id));
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      login.username.toLowerCase() === ADMIN_USERNAME &&
      login.password === ADMIN_PASSWORD
    ) {
      setIsAdmin(true);
      setLoginError('');
    } else {
      setLoginError('Invalid admin credentials');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsAdmin(false);
    setLogin({ username: '', password: '' });
    setLoginError('');
    window.location.href = '/login';
  };

  // Save settings
  const handleSaveSettings = async () => {
    if (!gatewayEnabled && !upiId.trim()) {
      setSettingsError('UPI ID is required when payment gateway is off');
      return;
    }
    setSettingsError('');
    setSettingsLoading(true);
    await setDoc(doc(db, 'static', 'settings'), {
      gatewayEnabled,
      upiId: upiId.trim(),
    });
    setSettingsLoading(false);
  };

  // Handle accept/reject
  const handlePaymentAction = async (id: string, action: 'accepted' | 'rejected') => {
    await updateDoc(doc(db, 'payment_requests', id), { status: action });
    if (action === 'accepted') {
      // Find the payment request
      const req = paymentRequests.find(r => r.id === id);
      if (!req) return;
      // Check if contribution already exists for this user/month
      const contribQuery = query(collection(db, 'contribution'), where('username', '==', req.username), where('month', '==', req.month));
      const snap = await getDocs(contribQuery);
      if (snap.empty) {
        // Create new contribution record, always include paymentID
        await addDoc(collection(db, 'contribution'), {
          username: req.username,
          month: req.month,
          amount: req.amount,
          status: 'paid',
          paidDate: new Date().toISOString(),
          paymentID: req.paymentID,
        });
      } else {
        // Update existing record to paid and set paymentID
        const docRef = snap.docs[0].ref;
        await updateDoc(docRef, {
          status: 'paid',
          paidDate: new Date().toISOString(),
          paymentID: req.paymentID,
        });
      }
    }
    // Note: Deleting a payment request does NOT affect the paid state, which is always determined from the contribution record.
  };

  const handleCreateGroup = async () => {
    if (!isCreateGroupFormValid) return;
    await addDoc(collection(db, 'groups'), {
      name: groupForm.name,
      baseAmount: Number(groupForm.baseAmount),
      fineRules: fineRules.filter(r => r.fromDate && r.toDate && r.amount),
      previousContribution: groupForm.previousContribution ? Number(groupForm.previousContribution) : 0,
      createdAt: new Date().toISOString(),
    });
    setGroupForm({ name: '', baseAmount: '', fineRules: [], previousContribution: '' });
    setFineRules([]);
    setGroupFormTouched({ name: false, baseAmount: false, previousContribution: false });
  };

  const handleAddMember = async () => {
    if (!isMemberFormValid || !group) return;
    const memberRef = await addDoc(collection(db, 'members'), {
      groupId: group.id,
      name: memberForm.name,
      username: memberForm.username,
      password: memberForm.password, // In production, hash passwords!
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
    });
    // Create initial contribution record for current month
    const currentMonth = getCurrentMonth();
    await addDoc(collection(db, 'contribution'), {
      username: memberForm.username,
      month: currentMonth,
      amount: group.baseAmount,
      status: 'pending',
      dueDate: null,
      paidDate: null,
    });
    setMemberForm({ name: '', username: '', password: '' });
    setMemberFormTouched({ name: false, username: false, password: false });
  };

  if (!isAdmin) {
    return (
      <Container maxWidth="xs" sx={{ mt: 8 }}>
        <Typography variant="h5" gutterBottom>Admin Login</Typography>
        <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Username"
            value={login.username}
            onChange={e => setLogin({ ...login, username: e.target.value })}
            onBlur={() => setLoginTouched(t => ({ ...t, username: true }))}
            required
            error={loginTouched.username && !isUsernameValid}
            helperText={loginTouched.username && !isUsernameValid ? 'Username is required' : ''}
          />
          <TextField
            label="Password"
            type={showAdminPassword ? 'text' : 'password'}
            value={login.password}
            onChange={e => setLogin({ ...login, password: e.target.value })}
            onBlur={() => setLoginTouched(t => ({ ...t, password: true }))}
            required
            error={loginTouched.password && !isPasswordValid}
            helperText={loginTouched.password && !isPasswordValid ? 'Password is required' : ''}
            InputProps={{
              endAdornment: (
                <Button onClick={() => setShowAdminPassword(v => !v)} tabIndex={-1} size="small">
                  {showAdminPassword ? <VisibilityOff /> : <Visibility />}
                </Button>
              )
            }}
          />
          {loginError && <Alert severity="error">{loginError}</Alert>}
          <Button type="submit" variant="contained" color="primary" disabled={!isLoginFormValid}>Login</Button>
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Backdrop
        open={groupLoading || settingsLoading || paymentRequestsLoading}
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, backdropFilter: 'blur(4px)' }}
      >
        <PulseLoader color="#36d7b7" size={20} margin={6} />
        <Typography variant="h6" sx={{ ml: 3 }}>Loading admin data...</Typography>
      </Backdrop>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" gutterBottom>Admin Panel</Typography>
          <Button variant="outlined" color="error" onClick={handleLogout}>Logout</Button>
        </Box>
        <Accordion expanded={expanded === 'group'} onChange={handleAccordionChange('group')} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography>Group Info</Typography></AccordionSummary>
          <AccordionDetails>
            {groupLoading ? <CircularProgress /> : !group ? (
              <Box sx={{ mb: 3, p: 2, border: '1px solid #eee', borderRadius: 2, background: '#fafbfc' }}>
                <Typography variant="h6" gutterBottom>Create Group</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
                  <TextField
                    label="Group Name"
                    value={groupForm.name}
                    onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))}
                    onBlur={() => setGroupFormTouched(t => ({ ...t, name: true }))}
                    required
                    error={groupFormTouched.name && !groupForm.name.trim()}
                    helperText={groupFormTouched.name && !groupForm.name.trim() ? 'Required' : ''}
                  />
                  <TextField
                    label="Base Amount"
                    type="number"
                    value={groupForm.baseAmount}
                    onChange={e => setGroupForm(f => ({ ...f, baseAmount: e.target.value }))}
                    onBlur={() => setGroupFormTouched(t => ({ ...t, baseAmount: true }))}
                    required
                    error={groupFormTouched.baseAmount && !groupForm.baseAmount}
                    helperText={groupFormTouched.baseAmount && !groupForm.baseAmount ? 'Required' : ''}
                  />
                  <TextField
                    label="Previous Contribution (optional)"
                    type="number"
                    value={groupForm.previousContribution}
                    onChange={e => setGroupForm(f => ({ ...f, previousContribution: e.target.value }))}
                    onBlur={() => setGroupFormTouched(t => ({ ...t, previousContribution: true }))}
                    sx={{ mb: 1 }}
                  />
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1">Fine Rules (applies to all months unless modified)</Typography>
                    {fineRules.map((rule, idx) => (
                      <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <TextField type="date" label="From Date" InputLabelProps={{ shrink: true }} value={rule.fromDate} onChange={e => updateFineRule(idx, 'fromDate', e.target.value)} />
                        <TextField type="date" label="To Date" InputLabelProps={{ shrink: true }} value={rule.toDate} onChange={e => updateFineRule(idx, 'toDate', e.target.value)} />
                        <TextField type="number" label="Fine Amount" value={rule.amount} onChange={e => updateFineRule(idx, 'amount', e.target.value)} />
                        <Button color="error" onClick={() => removeFineRule(idx)}>Remove</Button>
                      </Box>
                    ))}
                    <Button onClick={addFineRule}>Add Fine Rule</Button>
                  </Box>
                  <Button variant="contained" onClick={handleCreateGroup} disabled={!isCreateGroupFormValid}>Create Group</Button>
                </Box>
              </Box>
            ) : (
              <Box sx={{ mb: 3, p: 2, border: '1px solid #eee', borderRadius: 2, background: '#fafbfc' }}>
                <Typography variant="h6" gutterBottom>Group: {group.name}</Typography>
                <Typography>Base Amount: ₹{group.baseAmount}</Typography>
                {group.fineRules && group.fineRules.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="subtitle1">Fine Rules:</Typography>
                    {group.fineRules.map((rule: any, idx: number) => (
                      <Typography key={idx}>From: {rule.fromDate} To: {rule.toDate} Amount: ₹{rule.amount}</Typography>
                    ))}
                  </Box>
                )}
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button variant="outlined" onClick={() => {
                    setGroupForm({
                      name: group.name || '',
                      baseAmount: group.baseAmount || '',
                      previousContribution: group.previousContribution || '',
                      fineRules: group.fineRules || [],
                    });
                    setFineRules(group.fineRules || []);
                    setEditingGroup(true);
                  }}>Modify</Button>
                  <Button variant="outlined" color="error" onClick={() => setDeleteDialogOpen(true)}>Delete</Button>
                </Box>
              </Box>
            )}
            {/* Edit group dialog */}
            <Dialog open={editingGroup} onClose={() => setEditingGroup(false)}>
              <DialogTitle>Edit Group</DialogTitle>
              <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400, mt: 1 }}>
                  <TextField label="Group Name" value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} />
                  <TextField label="Base Amount" type="number" value={groupForm.baseAmount} onChange={e => setGroupForm(f => ({ ...f, baseAmount: e.target.value }))} />
                  <TextField
                    label="Previous Contribution (optional)"
                    type="number"
                    value={groupForm.previousContribution}
                    onChange={e => setGroupForm(f => ({ ...f, previousContribution: e.target.value }))}
                    sx={{ mb: 1 }}
                  />
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1">Fine Rules (optional)</Typography>
                    {fineRules.map((rule, idx) => (
                      <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <TextField type="date" label="From Date" InputLabelProps={{ shrink: true }} value={rule.fromDate} onChange={e => updateFineRule(idx, 'fromDate', e.target.value)} />
                        <TextField type="date" label="To Date" InputLabelProps={{ shrink: true }} value={rule.toDate} onChange={e => updateFineRule(idx, 'toDate', e.target.value)} />
                        <TextField type="number" label="Fine Amount" value={rule.amount} onChange={e => updateFineRule(idx, 'amount', e.target.value)} />
                        <Button color="error" onClick={() => removeFineRule(idx)}>Remove</Button>
                      </Box>
                    ))}
                    <Button onClick={addFineRule}>Add Fine Rule</Button>
                  </Box>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button variant="contained" onClick={async () => {
                  await updateDoc(doc(db, 'groups', group.id), {
                    name: groupForm.name,
                    baseAmount: Number(groupForm.baseAmount),
                    fineRules: fineRules.filter(r => r.fromDate && r.toDate && r.amount),
                    previousContribution: groupForm.previousContribution ? Number(groupForm.previousContribution) : 0,
                  });
                  setEditingGroup(false);
                }}>Save</Button>
                <Button variant="outlined" onClick={() => setEditingGroup(false)}>Cancel</Button>
              </DialogActions>
            </Dialog>
            {/* Delete group confirmation dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
              <DialogTitle>Delete Group?</DialogTitle>
              <DialogContent>
                <Typography color="error">Are you sure you want to delete this group and all its members? This action cannot be undone.</Typography>
              </DialogContent>
              <DialogActions>
                <Button variant="contained" color="error" onClick={async () => {
                  // Delete all members in this group
                  const q = query(collection(db, 'members'), where('groupId', '==', group.id));
                  const snap = await getDocs(q);
                  for (const docSnap of snap.docs) {
                    await deleteDoc(doc(db, 'members', docSnap.id));
                  }
                  // Delete the group
                  await deleteDoc(doc(db, 'groups', group.id));
                  setDeleteDialogOpen(false);
                }}>Delete</Button>
                <Button variant="outlined" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              </DialogActions>
            </Dialog>
          </AccordionDetails>
        </Accordion>
        <Accordion expanded={expanded === 'members'} onChange={handleAccordionChange('members')} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography>Members</Typography></AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400, mb: 2 }}>
              <TextField
                label="Name"
                value={memberForm.name}
                onChange={e => setMemberForm(f => ({ ...f, name: e.target.value }))}
                onBlur={() => setMemberFormTouched(t => ({ ...t, name: true }))}
                required
                error={memberFormTouched.name && !memberForm.name.trim()}
                helperText={memberFormTouched.name && !memberForm.name.trim() ? 'Required' : ''}
              />
              <TextField
                label="Username"
                value={memberForm.username}
                onChange={e => setMemberForm(f => ({ ...f, username: e.target.value }))}
                onBlur={() => setMemberFormTouched(t => ({ ...t, username: true }))}
                required
                error={memberFormTouched.username && !memberForm.username.trim()}
                helperText={memberFormTouched.username && !memberForm.username.trim() ? 'Required' : ''}
              />
              <TextField
                label="Password"
                type={showMemberPassword ? 'text' : 'password'}
                value={memberForm.password}
                onChange={e => setMemberForm(f => ({ ...f, password: e.target.value }))}
                onBlur={() => setMemberFormTouched(t => ({ ...t, password: true }))}
                required
                error={memberFormTouched.password && memberForm.password.length < 6}
                helperText={memberFormTouched.password && memberForm.password.length < 6 ? 'Min 6 chars' : ''}
                InputProps={{
                  endAdornment: (
                    <Button onClick={() => setShowMemberPassword(v => !v)} tabIndex={-1} size="small">
                      {showMemberPassword ? <VisibilityOff /> : <Visibility />}
                    </Button>
                  )
                }}
              />
              <Button variant="contained" onClick={handleAddMember} disabled={!isMemberFormValid}>Add Member</Button>
            </Box>
            {/* membersLoading ? <CircularProgress /> : ( // This line was removed
              <TableContainer component={Paper} sx={{ mb: 2 }}> // This line was removed
                <Table size="small"> // This line was removed
                  <TableHead> // This line was removed
                    <TableRow> // This line was removed
                      <TableCell>Name</TableCell> // This line was removed
                      <TableCell>Username</TableCell> // This line was removed
                      <TableCell>Password</TableCell> // This line was removed
                    </TableRow> // This line was removed
                  </TableHead> // This line was removed
                  <TableBody> // This line was removed
                    {members.map(m => ( // This line was removed
                      <TableRow key={m.id}> // This line was removed
                        <TableCell>{m.name}</TableCell> // This line was removed
                        <TableCell>{m.username}</TableCell> // This line was removed
                        <TableCell>{m.password}</TableCell> // This line was removed
                      </TableRow> // This line was removed
                    ))} // This line was removed
                  </TableBody> // This line was removed
                </Table> // This line was removed
              </TableContainer> // This line was removed
            )} // This line was removed */}
            <TableContainer component={Paper} sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Username</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>{m.name}</TableCell>
                      <TableCell>{m.username}</TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => setEditingMember(m)}>Modify</Button>
                        <Button size="small" color="error" onClick={() => setDeleteMemberDialog(m)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
        <Accordion expanded={expanded === 'payment'} onChange={handleAccordionChange('payment')} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography>Payment Settings</Typography></AccordionSummary>
          <AccordionDetails>
            {group && (
              <Box sx={{ mb: 3, p: 2, border: '1px solid #eee', borderRadius: 2, background: '#fafbfc' }}>
                <Typography variant="h6" gutterBottom>Payment Settings</Typography>
                {settingsError && <Alert severity="error">{settingsError}</Alert>}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={gatewayEnabled}
                      onChange={e => setGatewayEnabled(e.target.checked)}
                      style={{ marginRight: 8 }}
                    />
                    Integrate Payment Gateway
                  </label>
                </Box>
                {!gatewayEnabled && (
                  <TextField
                    label="UPI ID"
                    value={upiId}
                    onChange={e => setUpiId(e.target.value)}
                    required
                    error={!upiId.trim()}
                    helperText={!upiId.trim() ? 'UPI ID is required' : ''}
                    sx={{ mb: 2, width: 300 }}
                  />
                )}
                <Button variant="contained" onClick={handleSaveSettings} disabled={settingsLoading}>
                  Save Settings
                </Button>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
        <Accordion expanded={expanded === 'requests'} onChange={handleAccordionChange('requests')} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography>Payment Requests</Typography></AccordionSummary>
          <AccordionDetails>
            {group && (
              <Box sx={{ mb: 3, p: 2, border: '1px solid #eee', borderRadius: 2, background: '#fff' }}>
                <Typography variant="h6" gutterBottom>Pending Payment Requests</Typography>
                {paymentRequestsError && <Alert severity="error">{paymentRequestsError}</Alert>}
                {paymentRequestsLoading ? <CircularProgress /> : (
                  paymentRequests.length === 0 ? <Typography>No payment requests.</Typography> : (
                    <TableContainer component={Paper} sx={{ mb: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Payment ID</TableCell>
                            <TableCell>User</TableCell>
                            <TableCell>Month</TableCell>
                            <TableCell>Amount</TableCell>
                            <TableCell>UPI ID</TableCell>
                            <TableCell>Screenshot</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {paymentRequests.map(req => (
                            <TableRow key={req.id}>
                              <TableCell>{req.paymentID || '-'}</TableCell>
                              <TableCell>{req.username}</TableCell>
                              <TableCell>{req.month}</TableCell>
                              <TableCell>₹{req.amount}</TableCell>
                              <TableCell>{req.upiId}</TableCell>
                              <TableCell>
                                {req.screenshot && (
                                  <a href={req.screenshot} target="_blank" rel="noopener noreferrer">
                                    <img src={req.screenshot} alt="Payment Screenshot" style={{ maxWidth: 60, maxHeight: 60, borderRadius: 4, border: '1px solid #ccc' }} />
                                  </a>
                                )}
                              </TableCell>
                              <TableCell>
                                <b style={{ color: req.status === 'accepted' ? 'green' : req.status === 'rejected' ? 'red' : '#888' }}>{req.status}</b>
                              </TableCell>
                              <TableCell>
                                {req.status === 'pending' && (
                                  <>
                                    <Button size="small" color="success" variant="contained" sx={{ mr: 1 }} onClick={() => handlePaymentAction(req.id, 'accepted')}>Accept</Button>
                                    <Button size="small" color="error" variant="outlined" onClick={() => handlePaymentAction(req.id, 'rejected')}>Reject</Button>
                                  </>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )
                )}
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
        <Dialog open={!!editingMember} onClose={() => setEditingMember(null)}>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogContent>
            <TextField label="Name" value={editingMember?.name || ''} onChange={e => setEditingMember((m: any) => m ? { ...m, name: e.target.value } : m)} fullWidth sx={{ mb: 2 }} />
            <TextField label="Username" value={editingMember?.username || ''} onChange={e => setEditingMember((m: any) => m ? { ...m, username: e.target.value } : m)} fullWidth sx={{ mb: 2 }} />
            <TextField
              label="Password"
              type={showEditMemberPassword ? 'text' : 'password'}
              value={editingMember?.password || ''}
              onChange={e => setEditingMember((m: any) => m ? { ...m, password: e.target.value } : m)}
              fullWidth
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <Button onClick={() => setShowEditMemberPassword(v => !v)} tabIndex={-1} size="small">
                    {showEditMemberPassword ? <VisibilityOff /> : <Visibility />}
                  </Button>
                )
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={async () => {
              if (editingMember) {
                await updateDoc(doc(db, 'members', editingMember.id), {
                  name: editingMember.name,
                  username: editingMember.username,
                  password: editingMember.password,
                });
                setEditingMember(null);
              }
            }} variant="contained">Save</Button>
            <Button onClick={() => setEditingMember(null)} variant="outlined">Cancel</Button>
          </DialogActions>
        </Dialog>
        <Dialog open={!!deleteMemberDialog} onClose={() => setDeleteMemberDialog(null)}>
          <DialogTitle>Delete Member?</DialogTitle>
          <DialogContent>
            <Typography color="error">Are you sure you want to delete this member?</Typography>
          </DialogContent>
          <DialogActions>
            <Button color="error" variant="contained" onClick={async () => {
              if (deleteMemberDialog) {
                await deleteDoc(doc(db, 'members', deleteMemberDialog.id));
                setDeleteMemberDialog(null);
              }
            }}>Delete</Button>
            <Button onClick={() => setDeleteMemberDialog(null)} variant="outlined">Cancel</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}

export default AdminPanel; 