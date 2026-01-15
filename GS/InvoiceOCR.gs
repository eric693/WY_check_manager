// InvoiceOCR.gs - 發票 OCR 處理

/**
 * ✅ 統一的 API 回應格式
 */
function createResponse(ok, code, data) {
  const response = {
    ok: ok,
    code: code || (ok ? 'SUCCESS' : 'ERROR')
  };
  
  // 如果 ok 為 true，使用 data 作為回傳資料
  if (ok && data) {
    response.data = data;
  }
  
  // 如果 ok 為 false，使用 data 作為錯誤訊息
  if (!ok && data) {
    if (typeof data === 'string') {
      response.msg = data;
    } else if (data.error) {
      response.msg = data.error;
    } else {
      response.msg = code;
    }
  }
  
  return response;
}

/**
 * 🔑 取得 OpenAI API Key
 */
function getOpenAIKey() {
  return PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
}

/**
 * 🧾 發票 OCR 辨識（增強版 - 辨識更多欄位）
 */
function processInvoiceOCR(base64Image, fileName) {
  try {
    Logger.log('🧾 開始 OCR 處理');
    Logger.log('   檔案名稱: ' + fileName);
    Logger.log('   Base64 長度: ' + base64Image.length);
    
    const apiKey = getOpenAIKey();
    
    if (!apiKey) {
      return createResponse(false, 'API_KEY_NOT_CONFIGURED');
    }
    
    // ⭐⭐⭐ 增強的 Prompt - 要求辨識更多欄位
    const prompt = `
請仔細分析這張台灣電子發票，並以 JSON 格式回傳以下資訊（如果無法辨識某欄位，請填 null）：

{
  "invoiceNumber": "發票號碼（例如：VF-02519160）",
  "invoiceDate": "發票日期（YYYY-MM-DD 格式，例如：2025-11-09）",
  "invoiceTime": "發票時間（HH:MM:SS 格式，例如：18:30:11）",
  "amount": "總金額（純數字，例如：58）",
  "storeName": "店家名稱（例如：伊利亞）",
  "storeAddress": "店家地址（如果有的話）",
  "storePhone": "店家電話（如果有的話）",
  "taxIdNumber": "統一編號（8位數字，如果有的話）",
  "sellerTaxId": "賣方統編（例如：16305393）",
  "randomCode": "隨機碼（4位數字，如果有的話）",
  "period": "發票期別（例如：114年11-12月）"
}

重要提示：
1. 只回傳純 JSON，不要有任何其他文字
2. 所有欄位都要存在，無法辨識的填 null
3. 金額只需要數字，不要貨幣符號
4. 日期格式務必為 YYYY-MM-DD
`;
    
    const payload = {
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 800,
      temperature: 0.2
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': 'Bearer ' + apiKey
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    Logger.log('📤 發送 OpenAI 請求...');
    
    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', options);
    const responseCode = response.getResponseCode();
    
    Logger.log('📥 收到回應，狀態碼: ' + responseCode);
    
    if (responseCode !== 200) {
      Logger.log('❌ OpenAI API 錯誤');
      return createResponse(false, 'OCR_API_ERROR', { code: responseCode });
    }
    
    const result = JSON.parse(response.getContentText());
    const content = result.choices[0].message.content;
    
    Logger.log('📄 OpenAI 回應內容: ' + content);
    
    // 清理並解析 JSON
    let cleanContent = content.trim();
    
    // 移除可能的 Markdown 代碼塊標記
    cleanContent = cleanContent.replace(/```json\n?/g, '');
    cleanContent = cleanContent.replace(/```\n?/g, '');
    cleanContent = cleanContent.trim();
    
    const ocrData = JSON.parse(cleanContent);
    
    Logger.log('✅ OCR 解析成功:');
    Logger.log(JSON.stringify(ocrData, null, 2));
    
    // ⭐ 儲存到報銷單據工作表
    saveInvoiceToSheet(ocrData, fileName);
    
    return createResponse(true, 'OCR_SUCCESS', ocrData);
    
  } catch (error) {
    Logger.log('❌ OCR 處理失敗: ' + error.message);
    Logger.log('   堆疊: ' + error.stack);
    return createResponse(false, 'OCR_PROCESSING_ERROR', { error: error.message });
  }
}

function saveInvoiceToSheet(ocrData, fileName) {
  try {
    Logger.log('💾 儲存發票資訊到工作表...');
    
    // ⭐ 擴充為 12 個欄位
    const sheet = getOrCreateSheet(SHEET_REIMBURSEMENT_INVOICES, [
      '單據ID', '報銷ID', '員工ID', '員工姓名', 
      '發票號碼', '發票日期', '發票時間', '金額', 
      '店家名稱', '賣方統編', '隨機碼', '期別'
    ]);
    
    const invoiceId = Utilities.getUuid();
    
    // ⭐ 完整儲存 12 個欄位
    sheet.appendRow([
      invoiceId,                      // A: 單據ID
      '',                             // B: 報銷ID
      '',                             // C: 員工ID
      '',                             // D: 員工姓名
      ocrData.invoiceNumber || '',    // E: 發票號碼
      ocrData.invoiceDate || '',      // F: 發票日期
      ocrData.invoiceTime || '',      // G: 發票時間 ⭐ 新增
      ocrData.amount || '',           // H: 金額
      ocrData.storeName || '',        // I: 店家名稱
      ocrData.sellerTaxId || '',      // J: 賣方統編 ⭐ 新增
      ocrData.randomCode || '',       // K: 隨機碼 ⭐ 新增
      ocrData.period || ''            // L: 期別 ⭐ 新增
    ]);
    
    Logger.log('✅ 發票資訊已儲存（完整版）');
    Logger.log('   單據ID: ' + invoiceId);
    Logger.log('   發票號碼: ' + ocrData.invoiceNumber);
    Logger.log('   時間: ' + ocrData.invoiceTime);
    Logger.log('   金額: ' + ocrData.amount);
    Logger.log('   隨機碼: ' + ocrData.randomCode);
    
  } catch (error) {
    Logger.log('⚠️ 儲存發票資訊失敗: ' + error.message);
  }
}

/**
 * 🔍 根據檔名判斷圖片格式
 */
function getMediaType(fileName) {
  if (!fileName) return 'image/jpeg';
  
  const ext = fileName.toLowerCase().split('.').pop();
  
  const mediaTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp'
  };
  
  return mediaTypes[ext] || 'image/jpeg';
}


/**
 * 🧪 測試 OCR 功能
 */
function testInvoiceOCR() {
  Logger.log('🧪 測試發票 OCR');
  Logger.log('');
  
  // ⚠️ 這裡需要替換成實際的 Base64 圖片資料
  const testImageBase64 = '/9j/4AAQSkZJRgABAQAAAQABAAD...'; // 替換成真實資料
  
  const result = processInvoiceOCR(testImageBase64, 'test_invoice.jpg');
  
  Logger.log('');
  Logger.log('📤 測試結果:');
  Logger.log(JSON.stringify(result, null, 2));
  
  if (result.ok) {
    Logger.log('');
    Logger.log('✅✅✅ OCR 測試成功！');
  } else {
    Logger.log('');
    Logger.log('❌ OCR 測試失敗: ' + result.msg);
  }
}