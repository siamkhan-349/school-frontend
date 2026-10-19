<template>
  <div class="page">
    <h1 class="page__title">My Profile</h1>
    <div v-if="meLoading" class="sk-stack">
      <AppSkeleton variant="card" />
      <AppSkeleton variant="card" />
    </div>
    <p v-else-if="!teacher" class="error">
      No teacher/staff profile is linked to this login. Ask the admin to link one from Users.
    </p>
    <template v-else>
      <AppCard :title="teacher.name">
        <dl class="kv">
          <div><dt>Designation</dt><dd>{{ teacher.designation || '—' }}</dd></div>
          <div><dt>Role</dt><dd>{{ teacher.kind === 'staff' ? 'Staff' : 'Teacher' }}</dd></div>
          <div><dt>Phone</dt><dd>{{ teacher.phone || '—' }}</dd></div>
          <div><dt>Joining date</dt><dd>{{ teacher.joiningDate || '—' }}</dd></div>
          <div v-if="school.hasModule('payroll')"><dt>Basic salary</dt><dd>{{ teacher.basicSalary || '—' }}</dd></div>
          <div><dt>Status</dt><dd>{{ teacher.status || 'active' }}</dd></div>
        </dl>
      </AppCard>
      <PasswordChangeForm />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppCard from '@/components/common/AppCard.vue'
import AppSkeleton from '@/components/common/AppSkeleton.vue'
import PasswordChangeForm from '@/components/common/PasswordChangeForm.vue'
import { useMyTeacher } from '@/composables/useQueries'
import { useSchoolStore } from '@/stores/school'

const school = useSchoolStore()
const { data: meData, isLoading: meLoading } = useMyTeacher()
const teacher = computed(() => meData.value?.data)
</script>

<style scoped>
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--spacing-lg);
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-danger);
}
.kv {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
}
@media (max-width: 640px) {
  .kv {
    grid-template-columns: 1fr;
  }
}
.kv div {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--spacing-xs);
}
.kv dt {
  color: var(--color-text-muted);
}
</style>
