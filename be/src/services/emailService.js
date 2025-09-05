const { Resend } = require('resend');

class EmailService {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    this.fromName = process.env.RESEND_FROM_NAME || '驾考助手';
    // 允许发送邮件的收件人（未验证域名时的限制）
    this.allowedRecipient = process.env.ALLOWED_EMAIL_RECIPIENT || '1345494638@qq.com';
  }

  /**
   * 检查邮箱是否允许发送
   * @param {string} email - 收件人邮箱
   * @returns {boolean} 是否允许发送
   */
  isEmailAllowed(email) {
    // 如果没有设置限制，则允许所有邮箱
    if (!this.allowedRecipient) {
      return true;
    }

    // 检查是否是允许的收件人
    return email.toLowerCase() === this.allowedRecipient.toLowerCase();
  }

  /**
   * 发送邮件验证码
   * @param {string} email - 收件人邮箱
   * @param {string} code - 验证码
   * @param {string} purpose - 验证码用途 ('register', 'reset-password', 'change-email')
   */
  async sendVerificationCode(email, code, purpose = 'register') {
    // 检查邮箱是否允许发送
    if (!this.isEmailAllowed(email)) {
      throw new Error(`邮件发送受限：当前只能向 ${this.allowedRecipient} 发送邮件`);
    }

    const subjects = {
      'register': '邮箱验证码 - 驾考助手',
      'reset-password': '密码重置验证码 - 驾考助手',
      'change-email': '邮箱变更验证码 - 驾考助手'
    };

    const titles = {
      'register': '欢迎注册驾考助手',
      'reset-password': '密码重置',
      'change-email': '邮箱变更'
    };

    const descriptions = {
      'register': '感谢您注册驾考助手！请使用以下验证码完成邮箱验证：',
      'reset-password': '您正在重置密码，请使用以下验证码：',
      'change-email': '您正在变更邮箱，请使用以下验证码：'
    };

    const html = this.generateVerificationCodeTemplate(
      titles[purpose],
      descriptions[purpose],
      code
    );

    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [email],
        subject: subjects[purpose],
        html: html,
        tags: [
          {
            name: 'category',
            value: 'verification_code'
          },
          {
            name: 'purpose',
            value: purpose
          }
        ]
      });

      if (error) {
        console.error('Resend发送邮件失败:', error);
        throw new Error(`邮件发送失败: ${error.message}`);
      }

      console.log('邮件发送成功:', data);
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('邮件服务错误:', error);
      throw error;
    }
  }

  /**
   * 发送通知邮件
   * @param {string} email - 收件人邮箱
   * @param {string} title - 通知标题
   * @param {string} content - 通知内容
   * @param {string} type - 通知类型
   */
  async sendNotificationEmail(email, title, content, type = 'general') {
    // 检查邮箱是否允许发送
    if (!this.isEmailAllowed(email)) {
      throw new Error(`邮件发送受限：当前只能向 ${this.allowedRecipient} 发送邮件`);
    }

    const html = this.generateNotificationTemplate(title, content);

    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [email],
        subject: `${title} - 驾考助手`,
        html: html,
        tags: [
          {
            name: 'category',
            value: 'notification'
          },
          {
            name: 'type',
            value: type
          }
        ]
      });

      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Resend发送通知邮件失败:', error);
        }
        throw new Error(`通知邮件发送失败: ${error.message}`);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('通知邮件发送成功:', data);
      }
      return { success: true, messageId: data.id };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('通知邮件服务错误:', error);
      }
      throw error;
    }
  }

  /**
   * 生成验证码邮件模板
   */
  generateVerificationCodeTemplate(title, description, code) {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #409EFF;
            margin-bottom: 10px;
        }
        .title {
            font-size: 20px;
            font-weight: 600;
            color: #303133;
            margin-bottom: 20px;
        }
        .description {
            font-size: 16px;
            color: #606266;
            margin-bottom: 30px;
        }
        .code-container {
            background-color: #f8f9fa;
            border: 2px dashed #409EFF;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
        }
        .code {
            font-size: 32px;
            font-weight: bold;
            color: #409EFF;
            letter-spacing: 4px;
            font-family: 'Courier New', monospace;
        }
        .code-note {
            font-size: 14px;
            color: #909399;
            margin-top: 10px;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #EBEEF5;
            font-size: 14px;
            color: #909399;
            text-align: center;
        }
        .warning {
            background-color: #FEF0F0;
            border-left: 4px solid #F56C6C;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .warning-text {
            color: #F56C6C;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🚗 驾考助手</div>
        </div>
        
        <div class="title">${title}</div>
        <div class="description">${description}</div>
        
        <div class="code-container">
            <div class="code">${code}</div>
            <div class="code-note">验证码有效期为10分钟</div>
        </div>
        
        <div class="warning">
            <div class="warning-text">
                ⚠️ 请勿将验证码告诉他人，以保护您的账户安全。
            </div>
        </div>
        
        <div class="footer">
            <p>此邮件由系统自动发送，请勿回复。</p>
            <p>如有疑问，请联系客服。</p>
            <p>&copy; 2024 驾考助手. 保留所有权利。</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * 生成通知邮件模板
   */
  generateNotificationTemplate(title, content) {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #409EFF;
            margin-bottom: 10px;
        }
        .title {
            font-size: 20px;
            font-weight: 600;
            color: #303133;
            margin-bottom: 20px;
        }
        .content {
            font-size: 16px;
            color: #606266;
            margin-bottom: 30px;
            white-space: pre-line;
        }
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #EBEEF5;
            font-size: 14px;
            color: #909399;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🚗 驾考助手</div>
        </div>
        
        <div class="title">${title}</div>
        <div class="content">${content}</div>
        
        <div class="footer">
            <p>此邮件由系统自动发送，请勿回复。</p>
            <p>如有疑问，请联系客服。</p>
            <p>&copy; 2024 驾考助手. 保留所有权利。</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * 测试邮件服务连接
   */
  async testConnection() {
    try {
      // 发送测试邮件到允许的收件人
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [this.allowedRecipient],
        subject: '邮件服务测试 - 驾考助手',
        html: '<p>这是一封测试邮件，如果您收到此邮件，说明邮件服务配置正确。</p>',
        tags: [
          {
            name: 'category',
            value: 'test'
          }
        ]
      });

      if (error) {
        console.error('邮件服务测试失败:', error);
        return { success: false, error: error.message };
      }

      console.log('邮件服务测试成功:', data);
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('邮件服务测试错误:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
