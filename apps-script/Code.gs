const FILE_NAME_SUFFIX = '健康能力紀錄'

const API_KEY = 'HealthOS_2026_3K9_Lp8mQ'

// 依欄位標題尋找位置，不再把欄號寫死。
// 這樣舊月份的「備註」在第 31 欄、新月份在第 34 欄，也能正確讀寫。
const HEADER_MAP = {
  date: ['日期'],
  weight: ['體重'],
  bodyFatPercent: ['體脂肪 (%)'],
  bodyFatKg: ['體脂肪 (kg)'],
  subcutaneousFatPercent: ['皮下脂肪 (%)'],
  armFatPercent: ['雙臂 (%)'],
  trunkFatPercent: ['身軀 (%)'],
  legFatPercent: ['雙腳 (%)'],
  skeletalMusclePercent: ['骨骼肌 (%)'],
  skeletalMuscleKg: ['骨骼肌 (kg)'],
  armMusclePercent: ['雙臂 (%)'],
  trunkMusclePercent: ['身軀 (%)'],
  legMusclePercent: ['雙腳 (%)'],
  visceralFatLevel: ['內臟脂肪等級'],
  bmr: ['基礎代謝'],
  bodyAge: ['身體年齡'],
  bmi: ['BMI'],
  waistCm: ['腰圍 (cm)'],
  sleepTime: ['睡眠時間'],
  vo2Max: ['VO₂ Max'],
  hrv: ['HRV (七日/夜間)'],
  restingHeartRate: ['靜止心率'],
  firstMealTime: ['第一口時間'],
  lastMealTime: ['最後一口時間'],
  proteinG: ['蛋白質 (g)'],
  waterL: ['喝水 (L)'],
  steps: ['步數'],
  stairs: ['樓梯'],
  plankSeconds: ['棒式 (秒)'],
  squat: ['深蹲'],
  activityType: ['運動類型'],
  activityMinutes: ['運動時間 (分)'],
  dailyFatigue: ['整日疲勞感'],
  note: ['備註'],
}

const FORMAT_MAP = {
  restingHeartRate: 'bpm',
  stairs: 'F',
}

function doGet(e) {
  try {
    var apiKey = e.parameter.apiKey

    if (apiKey !== API_KEY) {
      throw new Error('金鑰錯誤，無法讀取資料。')
    }

    var year = Number(e.parameter.year)
    var month = Number(e.parameter.month)
    var day = Number(e.parameter.day)
    var result = readHealthRecord(year, month, day)

    return jsonResponse({
      ok: true,
      target: result.target,
      row: result.row,
      values: result.values,
    })
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message })
  }
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents)

    if (payload.apiKey !== API_KEY) {
      throw new Error('金鑰錯誤，無法寫入資料。')
    }

    var result = writeHealthRecord(payload)

    return jsonResponse({
      ok: true,
      target: result.target,
      row: result.row,
    })
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message })
  }
}

function readHealthRecord(year, month, day) {
  if (!year || !month || !day) throw new Error('日期資料不完整。')

  var spreadsheet = getSpreadsheetByYear(year)
  var sheetName = String(month).padStart(2, '0') + '月'
  var sheet = spreadsheet.getSheetByName(sheetName)

  if (!sheet) throw new Error('找不到工作表：' + sheetName)

  var columns = getColumnMap(sheet)
  var row = findRowByDay(sheet, day, columns.date)
  var values = {}

  Object.keys(HEADER_MAP).forEach(function(key) {
    if (key === 'date' || !columns[key]) return

    var displayValue = sheet.getRange(row, columns[key]).getDisplayValue()
    if (displayValue !== '') values[key] = displayValue
  })

  return {
    target: year + ' ' + FILE_NAME_SUFFIX + ' / ' + sheetName + ' / ' + day + '日',
    row: row,
    values: values,
  }
}

function writeHealthRecord(payload) {
  var year = Number(payload.year)
  var month = Number(payload.month)
  var day = Number(payload.day)
  var values = payload.values || {}

  if (!year || !month || !day) throw new Error('日期資料不完整。')

  var spreadsheet = getSpreadsheetByYear(year)
  var sheetName = String(month).padStart(2, '0') + '月'
  var sheet = spreadsheet.getSheetByName(sheetName)

  if (!sheet) throw new Error('找不到工作表：' + sheetName)

  var columns = getColumnMap(sheet)
  var row = findRowByDay(sheet, day, columns.date)

  Object.keys(HEADER_MAP).forEach(function(key) {
    if (key === 'date') return

    var value = values[key]
    if (value === undefined || value === '') return

    if (!columns[key]) {
      throw new Error('「' + sheetName + '」缺少欄位：' + HEADER_MAP[key][0])
    }

    sheet.getRange(row, columns[key]).setValue(formatValue(key, value))
  })

  return {
    target: year + ' ' + FILE_NAME_SUFFIX + ' / ' + sheetName + ' / ' + day + '日',
    row: row,
  }
}

function getColumnMap(sheet) {
  var lastColumn = sheet.getLastColumn()
  var headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
  var columns = {}

  // 「雙臂／身軀／雙腳」各出現兩次，依現有表格順序處理。
  var duplicateOffsets = {
    armFatPercent: 0,
    trunkFatPercent: 0,
    legFatPercent: 0,
    armMusclePercent: 1,
    trunkMusclePercent: 1,
    legMusclePercent: 1,
  }

  Object.keys(HEADER_MAP).forEach(function(key) {
    var aliases = HEADER_MAP[key]
    var matches = []

    headers.forEach(function(header, index) {
      if (aliases.indexOf(String(header).trim()) !== -1) matches.push(index + 1)
    })

    var offset = duplicateOffsets[key] || 0
    if (matches[offset]) columns[key] = matches[offset]
  })

  if (!columns.date) throw new Error('找不到「日期」欄位。')
  return columns
}

function formatValue(key, value) {
  var unit = FORMAT_MAP[key]
  if (!unit) return value

  var text = String(value).trim()
  var unitPattern = new RegExp('\\s*' + unit + '$', 'i')
  return unitPattern.test(text) ? text : text + ' ' + unit
}

function getSpreadsheetByYear(year) {
  var fileName = year + ' ' + FILE_NAME_SUFFIX
  var files = DriveApp.getFilesByName(fileName)

  if (!files.hasNext()) throw new Error('找不到檔案：' + fileName)

  var file = files.next()
  return SpreadsheetApp.openById(file.getId())
}

function findRowByDay(sheet, day, dateColumn) {
  var lastRow = sheet.getLastRow()
  var dateValues = sheet.getRange(1, dateColumn, lastRow, 1).getValues()
  var displayValues = sheet.getRange(1, dateColumn, lastRow, 1).getDisplayValues()

  for (var i = 0; i < dateValues.length; i += 1) {
    var cellValue = dateValues[i][0]
    var displayValue = String(displayValues[i][0]).trim()

    if (cellValue instanceof Date && cellValue.getDate() === day) return i + 1
    if (displayValue.indexOf(day + '日') !== -1) return i + 1
    if (displayValue === String(day)) return i + 1
  }

  throw new Error('找不到 ' + day + ' 日對應列。')
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}
