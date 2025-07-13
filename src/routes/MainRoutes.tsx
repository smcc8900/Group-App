import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import AdminPanel from '../components/AdminPanel';
import AuthPage from '../components/AuthPage';
import MyContributions from '../components/MyContributions';
import InactivityHandler from '../components/InactivityHandler';
import GroupDashboard from '../components/GroupDashboard';
import UserDebug from '../components/UserDebug';

function AppRoutes() {
  return (
    <Router>
      <InactivityHandler />
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/my-contributions" element={<MyContributions />} />
        <Route path="/group-dashboard" element={<GroupDashboard />} />
        <Route path="/debug-users" element={<UserDebug />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default AppRoutes; 