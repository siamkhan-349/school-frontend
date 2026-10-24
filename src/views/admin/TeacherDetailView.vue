<template>
  <div class="page">
    <div class="page__head">
      <div>
        <button class="link-btn" type="button" @click="router.back()">← Teachers & Staff</button>
        <h1 class="page__title">{{ teacher?.name || 'Teacher' }}</h1>
        <p v-if="teacher" class="muted">{{ teacher.designation || teacher.kind }} · {{ teacher.kind }}</p>
      </div>
      <div class="head-actions">
        <AppButton variant="ghost" type="button" @click="router.push(`/admin/teachers/${id}/subjects`)">
          Assign Subjects
        </AppButton>
      </div>
    </div>

    <AppCard v-if="loading" title="Loading…">
      <AppSkeleton variant="lines" :lines="8" />
    </AppCard>

    <template v-else-if="teacher">
      <div class="detail-grid">
        <AppCard title="Profile">
          <dl class="info-list">
            <div><dt>Name</dt><dd>{{ teacher.name }}</dd></div>
            <div><dt>Type</dt><dd>{{ teacher.kind }}</dd></div>
            <div><dt>Designation</dt><dd>{{ teacher.designation || '—' }}</dd></div>
            <div><dt>Phone</dt><dd>{{ teacher.phone || '—' }}</dd></div>
            <div><dt>Card ID</dt><dd>{{ teacher.cardId || '—' }}</dd></div>
            <div><dt>Joining date</dt><dd>{{ teacher.joiningDate || '—' }}</dd></div>
            <div><dt>Status</dt><dd>{{ teacher.status || '—' }}</dd></div>
            <div v-if="teacher.photoUrl"><dt>Photo</dt><dd><img :src="teacher.photoUrl" class="photo" alt="" /></dd></div>
          </dl>
        </AppCard>

        <AppCard title="Payroll">
          <dl class="info-list">
            <div><dt>Salary type</dt><dd>{{ teacher.salaryType || '—' }}</dd></div>
            <div v-if="teacher.payType"><dt>Pay type</dt><dd>{{ teacher.payType }}</dd></div>
            <div><dt>Basic salary</dt><dd>৳{{ teacher.basicSalary }}</dd></div>
            <div><dt>Extra allowance</dt><dd>৳{{ teacher.extraAllowance }}</dd></div>
            <div><dt>Overtime rate</dt><dd>৳{{ teacher.overtimeRate }}</dd></div>
            <div><dt>PF %</dt><dd>{{ teacher.pfPercent }}</dd></div>
            <div><dt>Loan deduction</dt><dd>৳{{ teacher.loanDeduction }}</dd></div>
            <div><dt>Working days</dt><dd>{{ teacher.workingDays }}</dd></div>
            <div><dt>Per-day salary</dt><dd>৳{{ teacher.perDaySalary }}</dd></div>
            <div v-if="teacher.baseTime"><dt>Base time</dt><dd>{{ teacher.baseTime }}</dd></div>
            <div v-if="teacher.endTime"><dt>End time</dt><dd>{{ teacher.endTime }}</dd></div>
          </dl>
        </AppCard>
      </div>

      <AppCard title="Assigned subjects">
        <AppSkeleton v-if="subjectsLoading" variant="lines" :lines="4" />
        <p v-else-if="!subjects.length" class="muted">No subjects assigned yet.</p>
        <table v-else class="table">
          <thead>
            <tr><th>Subject</th><th>Class</th><th>Department</th></tr>
          </thead>
          <tbody>
            <tr v-for="s in subjects" :key="s.id">
              <td>{{ s.subjectLabel }}</td>
              <td>{{ s.classLabel || '—' }}</td>
              <td>{{ s.department || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </AppCard>
    </template>

    <p v-else class="error">Teacher not found.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import { teacherService, teacherSubjectService } from '@/services'
import type { Teacher, TeacherSubject } from '@/types/models'

const route = useRoute()
const router = useRouter()
const id = computed(() => String(route.params.id || ''))

const teacher = ref<Teacher | null>(null)
const loading = ref(true)
const subjects = ref<TeacherSubject[]>([])
const subjectsLoading = ref(true)

onMounted(async () => {
  try {
    const res = await teacherService.get(id.value)
    teacher.value = res.data ?? null
  } catch {
    teacher.value = null
  } finally {
    loading.value = false
  }
  try {
    const res = await teacherSubjectService.list(id.value)
    subjects.value = res.data ?? []
  } catch {
    subjects.value = []
  } finally {
    subjectsLoading.value = false
  }
})
</script>

<style scoped>
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  flex-wrap: wrap;
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin: 0;
}
.head-actions {
  display: flex;
  gap: var(--spacing-sm);
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}
.info-list {
  display: grid;
  gap: var(--spacing-xs);
  margin: 0;
}
.info-list > div {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-md);
  padding: 4px 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
.info-list dt {
  color: var(--color-text-muted);
}
.info-list dd {
  margin: 0;
  text-align: right;
}
.photo {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-md);
  object-fit: cover;
}
.error {
  color: var(--color-danger);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
</style>
