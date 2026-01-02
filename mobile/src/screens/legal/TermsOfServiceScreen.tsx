import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Text, Card } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../../theme/colors';

export default function TermsOfServiceScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}
    >
      <Card style={styles.headerCard}>
        <Card.Content>
          <Text variant="headlineMedium" style={styles.title}>
            Terms of Service
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
            1. Acceptance of Terms
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            By accessing or using NexInvo ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            2. Description of Service
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            NexInvo is a GST-compliant invoice management platform that allows users to:{'\n\n'}
            {'\u2022'} Create and manage professional invoices{'\n'}
            {'\u2022'} Generate Tax Invoices and Proforma Invoices{'\n'}
            {'\u2022'} Track payments and manage receipts{'\n'}
            {'\u2022'} Manage clients and services{'\n'}
            {'\u2022'} Generate business reports{'\n'}
            {'\u2022'} Send invoices via email
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            3. User Accounts
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            {'\u2022'} You must provide accurate and complete registration information{'\n'}
            {'\u2022'} You are responsible for maintaining the security of your account{'\n'}
            {'\u2022'} You must notify us immediately of any unauthorized access{'\n'}
            {'\u2022'} You are responsible for all activities under your account{'\n'}
            {'\u2022'} One user may belong to multiple organizations
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            4. User Responsibilities
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            You agree to:{'\n\n'}
            {'\u2022'} Provide accurate business and tax information{'\n'}
            {'\u2022'} Comply with all applicable laws including GST Act{'\n'}
            {'\u2022'} Not use the Service for fraudulent invoicing{'\n'}
            {'\u2022'} Not attempt to access other users' data{'\n'}
            {'\u2022'} Not reverse engineer or copy the Service{'\n'}
            {'\u2022'} Maintain proper records as required by law
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            5. Subscription and Payment
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            {'\u2022'} Free tier available with limited features{'\n'}
            {'\u2022'} Paid plans billed monthly or annually{'\n'}
            {'\u2022'} Payments are non-refundable unless otherwise stated{'\n'}
            {'\u2022'} We reserve the right to change pricing with notice{'\n'}
            {'\u2022'} Subscription may be cancelled at any time
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            6. Intellectual Property
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            {'\u2022'} NexInvo and its features are owned by Chinmay Technosoft{'\n'}
            {'\u2022'} You retain ownership of your business data{'\n'}
            {'\u2022'} You grant us license to process your data for the Service{'\n'}
            {'\u2022'} Invoice templates and designs are our intellectual property
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            7. Data and Privacy
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            {'\u2022'} Your data is processed as per our Privacy Policy{'\n'}
            {'\u2022'} We comply with DPDP Act 2023 requirements{'\n'}
            {'\u2022'} We implement appropriate security measures{'\n'}
            {'\u2022'} Data backup and recovery included in the Service{'\n'}
            {'\u2022'} You can export your data at any time
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            8. Service Availability
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            {'\u2022'} We strive for 99.9% uptime{'\n'}
            {'\u2022'} Scheduled maintenance will be notified in advance{'\n'}
            {'\u2022'} We are not liable for interruptions beyond our control{'\n'}
            {'\u2022'} Emergency maintenance may occur without notice
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            9. Limitation of Liability
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            {'\u2022'} Service provided "as is" without warranties{'\n'}
            {'\u2022'} We are not liable for indirect or consequential damages{'\n'}
            {'\u2022'} Maximum liability limited to subscription fees paid{'\n'}
            {'\u2022'} You are responsible for your tax compliance
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            10. Termination
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            {'\u2022'} You may terminate your account at any time{'\n'}
            {'\u2022'} We may terminate for violation of terms{'\n'}
            {'\u2022'} Upon termination, you can export your data{'\n'}
            {'\u2022'} Data will be deleted within 30 days of account closure
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            11. Governing Law
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in India.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            12. Contact Information
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            For questions about these Terms:{'\n\n'}
            Chinmay Technosoft Private Limited{'\n'}
            Email: legal@nexinvo.com{'\n'}
            Support: support@nexinvo.com
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
    marginBottom: 8,
  },
  lastUpdated: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
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
  paragraph: {
    color: colors.text.secondary,
    lineHeight: 22,
  },
});
