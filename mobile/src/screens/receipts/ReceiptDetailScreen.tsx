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
import { Receipt, RootStackParamList } from '../../types';
import colors from '../../theme/colors';

type ReceiptDetailScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReceiptDetail'>;
  route: RouteProp<RootStackParamList, 'ReceiptDetail'>;
};

export default function ReceiptDetailScreen({
  navigation,
  route,
}: ReceiptDetailScreenProps) {
  const { receiptId } = route.params;
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [sharingPDF, setSharingPDF] = useState(false);

  useEffect(() => {
    fetchReceipt();
  }, [receiptId]);

  const fetchReceipt = async () => {
    try {
      const data = await api.getReceipt(receiptId);
      setReceipt(data);
    } catch (error) {
      console.error('Error fetching receipt:', error);
      Alert.alert('Error', 'Failed to load receipt');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // Helper function to download PDF with proper authentication
  const downloadPDF = async (): Promise<string | null> => {
    try {
      const pdfUrl = await api.getReceiptPDFUrl(receiptId);
      const headers = await api.getAuthHeaders();

      const fileName = `Receipt_${receipt?.receipt_number?.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const fileUri = `${cacheDirectory}${fileName}`;

      console.log('Downloading Receipt PDF from:', pdfUrl);
      console.log('With headers:', Object.keys(headers));

      const downloadResult = await downloadAsync(pdfUrl, fileUri, {
        headers: headers as Record<string, string>,
      });

      console.log('Download result status:', downloadResult.status);
      console.log('Download result uri:', downloadResult.uri);

      if (downloadResult.status !== 200) {
        console.error('Receipt PDF download failed with status:', downloadResult.status);
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
      console.error('Error downloading Receipt PDF:', error);
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
            dialogTitle: `View Receipt ${receipt?.receipt_number}`,
            UTI: 'com.adobe.pdf',
          });
        }
      } else {
        // On iOS, use share sheet to open in PDF viewer
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
          dialogTitle: `View Receipt ${receipt?.receipt_number}`,
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
        dialogTitle: `Share Receipt ${receipt?.receipt_number}`,
        UTI: 'com.adobe.pdf',
      });

    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      Alert.alert('Error', 'Failed to share receipt PDF');
    } finally {
      setSharingPDF(false);
    }
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

  const getPaymentMethodColor = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return { bg: colors.success.light, text: colors.success.dark };
      case 'bank':
      case 'bank_transfer':
      case 'bank transfer':
        return { bg: colors.info.light, text: colors.info.dark };
      case 'upi':
        return { bg: colors.secondary[100], text: colors.secondary[700] };
      case 'cheque':
        return { bg: colors.warning.light, text: colors.warning.dark };
      default:
        return { bg: colors.gray[100], text: colors.gray[500] };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (!receipt) {
    return null;
  }

  const methodColor = getPaymentMethodColor(receipt.payment_method);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <View style={styles.headerRow}>
              <View>
                <Text variant="headlineSmall" style={styles.receiptNumber}>
                  {receipt.receipt_number}
                </Text>
                <Text variant="bodyMedium" style={styles.receiptDate}>
                  {formatDate(receipt.receipt_date)}
                </Text>
              </View>
              <View style={[styles.methodBadge, { backgroundColor: methodColor.bg }]}>
                <Text variant="labelMedium" style={{ color: methodColor.text }}>
                  {receipt.payment_method?.toUpperCase() || 'N/A'}
                </Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>Client</Text>
              <Text variant="bodyLarge">{receipt.client_name}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.label}>Invoice</Text>
              <Text variant="bodyLarge">{receipt.invoice_number}</Text>
            </View>

            {receipt.received_from && (
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.label}>Received From</Text>
                <Text variant="bodyLarge">{receipt.received_from}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Payment Details Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Payment Details
            </Text>

            <View style={styles.summaryRow}>
              <Text variant="bodyMedium">Amount Received</Text>
              <Text variant="bodyLarge">{formatCurrency(receipt.amount_received)}</Text>
            </View>

            {parseFloat(receipt.tds_amount) > 0 && (
              <View style={styles.summaryRow}>
                <Text variant="bodyMedium">TDS Deducted</Text>
                <Text variant="bodyLarge">- {formatCurrency(receipt.tds_amount)}</Text>
              </View>
            )}

            {parseFloat(receipt.gst_tds_amount) > 0 && (
              <View style={styles.summaryRow}>
                <Text variant="bodyMedium">GST TDS Deducted</Text>
                <Text variant="bodyLarge">- {formatCurrency(receipt.gst_tds_amount)}</Text>
              </View>
            )}

            <Divider style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text variant="titleMedium" style={styles.totalLabel}>
                Total Amount
              </Text>
              <Text variant="headlineSmall" style={styles.grandTotal}>
                {formatCurrency(receipt.total_amount)}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Additional Info Card */}
        {(receipt.towards || receipt.payment_reference || receipt.notes) && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Additional Information
              </Text>

              {receipt.towards && (
                <View style={styles.infoBlock}>
                  <Text variant="labelMedium" style={styles.label}>Towards</Text>
                  <Text variant="bodyMedium">{receipt.towards}</Text>
                </View>
              )}

              {receipt.payment_reference && (
                <View style={styles.infoBlock}>
                  <Text variant="labelMedium" style={styles.label}>Reference</Text>
                  <Text variant="bodyMedium">{receipt.payment_reference}</Text>
                </View>
              )}

              {receipt.notes && (
                <View style={styles.infoBlock}>
                  <Text variant="labelMedium" style={styles.label}>Notes</Text>
                  <Text variant="bodyMedium">{receipt.notes}</Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={handleViewPDF}
          loading={sharingPDF}
          disabled={sharingPDF}
          style={styles.actionButton}
          icon="file-pdf-box"
        >
          View PDF
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
              handleSharePDF();
            }}
            title={sharingPDF ? "Preparing PDF..." : "Share PDF"}
            leadingIcon="share-variant"
            disabled={sharingPDF}
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
  receiptNumber: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  receiptDate: {
    color: colors.text.secondary,
    marginTop: 4,
  },
  methodBadge: {
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
    color: colors.success.main,
  },
  infoBlock: {
    marginBottom: 12,
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
    justifyContent: 'center',
  },
  actionButton: {
    flex: 1,
    marginRight: 8,
    borderRadius: 10,
  },
});
