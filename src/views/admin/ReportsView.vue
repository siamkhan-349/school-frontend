<template>
  <div class="page">
    <h1 class="page__title">Reports</h1>

    <div class="stat-grid">
      <AppCard title="Students">
        <strong class="stat">{{ students.length }}</strong>
      </AppCard>
      <AppCard title="Teachers">
        <strong class="stat">{{ teachers.length }}</strong>
      </AppCard>
      <AppCard title="Total Dues (৳)">
        <strong class="stat">{{ totalDues }}</strong>
      </AppCard>
      <AppCard title="Pass Rate (latest published)">
        <strong class="stat">{{ passRate }}%</strong>
      </AppCard>
    </div>

    <div class="grid">
      <AppCard title="Students per Class">
        <Bar v-if="studentsChart" :data="studentsChart" :options="chartOptions" />
        <p v-else class="muted">No data.</p>
      </AppCard>
      <AppCard title="Dues per Class (৳)">
        <Bar v-if="duesChart" :data="duesChart" :options="chartOptions" />
        <p v-else class="muted">No dues.</p>
      </AppCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import AppCard from '@/components/common/AppCard.vue'
import { useChartPalette } from '@/composables/useChartPalette'
import { useClasses, useExams, useResultEntries, useStudents, useTeachers } from '@/composables/useQueries'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const { palette } = useChartPalette()

const { data: studentData } = useStudents({ perPage: 500 })
const students = computed(() => studentData.value?.data.items ?? [])
const { data: teacherData } = useTeachers({ perPage: 500 })
const teachers = computed(() => teacherData.value?.data.items ?? [])
const { data: classData } = useClasses()
const classes = computed(() => classData.value?.data ?? [])

const totalDues = computed(() => students.value.reduce((sum, s) => sum + s.dueAmount, 0))

const studentsChart = computed(() => {
  if (classes.value.length === 0) return null
  return {
    labels: classes.value.map((c) => c.label),
    datasets: [
      {
        data: classes.value.map((c) => students.value.filter((s) => s.classId === c.id).length),
        backgroundColor: palette.value.primary,
        borderRadius: 8,
      },
    ],
  }
})

const duesChart = computed(() => {
  const withDues = classes.value.filter((c) =>
    students.value.some((s) => s.classId === c.id && s.dueAmount > 0),
  )
  if (withDues.length === 0) return null
  return {
    labels: withDues.map((c) => c.label),
    datasets: [
      {
        data: withDues.map((c) =>
          students.value.filter((s) => s.classId === c.id).reduce((sum, s) => sum + s.dueAmount, 0),
        ),
        backgroundColor: palette.value.warning,
        borderRadius: 8,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
}

// Pass rate of the most recently published exam with entered marks
const { data: examData } = useExams({ perPage: 500 })
const latestPublished = computed(() =>
  (examData.value?.data.items ?? []).find((e) => e.status === 'published'),
)
const { data: entriesData } = useResultEntries(() => latestPublished.value?.id ?? '')
const passRate = computed(() => {
  const entered = (entriesData.value?.data ?? []).filter((r) => r.entered)
  if (entered.length === 0 || !latestPublished.value) return 0
  const pass = latestPublished.value.passMarks
  return Math.round((entered.filter((r) => r.marksObtained >= pass).length / entered.length) * 100)
})
</script>

<style scoped>
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-lg);
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}
.stat {
  font-size: var(--font-size-2xl);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--spacing-md);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
</style>
