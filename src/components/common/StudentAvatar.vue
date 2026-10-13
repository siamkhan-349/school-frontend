<template>
  <span class="avatar" :class="genderClass" :style="{ width: sizePx, height: sizePx }">
    <img v-if="photoUrl" :src="photoUrl" :alt="name" class="avatar__img" />
    <Venus v-else-if="isFemale" class="avatar__icon" :style="{ width: iconPx, height: iconPx }" />
    <Mars v-else-if="isMale" class="avatar__icon" :style="{ width: iconPx, height: iconPx }" />
    <UserRound v-else class="avatar__icon" :style="{ width: iconPx, height: iconPx }" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Mars, UserRound, Venus } from 'lucide-vue-next'

/**
 * Student photo with gender fallback: the backend image when photoUrl
 * exists, otherwise a Mars (male) / Venus (female) icon badge —
 * neutral person icon while gender is unknown.
 */
const props = withDefaults(
  defineProps<{
    photoUrl?: string | null
    name?: string
    gender?: string | null
    size?: number
  }>(),
  { photoUrl: '', name: '', gender: '', size: 32 },
)

const sizePx = computed(() => `${props.size}px`)
const iconPx = computed(() => `${Math.round(props.size * 0.55)}px`)
const normalizedGender = computed(() => (props.gender || '').toLowerCase())
const isFemale = computed(() => normalizedGender.value === 'female')
const isMale = computed(() => normalizedGender.value === 'male')
const genderClass = computed(() => {
  if (isFemale.value) return 'avatar--female'
  if (isMale.value) return 'avatar--male'
  return 'avatar--unknown'
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
}
.avatar--male {
  background: #dbeafe;
  color: #1d4ed8;
}
.avatar--female {
  background: #fce7f3;
  color: #be185d;
}
.avatar--unknown {
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
