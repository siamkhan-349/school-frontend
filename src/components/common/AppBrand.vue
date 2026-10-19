<template>
  <div class="app-shell__brand">
    <School class="app-shell__brand-mark" :size="22" aria-hidden="true" />
    <span>School Management</span>
    <span v-if="tag" class="brand-tag">{{ tag }}</span>
  </div>
</template>

<script setup lang="ts">
import { School } from 'lucide-vue-next'

/**
 * Shell brand line (sidebar top): standard school mark + product name, with
 * an optional tag ("super"). One shared component because the same line lives
 * in four layouts and drifted every time the name changed.
 */
withDefaults(defineProps<{ tag?: string }>(), { tag: '' })
</script>
