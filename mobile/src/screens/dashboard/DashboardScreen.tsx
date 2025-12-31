import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Card,
  useTheme,
  ActivityIndicator,
  Surface,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../services/api';
import { DashboardStats, RootStackParamList, MainTabParamList } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import colors from '../../theme/colors';

type DashboardNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Dashboard'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function DashboardScreen() {
  const theme = useTheme();
  const navigation = useNavigation<DashboardNavigationProp>();
  const { organization } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.greeting}>
          Welcome back!
        </Text>
        <Text variant="bodyLarge" style={styles.orgName}>
          {organization?.name || 'Your Organization'}
        </Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <TouchableOpacity
          style={styles.statCardWrapper}
          onPress={() => navigation.navigate('Invoices')}
          activeOpacity={0.7}
        >
          <Surface style={[styles.statCard, { backgroundColor: colors.statCards.invoices.bg }]}>
            <View style={[styles.statIconWrapper, { backgroundColor: colors.statCards.invoices.iconBg }]}>
              <Text style={styles.statIcon}>📄</Text>
            </View>
            <Text variant="headlineMedium" style={[styles.statValue, { color: colors.statCards.invoices.text }]}>
              {stats?.totalInvoices || 0}
            </Text>
            <Text variant="bodyMedium" style={styles.statLabel}>
              Total Invoices
            </Text>
          </Surface>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCardWrapper}
          onPress={() => navigation.navigate('Clients')}
          activeOpacity={0.7}
        >
          <Surface style={[styles.statCard, { backgroundColor: colors.statCards.clients.bg }]}>
            <View style={[styles.statIconWrapper, { backgroundColor: colors.statCards.clients.iconBg }]}>
              <Text style={styles.statIcon}>👥</Text>
            </View>
            <Text variant="headlineMedium" style={[styles.statValue, { color: colors.statCards.clients.text }]}>
              {stats?.clients || 0}
            </Text>
            <Text variant="bodyMedium" style={styles.statLabel}>
              Total Clients
            </Text>
          </Surface>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCardWrapper}
          onPress={() => navigation.navigate('Invoices')}
          activeOpacity={0.7}
        >
          <Surface style={[styles.statCard, { backgroundColor: colors.statCards.monthly.bg }]}>
            <View style={[styles.statIconWrapper, { backgroundColor: colors.statCards.monthly.iconBg }]}>
              <Text style={styles.statIcon}>📅</Text>
            </View>
            <Text variant="headlineMedium" style={[styles.statValue, { color: colors.statCards.monthly.text }]}>
              {stats?.subscription?.invoices_this_month || 0}
            </Text>
            <Text variant="bodyMedium" style={styles.statLabel}>
              This Month
            </Text>
          </Surface>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCardWrapper}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}
        >
          <Surface style={[styles.statCard, { backgroundColor: colors.statCards.subscription.bg }]}>
            <View style={[styles.statIconWrapper, { backgroundColor: colors.statCards.subscription.iconBg }]}>
              <Text style={styles.statIcon}>⏳</Text>
            </View>
            <Text variant="headlineMedium" style={[styles.statValue, { color: colors.statCards.subscription.text }]}>
              {stats?.subscription?.days_remaining || 0}
            </Text>
            <Text variant="bodyMedium" style={styles.statLabel}>
              Days Left
            </Text>
          </Surface>
        </TouchableOpacity>
      </View>

      {/* Revenue Cards */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Reports')}
        activeOpacity={0.7}
      >
        <Card style={[styles.revenueCard, { backgroundColor: colors.success.light }]}>
          <Card.Content>
            <View style={styles.revenueHeader}>
              <View style={[styles.revenueIconWrapper, { backgroundColor: colors.success.main }]}>
                <Text style={styles.revenueIcon}>💰</Text>
              </View>
              <Text variant="titleMedium" style={[styles.cardTitle, { color: colors.success.dark }]}>
                Total Revenue
              </Text>
            </View>
            <Text variant="headlineLarge" style={[styles.revenueAmount, { color: colors.success.dark }]}>
              {formatCurrency(stats?.revenue || 0)}
            </Text>
          </Card.Content>
        </Card>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('Receipts')}
        activeOpacity={0.7}
      >
        <Card style={[styles.revenueCard, { backgroundColor: colors.warning.light }]}>
          <Card.Content>
            <View style={styles.revenueHeader}>
              <View style={[styles.revenueIconWrapper, { backgroundColor: colors.warning.main }]}>
                <Text style={styles.revenueIcon}>⏰</Text>
              </View>
              <Text variant="titleMedium" style={[styles.cardTitle, { color: colors.warning.dark }]}>
                Pending Amount
              </Text>
            </View>
            <Text variant="headlineLarge" style={[styles.revenueAmount, { color: colors.warning.dark }]}>
              {formatCurrency(stats?.pending || 0)}
            </Text>
          </Card.Content>
        </Card>
      </TouchableOpacity>

      {/* Subscription Info */}
      {stats?.subscription && (
        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Subscription Details
          </Text>

          <Card style={styles.subscriptionCard}>
            <Card.Content>
              <View style={styles.subscriptionHeader}>
                <Text variant="titleMedium" style={styles.planName}>
                  {stats.subscription.plan_name} Plan
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: stats.subscription.is_active
                        ? colors.success.light
                        : colors.error.light,
                    },
                  ]}
                >
                  <Text
                    variant="labelSmall"
                    style={{
                      color: stats.subscription.is_active ? colors.success.dark : colors.error.dark,
                      fontWeight: '600',
                    }}
                  >
                    {stats.subscription.status.toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.subscriptionDetails}>
                <View style={styles.detailRow}>
                  <Text variant="bodyMedium" style={styles.detailLabel}>
                    Users
                  </Text>
                  <Text variant="bodyMedium">
                    {stats.subscription.current_users} / {stats.subscription.max_users}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text variant="bodyMedium" style={styles.detailLabel}>
                    Invoices This Month
                  </Text>
                  <Text variant="bodyMedium">
                    {stats.subscription.invoices_this_month} / {stats.subscription.max_invoices_per_month}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text variant="bodyMedium" style={styles.detailLabel}>
                    Storage
                  </Text>
                  <Text variant="bodyMedium">
                    {stats.subscription.max_storage_gb} GB
                  </Text>
                </View>

                {stats.subscription.next_billing_date && (
                  <View style={styles.detailRow}>
                    <Text variant="bodyMedium" style={styles.detailLabel}>
                      Next Billing
                    </Text>
                    <Text variant="bodyMedium">
                      {new Date(stats.subscription.next_billing_date).toLocaleDateString('en-IN')}
                    </Text>
                  </View>
                )}
              </View>
            </Card.Content>
          </Card>
        </View>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.default,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  orgName: {
    color: colors.text.secondary,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCardWrapper: {
    width: '48%',
  },
  statCard: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    elevation: 3,
    alignItems: 'center',
  },
  statIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: colors.text.secondary,
    textAlign: 'center',
  },
  revenueCard: {
    marginBottom: 12,
    borderRadius: 16,
    elevation: 2,
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  revenueIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  revenueIcon: {
    fontSize: 20,
  },
  cardTitle: {
    fontWeight: '600',
  },
  revenueAmount: {
    fontWeight: 'bold',
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors.text.primary,
  },
  subscriptionCard: {
    borderRadius: 16,
    elevation: 2,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontWeight: 'bold',
    color: colors.primary[500],
  },
  subscriptionDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
});
