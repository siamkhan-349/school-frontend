<template>
  <span class="avatar" :class="genderClass" :style="{ width: sizePx, height: sizePx }" :title="name">
    <img v-if="photoUrl" :src="photoUrl" :alt="name" class="avatar__img" />
    <Icon v-else-if="isFemale" :icon="faceWoman" class="avatar__icon" :style="{ width: iconPx, height: iconPx }" />
    <Icon v-else-if="isMale" :icon="faceMan" class="avatar__icon" :style="{ width: iconPx, height: iconPx }" />
    <span v-else class="avatar__initial" :style="{ fontSize: initialPx }">{{ initial }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'
import faceMan from '@iconify-icons/mdi/face-man'
import faceWoman from '@iconify-icons/mdi/face-woman'

/**
 * Student photo with gender fallback: the backend image when photoUrl
 * exists, otherwise a standard MDI face icon — face-man (male) /
 * face-woman (female) — initial while gender is unknown.
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
const iconPx = computed(() => `${Math.round(props.size * 0.62)}px`)
const initialPx = computed(() => `${Math.round(props.size * 0.42)}px`)
const initial = computed(() => {
  const ch = (props.name || '').trim().charAt(0)
  return ch ? ch.toUpperCase() : '?'
})
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
.avatar__initial {
  font-weight: 700;
  line-height: 1;
  user-select: none;
}
</style>
