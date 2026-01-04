# Login System Setup - Complete

## Overview
Both `Customer/Login.html` and `Admin/AdminLogin.html` are now fully connected to the database with complete login functionality.

## What Was Implemented

### 1. Database Connection
- **File**: `connection.php`
- Connects to MySQL/MariaDB database `matarik`
- Uses PDO for secure database operations
- Configurable via environment variables

### 2. Database Helper Functions
- **File**: `includes/db_functions.php`
- `login()` - Authenticates users with password verification
- `insertUser()` - Creates new users with password hashing
- `insert()`, `select()`, `update()` - Generic CRUD operations
- `emailExists()` - Checks if email is already registered

### 3. Login API Endpoint
- **File**: `api/login.php`
- Handles authentication for both Customer and Admin
- Validates email format and credentials
- Creates PHP sessions upon successful login
- Returns JSON responses with user data

### 4. Updated Login Pages
- **Customer/Login.html** - Customer login page
- **Admin/AdminLogin.html** - Admin login page
- Both pages now have:
  - Proper form validation
  - Email and password fields with required attributes
  - Error/success message display
  - AJAX form submission

### 5. JavaScript Integration
- **Customer_assets/js/Login.js** - Handles customer login
- **Admin_assets/js/AdminLogin.js** - Handles admin login
- Both files:
  - Submit forms via AJAX to the API
  - Display error/success messages
  - Redirect users after successful login
  - Store user data in sessionStorage

## How It Works

### Login Flow:
1. User enters email and password
2. JavaScript validates input
3. AJAX request sent to `api/login.php`
4. API validates credentials against database
5. If valid, PHP session is created
6. User is redirected to appropriate page:
   - Customer → `Customer/MainPage.html`
   - Admin → `Admin/OrdersAdmin.html`

### Session Management:
- User ID, email, role, and name stored in PHP session
- Session persists across page requests
- Use `includes/session_helper.php` functions to check login status

## Testing the Login System

### Step 1: Test Database Connection
Run `test_connection.php` in your browser:
```
http://localhost/Matarix/test_connection.php
```

### Step 2: Create Test Users
Run `create_test_user.php` to create test accounts:
```
http://localhost/Matarix/create_test_user.php
```

This will create:
- **Admin**: admin@matarik.com / admin123
- **Customer**: customer@matarik.com / customer123

### Step 3: Test Login
1. Open `Customer/Login.html` in browser
2. Enter customer credentials
3. Should redirect to MainPage.html on success

1. Open `Admin/AdminLogin.html` in browser
2. Enter admin credentials
3. Should redirect to OrdersAdmin.html on success

## Database Requirements

1. **MySQL/MariaDB must be running** (via XAMPP)
2. **Database `matarik` must exist**
3. **Table `users` must exist** (import `matarik.sql` if needed)
4. **Passwords must be hashed** using `password_hash()` (handled automatically by `insertUser()`)

## Security Features

- ✅ Password hashing with `password_hash()`
- ✅ Password verification with `password_verify()`
- ✅ Prepared statements (prevents SQL injection)
- ✅ Email validation
- ✅ Session management
- ✅ Role-based access control
- ✅ Error handling without exposing sensitive info

## Using Database Functions in Your Code

### Example: Insert a new user
```php
require_once 'includes/db_functions.php';
$db = new DatabaseFunctions();

$userId = $db->insertUser([
    'email' => 'user@example.com',
    'password' => 'password123',
    'address' => '123 Main St',
    'first_name' => 'John',
    'last_name' => 'Doe',
    'role' => 'Customer'
]);
```

### Example: Insert into any table
```php
$orderId = $db->insert('orders', [
    'User_ID' => 1,
    'status' => 'Order Confirmed',
    'amount' => 500.00,
    'payment' => 'To Pay'
]);
```

### Example: Select data
```php
$products = $db->select('products', ['stock_status' => 'In Stock'], 'Product_ID DESC', 10);
```

### Example: Update data
```php
$db->update('users', 
    ['First_Name' => 'Jane'], 
    ['User_ID' => 1]
);
```

## Troubleshooting

### Login not working?
1. Check database connection: Run `test_connection.php`
2. Verify users exist in database
3. Check browser console for JavaScript errors
4. Check PHP error logs
5. Ensure passwords are hashed (use `insertUser()` function)

### "Unable to connect to server" error?
- Check if XAMPP MySQL is running
- Verify database credentials in `connection.php`
- Ensure database `matarik` exists

### "Invalid email or password" error?
- Verify user exists in database
- Check if password is correctly hashed
- Ensure email matches exactly (case-sensitive)

## Next Steps

1. ✅ Login system is complete and functional
2. Consider implementing:
   - Registration page integration
   - Password reset functionality
   - Remember me feature
   - Session timeout
   - Logout functionality

## Files Created/Modified

### Created:
- `connection.php`
- `includes/db_functions.php`
- `includes/session_helper.php`
- `api/login.php`
- `api/register.php`
- `api/logout.php`
- `test_connection.php`
- `create_test_user.php`
- `examples/database_usage.php`

### Modified:
- `Customer/Login.html`
- `Admin/AdminLogin.html`
- `Customer_assets/js/Login.js`
- `Admin_assets/js/AdminLogin.js`

