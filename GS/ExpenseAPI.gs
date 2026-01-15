// ==================== 💰 費用管理系統 API ====================
// ExpenseAPI.gs - 完整修正版

/**
 * ✅ 提交預支申請（完全修正版 v3.0 - 使用正確的工作表名稱）
 */
function submitAdvanceApplication(params) {
  try {
    Logger.log('═══════════════════════════════════════');
    Logger.log('💰 收到預支申請請求');
    Logger.log('═══════════════════════════════════════');
    
    const token = params.token;
    
    if (!token) {
      Logger.log('❌ 缺少 token');
      return { ok: false, msg: '缺少 token' };
    }
    
    // 驗證 Session 並取得用戶資訊
    const sessionResult = checkSession_(token);
    
    if (!sessionResult.ok || !sessionResult.user) {
      Logger.log('❌ Session 驗證失敗');
      return { ok: false, msg: 'Session 已過期或無效' };
    }
    
    const userId = sessionResult.user.userId;
    const userName = sessionResult.user.name;  // ⭐⭐⭐ 直接從 Session 取得姓名
    
    Logger.log('👤 用戶 ID: ' + userId);
    Logger.log('👤 用戶名稱: ' + userName);
    
    // 取得表單資料
    const date = params.date;
    const amount = parseFloat(params.amount);
    const purpose = params.purpose;
    
    Logger.log('📋 表單資料:');
    Logger.log('   日期: ' + date);
    Logger.log('   金額: ' + amount);
    Logger.log('   用途: ' + purpose);
    
    // 驗證參數
    if (!date || !amount || !purpose) {
      Logger.log('❌ 缺少必要參數');
      return { ok: false, msg: '缺少必要參數' };
    }
    
    // ⭐⭐⭐ 關鍵修正：不需要再查詢 users 工作表，直接使用 Session 中的資料
    
    // 寫入預支申請記錄
    const advanceSheet = getOrCreateExpenseSheet('AdvanceApplications');
    const timestamp = new Date().toISOString();
    const id = `ADV-${Date.now()}`;
    
    Logger.log('💾 準備寫入工作表...');
    Logger.log('   申請 ID: ' + id);
    
    advanceSheet.appendRow([
      id,              // A: 申請ID
      userId,          // B: 用戶ID
      userName,        // C: 用戶名稱
      date,            // D: 申請日期
      amount,          // E: 申請金額
      purpose,         // F: 申請用途
      'PENDING',       // G: 狀態 (PENDING, APPROVED, REJECTED)
      timestamp,       // H: 申請時間
      '',              // I: 審核人
      '',              // J: 審核時間
      ''               // K: 審核意見
    ]);
    
    Logger.log('✅ 寫入成功！');
    
    // 發送 LINE 通知給主管（可選）
    try {
      notifyAdminNewAdvanceApplication(userName, date, amount, purpose);
      Logger.log('📤 已發送通知給主管');
    } catch (notifyError) {
      Logger.log('⚠️ 通知發送失敗: ' + notifyError);
      // 不影響主流程
    }
    
    Logger.log('═══════════════════════════════════════');
    
    return { 
      ok: true, 
      msg: '預支申請已送出',
      applicationId: id
    };
    
  } catch (error) {
    Logger.log('❌ submitAdvanceApplication 錯誤: ' + error);
    Logger.log('❌ 錯誤堆疊: ' + error.stack);
    return { ok: false, msg: '系統錯誤：' + error.toString() };
  }
}

/**
 * ✅ 處理報銷申請（完整修正版 - 包含發票資料儲存）
 */
function submitReimbursement(params) {
  try {
    Logger.log('═══════════════════════════════════════');
    Logger.log('📄 開始處理報銷申請');
    Logger.log('═══════════════════════════════════════');
    
    // ⭐ 步驟 1：解析資料
    let data;
    if (params.data) {
      data = typeof params.data === 'string' ? JSON.parse(params.data) : params.data;
    } else {
      data = params;
    }
    
    Logger.log('📥 收到的資料:');
    Logger.log('   keys: ' + Object.keys(data).join(', '));
    
    // ⭐ 步驟 2：驗證 Session 並取得用戶資訊
    const token = data.token || params.token;
    
    if (!token) {
      Logger.log('❌ 缺少 token');
      return { ok: false, msg: '缺少 token' };
    }
    
    const sessionResult = checkSession_(token);
    
    if (!sessionResult.ok || !sessionResult.user) {
      Logger.log('❌ Session 驗證失敗');
      return { ok: false, msg: 'Session 已過期或無效' };
    }
    
    const userId = sessionResult.user.userId;
    const userName = sessionResult.user.name;
    
    Logger.log('✅ 用戶驗證成功');
    Logger.log('   userId: ' + userId);
    Logger.log('   userName: ' + userName);
    
    // ⭐ 步驟 3：取得報銷資料
    const date = data.date;
    const summary = data.summary;
    const amount = parseFloat(data.amount);
    const note = data.note || '';
    const invoices = data.invoices || [];  // ⭐ 發票陣列
    
    Logger.log('');
    Logger.log('📋 報銷資料:');
    Logger.log('   日期: ' + date);
    Logger.log('   摘要: ' + summary);
    Logger.log('   金額: ' + amount);
    Logger.log('   發票數量: ' + invoices.length);
    
    // ⭐ 步驟 4：驗證必要參數
    if (!userId || !date || !summary || !amount) {
      Logger.log('❌ 缺少必要參數');
      return { ok: false, msg: '缺少必要參數' };
    }

    Logger.log('✅ 參數驗證通過');
    
    // ⭐ 步驟 5：生成申請 ID
    const timestamp = Date.now();
    const reimbursementId = `REIMB-${timestamp}`;
    const applyTime = new Date();
    
    Logger.log('');
    Logger.log('🆔 申請 ID: ' + reimbursementId);
    
    // ⭐ 步驟 6：上傳發票照片到 Google Drive
    Logger.log('');
    Logger.log('📤 開始上傳發票...');
    
    const folderId = getOrCreateExpenseFolder('Invoices');
    const folder = DriveApp.getFolderById(folderId);
    
    const uploadedInvoices = [];
    
    invoices.forEach((invoice, index) => {
      try {
        Logger.log(`   處理第 ${index + 1} 張發票...`);
        
        const fileName = invoice.fileName || `invoice_${timestamp}_${index + 1}.jpg`;
        
        // 解碼 Base64
        const imageData = invoice.imageData.replace(/^data:image\/\w+;base64,/, '');
        const blob = Utilities.newBlob(
          Utilities.base64Decode(imageData), 
          'image/jpeg', 
          fileName
        );
        
        // 上傳到 Drive
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        const imageUrl = file.getUrl();
        
        Logger.log(`   ✅ 上傳成功: ${fileName}`);
        
        uploadedInvoices.push({
          invoiceNumber: invoice.invoiceNumber || '',
          date: invoice.date || '',
          amount: invoice.amount || '',
          storeName: invoice.storeName || '',
          imageUrl: imageUrl,
          fileName: fileName
        });
        
      } catch (uploadError) {
        Logger.log(`   ❌ 上傳失敗: ${uploadError.message}`);
      }
    });
    
    if (uploadedInvoices.length === 0) {
      Logger.log('❌ 所有發票上傳失敗');
      return { ok: false, msg: '發票上傳失敗，請重試' };
    }
    
    Logger.log(`✅ 成功上傳 ${uploadedInvoices.length} 張發票`);
    
    // ⭐ 步驟 7：寫入報銷申請記錄（主表）
    Logger.log('');
    Logger.log('💾 寫入報銷申請記錄...');
    
    const reimbursementSheet = getOrCreateExpenseSheet('ReimbursementApplications');
    
    // 計算總發票金額
    const totalInvoiceAmount = uploadedInvoices.reduce((sum, inv) => {
      return sum + (parseFloat(inv.amount) || 0);
    }, 0);
    
    reimbursementSheet.appendRow([
      reimbursementId,           // A: 申請ID
      userId,                    // B: 員工ID
      userName,                  // C: 員工姓名
      date,                      // D: 費用日期
      summary,                   // E: 費用摘要
      amount,                    // F: 申請金額
      totalInvoiceAmount,        // G: 發票總額
      uploadedInvoices.length,   // H: 發票數量
      note,                      // I: 備註
      'PENDING',                 // J: 狀態（待審核）
      applyTime,                 // K: 申請時間
      '',                        // L: 審核人
      '',                        // M: 審核時間
      ''                         // N: 審核意見
    ]);
    
    Logger.log('✅ 報銷申請記錄已寫入');
    
    Logger.log('');
    Logger.log('📋 寫入發票詳細資料（12 欄位）...');
    
    // ⭐ 使用 Constants.gs 中定義的 INVOICE_HEADERS
    const invoiceSheet = getOrCreateSheet(SHEET_REIMBURSEMENT_INVOICES, INVOICE_HEADERS);
    
    uploadedInvoices.forEach((invoice, index) => {
      const invoiceId = `INV-${timestamp}-${String(index + 1).padStart(3, '0')}`;
      
      // ⭐⭐⭐ 關鍵修正：新增發票時間、賣方統編、隨機碼、期別
      invoiceSheet.appendRow([
        invoiceId,                  // A: 單據ID
        reimbursementId,            // B: 報銷ID
        userId,                     // C: 員工ID
        userName,                   // D: 員工姓名
        invoice.invoiceNumber,      // E: 發票號碼
        invoice.date,               // F: 發票日期
        invoice.time || '',         // G: 發票時間 ⭐ 新增
        invoice.amount,             // H: 金額
        invoice.storeName,          // I: 店家名稱
        invoice.sellerTaxId || '',  // J: 賣方統編 ⭐ 新增
        invoice.randomCode || '',   // K: 隨機碼 ⭐ 新增
        invoice.period || ''        // L: 期別 ⭐ 新增
      ]);
    });
    
    Logger.log(`✅ ${uploadedInvoices.length} 張發票資料已寫入（12 欄位）`);
    
    // ⭐ 步驟 9：發送 LINE 通知給管理員
    Logger.log('');
    Logger.log('📤 發送 LINE 通知...');
    
    try {
      notifyAdminNewReimbursement(userName, date, summary, amount, uploadedInvoices.length);
      Logger.log('✅ LINE 通知已發送');
    } catch (notifyError) {
      Logger.log('⚠️ LINE 通知發送失敗: ' + notifyError.message);
    }
    
    // ⭐ 步驟 10：返回結果
    Logger.log('');
    Logger.log('✅✅✅ 報銷申請處理完成');
    Logger.log('═══════════════════════════════════════');
    
    return { 
      ok: true, 
      msg: '報銷申請已送出',
      data: {
        applicationId: reimbursementId,
        invoiceCount: uploadedInvoices.length,
        totalAmount: amount,
        invoiceAmount: totalInvoiceAmount,
        invoices: uploadedInvoices.map(inv => ({
          invoiceNumber: inv.invoiceNumber,
          amount: inv.amount,
          imageUrl: inv.imageUrl
        }))
      }
    };
    
  } catch (error) {
    Logger.log('');
    Logger.log('❌❌❌ submitReimbursement 錯誤');
    Logger.log('錯誤訊息: ' + error.message);
    Logger.log('錯誤堆疊: ' + error.stack);
    Logger.log('═══════════════════════════════════════');
    
    return { 
      ok: false, 
      msg: '系統錯誤：' + error.toString(),
      error: error.stack
    };
  }
}

/**
 * 取得預支申請記錄（修正版）
 */
function getAdvanceRecords(params) {
  try {
    const userId = params.userId;
    
    if (!userId) {
      return { ok: false, msg: '缺少用戶ID' };
    }
    
    // ✅ 修正：使用 getActiveSpreadsheet()
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const advanceSheet = ss.getSheetByName('AdvanceApplications');
    
    if (!advanceSheet) {
      return { ok: true, records: [] };
    }
    
    const data = advanceSheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { ok: true, records: [] };
    }
    
    // 過濾該用戶的記錄
    const records = data.slice(1)
      .filter(row => row[1] === userId)
      .map(row => ({
        id: row[0],
        userId: row[1],
        userName: row[2],
        date: row[3],
        amount: row[4],
        purpose: row[5],
        status: row[6],
        appliedAt: row[7],
        reviewer: row[8],
        reviewedAt: row[9],
        reviewComment: row[10]
      }))
      .reverse(); // 最新的在前面
    
    return { ok: true, records: records };
    
  } catch (error) {
    Logger.log('getAdvanceRecords 錯誤: ' + error);
    return { ok: false, msg: '系統錯誤：' + error.toString() };
  }
}

/**
 * 取得報銷申請記錄（修正版）
 */
function getReimbursementRecords(params) {
  try {
    const userId = params.userId;
    
    if (!userId) {
      return { ok: false, msg: '缺少用戶ID' };
    }
    
    // ✅ 修正：使用 getActiveSpreadsheet()
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const reimbursementSheet = ss.getSheetByName('ReimbursementApplications');
    
    if (!reimbursementSheet) {
      return { ok: true, records: [] };
    }
    
    const data = reimbursementSheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { ok: true, records: [] };
    }
    
    // 過濾該用戶的記錄
    const records = data.slice(1)
      .filter(row => row[1] === userId)
      .map(row => ({
        id: row[0],
        userId: row[1],
        userName: row[2],
        date: row[3],
        summary: row[4],
        amount: row[5],
        invoiceNumber: row[6],
        note: row[7],
        invoiceUrl: row[8],
        status: row[9],
        appliedAt: row[10],
        reviewer: row[11],
        reviewedAt: row[12],
        reviewComment: row[13]
      }))
      .reverse(); // 最新的在前面
    
    return { ok: true, records: records };
    
  } catch (error) {
    Logger.log('getReimbursementRecords 錯誤: ' + error);
    return { ok: false, msg: '系統錯誤：' + error.toString() };
  }
}

/**
 * 審核預支申請（管理員）- 完全修正版
 */
function reviewAdvanceApplication(params) {
  try {
    Logger.log('═══════════════════════════════════════');
    Logger.log('📋 開始審核預支申請');
    Logger.log('═══════════════════════════════════════');
    
    // ⭐⭐⭐ 修正：統一從 params 取得
    const applicationId = params.id;
    const action = params.action;           // ✅ 改用 params.action
    const comment = params.comment || '';   // ✅ 改用 params.comment
    const reviewerId = params.reviewerId;   // ✅ 改用 params.reviewerId
    
    Logger.log('📋 審核參數:');
    Logger.log('   申請ID: ' + applicationId);
    Logger.log('   動作: ' + action);
    Logger.log('   意見: ' + comment);
    Logger.log('   審核人ID: ' + reviewerId);
    
    if (!applicationId || !action || !reviewerId) {
      Logger.log('❌ 缺少必要參數');
      return { ok: false, msg: '缺少必要參數' };
    }
    
    // ✅ 使用 getActiveSpreadsheet()
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const advanceSheet = ss.getSheetByName('AdvanceApplications');
    
    if (!advanceSheet) {
      Logger.log('❌ 找不到預支申請工作表');
      return { ok: false, msg: '找不到預支申請工作表' };
    }
    
    const data = advanceSheet.getDataRange().getValues();
    
    // 找到該申請
    const rowIndex = data.findIndex(row => row[0] === applicationId);
    
    if (rowIndex === -1) {
      Logger.log('❌ 找不到申請記錄');
      return { ok: false, msg: '找不到申請記錄' };
    }
    
    Logger.log('✅ 找到申請記錄（第 ' + (rowIndex + 1) + ' 行）');
    
    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const reviewTime = new Date().toISOString();
    
    // ⭐⭐⭐ 修正：從 Session 取得審核人姓名
    const sessionResult = checkSession_(params.token);
    
    let reviewerName = reviewerId;
    
    if (sessionResult.ok && sessionResult.user) {
      reviewerName = sessionResult.user.name;
      Logger.log('✅ 審核人姓名: ' + reviewerName);
    } else {
      Logger.log('⚠️ 無法從 Session 取得審核人姓名，使用 ID');
    }
    
    // 更新狀態
    advanceSheet.getRange(rowIndex + 1, 7).setValue(status);           // G: 狀態
    advanceSheet.getRange(rowIndex + 1, 9).setValue(reviewerName);     // I: 審核人
    advanceSheet.getRange(rowIndex + 1, 10).setValue(reviewTime);      // J: 審核時間
    advanceSheet.getRange(rowIndex + 1, 11).setValue(comment);         // K: 審核意見
    
    Logger.log('✅ 已更新審核狀態');
    Logger.log('   狀態: ' + status);
    Logger.log('   審核人: ' + reviewerName);
    Logger.log('   時間: ' + reviewTime);
    
    // 發送通知給申請人
    const applicantId = data[rowIndex][1];
    const applicantName = data[rowIndex][2];
    const amount = data[rowIndex][4];
    
    try {
      notifyApplicantAdvanceResult(applicantId, applicantName, amount, status, comment);
      Logger.log('✅ 已發送通知給申請人');
    } catch (notifyError) {
      Logger.log('⚠️ 通知發送失敗: ' + notifyError);
    }
    
    Logger.log('═══════════════════════════════════════');
    
    return { 
      ok: true, 
      msg: status === 'APPROVED' ? '已核准申請' : '已拒絕申請'
    };
    
  } catch (error) {
    Logger.log('❌ reviewAdvanceApplication 錯誤: ' + error);
    Logger.log('❌ 錯誤堆疊: ' + error.stack);
    return { ok: false, msg: '系統錯誤：' + error.toString() };
  }
}

/**
 * 審核報銷申請（管理員）- 完全修正版
 */
function reviewReimbursement(params) {
  try {
    Logger.log('═══════════════════════════════════════');
    Logger.log('📋 開始審核報銷申請');
    Logger.log('═══════════════════════════════════════');
    
    // ⭐⭐⭐ 修正：統一從 params 取得
    const applicationId = params.id;
    const action = params.action;           // ✅ 改用 params.action
    const comment = params.comment || '';   // ✅ 改用 params.comment
    const reviewerId = params.reviewerId;   // ✅ 改用 params.reviewerId
    
    Logger.log('📋 審核參數:');
    Logger.log('   申請ID: ' + applicationId);
    Logger.log('   動作: ' + action);
    Logger.log('   意見: ' + comment);
    Logger.log('   審核人ID: ' + reviewerId);
    
    if (!applicationId || !action || !reviewerId) {
      Logger.log('❌ 缺少必要參數');
      return { ok: false, msg: '缺少必要參數' };
    }
    
    // ✅ 使用 getActiveSpreadsheet()
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const reimbursementSheet = ss.getSheetByName('ReimbursementApplications');
    
    if (!reimbursementSheet) {
      Logger.log('❌ 找不到報銷申請工作表');
      return { ok: false, msg: '找不到報銷申請工作表' };
    }
    
    const data = reimbursementSheet.getDataRange().getValues();
    
    // 找到該申請
    const rowIndex = data.findIndex(row => row[0] === applicationId);
    
    if (rowIndex === -1) {
      Logger.log('❌ 找不到申請記錄');
      return { ok: false, msg: '找不到申請記錄' };
    }
    
    Logger.log('✅ 找到申請記錄（第 ' + (rowIndex + 1) + ' 行）');
    
    const status = action === 'approve' ? 'APPROVED' : 'REJECTED';
    const reviewTime = new Date().toISOString();
    
    // ⭐⭐⭐ 修正：從 Session 取得審核人姓名
    const sessionResult = checkSession_(params.token);
    
    let reviewerName = reviewerId;
    
    if (sessionResult.ok && sessionResult.user) {
      reviewerName = sessionResult.user.name;
      Logger.log('✅ 審核人姓名: ' + reviewerName);
    } else {
      Logger.log('⚠️ 無法從 Session 取得審核人姓名，使用 ID');
    }
    
    // 更新狀態
    reimbursementSheet.getRange(rowIndex + 1, 10).setValue(status);         // J: 狀態
    reimbursementSheet.getRange(rowIndex + 1, 12).setValue(reviewerName);   // L: 審核人
    reimbursementSheet.getRange(rowIndex + 1, 13).setValue(reviewTime);     // M: 審核時間
    reimbursementSheet.getRange(rowIndex + 1, 14).setValue(comment);        // N: 審核意見
    
    Logger.log('✅ 已更新審核狀態');
    Logger.log('   狀態: ' + status);
    Logger.log('   審核人: ' + reviewerName);
    Logger.log('   時間: ' + reviewTime);
    
    // 發送通知給申請人
    const applicantId = data[rowIndex][1];
    const applicantName = data[rowIndex][2];
    const amount = data[rowIndex][5];
    
    try {
      notifyApplicantReimbursementResult(applicantId, applicantName, amount, status, comment);
      Logger.log('✅ 已發送通知給申請人');
    } catch (notifyError) {
      Logger.log('⚠️ 通知發送失敗: ' + notifyError);
    }
    
    Logger.log('═══════════════════════════════════════');
    
    return { 
      ok: true, 
      msg: status === 'APPROVED' ? '已核准申請' : '已拒絕申請'
    };
    
  } catch (error) {
    Logger.log('❌ reviewReimbursement 錯誤: ' + error);
    Logger.log('❌ 錯誤堆疊: ' + error.stack);
    return { ok: false, msg: '系統錯誤：' + error.toString() };
  }
}

// ==================== 輔助函數 ====================

/**
 * 取得或建立費用工作表（專用版本）
 */
function getOrCreateExpenseSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    
    // 根據不同的表格設定標題行
    if (sheetName === 'AdvanceApplications') {
      sheet.appendRow([
        '申請ID', '用戶ID', '用戶名稱', '申請日期', '申請金額', 
        '申請用途', '狀態', '申請時間', '審核人', '審核時間', '審核意見'
      ]);
      
      // 設定欄寬
      sheet.setColumnWidth(1, 150);  // 申請ID
      sheet.setColumnWidth(2, 200);  // 用戶ID
      sheet.setColumnWidth(3, 120);  // 用戶名稱
      sheet.setColumnWidth(6, 200);  // 申請用途
      
    } else if (sheetName === 'ReimbursementApplications') {
      sheet.appendRow([
        '申請ID', '用戶ID', '用戶名稱', '費用日期', '費用摘要', 
        '報銷金額', '發票號碼', '備註', '發票照片URL', '狀態', 
        '申請時間', '審核人', '審核時間', '審核意見'
      ]);
      
      // 設定欄寬
      sheet.setColumnWidth(1, 150);  // 申請ID
      sheet.setColumnWidth(2, 200);  // 用戶ID
      sheet.setColumnWidth(9, 300);  // 發票照片URL
    }
    
    Logger.log(`✅ 已建立工作表: ${sheetName}`);
  }
  
  return sheet;
}

/**
 * 取得或建立 Drive 資料夾（費用專用）
 */
function getOrCreateExpenseFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  
  if (folders.hasNext()) {
    const folder = folders.next();
    Logger.log(`✅ 找到現有資料夾: ${folderName}`);
    return folder.getId();
  } else {
    const folder = DriveApp.createFolder(folderName);
    Logger.log(`✅ 已建立資料夾: ${folderName}`);
    return folder.getId();
  }
}

// ==================== LINE 通知函數 ====================

/**
 * 通知主管有新的預支申請
 */
function notifyAdminNewAdvanceApplication(userName, date, amount, purpose) {
  const message = `
📝 新的預支申請

👤 申請人：${userName}
📅 申請日期：${date}
💰 申請金額：NT$ ${amount.toLocaleString()}
📋 申請用途：${purpose}

請至系統審核此申請。
  `.trim();
  
  sendLineNotifyToAdmins(message);
}

/**
 * 📧 通知管理員有新的報銷申請（修正版）
 */
function notifyAdminNewReimbursement(userName, date, summary, amount, invoiceCount) {
  try {
    Logger.log('📧 準備發送管理員通知');
    
    const adminUsers = getAdminUsers();
    
    if (!adminUsers || adminUsers.length === 0) {
      Logger.log('⚠️ 沒有管理員需要通知');
      return;
    }
    
    Logger.log(`📋 找到 ${adminUsers.length} 位管理員`);
    
    const message = {
      type: 'text',
      text: `📄 新的報銷申請\n\n` +
            `👤 申請人：${userName}\n` +
            `📅 費用日期：${date}\n` +
            `📝 摘要：${summary}\n` +
            `💰 金額：NT$ ${amount.toLocaleString()}\n` +
            `🧾 發票數量：${invoiceCount} 張\n\n` +
            `請盡快審核！`
    };
    
    adminUsers.forEach(admin => {
      try {
        pushLineMessage_(admin.userId, [message]);
        Logger.log(`   ✅ 已通知管理員: ${admin.name}`);
      } catch (e) {
        Logger.log(`   ❌ 通知失敗 (${admin.name}): ${e.message}`);
      }
    });
    
  } catch (error) {
    Logger.log('❌ notifyAdminNewReimbursement 錯誤: ' + error);
  }
}

/**
 * 通知申請人預支申請結果
 */
function notifyApplicantAdvanceResult(userId, userName, amount, status, comment) {
  const statusText = status === 'APPROVED' ? '✅ 已核准' : '❌ 已拒絕';
  
  let message = `
預支申請審核結果

${statusText}
💰 申請金額：NT$ ${amount.toLocaleString()}
  `.trim();
  
  if (comment) {
    message += `\n\n📝 審核意見：${comment}`;
  }
  
  sendLineNotifyToUser(userId, message);
}

/**
 * 通知申請人報銷申請結果
 */
function notifyApplicantReimbursementResult(userId, userName, amount, status, comment) {
  const statusText = status === 'APPROVED' ? '✅ 已核准' : '❌ 已拒絕';
  
  let message = `
報銷申請審核結果

${statusText}
💰 報銷金額：NT$ ${amount.toLocaleString()}
  `.trim();
  
  if (comment) {
    message += `\n\n📝 審核意見：${comment}`;
  }
  
  sendLineNotifyToUser(userId, message);
}

/**
 * 發送 LINE 通知給所有管理員
 */
function sendLineNotifyToAdmins(message) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const userSheet = ss.getSheetByName('users');
    
    if (!userSheet) {
      Logger.log('⚠️ 找不到用戶工作表，無法發送通知');
      return;
    }
    
    const userData = userSheet.getDataRange().getValues();
    
    // 找出所有管理員（F 欄 = '管理員'）
    const admins = userData.slice(1).filter(row => row[5] === '管理員');
    
    Logger.log(`📤 準備發送通知給 ${admins.length} 位管理員`);
    
    admins.forEach(admin => {
      const userId = admin[0];  // A 欄：userId
      sendLineNotifyToUser(userId, message);
    });
    
  } catch (error) {
    Logger.log('發送管理員通知失敗: ' + error);
  }
}

/**
 * 發送 LINE 通知給特定用戶
 */
function sendLineNotifyToUser(userId, message) {
  try {
    // 從 PropertiesService 取得 LINE Bot Token
    const LINE_BOT_TOKEN = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
    
    if (!LINE_BOT_TOKEN) {
      Logger.log('⚠️ 未設定 LINE_CHANNEL_ACCESS_TOKEN，跳過通知');
      return;
    }
    
    const url = 'https://api.line.me/v2/bot/message/push';
    
    const payload = {
      to: userId,
      messages: [{
        type: 'text',
        text: message
      }]
    };
    
    const options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_BOT_TOKEN}`
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      Logger.log(`✅ 已發送 LINE 通知給: ${userId}`);
    } else {
      Logger.log(`⚠️ LINE 通知發送失敗 (${responseCode}): ${response.getContentText()}`);
    }
    
  } catch (error) {
    Logger.log('發送 LINE 通知失敗: ' + error);
  }
}

// ==================== 🧪 測試函數 ====================

/**
 * 測試費用管理系統完整流程
 */
function testExpenseSystemComplete() {
  Logger.log('═══════════════════════════════════════');
  Logger.log('🧪 測試費用管理系統完整流程');
  Logger.log('═══════════════════════════════════════');
  Logger.log('');
  
  const testToken = '8a709f05-5124-4cce-a7fb-a0b98f0f8ea1';  // ⚠️ 替換成有效 token
  
  // 測試 1: 提交預支申請
  Logger.log('📝 測試 1: 提交預支申請');
  const advanceResult = handleSubmitAdvanceApplication({
    token: testToken,
    date: '2025-12-20',
    amount: '5000',
    purpose: '測試預支申請'
  });
  
  Logger.log('預支申請結果: ' + JSON.stringify(advanceResult, null, 2));
  Logger.log('');
  
  // 測試 2: 查詢預支記錄
  Logger.log('📋 測試 2: 查詢預支記錄');
  const recordsResult = handleGetAdvanceRecords({
    token: testToken
  });
  
  Logger.log('預支記錄: ' + JSON.stringify(recordsResult, null, 2));
  Logger.log('');
  Logger.log('═══════════════════════════════════════');
}


/**
 * 🏗️ 手動建立費用管理工作表
 */
function createExpenseTables() {
  Logger.log('🏗️ 開始建立費用管理工作表');
  Logger.log('');
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 建立預支申請表
  let advanceSheet = ss.getSheetByName('AdvanceApplications');
  
  if (!advanceSheet) {
    advanceSheet = ss.insertSheet('AdvanceApplications');
    advanceSheet.appendRow([
      '申請ID', '用戶ID', '用戶名稱', '申請日期', '申請金額', 
      '申請用途', '狀態', '申請時間', '審核人', '審核時間', '審核意見'
    ]);
    
    // 設定標題列格式
    const headerRange = advanceSheet.getRange(1, 1, 1, 11);
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    
    // 設定欄寬
    advanceSheet.setColumnWidth(1, 150);  // 申請ID
    advanceSheet.setColumnWidth(2, 200);  // 用戶ID
    advanceSheet.setColumnWidth(3, 120);  // 用戶名稱
    advanceSheet.setColumnWidth(4, 110);  // 申請日期
    advanceSheet.setColumnWidth(5, 100);  // 申請金額
    advanceSheet.setColumnWidth(6, 250);  // 申請用途
    advanceSheet.setColumnWidth(7, 90);   // 狀態
    advanceSheet.setColumnWidth(8, 170);  // 申請時間
    advanceSheet.setColumnWidth(9, 120);  // 審核人
    advanceSheet.setColumnWidth(10, 170); // 審核時間
    advanceSheet.setColumnWidth(11, 200); // 審核意見
    
    // 凍結標題列
    advanceSheet.setFrozenRows(1);
    
    Logger.log('✅ 已建立「預支申請表」(AdvanceApplications)');
  } else {
    Logger.log('ℹ️ 「預支申請表」已存在');
  }
  
  Logger.log('');
  
  // 2. 建立報銷申請表
  let reimbSheet = ss.getSheetByName('ReimbursementApplications');
  
  if (!reimbSheet) {
    reimbSheet = ss.insertSheet('ReimbursementApplications');
    reimbSheet.appendRow([
      '申請ID', '用戶ID', '用戶名稱', '費用日期', '費用摘要', 
      '報銷金額', '發票號碼', '備註', '發票照片URL', '狀態', 
      '申請時間', '審核人', '審核時間', '審核意見'
    ]);
    
    // 設定標題列格式
    const headerRange = reimbSheet.getRange(1, 1, 1, 14);
    headerRange.setBackground('#34a853');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    
    // 設定欄寬
    reimbSheet.setColumnWidth(1, 150);  // 申請ID
    reimbSheet.setColumnWidth(2, 200);  // 用戶ID
    reimbSheet.setColumnWidth(3, 120);  // 用戶名稱
    reimbSheet.setColumnWidth(4, 110);  // 費用日期
    reimbSheet.setColumnWidth(5, 200);  // 費用摘要
    reimbSheet.setColumnWidth(6, 100);  // 報銷金額
    reimbSheet.setColumnWidth(7, 120);  // 發票號碼
    reimbSheet.setColumnWidth(8, 150);  // 備註
    reimbSheet.setColumnWidth(9, 350);  // 發票照片URL
    reimbSheet.setColumnWidth(10, 90);  // 狀態
    reimbSheet.setColumnWidth(11, 170); // 申請時間
    reimbSheet.setColumnWidth(12, 120); // 審核人
    reimbSheet.setColumnWidth(13, 170); // 審核時間
    reimbSheet.setColumnWidth(14, 200); // 審核意見
    
    // 凍結標題列
    reimbSheet.setFrozenRows(1);
    
    Logger.log('✅ 已建立「報銷申請表」(ReimbursementApplications)');
  } else {
    Logger.log('ℹ️ 「報銷申請表」已存在');
  }
  
  Logger.log('');
  Logger.log('═══════════════════════════════════════');
  Logger.log('🎉 費用管理工作表建立完成！');
  Logger.log('');
  Logger.log('📋 工作表列表:');
  Logger.log('   1. AdvanceApplications（預支申請）');
  Logger.log('   2. ReimbursementApplications（報銷申請）');
  Logger.log('');
  Logger.log('💡 提示：工作表已設定好格式和欄寬');
}

/**
 * ✅ 取得待審核的預支申請（管理員）
 */
function getPendingAdvanceRequests() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const advanceSheet = ss.getSheetByName('AdvanceApplications');
    
    if (!advanceSheet) {
      return { ok: true, records: [] };
    }
    
    const data = advanceSheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { ok: true, records: [] };
    }
    
    // 過濾出狀態為 PENDING 的記錄
    const records = data.slice(1)
      .filter(row => row[6] === 'PENDING')  // G 欄：狀態
      .map(row => ({
        id: row[0],
        userId: row[1],
        userName: row[2],
        date: row[3],
        amount: row[4],
        purpose: row[5],
        status: row[6],
        appliedAt: row[7]
      }))
      .reverse(); // 最新的在前面
    
    return { ok: true, records: records };
    
  } catch (error) {
    Logger.log('getPendingAdvanceRequests 錯誤: ' + error);
    return { ok: false, msg: '系統錯誤：' + error.toString() };
  }
}

/**
 * ✅ 取得待審核的報銷申請（管理員）
 */
function getPendingReimbursementRequests() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const reimbursementSheet = ss.getSheetByName('ReimbursementApplications');
    
    if (!reimbursementSheet) {
      return { ok: true, records: [] };
    }
    
    const data = reimbursementSheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { ok: true, records: [] };
    }
    
    // 過濾出狀態為 PENDING 的記錄
    const records = data.slice(1)
      .filter(row => row[9] === 'PENDING')  // J 欄：狀態
      .map(row => ({
        id: row[0],
        userId: row[1],
        userName: row[2],
        date: row[3],
        summary: row[4],
        amount: row[5],
        invoiceNumber: row[6],
        note: row[7],
        invoiceUrl: row[8],
        status: row[9],
        appliedAt: row[10]
      }))
      .reverse(); // 最新的在前面
    
    return { ok: true, records: records };
    
  } catch (error) {
    Logger.log('getPendingReimbursementRequests 錯誤: ' + error);
    return { ok: false, msg: '系統錯誤：' + error.toString() };
  }
}

/**
 * 🧪 測試最終修正版
 */
function testFinalFixedSubmitAdvance() {
  Logger.log('🧪 測試最終修正版預支申請');
  Logger.log('═══════════════════════════════════════');
  
  const testParams = {
    token: '0daa21a9-3927-4bfb-a877-7d473f6ffd2d',  // ⚠️ 確認這是有效的 token
    date: '2026-01-12',
    amount: '1000',
    purpose: '測試預支申請 v3.0'
  };
  
  Logger.log('📥 測試參數:');
  Logger.log(JSON.stringify(testParams, null, 2));
  Logger.log('');
  
  // 先檢查 Session
  Logger.log('🔍 步驟 1：檢查 Session');
  const sessionCheck = checkSession_(testParams.token);
  Logger.log('   ok: ' + sessionCheck.ok);
  
  if (sessionCheck.ok && sessionCheck.user) {
    Logger.log('   userId: ' + sessionCheck.user.userId);
    Logger.log('   name: ' + sessionCheck.user.name);
  } else {
    Logger.log('   ❌ Session 無效');
    return;
  }
  
  Logger.log('');
  Logger.log('🔍 步驟 2：提交預支申請');
  
  const result = submitAdvanceApplication(testParams);
  
  Logger.log('');
  Logger.log('📤 結果:');
  Logger.log(JSON.stringify(result, null, 2));
  Logger.log('═══════════════════════════════════════');
  
  if (result.ok) {
    Logger.log('✅✅✅ 測試成功！');
    Logger.log('');
    Logger.log('📋 請檢查 Google Sheet:');
    Logger.log('   工作表名稱: AdvanceApplications');
    Logger.log('   申請 ID: ' + result.applicationId);
  } else {
    Logger.log('❌ 測試失敗: ' + result.msg);
  }
}


/**
 * 🧪 測試預支審核功能
 */
function testReviewAdvance() {
  Logger.log('🧪 測試預支審核功能');
  Logger.log('═══════════════════════════════════════');
  
  const testParams = {
    token: '0daa21a9-3927-4bfb-a877-7d473f6ffd2d',       // ⚠️ 替換
    id: 'ADV-1768062014629',      // ⚠️ 替換成實際的申請ID
    action: 'approve',             // 'approve' 或 'reject'
    comment: '核准測試',
    reviewerId: 'U20abea6d8991c26cfc8e9c98dc999c0f'  // ⚠️ 替換
  };
  
  Logger.log('📥 測試參數:');
  Logger.log(JSON.stringify(testParams, null, 2));
  Logger.log('');
  
  const result = reviewAdvanceApplication(testParams);
  
  Logger.log('');
  Logger.log('📤 結果:');
  Logger.log(JSON.stringify(result, null, 2));
  Logger.log('═══════════════════════════════════════');
  
  if (result.ok) {
    Logger.log('✅✅✅ 審核成功！');
  } else {
    Logger.log('❌ 審核失敗: ' + result.msg);
  }
}

/**
 * 🛠️ 取得或建立工作表（如果不存在則自動建立）
 */
function getOrCreateSheet(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    Logger.log(`📝 工作表「${sheetName}」不存在，自動建立...`);
    
    sheet = ss.insertSheet(sheetName);
    
    // 寫入標題列
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      
      // 美化標題列
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#4A90E2');
      headerRange.setFontColor('#FFFFFF');
      headerRange.setFontWeight('bold');
      headerRange.setHorizontalAlignment('center');
      
      sheet.setFrozenRows(1);
      
      // 調整欄寬
      for (let i = 1; i <= headers.length; i++) {
        sheet.setColumnWidth(i, 150);
      }
    }
    
    Logger.log(`✅ 工作表「${sheetName}」已建立`);
  }
  
  return sheet;
}