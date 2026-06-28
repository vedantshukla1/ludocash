import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, StatusBar, Alert, ActivityIndicator, RefreshControl,
 } from 'react-native';
import CustomAlert from '../components/CustomAlert';
import LinearGradient from 'react-native-linear-gradient';
import { walletAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { COLORS, GRADIENTS, SPACING, RADIUS, SHADOWS } from '../utils/theme';

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];
const TXN_TYPES = ['all', 'deposit', 'winning', 'entry_fee', 'withdraw', 'bonus'];

const TYPE_CONFIG = {
  deposit: { label: 'Deposit', color: COLORS.green, icon: '💳' },
  winning: { label: 'Win', color: COLORS.gold, icon: '🏆' },
  entry_fee: { label: 'Entry', color: COLORS.error, icon: '🎮' },
  withdraw: { label: 'Withdraw', color: COLORS.blue, icon: '💸' },
  bonus: { label: 'Bonus', color: '#FF69B4', icon: '🎁' },
  tds: { label: 'TDS', color: COLORS.warning, icon: '📋' },
  refund: { label: 'Refund', color: COLORS.green, icon: '↩️' },
  adjustment: { label: 'Adjust', color: COLORS.textMuted, icon: '⚙️' },
};

const WalletScreen = () => {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState('add'); // add | withdraw
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [txnPage, setTxnPage] = useState(1);
  const [txnTotal, setTxnTotal] = useState(0);
  const [txnType, setTxnType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [txnLoading, setTxnLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadTransactions(1, txnType); }, [txnType]);

  const loadTransactions = useCallback(async (page = 1, type = txnType) => {
    setTxnLoading(true);
    try {
      const params = { page, limit: 20 };
      if (type !== 'all') params.type = type;
      const { data } = await walletAPI.getTransactions(params);
      if (page === 1) setTransactions(data.transactions);
      else setTransactions((prev) => [...prev, ...data.transactions]);
      setTxnTotal(data.pagination.total);
      setTxnPage(page);
    } catch (_) {
    } finally {
      setTxnLoading(false);
    }
  }, [txnType]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshUser(), loadTransactions(1)]);
    setRefreshing(false);
  };

  const handleDeposit = async (depositAmount) => {
    const amt = parseFloat(depositAmount || amount);
    if (!amt || amt < 10) return CustomAlert.alert('Invalid Amount', 'Minimum deposit is ₹10.');
    if (amt > 100000) return CustomAlert.alert('Invalid Amount', 'Maximum deposit is ₹1,00,000.');

    setLoading(true);
    try {
      const { data } = await walletAPI.createOrder(amt);

      // Open Razorpay checkout
      const RazorpayCheckout = require('react-native-razorpay').default;
      const options = {
        description: 'LudoCash Wallet Deposit',
        image: 'https://your-cdn.com/logo.png',
        currency: 'INR',
        key: data.key,
        amount: data.amount,
        order_id: data.orderId,
        name: 'LudoCash',
        prefill: {
          email: user?.email || '',
          contact: user?.phone || '',
          name: user?.name || '',
        },
        theme: { color: '#FFD700' },
      };

      RazorpayCheckout.open(options)
        .then(async (paymentData) => {
          const verifyData = {
            razorpay_order_id: data.orderId,
            razorpay_payment_id: paymentData.razorpay_payment_id,
            razorpay_signature: paymentData.razorpay_signature,
          };
          const { data: verifyResult } = await walletAPI.verifyPayment(verifyData);
          await refreshUser();
          setAmount('');
          loadTransactions(1);
          CustomAlert.alert(
            '💰 Deposit Successful!',
            `₹${amt} added to wallet!${verifyResult.bonus > 0 ? `\n+ ₹${verifyResult.bonus} bonus!` : ''}`,
          );
        })
        .catch((err) => {
          if (err.code !== 2) { // 2 = user cancelled
            CustomAlert.alert('Payment Failed', err.description || 'Payment could not be processed.');
          }
        });
    } catch (err) {
      CustomAlert.alert('Error', err.response?.data?.error || 'Failed to initiate payment.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 100) return CustomAlert.alert('Invalid Amount', 'Minimum withdrawal is ₹100.');
    if (!upiId || !upiId.includes('@')) return CustomAlert.alert('Invalid UPI', 'Enter a valid UPI ID (e.g. name@upi).');

    const withdrawable = user?.wallet?.withdrawable || 0;
    if (amt > withdrawable) {
      return CustomAlert.alert('Insufficient Balance', `Available withdrawable balance: ₹${withdrawable.toFixed(0)}`);
    }

    CustomAlert.alert(
      'Confirm Withdrawal',
      `Withdraw ₹${amt} to ${upiId}?\nProcessing within 24 hours.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setLoading(true);
            try {
              await walletAPI.withdraw({ amount: amt, upiId });
              await refreshUser();
              setAmount('');
              setUpiId('');
              loadTransactions(1);
              CustomAlert.alert('✅ Withdrawal Requested', 'Your withdrawal will be processed within 24 hours.');
            } catch (err) {
              CustomAlert.alert('Error', err.response?.data?.error || 'Withdrawal failed.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const wallet = user?.wallet || { balance: 0, withdrawable: 0, bonus: 0 };

  return (
    <LinearGradient colors={GRADIENTS.background} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.gold} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>💰 Wallet</Text>
        </View>

        {/* Balance cards */}
        <View style={styles.balanceGrid}>
          <View style={[styles.balanceCard, styles.balanceCardMain]}>
            <Text style={styles.balanceCardLabel}>Total Balance</Text>
            <Text style={styles.balanceCardAmount}>₹{wallet.balance.toFixed(0)}</Text>
          </View>
          <View style={styles.balanceRow}>
            <View style={[styles.balanceCard, styles.balanceCardSub]}>
              <Text style={styles.balanceCardSubLabel}>Withdrawable</Text>
              <Text style={styles.balanceCardSubAmount}>₹{wallet.withdrawable.toFixed(0)}</Text>
            </View>
            <View style={[styles.balanceCard, styles.balanceCardSub]}>
              <Text style={styles.balanceCardSubLabel}>Bonus Cash</Text>
              <Text style={[styles.balanceCardSubAmount, { color: '#FF69B4' }]}>₹{wallet.bonus.toFixed(0)}</Text>
            </View>
          </View>
        </View>

        {/* Tab switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'add' && styles.tabBtnActive]}
            onPress={() => { setTab('add'); setAmount(''); }}
          >
            <Text style={[styles.tabBtnText, tab === 'add' && styles.tabBtnTextActive]}>Add Money</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'withdraw' && styles.tabBtnActive]}
            onPress={() => { setTab('withdraw'); setAmount(''); }}
          >
            <Text style={[styles.tabBtnText, tab === 'withdraw' && styles.tabBtnTextActive]}>Withdraw</Text>
          </TouchableOpacity>
        </View>

        {/* Add Money */}
        {tab === 'add' && (
          <View style={styles.section}>
            <View style={styles.quickAmountsGrid}>
              {QUICK_AMOUNTS.map((qa) => (
                <TouchableOpacity
                  key={qa}
                  style={styles.quickChipGrid}
                  onPress={() => handleDeposit(qa)}
                  disabled={loading}
                >
                  <Text style={styles.quickChipTextGrid}>₹{qa}</Text>
                  {qa >= 500 ? (
                    <Text style={styles.quickChipBonusGrid}>+₹50 Bonus</Text>
                  ) : (
                    <Text style={styles.quickChipSubGrid}>Select</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel} style={{ marginTop: SPACING.md }}>Custom Amount</Text>
            <View style={styles.amountRow}>
              <TextInput
                style={styles.amountInput}
                placeholder="Enter amount"
                placeholderTextColor={COLORS.textMuted}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => handleDeposit()}
                disabled={loading || !amount}
              >
                {loading
                  ? <ActivityIndicator color={COLORS.background} size="small" />
                  : <Text style={styles.addBtnText}>Add</Text>}
              </TouchableOpacity>
            </View>
            <Text style={styles.bonusHint}>💡 Add above ₹500 and get ₹50 bonus cash!</Text>
          </View>
        )}

        {/* Withdraw */}
        {tab === 'withdraw' && (
          <View style={styles.section}>
            <View style={styles.withdrawInfo}>
              <Text style={styles.withdrawInfoText}>
                Withdrawable Balance: <Text style={styles.withdrawInfoAmount}>₹{wallet.withdrawable.toFixed(0)}</Text>
              </Text>
              <Text style={styles.withdrawHint}>Minimum ₹100 • Processed within 24 hours</Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="UPI ID (e.g. name@paytm)"
              placeholderTextColor={COLORS.textMuted}
              value={upiId}
              onChangeText={setUpiId}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Amount to withdraw"
              placeholderTextColor={COLORS.textMuted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.withdrawBtn}
              onPress={handleWithdraw}
              disabled={loading}
            >
              <LinearGradient colors={GRADIENTS.goldButton} style={styles.withdrawBtnGrad}>
                {loading
                  ? <ActivityIndicator color={COLORS.white} />
                  : <Text style={styles.withdrawBtnText}>💸 Request Withdrawal</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Transaction history */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>

          {/* Type filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.txnFilter}>
            {TXN_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.filterChip, txnType === t && styles.filterChipActive]}
                onPress={() => setTxnType(t)}
              >
                <Text style={[styles.filterChipText, txnType === t && styles.filterChipTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {txnLoading && transactions.length === 0 ? (
            <ActivityIndicator color={COLORS.gold} style={{ marginTop: SPACING.lg }} />
          ) : transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No transactions yet</Text>
            </View>
          ) : (
            transactions.map((txn) => {
              const cfg = TYPE_CONFIG[txn.type] || { label: txn.type, color: COLORS.white, icon: '💰' };
              const isCredit = ['deposit', 'winning', 'bonus', 'refund', 'adjustment'].includes(txn.type) && txn.amount > 0;
              return (
                <View key={txn._id} style={styles.txnRow}>
                  <View style={styles.txnIcon}>
                    <Text style={styles.txnIconText}>{cfg.icon}</Text>
                  </View>
                  <View style={styles.txnInfo}>
                    <Text style={styles.txnType}>{cfg.label}</Text>
                    <Text style={styles.txnDate}>
                      {new Date(txn.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </Text>
                    <View style={[styles.txnStatusBadge, { backgroundColor: txn.status === 'completed' ? 'rgba(68,221,136,0.2)' : 'rgba(255,215,0,0.2)' }]}>
                      <Text style={[styles.txnStatusText, { color: txn.status === 'completed' ? COLORS.green : COLORS.gold }]}>
                        {txn.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.txnAmount, { color: isCredit ? COLORS.green : COLORS.error }]}>
                    {isCredit ? '+' : '-'}₹{Math.abs(txn.amount).toFixed(0)}
                  </Text>
                </View>
              );
            })
          )}

          {transactions.length < txnTotal && (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={() => loadTransactions(txnPage + 1)}
              disabled={txnLoading}
            >
              <Text style={styles.loadMoreText}>
                {txnLoading ? 'Loading...' : 'Load More'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: SPACING.md, paddingTop: SPACING.lg + 4 },
  headerTitle: { color: COLORS.gold, fontSize: 16, fontWeight: '900' },
  balanceGrid: { padding: SPACING.md, gap: SPACING.sm },
  balanceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.medium,
  },
  balanceCardMain: { alignItems: 'center', paddingVertical: SPACING.lg },
  balanceCardLabel: { color: COLORS.textSecondary, fontSize: 10, marginBottom: 6 },
  balanceCardAmount: { color: COLORS.gold, fontSize: 28, fontWeight: '900' },
  balanceRow: { flexDirection: 'row', gap: SPACING.sm },
  balanceCardSub: { flex: 1 },
  balanceCardSubLabel: { color: COLORS.textMuted, fontSize: 9, marginBottom: 4 },
  balanceCardSubAmount: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
    ...SHADOWS.medium,
  },
  tabBtn: { flex: 1, padding: SPACING.md, alignItems: 'center' },
  tabBtnActive: { backgroundColor: COLORS.gold },
  tabBtnText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 11 },
  tabBtnTextActive: { color: '#0B1B3D' },
  section: { padding: SPACING.md },
  sectionLabel: { color: COLORS.textSecondary, fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: SPACING.sm, textTransform: 'uppercase' },
  sectionTitle: { color: COLORS.white, fontSize: 12, fontWeight: '800', marginBottom: SPACING.md },
  quickAmountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  quickChipGrid: {
    width: '31%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 85,
    ...SHADOWS.card,
    marginBottom: 4,
  },
  quickChipTextGrid: {
    color: COLORS.white,
    fontWeight: '900',
    fontSize: 16,
  },
  quickChipSubGrid: {
    color: COLORS.textSecondary,
    fontSize: 9,
    marginTop: 4,
    fontWeight: '600',
  },
  quickChipBonusGrid: {
    color: COLORS.gold,
    fontSize: 8,
    fontWeight: '800',
    marginTop: 4,
  },
  amountRow: { flexDirection: 'row', gap: SPACING.sm },
  amountInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.white,
    fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  addBtn: {
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { color: '#0B1B3D', fontWeight: '900', fontSize: 12 },
  bonusHint: { color: COLORS.textMuted, fontSize: 9, marginTop: SPACING.sm },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    color: COLORS.white,
    fontSize: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: SPACING.sm,
  },
  withdrawInfo: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  withdrawInfoText: { color: COLORS.white, fontSize: 11 },
  withdrawInfoAmount: { color: COLORS.gold, fontWeight: '800' },
  withdrawHint: { color: COLORS.textMuted, fontSize: 9, marginTop: 4 },
  withdrawBtn: { borderRadius: RADIUS.md, overflow: 'hidden', marginTop: SPACING.sm },
  withdrawBtnGrad: { padding: SPACING.md, alignItems: 'center' },
  withdrawBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 12 },
  txnFilter: { marginBottom: SPACING.md },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    marginRight: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  filterChipActive: { borderColor: COLORS.gold, backgroundColor: 'rgba(255, 215, 0, 0.12)' },
  filterChipText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600' },
  filterChipTextActive: { color: COLORS.gold, fontWeight: '700' },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: SPACING.sm,
  },
  txnIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnIconText: { fontSize: 14 },
  txnInfo: { flex: 1 },
  txnType: { color: COLORS.white, fontWeight: '700', fontSize: 10 },
  txnDate: { color: COLORS.textMuted, fontSize: 9, marginTop: 2 },
  txnStatusBadge: { alignSelf: 'flex-start', borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 2, marginTop: 3 },
  txnStatusText: { fontSize: 8, fontWeight: '700' },
  txnAmount: { fontSize: 12, fontWeight: '900' },
  loadMoreBtn: { padding: SPACING.md, alignItems: 'center' },
  loadMoreText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '600' },
  emptyState: { paddingVertical: SPACING.xl, alignItems: 'center' },
  emptyStateText: { color: COLORS.textMuted, fontSize: 11 },
});

export default WalletScreen;
