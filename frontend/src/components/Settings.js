import React, { useState, useEffect } from 'react';
import { settingsAPI, paymentTermAPI, userAPI } from '../services/api';
import InvoiceFormatEditor from './InvoiceFormatEditor';
import Tooltip, { InfoBox } from './Tooltip';
import { useToast } from './Toast';
import './Pages.css';

function Settings() {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Company Info State
  const [companyInfo, setCompanyInfo] = useState({
    companyName: '',
    tradingName: '',
    address: '',
    city: '',
    state: '',
    pinCode: '',
    stateCode: '',
    gstin: '',
    gstRegistrationDate: '',
    pan: '',
    phone: '',
    email: '',
    logo: null
  });
  const [logoPreview, setLogoPreview] = useState(null);

  // Invoice Settings State
  const [invoiceSettings, setInvoiceSettings] = useState({
    invoicePrefix: '',
    startingNumber: 1,
    proformaPrefix: 'PI-',
    proformaStartingNumber: 1,
    gstEnabled: true,
    defaultGstRate: 18,
    paymentDueDays: 30,
    termsAndConditions: '',
    notes: '',
    enablePaymentReminders: true,
    reminderFrequencyDays: 3,
    reminderEmailSubject: 'Payment Reminder for Invoice {invoice_number}',
    reminderEmailBody: 'Dear {client_name},\n\nThis is a friendly reminder that payment for {invoice_number} dated {invoice_date} is pending.\n\nAmount Due: ₹{total_amount}\n\nPlease make the payment at your earliest convenience.\n\nThank you!'
  });

  // Payment Terms State
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [currentPayment, setCurrentPayment] = useState({ term_name: '', days: 0, description: '' });

  // Email Settings State
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: '',
    useTLS: true,
    emailSignature: ''
  });

  // Users & Roles State
  const [users, setUsers] = useState([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [currentUser, setCurrentUser] = useState({ name: '', email: '', role: 'user', password: '' });

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
    loadPaymentTerms();
    loadUsers();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const [companyResponse, invoiceResponse, emailResponse] = await Promise.all([
        settingsAPI.getCompanySettings(),
        settingsAPI.getInvoiceSettings(),
        settingsAPI.getEmailSettings().catch(() => ({ data: null })) // Don't fail if email settings don't exist
      ]);

      if (companyResponse.data) {
        setCompanyInfo(companyResponse.data);
        // Set logo preview if logo exists
        if (companyResponse.data.logo) {
          setLogoPreview(companyResponse.data.logo);
        }
      }
      if (invoiceResponse.data) {
        setInvoiceSettings(invoiceResponse.data);
      }
      if (emailResponse.data) {
        setEmailSettings({
          smtpHost: emailResponse.data.smtp_host || '',
          smtpPort: emailResponse.data.smtp_port || 587,
          smtpUsername: emailResponse.data.smtp_username || '',
          smtpPassword: '', // Don't populate password from server
          fromEmail: emailResponse.data.from_email || '',
          fromName: emailResponse.data.from_name || '',
          useTLS: emailResponse.data.use_tls !== undefined ? emailResponse.data.use_tls : true,
          emailSignature: emailResponse.data.email_signature || ''
        });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      // Don't show error if settings don't exist yet (404)
      if (err.response?.status !== 404) {
        setError('Failed to load settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = (field, value) => {
    setCompanyInfo({
      ...companyInfo,
      [field]: value
    });
  };

  const handleInvoiceChange = (field, value) => {
    setInvoiceSettings({
      ...invoiceSettings,
      [field]: value
    });
  };

  // Resize image to optimal dimensions for logo
  const resizeImage = (file, maxWidth = 300, maxHeight = 150) => {
    return new Promise((resolve, reject) => {
      // First try using FileReader as a more compatible approach
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          try {
            let { width, height } = img;

            // Calculate new dimensions maintaining aspect ratio
            if (width > maxWidth || height > maxHeight) {
              const widthRatio = maxWidth / width;
              const heightRatio = maxHeight / height;
              const ratio = Math.min(widthRatio, heightRatio);
              width = Math.round(width * ratio);
              height = Math.round(height * ratio);
            }

            // Create canvas and draw resized image
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              // Canvas not supported, return original as base64
              console.warn('Canvas not supported, using original image');
              resolve(e.target.result);
              return;
            }

            // Use high-quality image smoothing
            ctx.imageSmoothingEnabled = true;
            if (ctx.imageSmoothingQuality) {
              ctx.imageSmoothingQuality = 'high';
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Convert to base64 (use PNG for logos to preserve transparency)
            const resizedBase64 = canvas.toDataURL('image/png', 0.9);

            // Verify the output is valid
            if (!resizedBase64 || resizedBase64 === 'data:,') {
              console.warn('Canvas toDataURL failed, using original image');
              resolve(e.target.result);
              return;
            }

            resolve(resizedBase64);
          } catch (canvasError) {
            console.error('Canvas resize error:', canvasError);
            // Fallback to original image if canvas fails
            resolve(e.target.result);
          }
        };

        img.onerror = (imgError) => {
          console.error('Image load error:', imgError);
          // Try to use original base64 if image load fails
          if (e.target.result) {
            resolve(e.target.result);
          } else {
            reject(new Error('Failed to load image'));
          }
        };

        // Set crossOrigin to handle potential CORS issues
        img.crossOrigin = 'anonymous';
        img.src = e.target.result;
      };

      reader.onerror = (readerError) => {
        console.error('FileReader error:', readerError);
        reject(new Error('Failed to read image file'));
      };

      // Read the file as data URL (base64)
      reader.readAsDataURL(file);
    });
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!file.type.startsWith('image/') && !validTypes.includes(file.type.toLowerCase())) {
        setError('Please select a valid image file (PNG, JPG, GIF, WebP, or SVG)');
        return;
      }

      // Validate file size (max 5MB for original, will be resized)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setError(`Logo file size should be less than 5MB. Current: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        return;
      }

      try {
        setLoading(true);
        // Resize image to optimal dimensions (max 300x150 for logos)
        const resizedImage = await resizeImage(file, 300, 150);

        // Check if resized image is valid
        if (!resizedImage || !resizedImage.startsWith('data:')) {
          throw new Error('Invalid image data');
        }

        setLogoPreview(resizedImage);
        setCompanyInfo({
          ...companyInfo,
          logo: resizedImage
        });
        showSuccess('Logo uploaded and optimized successfully');
      } catch (err) {
        console.error('Logo upload error:', err);
        showError('Failed to process image. Please try a different image or smaller file.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setCompanyInfo({
      ...companyInfo,
      logo: null
    });
    // Reset file input
    const fileInput = document.getElementById('logo-upload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSaveCompany = async () => {
    setLoading(true);
    setError('');
    try {
      await settingsAPI.updateCompanySettings(companyInfo);
      showSuccess('Company settings saved successfully!');
    } catch (err) {
      console.error('Error saving company info:', err);
      setError(err.response?.data?.message || 'Failed to save company information');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInvoice = async () => {
    setLoading(true);
    setError('');
    try {
      await settingsAPI.updateInvoiceSettings(invoiceSettings);
      showSuccess('Invoice settings saved successfully!');
    } catch (err) {
      console.error('Error saving invoice settings:', err);
      setError(err.response?.data?.message || 'Failed to save invoice settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset to initial values or reload from backend
    loadSettings();
  };

  // Load Payment Terms
  const loadPaymentTerms = async () => {
    try {
      const response = await paymentTermAPI.getAll();
      setPaymentTerms(response.data.results || response.data || []);
    } catch (err) {
      console.error('Error loading payment terms:', err);
    }
  };

  // Load Users
  const loadUsers = async () => {
    try {
      const response = await userAPI.getAll();
      setUsers(response.data.results || response.data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  // Payment Terms Handlers
  const handleAddPayment = () => {
    setShowPaymentForm(true);
    setCurrentPayment({ term_name: '', days: 0, description: '' });
  };

  const handlePaymentChange = (field, value) => {
    setCurrentPayment({ ...currentPayment, [field]: value });
  };

  const handleSavePayment = async () => {
    if (!currentPayment.term_name || !currentPayment.days) {
      setError('Payment term name and days are required');
      return;
    }

    if (!currentPayment.description) {
      setError('Description is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (currentPayment.id) {
        await paymentTermAPI.update(currentPayment.id, currentPayment);
      } else {
        await paymentTermAPI.create(currentPayment);
      }

      setShowPaymentForm(false);
      showSuccess('Payment term saved successfully!');
      loadPaymentTerms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save payment term');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPayment = (term) => {
    setCurrentPayment(term);
    setShowPaymentForm(true);
  };

  const handleDeletePayment = async (id) => {
    if (window.confirm('Are you sure you want to delete this payment term?')) {
      try {
        await paymentTermAPI.delete(id);
        showSuccess('Payment term deleted successfully!');
        loadPaymentTerms();
      } catch (err) {
        setError('Failed to delete payment term');
      }
    }
  };

  const handleCancelPayment = () => {
    setShowPaymentForm(false);
    setCurrentPayment({ term_name: '', days: 0, description: '' });
  };

  // Email Settings Handlers
  const handleEmailChange = (field, value) => {
    setEmailSettings({ ...emailSettings, [field]: value });
  };

  const handleSaveEmail = async () => {
    setLoading(true);
    setError('');
    try {
      // Convert camelCase to snake_case for API
      const payload = {
        smtp_host: emailSettings.smtpHost,
        smtp_port: emailSettings.smtpPort,
        smtp_username: emailSettings.smtpUsername,
        smtp_password: emailSettings.smtpPassword,
        from_email: emailSettings.fromEmail,
        from_name: emailSettings.fromName,
        use_tls: emailSettings.useTLS,
        email_signature: emailSettings.emailSignature
      };

      // Only include password if it's been changed
      if (!emailSettings.smtpPassword) {
        delete payload.smtp_password;
      }

      await settingsAPI.updateEmailSettings(payload);
      showSuccess('Email settings saved successfully!');
    } catch (err) {
      console.error('Error saving email settings:', err);
      setError(err.response?.data?.error || 'Failed to save email settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await settingsAPI.testEmail();
      alert(response.data.message || 'Test email sent successfully!');
    } catch (err) {
      console.error('Error sending test email:', err);
      const errorMsg = err.response?.data?.error || 'Failed to send test email. Please check your email settings.';
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Users Handlers
  const handleAddUser = () => {
    setShowUserForm(true);
    setCurrentUser({ name: '', email: '', role: 'user', password: '' });
  };

  const handleUserChange = (field, value) => {
    setCurrentUser({ ...currentUser, [field]: value });
  };

  const handleSaveUser = async () => {
    if (!currentUser.name || !currentUser.email) {
      setError('User name and email are required');
      return;
    }

    if (!currentUser.id && !currentUser.password) {
      setError('Password is required for new users');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userData = {
        first_name: currentUser.name.split(' ')[0] || currentUser.name,
        last_name: currentUser.name.split(' ').slice(1).join(' ') || '',
        email: currentUser.email,
        username: currentUser.email,
        role: currentUser.role || 'user',
      };

      // Only include password when creating new user or if it's been changed
      if (currentUser.password) {
        userData.password = currentUser.password;
      }

      if (currentUser.id) {
        await userAPI.update(currentUser.id, userData);
      } else {
        await userAPI.create(userData);
      }

      setShowUserForm(false);
      showSuccess('User saved successfully!');
      loadUsers();
    } catch (err) {
      console.error('Error saving user:', err);
      setError(err.response?.data?.message || err.response?.data?.email?.[0] || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    // Combine first_name and last_name back to name field for the form
    const userName = user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.first_name || user.last_name || user.username;

    setCurrentUser({
      ...user,
      name: userName,
      password: '' // Don't populate password for security
    });
    setShowUserForm(true);
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userAPI.delete(id);
        showSuccess('User deleted successfully!');
        loadUsers();
      } catch (err) {
        console.error('Error deleting user:', err);
        setError('Failed to delete user');
      }
    }
  };

  const handleToggleUserStatus = async (id) => {
    try {
      const user = users.find(u => u.id === id);
      if (user) {
        const updatedStatus = user.is_active ? false : true;
        await userAPI.update(id, { is_active: updatedStatus });
        loadUsers();
      }
    } catch (err) {
      console.error('Error toggling user status:', err);
      setError('Failed to update user status');
    }
  };

  const handleCancelUser = () => {
    setShowUserForm(false);
    setCurrentUser({ name: '', email: '', role: 'user', password: '' });
  };

  // Export Data Handler
  const [exporting, setExporting] = useState(false);

  // Tally Export State
  const [tallyExportParams, setTallyExportParams] = useState({
    startDate: '',
    endDate: '',
    invoiceType: 'tax'
  });
  const [showTallyRequirements, setShowTallyRequirements] = useState(false);

  const handleExportData = async (format, dataType = 'all') => {
    setExporting(true);
    setError('');
    try {
      const response = await settingsAPI.exportData(format.toLowerCase(), dataType);

      // Create blob and download
      const blob = new Blob([response.data], {
        type: format.toLowerCase() === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'text/csv'
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const timestamp = new Date().toISOString().split('T')[0];
      const extension = format.toLowerCase() === 'excel' ? 'xlsx' : 'csv';
      link.download = `nexinvo_${dataType}_export_${timestamp}.${extension}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess('Data exported successfully!');
    } catch (err) {
      console.error('Export error:', err);
      setError(err.response?.data?.error || 'Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Tally XML Export Handler
  const handleTallyExport = async () => {
    setExporting(true);
    setError('');
    try {
      const params = {
        start_date: tallyExportParams.startDate || undefined,
        end_date: tallyExportParams.endDate || undefined,
        invoice_type: tallyExportParams.invoiceType
      };

      const response = await settingsAPI.exportTallyXML(params);

      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `tally_sales_import_${timestamp}.xml`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess('Tally XML exported successfully!');
    } catch (err) {
      console.error('Tally Export error:', err);
      if (err.response?.status === 404) {
        setError('No invoices found for the selected criteria. Please check your date range and invoice type.');
      } else {
        setError(err.response?.data?.error || 'Failed to export Tally XML. Please try again.');
      }
    } finally {
      setExporting(false);
    }
  };

  // Tally Excel Export Handler
  const handleTallyExcelExport = async () => {
    setExporting(true);
    setError('');
    try {
      const params = {
        start_date: tallyExportParams.startDate || undefined,
        end_date: tallyExportParams.endDate || undefined,
        invoice_type: tallyExportParams.invoiceType
      };

      const response = await settingsAPI.exportTallyExcel(params);

      // Create blob and download
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `tally_sales_import_${timestamp}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showSuccess('Tally Excel exported successfully!');
    } catch (err) {
      console.error('Tally Excel Export error:', err);
      if (err.response?.status === 404) {
        setError('No invoices found for the selected criteria. Please check your date range and invoice type.');
      } else {
        setError(err.response?.data?.error || 'Failed to export Tally Excel. Please try again.');
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page-content">
      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      <div className="settings-layout">
        <div className="settings-sidebar">
          <button
            className={`settings-tab ${activeTab === 'company' ? 'active' : ''}`}
            onClick={() => setActiveTab('company')}
          >
            <span className="tab-icon">🏢</span>
            Company Info
          </button>
          <button
            className={`settings-tab ${activeTab === 'invoice' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoice')}
          >
            <span className="tab-icon">📄</span>
            Invoice Settings
          </button>
          <button
            className={`settings-tab ${activeTab === 'payment' ? 'active' : ''}`}
            onClick={() => setActiveTab('payment')}
          >
            <span className="tab-icon">💳</span>
            Payment Terms
          </button>
          <button
            className={`settings-tab ${activeTab === 'email' ? 'active' : ''}`}
            onClick={() => setActiveTab('email')}
          >
            <span className="tab-icon">✉️</span>
            Email Settings
          </button>
          <button
            className={`settings-tab ${activeTab === 'format' ? 'active' : ''}`}
            onClick={() => setActiveTab('format')}
          >
            <span className="tab-icon">📄</span>
            Invoice Format
          </button>
          <button
            className={`settings-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <span className="tab-icon">👤</span>
            Users & Roles
          </button>
          <button
            className={`settings-tab ${activeTab === 'backup' ? 'active' : ''}`}
            onClick={() => setActiveTab('backup')}
          >
            <span className="tab-icon">💾</span>
            Backup & Data
          </button>
        </div>

        <div className="settings-content">
          <div className="content-card">
            {activeTab === 'company' && (
              <div className="settings-section">
                <h2 className="section-title">Company Information</h2>
                <InfoBox type="info" title="Quick Tip">
                  Complete your company information to generate professional invoices. Your company name, address, and GST details will appear on all invoices.
                </InfoBox>
                <div className="form-grid">
                  <div className="form-field">
                    <label>
                      Company Name *
                      <Tooltip text="Your registered company name as per GST certificate or incorporation documents" icon position="right" />
                    </label>
                    <input
                      type="text"
                      value={companyInfo.companyName}
                      onChange={(e) => handleCompanyChange('companyName', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-field">
                    <label>
                      Trading Name
                      <Tooltip text="Brand or trade name if different from registered company name" icon position="right" />
                    </label>
                    <input
                      type="text"
                      value={companyInfo.tradingName}
                      onChange={(e) => handleCompanyChange('tradingName', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-field full-width">
                    <label>Address</label>
                    <textarea
                      rows="3"
                      value={companyInfo.address}
                      onChange={(e) => handleCompanyChange('address', e.target.value)}
                      className="form-input"
                    ></textarea>
                  </div>
                  <div className="form-field">
                    <label>City</label>
                    <input
                      type="text"
                      value={companyInfo.city}
                      onChange={(e) => handleCompanyChange('city', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-field">
                    <label>State</label>
                    <input
                      type="text"
                      value={companyInfo.state}
                      onChange={(e) => handleCompanyChange('state', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-field">
                    <label>PIN Code</label>
                    <input
                      type="text"
                      value={companyInfo.pinCode}
                      onChange={(e) => handleCompanyChange('pinCode', e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-field">
                    <label>
                      State Code
                      <Tooltip text="2-digit state code as per GST (e.g., 24 for Gujarat, 27 for Maharashtra). First 2 digits of your GSTIN." icon position="right" />
                    </label>
                    <input
                      type="text"
                      value={companyInfo.stateCode}
                      onChange={(e) => handleCompanyChange('stateCode', e.target.value)}
                      className="form-input"
                      placeholder="e.g., 24"
                    />
                  </div>
                  <div className="form-field">
                    <label>
                      GSTIN
                      <Tooltip text="15-character GST Identification Number. Format: 2 digits state code + 10 digits PAN + 1 digit entity + 1 check digit + Z" icon position="right" />
                    </label>
                    <input
                      type="text"
                      value={companyInfo.gstin}
                      onChange={(e) => handleCompanyChange('gstin', e.target.value)}
                      className="form-input"
                      placeholder="e.g., 24XXXXX0000X1Z5"
                    />
                  </div>
                  <div className="form-field">
                    <label>GST Registration Date</label>
                    <input
                      type="date"
                      value={companyInfo.gstRegistrationDate || ''}
                      onChange={(e) => handleCompanyChange('gstRegistrationDate', e.target.value)}
                      className="form-input"
                    />
                    <small style={{ color: '#666', fontSize: '0.85em', display: 'block', marginTop: '4px' }}>
                      Leave blank if not registered under GST or GST not applicable
                    </small>
                  </div>
                  <div className="form-field">
                    <label>
                      PAN
                      <Tooltip text="10-character Permanent Account Number. Format: 5 letters + 4 digits + 1 letter" icon position="right" />
                    </label>
                    <input
                      type="text"
                      value={companyInfo.pan}
                      onChange={(e) => handleCompanyChange('pan', e.target.value)}
                      className="form-input"
                      placeholder="e.g., XXXXX0000X"
                    />
                  </div>
                  <div className="form-field">
                    <label>Phone</label>
                    <input
                      type="text"
                      value={companyInfo.phone}
                      onChange={(e) => handleCompanyChange('phone', e.target.value)}
                      className="form-input"
                      placeholder="+91 XXXXXXXXXX"
                    />
                  </div>
                  <div className="form-field">
                    <label>Email</label>
                    <input
                      type="email"
                      value={companyInfo.email}
                      onChange={(e) => handleCompanyChange('email', e.target.value)}
                      className="form-input"
                      placeholder="info@company.com"
                    />
                  </div>
                  <div className="form-field full-width">
                    <label>Company Logo</label>
                    <div style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: '8px',
                      padding: '24px',
                      textAlign: 'center',
                      background: '#f8f9fa',
                      marginTop: '8px'
                    }}>
                      {logoPreview || companyInfo.logo ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                          <img
                            src={logoPreview || companyInfo.logo}
                            alt="Company Logo"
                            style={{
                              maxWidth: '200px',
                              maxHeight: '100px',
                              objectFit: 'contain',
                              border: '1px solid #e5e7eb',
                              borderRadius: '4px',
                              padding: '8px',
                              background: 'white'
                            }}
                          />
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <label htmlFor="logo-upload" style={{
                              cursor: 'pointer',
                              padding: '8px 16px',
                              background: '#6366f1',
                              color: 'white',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '500'
                            }}>
                              Change Logo
                            </label>
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              style={{
                                padding: '8px 16px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer'
                              }}
                            >
                              Remove Logo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label htmlFor="logo-upload" style={{ cursor: 'pointer', display: 'block' }}>
                          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🖼️</div>
                          <div style={{ color: '#6366f1', fontWeight: '600', marginBottom: '4px' }}>
                            Click to upload company logo
                          </div>
                          <div style={{ color: '#6b7280', fontSize: '14px' }}>
                            PNG, JPG or JPEG (Max 2MB)
                          </div>
                        </label>
                      )}
                      <input
                        type="file"
                        id="logo-upload"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleLogoUpload}
                        style={{ display: 'none' }}
                      />
                    </div>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
                      Recommended size: 200x100 pixels. Your logo will appear on invoices and in the dashboard.
                    </p>
                  </div>
                </div>
                <div className="form-actions">
                  <button className="btn-create" onClick={handleSaveCompany} disabled={loading}>
                    <span className="btn-icon">💾</span>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button className="btn-secondary" onClick={handleCancel} disabled={loading}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'invoice' && (
              <div className="settings-section">
                <h2 className="section-title">Invoice Numbering Settings</h2>
                <InfoBox type="tip" title="Invoice Numbering">
                  Set up separate prefixes for Tax Invoices and Proforma Invoices. Each type maintains its own sequence number automatically.
                </InfoBox>

                {/* Tax Invoice Settings */}
                <div style={{marginBottom: '32px', padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                  <h3 style={{margin: '0 0 16px 0', color: '#1e293b', fontSize: '16px', fontWeight: '600'}}>
                    📄 Tax Invoice Settings
                  </h3>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>
                        Tax Invoice Prefix
                        <Tooltip text="Prefix added before invoice numbers. Common formats: INV-, TAX-, TI-, or include year like INV-2024-" icon position="right" />
                      </label>
                      <input
                        type="text"
                        value={invoiceSettings.invoicePrefix}
                        onChange={(e) => handleInvoiceChange('invoicePrefix', e.target.value)}
                        placeholder="INV-"
                        className="form-input"
                      />
                      <small style={{color: '#64748b', fontSize: '12px'}}>e.g., INV- will generate INV-0001, INV-0002...</small>
                    </div>
                    <div className="form-field">
                      <label>Starting Number</label>
                      <input
                        type="number"
                        value={invoiceSettings.startingNumber}
                        onChange={(e) => handleInvoiceChange('startingNumber', parseInt(e.target.value) || 1)}
                        className="form-input"
                        min="1"
                      />
                      <small style={{color: '#64748b', fontSize: '12px'}}>Next invoice will start from this number</small>
                    </div>
                  </div>
                </div>

                {/* Proforma Invoice Settings */}
                <div style={{marginBottom: '32px', padding: '20px', background: '#fefce8', borderRadius: '8px', border: '1px solid #fde047'}}>
                  <h3 style={{margin: '0 0 16px 0', color: '#854d0e', fontSize: '16px', fontWeight: '600'}}>
                    📋 Proforma Invoice Settings
                  </h3>
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Proforma Invoice Prefix</label>
                      <input
                        type="text"
                        value={invoiceSettings.proformaPrefix || 'PI-'}
                        onChange={(e) => handleInvoiceChange('proformaPrefix', e.target.value)}
                        placeholder="PI-"
                        className="form-input"
                      />
                      <small style={{color: '#78716c', fontSize: '12px'}}>e.g., PI- will generate PI-0001, PI-0002...</small>
                    </div>
                    <div className="form-field">
                      <label>Starting Number</label>
                      <input
                        type="number"
                        value={invoiceSettings.proformaStartingNumber || 1}
                        onChange={(e) => handleInvoiceChange('proformaStartingNumber', parseInt(e.target.value) || 1)}
                        className="form-input"
                        min="1"
                      />
                      <small style={{color: '#78716c', fontSize: '12px'}}>Next proforma will start from this number</small>
                    </div>
                  </div>
                </div>

                {/* General Settings */}
                <h3 style={{margin: '0 0 16px 0', color: '#1e293b', fontSize: '16px', fontWeight: '600'}}>
                  ⚙️ General Invoice Settings
                </h3>
                <div className="form-grid">
                  <div className="form-field full-width">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={invoiceSettings.gstEnabled}
                        onChange={(e) => handleInvoiceChange('gstEnabled', e.target.checked)}
                        style={{ marginRight: '8px' }}
                      />
                      Enable GST/Tax Calculations
                    </label>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      Uncheck this if your organization is not registered for GST or tax is not applicable
                    </p>
                  </div>
                  <div className="form-field">
                    <label>Default GST Rate (%)</label>
                    <input
                      type="number"
                      value={invoiceSettings.defaultGstRate}
                      onChange={(e) => handleInvoiceChange('defaultGstRate', parseInt(e.target.value) || 18)}
                      className="form-input"
                      disabled={!invoiceSettings.gstEnabled}
                    />
                  </div>
                  <div className="form-field">
                    <label>Payment Due Days</label>
                    <input
                      type="number"
                      value={invoiceSettings.paymentDueDays}
                      onChange={(e) => handleInvoiceChange('paymentDueDays', parseInt(e.target.value) || 30)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-field full-width">
                    <label>Default Terms & Conditions</label>
                    <textarea
                      rows="4"
                      value={invoiceSettings.termsAndConditions}
                      onChange={(e) => handleInvoiceChange('termsAndConditions', e.target.value)}
                      className="form-input"
                      placeholder="Enter default terms and conditions..."
                    ></textarea>
                  </div>
                  <div className="form-field full-width">
                    <label>Default Notes</label>
                    <textarea
                      rows="3"
                      value={invoiceSettings.notes}
                      onChange={(e) => handleInvoiceChange('notes', e.target.value)}
                      className="form-input"
                      placeholder="Enter default notes..."
                    ></textarea>
                  </div>
                </div>

                {/* Payment Reminder Settings */}
                <h2 className="section-title" style={{marginTop: '32px'}}>Payment Reminder Settings</h2>
                <div className="form-grid">
                  <div className="form-field">
                    <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <input
                        type="checkbox"
                        checked={invoiceSettings.enablePaymentReminders}
                        onChange={(e) => handleInvoiceChange('enablePaymentReminders', e.target.checked)}
                        style={{width: 'auto', height: 'auto'}}
                      />
                      Enable Automatic Payment Reminders
                    </label>
                    <small style={{color: '#6b7280', display: 'block', marginTop: '4px'}}>
                      Automatically send payment reminders for unpaid proforma invoices
                    </small>
                  </div>
                  <div className="form-field">
                    <label>Reminder Frequency (Days)</label>
                    <input
                      type="number"
                      value={invoiceSettings.reminderFrequencyDays}
                      onChange={(e) => handleInvoiceChange('reminderFrequencyDays', parseInt(e.target.value) || 3)}
                      className="form-input"
                      min="1"
                      disabled={!invoiceSettings.enablePaymentReminders}
                    />
                    <small style={{color: '#6b7280', display: 'block', marginTop: '4px'}}>
                      Send reminders every X days until payment is received
                    </small>
                  </div>
                  <div className="form-field full-width">
                    <label>Email Subject Template</label>
                    <input
                      type="text"
                      value={invoiceSettings.reminderEmailSubject}
                      onChange={(e) => handleInvoiceChange('reminderEmailSubject', e.target.value)}
                      className="form-input"
                      placeholder="Payment Reminder for Invoice {invoice_number}"
                      disabled={!invoiceSettings.enablePaymentReminders}
                    />
                    <small style={{color: '#6b7280', display: 'block', marginTop: '4px'}}>
                      Available placeholders: {'{invoice_number}'}, {'{client_name}'}, {'{invoice_date}'}, {'{total_amount}'}
                    </small>
                  </div>
                  <div className="form-field full-width">
                    <label>Email Body Template</label>
                    <textarea
                      rows="6"
                      value={invoiceSettings.reminderEmailBody}
                      onChange={(e) => handleInvoiceChange('reminderEmailBody', e.target.value)}
                      className="form-input"
                      placeholder="Dear {client_name},..."
                      disabled={!invoiceSettings.enablePaymentReminders}
                    ></textarea>
                    <small style={{color: '#6b7280', display: 'block', marginTop: '4px'}}>
                      Available placeholders: {'{invoice_number}'}, {'{client_name}'}, {'{invoice_date}'}, {'{total_amount}'}, {'{reminder_count}'}
                    </small>
                  </div>
                </div>

                <div className="form-actions">
                  <button className="btn-create" onClick={handleSaveInvoice} disabled={loading}>
                    <span className="btn-icon">💾</span>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button className="btn-secondary" onClick={handleCancel} disabled={loading}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="settings-section">
                <div className="form-section-header">
                  <h2 className="section-title">Payment Terms</h2>
                  <button className="btn-add-item" onClick={handleAddPayment}>
                    <span className="btn-icon">➕</span>
                    Add Payment Term
                  </button>
                </div>

                {showPaymentForm && (
                  <div className="form-grid" style={{marginBottom: '24px', padding: '24px', background: '#f8f9fa', borderRadius: '12px'}}>
                    <div className="form-field">
                      <label>Term Name *</label>
                      <input
                        type="text"
                        value={currentPayment.term_name}
                        onChange={(e) => handlePaymentChange('term_name', e.target.value)}
                        className="form-input"
                        placeholder="e.g., Net 30"
                      />
                    </div>
                    <div className="form-field">
                      <label>Days *</label>
                      <input
                        type="number"
                        value={currentPayment.days}
                        onChange={(e) => handlePaymentChange('days', parseInt(e.target.value) || 0)}
                        className="form-input"
                        min="0"
                      />
                    </div>
                    <div className="form-field full-width">
                      <label>Description *</label>
                      <textarea
                        rows="2"
                        value={currentPayment.description}
                        onChange={(e) => handlePaymentChange('description', e.target.value)}
                        className="form-input"
                        placeholder="e.g., Payment due within 30 days"
                      ></textarea>
                    </div>
                    <div className="form-field full-width">
                      <div className="form-actions" style={{borderTop: 'none', paddingTop: '0'}}>
                        <button className="btn-create" onClick={handleSavePayment}>
                          <span className="btn-icon">💾</span>
                          Save Payment Term
                        </button>
                        <button className="btn-secondary" onClick={handleCancelPayment}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {paymentTerms.length === 0 && !showPaymentForm ? (
                  <div className="empty-state-large">
                    <div className="empty-icon-large">💳</div>
                    <h3 className="empty-title">No Payment Terms Yet</h3>
                    <p className="empty-description">Click "Add Payment Term" to create your first term</p>
                  </div>
                ) : !showPaymentForm && (
                  <div className="data-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Term Name</th>
                          <th>Days</th>
                          <th>Description</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentTerms.map((term) => (
                          <tr key={term.id}>
                            <td><strong>{term.term_name}</strong></td>
                            <td>{term.days} days</td>
                            <td>{term.description}</td>
                            <td>
                              <button className="btn-icon-small" onClick={() => handleEditPayment(term)} title="Edit">
                                ✏️
                              </button>
                              <button className="btn-icon-small" onClick={() => handleDeletePayment(term.id)} title="Delete">
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'email' && (
              <div className="settings-section">
                <h2 className="section-title">Email Settings</h2>
                <InfoBox type="warning" title="Important">
                  Configure SMTP settings to send invoices directly to clients via email. For Gmail, you need to create an App Password.
                </InfoBox>

                {/* Configuration Instructions */}
                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #3b82f6',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px'
                }}>
                  <h3 style={{color: '#1e40af', marginBottom: '12px', fontSize: '14px', fontWeight: '600'}}>
                    📋 Email Configuration Instructions
                  </h3>
                  <div style={{fontSize: '13px', color: '#1e3a8a', lineHeight: '1.6'}}>
                    <p style={{marginBottom: '8px'}}><strong>For Gmail Users:</strong></p>
                    <ul style={{marginLeft: '20px', marginBottom: '12px'}}>
                      <li>SMTP Host: <code style={{background: '#dbeafe', padding: '2px 6px', borderRadius: '3px'}}>smtp.gmail.com</code></li>
                      <li>SMTP Port: <code style={{background: '#dbeafe', padding: '2px 6px', borderRadius: '3px'}}>587</code> (for TLS) or <code style={{background: '#dbeafe', padding: '2px 6px', borderRadius: '3px'}}>465</code> (for SSL)</li>
                      <li>Enable "App Password" in your Google Account settings (Security → 2-Step Verification → App Passwords)</li>
                      <li>Use the generated App Password instead of your regular Gmail password</li>
                    </ul>
                    <p style={{marginBottom: '8px'}}><strong>For Other Email Providers:</strong></p>
                    <ul style={{marginLeft: '20px'}}>
                      <li>Outlook/Office 365: <code style={{background: '#dbeafe', padding: '2px 6px', borderRadius: '3px'}}>smtp.office365.com</code>, Port: <code style={{background: '#dbeafe', padding: '2px 6px', borderRadius: '3px'}}>587</code></li>
                      <li>Yahoo: <code style={{background: '#dbeafe', padding: '2px 6px', borderRadius: '3px'}}>smtp.mail.yahoo.com</code>, Port: <code style={{background: '#dbeafe', padding: '2px 6px', borderRadius: '3px'}}>587</code></li>
                      <li>Contact your email provider for SMTP settings</li>
                    </ul>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label>SMTP Host *</label>
                    <input
                      type="text"
                      value={emailSettings.smtpHost}
                      onChange={(e) => handleEmailChange('smtpHost', e.target.value)}
                      className="form-input"
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="form-field">
                    <label>SMTP Port *</label>
                    <input
                      type="number"
                      value={emailSettings.smtpPort}
                      onChange={(e) => handleEmailChange('smtpPort', parseInt(e.target.value) || 587)}
                      className="form-input"
                      placeholder="587"
                    />
                  </div>
                  <div className="form-field">
                    <label>SMTP Username *</label>
                    <input
                      type="text"
                      value={emailSettings.smtpUsername}
                      onChange={(e) => handleEmailChange('smtpUsername', e.target.value)}
                      className="form-input"
                      placeholder="your-email@example.com"
                    />
                  </div>
                  <div className="form-field">
                    <label>SMTP Password *</label>
                    <input
                      type="password"
                      value={emailSettings.smtpPassword}
                      onChange={(e) => handleEmailChange('smtpPassword', e.target.value)}
                      className="form-input"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="form-field">
                    <label>From Email *</label>
                    <input
                      type="email"
                      value={emailSettings.fromEmail}
                      onChange={(e) => handleEmailChange('fromEmail', e.target.value)}
                      className="form-input"
                      placeholder="noreply@company.com"
                    />
                  </div>
                  <div className="form-field">
                    <label>From Name</label>
                    <input
                      type="text"
                      value={emailSettings.fromName}
                      onChange={(e) => handleEmailChange('fromName', e.target.value)}
                      className="form-input"
                      placeholder="Your Company Name"
                    />
                  </div>
                  <div className="form-field full-width">
                    <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <input
                        type="checkbox"
                        checked={emailSettings.useTLS}
                        onChange={(e) => handleEmailChange('useTLS', e.target.checked)}
                        style={{width: 'auto'}}
                      />
                      Use TLS/SSL
                    </label>
                  </div>
                  <div className="form-field full-width">
                    <label>Email Signature</label>
                    <textarea
                      rows="4"
                      value={emailSettings.emailSignature}
                      onChange={(e) => handleEmailChange('emailSignature', e.target.value)}
                      className="form-input"
                      placeholder="Enter your default email signature..."
                    ></textarea>
                  </div>
                </div>
                <div className="form-actions">
                  <button className="btn-create" onClick={handleSaveEmail} disabled={loading}>
                    <span className="btn-icon">💾</span>
                    {loading ? 'Saving...' : 'Save Email Settings'}
                  </button>
                  <button className="btn-secondary" onClick={handleTestEmail}>
                    <span className="btn-icon">📧</span>
                    Send Test Email
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="settings-section">
                <div className="form-section-header">
                  <h2 className="section-title">Users & Roles</h2>
                  <button className="btn-add-item" onClick={handleAddUser}>
                    <span className="btn-icon">➕</span>
                    Add User
                  </button>
                </div>

                {showUserForm && (
                  <div className="form-grid" style={{marginBottom: '24px', padding: '24px', background: '#f8f9fa', borderRadius: '12px'}}>
                    <div className="form-field">
                      <label>Full Name *</label>
                      <input
                        type="text"
                        value={currentUser.name}
                        onChange={(e) => handleUserChange('name', e.target.value)}
                        className="form-input"
                        placeholder="Enter full name"
                      />
                    </div>
                    <div className="form-field">
                      <label>Email *</label>
                      <input
                        type="email"
                        value={currentUser.email}
                        onChange={(e) => handleUserChange('email', e.target.value)}
                        className="form-input"
                        placeholder="user@example.com"
                      />
                    </div>
                    <div className="form-field">
                      <label>Role *</label>
                      <select
                        value={currentUser.role}
                        onChange={(e) => handleUserChange('role', e.target.value)}
                        className="form-input"
                      >
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Password {!currentUser.id && '*'}</label>
                      <input
                        type="password"
                        value={currentUser.password}
                        onChange={(e) => handleUserChange('password', e.target.value)}
                        className="form-input"
                        placeholder={currentUser.id ? 'Leave blank to keep current' : 'Enter password'}
                      />
                    </div>
                    <div className="form-field full-width">
                      <div className="form-actions" style={{borderTop: 'none', paddingTop: '0'}}>
                        <button className="btn-create" onClick={handleSaveUser}>
                          <span className="btn-icon">💾</span>
                          Save User
                        </button>
                        <button className="btn-secondary" onClick={handleCancelUser}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {users.length === 0 && !showUserForm ? (
                  <div className="empty-state-large">
                    <div className="empty-icon-large">👤</div>
                    <h3 className="empty-title">No Users Yet</h3>
                    <p className="empty-description">Click "Add User" to create your first user</p>
                  </div>
                ) : !showUserForm && (
                  <div className="data-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => {
                          const fullName = user.first_name && user.last_name
                            ? `${user.first_name} ${user.last_name}`
                            : user.first_name || user.last_name || user.username;
                          const isActive = user.is_active !== undefined ? user.is_active : user.status === 'active';

                          return (
                            <tr key={user.id}>
                              <td><strong>{fullName}</strong></td>
                              <td>{user.email}</td>
                              <td>
                                <span className={`status-badge status-${user.role || 'user'}`}>
                                  {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                                </span>
                              </td>
                              <td>
                                <span className={`status-badge status-${isActive ? 'active' : 'inactive'}`}>
                                  {isActive ? '✓ Active' : '✗ Inactive'}
                                </span>
                              </td>
                              <td>
                                <button className="btn-icon-small" onClick={() => handleEditUser(user)} title="Edit">
                                  ✏️
                                </button>
                                <button
                                  className="btn-icon-small"
                                  onClick={() => handleToggleUserStatus(user.id)}
                                  title={isActive ? 'Deactivate' : 'Activate'}
                                >
                                  {isActive ? '🔒' : '🔓'}
                                </button>
                                <button className="btn-icon-small" onClick={() => handleDeleteUser(user.id)} title="Delete">
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'format' && (
              <InvoiceFormatEditor />
            )}

            {activeTab === 'backup' && (
              <div className="settings-section">
                <h2 className="section-title">Export Data</h2>
                <p style={{color: '#6b7280', marginBottom: '24px'}}>
                  Export your organization's data for backup or analysis purposes
                </p>

                {/* Export All Data */}
                <div style={{marginBottom: '32px', padding: '24px', background: '#f0f9ff', border: '1px solid #0ea5e9', borderRadius: '12px'}}>
                  <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#0369a1'}}>
                    Export All Data
                  </h3>
                  <p style={{color: '#0c4a6e', marginBottom: '16px', fontSize: '14px'}}>
                    Download all invoices, clients, and payments in a single file with multiple sheets
                  </p>
                  <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
                    <button
                      className="btn-create"
                      onClick={() => handleExportData('excel', 'all')}
                      disabled={exporting}
                    >
                      <span className="btn-icon">📊</span>
                      {exporting ? 'Exporting...' : 'Export to Excel'}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => handleExportData('csv', 'all')}
                      disabled={exporting}
                    >
                      <span className="btn-icon">📄</span>
                      {exporting ? 'Exporting...' : 'Export to CSV'}
                    </button>
                  </div>
                </div>

                {/* Export Invoices Only */}
                <div style={{marginBottom: '24px', padding: '24px', background: '#f8f9fa', borderRadius: '12px'}}>
                  <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937'}}>
                    Export Invoices
                  </h3>
                  <p style={{color: '#6b7280', marginBottom: '16px', fontSize: '14px'}}>
                    Download only invoice data including invoice number, client, amounts, and status
                  </p>
                  <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
                    <button
                      className="btn-secondary"
                      onClick={() => handleExportData('excel', 'invoices')}
                      disabled={exporting}
                      style={{fontSize: '14px', padding: '8px 16px'}}
                    >
                      Excel
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => handleExportData('csv', 'invoices')}
                      disabled={exporting}
                      style={{fontSize: '14px', padding: '8px 16px'}}
                    >
                      CSV
                    </button>
                  </div>
                </div>

                {/* Export Clients Only */}
                <div style={{marginBottom: '24px', padding: '24px', background: '#f8f9fa', borderRadius: '12px'}}>
                  <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937'}}>
                    Export Clients
                  </h3>
                  <p style={{color: '#6b7280', marginBottom: '16px', fontSize: '14px'}}>
                    Download client directory with contact information and billing details
                  </p>
                  <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
                    <button
                      className="btn-secondary"
                      onClick={() => handleExportData('excel', 'clients')}
                      disabled={exporting}
                      style={{fontSize: '14px', padding: '8px 16px'}}
                    >
                      Excel
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => handleExportData('csv', 'clients')}
                      disabled={exporting}
                      style={{fontSize: '14px', padding: '8px 16px'}}
                    >
                      CSV
                    </button>
                  </div>
                </div>

                {/* Export Payments Only */}
                <div style={{padding: '24px', background: '#f8f9fa', borderRadius: '12px', marginBottom: '32px'}}>
                  <h3 style={{fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937'}}>
                    Export Payments
                  </h3>
                  <p style={{color: '#6b7280', marginBottom: '16px', fontSize: '14px'}}>
                    Download payment records with amounts, dates, and payment methods
                  </p>
                  <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
                    <button
                      className="btn-secondary"
                      onClick={() => handleExportData('excel', 'payments')}
                      disabled={exporting}
                      style={{fontSize: '14px', padding: '8px 16px'}}
                    >
                      Excel
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => handleExportData('csv', 'payments')}
                      disabled={exporting}
                      style={{fontSize: '14px', padding: '8px 16px'}}
                    >
                      CSV
                    </button>
                  </div>
                </div>

                {/* Tally Prime XML Export */}
                <h2 className="section-title" style={{marginTop: '32px', marginBottom: '16px'}}>
                  Export to Tally Prime
                </h2>
                <p style={{color: '#6b7280', marginBottom: '24px'}}>
                  Export your invoices in XML format compatible with Tally Prime for direct import
                </p>

                {/* Pre-Requirements Box */}
                <div style={{
                  marginBottom: '24px',
                  padding: '20px',
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  border: '1px solid #f59e0b',
                  borderRadius: '12px'
                }}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px'}}>
                    <span style={{fontSize: '24px'}}>⚠️</span>
                    <h3 style={{margin: 0, color: '#92400e', fontSize: '16px', fontWeight: '600'}}>
                      Pre-Requirements for Tally Import
                    </h3>
                    <button
                      onClick={() => setShowTallyRequirements(!showTallyRequirements)}
                      style={{
                        marginLeft: 'auto',
                        background: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      {showTallyRequirements ? 'Hide Details' : 'Show Details'}
                    </button>
                  </div>

                  <p style={{color: '#78350f', fontSize: '14px', margin: 0, lineHeight: '1.6'}}>
                    Before importing the XML file into Tally Prime, ensure the following masters are created in Tally.
                  </p>

                  {showTallyRequirements && (
                    <div style={{marginTop: '16px', background: 'rgba(255,255,255,0.7)', padding: '16px', borderRadius: '8px'}}>
                      <h4 style={{color: '#92400e', marginBottom: '12px', fontSize: '14px', fontWeight: '600'}}>
                        1. Ledgers to Create in Tally (Gateway of Tally → Create → Ledger)
                      </h4>
                      <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '13px'}}>
                        <thead>
                          <tr style={{background: '#fef3c7'}}>
                            <th style={{padding: '8px', textAlign: 'left', border: '1px solid #fbbf24'}}>Ledger Name</th>
                            <th style={{padding: '8px', textAlign: 'left', border: '1px solid #fbbf24'}}>Under Group</th>
                            <th style={{padding: '8px', textAlign: 'left', border: '1px solid #fbbf24'}}>Purpose</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{padding: '8px', border: '1px solid #fbbf24'}}><strong>Sales</strong></td>
                            <td style={{padding: '8px', border: '1px solid #fbbf24'}}>Sales Accounts</td>
                            <td style={{padding: '8px', border: '1px solid #fbbf24'}}>For sales revenue</td>
                          </tr>
                          <tr style={{background: '#fffbeb'}}>
                            <td style={{padding: '8px', border: '1px solid #fbbf24'}}><strong>CGST @9%</strong></td>
                            <td style={{padding: '8px', border: '1px solid #fbbf24'}}>Duties & Taxes</td>
                            <td style={{padding: '8px', border: '1px solid #fbbf24'}}>Central GST (intra-state)</td>
                          </tr>
                          <tr>
                            <td style={{padding: '8px', border: '1px solid #fbbf24'}}><strong>SGST @9%</strong></td>
                            <td style={{padding: '8px', border: '1px solid #fbbf24'}}>Duties & Taxes</td>
                            <td style={{padding: '8px', border: '1px solid #fbbf24'}}>State GST (intra-state)</td>
                          </tr>
                          <tr style={{background: '#fffbeb'}}>
                            <td style={{padding: '8px', border: '1px solid #fbbf24'}}><strong>IGST @18%</strong></td>
                            <td style={{padding: '8px', border: '1px solid #fbbf24'}}>Duties & Taxes</td>
                            <td style={{padding: '8px', border: '1px solid #fbbf24'}}>Integrated GST (inter-state)</td>
                          </tr>
                          <tr>
                            <td style={{padding: '8px', border: '1px solid #fbbf24'}}><strong>Round Off</strong></td>
                            <td style={{padding: '8px', border: '1px solid #fbbf24'}}>Indirect Expenses</td>
                            <td style={{padding: '8px', border: '1px solid #fbbf24'}}>For rounding adjustments</td>
                          </tr>
                          <tr style={{background: '#fffbeb'}}>
                            <td style={{padding: '8px', border: '1px solid #fbbf24'}}><strong>[Client Names]</strong></td>
                            <td style={{padding: '8px', border: '1px solid #fbbf24'}}>Sundry Debtors</td>
                            <td style={{padding: '8px', border: '1px solid #fbbf24'}}>Your customers</td>
                          </tr>
                        </tbody>
                      </table>

                      <h4 style={{color: '#92400e', marginBottom: '12px', fontSize: '14px', fontWeight: '600'}}>
                        2. GST Ledger Configuration
                      </h4>
                      <ul style={{color: '#78350f', fontSize: '13px', marginBottom: '16px', paddingLeft: '20px', lineHeight: '1.8'}}>
                        <li>Set <strong>Type of Ledger</strong> = "Central Tax" for CGST ledgers</li>
                        <li>Set <strong>Type of Ledger</strong> = "State Tax" for SGST ledgers</li>
                        <li>Set <strong>Type of Ledger</strong> = "Integrated Tax" for IGST ledgers</li>
                        <li>Create separate ledgers for each GST rate (e.g., CGST @2.5%, CGST @6%, CGST @9%)</li>
                      </ul>

                      <h4 style={{color: '#92400e', marginBottom: '12px', fontSize: '14px', fontWeight: '600'}}>
                        3. Stock Items (Optional - for inventory tracking)
                      </h4>
                      <ul style={{color: '#78350f', fontSize: '13px', marginBottom: '16px', paddingLeft: '20px', lineHeight: '1.8'}}>
                        <li>Create stock items matching invoice item descriptions</li>
                        <li>Create a godown named "Main Location"</li>
                        <li>Set HSN/SAC codes in stock items</li>
                      </ul>

                      <h4 style={{color: '#92400e', marginBottom: '12px', fontSize: '14px', fontWeight: '600'}}>
                        4. Import Steps in Tally Prime
                      </h4>
                      <ol style={{color: '#78350f', fontSize: '13px', paddingLeft: '20px', lineHeight: '2'}}>
                        <li>Open your company in Tally Prime</li>
                        <li>Go to <strong>Gateway of Tally → Import</strong></li>
                        <li>Select <strong>Transactions (Vouchers)</strong></li>
                        <li>Browse and select the downloaded XML file</li>
                        <li>Press Enter to import</li>
                        <li>Review imported vouchers in Day Book</li>
                      </ol>

                      <div style={{
                        marginTop: '16px',
                        padding: '12px',
                        background: '#fef2f2',
                        border: '1px solid #ef4444',
                        borderRadius: '6px'
                      }}>
                        <p style={{color: '#991b1b', fontSize: '13px', margin: 0, fontWeight: '500'}}>
                          ⚠️ Important: If any ledger or stock item doesn't exist in Tally, the import will fail.
                          Create all required masters before importing.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Tally Export Form */}
                <div style={{
                  padding: '24px',
                  background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                  border: '1px solid #8b5cf6',
                  borderRadius: '12px'
                }}>
                  <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#5b21b6'}}>
                    Export Sales Invoices to Tally Prime
                  </h3>

                  <div className="form-grid" style={{marginBottom: '20px'}}>
                    <div className="form-field">
                      <label style={{color: '#5b21b6', fontWeight: '500'}}>Start Date</label>
                      <input
                        type="date"
                        value={tallyExportParams.startDate}
                        onChange={(e) => setTallyExportParams({...tallyExportParams, startDate: e.target.value})}
                        className="form-input"
                        style={{background: 'white'}}
                      />
                      <small style={{color: '#7c3aed', fontSize: '12px'}}>Leave blank for all invoices</small>
                    </div>
                    <div className="form-field">
                      <label style={{color: '#5b21b6', fontWeight: '500'}}>End Date</label>
                      <input
                        type="date"
                        value={tallyExportParams.endDate}
                        onChange={(e) => setTallyExportParams({...tallyExportParams, endDate: e.target.value})}
                        className="form-input"
                        style={{background: 'white'}}
                      />
                      <small style={{color: '#7c3aed', fontSize: '12px'}}>Leave blank for all invoices</small>
                    </div>
                    <div className="form-field">
                      <label style={{color: '#5b21b6', fontWeight: '500'}}>Invoice Type</label>
                      <select
                        value={tallyExportParams.invoiceType}
                        onChange={(e) => setTallyExportParams({...tallyExportParams, invoiceType: e.target.value})}
                        className="form-input"
                        style={{background: 'white'}}
                      >
                        <option value="tax">Tax Invoices Only</option>
                        <option value="proforma">Proforma Invoices Only</option>
                        <option value="all">All Invoices</option>
                      </select>
                      <small style={{color: '#7c3aed', fontSize: '12px'}}>Select invoice type to export</small>
                    </div>
                  </div>

                  <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px'}}>
                    <button
                      className="btn-create"
                      onClick={handleTallyExport}
                      disabled={exporting}
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                        fontSize: '15px',
                        padding: '12px 24px'
                      }}
                    >
                      <span className="btn-icon">📥</span>
                      {exporting ? 'Exporting...' : 'Download XML'}
                    </button>
                    <button
                      className="btn-create"
                      onClick={handleTallyExcelExport}
                      disabled={exporting}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        fontSize: '15px',
                        padding: '12px 24px'
                      }}
                    >
                      <span className="btn-icon">📊</span>
                      {exporting ? 'Exporting...' : 'Download Excel'}
                    </button>
                  </div>
                  <p style={{color: '#6b7280', fontSize: '13px', margin: 0}}>
                    Only "Sent" and "Paid" invoices will be exported. XML is for direct import, Excel includes multiple sheets with import instructions.
                  </p>
                </div>

                {/* Excel Import Guide */}
                <div style={{
                  marginTop: '24px',
                  padding: '20px',
                  background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                  border: '1px solid #10b981',
                  borderRadius: '12px'
                }}>
                  <h4 style={{color: '#065f46', marginBottom: '16px', fontSize: '16px', fontWeight: '600'}}>
                    📊 Excel Import Guide for Tally Prime
                  </h4>
                  <p style={{color: '#047857', fontSize: '14px', marginBottom: '16px'}}>
                    The Excel file contains 6 sheets to help you import data into Tally Prime:
                  </p>

                  <div style={{background: 'rgba(255,255,255,0.7)', padding: '16px', borderRadius: '8px', marginBottom: '16px'}}>
                    <h5 style={{color: '#065f46', marginBottom: '10px', fontSize: '14px', fontWeight: '600'}}>Excel Sheets Included:</h5>
                    <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
                      <thead>
                        <tr style={{background: '#d1fae5'}}>
                          <th style={{padding: '8px', textAlign: 'left', border: '1px solid #10b981'}}>Sheet Name</th>
                          <th style={{padding: '8px', textAlign: 'left', border: '1px solid #10b981'}}>Purpose</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{padding: '8px', border: '1px solid #10b981'}}><strong>Sales Vouchers</strong></td>
                          <td style={{padding: '8px', border: '1px solid #10b981'}}>Main voucher data for import</td>
                        </tr>
                        <tr style={{background: '#ecfdf5'}}>
                          <td style={{padding: '8px', border: '1px solid #10b981'}}><strong>Item Details</strong></td>
                          <td style={{padding: '8px', border: '1px solid #10b981'}}>Line-item breakdown with HSN/SAC</td>
                        </tr>
                        <tr>
                          <td style={{padding: '8px', border: '1px solid #10b981'}}><strong>Party Ledgers</strong></td>
                          <td style={{padding: '8px', border: '1px solid #10b981'}}>Customer details to create in Tally</td>
                        </tr>
                        <tr style={{background: '#ecfdf5'}}>
                          <td style={{padding: '8px', border: '1px solid #10b981'}}><strong>GST Summary</strong></td>
                          <td style={{padding: '8px', border: '1px solid #10b981'}}>Tax breakdown by GST rate</td>
                        </tr>
                        <tr>
                          <td style={{padding: '8px', border: '1px solid #10b981'}}><strong>Import Instructions</strong></td>
                          <td style={{padding: '8px', border: '1px solid #10b981'}}>Step-by-step guide</td>
                        </tr>
                        <tr style={{background: '#ecfdf5'}}>
                          <td style={{padding: '8px', border: '1px solid #10b981'}}><strong>Ledgers Required</strong></td>
                          <td style={{padding: '8px', border: '1px solid #10b981'}}>List of ledgers to create first</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h5 style={{color: '#065f46', marginBottom: '10px', fontSize: '14px', fontWeight: '600'}}>Steps to Import Excel into Tally Prime:</h5>
                  <ol style={{color: '#047857', fontSize: '13px', paddingLeft: '20px', lineHeight: '2', marginBottom: '16px'}}>
                    <li><strong>Create Masters First:</strong> Use "Party Ledgers" & "Ledgers Required" sheets to create ledgers in Tally</li>
                    <li><strong>Open Tally Prime:</strong> Go to <strong>Gateway of Tally → Import → Data</strong></li>
                    <li><strong>Select Import Type:</strong> Choose <strong>"Import from Excel"</strong></li>
                    <li><strong>Browse Excel File:</strong> Select the downloaded Excel file</li>
                    <li><strong>Select Sheet:</strong> Choose <strong>"Sales Vouchers"</strong> sheet</li>
                    <li><strong>Map Columns:</strong> Tally will auto-map, verify mappings:
                      <ul style={{marginTop: '8px', marginLeft: '16px'}}>
                        <li>Voucher Date → Date column</li>
                        <li>Voucher Number → Voucher Number column</li>
                        <li>Party Ledger → Party Ledger Name column</li>
                        <li>Amount → Net Amount column</li>
                      </ul>
                    </li>
                    <li><strong>Import:</strong> Click Import and review in Day Book</li>
                  </ol>

                  <div style={{
                    padding: '12px',
                    background: '#fef3c7',
                    border: '1px solid #f59e0b',
                    borderRadius: '6px'
                  }}>
                    <p style={{color: '#92400e', fontSize: '13px', margin: 0, fontWeight: '500'}}>
                      💡 Tip: If you face issues with Excel import, use the XML file instead. XML provides direct import without column mapping.
                    </p>
                  </div>
                </div>

                {/* Tally Export Info */}
                <div style={{
                  marginTop: '24px',
                  padding: '16px',
                  background: '#f0f9ff',
                  border: '1px solid #0ea5e9',
                  borderRadius: '8px'
                }}>
                  <h4 style={{color: '#0369a1', marginBottom: '12px', fontSize: '14px', fontWeight: '600'}}>
                    What's Included in Both Exports?
                  </h4>
                  <ul style={{color: '#0c4a6e', fontSize: '13px', margin: 0, paddingLeft: '20px', lineHeight: '1.8'}}>
                    <li>Invoice number, date, and reference</li>
                    <li>Customer/Party details (name, state, place of supply)</li>
                    <li>Item-wise details with HSN/SAC codes</li>
                    <li>GST breakdown (CGST/SGST for intra-state, IGST for inter-state)</li>
                    <li>Round-off adjustments</li>
                    <li>Bill-wise allocation for receivables tracking</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
