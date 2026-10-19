<template>
  <div class="page">
    <h1 class="page__title">Platform Dashboard</h1>
    <div class="stat-grid">
      <AppCard title="Students">
        <strong class="stat">{{ students.length }}</strong>
      </AppCard>
      <AppCard v-if="school.hasModule('staff')" title="Teachers">
        <strong class="stat">{{ teachers.length }}</strong>
      </AppCard>
      <AppCard v-if="school.hasModule('payment')" title="Collected (৳)">
        <strong class="stat">{{ collected }}</strong>
      </AppCard>
      <AppCard v-if="school.hasModule('payment')" title="Outstanding Dues (৳)">
        <strong class="stat">{{ dues }}</strong>
      </AppCard>
      <AppCard title="Modules Enabled">
        <strong class="stat">{{ enabledCount }}/{{ MODULE_CATALOG.length }}</strong>
      </AppCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/common/AppCard.vue'
import { MODULE_CATALOG } from '@/constants/modules'
import { usePayments, useSettings, useStudents, useTeachers } from '@/composables/useQueries'
import { useSchoolStore } from '@/stores/school'

const school = useSchoolStore()
const { data: studentData } = useStudents({ perPage: 500 })
const students = computed(() => studentData.value?.data.items ?? [])
const { data: teacherData } = useTeachers({ perPage: 500 }, () => school.hasModule('staff'))
const teachers = computed(() => teacherData.value?.data.items ?? [])
const { data: paymentData } = usePayments({ perPage: 500 }, () => school.hasModule('payment'))
const collected = computed(() =>
  (paymentData.value?.data.items ?? []).reduce((sum, p) => sum + p.paid, 0),
)
const dues = computed(() => students.value.reduce((sum, s) => sum + s.dueAmount, 0))
const { data: settingsData } = useSettings()
const enabledCount = computed(() => settingsData.value?.data.enabledModules.length ?? 0)
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
}
.stat {
  font-size: var(--font-size-2xl);
}
.stat--small {
  font-size: var(--font-size-lg);
  text-transform: capitalize;
}
</style>
