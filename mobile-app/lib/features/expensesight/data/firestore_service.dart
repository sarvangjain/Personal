import 'package:cloud_firestore/cloud_firestore.dart';
import 'models/expense.dart';
import 'models/income.dart';
import 'models/investment.dart';
import 'models/goal.dart';
import 'models/bill.dart';
import 'models/budget_settings.dart';

class ExpenseSightService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;
  final Map<String, dynamic> _cache = {};

  CollectionReference _expensesCollection(String userId) =>
      _db.collection('expenseSight').doc(userId).collection('expenses');

  CollectionReference _incomeCollection(String userId) =>
      _db.collection('expenseSight').doc(userId).collection('income');

  CollectionReference _investmentsCollection(String userId) =>
      _db.collection('expenseSight').doc(userId).collection('investments');

  CollectionReference _goalsCollection(String userId) =>
      _db.collection('expenseSight').doc(userId).collection('goals');

  CollectionReference _billsCollection(String userId) =>
      _db.collection('expenseSight').doc(userId).collection('bills');

  DocumentReference _budgetSettingsDoc(String userId) =>
      _db.collection('expenseSight').doc(userId).collection('settings').doc('budget');

  Future<List<Expense>> getExpenses(String userId, {bool useCache = true}) async {
    final cacheKey = 'expenses_$userId';
    if (useCache && _cache.containsKey(cacheKey)) {
      return _cache[cacheKey] as List<Expense>;
    }

    final snapshot = await _expensesCollection(userId).get();
    final expenses =
        snapshot.docs.map((d) => Expense.fromFirestore(d)).toList();
    expenses.sort((a, b) => b.date.compareTo(a.date));

    _cache[cacheKey] = expenses;
    return expenses;
  }

  Future<void> addExpense(String userId, Expense expense) async {
    await _expensesCollection(userId).doc(expense.id).set(expense.toFirestore());
    invalidateCache(userId);
  }

  Future<void> updateExpense(String userId, Expense expense) async {
    await _expensesCollection(userId)
        .doc(expense.id)
        .update(expense.toFirestore());
    invalidateCache(userId);
  }

  Future<void> deleteExpense(String userId, String expenseId) async {
    await _expensesCollection(userId).doc(expenseId).delete();
    invalidateCache(userId);
  }

  Future<List<Income>> getIncome(String userId) async {
    final snapshot = await _incomeCollection(userId).get();
    final income = snapshot.docs.map((d) => Income.fromFirestore(d)).toList();
    income.sort((a, b) => b.date.compareTo(a.date));
    return income;
  }

  Future<void> addIncome(String userId, Income income) async {
    await _incomeCollection(userId).doc(income.id).set(income.toFirestore());
  }

  Future<void> updateIncome(String userId, Income income) async {
    await _incomeCollection(userId).doc(income.id).update(income.toFirestore());
  }

  Future<void> deleteIncome(String userId, String incomeId) async {
    await _incomeCollection(userId).doc(incomeId).delete();
  }

  Future<List<Investment>> getInvestments(String userId) async {
    final snapshot = await _investmentsCollection(userId)
        .where('isActive', isEqualTo: true)
        .get();
    return snapshot.docs.map((d) => Investment.fromFirestore(d)).toList();
  }

  Future<void> addInvestment(String userId, Investment investment) async {
    await _investmentsCollection(userId)
        .doc(investment.id)
        .set(investment.toFirestore());
  }

  Future<void> updateInvestment(String userId, Investment investment) async {
    await _investmentsCollection(userId)
        .doc(investment.id)
        .update(investment.toFirestore());
  }

  Future<void> deleteInvestment(String userId, String investmentId) async {
    await _investmentsCollection(userId)
        .doc(investmentId)
        .update({'isActive': false});
  }

  Future<List<SavingsGoal>> getGoals(String userId) async {
    final snapshot = await _goalsCollection(userId)
        .where('isActive', isEqualTo: true)
        .get();
    return snapshot.docs.map((d) => SavingsGoal.fromFirestore(d)).toList();
  }

  Future<void> addGoal(String userId, SavingsGoal goal) async {
    await _goalsCollection(userId).doc(goal.id).set(goal.toFirestore());
  }

  Future<void> updateGoal(String userId, SavingsGoal goal) async {
    await _goalsCollection(userId).doc(goal.id).update(goal.toFirestore());
  }

  Future<void> deleteGoal(String userId, String goalId) async {
    await _goalsCollection(userId).doc(goalId).update({'isActive': false});
  }

  Future<void> contributeToGoal(
      String userId, String goalId, double amount) async {
    final goalDoc = _goalsCollection(userId).doc(goalId);
    await _db.runTransaction((transaction) async {
      final snapshot = await transaction.get(goalDoc);
      if (!snapshot.exists) return;

      final goal = SavingsGoal.fromFirestore(snapshot);
      final newAmount = goal.currentAmount + amount;
      transaction.update(goalDoc, {'currentAmount': newAmount});

      final contributionRef = goalDoc.collection('contributions').doc();
      transaction.set(contributionRef, {
        'amount': amount,
        'date': DateTime.now().toIso8601String().split('T')[0],
        'createdAt': FieldValue.serverTimestamp(),
      });
    });
  }

  Future<List<Bill>> getBills(String userId) async {
    final snapshot = await _billsCollection(userId)
        .where('isActive', isEqualTo: true)
        .get();
    return snapshot.docs.map((d) => Bill.fromFirestore(d)).toList();
  }

  Future<void> addBill(String userId, Bill bill) async {
    await _billsCollection(userId).doc(bill.id).set(bill.toFirestore());
  }

  Future<void> updateBill(String userId, Bill bill) async {
    await _billsCollection(userId).doc(bill.id).update(bill.toFirestore());
  }

  Future<void> deleteBill(String userId, String billId) async {
    await _billsCollection(userId).doc(billId).update({'isActive': false});
  }

  Future<BudgetSettings?> getBudgetSettings(String userId) async {
    final doc = await _budgetSettingsDoc(userId).get();
    if (!doc.exists) return null;
    return BudgetSettings.fromFirestore(doc.data() as Map<String, dynamic>);
  }

  Future<void> saveBudgetSettings(
      String userId, BudgetSettings settings) async {
    await _budgetSettingsDoc(userId).set(settings.toFirestore());
  }

  void invalidateCache(String userId) {
    _cache.removeWhere((key, _) => key.contains(userId));
  }

  void clearAllCache() {
    _cache.clear();
  }
}
