import React, { useState, useCallback } from 'react';
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
  Searchbar,
  ActivityIndicator,
  FAB,
} from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../services/api';
import { Receipt, RootStackParamList } from '../../types';
import colors from '../../theme/colors';
import { formatCurrency, formatDate, getPaymentMethodColor } from '../../utils/formatters';

type ReceiptsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ReceiptsScreen() {
  const navigation = useNavigation<ReceiptsScreenNavigationProp>();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipts = async (reset = false) => {
    try {
      setError(null);
      const currentPage = reset ? 1 : page;
      const data = await api.getReceipts({
        page: currentPage,
        search: search || undefined,
      });

      console.log('Receipts API response:', JSON.stringify(data, null, 2));

      if (reset) {
        setReceipts(data.results || []);
        setPage(2);
      } else {
        setReceipts((prev) => [...prev, ...(data.results || [])]);
        setPage((prev) => prev + 1);
      }
      setHasMore(!!data.next);
    } catch (err) {
      console.error('Failed to load receipts:', err);
      setError('Failed to load receipts. Pull down to retry.');
      Alert.alert('Error', 'Failed to load receipts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchReceipts(true);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchReceipts(true);
  };

  const onSearch = () => {
    setLoading(true);
    fetchReceipts(true);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchReceipts();
    }
  };

  const renderReceipt = ({ item }: { item: Receipt }) => {
    const methodColor = getPaymentMethodColor(item.payment_method);

    return (
      <Card
        style={styles.receiptCard}
        onPress={() => navigation.navigate('ReceiptDetail', { receiptId: item.id })}
      >
        <Card.Content>
          <View style={styles.receiptHeader}>
            <View>
              <Text variant="titleMedium" style={styles.receiptNumber}>
                {item.receipt_number}
              </Text>
              <Text variant="bodySmall" style={styles.invoiceRef}>
                Invoice: {item.invoice_number}
              </Text>
            </View>
            <View
              style={[styles.methodBadge, { backgroundColor: methodColor.bg }]}
            >
              <Text variant="labelSmall" style={{ color: methodColor.text }}>
                {item.payment_method?.toUpperCase() || 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.receiptBody}>
            <View style={styles.clientInfo}>
              <Text variant="bodyLarge">{item.client_name}</Text>
              <Text variant="bodySmall" style={styles.date}>
                {formatDate(item.receipt_date)}
              </Text>
            </View>
            <Text variant="titleLarge" style={styles.amount}>
              {formatCurrency(item.total_amount)}
            </Text>
          </View>

          {item.notes && (
            <Text variant="bodySmall" style={styles.notes}>
              {item.notes}
            </Text>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search receipts..."
          onChangeText={setSearch}
          value={search}
          onSubmitEditing={onSearch}
          style={styles.searchbar}
        />
      </View>

      {loading && receipts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={receipts}
          renderItem={renderReceipt}
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
                No receipts found
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                Receipts are generated when payments are recorded
              </Text>
            </View>
          }
          ListFooterComponent={
            loading && receipts.length > 0 ? (
              <ActivityIndicator style={styles.footerLoader} />
            ) : null
          }
        />
      )}

      <FAB
        icon="plus"
        label="Record Payment"
        style={styles.fab}
        onPress={() => navigation.navigate('RecordPayment', {})}
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
  },
  receiptCard: {
    marginBottom: 12,
    borderRadius: 16,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  receiptNumber: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  invoiceRef: {
    color: colors.text.secondary,
    marginTop: 2,
  },
  methodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  receiptBody: {
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
    color: colors.success.main,
  },
  notes: {
    color: colors.text.secondary,
    marginTop: 8,
    fontStyle: 'italic',
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
