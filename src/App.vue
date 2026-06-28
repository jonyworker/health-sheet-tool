<script setup>
import { computed, reactive, ref, watch } from 'vue'

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx_WF69z-_BInHf_5vT4SbsAMtagqYcQiucsxvM14jIlRuug6MlHX_Q6AOlHTGa_zjs/exec'

const today = new Date()
const yyyy = today.getFullYear()
const mm = String(today.getMonth() + 1).padStart(2, '0')
const dd = String(today.getDate()).padStart(2, '0')

const form = reactive({
  date: `${yyyy}-${mm}-${dd}`,
  weight: '',
  bodyFatPercent: '',
  bodyFatKg: '',
  subcutaneousFatPercent: '',
  armFatPercent: '',
  trunkFatPercent: '',
  legFatPercent: '',
  skeletalMusclePercent: '',
  skeletalMuscleKg: '',
  armMusclePercent: '',
  trunkMusclePercent: '',
  legMusclePercent: '',
  visceralFatLevel: '',
  bmr: '',
  bodyAge: '',
  bmi: '',
  waistCm: '',
  sleepTime: '',
  vo2Max: '',
  hrv: '',
  restingHeartRate: '',
  firstMealTime: '',
  lastMealTime: '',
  proteinG: '',
  waterL: '',
  steps: '',
  stairs: '',
  plankSeconds: '',
  squat: '',
  note: '',
})

const status = ref('idle')
const message = ref('')
const existingValues = ref({})
const isCheckingExisting = ref(false)
const hasLoadedExistingRecord = ref(false)

const formKeys = Object.keys(form).filter((key) => key !== 'date')

const dateParts = computed(() => {
  const [year, month, day] = form.date.split('-')
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
  }
})

const targetInfo = computed(() => {
  if (!form.date) return '尚未選擇日期'
  const { year, month, day } = dateParts.value
  return `${year} 健康能力紀錄 / ${String(month).padStart(2, '0')}月 / ${day}日`
})

const existingCount = computed(() => Object.keys(existingValues.value).length)

const sections = [
  {
    title: '每日核心紀錄',
    description: '每天最常填的資料，先讓紀錄這件事變輕。',
    fields: [
      { key: 'date', label: '日期', type: 'date' },
      { key: 'waistCm', label: '腰圍', unit: 'cm' },
      { key: 'sleepTime', label: '睡眠時間', placeholder: '例如 7h30m' },
      { key: 'proteinG', label: '蛋白質', unit: 'g' },
      { key: 'waterL', label: '喝水', unit: 'L' },
      { key: 'steps', label: '步數' },
      { key: 'stairs', label: '樓梯', placeholder: '輸入 7，寫入時會變成 7 F' },
      { key: 'plankSeconds', label: '棒式', unit: '秒' },
      { key: 'squat', label: '深蹲' },
      { key: 'firstMealTime', label: '第一口時間', type: 'time' },
      { key: 'lastMealTime', label: '最後一口時間', type: 'time' },
    ],
  },
  {
    title: 'Garmin / 健康指標',
    description: '不用每天硬填，有資料再補就好。',
    fields: [
      { key: 'vo2Max', label: 'VO₂ Max' },
      { key: 'hrv', label: 'HRV（七日/夜間）' },
      { key: 'restingHeartRate', label: '靜止心率', placeholder: '輸入 65，寫入時會變成 65 bpm' },
    ],
  },
  {
    title: '體脂計詳細資料',
    description: '像把身體儀表板打開，偶爾補齊即可。',
    fields: [
      { key: 'weight', label: '體重', unit: 'kg' },
      { key: 'bodyFatPercent', label: '體脂肪', unit: '%' },
      { key: 'bodyFatKg', label: '體脂肪', unit: 'kg' },
      { key: 'subcutaneousFatPercent', label: '皮下脂肪', unit: '%' },
      { key: 'armFatPercent', label: '雙臂脂肪', unit: '%' },
      { key: 'trunkFatPercent', label: '身軀脂肪', unit: '%' },
      { key: 'legFatPercent', label: '雙腳脂肪', unit: '%' },
      { key: 'skeletalMusclePercent', label: '骨骼肌', unit: '%' },
      { key: 'skeletalMuscleKg', label: '骨骼肌', unit: 'kg' },
      { key: 'armMusclePercent', label: '雙臂骨骼肌', unit: '%' },
      { key: 'trunkMusclePercent', label: '身軀骨骼肌', unit: '%' },
      { key: 'legMusclePercent', label: '雙腳骨骼肌', unit: '%' },
      { key: 'visceralFatLevel', label: '內臟脂肪等級' },
      { key: 'bmr', label: '基礎代謝' },
      { key: 'bodyAge', label: '身體年齡' },
      { key: 'bmi', label: 'BMI' },
    ],
  },
]

function buildPayload() {
  return {
    apiKey: import.meta.env.VITE_API_KEY,
    ...dateParts.value,
    values: { ...form },
  }
}

function clearFormValues() {
  formKeys.forEach((key) => {
    form[key] = ''
  })
}

function normalizeValueFromSheet(key, value) {
  if (value === null || value === undefined) return ''

  const textValue = String(value).trim()

  if (key === 'restingHeartRate') {
    return textValue.replace(/\s*bpm$/i, '').trim()
  }

  if (key === 'stairs') {
    return textValue.replace(/\s*F$/i, '').trim()
  }

  return textValue
}

function fillFormFromExistingValues(values) {
  Object.entries(values).forEach(([key, value]) => {
    if (key in form && key !== 'date') {
      form[key] = normalizeValueFromSheet(key, value)
    }
  })
}

async function fetchExistingRecord() {
  if (!form.date || !APPS_SCRIPT_URL.startsWith('https://script.google.com/')) {
    existingValues.value = {}
    hasLoadedExistingRecord.value = false
    return
  }

  isCheckingExisting.value = true
  existingValues.value = {}
  hasLoadedExistingRecord.value = false
  clearFormValues()

  try {
    const params = new URLSearchParams({
      apiKey: import.meta.env.VITE_API_KEY,
      year: String(dateParts.value.year),
      month: String(dateParts.value.month),
      day: String(dateParts.value.day),
    })

    const response = await fetch(`${APPS_SCRIPT_URL}?${params.toString()}`)
    const result = await response.json()

    if (!response.ok || !result.ok) {
      throw new Error(result.message || '讀取既有資料失敗')
    }

    existingValues.value = result.values || {}

    if (Object.keys(existingValues.value).length > 0) {
      fillFormFromExistingValues(existingValues.value)
      hasLoadedExistingRecord.value = true
    }
  } catch (error) {
    existingValues.value = {}
    hasLoadedExistingRecord.value = false
  } finally {
    isCheckingExisting.value = false
  }
}

async function submitForm() {
  if (!form.date) {
    message.value = '請先選擇日期。'
    status.value = 'error'
    return
  }

  if (!APPS_SCRIPT_URL.startsWith('https://script.google.com/')) {
    message.value = '請先在 src/App.vue 貼上 Google Apps Script Web App URL。'
    status.value = 'error'
    return
  }

  if (existingCount.value > 0) {
    const confirmed = window.confirm(
      `這一天目前已有 ${existingCount.value} 個欄位有資料，已自動載入到表單。\n\n送出後會以目前表單內容更新 Google Sheets。\n\n確定要送出嗎？`
    )

    if (!confirmed) return
  }

  status.value = 'loading'
  message.value = '正在寫入 Google Sheets...'

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(buildPayload()),
    })

    const result = await response.json()

    if (!response.ok || !result.ok) {
      throw new Error(result.message || '寫入失敗')
    }

    status.value = 'success'
    message.value = `已寫入：${result.target}`

    await fetchExistingRecord()
  } catch (error) {
    status.value = 'error'
    message.value = error.message || '寫入失敗，請稍後再試。'
  }
}

watch(
  () => form.date,
  () => {
    fetchExistingRecord()
  },
  { immediate: true }
)
</script>

<template>
  <main class="min-h-screen px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-5xl">
      <header class="mb-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p class="text-sm font-medium text-slate-500">Health OS</p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight">健康能力紀錄工具</h1>
        <p class="mt-3 max-w-2xl text-slate-600">
          輸入日期後，系統會自動尋找「年份 健康能力紀錄」這份 Google Sheets，並寫入對應月份分頁。
        </p>

        <div class="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          目前目標：<span class="font-semibold text-slate-950">{{ targetInfo }}</span>
        </div>

        <div
          v-if="isCheckingExisting"
          class="mt-3 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-700"
        >
          正在讀取這一天的既有資料...
        </div>

        <div
          v-else-if="hasLoadedExistingRecord"
          class="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700"
        >
          已載入這一天的既有資料，共 {{ existingCount }} 個欄位。修改後送出會更新 Google Sheets。
        </div>

        <div
          v-else
          class="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          這一天目前沒有既有資料，可以安心新增。
        </div>
      </header>

      <form class="space-y-6" @submit.prevent="submitForm">
        <section
          v-for="section in sections"
          :key="section.title"
          class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
        >
          <div class="mb-5">
            <h2 class="text-xl font-semibold">{{ section.title }}</h2>
            <p class="mt-1 text-sm text-slate-500">{{ section.description }}</p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label v-for="field in section.fields" :key="field.key" class="block">
              <span class="mb-1.5 block text-sm font-medium text-slate-700">
                {{ field.label }}
              </span>

              <div class="relative">
                <input
                  v-model="form[field.key]"
                  :type="field.type || 'text'"
                  :placeholder="field.placeholder || ''"
                  class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
                />

                <span
                  v-if="field.unit"
                  class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-slate-400"
                >
                  {{ field.unit }}
                </span>
              </div>
            </label>
          </div>
        </section>

        <section class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-slate-700">備註</span>
            <textarea
              v-model="form.note"
              rows="4"
              placeholder="例如：今天走完一萬步後加爬樓梯，棒式 30 秒。"
              class="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-200"
            />
          </label>
        </section>

        <div class="sticky bottom-4 rounded-3xl bg-white/90 p-4 shadow-lg ring-1 ring-slate-200 backdrop-blur">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p
              v-if="message"
              class="text-sm"
              :class="{
                'text-slate-600': status === 'loading' || status === 'idle',
                'text-emerald-700': status === 'success',
                'text-rose-700': status === 'error',
              }"
            >
              {{ message }}
            </p>

            <p v-else class="text-sm text-slate-500">
              準備寫入：{{ targetInfo }}
            </p>

            <button
              type="submit"
              :disabled="status === 'loading'"
              class="rounded-2xl bg-slate-950 px-6 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {{ status === 'loading' ? '寫入中...' : '送出紀錄' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </main>
</template>