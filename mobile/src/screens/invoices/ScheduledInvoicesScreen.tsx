import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Searchbar,
  ActivityIndicator,
  FAB,
  IconButton,
  Menu,
  Divider,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../services/api';
import { ScheduledInvoiceListItem, RootStackParamList } from '../../types';
import colors from '../../theme/colors';

type ScheduledInvoicesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ScheduledInvoicesScreen() {
  const navigation = useNavigation<ScheduledInvoicesScreenNavigationProp>();
  const [scheduledInvoices, setScheduledInvoices] = useState<ScheduledInvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [menuVisible, setMenuVisible] = useState<number | null>(null);

  const fetchScheduledInvoices = async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const data = await api.getScheduledInvoices({
        page: currentPage,
        search: search || undefined,
      });

      if (reset) {
        setScheduledInvoices(data.results || []);
        setPage(2);
      } else {
        setScheduledInvoices((prev) => [...prev, ...(data.results || [])]);
        setPage((prev) => prev + 1);
      }
      setHasMore(!!data.next);
    } catch (error) {
      console.error('Error fetching scheduled invoices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchScheduledInvoices(true);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchScheduledInvoices(true);
  };

  const onSearch = () => {
    setLoading(true);
    fetchScheduledInvoices(true);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchScheduledInvoices();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = status?.toLowerCase()?.trim();
    switch (normalizedStatus) {
      case 'active':
        return { bg: colors.success.light, text: colors.success.dark };
      case 'paused':
        return { bg: colors.warning.light, text: colors.warning.dark };
      case 'completed':
        return { bg: '#e0e7ff', text: '#4f46e5' }; // Purple/Indigo for completed
      case 'cancelled':
        return { bg: colors.error.light, text: colors.error.dark };
      default:
        return { bg: colors.gray[200], text: colors.gray[600] };
    }
  };

  const getStatusLabel = (status: string, statusDisplay?: string) => {
    if (statusDisplay) return statusDisplay;
    const normalizedStatus = status?.toLowerCase()?.trim();
    switch (normalizedStatus) {
      case 'active': return 'Active';
      case 'paused': return 'Paused';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status || 'Unknown';
    }
  };

  const getFrequencyIcon = (frequency: string) => {
    switch (frequency?.toLowerCase()) {
      case 'weekly':
        return 'calendar-week';
      case 'monthly':
        return 'calendar-month';
      case 'yearly':
        return 'calendar';
      default:
        return 'calendar-clock';
    }
  };

  const handlePause = async (id: number) => {
    try {
      await api.pauseScheduledInvoice(id);
      Alert.alert('Success', 'Scheduled invoice paused');
      fetchScheduledInvoices(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to pause scheduled invoice');
    }
    setMenuVisible(null);
  };

  const handleResume = async (id: number) => {
    try {
      await api.resumeScheduledInvoice(id);
      Alert.alert('Success', 'Scheduled invoice resumed');
      fetchScheduledInvoices(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to resume scheduled invoice');
    }
    setMenuVisible(null);
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Delete Scheduled Invoice',
      'Are you sure you want to delete this scheduled invoice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteScheduledInvoice(id);
              Alert.alert('Success', 'Scheduled invoice deleted');
              fetchScheduledInvoices(true);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete');
            }
          },
        },
      ]
    );
    setMenuVisible(null);
  };

  const handleGenerate = async (id: number) => {
    try {
      await api.generateScheduledInvoice(id);
      Alert.alert('Success', 'Invoice generated successfully');
      fetchScheduledInvoices(true);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to generate invoice');
    }
    setMenuVisible(null);
  };

  const renderScheduledInvoice = ({ item }: { item: ScheduledInvoiceListItem }) => {
    const statusColor = getStatusColor(item.status);

    return (
      <Card
        style={styles.card}
        onPress={() => navigation.navigate('ScheduledInvoiceForm', { scheduledInvoiceId: item.id })}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <Text variant="titleMedium" style={styles.name}>
                {item.name}
              </Text>
              <Text variant="bodySmall" style={styles.clientName}>
                {item.client_name}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                <Text style={[styles.statusText, { color: statusColor.text }]}>
                  {getStatusLabel(item.status, item.status_display)}
                </Text>
              </View>
              <Menu
                visible={menuVisible === item.id}
                onDismiss={() => setMenuVisible(null)}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    size={20}
                    onPress={() => setMenuVisible(item.id)}
                  />
                }
              >
                {item.status === 'active' && (
                  <Menu.Item
                    onPress={() => handlePause(item.id)}
                    title="Pause"
                    leadingIcon="pause"
                  />
                )}
                {item.status === 'paused' && (
                  <Menu.Item
                    onPress={() => handleResume(item.id)}
                    title="Resume"
                    leadingIcon="play"
                  />
                )}
                {item.status === 'active' && (
                  <Menu.Item
                    onPress={() => handleGenerate(item.id)}
                    title="Generate Now"
                    leadingIcon="file-document-plus"
                  />
                )}
                <Divider />
                <Menu.Item
                  onPress={() => handleDelete(item.id)}
                  title="Delete"
                  leadingIcon="delete"
                  titleStyle={{ color: colors.error.dark }}
                />
              </Menu>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <IconButton
                  icon={getFrequencyIcon(item.frequency)}
                  size={16}
                  style={styles.infoIcon}
                />
                <Text variant="bodySmall" style={styles.infoText}>
                  {item.frequency_display || item.frequency}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <IconButton icon="calendar-check" size={16} style={styles.infoIcon} />
                <Text variant="bodySmall" style={styles.infoText}>
                  Day {item.day_of_month}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <IconButton icon="file-document-multiple" size={16} style={styles.infoIcon} />
                <Text variant="bodySmall" style={styles.infoText}>
                  {item.occurrences_generated} generated
                </Text>
              </View>
            </View>

            <View style={styles.footerRow}>
              <View style={styles.nextGen}>
                <Text variant="labelSmall" style={styles.nextGenLabel}>
                  Next: {formatDate(item.next_generation_date)}
                </Text>
                {item.auto_send_email && (
                  <IconButton icon="email-check" size={14} style={styles.emailIcon} />
                )}
              </View>
              <Text variant="titleMedium" style={styles.amount}>
                {formatCurrency(item.total_amount)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search scheduled invoices..."
          onChangeText={setSearch}
          value={search}
          onSubmitEditing={onSearch}
          style={styles.searchbar}
        />
      </View>

      {loading && scheduledInvoices.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={scheduledInvoices}
          renderItem={renderScheduledInvoice}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                No scheduled invoices found
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                Create a scheduled invoice to automate your billing
              </Text>
            </View>
          }
          ListFooterComponent={
            loading && scheduledInvoices.length > 0 ? (
              <ActivityIndicator style={styles.footerLoader} />
            ) : null
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('ScheduledInvoiceForm', {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: colors.background.paper,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: colors.gray[100],
    borderRadius: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.default,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  clientName: {
    color: colors.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardBody: {
    marginTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  infoIcon: {
    margin: 0,
    marginRight: -4,
  },
  infoText: {
    color: colors.text.secondary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  nextGen: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nextGenLabel: {
    color: colors.text.secondary,
  },
  emailIcon: {
    margin: 0,
    marginLeft: -4,
  },
  amount: {
    fontWeight: 'bold',
    color: colors.primary[500],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: colors.text.secondary,
  },
  emptySubtext: {
    color: colors.text.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  footerLoader: {
    marginVertical: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary[500],
  },
});
