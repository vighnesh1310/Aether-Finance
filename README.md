# Aether Finance

Aether Finance is a premium, modern, full-stack personal wealth tracker, transaction log, and interactive financial dashboard. It features a responsive glassmorphic dark UI, data visualization using Chart.js, and a clean REST API backend built with Spring Boot, Spring Data JPA, and MySQL.

---

## Key Features

- **Dynamic Authentication**: Secured registration and login workflows using **BCrypt password hashing** (provided by `spring-security-crypto`).
- **Data Scoping & Isolation**: Strict user-specific data isolation. All assets, budgets, and transactions are bound directly to individual user profiles.
- **Indian Rupee (INR) Localization**: Number formatting tailored to the Indian grouping system (Lakhs & Crores) and line charts scaling dynamically to Lakhs (`L`) and Crores (`Cr`).
- **Persistence Layer**: Integrates with a local **MySQL database** with automated table migrations and auto-creation of database structures on initial startup.
- **Auto-Seeding**: Registers new accounts with realistic Indian financial portfolios (HDFC Mutual Funds, SBI Fixed Deposits, Bangalore real estate, Cult.fit gym memberships, etc.) for an immediate rich dashboard experience.
- **Modern Glassmorphic UI**: High-fidelity dark cyberpunk design featuring floating background blur orbs, neon borders, responsive grids, and micro-interactions.

---

## Technical Stack

- **Backend**: Java 24, Spring Boot 3.4.5, Spring Data JPA, Spring Web
- **Security**: Spring Security Crypto (BCrypt)
- **Database**: MySQL (compatible with phpMyAdmin/XAMPP defaults)
- **Build Tool**: Maven
- **Frontend**: Single Page Application (HTML5, Vanilla CSS3, Vanilla JS)
- **Visuals**: Chart.js (with custom gradient fills and tooltips)

---

## Project Structure

```text
aether-finance/
├── pom.xml                                   # Maven dependencies
├── README.md                                 # Project documentation
├── .gitignore                                # Git ignore file
└── src/
    └── main/
        ├── java/
        │   └── com/
        │       └── aether/
        │           └── finance/
        │               ├── AetherFinanceApplication.java      # Application startup
        │               ├── controller/
        │               │   ├── AuthController.java            # Registration & login APIs
        │               │   └── FinanceApiController.java      # Scoped dashboard REST APIs
        │               ├── model/
        │               │   ├── User.java                      # User entity
        │               │   ├── Asset.java                     # Scoped wealth assets
        │               │   ├── Transaction.java               # Scoped income/expenses
        │               │   └── Budget.java                    # Scoped budget limits
        │               ├── repository/
        │               │   ├── UserRepository.java
        │               │   ├── AssetRepository.java
        │               │   ├── TransactionRepository.java
        │               │   └── BudgetRepository.java
        │               └── service/
        │                   └── FinanceService.java            # Business logic & seeding
        └── resources/
            ├── application.properties                 # Database connection details
            └── static/
                ├── index.html                         # SPA structure
                ├── css/
                │   └── style.css                      # Design system styling
                └── js/
                    └── app.js                         # API connection & charting
```

---

## Getting Started

### Prerequisites
- **Java 17 or higher** (supports up to Java 24)
- **Maven**
- **MySQL Database Server** (e.g. standalone or through XAMPP / phpMyAdmin)

### Database Configuration
1. Open your MySQL client or phpMyAdmin (`http://localhost/phpmyadmin`).
2. The application will automatically attempt to create the database `aetherdb` if it does not exist.
3. Configure your local username and password inside the [application.properties](src/main/resources/application.properties) file:
   ```properties
   spring.datasource.username=root
   spring.datasource.password=your_mysql_password
   ```

### Execution Steps
1. Navigate to the project root directory.
2. Build and compile the application:
   ```bash
   mvn clean compile
   ```
3. Start the Spring Boot application server:
   ```bash
   mvn spring-boot:run
   ```
4. Access the web interface in your browser:
   **[http://localhost:8080/](http://localhost:8080/)**

---

## Usage Guide
1. **Create Account**: Open the portal and click **Create Account** to register a new user profile.
2. **First-Time Seed**: Upon registration, your profile will be seeded with standard wealth items (such as mutual funds, gold bonds, checkings accounts, and utilities budgets).
3. **Data Scoping**: Log out and register a different user to verify that portfolios, cash flows, and ledgers are completely isolated between users.
