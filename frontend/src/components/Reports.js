import React, { useState, useEffect } from 'react';
import { invoiceAPI, clientAPI } from '../services/api';
import './Pages.css';

function Reports() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateFilter, setDateFilter] = useState('this_month');
  const [loading, setLoading] = useState(false);

  // Data states
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);

  const reports = [
    { id: 1, name: 'Revenue Report', icon: '📊', description: 'Monthly and yearly revenue analysis' },
    { id: 2, name: 'Outstanding Report', icon: '⏳', description: 'Pending payments and invoices' },
    { id: 3, name: 'GST Summary', icon: '🧾', description: 'GST collected and payable summary' },
    { id: 4, name: 'Client-wise Report', icon: '👥', description: 'Revenue breakdown by client' },
    { id: 5, name: 'Payment Report', icon: '💰', description: 'Payment collection history' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invoicesResponse, clientsResponse] = await Promise.all([
        invoiceAPI.getAll(),
        clientAPI.getAll()
      ]);

      setInvoices(invoicesResponse.data.results || invoicesResponse.data || []);
      setClients(clientsResponse.data.results || clientsResponse.data || []);
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

  const reportData = generateReportData();

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-main-title">Reports</h1>
          <p className="page-description">Generate and view business reports</p>
        </div>
        <div className="page-header-right">
          <button
            className="btn-create"
            onClick={handleExportReport}
            disabled={!selectedReport}
          >
            <span className="btn-icon">📥</span>
            Export Report
          </button>
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
              <div className="report-filters">
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
                              {key === 'amount' || key === 'total' || key === 'taxable' || key === 'gst' ? (
                                <strong>₹{typeof value === 'number' ? value.toFixed(2) : value}</strong>
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
                                new Date(value).toLocaleDateString('en-IN')
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
