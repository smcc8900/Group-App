import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Container, Typography, TextField, Button, Box, Alert } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { fetchAndStorePaymentSettings, fetchAndStoreGroupInfo } from '../utils/paymentSettings';
import logo from '../logo.svg';
import Backdrop from '@mui/material/Backdrop';
import { PulseLoader } from 'react-spinners';

function AuthPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [mustChange, setMustChange] = useState<{id: string, member: any} | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeError, setChangeError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const isUsernameValid = username.trim().length > 0;
  const isPasswordValid = password.length >= 6;
  const isFormValid = isUsernameValid && isPasswordValid;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      
      // Get all members and find by username (case-insensitive)
      const membersQuery = query(collection(db, 'members'));
      const snap = await getDocs(membersQuery);
      
      if (snap.empty) {
        setError('Invalid username or password');
        return;
      }
      
      // Find member with case-insensitive username match
      const memberDoc = snap.docs.find(doc => {
        const memberData = doc.data();
        return memberData.username.toLowerCase() === username.toLowerCase();
      });
      
      if (!memberDoc) {
        setError('Invalid username or password');
        return;
      }
      
      const member = memberDoc.data();
      
      if (member.password !== password) {
        setError('Invalid username or password');
        return;
      }
      
      if (member.mustChangePassword) {
        setMustChange({ id: memberDoc.id, member });
        return;
      }
      
      // Store member info in localStorage/session
      localStorage.setItem('member', JSON.stringify({ id: memberDoc.id, ...member }));
      
      // Fetch and store latest payment settings
      await fetchAndStorePaymentSettings();
      
      // Fetch and store latest group info
      await fetchAndStoreGroupInfo();
      
      navigate('/my-contributions');
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setChangeError('');
    if (newPassword.length < 6) {
      setChangeError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangeError('Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      await updateDoc(doc(db, 'members', mustChange!.id), {
        password: newPassword,
        mustChangePassword: false,
      });
      setMustChange(null);
      setUsername('');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('Password changed successfully. Please log in again.');
    } catch (err: any) {
      setChangeError('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'admin123';
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError('');
    if (adminUsername === ADMIN_USERNAME && adminPassword === ADMIN_PASSWORD) {
      localStorage.setItem('admin', JSON.stringify({ username: ADMIN_USERNAME }));
      navigate('/admin');
    } else {
      setAdminLoginError('Invalid admin username or password');
    }
  };

  if (mustChange) {
    return (
      <Container maxWidth="xs" sx={{ mt: 8 }}>
        <Typography variant="h5" gutterBottom>Change Password</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="New Password"
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            required
            error={newPassword.length > 0 && newPassword.length < 6}
            helperText={newPassword.length > 0 && newPassword.length < 6 ? 'At least 6 characters' : ''}
            InputProps={{
              endAdornment: (
                <Button onClick={() => setShowNewPassword(v => !v)} tabIndex={-1} size="small">
                  {showNewPassword ? <VisibilityOff /> : <Visibility />}
                </Button>
              )
            }}
          />
          <TextField
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            error={confirmPassword.length > 0 && newPassword !== confirmPassword}
            helperText={confirmPassword.length > 0 && newPassword !== confirmPassword ? 'Passwords do not match' : ''}
            InputProps={{
              endAdornment: (
                <Button onClick={() => setShowConfirmPassword(v => !v)} tabIndex={-1} size="small">
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </Button>
              )
            }}
          />
          {changeError && <Alert severity="error">{changeError}</Alert>}
          <Button variant="contained" onClick={handleChangePassword}>Change Password</Button>
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)' }}>
      <Container maxWidth="xs" sx={{ p: 0 }}>
        <Box sx={{ boxShadow: 6, borderRadius: 4, bgcolor: 'white', p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 320 }}>
          <img src={logo} alt="Logo" style={{ width: 64, marginBottom: 16 }} />
          <Typography variant="h4" fontWeight={700} color="primary" gutterBottom sx={{ mb: 2 }}>Group Contribution</Typography>
          {!showAdmin ? (
            <>
              <Typography variant="h6" gutterBottom>User Login</Typography>
              <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
                <TextField
                  label="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  onBlur={() => setUsernameTouched(true)}
                  required
                  error={usernameTouched && !isUsernameValid}
                  helperText={usernameTouched && !isUsernameValid ? 'Enter a valid username' : ''}
                  fullWidth
                />
                <TextField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onBlur={() => setPasswordTouched(true)}
                  required
                  error={passwordTouched && !isPasswordValid}
                  helperText={passwordTouched && !isPasswordValid ? 'Password must be at least 6 characters' : ''}
                  InputProps={{
                    endAdornment: (
                      <Button onClick={() => setShowPassword(v => !v)} tabIndex={-1} size="small">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </Button>
                    )
                  }}
                  fullWidth
                />
                {error && <Alert severity="error">{error}</Alert>}
                <Button type="submit" variant="contained" color="primary" disabled={!isFormValid} sx={{ fontWeight: 600, fontSize: 16 }}>Login</Button>
              </Box>
              <Button variant="text" color="secondary" sx={{ mt: 2, fontWeight: 500 }} onClick={() => setShowAdmin(true)}>
                Login as Admin
              </Button>
            </>
          ) : (
            <>
              <Typography variant="h6" gutterBottom>Admin Login</Typography>
              <Box component="form" onSubmit={handleAdminLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
                <TextField
                  label="Admin Username"
                  value={adminUsername}
                  onChange={e => setAdminUsername(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Admin Password"
                  type={showAdminPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  required
                  InputProps={{
                    endAdornment: (
                      <Button onClick={() => setShowAdminPassword(v => !v)} tabIndex={-1} size="small">
                        {showAdminPassword ? <VisibilityOff /> : <Visibility />}
                      </Button>
                    )
                  }}
                  fullWidth
                />
                {adminLoginError && <Alert severity="error">{adminLoginError}</Alert>}
                <Button type="submit" variant="contained" color="primary" sx={{ fontWeight: 600, fontSize: 16 }}>Login</Button>
              </Box>
              <Button variant="text" color="secondary" sx={{ mt: 2, fontWeight: 500 }} onClick={() => setShowAdmin(false)}>
                Back to User Login
              </Button>
            </>
          )}
        </Box>
      </Container>
      <Backdrop open={loading} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, backdropFilter: 'blur(4px)' }}>
        <PulseLoader color="#36d7b7" size={20} margin={6} />
      </Backdrop>
    </Box>
  );
}

export default AuthPage; 