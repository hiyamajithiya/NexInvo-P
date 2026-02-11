import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Share,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  SegmentedButtons,
  DataTable,
} from 'react-native-paper';
import api from '../../services/api';
import { Invoice } from '../../types';
import colors from '../../theme/colors';
import { formatCurrency } from '../../utils/formatters';

type Report = {
  id: number;
  name: string;
  icon: string;
  description: string;
};

type RevenueSummary = {
  totalInvoices: number;
  totalRevenue: number;
  paidAmount: number;
  pendingAmount: number;
};

type OutstandingSummary = {
  totalOutstanding: number;
  invoiceCount: number;
};

type GstSummary = {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
};

type ClientSummary = {
  totalClients: number;
};

type ReportSummary = RevenueSummary | OutstandingSummary | GstSummary | ClientSummary | null;

const reports: Report[] = [
  { id: 1, name: 'Revenue Report', icon: '📊', description: 'Monthly and yearly revenue' },
  { id: 2, name: 'Outstanding', icon: '⏳', description: 'Pending invoices' },
  { id: 3, name: 'GST Summary', icon: '🧾', description: 'GST collected' },
  { id: 4, name: 'Client-wise', icon: '👥', description: 'By client' },
];

const dateFilters = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
];

export default function ReportsScreen() {
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [dateFilter, setDateFilter] = useState('this_month');
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const invoicesData = await api.getInvoices();
      setInvoices(invoicesData.results || []);
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const getFilteredInvoices = () => {
    const now = new Date();
    return invoices.filter((inv) => {
      const invDate = new Date(inv.invoice_date);
      if (dateFilter === 'this_month') {
        return (
          invDate.getMonth() === now.getMonth() &&
          invDate.getFullYear() === now.getFullYear()
        );
      } else if (dateFilter === 'last_month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return (
          invDate.getMonth() === lastMonth.getMonth() &&
          invDate.getFullYear() === lastMonth.getFullYear()
        );
      } else if (dateFilter === 'this_year') {
        return invDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  };

  const generateReportData = (): { summary: ReportSummary; data: Invoice[] | { client: string; invoices: number; total: number }[] } => {
    const filtered = getFilteredInvoices();
    if (!selectedReport) return { summary: null, data: [] };

    switch (selectedReport.id) {
      case 1: // Revenue Report
        const totalRevenue = filtered.reduce(
          (sum, inv) => sum + parseFloat(inv.total_amount || '0'),
          0
        );
        const paidAmount = filtered
          .filter((inv) => inv.status === 'paid')
          .reduce((sum, inv) => sum + parseFloat(inv.total_amount || '0'), 0);
        return {
          summary: {
            totalInvoices: filtered.length,
            totalRevenue,
            paidAmount,
            pendingAmount: totalRevenue - paidAmount,
          } as RevenueSummary,
          data: filtered,
        };

      case 2: // Outstanding Report
        const outstanding = filtered.filter((inv) => inv.status !== 'paid');
        const totalOutstanding = outstanding.reduce(
          (sum, inv) => sum + parseFloat(inv.total_amount || '0'),
          0
        );
        return {
          summary: {
            totalOutstanding,
            invoiceCount: outstanding.length,
          } as OutstandingSummary,
          data: outstanding,
        };

      case 3: // GST Summary
        const gstSummary: GstSummary = filtered.reduce(
          (acc, inv) => ({
            taxable: acc.taxable + parseFloat(inv.subtotal || '0'),
            cgst: acc.cgst + parseFloat(inv.cgst_amount || '0'),
            sgst: acc.sgst + parseFloat(inv.sgst_amount || '0'),
            igst: acc.igst + parseFloat(inv.igst_amount || '0'),
            total: acc.total + parseFloat(inv.total_amount || '0'),
          }),
          { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
        );
        return {
          summary: gstSummary,
          data: filtered,
        };

      case 4: // Client-wise Report
        const clientStats: {
          [key: string]: { client: string; invoices: number; total: number };
        } = {};
        filtered.forEach((inv) => {
          const clientName = inv.client_name || 'Unknown';
          if (!clientStats[clientName]) {
            clientStats[clientName] = { client: clientName, invoices: 0, total: 0 };
          }
          clientStats[clientName].invoices++;
          clientStats[clientName].total += parseFloat(inv.total_amount || '0');
        });
        return {
          summary: {
            totalClients: Object.keys(clientStats).length,
          } as ClientSummary,
          data: Object.values(clientStats).sort((a, b) => b.total - a.total),
        };

      default:
        return { summary: null, data: [] };
    }
  };

  const handleShare = async () => {
    if (!selectedReport) return;
    const { summary } = generateReportData();
    let message = `${selectedReport.name}\n\n`;

    if (selectedReport.id === 1 && summary) {
      const revSummary = summary as RevenueSummary;
      message += `Total Invoices: ${revSummary.totalInvoices}\n`;
      message += `Total Revenue: ${formatCurrency(revSummary.totalRevenue)}\n`;
      message += `Paid: ${formatCurrency(revSummary.paidAmount)}\n`;
      message += `Pending: ${formatCurrency(revSummary.pendingAmount)}\n`;
    } else if (selectedReport.id === 2 && summary) {
      const outSummary = summary as OutstandingSummary;
      message += `Outstanding Invoices: ${outSummary.invoiceCount}\n`;
      message += `Total Outstanding: ${formatCurrency(outSummary.totalOutstanding)}\n`;
    } else if (selectedReport.id === 3 && summary) {
      const gstSum = summary as GstSummary;
      message += `Taxable Amount: ${formatCurrency(gstSum.taxable)}\n`;
      message += `CGST: ${formatCurrency(gstSum.cgst)}\n`;
      message += `SGST: ${formatCurrency(gstSum.sgst)}\n`;
      message += `IGST: ${formatCurrency(gstSum.igst)}\n`;
      message += `Total: ${formatCurrency(gstSum.total)}\n`;
    }

    try {
      await Share.share({ message, title: selectedReport.name });
    } catch (error) {
      // Error handled silently
    }
  };

  const renderReportCard = ({ item }: { item: Report }) => (
    <Card
      style={[
        styles.reportCard,
        selectedReport?.id === item.id && styles.selectedReportCard,
      ]}
      onPress={() => setSelectedReport(item)}
    >
      <Card.Content style={styles.reportCardContent}>
        <Text style={styles.reportIcon}>{item.icon}</Text>
        <Text variant="titleSmall" style={styles.reportName}>
          {item.name}
        </Text>
        <Text variant="bodySmall" style={styles.reportDesc}>
          {item.description}
        </Text>
      </Card.Content>
    </Card>
  );

  const { summary, data } = generateReportData();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Report Cards */}
        <FlatList
          horizontal
          data={reports}
          renderItem={renderReportCard}
          keyExtractor={(item) => item.id.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.reportCardsContainer}
        />

        {/* Date Filter */}
        {selectedReport && (
          <SegmentedButtons
            value={dateFilter}
            onValueChange={setDateFilter}
            buttons={dateFilters}
            style={styles.dateFilter}
          />
        )}

        {/* Report Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary[500]} />
          </View>
        ) : selectedReport ? (
          <>
            {/* Summary Cards */}
            {selectedReport.id === 1 && summary && (() => {
              const revSum = summary as RevenueSummary;
              return (
                <View style={styles.summaryContainer}>
                  <Card style={[styles.summaryCard, { backgroundColor: '#dbeafe' }]}>
                    <Card.Content>
                      <Text variant="labelSmall" style={{ color: '#1e40af' }}>
                        Total Revenue
                      </Text>
                      <Text variant="titleLarge" style={{ color: '#1e3a8a', fontWeight: 'bold' }}>
                        {formatCurrency(revSum.totalRevenue)}
                      </Text>
                    </Card.Content>
                  </Card>
                  <Card style={[styles.summaryCard, { backgroundColor: '#dcfce7' }]}>
                    <Card.Content>
                      <Text variant="labelSmall" style={{ color: '#166534' }}>
                        Paid
                      </Text>
                      <Text variant="titleLarge" style={{ color: '#14532d', fontWeight: 'bold' }}>
                        {formatCurrency(revSum.paidAmount)}
                      </Text>
                    </Card.Content>
                  </Card>
                  <Card style={[styles.summaryCard, { backgroundColor: '#fef3c7' }]}>
                    <Card.Content>
                      <Text variant="labelSmall" style={{ color: '#92400e' }}>
                        Pending
                      </Text>
                      <Text variant="titleLarge" style={{ color: '#78350f', fontWeight: 'bold' }}>
                        {formatCurrency(revSum.pendingAmount)}
                      </Text>
                    </Card.Content>
                  </Card>
                </View>
              );
            })()}

            {selectedReport.id === 2 && summary && (() => {
              const outSum = summary as OutstandingSummary;
              return (
                <View style={styles.summaryContainer}>
                  <Card style={[styles.summaryCard, { backgroundColor: '#fee2e2' }]}>
                    <Card.Content>
                      <Text variant="labelSmall" style={{ color: '#991b1b' }}>
                        Total Outstanding
                      </Text>
                      <Text variant="titleLarge" style={{ color: '#7f1d1d', fontWeight: 'bold' }}>
                        {formatCurrency(outSum.totalOutstanding)}
                      </Text>
                    </Card.Content>
                  </Card>
                  <Card style={[styles.summaryCard, { backgroundColor: '#fef3c7' }]}>
                    <Card.Content>
                      <Text variant="labelSmall" style={{ color: '#92400e' }}>
                        Invoices
                      </Text>
                      <Text variant="titleLarge" style={{ color: '#78350f', fontWeight: 'bold' }}>
                        {outSum.invoiceCount}
                      </Text>
                    </Card.Content>
                  </Card>
                </View>
              );
            })()}

            {selectedReport.id === 3 && summary && (() => {
              const gstSum = summary as GstSummary;
              return (
                <View style={styles.summaryContainer}>
                  <Card style={[styles.summaryCard, { backgroundColor: '#dbeafe' }]}>
                    <Card.Content>
                      <Text variant="labelSmall" style={{ color: '#1e40af' }}>
                        Taxable
                      </Text>
                      <Text variant="titleMedium" style={{ color: '#1e3a8a', fontWeight: 'bold' }}>
                        {formatCurrency(gstSum.taxable)}
                      </Text>
                    </Card.Content>
                  </Card>
                  <Card style={[styles.summaryCard, { backgroundColor: '#dcfce7' }]}>
                    <Card.Content>
                      <Text variant="labelSmall" style={{ color: '#166534' }}>
                        CGST
                      </Text>
                      <Text variant="titleMedium" style={{ color: '#14532d', fontWeight: 'bold' }}>
                        {formatCurrency(gstSum.cgst)}
                      </Text>
                    </Card.Content>
                  </Card>
                  <Card style={[styles.summaryCard, { backgroundColor: '#fef3c7' }]}>
                    <Card.Content>
                      <Text variant="labelSmall" style={{ color: '#92400e' }}>
                        SGST
                      </Text>
                      <Text variant="titleMedium" style={{ color: '#78350f', fontWeight: 'bold' }}>
                        {formatCurrency(gstSum.sgst)}
                      </Text>
                    </Card.Content>
                  </Card>
                  <Card style={[styles.summaryCard, { backgroundColor: '#e0e7ff' }]}>
                    <Card.Content>
                      <Text variant="labelSmall" style={{ color: '#3730a3' }}>
                        IGST
                      </Text>
                      <Text variant="titleMedium" style={{ color: '#312e81', fontWeight: 'bold' }}>
                        {formatCurrency(gstSum.igst)}
                      </Text>
                    </Card.Content>
                  </Card>
                </View>
              );
            })()}

            {selectedReport.id === 4 && summary && (() => {
              const clientSum = summary as ClientSummary;
              return (
                <Card style={[styles.summaryCard, { backgroundColor: '#e0e7ff', marginHorizontal: 16 }]}>
                  <Card.Content>
                    <Text variant="labelSmall" style={{ color: '#3730a3' }}>
                      Total Clients
                    </Text>
                    <Text variant="titleLarge" style={{ color: '#312e81', fontWeight: 'bold' }}>
                      {clientSum.totalClients}
                    </Text>
                  </Card.Content>
                </Card>
              );
            })()}

            {/* Data Table */}
            {data.length > 0 && (
              <Card style={styles.tableCard}>
                <DataTable>
                  <DataTable.Header>
                    {selectedReport.id === 4 ? (
                      <>
                        <DataTable.Title>Client</DataTable.Title>
                        <DataTable.Title numeric>Invoices</DataTable.Title>
                        <DataTable.Title numeric>Total</DataTable.Title>
                      </>
                    ) : (
                      <>
                        <DataTable.Title>Invoice</DataTable.Title>
                        <DataTable.Title>Client</DataTable.Title>
                        <DataTable.Title numeric>Amount</DataTable.Title>
                      </>
                    )}
                  </DataTable.Header>

                  {selectedReport.id === 4
                    ? (data as { client: string; invoices: number; total: number }[])
                        .slice(0, 10)
                        .map((row, index) => (
                          <DataTable.Row key={index}>
                            <DataTable.Cell>{row.client}</DataTable.Cell>
                            <DataTable.Cell numeric>{row.invoices}</DataTable.Cell>
                            <DataTable.Cell numeric>
                              {formatCurrency(row.total)}
                            </DataTable.Cell>
                          </DataTable.Row>
                        ))
                    : (data as Invoice[]).slice(0, 10).map((inv) => (
                        <DataTable.Row key={inv.id}>
                          <DataTable.Cell>{inv.invoice_number}</DataTable.Cell>
                          <DataTable.Cell>{inv.client_name}</DataTable.Cell>
                          <DataTable.Cell numeric>
                            {formatCurrency(inv.total_amount)}
                          </DataTable.Cell>
                        </DataTable.Row>
                      ))}
                </DataTable>
                {data.length > 10 && (
                  <Text style={styles.moreText}>
                    +{data.length - 10} more items
                  </Text>
                )}
              </Card>
            )}

            {data.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text variant="bodyLarge" style={styles.emptyText}>
                  No data available
                </Text>
                <Text variant="bodyMedium" style={styles.emptySubtext}>
                  Try selecting a different time period
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text variant="bodyLarge" style={styles.emptyText}>
              Select a report to view
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Tap on a report card above
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  content: {
    paddingVertical: 16,
  },
  reportCardsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  reportCard: {
    width: 120,
    borderRadius: 16,
    marginRight: 12,
  },
  selectedReportCard: {
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  reportCardContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  reportIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  reportName: {
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.text.primary,
  },
  reportDesc: {
    color: colors.text.secondary,
    textAlign: 'center',
    fontSize: 11,
    marginTop: 4,
  },
  dateFilter: {
    margin: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
  },
  tableCard: {
    margin: 16,
    borderRadius: 16,
  },
  moreText: {
    textAlign: 'center',
    color: colors.text.secondary,
    padding: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: colors.text.secondary,
  },
  emptySubtext: {
    color: colors.text.muted,
    marginTop: 4,
    textAlign: 'center',
  },
});
