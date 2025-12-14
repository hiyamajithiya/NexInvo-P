import React, { useState, useEffect } from 'react';
import { invoiceAPI, clientAPI, paymentAPI, reportsAPI } from '../services/api';
import { formatDate } from '../utils/dateFormat';
import './Pages.css';

function Reports() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateFilter, setDateFilter] = useState('this_month');
  const [loading, setLoading] = useState(false);

  // Data states
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);

  // Email modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const reports = [
    { id: 1, name: 'Revenue Report', icon: '📊', description: 'Monthly and yearly revenue analysis' },
    { id: 2, name: 'Outstanding Report', icon: '⏳', description: 'Pending invoices' },
    { id: 3, name: 'GST Summary', icon: '🧾', description: 'GST collected and payable summary' },
    { id: 4, name: 'Client-wise Report', icon: '👥', description: 'Revenue breakdown by client' },
    { id: 5, name: 'Receipt Report', icon: '💰', description: 'Receipt collection history' },
    { id: 6, name: 'TDS Summary', icon: '📋', description: 'Income Tax TDS deducted by clients' },
    { id: 7, name: 'GST TDS Summary', icon: '🏛️', description: 'GST TDS deducted by Govt undertakings' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invoicesResponse, clientsResponse, paymentsResponse] = await Promise.all([
        invoiceAPI.getAll(),
        clientAPI.getAll(),
        paymentAPI.getAll()
      ]);

      setInvoices(invoicesResponse.data.results || invoicesResponse.data || []);
      setClients(clientsResponse.data.results || clientsResponse.data || []);
      setPayments(paymentsResponse.data.results || paymentsResponse.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : 'Unknown';
  };

  const getFilteredInvoices = () => {
    let filtered = [...invoices];

    if (dateFilter === 'this_month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(inv => new Date(inv.invoice_date) >= firstDay);
    } else if (dateFilter === 'last_month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      filtered = filtered.filter(inv => {
        const date = new Date(inv.invoice_date);
        return date >= firstDay && date <= lastDay;
      });
    } else if (dateFilter === 'this_quarter') {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const firstDay = new Date(now.getFullYear(), quarter * 3, 1);
      filtered = filtered.filter(inv => new Date(inv.invoice_date) >= firstDay);
    } else if (dateFilter === 'this_year') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), 0, 1);
      filtered = filtered.filter(inv => new Date(inv.invoice_date) >= firstDay);
    }

    return filtered;
  };

  const getFilteredPayments = () => {
    let filtered = [...payments];

    if (dateFilter === 'this_month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(p => new Date(p.payment_date) >= firstDay);
    } else if (dateFilter === 'last_month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      filtered = filtered.filter(p => {
        const date = new Date(p.payment_date);
        return date >= firstDay && date <= lastDay;
      });
    } else if (dateFilter === 'this_quarter') {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3);
      const firstDay = new Date(now.getFullYear(), quarter * 3, 1);
      filtered = filtered.filter(p => new Date(p.payment_date) >= firstDay);
    } else if (dateFilter === 'this_year') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), 0, 1);
      filtered = filtered.filter(p => new Date(p.payment_date) >= firstDay);
    }

    return filtered;
  };

  const generateReportData = () => {
    const filtered = getFilteredInvoices();

    if (!selectedReport) return [];

    switch (selectedReport.id) {
      case 1: // Revenue Report
        return filtered.map(invoice => ({
          invoiceNo: invoice.invoice_number,
          date: invoice.invoice_date,
          client: getClientName(invoice.client),
          amount: parseFloat(invoice.total_amount || 0),
          status: invoice.status || 'draft'
        }));

      case 2: // Outstanding Report
        return filtered
          .filter(invoice => invoice.status !== 'paid')
          .map(invoice => ({
            invoiceNo: invoice.invoice_number,
            date: invoice.invoice_date,
            client: getClientName(invoice.client),
            amount: parseFloat(invoice.total_amount || 0),
            daysOverdue: Math.floor((new Date() - new Date(invoice.invoice_date)) / (1000 * 60 * 60 * 24))
          }));

      case 3: // GST Summary
        return filtered.map(invoice => ({
          invoiceNo: invoice.invoice_number,
          date: invoice.invoice_date,
          client: getClientName(invoice.client),
          taxable: parseFloat(invoice.subtotal || 0),
          gst: parseFloat(invoice.tax_amount || 0),
          total: parseFloat(invoice.total_amount || 0)
        }));

      case 4: // Client-wise Report
        const clientStats = {};
        filtered.forEach(invoice => {
          const clientId = invoice.client;
          const clientName = getClientName(clientId);
          if (!clientStats[clientId]) {
            clientStats[clientId] = {
              client: clientName,
              invoices: 0,
              total: 0
            };
          }
          clientStats[clientId].invoices++;
          clientStats[clientId].total += parseFloat(invoice.total_amount || 0);
        });
        return Object.values(clientStats);

      case 5: // Payment Report
        return filtered
          .filter(invoice => invoice.status === 'paid')
          .map(invoice => ({
            invoiceNo: invoice.invoice_number,
            date: invoice.invoice_date,
            client: getClientName(invoice.client),
            amount: parseFloat(invoice.total_amount || 0)
          }));

      case 6: // Income Tax TDS Summary
        const filteredPayments = getFilteredPayments();
        const paymentsWithTDS = filteredPayments.filter(p => parseFloat(p.tds_amount || 0) > 0);

        if (paymentsWithTDS.length === 0) {
          return [];
        }

        // Client-wise TDS summary
        const tdsStats = {};
        paymentsWithTDS.forEach(payment => {
          const clientName = payment.client_name || 'Unknown';
          if (!tdsStats[clientName]) {
            tdsStats[clientName] = {
              client: clientName,
              totalInvoiceAmount: 0,
              totalTDS: 0,
              totalReceived: 0,
              paymentCount: 0
            };
          }
          tdsStats[clientName].totalInvoiceAmount += parseFloat(payment.amount || 0);
          tdsStats[clientName].totalTDS += parseFloat(payment.tds_amount || 0);
          tdsStats[clientName].totalReceived += parseFloat(payment.amount_received || 0);
          tdsStats[clientName].paymentCount++;
        });
        return Object.values(tdsStats);

      case 7: // GST TDS Summary
        const filteredPaymentsGST = getFilteredPayments();
        const paymentsWithGstTDS = filteredPaymentsGST.filter(p => parseFloat(p.gst_tds_amount || 0) > 0);

        if (paymentsWithGstTDS.length === 0) {
          return [];
        }

        // Client-wise GST TDS summary
        const gstTdsStats = {};
        paymentsWithGstTDS.forEach(payment => {
          const clientName = payment.client_name || 'Unknown';
          if (!gstTdsStats[clientName]) {
            gstTdsStats[clientName] = {
              client: clientName,
              totalInvoiceAmount: 0,
              totalGstTDS: 0,
              totalIncomeTaxTDS: 0,
              totalReceived: 0,
              paymentCount: 0
            };
          }
          gstTdsStats[clientName].totalInvoiceAmount += parseFloat(payment.amount || 0);
          gstTdsStats[clientName].totalGstTDS += parseFloat(payment.gst_tds_amount || 0);
          gstTdsStats[clientName].totalIncomeTaxTDS += parseFloat(payment.tds_amount || 0);
          gstTdsStats[clientName].totalReceived += parseFloat(payment.amount_received || 0);
          gstTdsStats[clientName].paymentCount++;
        });
        return Object.values(gstTdsStats);

      default:
        return [];
    }
  };

  const handleExportReport = () => {
    if (!selectedReport) {
      alert('Please select a report first');
      return;
    }

    const reportData = generateReportData();
    if (reportData.length === 0) {
      alert('No data available to export');
      return;
    }

    // Convert to CSV
    const headers = Object.keys(reportData[0]);
    const csvRows = [headers.join(',')];

    reportData.forEach(row => {
      const values = headers.map(header => {
        const val = row[header];
        return typeof val === 'number' ? val.toFixed(2) : val;
      });
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedReport.name.replace(/\s+/g, '_')}_${dateFilter}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDateFilterLabel = () => {
    const labels = {
      'this_month': 'This Month',
      'last_month': 'Last Month',
      'this_quarter': 'This Quarter',
      'this_year': 'This Year',
      'all_time': 'All Time'
    };
    return labels[dateFilter] || dateFilter;
  };

  const handleOpenEmailModal = () => {
    if (!selectedReport) {
      alert('Please select a report first');
      return;
    }
    const reportDataCheck = generateReportData();
    if (reportDataCheck.length === 0) {
      alert('No data available to send');
      return;
    }
    setShowEmailModal(true);
  };

  const handleSendReportEmail = async () => {
    if (!emailRecipient || !emailRecipient.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setSendingEmail(true);
    try {
      const reportDataToSend = generateReportData();
      const response = await reportsAPI.sendEmail({
        report_name: selectedReport.name,
        report_data: reportDataToSend,
        recipient_email: emailRecipient,
        date_filter: getDateFilterLabel()
      });
      alert(response.data.message || 'Report sent successfully!');
      setShowEmailModal(false);
      setEmailRecipient('');
    } catch (err) {
      console.error('Error sending report:', err);
      alert(err.response?.data?.error || 'Failed to send report. Please check your email settings.');
    } finally {
      setSendingEmail(false);
    }
  };

  const reportData = generateReportData();

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Reports</h1>
          <p className="page-description">Generate and view business reports</p>
        </div>
      </div>

      <div className="reports-grid">
        {reports.map((report) => (
          <div
            key={report.id}
            className={`report-card ${selectedReport?.id === report.id ? 'active' : ''}`}
            onClick={() => setSelectedReport(report)}
          >
            <div className="report-icon">{report.icon}</div>
            <h3 className="report-title">{report.name}</h3>
            <p className="report-description">{report.description}</p>
            <button className="btn-report">View Report →</button>
          </div>
        ))}
      </div>

      {selectedReport && (
        <div className="content-card" style={{ marginTop: '32px' }}>
          <div className="report-view">
            <div className="report-header">
              <div>
                <h2 className="report-view-title">{selectedReport.icon} {selectedReport.name}</h2>
                <p className="report-view-description">{selectedReport.description}</p>
              </div>
              <div className="report-filters" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <select
                  className="filter-select"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="this_quarter">This Quarter</option>
                  <option value="this_year">This Year</option>
                  <option value="all_time">All Time</option>
                </select>
                <button
                  className="btn-create"
                  onClick={handleExportReport}
                  disabled={reportData.length === 0}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <span className="btn-icon">📥</span>
                  Export Report
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleOpenEmailModal}
                  disabled={reportData.length === 0}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <span className="btn-icon">📧</span>
                  Send Email
                </button>
              </div>
            </div>

            <div className="report-content">
              {loading ? (
                <div className="empty-state-large">
                  <div className="empty-icon-large">⏳</div>
                  <h3 className="empty-title">Loading...</h3>
                </div>
              ) : reportData.length === 0 ? (
                <div className="empty-state-large">
                  <div className="empty-icon-large">📈</div>
                  <h3 className="empty-title">No Data Available</h3>
                  <p className="empty-description">Start creating invoices to see report data</p>
                </div>
              ) : (
                <>
                  {/* Income Tax TDS Summary Total Card */}
                  {selectedReport.id === 6 && (
                    <div style={{
                      display: 'flex',
                      gap: '20px',
                      marginBottom: '20px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                        padding: '16px 24px',
                        borderRadius: '12px',
                        flex: '1',
                        minWidth: '200px',
                        border: '1px solid #bae6fd'
                      }}>
                        <div style={{ color: '#0369a1', fontSize: '13px', marginBottom: '4px' }}>Total Invoice Amount</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#0c4a6e' }}>
                          ₹{reportData.reduce((sum, r) => sum + r.totalInvoiceAmount, 0).toFixed(2)}
                        </div>
                      </div>
                      <div style={{
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        padding: '16px 24px',
                        borderRadius: '12px',
                        flex: '1',
                        minWidth: '200px',
                        border: '1px solid #fcd34d'
                      }}>
                        <div style={{ color: '#92400e', fontSize: '13px', marginBottom: '4px' }}>Total Income Tax TDS</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#78350f' }}>
                          ₹{reportData.reduce((sum, r) => sum + r.totalTDS, 0).toFixed(2)}
                        </div>
                      </div>
                      <div style={{
                        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                        padding: '16px 24px',
                        borderRadius: '12px',
                        flex: '1',
                        minWidth: '200px',
                        border: '1px solid #6ee7b7'
                      }}>
                        <div style={{ color: '#047857', fontSize: '13px', marginBottom: '4px' }}>Total Received</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#064e3b' }}>
                          ₹{reportData.reduce((sum, r) => sum + r.totalReceived, 0).toFixed(2)}
                        </div>
                      </div>
                      <div style={{
                        background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                        padding: '16px 24px',
                        borderRadius: '12px',
                        flex: '1',
                        minWidth: '200px',
                        border: '1px solid #c4b5fd'
                      }}>
                        <div style={{ color: '#6d28d9', fontSize: '13px', marginBottom: '4px' }}>Total Receipts</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#4c1d95' }}>
                          {reportData.reduce((sum, r) => sum + r.paymentCount, 0)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GST TDS Summary Total Card */}
                  {selectedReport.id === 7 && (
                    <div style={{
                      display: 'flex',
                      gap: '20px',
                      marginBottom: '20px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{
                        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                        padding: '16px 24px',
                        borderRadius: '12px',
                        flex: '1',
                        minWidth: '180px',
                        border: '1px solid #bae6fd'
                      }}>
                        <div style={{ color: '#0369a1', fontSize: '13px', marginBottom: '4px' }}>Total Invoice Amount</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#0c4a6e' }}>
                          ₹{reportData.reduce((sum, r) => sum + r.totalInvoiceAmount, 0).toFixed(2)}
                        </div>
                      </div>
                      <div style={{
                        background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
                        padding: '16px 24px',
                        borderRadius: '12px',
                        flex: '1',
                        minWidth: '180px',
                        border: '1px solid #c084fc'
                      }}>
                        <div style={{ color: '#7c3aed', fontSize: '13px', marginBottom: '4px' }}>Total GST TDS</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#5b21b6' }}>
                          ₹{reportData.reduce((sum, r) => sum + r.totalGstTDS, 0).toFixed(2)}
                        </div>
                      </div>
                      <div style={{
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        padding: '16px 24px',
                        borderRadius: '12px',
                        flex: '1',
                        minWidth: '180px',
                        border: '1px solid #fcd34d'
                      }}>
                        <div style={{ color: '#92400e', fontSize: '13px', marginBottom: '4px' }}>Total Income Tax TDS</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#78350f' }}>
                          ₹{reportData.reduce((sum, r) => sum + r.totalIncomeTaxTDS, 0).toFixed(2)}
                        </div>
                      </div>
                      <div style={{
                        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                        padding: '16px 24px',
                        borderRadius: '12px',
                        flex: '1',
                        minWidth: '180px',
                        border: '1px solid #6ee7b7'
                      }}>
                        <div style={{ color: '#047857', fontSize: '13px', marginBottom: '4px' }}>Total Received</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#064e3b' }}>
                          ₹{reportData.reduce((sum, r) => sum + r.totalReceived, 0).toFixed(2)}
                        </div>
                      </div>
                      <div style={{
                        background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                        padding: '16px 24px',
                        borderRadius: '12px',
                        flex: '1',
                        minWidth: '180px',
                        border: '1px solid #c4b5fd'
                      }}>
                        <div style={{ color: '#6d28d9', fontSize: '13px', marginBottom: '4px' }}>Total Receipts</div>
                        <div style={{ fontSize: '24px', fontWeight: '700', color: '#4c1d95' }}>
                          {reportData.reduce((sum, r) => sum + r.paymentCount, 0)}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="data-table">
                    <table>
                      <thead>
                        <tr>
                          {Object.keys(reportData[0]).map((key) => (
                            <th key={key}>
                              {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((row, index) => (
                          <tr key={index}>
                            {Object.entries(row).map(([key, value], idx) => (
                              <td key={idx}>
                                {key === 'amount' || key === 'total' || key === 'taxable' || key === 'gst' || key === 'totalInvoiceAmount' || key === 'totalReceived' ? (
                                  <strong>₹{typeof value === 'number' ? value.toFixed(2) : value}</strong>
                                ) : key === 'totalTDS' || key === 'totalIncomeTaxTDS' ? (
                                  <strong style={{ color: '#b45309' }}>₹{typeof value === 'number' ? value.toFixed(2) : value}</strong>
                                ) : key === 'totalGstTDS' ? (
                                  <strong style={{ color: '#7c3aed' }}>₹{typeof value === 'number' ? value.toFixed(2) : value}</strong>
                                ) : key === 'status' ? (
                                  <span className={`status-badge status-${value}`}>
                                    {value.toUpperCase()}
                                  </span>
                                ) : key === 'daysOverdue' ? (
                                  <span style={{
                                    color: value > 30 ? '#dc2626' : value > 15 ? '#f59e0b' : '#6b7280'
                                  }}>
                                    {value} days
                                  </span>
                                ) : key === 'date' ? (
                                  formatDate(value)
                                ) : (
                                  value
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="modal-overlay" onClick={() => !sendingEmail && setShowEmailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>Send Report via Email</h2>
              <button
                className="modal-close"
                onClick={() => !sendingEmail && setShowEmailModal(false)}
                disabled={sendingEmail}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: '#6b7280' }}>
                Send the <strong>{selectedReport?.name}</strong> report ({getDateFilterLabel()}) to an email address.
              </p>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151' }}>
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="Enter email address"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  disabled={sendingEmail}
                  autoFocus
                />
              </div>
              <div style={{
                padding: '12px',
                background: '#f0f9ff',
                borderRadius: '8px',
                border: '1px solid #bae6fd',
                fontSize: '13px',
                color: '#0369a1'
              }}>
                <strong>Note:</strong> The report will be sent as a CSV attachment to the specified email address.
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowEmailModal(false)}
                disabled={sendingEmail}
              >
                Cancel
              </button>
              <button
                className="btn-create"
                onClick={handleSendReportEmail}
                disabled={sendingEmail || !emailRecipient}
              >
                {sendingEmail ? (
                  <>
                    <span className="btn-icon">⏳</span>
                    Sending...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">📧</span>
                    Send Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
