const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const path = require('path');

class SimplePdfService {
  async createBilingualAccidentReport(reportData, photos = []) {
    try {
      console.log('使用简单PDF生成服务...');
      
      // 创建PDF文档
      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);
      
      // 加载字体 - 简单直接
      let englishFont, chineseFont, thaiFont, boldFont;
      
      // 加载Tahoma字体（支持英文和泰文）
      try {
        const tahomaBytes = fs.readFileSync('C:/Windows/Fonts/tahoma.ttf');
        englishFont = await pdfDoc.embedFont(tahomaBytes);
        thaiFont = englishFont; // Tahoma支持泰文
        console.log('✅ Tahoma字体加载成功');
      } catch (err) {
        englishFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        thaiFont = englishFont;
        console.log('⚠️ 使用标准字体');
      }
      
      // 加载中文字体 - 使用字体子集化
      try {
        const chineseBytes = fs.readFileSync('C:/Windows/Fonts/simhei.ttf');
        chineseFont = await pdfDoc.embedFont(chineseBytes, { subset: true });
        console.log('✅ 中文字体加载成功（子集化）');
      } catch (err) {
        chineseFont = englishFont;
        console.log('⚠️ 中文字体失败，使用英文字体');
      }
      
      // 粗体字体
      boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // 智能字体选择函数
      const getFont = (text) => {
        if (!text) return englishFont;
        
        // 检查是否包含中文字符
        const hasChinese = /[\u4e00-\u9fff]/.test(text);
        // 检查是否包含泰文字符
        const hasThai = /[\u0e00-\u0e7f]/.test(text);
        
        if (hasChinese) {
          return chineseFont;
        } else if (hasThai) {
          return thaiFont;
        } else {
          return englishFont;
        }
      };
      
      // 添加页面
      const page = pdfDoc.addPage([595, 842]);
      let yPosition = 700;
      
      // 标题
      page.drawText('ACCIDENT REPORT', {
        x: 50,
        y: yPosition,
        size: 24,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
      yPosition -= 30;
      
      page.drawText('รายงานอุบัติเหตุ', {
        x: 50,
        y: yPosition,
        size: 20,
        font: thaiFont,
        color: rgb(0.3, 0.3, 0.3)
      });
      yPosition -= 50;
      
      // 报告ID
      page.drawText(`Report ID: ${reportData.id}`, {
        x: 50,
        y: yPosition,
        size: 14,
        font: englishFont,
        color: rgb(0, 0, 0)
      });
      yPosition -= 20;
      
      page.drawText(`รหัสรายงาน: ${reportData.id}`, {
        x: 50,
        y: yPosition,
        size: 12,
        font: thaiFont,
        color: rgb(0.3, 0.3, 0.3)
      });
      yPosition -= 40;
      
      // 添加字段的函数
      const addField = (englishLabel, thaiLabel, value) => {
        if (yPosition < 100) return; // 防止超出页面
        
        // 英文标签
        page.drawText(`${englishLabel}:`, {
          x: 50,
          y: yPosition,
          size: 12,
          font: englishFont,
          color: rgb(0, 0, 0)
        });
        
        // 值 - 使用智能字体选择
        const displayValue = value || 'Not provided';
        const valueFont = getFont(displayValue);
        page.drawText(displayValue, {
          x: 200,
          y: yPosition,
          size: 12,
          font: valueFont,
          color: rgb(0, 0, 0)
        });
        yPosition -= 20;
        
        // 泰文标签
        page.drawText(thaiLabel, {
          x: 50,
          y: yPosition,
          size: 10,
          font: thaiFont,
          color: rgb(0.5, 0.5, 0.5)
        });
        yPosition -= 30;
      };
      
      // 基本信息
      page.drawText('BASIC INFORMATION', {
        x: 50,
        y: yPosition,
        size: 16,
        font: boldFont,
        color: rgb(0, 0, 0)
      });
      yPosition -= 20;
      
      page.drawText('ข้อมูลพื้นฐาน', {
        x: 50,
        y: yPosition,
        size: 14,
        font: thaiFont,
        color: rgb(0.3, 0.3, 0.3)
      });
      yPosition -= 30;
      
      // 添加字段
      addField('Name', 'ชื่อ', reportData.partyAName);
      addField('Phone', 'เบอร์โทรศัพท์', reportData.partyAPhone);
      addField('Vehicle Number', 'ทะเบียนรถ', reportData.partyAVehicleNumber);
      addField('Insurance Company', 'บริษัทประกัน', reportData.partyAInsuranceCompany);
      addField('Location', 'สถานที่', reportData.location);
      addField('Description', 'รายละเอียด', reportData.description);
      
      // 生成PDF
      const pdfBytes = await pdfDoc.save();
      console.log(`✅ PDF生成成功，大小: ${(pdfBytes.length / 1024 / 1024).toFixed(2)} MB`);
      
      return pdfBytes;
      
    } catch (error) {
      console.error('❌ PDF生成失败:', error);
      throw error;
    }
  }
}

module.exports = new SimplePdfService();
