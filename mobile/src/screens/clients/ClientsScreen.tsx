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
  FAB,
  Searchbar,
  ActivityIndicator,
  IconButton,
  Menu,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../services/api';
import { Client, RootStackParamList } from '../../types';
import colors from '../../theme/colors';

type ClientsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export default function ClientsScreen({ navigation }: ClientsScreenProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [menuVisible, setMenuVisible] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = async (reset = false) => {
    try {
      setError(null);
      const currentPage = reset ? 1 : page;
      const data = await api.getClients({
        page: currentPage,
        search: search || undefined,
      });

      console.log('Clients API response:', JSON.stringify(data, null, 2));

      if (reset) {
        setClients(data.results || []);
        setPage(2);
      } else {
        setClients((prev) => [...prev, ...(data.results || [])]);
        setPage((prev) => prev + 1);
      }
      setHasMore(!!data.next);
    } catch (err) {
      console.error('Failed to load clients:', err);
      setError('Failed to load clients. Pull down to retry.');
      Alert.alert('Error', 'Failed to load clients. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchClients(true);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchClients(true);
  };

  const onSearch = () => {
    setLoading(true);
    fetchClients(true);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchClients();
    }
  };

  const handleDelete = (clientId: number) => {
    Alert.alert(
      'Delete Client',
      'Are you sure you want to delete this client?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteClient(clientId);
              fetchClients(true);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete client');
            }
          },
        },
      ]
    );
  };

  const renderClient = ({ item }: { item: Client }) => (
    <Card
      style={styles.clientCard}
      onPress={() => navigation.navigate('ClientForm', { clientId: item.id })}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.clientInfo}>
          <Text variant="titleMedium" style={styles.clientName}>
            {item.name}
          </Text>
          {item.email && (
            <Text variant="bodyMedium" style={styles.clientDetail}>
              {item.email}
            </Text>
          )}
          {item.phone && (
            <Text variant="bodyMedium" style={styles.clientDetail}>
              {item.phone}
            </Text>
          )}
          {item.gstin && (
            <Text variant="bodySmall" style={styles.gstin}>
              GSTIN: {item.gstin}
            </Text>
          )}
          {item.city && item.state && (
            <Text variant="bodySmall" style={styles.location}>
              {item.city}, {item.state}
            </Text>
          )}
        </View>
        <Menu
          visible={menuVisible === item.id}
          onDismiss={() => setMenuVisible(null)}
          anchor={
            <IconButton
              icon="dots-vertical"
              onPress={(e) => {
                e.stopPropagation?.();
                setMenuVisible(item.id);
              }}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(null);
              navigation.navigate('ClientForm', { clientId: item.id });
            }}
            title="Edit"
            leadingIcon="pencil"
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(null);
              handleDelete(item.id);
            }}
            title="Delete"
            leadingIcon="delete"
          />
        </Menu>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search clients..."
          onChangeText={setSearch}
          value={search}
          onSubmitEditing={onSearch}
          style={styles.searchbar}
        />
      </View>

      {loading && clients.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={clients}
          renderItem={renderClient}
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
                No clients found
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                Add your first client to get started
              </Text>
            </View>
          }
          ListFooterComponent={
            loading && clients.length > 0 ? (
              <ActivityIndicator style={styles.footerLoader} />
            ) : null
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('ClientForm', {})}
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
  clientCard: {
    marginBottom: 12,
    borderRadius: 16,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: colors.text.primary,
  },
  clientDetail: {
    color: colors.text.secondary,
  },
  gstin: {
    color: colors.primary[500],
    marginTop: 4,
  },
  location: {
    color: colors.text.muted,
    marginTop: 2,
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
