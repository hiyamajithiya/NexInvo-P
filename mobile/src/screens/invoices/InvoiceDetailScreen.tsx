import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  ActivityIndicator,
  Divider,
  useTheme,
  IconButton,
  Menu,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import {
  downloadAsync,
  getInfoAsync,
  getContentUriAsync,
  cacheDirectory,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import api from '../../services/api';
import { Invoice, RootStackParamList } from '../../types';
import colors from '../../theme/colors';

type InvoiceDetailScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'InvoiceDetail'>;
  route: RouteProp<RootStackParamList, 'InvoiceDetail'>;
};

export default function InvoiceDetailScreen({
  navigation,
  route,
}: InvoiceDetailScreenProps) {
  const theme = useTheme();
  const { invoiceId } = route.params;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sharingPDF, setSharingPDF] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      const data = await api.getInvoice(invoiceId);
      setInvoice(data);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      Alert.alert('Error', 'Failed to load invoice');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      await api.sendInvoiceEmail(invoiceId);
      Alert.alert('Success', 'Invoice sent successfully');
      fetchInvoice(); // Refresh to update status
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  // Helper function to download PDF with proper authentication
  const downloadPDF = async (): Promise<string | null> => {
    try {
      const pdfUrl = await api.getInvoicePDFUrl(invoiceId);
      const headers = await api.getAuthHeaders();

      const fileName = `Invoice_${invoice?.invoice_number?.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const fileUri = `${cacheDirectory}${fileName}`;

      console.log('Downloading PDF from:', pdfUrl);
      console.log('With headers:', Object.keys(headers));

      const downloadResult = await downloadAsync(pdfUrl, fileUri, {
        headers: headers as Record<string, string>,
      });

      console.log('Download result status:', downloadResult.status);
      console.log('Download result uri:', downloadResult.uri);

      if (downloadResult.status !== 200) {
        console.error('PDF download failed with status:', downloadResult.status);
        throw new Error(`Failed to download PDF (status: ${downloadResult.status})`);
      }

      // Verify the file exists and has content
      const fileInfo = await getInfoAsync(fileUri);
      console.log('Downloaded file info:', fileInfo);

      if (!fileInfo.exists || (fileInfo.size && fileInfo.size < 100)) {
        throw new Error('Downloaded file is empty or invalid');
      }

      return fileUri;
    } catch (error) {
      console.error('Error downloading PDF:', error);
      return null;
    }
  };

  const handleViewPDF = async () => {
    setSharingPDF(true);
    try {
      const fileUri = await downloadPDF();

      if (!fileUri) {
        Alert.alert('Error', 'Failed to download PDF');
        return;
      }

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'PDF viewer is not available on this device');
        return;
      }

      // On Android, try to open with PDF viewer using intent
      if (Platform.OS === 'android') {
        try {
          const contentUri = await getContentUriAsync(fileUri);
          await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
            data: contentUri,
            flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
            type: 'application/pdf',
          });
        } catch (intentError) {
          console.log('Intent failed, falling back to share:', intentError);
          // Fallback to share sheet if intent fails
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/pdf',
            dialogTitle: `View Invoice ${invoice?.invoice_number}`,
            UTI: 'com.adobe.pdf',
          });
        }
      } else {
        // On iOS, use share sheet to open in PDF viewer
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `View Invoice ${invoice?.invoice_number}`,
          UTI: 'com.adobe.pdf',
        });
      }
    } catch (error) {
      console.error('Error viewing PDF:', error);
      Alert.alert('Error', 'Failed to open PDF');
    } finally {
      setSharingPDF(false);
    }
  };

  const handleSharePDF = async () => {
    setSharingPDF(true);
    try {
      const fileUri = await downloadPDF();

      if (!fileUri) {
        Alert.alert('Error', 'Failed to download PDF. Please try again.');
        return;
      }

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      // Share the PDF file - this will open the share sheet where user can select WhatsApp
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share Invoice ${invoice?.invoice_number}`,
        UTI: 'com.adobe.pdf',
      });

    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      Alert.alert('Error', 'Failed to share invoice PDF');
    } finally {
      setSharingPDF(false);
    }
  };

  const handleRecordPayment = () => {
    navigation.navigate('RecordPayment', { invoiceId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Invoice',
      'Are you sure you want to delete this invoice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteInvoice(invoiceId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete invoice');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return { bg: colors.status.paid.bg, text: colors.status.paid.text };
      case 'overdue':
        return { bg: colors.status.overdue.bg, text: colors.status.overdue.text };
      case 'sent':
        return { bg: colors.status.sent.bg, text: colors.status.sent.text };
      case 'draft':
        return { bg: colors.status.draft.bg, text: colors.status.draft.text };
      default:
        return { bg: colors.status.pending.bg, text: colors.status.pending.text };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!invoice) {
    return null;
  }

  const statusColor = getStatusColor(invoice.status);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.headerRow}>
              <View>
                <Text variant="headlineSmall" style={styles.invoiceNumber}>
                  {invoice.invoice_number}
                </Text>
                <Text variant="bodyMedium" style={styles.invoiceType}>
                  {invoice.invoice_type === 'tax' ? 'Tax Invoice' : 'Proforma Invoice'}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                <Text variant="labelMedium" style={{ color: statusColor.text }}>
                  {invoice.status.toUpperCase()}
                </Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>Date</Text>
              <Text variant="bodyLarge">{formatDate(invoice.invoice_date)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>Client</Text>
              <Text variant="bodyLarge">{invoice.client_name}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Items Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Items
            </Text>

            {invoice.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text variant="bodyLarge">{item.description}</Text>
                  {item.hsn_sac && (
                    <Text variant="bodySmall" style={styles.hsnText}>
                      HSN/SAC: {item.hsn_sac}
                    </Text>
                  )}
                  <Text variant="bodySmall" style={styles.gstText}>
                    GST: {item.gst_rate}%
                  </Text>
                </View>
                <View style={styles.itemAmounts}>
                  <Text variant="bodyMedium" style={styles.taxableAmount}>
                    {formatCurrency(item.taxable_amount)}
                  </Text>
                  <Text variant="titleMedium" style={styles.totalAmount}>
                    {formatCurrency(item.total_amount)}
                  </Text>
                </View>
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Summary Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Summary
            </Text>

            <View style={styles.summaryRow}>
              <Text variant="bodyMedium">Subtotal</Text>
              <Text variant="bodyLarge">{formatCurrency(invoice.subtotal)}</Text>
            </View>

            {invoice.is_interstate ? (
              <View style={styles.summaryRow}>
                <Text variant="bodyMedium">IGST</Text>
                <Text variant="bodyLarge">{formatCurrency(invoice.igst_amount)}</Text>
              </View>
            ) : (
              <>
                <View style={styles.summaryRow}>
                  <Text variant="bodyMedium">CGST</Text>
                  <Text variant="bodyLarge">{formatCurrency(invoice.cgst_amount)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text variant="bodyMedium">SGST</Text>
                  <Text variant="bodyLarge">{formatCurrency(invoice.sgst_amount)}</Text>
                </View>
              </>
            )}

            {parseFloat(invoice.round_off) !== 0 && (
              <View style={styles.summaryRow}>
                <Text variant="bodyMedium">Round Off</Text>
                <Text variant="bodyLarge">{formatCurrency(invoice.round_off)}</Text>
              </View>
            )}

            <Divider style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text variant="titleMedium" style={styles.totalLabel}>
                Total Amount
              </Text>
              <Text variant="headlineSmall" style={styles.grandTotal}>
                {formatCurrency(invoice.total_amount)}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Notes */}
        {invoice.notes && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Notes
              </Text>
              <Text variant="bodyMedium">{invoice.notes}</Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('InvoiceForm', { invoiceId })}
          style={styles.actionButton}
        >
          Edit
        </Button>
        <Button
          mode="contained"
          onPress={handleSendEmail}
          loading={sendingEmail}
          disabled={sendingEmail}
          style={styles.actionButton}
        >
          Send Email
        </Button>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="dots-vertical"
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              handleViewPDF();
            }}
            title="View PDF"
            leadingIcon="file-pdf-box"
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              handleSharePDF();
            }}
            title={sharingPDF ? "Preparing PDF..." : "Share PDF"}
            leadingIcon="share-variant"
            disabled={sharingPDF}
          />
          {invoice.status !== 'paid' && (
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                handleRecordPayment();
              }}
              title="Record Payment"
              leadingIcon="cash"
            />
          )}
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              handleDelete();
            }}
            title="Delete"
            leadingIcon="delete"
            titleStyle={{ color: colors.error.dark }}
          />
        </Menu>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.default,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  headerCard: {
    marginBottom: 16,
    borderRadius: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceNumber: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  invoiceType: {
    color: colors.text.secondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  divider: {
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    color: colors.text.secondary,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.text.primary,
  },
  itemRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  itemInfo: {
    flex: 1,
    paddingRight: 16,
  },
  hsnText: {
    color: colors.text.secondary,
    marginTop: 4,
  },
  gstText: {
    color: colors.text.secondary,
    marginTop: 2,
  },
  itemAmounts: {
    alignItems: 'flex-end',
  },
  taxableAmount: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  totalAmount: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  grandTotal: {
    fontWeight: 'bold',
    color: colors.primary[500],
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    paddingBottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    backgroundColor: colors.background.paper,
    elevation: 8,
    alignItems: 'center',
  },
  actionButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 10,
  },
});
