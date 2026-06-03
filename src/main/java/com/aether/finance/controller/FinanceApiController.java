package com.aether.finance.controller;

import com.aether.finance.model.Asset;
import com.aether.finance.model.Budget;
import com.aether.finance.model.Transaction;
import com.aether.finance.service.FinanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class FinanceApiController {

    private final FinanceService financeService;

    public FinanceApiController(FinanceService financeService) {
        this.financeService = financeService;
    }

    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(financeService.getDashboardSummary(userId));
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<Transaction>> getTransactions(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(financeService.getAllTransactions(userId));
    }

    @PostMapping("/transactions")
    public ResponseEntity<Transaction> addTransaction(@RequestHeader("X-User-Id") Long userId,
                                                      @RequestBody Transaction transaction) {
        if (transaction.getDate() == null) {
            transaction.setDate(java.time.LocalDate.now());
        }
        return ResponseEntity.ok(financeService.saveTransaction(transaction, userId));
    }

    @GetMapping("/assets")
    public ResponseEntity<List<Asset>> getAssets(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(financeService.getAllAssets(userId));
    }

    @PostMapping("/assets")
    public ResponseEntity<Asset> addAsset(@RequestHeader("X-User-Id") Long userId,
                                          @RequestBody Asset asset) {
        return ResponseEntity.ok(financeService.saveAsset(asset, userId));
    }

    @DeleteMapping("/assets/{id}")
    public ResponseEntity<Void> deleteAsset(@RequestHeader("X-User-Id") Long userId,
                                            @PathVariable Long id) {
        financeService.deleteAsset(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/budgets")
    public ResponseEntity<List<Budget>> getBudgets(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(financeService.getAllBudgets(userId));
    }

    @PostMapping("/budgets")
    public ResponseEntity<Budget> addOrUpdateBudget(@RequestHeader("X-User-Id") Long userId,
                                                    @RequestBody Budget budget) {
        return ResponseEntity.ok(financeService.saveBudget(budget, userId));
    }
}
