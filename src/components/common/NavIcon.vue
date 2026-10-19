<template>
  <component :is="icon" :size="size" aria-hidden="true" class="nav-icon" />
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import {
  ArrowUpRight,
  Banknote,
  Blocks,
  BookOpen,
  CalendarClock,
  CalendarOff,
  ChartColumn,
  Circle,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  PartyPopper,
  Receipt,
  Server,
  Settings,
  Trophy,
  UserRound,
  Users,
  Wallet,
} from 'lucide-vue-next'

/**
 * Sidebar glyph for a NavItem.icon key. One central map keeps navigation.ts
 * plain data and makes every panel render the same icon for a concept.
 */
const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 18 })

const ICONS: Record<string, Component> = {
  dashboard: LayoutDashboard,
  academics: BookOpen,
  students: GraduationCap,
  people: Users,
  profile: UserRound,
  routine: CalendarClock,
  attendance: ClipboardCheck,
  exam: FileText,
  results: Trophy,
  payments: Wallet,
  invoice: Receipt,
  salary: Banknote,
  sms: MessageSquare,
  news: Newspaper,
  reports: ChartColumn,
  settings: Settings,
  modules: Blocks,
  system: Server,
  leave: CalendarOff,
  children: Users,
  event: PartyPopper,
  external: ArrowUpRight,
}

const icon = computed(() => ICONS[props.name] ?? Circle)
</script>

<style scoped>
.nav-icon {
  flex-shrink: 0;
}
</style>
