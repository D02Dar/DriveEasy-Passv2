const fs = require('fs');
const path = require('path');

class FontOptimizer {
  constructor() {
    this.textCache = new Set(); // 缓存所有需要的字符
  }

  // 分析文本，提取所有需要的字符
  analyzeText(text) {
    if (!text || typeof text !== 'string') return;

    // 将文本中的每个字符添加到缓存中
    for (const char of text) {
      this.textCache.add(char);
    }
  }

  // 分析报告数据，提取所有可能用到的字符
  analyzeReportData(reportData) {
    // 清空缓存
    this.textCache.clear();

    // 分析报告中的所有文本字段 - 使用正确的数据库字段名
    const textFields = [
      reportData.id,
      reportData.status,
      reportData.accident_location,
      reportData.location, // 兼容旧字段名
      reportData.description,
      reportData.weather,
      reportData.roadCondition,
      reportData.trafficCondition,
      // Party A 字段
      reportData.partyAName,
      reportData.party_a_name,
      reportData.partyAPhone,
      reportData.party_a_phone,
      reportData.partyAIdCard,
      reportData.party_a_id_card,
      reportData.partyALicenseNumber,
      reportData.party_a_license_number,
      reportData.partyAVehicleNumber,
      reportData.party_a_vehicle_number,
      reportData.partyAInsuranceCompany,
      reportData.party_a_insurance_company,
      reportData.partyAPolicyNumber,
      reportData.party_a_policy_number,
      // Party B 字段
      reportData.partyBName,
      reportData.party_b_name,
      reportData.partyBPhone,
      reportData.party_b_phone,
      reportData.partyBIdCard,
      reportData.party_b_id_card,
      reportData.partyBLicenseNumber,
      reportData.party_b_license_number,
      reportData.partyBVehicleNumber,
      reportData.party_b_vehicle_number,
      reportData.partyBInsuranceCompany,
      reportData.party_b_insurance_company,
      reportData.partyBPolicyNumber,
      reportData.party_b_policy_number,
      // 其他字段
      reportData.responsibility,
      reportData.policeReport,
      reportData.witnessName,
      reportData.witnessPhone,
      reportData.notes,
      reportData.detailed_address,
      reportData.nearby_landmarks
    ];

    // 添加静态文本（标签等）
    const staticTexts = [
      'ACCIDENT REPORT',
      'รายงานอุบัติเหตุ',
      'BASIC INFORMATION',
      'ข้อมูลพื้นฐาน',
      'DRIVER INFORMATION',
      'ข้อมูลผู้ขับขี่',
      'VEHICLE INFORMATION',
      'ข้อมูลยานพาหนะ',
      'OTHER PARTY INFORMATION',
      'ข้อมูลคู่กรณี',
      'ACCIDENT DETAILS',
      'รายละเอียดอุบัติเหตุ',
      'ADDITIONAL INFORMATION',
      'ข้อมูลเพิ่มเติม',
      'PHOTOS',
      'รูปภาพ',
      'Report ID',
      'รหัสรายงาน',
      'Accident Time',
      'เวลาเกิดอุบัติเหตุ',
      'Report Status',
      'สถานะรายงาน',
      'Created Time',
      'เวลาสร้างรายงาน',
      'Location',
      'สถานที่',
      'Description',
      'รายละเอียด',
      'Weather',
      'สภาพอากาศ',
      'Road Condition',
      'สภาพถนน',
      'Traffic Condition',
      'สภาพการจราจร',
      'Driver Name',
      'ชื่อผู้ขับขี่',
      'Driver License',
      'ใบขับขี่',
      'Driver Phone',
      'เบอร์โทรศัพท์',
      'Vehicle Plate',
      'ทะเบียนรถ',
      'Vehicle Model',
      'รุ่นรถ',
      'Vehicle Color',
      'สีรถ',
      'Insurance Company',
      'บริษัทประกัน',
      'Insurance Policy',
      'กรมธรรม์',
      'Police Report',
      'รายงานตำรวจ',
      'Witness Name',
      'ชื่อพยาน',
      'Witness Phone',
      'เบอร์พยาน',
      'Notes',
      'หมายเหตุ',
      'Not provided',
      'ไม่ได้ระบุ',
      'Page',
      'หน้า',
      'Generated on',
      'สร้างเมื่อ',
      'DriveEasy Pass - Bilingual Accident Report System',
      'ระบบรายงานอุบัติเหตุ DriveEasy Pass'
    ];

    // 分析所有文本，确保处理各种数据类型
    textFields.forEach(text => {
      if (text !== null && text !== undefined) {
        this.analyzeText(String(text));
      }
    });
    staticTexts.forEach(text => this.analyzeText(text));

    // 添加常用字符
    const commonChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,;:!?()-[]{}/@#$%^&*+=<>|\\~`"\'';
    this.analyzeText(commonChars);

    if (process.env.NODE_ENV === 'development') {
      console.log(`Font optimizer analyzed ${this.textCache.size} unique characters`);
    }
    return Array.from(this.textCache);
  }

  // 获取字符的Unicode范围统计
  getCharacterStats() {
    const stats = {
      latin: 0,      // 基础拉丁字符
      chinese: 0,    // 中文字符
      thai: 0,       // 泰语字符
      japanese: 0,   // 日文字符
      korean: 0,     // 韩文字符
      symbols: 0,    // 符号
      numbers: 0,    // 数字
      other: 0       // 其他
    };

    for (const char of this.textCache) {
      const code = char.charCodeAt(0);
      
      if (code >= 0x0030 && code <= 0x0039) {
        stats.numbers++;
      } else if (code >= 0x0041 && code <= 0x007A) {
        stats.latin++;
      } else if (code >= 0x4E00 && code <= 0x9FFF) {
        stats.chinese++;
      } else if (code >= 0x0E00 && code <= 0x0E7F) {
        stats.thai++;
      } else if ((code >= 0x3040 && code <= 0x309F) || (code >= 0x30A0 && code <= 0x30FF)) {
        stats.japanese++;
      } else if (code >= 0xAC00 && code <= 0xD7AF) {
        stats.korean++;
      } else if (code <= 0x007F) {
        stats.symbols++;
      } else {
        stats.other++;
      }
    }

    return stats;
  }

  // 推荐最佳字体策略
  recommendFontStrategy() {
    const stats = this.getCharacterStats();
    const total = this.textCache.size;

    console.log('Character statistics:', stats);

    // 如果没有中文字符，使用纯系统字体策略
    if (stats.chinese === 0) {
      return {
        strategy: 'pure_system_fonts',
        reason: 'No Chinese characters detected, use lightweight system fonts only',
        recommendation: 'Use Tahoma for English and Thai, optimal file size'
      };
    }

    // 如果中文字符较少，使用混合策略
    if (stats.chinese < 50) {
      return {
        strategy: 'hybrid_fonts',
        reason: 'Few Chinese characters detected, use hybrid approach',
        recommendation: 'Use system fonts for English/Thai, specialized font for Chinese'
      };
    }

    // 如果中文字符较多，使用专用字体策略
    if (stats.chinese >= 50) {
      return {
        strategy: 'specialized_fonts',
        reason: 'Many Chinese characters detected, use specialized fonts',
        recommendation: 'Use specialized fonts for better Chinese character support'
      };
    }

    // 默认策略
    return {
      strategy: 'hybrid_fonts',
      reason: 'Balanced approach for mixed language content',
      recommendation: 'Use hybrid font strategy for optimal balance'
    };
  }

  // 清空缓存
  clear() {
    this.textCache.clear();
  }
}

module.exports = new FontOptimizer();
