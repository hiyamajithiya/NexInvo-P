import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Text, Card, Divider } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../../theme/colors';

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}
    >
      <Card style={styles.headerCard}>
        <Card.Content>
          <Text variant="headlineMedium" style={styles.title}>
            Privacy Policy
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
            1. Introduction
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            NexInvo ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            2. Information We Collect
          </Text>

          <Text variant="titleSmall" style={styles.subTitle}>
            Personal Information
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            {'\u2022'} Name, email address, and phone number{'\n'}
            {'\u2022'} Company/organization details{'\n'}
            {'\u2022'} GSTIN and PAN (for GST compliance){'\n'}
            {'\u2022'} Bank account details (for invoices){'\n'}
            {'\u2022'} Business address
          </Text>

          <Text variant="titleSmall" style={styles.subTitle}>
            Client Data
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            {'\u2022'} Client names and contact information{'\n'}
            {'\u2022'} Client GSTIN/PAN for tax compliance{'\n'}
            {'\u2022'} Invoice and payment records
          </Text>

          <Text variant="titleSmall" style={styles.subTitle}>
            Technical Data
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            {'\u2022'} Device information and identifiers{'\n'}
            {'\u2022'} Usage data and analytics{'\n'}
            {'\u2022'} Log files and error reports
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            3. How We Use Your Information
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            {'\u2022'} To provide invoice management services{'\n'}
            {'\u2022'} To generate GST-compliant invoices{'\n'}
            {'\u2022'} To send invoices and receipts to your clients{'\n'}
            {'\u2022'} To track payments and manage accounts{'\n'}
            {'\u2022'} To improve our services{'\n'}
            {'\u2022'} To communicate with you about your account{'\n'}
            {'\u2022'} To comply with legal obligations
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            4. Data Security
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            We implement appropriate security measures to protect your personal information, including:{'\n\n'}
            {'\u2022'} Encryption of data in transit (HTTPS/TLS){'\n'}
            {'\u2022'} Secure password hashing{'\n'}
            {'\u2022'} JWT token-based authentication{'\n'}
            {'\u2022'} Multi-tenant data isolation{'\n'}
            {'\u2022'} Regular security audits{'\n'}
            {'\u2022'} Role-based access controls
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            5. Data Retention
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            We retain your personal data for as long as your account is active or as needed to provide you services. We may also retain data as required by law (e.g., tax records under GST regulations for 7 years).
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            6. Your Rights
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            Under applicable data protection laws, you have the right to:{'\n\n'}
            {'\u2022'} Access your personal data{'\n'}
            {'\u2022'} Correct inaccurate data{'\n'}
            {'\u2022'} Request deletion of your data{'\n'}
            {'\u2022'} Export your data{'\n'}
            {'\u2022'} Withdraw consent{'\n'}
            {'\u2022'} Lodge complaints with authorities
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            7. Third-Party Services
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            We may use third-party services for email delivery, analytics, and cloud hosting. These services have their own privacy policies governing the use of your information.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            8. Contact Us
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            If you have questions about this Privacy Policy or our data practices, please contact us at:{'\n\n'}
            Email: support@nexinvo.com{'\n'}
            Company: Chinmay Technosoft Private Limited
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            9. Changes to This Policy
          </Text>
          <Text variant="bodyMedium" style={styles.paragraph}>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
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
  subTitle: {
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 12,
    marginBottom: 8,
  },
  paragraph: {
    color: colors.text.secondary,
    lineHeight: 22,
  },
});
