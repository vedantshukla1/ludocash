import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { leaderboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { COLORS, GRADIENTS, SPACING, RADIUS } from '../utils/theme';

const MEDALS = ['🥇', '🥈', '🥉'];

const LeaderboardScreen = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('alltime');
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { load(); }, [period]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await leaderboardAPI.get({ period, limit: 50 });
      setLeaderboard(data.leaderboard);
      setCurrentUserRank(data.currentUserRank);
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => {
    const isMe = item.userId?.toString() === user?._id?.toString();
    const medalOrRank = item.rank <= 3 ? MEDALS[item.rank - 1] : `#${item.rank}`;

    return (
      <View style={[styles.row, isMe && styles.rowHighlight]}>
        <View style={styles.rankCol}>
          <Text style={[styles.rank, item.rank <= 3 && styles.rankMedal]}>{medalOrRank}</Text>
        </View>
        <View style={styles.avatarSmall}>
          <Text style={styles.avatarSmallText}>
            {item.name?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <View style={styles.nameCol}>
          <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
            {item.name}{isMe ? ' (You)' : ''}
          </Text>
          <Text style={styles.winRate}>{item.winRate}% win rate</Text>
        </View>
        <View style={styles.statsCol}>
          <Text style={styles.wins}>{item.wins} wins</Text>
          <Text style={styles.earnings}>₹{item.totalEarnings?.toFixed(0)}</Text>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Leaderboard</Text>

        {/* Period toggle */}
        <View style={styles.periodToggle}>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'alltime' && styles.periodBtnActive]}
            onPress={() => setPeriod('alltime')}
          >
            <Text style={[styles.periodBtnText, period === 'alltime' && styles.periodBtnTextActive]}>
              All Time
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodBtn, period === 'weekly' && styles.periodBtnActive]}
            onPress={() => setPeriod('weekly')}
          >
            <Text style={[styles.periodBtnText, period === 'weekly' && styles.periodBtnTextActive]}>
              Weekly
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Your rank chip */}
      {currentUserRank && (
        <View style={styles.myRankChip}>
          <Text style={styles.myRankText}>Your Rank: </Text>
          <Text style={styles.myRankValue}>#{currentUserRank}</Text>
        </View>
      )}

      {/* Column headers */}
      <View style={styles.columnHeaders}>
        <Text style={[styles.colHeader, { width: 44 }]}>Rank</Text>
        <Text style={[styles.colHeader, { flex: 1 }]}>Player</Text>
        <Text style={[styles.colHeader, { width: 80, textAlign: 'right' }]}>Wins / Earned</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.gold} style={{ marginTop: SPACING.xl }} size="large" />
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.userId.toString()}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.gold} />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No players yet. Be the first!</Text>
            </View>
          }
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    paddingTop: SPACING.lg + 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.25)',
  },
  headerTitle: { color: COLORS.gold, fontSize: 16, fontWeight: '900' },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  periodBtn: { paddingHorizontal: SPACING.md, paddingVertical: 7 },
  periodBtnActive: { backgroundColor: COLORS.gold },
  periodBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 10 },
  periodBtnTextActive: { color: '#0B1B3D' },
  myRankChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(255, 215, 0, 0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.25)',
  },
  myRankText: { color: COLORS.textSecondary, fontSize: 10 },
  myRankValue: { color: COLORS.gold, fontWeight: '900', fontSize: 11 },
  columnHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  colHeader: { color: COLORS.textMuted, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  list: { paddingHorizontal: SPACING.sm, paddingBottom: SPACING.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    gap: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: 2,
  },
  rowHighlight: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.45)',
  },
  rankCol: { width: 40, alignItems: 'center' },
  rank: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 10 },
  rankMedal: { fontSize: 16 },
  avatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.45)',
  },
  avatarSmallText: { color: COLORS.gold, fontWeight: '900', fontSize: 11 },
  nameCol: { flex: 1 },
  name: { color: COLORS.white, fontWeight: '700', fontSize: 11 },
  nameMe: { color: COLORS.gold },
  winRate: { color: COLORS.textMuted, fontSize: 9, marginTop: 1 },
  statsCol: { alignItems: 'flex-end', width: 80 },
  wins: { color: COLORS.white, fontWeight: '800', fontSize: 10 },
  earnings: { color: COLORS.gold, fontWeight: '700', fontSize: 9, marginTop: 1 },
  empty: { paddingVertical: SPACING.xxl, alignItems: 'center' },
  emptyText: { color: COLORS.textMuted, fontSize: 11 },
});

export default LeaderboardScreen;
