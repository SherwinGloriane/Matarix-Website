# SMTP Email Setup Guide

This guide will help you set up SMTP email functionality for the password reset feature.

## Prerequisites

1. PHP 7.4 or higher
2. Composer (for installing PHPMailer) - [Download Composer](https://getcomposer.org/download/)

## Step 1: Install PHPMailer

PHPMailer is required for sending emails via SMTP. Install it using Composer:

```bash
cd C:\xampp\htdocs\MatarixWebs
composer require phpmailer/phpmailer
```

If you don't have Composer installed, you can:
1. Download PHPMailer manually from: https://github.com/PHPMailer/PHPMailer
2. Extract it to `vendor/phpmailer/phpmailer/` directory
3. The system will fall back to PHP's `mail()` function if PHPMailer is not available

## Step 2: Create Database Table

Run the migration script to create the password reset tokens table:

1. Open your browser and navigate to:
   ```
   http://localhost/MatarixWebs/api/create_password_reset_table.php
   ```

2. You should see a success message confirming the table was created.

Alternatively, you can run this SQL directly in phpMyAdmin:

```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## Step 3: Configure SMTP Settings

Edit the file `includes/smtp_config.php` and update the SMTP settings:

### For Gmail:

```php
'smtp_host' => 'smtp.gmail.com',
'smtp_port' => 587,
'smtp_username' => 'mcsproj.2@gmail.com',
'smtp_password' => 'ajaxsvsyllrgrxdg',  // Use App Password, not regular password
'smtp_encryption' => 'tls',
'from_email' => 'mcsproj.2@gmail.com',
'from_name' => 'MATARIX Construction Supply',
```

**Important for Gmail:**
- You need to enable 2-Step Verification
- Generate an App Password: https://myaccount.google.com/apppasswords
- Use the App Password (16 characters) as `smtp_password`

### For Other Email Providers:

**Outlook/Hotmail:**
```php
'smtp_host' => 'smtp-mail.outlook.com',
'smtp_port' => 587,
'smtp_encryption' => 'tls',
```

**Yahoo:**
```php
'smtp_host' => 'smtp.mail.yahoo.com',
'smtp_port' => 587,
'smtp_encryption' => 'tls',
```

**Custom SMTP Server:**
```php
'smtp_host' => 'mail.yourdomain.com',
'smtp_port' => 587,  // or 465 for SSL
'smtp_encryption' => 'tls',  // or 'ssl' for port 465
```

## Step 4: Environment Variables (Optional)

You can also set SMTP credentials using environment variables instead of editing the config file:

1. Create a `.env` file in the project root (optional, for better security)
2. Add:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   SMTP_ENCRYPTION=tls
   FROM_EMAIL=your-email@gmail.com
   FROM_NAME=MATARIX Construction Supply
   ```

## Step 5: Test the Setup

1. Navigate to the Forgot Password page
2. Enter a valid email address
3. Click "Send reset link"
4. Check the email inbox (and spam folder) for the reset link

## Troubleshooting

### Emails not sending?

1. **Check PHP error logs**: Look in `C:\xampp\php\logs\php_error_log`
2. **Enable SMTP Debug**: In `includes/email_sender.php`, change:
   ```php
   $this->mailer->SMTPDebug = 2; // Enable verbose debug output
   ```
3. **Check firewall**: Ensure port 587 (or 465) is not blocked
4. **Verify credentials**: Double-check username and password
5. **Test connection**: Use a tool like [Mail Tester](https://www.mail-tester.com/)

### Common Errors

**"SMTP connect() failed"**
- Check if SMTP host and port are correct
- Verify firewall settings
- Try using SSL on port 465 instead of TLS on 587

**"Authentication failed"**
- For Gmail: Make sure you're using an App Password, not your regular password
- Verify username and password are correct
- Check if 2-Step Verification is enabled (for Gmail)

**"Could not instantiate mail function"**
- PHP's `mail()` function is not configured
- Install PHPMailer to use SMTP instead

## Security Notes

1. **Never commit credentials to version control**
2. **Use App Passwords** for Gmail instead of your main password
3. **Keep SMTP credentials secure** - consider using environment variables
4. **Reset tokens expire after 1 hour** for security
5. **Tokens are single-use** - once used, they cannot be reused

## Support

If you encounter issues:
1. Check the PHP error logs
2. Enable SMTP debug mode
3. Verify your SMTP settings with your email provider
4. Test with a simple email script first

