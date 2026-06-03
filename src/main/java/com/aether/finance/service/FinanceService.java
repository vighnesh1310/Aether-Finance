package com.aether.finance.service;

import com.aether.finance.model.Asset;
import com.aether.finance.model.Budget;
import com.aether.finance.model.Transaction;
import com.aether.finance.model.User;
import com.aether.finance.repository.AssetRepository;
import com.aether.finance.repository.BudgetRepository;
import com.aether.finance.repository.TransactionRepository;
import com.aether.finance.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class FinanceService {

    private final AssetRepository assetRepository;
    private final TransactionRepository transactionRepository;
    private final BudgetRepository budgetRepository;
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public FinanceService(AssetRepository assetRepository,
                          TransactionRepository transactionRepository,
                          BudgetRepository budgetRepository,
                          UserRepository userRepository) {
        this.assetRepository = assetRepository;
        this.transactionRepository = transactionRepository;
        this.budgetRepository = budgetRepository;
        this.userRepository = userRepository;
    }

    // --- Authentication Logic ---
    @Transactional
    public User registerUser(User user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new IllegalArgumentException("Username already exists");
        }
        // Hash password
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        User savedUser = userRepository.save(user);

        // Auto-seed user data for a premium first-time experience
        seedUserData(savedUser);

        return savedUser;
    }

    public Optional<User> loginUser(String username, String password) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (passwordEncoder.matches(password, user.getPassword())) {
                return Optional.of(user);
            }
        }
        return Optional.empty();
    }

    // --- Seeding Logic Per User ---
    @Transactional
    public void seedUserData(User user) {
        // Seed Assets
        saveAsset(new Asset("HDFC Top 100 Mutual Fund", "Stocks", 450000.0, 12.5), user.getId());
        saveAsset(new Asset("Bitcoin (BTC)", "Crypto", 850000.0, 12.0), user.getId());
        saveAsset(new Asset("Gold Sovereign Bonds", "Gold", 320000.0, 6.8), user.getId());
        saveAsset(new Asset("Bangalore Apartment", "Real Estate", 8500000.0, 7.5), user.getId());
        saveAsset(new Asset("SBI Fixed Deposit", "Cash", 1200000.0, 6.5), user.getId());
        saveAsset(new Asset("ICICI Bank Savings Account", "Cash", 250000.0, 3.5), user.getId());

        // Seed Budgets
        saveBudget(new Budget("Rent", 40000.0, 35000.0), user.getId());
        saveBudget(new Budget("Food", 25000.0, 16500.0), user.getId());
        saveBudget(new Budget("Utilities", 12000.0, 8400.0), user.getId());
        saveBudget(new Budget("Entertainment", 15000.0, 9200.0), user.getId());
        saveBudget(new Budget("Investment", 50000.0, 30000.0), user.getId());

        // Seed Transactions
        saveTransaction(new Transaction("Monthly Corporate Salary", 180000.0, "INCOME", "Salary", LocalDate.now().minusDays(15)), user.getId());
        saveTransaction(new Transaction("Freelance Consulting Project", 45000.0, "INCOME", "Salary", LocalDate.now().minusDays(10)), user.getId());
        saveTransaction(new Transaction("Apartment Rent Payment", 35000.0, "EXPENSE", "Rent", LocalDate.now().minusDays(12)), user.getId());
        saveTransaction(new Transaction("BigBasket Grocery Delivery", 11500.0, "EXPENSE", "Food", LocalDate.now().minusDays(8)), user.getId());
        saveTransaction(new Transaction("BESCOM Electricity Bill", 5200.0, "EXPENSE", "Utilities", LocalDate.now().minusDays(7)), user.getId());
        saveTransaction(new Transaction("Cult.fit Annual Gym Membership", 9200.0, "EXPENSE", "Entertainment", LocalDate.now().minusDays(5)), user.getId());
        saveTransaction(new Transaction("Resto-Bar Dinner with Friends", 5000.0, "EXPENSE", "Food", LocalDate.now().minusDays(3)), user.getId());
        saveTransaction(new Transaction("ACT Fibernet Broadband Bill", 3200.0, "EXPENSE", "Utilities", LocalDate.now().minusDays(2)), user.getId());
        saveTransaction(new Transaction("SIP Mutual Fund Investment", 30000.0, "EXPENSE", "Investment", LocalDate.now().minusDays(1)), user.getId());
    }

    // --- Assets Logic ---
    public List<Asset> getAllAssets(Long userId) {
        return assetRepository.findByUserId(userId);
    }

    public Asset saveAsset(Asset asset, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        asset.setUser(user);
        return assetRepository.save(asset);
    }

    public void deleteAsset(Long id, Long userId) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Asset not found"));
        if (!asset.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Unauthorized action");
        }
        assetRepository.deleteById(id);
    }

    // --- Transactions Logic ---
    public List<Transaction> getAllTransactions(Long userId) {
        return transactionRepository.findByUserId(userId);
    }

    @Transactional
    public Transaction saveTransaction(Transaction transaction, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        transaction.setUser(user);
        Transaction saved = transactionRepository.save(transaction);

        // If it's an expense, update corresponding budget's spentAmount
        if ("EXPENSE".equalsIgnoreCase(saved.getType())) {
            Optional<Budget> budgetOpt = budgetRepository.findByUserIdAndCategory(userId, saved.getCategory());
            if (budgetOpt.isPresent()) {
                Budget budget = budgetOpt.get();
                budget.setSpentAmount(budget.getSpentAmount() + saved.getAmount());
                budgetRepository.save(budget);
            }
        }
        return saved;
    }

    // --- Budgets Logic ---
    public List<Budget> getAllBudgets(Long userId) {
        return budgetRepository.findByUserId(userId);
    }

    public Budget saveBudget(Budget budget, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        budget.setUser(user);

        // If a budget already exists for this category, update its limit
        Optional<Budget> existing = budgetRepository.findByUserIdAndCategory(userId, budget.getCategory());
        if (existing.isPresent()) {
            Budget b = existing.get();
            b.setLimitAmount(budget.getLimitAmount());
            return budgetRepository.save(b);
        }
        if (budget.getSpentAmount() == null) {
            budget.setSpentAmount(0.0);
        }
        return budgetRepository.save(budget);
    }

    // --- Summary & Aggregations ---
    public Map<String, Object> getDashboardSummary(Long userId) {
        List<Asset> assets = assetRepository.findByUserId(userId);
        List<Transaction> transactions = transactionRepository.findByUserId(userId);
        List<Budget> budgets = budgetRepository.findByUserId(userId);

        double netWorth = assets.stream().mapToDouble(Asset::getValue).sum();

        double totalIncome = transactions.stream()
                .filter(t -> "INCOME".equalsIgnoreCase(t.getType()))
                .mapToDouble(Transaction::getAmount)
                .sum();

        double totalExpense = transactions.stream()
                .filter(t -> "EXPENSE".equalsIgnoreCase(t.getType()))
                .mapToDouble(Transaction::getAmount)
                .sum();

        double cashFlow = totalIncome - totalExpense;

        // Group assets by category
        Map<String, Double> assetCategoryValues = assets.stream()
                .collect(Collectors.groupingBy(
                        Asset::getCategory,
                        Collectors.summingDouble(Asset::getValue)
                ));

        // Get the 5 most recent transactions
        List<Transaction> recentTransactions = transactions.stream()
                .sorted((t1, t2) -> t2.getDate().compareTo(t1.getDate()))
                .limit(5)
                .collect(Collectors.toList());

        Map<String, Object> summary = new HashMap<>();
        summary.put("netWorth", netWorth);
        summary.put("totalIncome", totalIncome);
        summary.put("totalExpense", totalExpense);
        summary.put("cashFlow", cashFlow);
        summary.put("assetCategoryValues", assetCategoryValues);
        summary.put("recentTransactions", recentTransactions);
        summary.put("budgets", budgets);

        return summary;
    }
}
