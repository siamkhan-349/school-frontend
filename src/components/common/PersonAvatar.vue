<template>
  <span class="avatar" :style="{ width: sizePx, height: sizePx }" :title="name">
    <img v-if="photoUrl" :src="photoUrl" :alt="name" class="avatar__img" />
    <span v-else class="avatar__initial" :style="{ fontSize: initialPx }">{{ initial }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

/**
 * Teacher/staff photo with initial fallback: the backend image when
 * photoUrl exists, otherwise the name initial on a neutral badge.
 */
const props = withDefaults(
  defineProps<{
    photoUrl?: string | null
    name?: string
    size?: number
  }>(),
  { photoUrl: '', name: '', size: 32 },
)

const sizePx = computed(() => `${props.size}px`)
const initialPx = computed(() => `${Math.round(props.size * 0.42)}px`)
const initial = computed(() => {
  const ch = (props.name || '').trim().charAt(0)
  return ch ? ch.toUpperCase() : '?'
})
</script>

<style scoped>
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: var(--radius-full);
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-surface-alt);
  color: var(--color-text-muted);
}
.avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar__initial {
  font-weight: 700;
  line-height: 1;
  user-select: none;
}
</style>
