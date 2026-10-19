<template>
  <div
    class="app-skeleton"
    :class="`app-skeleton--${variant}`"
    :style="rootStyle"
    aria-hidden="true"
  >
    <div v-if="variant === 'text'" class="sk-line" :style="{ width: width || '100%' }" />

    <template v-else-if="variant === 'lines'">
      <div
        v-for="n in lines"
        :key="n"
        class="sk-line"
        :style="{ width: n === lines ? '62%' : '100%' }"
      />
    </template>

    <div
      v-else-if="variant === 'circle'"
      class="sk-circle"
      :style="{ width: `${size}px`, height: `${size}px` }"
    />

    <div v-else-if="variant === 'chip'" class="sk-chip" :style="{ width: width || '72px' }" />

    <div
      v-else-if="variant === 'block'"
      class="sk-block"
      :style="{ width: width || '100%', height: height || '160px' }"
    />

    <div v-else-if="variant === 'card'" class="sk-card">
      <div class="sk-line" style="width: 42%" />
      <div class="sk-line" />
      <div class="sk-line" style="width: 76%" />
    </div>

    <div v-else-if="variant === 'list'" class="sk-list">
      <div v-for="n in rows" :key="n" class="sk-row">
        <div class="sk-circle" style="width: 32px; height: 32px" />
        <div class="sk-row__lines">
          <div class="sk-line" />
          <div class="sk-line" style="width: 55%" />
        </div>
      </div>
    </div>

    <div v-else class="sk-table" :style="{ '--sk-cols': cols }">
      <div class="sk-tr sk-tr--head">
        <div v-for="c in cols" :key="c" class="sk-td" />
      </div>
      <div v-for="r in rows" :key="r" class="sk-tr">
        <div v-for="c in cols" :key="c" class="sk-td" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Shape to render. Defaults to a single text line. */
    variant?: 'text' | 'lines' | 'circle' | 'chip' | 'block' | 'card' | 'list' | 'table'
    /** Line count for `lines`. */
    lines?: number
    /** Row count for `list` / `table`. */
    rows?: number
    /** Column count for `table`. */
    cols?: number
    /** Diameter in px for `circle`. */
    size?: number
    /** CSS width override (any CSS length / %). */
    width?: string
    /** CSS height for `block`. */
    height?: string
    /** ms to wait before appearing (keeps space, avoids flash on fast loads). */
    delay?: number
  }>(),
  { variant: 'text', lines: 3, rows: 5, cols: 4, size: 40, width: '', height: '', delay: 150 },
)

const rootStyle = computed(() =>
  props.delay > 0 ? { animationDelay: `${props.delay}ms` } : undefined,
)
</script>

<style scoped>
.app-skeleton {
  animation: sk-enter 0.18s ease-out both;
  min-width: 0;
}
.sk-line,
.sk-circle,
.sk-chip,
.sk-block,
.sk-td {
  background: var(--color-surface-alt);
  animation: sk-pulse 1.4s ease-in-out infinite;
}
.sk-line {
  height: 13px;
  border-radius: var(--radius-sm);
  width: 100%;
}
.sk-circle {
  border-radius: 50%;
  flex-shrink: 0;
}
.sk-chip {
  height: 24px;
  border-radius: var(--radius-full);
}
.sk-block {
  border-radius: var(--radius-md);
}
.app-skeleton--lines {
  display: grid;
  gap: var(--spacing-sm);
}
.sk-card {
  display: grid;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.sk-list {
  display: grid;
  gap: var(--spacing-md);
}
.sk-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.sk-row__lines {
  flex: 1;
  display: grid;
  gap: var(--spacing-xs);
  min-width: 0;
}
.sk-table {
  display: grid;
  gap: var(--spacing-sm);
}
.sk-tr {
  display: grid;
  grid-template-columns: repeat(var(--sk-cols, 4), minmax(0, 1fr));
  gap: var(--spacing-sm);
}
.sk-tr--head .sk-td {
  height: 10px;
  opacity: 0.75;
}
.sk-td {
  height: 14px;
  border-radius: var(--radius-sm);
}
/* Vary cell widths a little so the grid doesn't read as solid bars. */
.sk-td:nth-child(3n) {
  width: 72%;
}
@keyframes sk-enter {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes sk-pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .app-skeleton {
    animation: none;
  }
  .sk-line,
  .sk-circle,
  .sk-chip,
  .sk-block,
  .sk-td {
    animation: none;
    opacity: 0.8;
  }
}
</style>
