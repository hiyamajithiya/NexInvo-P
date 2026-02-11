import React, { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '../utils/formatCurrency';
import { paymentReminderAPI } from '../services/api';
import './PaymentReminders.css';

const PaymentReminders = () => {
  const [activeTab, setActiveTab] = useState('pending'); // pending, scheduled, sent, settings
  const [pendingPayments, setPendingPayments] = useState([]);
  const [scheduledReminders, setScheduledReminders] = useState([]);
  const [sentReminders, setSentReminders] = useState([]);
  const [reminderSettings, setReminderSettings] = useState({
    autoReminder: false,
    reminderDays: [7, 3, 1, 0], // Days before due date
    overdueReminderDays: [1, 7, 15, 30], // Days after due date
    emailEnabled: true,
    smsEnabled: false,
    whatsappEnabled: false,
    emailTemplate: 'default',
    smsTemplate: 'default',
    includeInvoiceDetails: true,
    includePaymentLink: true
  });
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [filter, setFilter] = useState({
    type: 'all', // all, receivable, payable
    overdueDays: 'all', // all, 0-30, 31-60, 61-90, 90+
    minAmount: '',
    maxAmount: ''
  });
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    channel: 'email',
    customMessage: '',
    scheduleDate: '',
    scheduleTime: ''
  });

  const fetchPendingPayments = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch invoices with pending payments (receivables)
      const invoicesResponse = await paymentReminderAPI.getInvoices();

      // Fetch bills with pending payments (payables)
      const billsResponse = await paymentReminderAPI.getPurchaseBills();

      const today = new Date();
      const pending = [];

      // Process receivables (sales invoices)
      if (invoicesResponse.data?.invoices) {
        invoicesResponse.data.invoices.forEach(inv => {
          const balance = (inv.total_amount || 0) - (inv.amount_paid || 0);
          if (balance > 0) {
            const dueDate = inv.due_date ? new Date(inv.due_date) : null;
            const daysOverdue = dueDate ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;

            pending.push({
              id: `INV-${inv.id}`,
              type: 'receivable',
              voucherType: 'Sales Invoice',
              voucherNumber: inv.invoice_number,
              partyName: inv.customer_name || inv.party_name || 'Unknown',
              partyEmail: inv.customer_email || inv.party_email || '',
              partyPhone: inv.customer_phone || inv.party_phone || '',
              amount: inv.total_amount,
              balance: balance,
              invoiceDate: inv.invoice_date,
              dueDate: inv.due_date,
              daysOverdue: daysOverdue,
              lastReminderSent: inv.last_reminder_date || null
            });
          }
        });
      }

      // Process payables (purchase bills)
      if (billsResponse.data?.bills) {
        billsResponse.data.bills.forEach(bill => {
          const balance = (bill.total_amount || 0) - (bill.amount_paid || 0);
          if (balance > 0) {
            const dueDate = bill.due_date ? new Date(bill.due_date) : null;
            const daysOverdue = dueDate ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0;

            pending.push({
              id: `BILL-${bill.id}`,
              type: 'payable',
              voucherType: 'Purchase Bill',
              voucherNumber: bill.bill_number,
              partyName: bill.supplier_name || bill.party_name || 'Unknown',
              partyEmail: bill.supplier_email || bill.party_email || '',
              partyPhone: bill.supplier_phone || bill.party_phone || '',
              amount: bill.total_amount,
              balance: balance,
              invoiceDate: bill.bill_date,
              dueDate: bill.due_date,
              daysOverdue: daysOverdue,
              lastReminderSent: bill.last_reminder_date || null
            });
          }
        });
      }

      // Apply filters
      let filtered = pending;

      if (filter.type !== 'all') {
        filtered = filtered.filter(p => p.type === filter.type);
      }

      if (filter.overdueDays !== 'all') {
        switch (filter.overdueDays) {
          case '0-30':
            filtered = filtered.filter(p => p.daysOverdue >= 0 && p.daysOverdue <= 30);
            break;
          case '31-60':
            filtered = filtered.filter(p => p.daysOverdue > 30 && p.daysOverdue <= 60);
            break;
          case '61-90':
            filtered = filtered.filter(p => p.daysOverdue > 60 && p.daysOverdue <= 90);
            break;
          case '90+':
            filtered = filtered.filter(p => p.daysOverdue > 90);
            break;
          default:
            break;
        }
      }

      if (filter.minAmount) {
        filtered = filtered.filter(p => p.balance >= parseFloat(filter.minAmount));
      }

      if (filter.maxAmount) {
        filtered = filtered.filter(p => p.balance <= parseFloat(filter.maxAmount));
      }

      // Sort by days overdue (most overdue first)
      filtered.sort((a, b) => b.daysOverdue - a.daysOverdue);

      setPendingPayments(filtered);
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchScheduledReminders = useCallback(async () => {
    try {
      const response = await paymentReminderAPI.getScheduled();
      setScheduledReminders(response.data?.reminders || []);
    } catch (error) {
      setScheduledReminders([]);
    }
  }, []);

  const fetchSentReminders = useCallback(async () => {
    try {
      const response = await paymentReminderAPI.getHistory();
      setSentReminders(response.data?.reminders || []);
    } catch (error) {
      setSentReminders([]);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingPayments();
    } else if (activeTab === 'scheduled') {
      fetchScheduledReminders();
    } else if (activeTab === 'sent') {
      fetchSentReminders();
    }
  }, [activeTab, fetchPendingPayments, fetchScheduledReminders, fetchSentReminders]);

  const handleSelectItem = (id) => {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.length === pendingPayments.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(pendingPayments.map(p => p.id));
    }
  };

  const handleSendReminder = async () => {
    if (selectedItems.length === 0) {
      alert('Please select at least one payment to send reminder');
      return;
    }
    setShowReminderModal(true);
  };

  const confirmSendReminder = async () => {
    setSendingReminder(true);
    try {
      const selectedPayments = pendingPayments.filter(p => selectedItems.includes(p.id));

      for (const payment of selectedPayments) {
        const reminderData = {
          payment_id: payment.id,
          party_name: payment.partyName,
          party_email: payment.partyEmail,
          party_phone: payment.partyPhone,
          voucher_number: payment.voucherNumber,
          voucher_type: payment.voucherType,
          amount: payment.balance,
          due_date: payment.dueDate,
          channel: reminderForm.channel,
          custom_message: reminderForm.customMessage,
          schedule_date: reminderForm.scheduleDate || null,
          schedule_time: reminderForm.scheduleTime || null
        };

        await paymentReminderAPI.send(reminderData);
      }

      alert(`Reminder${selectedItems.length > 1 ? 's' : ''} sent successfully!`);
      setShowReminderModal(false);
      setSelectedItems([]);
      setReminderForm({
        channel: 'email',
        customMessage: '',
        scheduleDate: '',
        scheduleTime: ''
      });
      fetchPendingPayments();
    } catch (error) {
      alert('Failed to send reminder. Please try again.');
    } finally {
      setSendingReminder(false);
    }
  };

  const cancelScheduledReminder = async (reminderId) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled reminder?')) {
      return;
    }

    try {
      await paymentReminderAPI.delete(reminderId);
      fetchScheduledReminders();
    } catch (error) {
      alert('Failed to cancel reminder');
    }
  };

  const saveSettings = async () => {
    try {
      await paymentReminderAPI.updateSettings(reminderSettings);
      alert('Settings saved successfully!');
    } catch (error) {
      alert('Failed to save settings');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getOverdueColor = (days) => {
    if (days <= 0) return '#28a745';
    if (days <= 30) return '#ffc107';
    if (days <= 60) return '#fd7e14';
    if (days <= 90) return '#dc3545';
    return '#6f42c1';
  };

  const getOverdueText = (days) => {
    if (days < 0) return `Due in ${Math.abs(days)} days`;
    if (days === 0) return 'Due today';
    return `${days} days overdue`;
  };

  const getTotalSelected = () => {
    return pendingPayments
      .filter(p => selectedItems.includes(p.id))
      .reduce((sum, p) => sum + p.balance, 0);
  };

  return (
    <div className="payment-reminders-container" style={{ padding: '20px' }}>
      <div className="reminders-header">
        <div className="reminders-title">
          <span>🔔</span>
          Payment Reminders
        </div>

        <div className="reminders-tabs">
          <button
            className={`reminders-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <span>⏳</span> Pending
          </button>
          <button
            className={`reminders-tab ${activeTab === 'scheduled' ? 'active' : ''}`}
            onClick={() => setActiveTab('scheduled')}
          >
            <span>📅</span> Scheduled
          </button>
          <button
            className={`reminders-tab ${activeTab === 'sent' ? 'active' : ''}`}
            onClick={() => setActiveTab('sent')}
          >
            <span>📜</span> History
          </button>
          <button
            className={`reminders-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span>⚙️</span> Settings
          </button>
        </div>
      </div>

      {activeTab === 'pending' && (
        <>
          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card">
              <div className="summary-card-title">Total Receivables</div>
              <div className="summary-card-value" style={{ color: '#28a745' }}>
                {formatCurrency(pendingPayments.filter(p => p.type === 'receivable').reduce((sum, p) => sum + p.balance, 0))}
              </div>
              <div className="summary-card-subtitle">
                {pendingPayments.filter(p => p.type === 'receivable').length} invoices
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-card-title">Total Payables</div>
              <div className="summary-card-value" style={{ color: '#fd7e14' }}>
                {formatCurrency(pendingPayments.filter(p => p.type === 'payable').reduce((sum, p) => sum + p.balance, 0))}
              </div>
              <div className="summary-card-subtitle">
                {pendingPayments.filter(p => p.type === 'payable').length} bills
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-card-title">Overdue Amount</div>
              <div className="summary-card-value" style={{ color: '#dc3545' }}>
                {formatCurrency(pendingPayments.filter(p => p.daysOverdue > 0).reduce((sum, p) => sum + p.balance, 0))}
              </div>
              <div className="summary-card-subtitle">
                {pendingPayments.filter(p => p.daysOverdue > 0).length} overdue items
              </div>
            </div>
            <div className="summary-card">
              <div className="summary-card-title">90+ Days Overdue</div>
              <div className="summary-card-value" style={{ color: '#6f42c1' }}>
                {formatCurrency(pendingPayments.filter(p => p.daysOverdue > 90).reduce((sum, p) => sum + p.balance, 0))}
              </div>
              <div className="summary-card-subtitle">
                {pendingPayments.filter(p => p.daysOverdue > 90).length} critical items
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="filter-section">
            <span>🔍</span>
            <div className="filter-group">
              <label>Type:</label>
              <select
                value={filter.type}
                onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              >
                <option value="all">All</option>
                <option value="receivable">Receivables</option>
                <option value="payable">Payables</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Overdue:</label>
              <select
                value={filter.overdueDays}
                onChange={(e) => setFilter({ ...filter, overdueDays: e.target.value })}
              >
                <option value="all">All</option>
                <option value="0-30">0-30 days</option>
                <option value="31-60">31-60 days</option>
                <option value="61-90">61-90 days</option>
                <option value="90+">90+ days</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Amount:</label>
              <input
                type="number"
                placeholder="Min"
                value={filter.minAmount}
                onChange={(e) => setFilter({ ...filter, minAmount: e.target.value })}
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Max"
                value={filter.maxAmount}
                onChange={(e) => setFilter({ ...filter, maxAmount: e.target.value })}
              />
            </div>
            <button className="btn btn-secondary" onClick={fetchPendingPayments}>
              <span>🔄</span> Refresh
            </button>
          </div>

          {/* Action Bar */}
          {selectedItems.length > 0 && (
            <div className="action-bar">
              <div className="selection-info">
                <strong>{selectedItems.length}</strong> item(s) selected
                <span style={{ marginLeft: '15px' }}>
                  Total: <strong>{formatCurrency(getTotalSelected())}</strong>
                </span>
              </div>
              <div className="action-buttons">
                <button className="btn btn-primary" onClick={handleSendReminder}>
                  <span>📤</span> Send Reminder
                </button>
              </div>
            </div>
          )}

          {/* Payments Table */}
          {loading ? (
            <div className="loading-spinner">
              <span>⏳</span> Loading pending payments...
            </div>
          ) : pendingPayments.length === 0 ? (
            <div className="empty-state">
              <div className="icon">✅</div>
              <h3>No Pending Payments</h3>
              <p>All payments are up to date!</p>
            </div>
          ) : (
            <table className="payments-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedItems.length === pendingPayments.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Type</th>
                  <th>Party</th>
                  <th>Voucher</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'right' }}>Balance</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Last Reminder</th>
                </tr>
              </thead>
              <tbody>
                {pendingPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(payment.id)}
                        onChange={() => handleSelectItem(payment.id)}
                      />
                    </td>
                    <td>
                      <span className={`type-badge type-${payment.type}`}>
                        {payment.type === 'receivable' ? 'Receivable' : 'Payable'}
                      </span>
                    </td>
                    <td>
                      <div className="party-info">
                        <span className="party-name">{payment.partyName}</span>
                        {payment.partyEmail && (
                          <span className="party-contact">
                            ✉️ {payment.partyEmail}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="voucher-info">
                        <span className="voucher-number">{payment.voucherNumber}</span>
                        <span className="voucher-type">{payment.voucherType}</span>
                      </div>
                    </td>
                    <td className="amount-cell">{formatCurrency(payment.amount)}</td>
                    <td className="amount-cell" style={{ color: '#dc3545' }}>
                      {formatCurrency(payment.balance)}
                    </td>
                    <td>{formatDate(payment.dueDate)}</td>
                    <td>
                      <span
                        className="overdue-badge"
                        style={{ background: getOverdueColor(payment.daysOverdue) }}
                      >
                        {getOverdueText(payment.daysOverdue)}
                      </span>
                    </td>
                    <td>{payment.lastReminderSent ? formatDate(payment.lastReminderSent) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {activeTab === 'scheduled' && (
        <>
          {scheduledReminders.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📅</div>
              <h3>No Scheduled Reminders</h3>
              <p>Schedule reminders from the Pending tab</p>
            </div>
          ) : (
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Party</th>
                  <th>Voucher</th>
                  <th>Amount</th>
                  <th>Channel</th>
                  <th>Scheduled For</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scheduledReminders.map((reminder) => (
                  <tr key={reminder.id}>
                    <td>{reminder.party_name}</td>
                    <td>{reminder.voucher_number}</td>
                    <td>{formatCurrency(reminder.amount)}</td>
                    <td>
                      {reminder.channel === 'email' && '✉️'}
                      {reminder.channel === 'sms' && '💬'}
                      {reminder.channel === 'whatsapp' && '📱'}
                      {' '}{reminder.channel}
                    </td>
                    <td>{formatDate(reminder.schedule_date)} {reminder.schedule_time}</td>
                    <td>
                      <button
                        className="btn btn-danger"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => cancelScheduledReminder(reminder.id)}
                      >
                        ❌ Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {activeTab === 'sent' && (
        <>
          {sentReminders.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📜</div>
              <h3>No Reminder History</h3>
              <p>Sent reminders will appear here</p>
            </div>
          ) : (
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Party</th>
                  <th>Voucher</th>
                  <th>Amount</th>
                  <th>Channel</th>
                  <th>Sent On</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sentReminders.map((reminder) => (
                  <tr key={reminder.id}>
                    <td>{reminder.party_name}</td>
                    <td>{reminder.voucher_number}</td>
                    <td>{formatCurrency(reminder.amount)}</td>
                    <td>
                      {reminder.channel === 'email' && '✉️'}
                      {reminder.channel === 'sms' && '💬'}
                      {reminder.channel === 'whatsapp' && '📱'}
                      {' '}{reminder.channel}
                    </td>
                    <td>{formatDate(reminder.sent_date)}</td>
                    <td>
                      <span style={{
                        color: reminder.status === 'delivered' ? '#28a745' :
                               reminder.status === 'failed' ? '#dc3545' : '#ffc107'
                      }}>
                        {reminder.status === 'delivered' && '✅'}
                        {reminder.status === 'failed' && '❌'}
                        {reminder.status === 'pending' && '⏳'}
                        {' '}{reminder.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {activeTab === 'settings' && (
        <div>
          <div className="settings-section">
            <div className="settings-title">
              🔔 Auto Reminder Settings
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-label">Enable Auto Reminders</div>
                <div className="settings-description">
                  Automatically send reminders based on schedule
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={reminderSettings.autoReminder}
                  onChange={(e) => setReminderSettings({
                    ...reminderSettings,
                    autoReminder: e.target.checked
                  })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-title">
              📤 Notification Channels
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-label">Email Notifications</div>
                <div className="settings-description">Send reminders via email</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={reminderSettings.emailEnabled}
                  onChange={(e) => setReminderSettings({
                    ...reminderSettings,
                    emailEnabled: e.target.checked
                  })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-label">SMS Notifications</div>
                <div className="settings-description">Send reminders via SMS</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={reminderSettings.smsEnabled}
                  onChange={(e) => setReminderSettings({
                    ...reminderSettings,
                    smsEnabled: e.target.checked
                  })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-label">WhatsApp Notifications</div>
                <div className="settings-description">Send reminders via WhatsApp</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={reminderSettings.whatsappEnabled}
                  onChange={(e) => setReminderSettings({
                    ...reminderSettings,
                    whatsappEnabled: e.target.checked
                  })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-title">
              ⚙️ Additional Options
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-label">Include Invoice Details</div>
                <div className="settings-description">
                  Include invoice/bill details in reminder
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={reminderSettings.includeInvoiceDetails}
                  onChange={(e) => setReminderSettings({
                    ...reminderSettings,
                    includeInvoiceDetails: e.target.checked
                  })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="settings-row">
              <div>
                <div className="settings-label">Include Payment Link</div>
                <div className="settings-description">
                  Include online payment link in reminder
                </div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={reminderSettings.includePaymentLink}
                  onChange={(e) => setReminderSettings({
                    ...reminderSettings,
                    includePaymentLink: e.target.checked
                  })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <button className="btn btn-success" onClick={saveSettings}>
            ✅ Save Settings
          </button>
        </div>
      )}

      {/* Send Reminder Modal */}
      {showReminderModal && (
        <div className="modal-overlay" onClick={() => setShowReminderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              <span>📤</span>
              Send Payment Reminder
            </div>

            <div className="form-group">
              <label>Select Channel</label>
              <div className="channel-options">
                <div
                  className={`channel-option ${reminderForm.channel === 'email' ? 'selected' : ''}`}
                  onClick={() => setReminderForm({ ...reminderForm, channel: 'email' })}
                >
                  <div className="icon">✉️</div>
                  <span>Email</span>
                </div>
                <div
                  className={`channel-option ${reminderForm.channel === 'sms' ? 'selected' : ''}`}
                  onClick={() => setReminderForm({ ...reminderForm, channel: 'sms' })}
                >
                  <div className="icon">💬</div>
                  <span>SMS</span>
                </div>
                <div
                  className={`channel-option ${reminderForm.channel === 'whatsapp' ? 'selected' : ''}`}
                  onClick={() => setReminderForm({ ...reminderForm, channel: 'whatsapp' })}
                >
                  <div className="icon">📱</div>
                  <span>WhatsApp</span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Custom Message (Optional)</label>
              <textarea
                placeholder="Add a personalized message to the reminder..."
                value={reminderForm.customMessage}
                onChange={(e) => setReminderForm({ ...reminderForm, customMessage: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Schedule (Optional - leave empty to send now)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="date"
                  value={reminderForm.scheduleDate}
                  onChange={(e) => setReminderForm({ ...reminderForm, scheduleDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                />
                <input
                  type="time"
                  value={reminderForm.scheduleTime}
                  onChange={(e) => setReminderForm({ ...reminderForm, scheduleTime: e.target.value })}
                />
              </div>
            </div>

            <div style={{
              background: '#fff3cd',
              padding: '10px 15px',
              borderRadius: '6px',
              marginBottom: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>⚠️</span>
              <span style={{ fontSize: '13px', color: '#856404' }}>
                {selectedItems.length} reminder(s) will be sent to {selectedItems.length} recipient(s).
                Total amount: {formatCurrency(getTotalSelected())}
              </span>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowReminderModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmSendReminder}
                disabled={sendingReminder}
              >
                {sendingReminder ? (
                  <>⏳ Sending...</>
                ) : reminderForm.scheduleDate ? (
                  <>📅 Schedule Reminder</>
                ) : (
                  <>📤 Send Now</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentReminders;
