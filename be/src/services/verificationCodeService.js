const crypto = require('crypto');

class VerificationCodeService {
  constructor() {
    // 内存存储验证码（生产环境建议使用Redis）
    this.codes = new Map();
    // 验证码有效期（10分钟）
    this.EXPIRY_TIME = 10 * 60 * 1000;
    // 同一邮箱发送间隔（1分钟）
    this.SEND_INTERVAL = 60 * 1000;
    // 验证码长度
    this.CODE_LENGTH = 6;
  }

  /**
   * 生成验证码
   * @param {number} length - 验证码长度
   * @returns {string} 验证码
   */
  generateCode(length = this.CODE_LENGTH) {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
      code += digits[Math.floor(Math.random() * digits.length)];
    }
    return code;
  }

  /**
   * 生成验证码键
   * @param {string} email - 邮箱
   * @param {string} purpose - 用途
   * @returns {string} 键
   */
  generateKey(email, purpose) {
    return `${email}:${purpose}`;
  }

  /**
   * 存储验证码
   * @param {string} email - 邮箱
   * @param {string} purpose - 用途 ('register', 'reset-password', 'change-email')
   * @param {string} code - 验证码
   */
  storeCode(email, purpose, code) {
    const key = this.generateKey(email, purpose);
    const now = Date.now();
    
    this.codes.set(key, {
      code,
      createdAt: now,
      expiresAt: now + this.EXPIRY_TIME,
      attempts: 0,
      maxAttempts: 5
    });

    // 设置自动清理
    setTimeout(() => {
      this.codes.delete(key);
    }, this.EXPIRY_TIME);
  }

  /**
   * 检查是否可以发送验证码
   * @param {string} email - 邮箱
   * @param {string} purpose - 用途
   * @returns {object} 检查结果
   */
  canSendCode(email, purpose) {
    const key = this.generateKey(email, purpose);
    const existing = this.codes.get(key);

    if (!existing) {
      return { canSend: true };
    }

    const now = Date.now();
    const timeSinceCreated = now - existing.createdAt;

    if (timeSinceCreated < this.SEND_INTERVAL) {
      const remainingTime = Math.ceil((this.SEND_INTERVAL - timeSinceCreated) / 1000);
      return {
        canSend: false,
        reason: 'too_frequent',
        message: `请等待 ${remainingTime} 秒后再试`,
        remainingTime
      };
    }

    return { canSend: true };
  }

  /**
   * 验证验证码
   * @param {string} email - 邮箱
   * @param {string} purpose - 用途
   * @param {string} inputCode - 输入的验证码
   * @returns {object} 验证结果
   */
  verifyCode(email, purpose, inputCode) {
    const key = this.generateKey(email, purpose);
    const stored = this.codes.get(key);

    if (!stored) {
      return {
        valid: false,
        reason: 'not_found',
        message: '验证码不存在或已过期'
      };
    }

    const now = Date.now();

    // 检查是否过期
    if (now > stored.expiresAt) {
      this.codes.delete(key);
      return {
        valid: false,
        reason: 'expired',
        message: '验证码已过期'
      };
    }

    // 检查尝试次数
    if (stored.attempts >= stored.maxAttempts) {
      this.codes.delete(key);
      return {
        valid: false,
        reason: 'max_attempts',
        message: '验证码尝试次数过多，请重新获取'
      };
    }

    // 增加尝试次数
    stored.attempts++;

    // 验证码码
    if (stored.code !== inputCode) {
      return {
        valid: false,
        reason: 'incorrect',
        message: '验证码错误',
        remainingAttempts: stored.maxAttempts - stored.attempts
      };
    }

    // 验证成功，删除验证码
    this.codes.delete(key);
    return {
      valid: true,
      message: '验证码验证成功'
    };
  }

  /**
   * 创建并发送验证码
   * @param {string} email - 邮箱
   * @param {string} purpose - 用途
   * @returns {object} 结果
   */
  async createAndSendCode(email, purpose) {
    // 检查是否可以发送
    const canSend = this.canSendCode(email, purpose);
    if (!canSend.canSend) {
      return {
        success: false,
        ...canSend
      };
    }

    // 生成验证码
    const code = this.generateCode();
    
    // 存储验证码
    this.storeCode(email, purpose, code);

    try {
      // 发送邮件
      const emailService = require('./emailService');
      const result = await emailService.sendVerificationCode(email, code, purpose);
      
      return {
        success: true,
        message: '验证码已发送到您的邮箱',
        messageId: result.messageId
      };
    } catch (error) {
      // 发送失败，删除存储的验证码
      const key = this.generateKey(email, purpose);
      this.codes.delete(key);
      
      throw error;
    }
  }

  /**
   * 获取验证码信息（用于调试）
   * @param {string} email - 邮箱
   * @param {string} purpose - 用途
   * @returns {object|null} 验证码信息
   */
  getCodeInfo(email, purpose) {
    if (process.env.NODE_ENV !== 'development') {
      return null;
    }

    const key = this.generateKey(email, purpose);
    const stored = this.codes.get(key);
    
    if (!stored) {
      return null;
    }

    const now = Date.now();
    return {
      code: stored.code,
      createdAt: new Date(stored.createdAt).toISOString(),
      expiresAt: new Date(stored.expiresAt).toISOString(),
      isExpired: now > stored.expiresAt,
      attempts: stored.attempts,
      maxAttempts: stored.maxAttempts,
      remainingTime: Math.max(0, Math.ceil((stored.expiresAt - now) / 1000))
    };
  }

  /**
   * 清理过期的验证码
   */
  cleanupExpiredCodes() {
    const now = Date.now();
    for (const [key, data] of this.codes.entries()) {
      if (now > data.expiresAt) {
        this.codes.delete(key);
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const now = Date.now();
    let active = 0;
    let expired = 0;

    for (const [key, data] of this.codes.entries()) {
      if (now > data.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.codes.size,
      active,
      expired
    };
  }
}

// 定期清理过期验证码（每5分钟）
const verificationCodeService = new VerificationCodeService();
setInterval(() => {
  verificationCodeService.cleanupExpiredCodes();
}, 5 * 60 * 1000);

module.exports = verificationCodeService;
