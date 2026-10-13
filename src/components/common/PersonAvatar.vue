<template>
  <span class="avatar" :style="{ width: sizePx, height: sizePx }">
    <img v-if="photoUrl" :src="photoUrl" :alt="name" class="avatar__img" />
    <UserRound v-else class="avatar__icon" :style="{ width: iconPx, height: iconPx }" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { UserRound } from 'lucide-vue-next'

/**
 * Teacher/staff photo with person-icon fallback: the backend image when
 * photoUrl exists, otherwise a neutral person icon badge.
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
const iconPx = computed(() => `${Math.round(props.size * 0.55)}px`)
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
.avatar__icon {
  flex-shrink: 0;
}
</style>
