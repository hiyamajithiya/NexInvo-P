import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  FAB,
  Searchbar,
  Chip,
  ActivityIndicator,
} from 'react-native-paper';
import { useFocusEffect, useIsFocused, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../services/api';
import { Invoice, RootStackParamList, MainTabParamList } from '../../types';
import colors from '../../theme/colors';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatters';

type InvoicesScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

type InvoicesScreenRouteProp = RouteProp<MainTabParamList, 'Invoices'>;

const statusFilters = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent', label: 'Sent' },
  { key: 'paid', label: 'Paid' },
  { key: 'overdue', label: 'Overdue' },
];

export default function InvoicesScreen({ navigation }: InvoicesScreenProps) {
  const isFocused = useIsFocused();
  const route = useRoute<InvoicesScreenRouteProp>();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle initial filter from navigation params
  useEffect(() => {
    if (route.params?.filter) {
      setStatusFilter(route.params.filter);
    }
  }, [route.params?.filter]);

  const fetchInvoices = async (reset = false) => {
    try {
      setError(null);
      const currentPage = reset ? 1 : page;
      // For 'pending' filter, we use unpaid_only=true to get all unpaid invoices
      const isPending = statusFilter === 'pending';
      const data = await api.getInvoices({
        page: currentPage,
        status: isPending ? undefined : (statusFilter || undefined),
        unpaid_only: isPending ? true : undefined,
        search: search || undefined,
      });

      if (reset) {
        setInvoices(data.results || []);
        setPage(2);
      } else {
        setInvoices((prev) => [...prev, ...(data.results || [])]);
        setPage((prev) => prev + 1);
      }
      setHasMore(!!data.next);
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setError('Failed to load invoices. Pull down to retry.');
      Alert.alert('Error', 'Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchInvoices(true);
    }, [statusFilter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchInvoices(true);
  };

  const onSearch = () => {
    setLoading(true);
    fetchInvoices(true);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchInvoices();
    }
  };

  const renderInvoice = ({ item }: { item: Invoice }) => {
    const statusColor = getStatusColor(item.status);

    return (
      <Card
        style={styles.invoiceCard}
        onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
      >
        <Card.Content>
          <View style={styles.invoiceHeader}>
            <View>
              <Text variant="titleMedium" style={styles.invoiceNumber}>
                {item.invoice_number}
              </Text>
              <Text variant="bodySmall" style={styles.invoiceType}>
                {item.invoice_type === 'tax' ? 'Tax Invoice' : 'Proforma'}
              </Text>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}
            >
              <Text variant="labelSmall" style={{ color: statusColor.text }}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.invoiceBody}>
            <View style={styles.clientInfo}>
              <Text variant="bodyLarge">{item.client_name}</Text>
              <Text variant="bodySmall" style={styles.date}>
                {formatDate(item.invoice_date)}
              </Text>
            </View>
            <Text variant="titleLarge" style={styles.amount}>
              {formatCurrency(item.total_amount)}
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search invoices..."
          onChangeText={setSearch}
          value={search}
          onSubmitEditing={onSearch}
          style={styles.searchbar}
        />
      </View>

      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statusFilters}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <Chip
              mode={statusFilter === item.key ? 'flat' : 'outlined'}
              selected={statusFilter === item.key}
              onPress={() => setStatusFilter(item.key)}
              style={styles.filterChip}
            >
              {item.label}
            </Chip>
          )}
          contentContainerStyle={styles.filtersContent}
        />
      </View>

      {loading && invoices.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={invoices}
          renderItem={renderInvoice}
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
                No invoices found
              </Text>
            </View>
          }
          ListFooterComponent={
            loading && invoices.length > 0 ? (
              <ActivityIndicator style={styles.footerLoader} />
            ) : null
          }
        />
      )}

      <FAB.Group
        open={fabOpen}
        visible={isFocused}
        icon={fabOpen ? 'close' : 'plus'}
        actions={[
          {
            icon: 'file-document-plus',
            label: 'New Invoice',
            onPress: () => navigation.navigate('InvoiceForm', {}),
          },
          {
            icon: 'calendar-clock',
            label: 'Scheduled Invoices',
            onPress: () => navigation.navigate('ScheduledInvoices'),
          },
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
        fabStyle={styles.fab}
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
    paddingBottom: 8,
    backgroundColor: colors.background.paper,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: colors.gray[100],
    borderRadius: 12,
  },
  filtersContainer: {
    backgroundColor: colors.background.paper,
    paddingBottom: 12,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.default,
  },
  listContent: {
    padding: 16,
  },
  invoiceCard: {
    marginBottom: 12,
    borderRadius: 16,
    elevation: 2,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceNumber: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  invoiceType: {
    color: colors.text.secondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  invoiceBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  clientInfo: {
    flex: 1,
  },
  date: {
    color: colors.text.secondary,
    marginTop: 4,
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
