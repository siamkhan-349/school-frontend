<template>
  <div class="page">
    <h1 class="page__title">Dues List</h1>

    <AppCard>
      <FilterPanel>
        <input v-model="search" class="app-input__control" placeholder="Search name / roll…" />
      </FilterPanel>
      <p v-if="duesLoading" class="muted">Loading…</p>
      <table v-else class="table">
        <thead>
          <tr><th><button class="sort-btn" type="button" @click="sort.toggle('name')">Student{{ sort.arrow('name') }}</button></th><th>Roll</th><th><button class="sort-btn" type="button" @click="sort.toggle('due')">Due (৳){{ sort.arrow('due') }}</button></th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="s in paged" :key="s.id">
            <td>{{ s.name }}</td>
            <td>{{ s.roll }}</td>
            <td class="due">৳{{ s.dueAmount }}</td>
            <td class="row-actions">
              <button class="link-btn" type="button" @click="goCollect(s.id)">Collect</button>
            </td>
          </tr>
          <tr v-if="paged.length === 0">
            <td colspan="4" class="muted">No dues. All clear.</td>
          </tr>
        </tbody>
      </table>
      <AppPagination v-model:page="page" v-model:per-page="perPage" :total="sorted.length" />
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppCard from '@/components/common/AppCard.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import { useDues } from '@/composables/useQueries'
import { useClientSort, usePagedList } from '@/composables/usePagedList'

const router = useRouter()
const { data: duesData, isLoading: duesLoading } = useDues()
const dues = computed(() => duesData.value?.data ?? [])

const search = ref('')
const { page, perPage } = usePagedList(10)
const sort = useClientSort<'name' | 'due'>()
watch(search, () => {
  page.value = 1
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return dues.value
  return dues.value.filter(
    (s) => s.name.toLowerCase().includes(q) || String(s.roll).toLowerCase().includes(q),
  )
})
const sorted = computed(() =>
  sort.apply(filtered.value, (s) => (sort.key.value === 'due' ? Number(s.dueAmount) || 0 : s.name)),
)
const paged = computed(() => {
  const start = (page.value - 1) * perPage.value
  return sorted.value.slice(start, start + perPage.value)
})

function goCollect(id: string): void {
  router.push({ path: '/admin/fees/collect', query: { studentId: id } })
}
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
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.table th,
.table td {
  text-align: left;
  padding: var(--spacing-sm) var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
}
.due {
  font-weight: var(--font-weight-bold);
  color: var(--color-warning);
}
.row-actions {
  text-align: right;
}
.link-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
}
.sort-btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.sort-btn:hover {
  color: var(--color-primary);
}
</style>
