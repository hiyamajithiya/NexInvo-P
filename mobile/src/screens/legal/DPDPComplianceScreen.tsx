import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Text, Card, List, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../../theme/colors';

export default function DPDPComplianceScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}
    >
      <Card style={styles.headerCard}>
        <Card.Content>
          <Text variant="headlineMedium" style={styles.title}>
            DPDP Compliance
          </Text>
          <Text variant="bodySmall" style={styles.subtitle}>
            Digital Personal Data Protection Act, 2023
          </Text>
          <Text variant="bodySmall" style={styles.lastUpdated}>
            Last Updated: January 2025
          </Text>
          <Text variant="bodyMedium" style={styles.company}>
            Chinmay Technosoft Private Limited
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Our Commitment
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            NexInvo is committed to protecting the privacy and personal data of our users in compliance with the Digital Personal Data Protection Act, 2023 (DPDP Act) of India.
          </Text>
          <Text variant="bodyMedium" style={[styles.paragraph, { marginTop: 12 }]}>
            This document outlines how we collect, process, store, and protect your personal data when you use our GST-compliant invoice management platform.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Data We Collect
          </Text>

          <View style={styles.dataTable}>
            <View style={styles.tableHeader}>
              <Text variant="labelMedium" style={styles.tableHeaderText}>Category</Text>
              <Text variant="labelMedium" style={styles.tableHeaderText}>Purpose</Text>
            </View>
            <Divider />
            <View style={styles.tableRow}>
              <Text variant="bodySmall" style={styles.tableCell}>Name, Email, Phone</Text>
              <Text variant="bodySmall" style={styles.tableCell}>Account & Authentication</Text>
            </View>
            <Divider />
            <View style={styles.tableRow}>
              <Text variant="bodySmall" style={styles.tableCell}>Company Details</Text>
              <Text variant="bodySmall" style={styles.tableCell}>Invoice Generation</Text>
            </View>
            <Divider />
            <View style={styles.tableRow}>
              <Text variant="bodySmall" style={styles.tableCell}>GSTIN, PAN</Text>
              <Text variant="bodySmall" style={styles.tableCell}>Tax Compliance</Text>
            </View>
            <Divider />
            <View style={styles.tableRow}>
              <Text variant="bodySmall" style={styles.tableCell}>Bank Details</Text>
              <Text variant="bodySmall" style={styles.tableCell}>Payment Information</Text>
            </View>
            <Divider />
            <View style={styles.tableRow}>
              <Text variant="bodySmall" style={styles.tableCell}>Client Data</Text>
              <Text variant="bodySmall" style={styles.tableCell}>Invoice & Receipt Delivery</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Your Rights Under DPDP Act
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            As a Data Principal under the DPDP Act, 2023, you have the following rights:
          </Text>
        </Card.Content>

        <List.Item
          title="Right to Access"
          description="Request a summary of your personal data"
          left={(props) => <List.Icon {...props} icon="file-document" color={colors.primary[500]} />}
        />
        <Divider />
        <List.Item
          title="Right to Correction"
          description="Request correction of inaccurate data"
          left={(props) => <List.Icon {...props} icon="pencil" color={colors.success.main} />}
        />
        <Divider />
        <List.Item
          title="Right to Erasure"
          description="Request deletion of your personal data"
          left={(props) => <List.Icon {...props} icon="delete" color={colors.error.main} />}
        />
        <Divider />
        <List.Item
          title="Right to Data Portability"
          description="Export your data in standard formats"
          left={(props) => <List.Icon {...props} icon="export" color={colors.info.main} />}
        />
        <Divider />
        <List.Item
          title="Right to Grievance Redressal"
          description="Lodge complaints about data processing"
          left={(props) => <List.Icon {...props} icon="message-alert" color={colors.warning.main} />}
        />
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Consent Management
          </Text>

          <Text variant="titleSmall" style={styles.subTitle}>
            How We Obtain Consent
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            {'\u2022'} Account registration with explicit acceptance{'\n'}
            {'\u2022'} Terms of Service and Privacy Policy acceptance{'\n'}
            {'\u2022'} OTP verification for email confirmation{'\n'}
            {'\u2022'} Feature-specific consent for optional services
          </Text>

          <Text variant="titleSmall" style={styles.subTitle}>
            Withdrawing Consent
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            You can withdraw consent at any time by:{'\n\n'}
            {'\u2022'} Deleting your account through Settings{'\n'}
            {'\u2022'} Contacting our support team{'\n'}
            {'\u2022'} Disabling specific features in settings
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Data Security Measures
          </Text>
        </Card.Content>

        <List.Item
          title="Encryption"
          description="HTTPS/TLS for data in transit, encrypted storage"
          left={(props) => <List.Icon {...props} icon="lock" color={colors.primary[500]} />}
        />
        <Divider />
        <List.Item
          title="Secure Authentication"
          description="JWT tokens, password hashing, OTP verification"
          left={(props) => <List.Icon {...props} icon="key" color={colors.success.main} />}
        />
        <Divider />
        <List.Item
          title="Multi-Tenant Isolation"
          description="Complete data isolation between organizations"
          left={(props) => <List.Icon {...props} icon="domain" color={colors.info.main} />}
        />
        <Divider />
        <List.Item
          title="Role-Based Access"
          description="Granular permissions (Owner, Admin, User, Viewer)"
          left={(props) => <List.Icon {...props} icon="account-group" color={colors.warning.main} />}
        />
        <Divider />
        <List.Item
          title="Audit Logging"
          description="All data access and modifications logged"
          left={(props) => <List.Icon {...props} icon="clipboard-text" color={colors.text.secondary} />}
        />
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Data Retention
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            {'\u2022'} Account data: Retained while account is active{'\n'}
            {'\u2022'} Invoice records: 7 years (GST compliance){'\n'}
            {'\u2022'} After account deletion: Data anonymized/deleted within 30 days except where legally required
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Grievance Redressal
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            For any complaints or concerns regarding your personal data, please contact our Grievance Officer:{'\n\n'}
            Email: grievance@nexinvo.com{'\n'}
            Response Time: Within 72 hours{'\n\n'}
            We are committed to resolving all grievances within 30 days as per DPDP Act requirements.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Contact Information
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            Chinmay Technosoft Private Limited{'\n\n'}
            Email: support@nexinvo.com{'\n'}
            Data Protection Officer: dpo@nexinvo.com{'\n'}
            Grievance Officer: grievance@nexinvo.com
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
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
  headerCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: colors.primary[500],
  },
  title: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  lastUpdated: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
  },
  company: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
  },
  subTitle: {
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    color: colors.text.secondary,
    lineHeight: 22,
  },
  dataTable: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.grey[200],
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.grey[100],
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeaderText: {
    flex: 1,
    fontWeight: '600',
    color: colors.text.primary,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableCell: {
    flex: 1,
    color: colors.text.secondary,
  },
});
