<?php
/**
 * Email Sender using PHPMailer
 * Handles sending emails via SMTP
 */

require_once __DIR__ . '/smtp_config.php';

// Check if PHPMailer is available
$phpmailerAvailable = false;

// Try to load PHPMailer from Composer
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
    $phpmailerAvailable = class_exists('PHPMailer\PHPMailer\PHPMailer');
}

// If PHPMailer is available, use it
if ($phpmailerAvailable) {
    class EmailSender {
        private $config;
        private $mailer;
        
        public function __construct() {
            $this->config = require __DIR__ . '/smtp_config.php';
            $this->mailer = new \PHPMailer\PHPMailer\PHPMailer(true);
            $this->configure();
        }
        
        private function configure() {
            try {
                // Server settings
                $this->mailer->isSMTP();
                $this->mailer->Host = $this->config['smtp_host'];
                $this->mailer->SMTPAuth = true;
                $this->mailer->Username = $this->config['smtp_username'];
                $this->mailer->Password = $this->config['smtp_password'];
                $this->mailer->SMTPSecure = $this->config['smtp_encryption'];
                $this->mailer->Port = $this->config['smtp_port'];
                
                // Enable verbose debug output (disable in production)
                // Set to 2 for debugging, 0 for production
                $this->mailer->SMTPDebug = 0; // 0 = off, 2 = verbose
                $this->mailer->Debugoutput = function($str, $level) {
                    error_log("PHPMailer Debug (Level $level): $str");
                };
                
                // Character encoding
                $this->mailer->CharSet = 'UTF-8';
                
                // From address
                $this->mailer->setFrom($this->config['from_email'], $this->config['from_name']);
                $this->mailer->addReplyTo($this->config['reply_to_email'], $this->config['reply_to_name']);
                
            } catch (\Exception $e) {
                error_log("Email Configuration Error: " . $e->getMessage());
                throw new \Exception("Failed to configure email: " . $e->getMessage());
            }
        }
        
        /**
         * Send password reset email
         * @param string $to Recipient email
         * @param string $resetLink Password reset link
         * @param string $userName User's name (optional)
         * @return bool True if sent successfully
         */
        public function sendPasswordResetEmail($to, $resetLink, $userName = '') {
            try {
                $this->mailer->clearAddresses();
                $this->mailer->addAddress($to);
                
                $subject = 'Password Reset Request - MATARIX';
                $body = $this->getPasswordResetEmailTemplate($resetLink, $userName);
                
                $this->mailer->isHTML(true);
                $this->mailer->Subject = $subject;
                $this->mailer->Body = $body;
                $this->mailer->AltBody = strip_tags($body);
                
                $this->mailer->send();
                return true;
                
            } catch (\Exception $e) {
                error_log("Email Send Error: " . $this->mailer->ErrorInfo);
                error_log("Exception: " . $e->getMessage());
                return false;
            }
        }
        
        /**
         * Get password reset email HTML template
         */
        private function getPasswordResetEmailTemplate($resetLink, $userName = '') {
            $name = $userName ?: 'User';
            
            return "
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='UTF-8'>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #d32f2f; color: white; padding: 20px; text-align: center; }
                    .content { padding: 30px 20px; background-color: #f9f9f9; }
                    .button { display: inline-block; padding: 12px 30px; background-color: #d32f2f; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
                    .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <h1>MATARIX Construction Supply</h1>
                    </div>
                    <div class='content'>
                        <h2>Password Reset Request</h2>
                        <p>Hello {$name},</p>
                        <p>We received a request to reset your password for your MATARIX account.</p>
                        <p>Click the button below to reset your password:</p>
                        <p style='text-align: center;'>
                            <a href='{$resetLink}' class='button'>Reset Password</a>
                        </p>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style='word-break: break-all; color: #0066cc;'>{$resetLink}</p>
                        <div class='warning'>
                            <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
                        </div>
                        <p>If you have any questions, please contact our support team.</p>
                    </div>
                    <div class='footer'>
                        <p>&copy; " . date('Y') . " MATARIX Construction Supply. All rights reserved.</p>
                        <p>This is an automated email, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>";
        }
    }
} else {
    // Fallback to PHP's mail() function if PHPMailer is not available
    class EmailSender {
        private $config;
        
        public function __construct() {
            $this->config = require __DIR__ . '/smtp_config.php';
        }
        
        public function sendPasswordResetEmail($to, $resetLink, $userName = '') {
            $subject = 'Password Reset Request - MATARIX';
            $body = $this->getPasswordResetEmailTemplate($resetLink, $userName);
            
            $headers = "MIME-Version: 1.0" . "\r\n";
            $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
            $headers .= "From: " . $this->config['from_name'] . " <" . $this->config['from_email'] . ">" . "\r\n";
            $headers .= "Reply-To: " . $this->config['reply_to_email'] . "\r\n";
            
            return @mail($to, $subject, $body, $headers);
        }
        
        private function getPasswordResetEmailTemplate($resetLink, $userName = '') {
            $name = $userName ?: 'User';
            
            return "
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='UTF-8'>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #d32f2f; color: white; padding: 20px; text-align: center; }
                    .content { padding: 30px 20px; background-color: #f9f9f9; }
                    .button { display: inline-block; padding: 12px 30px; background-color: #d32f2f; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
                    .warning { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <h1>MATARIX Construction Supply</h1>
                    </div>
                    <div class='content'>
                        <h2>Password Reset Request</h2>
                        <p>Hello {$name},</p>
                        <p>We received a request to reset your password for your MATARIX account.</p>
                        <p>Click the button below to reset your password:</p>
                        <p style='text-align: center;'>
                            <a href='{$resetLink}' class='button'>Reset Password</a>
                        </p>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style='word-break: break-all; color: #0066cc;'>{$resetLink}</p>
                        <div class='warning'>
                            <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
                        </div>
                        <p>If you have any questions, please contact our support team.</p>
                    </div>
                    <div class='footer'>
                        <p>&copy; " . date('Y') . " MATARIX Construction Supply. All rights reserved.</p>
                        <p>This is an automated email, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>";
        }
    }
}
