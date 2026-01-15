// Constants.gs - 系統常數定義（完整版 - 含所有假別）

// ==================== LINE 登入設定 ====================
const LINE_CHANNEL_ID     = PropertiesService.getScriptProperties().getProperty("LINE_CHANNEL_ID");
const LINE_CHANNEL_SECRET = PropertiesService.getScriptProperties().getProperty("LINE_CHANNEL_SECRET");
const LINE_REDIRECT_URL   = "https://eric693.github.io/WY_check_manager/";

// ==================== Session 設定 ====================
const SESSION_TTL_MS = 7000 * 60 * 60 * 24; // 1 天
const TOKEN_LENGTH   = 36;

// ==================== 工作表名稱 ====================
// 基礎系統
const SHEET_EMPLOYEES  = '員工名單';
const SHEET_ATTENDANCE = '打卡紀錄';
const SHEET_SESSION    = 'Session';
const SHEET_LOCATIONS  = '打卡地點表';
const SHEET_ADJUST_PUNCH  = "補打卡申請";
// 加班系統
const SHEET_OVERTIME_RECORDS = '加班紀錄';

// 請假系統
const SHEET_LEAVE_RECORDS = '請假紀錄';
const SHEET_LEAVE_BALANCE = '員工假期額度';

const SHEET_REIMBURSEMENT_INVOICES = '報銷單據';  // ⭐ 放在最後

// ==================== ⭐ 報銷單據工作表欄位索引（12 個欄位）====================
const INVOICE_COL = {
  INVOICE_ID: 0,        // A 欄：單據ID
  REIMB_ID: 1,          // B 欄：報銷ID
  EMPLOYEE_ID: 2,       // C 欄：員工ID
  EMPLOYEE_NAME: 3,     // D 欄：員工姓名
  INVOICE_NUMBER: 4,    // E 欄：發票號碼
  INVOICE_DATE: 5,      // F 欄：發票日期
  INVOICE_TIME: 6,      // G 欄：發票時間
  AMOUNT: 7,            // H 欄：金額
  STORE_NAME: 8,        // I 欄：店家名稱
  SELLER_TAX_ID: 9,     // J 欄：賣方統編
  RANDOM_CODE: 10,      // K 欄：隨機碼
  PERIOD: 11            // L 欄：期別
};

// ==================== ⭐ 報銷單據標題列（12 個欄位）====================
const INVOICE_HEADERS = [
  '單據ID',         // A
  '報銷ID',         // B
  '員工ID',         // C
  '員工姓名',       // D
  '發票號碼',       // E
  '發票日期',       // F
  '發票時間',       // G
  '金額',           // H
  '店家名稱',       // I
  '賣方統編',       // J
  '隨機碼',         // K
  '期別'            // L
];

// ==================== 員工資料表欄位索引 ====================
const EMPLOYEE_COL = {
  USER_ID: 0,      // A 欄：userId
  EMAIL: 1,        // B 欄：email
  NAME: 2,         // C 欄：displayName
  PICTURE: 3,      // D 欄：pictureUrl
  CREATED: 4,      // E 欄：建立時間
  DEPT: 5,         // F 欄：部門
  HIRE_DATE: 6,    // G 欄：到職日期
  STATUS: 7        // H 欄：狀態
};

// ==================== 假期類型定義（完整版）====================
const LEAVE_TYPES = {
  // 1. 特休假
  ANNUAL_LEAVE: {
    code: 'ANNUAL_LEAVE',
    name: '特休假',
    maxDays: null,  // 根據年資計算
    isPaid: true,
    requiresProof: false,
    category: 'paid'
  },
  
  // 2. 加班補休假
  COMP_TIME_OFF: {
    code: 'COMP_TIME_OFF',
    name: '加班補休假',
    maxDays: null,  // 根據加班時數
    isPaid: true,
    requiresProof: false,
    category: 'paid'
  },
  
  // 3. 事假
  PERSONAL_LEAVE: {
    code: 'PERSONAL_LEAVE',
    name: '事假',
    maxDays: 14,
    isPaid: false,
    requiresProof: false,
    category: 'unpaid'
  },
  
  // 4. 未住院病假
  SICK_LEAVE: {
    code: 'SICK_LEAVE',
    name: '未住院病假',
    maxDays: 30,
    isPaid: true,   // 半薪（30天內）
    requiresProof: true,
    category: 'paid'
  },
  
  // 5. 住院病假
  HOSPITALIZATION_LEAVE: {
    code: 'HOSPITALIZATION_LEAVE',
    name: '住院病假',
    maxDays: 30,    // 一年內合計不得超過30天
    isPaid: true,   // 半薪
    requiresProof: true,
    category: 'paid'
  },
  
  // 6. 喪假
  BEREAVEMENT_LEAVE: {
    code: 'BEREAVEMENT_LEAVE',
    name: '喪假',
    maxDays: 0,  // 依親屬關係而定
    isPaid: true,
    requiresProof: true,
    category: 'paid'
  },
  
  // 7. 婚假
  MARRIAGE_LEAVE: {
    code: 'MARRIAGE_LEAVE',
    name: '婚假',
    maxDays: 8,
    isPaid: true,
    requiresProof: true,
    category: 'paid'
  },
  
  // 8. 陪產檢及陪產假
  PATERNITY_LEAVE: {
    code: 'PATERNITY_LEAVE',
    name: '陪產檢及陪產假',
    maxDays: 7,     // 7天（含陪產檢假5天 + 陪產假2天）
    isPaid: true,
    requiresProof: true,
    category: 'paid'
  },
  
  // 9. 產假
  MATERNITY_LEAVE: {
    code: 'MATERNITY_LEAVE',
    name: '產假',
    maxDays: 56,    // 8週
    isPaid: true,
    requiresProof: true,
    category: 'paid'
  },
  
  // 10. 公假（含兵役假）
  OFFICIAL_LEAVE: {
    code: 'OFFICIAL_LEAVE',
    name: '公假（含兵役假）',
    maxDays: null,  // 無上限
    isPaid: true,
    requiresProof: true,
    category: 'paid'
  },
  
  // 11. 公傷假
  WORK_INJURY_LEAVE: {
    code: 'WORK_INJURY_LEAVE',
    name: '公傷假',
    maxDays: null,  // 無上限
    isPaid: true,   // 全薪
    requiresProof: true,
    category: 'paid'
  },
  
  // 12. 曠工
  ABSENCE_WITHOUT_LEAVE: {
    code: 'ABSENCE_WITHOUT_LEAVE',
    name: '曠工',
    maxDays: null,
    isPaid: false,
    requiresProof: false,
    category: 'unpaid',
    isNegative: true  // 負面記錄
  },
  
  // 13. 天然災害停班
  NATURAL_DISASTER_LEAVE: {
    code: 'NATURAL_DISASTER_LEAVE',
    name: '天然災害停班',
    maxDays: null,
    isPaid: true,
    requiresProof: false,
    category: 'paid'
  },
  
  // 14. 家庭照顧假
  FAMILY_CARE_LEAVE: {
    code: 'FAMILY_CARE_LEAVE',
    name: '家庭照顧假',
    maxDays: 7,
    isPaid: false,
    requiresProof: false,
    category: 'unpaid'
  },
  
  // 15. 生理假
  MENSTRUAL_LEAVE: {
    code: 'MENSTRUAL_LEAVE',
    name: '生理假',
    maxDays: 12,  // 每月1天
    isPaid: true,  // 半薪
    requiresProof: false,
    category: 'paid'
  }
};

// ==================== 喪假天數對照表 ====================
const BEREAVEMENT_DAYS = {
  '父母': 8,
  '配偶': 8,
  '養父母': 8,
  '繼父母': 8,
  '子女': 8,
  '配偶父母': 6,
  '配偶養父母': 6,
  '配偶繼父母': 6,
  '祖父母': 6,
  '配偶祖父母': 3,
  '曾祖父母': 3,
  '兄弟姊妹': 3
};

// ==================== 特休假計算規則（台灣勞基法）====================
const ANNUAL_LEAVE_RULES = [
  { minMonths: 0, maxMonths: 6, days: 0, description: '未滿6個月' },
  { minMonths: 6, maxMonths: 12, days: 3, description: '6個月以上未滿1年' },
  { minYears: 1, maxYears: 2, days: 7, description: '1年以上未滿2年' },
  { minYears: 2, maxYears: 3, days: 10, description: '2年以上未滿3年' },
  { minYears: 3, maxYears: 5, days: 14, description: '3年以上未滿5年' },
  { minYears: 5, maxYears: 10, days: 15, description: '5年以上未滿10年' },
  { minYears: 10, maxYears: 999, days: 15, extraPerYear: 1, maxDays: 30, description: '10年以上' }
];

// ==================== 請假狀態 ====================
const LEAVE_STATUS = {
  PENDING: 'PENDING',      // 待審核
  APPROVED: 'APPROVED',    // 已核准
  REJECTED: 'REJECTED',    // 已拒絕
  CANCELLED: 'CANCELLED'   // 已取消
};

// ==================== 系統設定 ====================
const LEAVE_SYSTEM_CONFIG = {
  allowViewOthersLeave: false,
  allowFutureLeave: true,
  advanceNoticeDays: 0,
  allowHalfDay: true,
  allowNegativeBalance: false
};

// ==================== 工具函數 ====================

/**
 * 取得假期類型資訊
 */
function getLeaveTypeInfo(leaveTypeCode) {
  return LEAVE_TYPES[leaveTypeCode] || null;
}

/**
 * 取得所有假期類型列表（按順序）
 */
function getAllLeaveTypes() {
  return [
    'ANNUAL_LEAVE',
    'COMP_TIME_OFF',
    'PERSONAL_LEAVE',
    'SICK_LEAVE',
    'HOSPITALIZATION_LEAVE',
    'BEREAVEMENT_LEAVE',
    'MARRIAGE_LEAVE',
    'PATERNITY_LEAVE',
    'MATERNITY_LEAVE',
    'OFFICIAL_LEAVE',
    'WORK_INJURY_LEAVE',
    'ABSENCE_WITHOUT_LEAVE',
    'NATURAL_DISASTER_LEAVE',
    'FAMILY_CARE_LEAVE',
    'MENSTRUAL_LEAVE'
  ];
}

/**
 * 取得當前年度
 */
function getCurrentLeaveYear() {
  return new Date().getFullYear();
}

/**
 * 檢查是否為管理員
 */
function isAdmin(user) {
  return user && user.dept === '管理員';
}

/**
 * 格式化日期
 */
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ==================== 系統版本資訊 ====================
const SYSTEM_VERSION = {
  version: '0.8.0',
  buildDate: '2025-12-13',
  features: [
    '打卡系統',
    '補打卡審核',
    '打卡紀錄',
    '地點管理',
    '加班管理',
    '請假管理（15種假別）'
  ]
};


// ==================== 🧪 測試函數 ====================

/**
 * 🧪 測試建立報銷單據工作表（12 欄位版）
 */
function testCreateReimbursementInvoiceSheet() {
  Logger.log('🧪 測試建立報銷單據工作表（12 欄位版）');
  Logger.log('═══════════════════════════════════════');
  Logger.log('');
  
  Logger.log('1️⃣ 檢查常數值');
  Logger.log('   SHEET_REIMBURSEMENT_INVOICES = ' + SHEET_REIMBURSEMENT_INVOICES);
  Logger.log('   INVOICE_HEADERS 欄位數: ' + INVOICE_HEADERS.length);
  Logger.log('');
  
  if (SHEET_REIMBURSEMENT_INVOICES === undefined) {
    Logger.log('❌ 常數未定義，測試中止');
    return;
  }
  
  Logger.log('2️⃣ 嘗試建立工作表（12 個欄位）');
  Logger.log('   標題列: ' + INVOICE_HEADERS.join(', '));
  Logger.log('');
  
  try {
    const sheet = getOrCreateSheet(SHEET_REIMBURSEMENT_INVOICES, INVOICE_HEADERS);
    
    Logger.log('');
    Logger.log('✅ 工作表建立成功');
    Logger.log('   工作表名稱: ' + sheet.getName());
    Logger.log('   工作表 ID: ' + sheet.getSheetId());
    Logger.log('   欄位數量: ' + sheet.getLastColumn());
    
    Logger.log('');
    Logger.log('═══════════════════════════════════════');
    Logger.log('✅✅✅ 測試成功！');
    
  } catch (error) {
    Logger.log('');
    Logger.log('❌ 錯誤發生');
    Logger.log('   錯誤訊息: ' + error.message);
    Logger.log('   錯誤堆疊: ' + error.stack);
    Logger.log('═══════════════════════════════════════');
  }
}

/**
 * 📋 顯示報銷單據欄位對照表
 */
function showInvoiceColumnMapping() {
  Logger.log('📋 報銷單據欄位對照表（12 欄位）');
  Logger.log('═══════════════════════════════════════');
  Logger.log('');
  
  INVOICE_HEADERS.forEach((header, index) => {
    const columnLetter = String.fromCharCode(65 + index);  // A, B, C...
    Logger.log(`${columnLetter} 欄 (索引 ${index}): ${header}`);
  });
  
  Logger.log('');
  Logger.log('═══════════════════════════════════════');
  Logger.log(`📊 總計: ${INVOICE_HEADERS.length} 個欄位`);
}