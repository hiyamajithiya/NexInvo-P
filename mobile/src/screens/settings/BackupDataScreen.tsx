import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
} from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { documentDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import api from '../../services/api';
import { RootStackParamList } from '../../types';
import colors from '../../theme/colors';

type BackupDataScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'BackupData'>;
};

type ExportType = 'all' | 'invoices' | 'clients' | 'payments';
type ExportFormat = 'excel' | 'csv';

export default function BackupDataScreen({ navigation }: BackupDataScreenProps) {
  const insets = useSafeAreaInsets();
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: ExportFormat, dataType: ExportType) => {
    const exportKey = `${format}-${dataType}`;
    setExporting(exportKey);

    try {
      const blob = await api.exportData(format, dataType);

      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);

      reader.onloadend = async () => {
        try {
          const base64data = reader.result as string;
          const base64Content = base64data.split(',')[1];

          const timestamp = new Date().toISOString().split('T')[0];
          const extension = format === 'excel' ? 'xlsx' : 'csv';
          const fileName = `nexinvo_${dataType}_export_${timestamp}.${extension}`;
          const filePath = `${documentDirectory}${fileName}`;

          await writeAsStringAsync(filePath, base64Content, {
            encoding: EncodingType.Base64,
          });

          // Check if sharing is available
          const isAvailable = await isAvailableAsync();

          if (isAvailable) {
            await shareAsync(filePath, {
              mimeType: format === 'excel'
                ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                : 'text/csv',
              dialogTitle: 'Export Data',
            });
          } else {
            Alert.alert(
              'Success',
              `Data exported successfully. File saved to: ${fileName}`,
              [{ text: 'OK' }]
            );
          }
        } catch (shareError) {
          console.error('Error sharing file:', shareError);
          Alert.alert('Error', 'Failed to share the exported file');
        } finally {
          setExporting(null);
        }
      };

      reader.onerror = () => {
        console.error('Error reading blob');
        Alert.alert('Error', 'Failed to process exported data');
        setExporting(null);
      };

    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to export data. Please try again.'
      );
      setExporting(null);
    }
  };

  const ExportCard = ({
    title,
    description,
    dataType,
    icon,
    highlight = false,
  }: {
    title: string;
    description: string;
    dataType: ExportType;
    icon: string;
    highlight?: boolean;
  }) => (
    <Card style={[styles.card, highlight && styles.highlightCard]}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>{icon}</Text>
          <View style={styles.cardTitleContainer}>
            <Text variant="titleMedium" style={[styles.cardTitle, highlight && styles.highlightTitle]}>
              {title}
            </Text>
            <Text variant="bodySmall" style={[styles.cardDescription, highlight && styles.highlightDescription]}>
              {description}
            </Text>
          </View>
        </View>
        <View style={styles.exportButtons}>
          <Button
            mode={highlight ? 'contained' : 'outlined'}
            onPress={() => handleExport('excel', dataType)}
            loading={exporting === `excel-${dataType}`}
            disabled={exporting !== null}
            icon="microsoft-excel"
            style={styles.exportButton}
            compact
          >
            Excel
          </Button>
          <Button
            mode="outlined"
            onPress={() => handleExport('csv', dataType)}
            loading={exporting === `csv-${dataType}`}
            disabled={exporting !== null}
            icon="file-delimited"
            style={styles.exportButton}
            compact
          >
            CSV
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
        {/* Info Card */}
        <Card style={[styles.card, styles.infoCard]}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.infoTitle}>
              Export Your Data
            </Text>
            <Text variant="bodySmall" style={styles.infoText}>
              Download your organization's data for backup or analysis purposes.
              Files will be saved and shared to your preferred location.
            </Text>
          </Card.Content>
        </Card>

        {/* Export All Data */}
        <ExportCard
          title="Export All Data"
          description="Download all invoices, clients, and payments in a single file"
          dataType="all"
          icon="📊"
          highlight
        />

        {/* Export Invoices */}
        <ExportCard
          title="Export Invoices"
          description="Invoice numbers, clients, amounts, and status"
          dataType="invoices"
          icon="📄"
        />

        {/* Export Clients */}
        <ExportCard
          title="Export Clients"
          description="Client directory with contact and billing details"
          dataType="clients"
          icon="👥"
        />

        {/* Export Payments */}
        <ExportCard
          title="Export Payments"
          description="Payment records with amounts, dates, and methods"
          dataType="payments"
          icon="💳"
        />

        {/* Note */}
        <Card style={[styles.card, styles.noteCard]}>
          <Card.Content>
            <Text variant="bodySmall" style={styles.noteText}>
              Note: Export files are generated on the server and may take a few moments
              for large datasets. The file will automatically open for sharing once ready.
            </Text>
          </Card.Content>
        </Card>
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
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
  },
  infoCard: {
    backgroundColor: colors.primary[50],
  },
  infoTitle: {
    color: colors.primary[700],
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoText: {
    color: colors.primary[600],
    lineHeight: 20,
  },
  highlightCard: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#0ea5e9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  highlightTitle: {
    color: '#0369a1',
  },
  cardDescription: {
    color: colors.text.secondary,
    marginTop: 2,
  },
  highlightDescription: {
    color: '#0c4a6e',
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    flex: 1,
  },
  noteCard: {
    backgroundColor: colors.gray[100],
  },
  noteText: {
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
});
