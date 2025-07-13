import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Card,
  CardContent,
  Link
} from '@mui/material';
import { EmailService } from '../utils/emailService';

interface EmailJSConfigProps {
  onConfigUpdate?: () => void;
}

function EmailJSConfig({ onConfigUpdate }: EmailJSConfigProps) {
  const [config, setConfig] = useState({
    serviceId: '',
    approvalTemplateId: '',
    rejectionTemplateId: '',
    publicKey: ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      // Save configuration to localStorage
      localStorage.setItem('emailjs_config', JSON.stringify(config));
      setMessage({ type: 'success', text: 'EmailJS configuration saved successfully!' });
      onConfigUpdate?.();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleLoadConfig = () => {
    const savedConfig = localStorage.getItem('emailjs_config');
    if (savedConfig) {
      setConfig(JSON.parse(savedConfig));
    }
  };

  React.useEffect(() => {
    handleLoadConfig();
  }, []);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          EmailJS Configuration
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            To enable real email sending, you need to set up EmailJS. Follow these steps:
          </Typography>
          <Box component="ol" sx={{ mt: 1, pl: 2 }}>
            <li>Go to <Link href="https://www.emailjs.com/" target="_blank">EmailJS.com</Link> and create an account</li>
            <li>Create an Email Service (Gmail, Outlook, etc.)</li>
            <li>Create two email templates: one for payment approval and one for rejection</li>
            <li>Get your Service ID, Template IDs, and Public Key</li>
            <li>Enter them below and save</li>
          </Box>
        </Alert>

        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 500 }}>
          <TextField
            label="EmailJS Service ID"
            value={config.serviceId}
            onChange={(e) => setConfig(prev => ({ ...prev, serviceId: e.target.value }))}
            placeholder="service_xxxxxxx"
            helperText="The ID of your EmailJS email service"
          />
          
          <TextField
            label="Approval Template ID"
            value={config.approvalTemplateId}
            onChange={(e) => setConfig(prev => ({ ...prev, approvalTemplateId: e.target.value }))}
            placeholder="template_xxxxxxx"
            helperText="Template ID for payment approval emails"
          />
          
          <TextField
            label="Rejection Template ID"
            value={config.rejectionTemplateId}
            onChange={(e) => setConfig(prev => ({ ...prev, rejectionTemplateId: e.target.value }))}
            placeholder="template_xxxxxxx"
            helperText="Template ID for payment rejection emails"
          />
          
          <TextField
            label="Public Key"
            value={config.publicKey}
            onChange={(e) => setConfig(prev => ({ ...prev, publicKey: e.target.value }))}
            placeholder="user_xxxxxxx"
            helperText="Your EmailJS public key"
          />

          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !config.serviceId || !config.approvalTemplateId || !config.rejectionTemplateId || !config.publicKey}
            sx={{ alignSelf: 'flex-start' }}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Template Variables for EmailJS:
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            <strong>Approval Template Variables:</strong>
            <ul>
              <li>{"{{to_email}}"} - Recipient email</li>
              <li>{"{{from_email}}"} - Sender email</li>
              <li>{"{{user_name}}"} - User's name</li>
              <li>{"{{payment_id}}"} - Payment ID</li>
              <li>{"{{month}}"} - Payment month</li>
              <li>{"{{amount}}"} - Payment amount</li>
              <li>{"{{admin_username}}"} - Admin username</li>
              <li>{"{{approval_date}}"} - Approval date</li>
            </ul>
            
            <strong>Rejection Template Variables:</strong>
            <ul>
              <li>{"{{to_email}}"} - Recipient email</li>
              <li>{"{{from_email}}"} - Sender email</li>
              <li>{"{{user_name}}"} - User's name</li>
              <li>{"{{payment_id}}"} - Payment ID</li>
              <li>{"{{month}}"} - Payment month</li>
              <li>{"{{amount}}"} - Payment amount</li>
              <li>{"{{admin_username}}"} - Admin username</li>
              <li>{"{{rejection_date}}"} - Rejection date</li>
              <li>{"{{rejection_reason}}"} - Reason for rejection</li>
            </ul>
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default EmailJSConfig; 