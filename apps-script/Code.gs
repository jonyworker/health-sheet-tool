const FILE_NAME_SUFFIX = '健康能力紀錄'

const API_KEY = 'HealthOS_2026_3K9_Lp8mQ'

const COLUMN_MAP = {
  date: 1,
  weight: 2,
  bodyFatPercent: 3,
  bodyFatKg: 4,
  subcutaneousFatPercent: 5,
  armFatPercent: 6,
  trunkFatPercent: 7,
  legFatPercent: 8,
  skeletalMusclePercent: 9,
  skeletalMuscleKg: 10,
  armMusclePercent: 11,
  trunkMusclePercent: 12,
  legMusclePercent: 13,
  visceralFatLevel: 14,
  bmr: 15,
  bodyAge: 16,
  bmi: 17,
  waistCm: 18,
  sleepTime: 19,
  vo2Max: 20,
  hrv: 21,
  restingHeartRate: 22,
  firstMealTime: 23,
  lastMealTime: 24,
  proteinG: 25,
  waterL: 26,
  steps: 27,
  stairs: 28,
  plankSeconds: 29,
  squat: 30,
  note: 31,
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
    return jsonResponse({
      ok: false,
      message: error.message,
    })
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
    return jsonResponse({
      ok: false,
      message: error.message,
    })
  }
}

function readHealthRecord(year, month, day) {
  if (!year || !month || !day) {
    throw new Error('日期資料不完整。')
  }

  var spreadsheet = getSpreadsheetByYear(year)
  var sheetName = String(month).padStart(2, '0') + '月'
  var sheet = spreadsheet.getSheetByName(sheetName)

  if (!sheet) {
    throw new Error('找不到工作表：' + sheetName)
  }

  var row = findRowByDay(sheet, day)
  var values = {}

  Object.keys(COLUMN_MAP).forEach(function(key) {
    if (key === 'date') return

    var column = COLUMN_MAP[key]
    var displayValue = sheet.getRange(row, column).getDisplayValue()

    if (displayValue !== '') {
      values[key] = displayValue
    }
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

  if (!year || !month || !day) {
    throw new Error('日期資料不完整。')
  }

  var spreadsheet = getSpreadsheetByYear(year)
  var sheetName = String(month).padStart(2, '0') + '月'
  var sheet = spreadsheet.getSheetByName(sheetName)

  if (!sheet) {
    throw new Error('找不到工作表：' + sheetName)
  }

  var row = findRowByDay(sheet, day)

  Object.keys(COLUMN_MAP).forEach(function(key) {
    if (key === 'date') return

    var column = COLUMN_MAP[key]
    var value = values[key]

    if (value !== undefined && value !== '') {
      value = formatValue(key, value)
      sheet.getRange(row, column).setValue(value)
    }
  })

  return {
    target: year + ' ' + FILE_NAME_SUFFIX + ' / ' + sheetName + ' / ' + day + '日',
    row: row,
  }
}

function formatValue(key, value) {
  var unit = FORMAT_MAP[key]

  if (!unit) {
    return value
  }

  return value + ' ' + unit
}

function getSpreadsheetByYear(year) {
  var fileName = year + ' ' + FILE_NAME_SUFFIX
  var files = DriveApp.getFilesByName(fileName)

  if (!files.hasNext()) {
    throw new Error('找不到檔案：' + fileName)
  }

  var file = files.next()
  return SpreadsheetApp.openById(file.getId())
}

function findRowByDay(sheet, day) {
  var lastRow = sheet.getLastRow()
  var dateValues = sheet.getRange(1, 1, lastRow, 1).getValues()
  var displayValues = sheet.getRange(1, 1, lastRow, 1).getDisplayValues()

  for (var i = 0; i < dateValues.length; i += 1) {
    var cellValue = dateValues[i][0]
    var displayValue = String(displayValues[i][0]).trim()

    if (cellValue instanceof Date && cellValue.getDate() === day) {
      return i + 1
    }

    if (displayValue.indexOf(day + '日') !== -1) {
      return i + 1
    }

    if (displayValue === String(day)) {
      return i + 1
    }
  }

  throw new Error('找不到 ' + day + ' 日對應列。')
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}

function testDate() {
  var ss = SpreadsheetApp.openById('163gctf2yB_4-UyWpeKSaFKnbP63N37rUuDYs3B8gdIQ')
  var sheet = ss.getSheetByName('06月')
  var values = sheet.getRange(2, 1, 10, 1).getValues()
  Logger.log(values)
}