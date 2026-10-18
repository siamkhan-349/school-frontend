<template>
  <div class="page">
    <div class="page__head">
      <h1 class="page__title">SMS & Templates</h1>
      <div v-if="balance" class="balance" :class="{ 'balance--low': balance.remaining < 50 }">
        <span class="balance__label">Balance</span>
        <strong>{{ balance.remaining }}/{{ balance.total }}</strong>
        <span class="muted">used {{ balance.used }}</span>
      </div>
    </div>

    <div class="main-tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="main-tab"
        :class="{ 'main-tab--active': activeTab === t.key }"
        type="button"
        @click="activeTab = t.key"
      >{{ t.label }}</button>
    </div>

    <!-- OVERVIEW -->
    <div v-show="activeTab === 'overview'">
      <div class="stat-grid">
        <AppCard><p class="stat-label">Total Credits</p><p class="stat-value">{{ balance?.total ?? 0 }}</p></AppCard>
        <AppCard><p class="stat-label">Used</p><p class="stat-value">{{ balance?.used ?? 0 }}</p></AppCard>
        <AppCard><p class="stat-label">Remaining</p><p class="stat-value">{{ balance?.remaining ?? 0 }}</p></AppCard>
      </div>
      <AppCard title="Credit Usage">
        <div class="usage-bar"><div class="usage-bar__fill" :style="{ width: `${usedPct}%` }"></div></div>
        <p class="muted">{{ balance?.used ?? 0 }} used / {{ balance?.remaining ?? 0 }} remaining · {{ usedPct }}% consumed</p>
      </AppCard>
      <AppCard title="Delivery Snapshot">
        <p class="muted">Based on {{ logs.length }} recorded messages.</p>
        <div class="chips-row">
          <span class="pill pill--sent">Sent {{ statusCounts.sent }}</span>
          <span class="pill pill--failed">Failed {{ statusCounts.failed }}</span>
          <span class="pill pill--pending">Pending {{ statusCounts.pending }}</span>
        </div>
      </AppCard>
      <AppCard title="Quick Alerts">
        <p class="muted">One-tap bulk alert to guardians with a phone number on file.</p>
        <div class="quick-row">
          <AppButton variant="ghost" :disabled="quickBusy" @click="runQuickAlert('fees')">
            {{ quickBusy && quickKind === 'fees' ? 'Sending…' : 'Fees Due Reminder' }}
          </AppButton>
          <AppButton variant="ghost" :disabled="quickBusy" @click="runQuickAlert('absent')">
            {{ quickBusy && quickKind === 'absent' ? 'Sending…' : 'Absent Alert (today)' }}
          </AppButton>
        </div>
        <p v-if="quickResult" class="success">{{ quickResult }}</p>
      </AppCard>
    </div>

    <!-- SEND -->
    <div v-show="activeTab === 'send'">
      <AppCard title="Send SMS">
        <div class="mode-row">
          <button
            type="button"
            class="main-tab"
            :class="{ 'main-tab--active': sendMode === 'general' }"
            @click="sendMode = 'general'"
          >General</button>
          <button
            type="button"
            class="main-tab"
            :class="{ 'main-tab--active': sendMode === 'exam' }"
            @click="sendMode = 'exam'"
          >Exam Result</button>
          <button
            v-if="school.hasModule('staff')"
            type="button"
            class="main-tab"
            :class="{ 'main-tab--active': sendMode === 'teachers' }"
            @click="sendMode = 'teachers'"
          >Teachers</button>
        </div>
        <form v-if="sendMode === 'general'" class="form" @submit.prevent="sendGeneral">
          <div class="mode-row mode-row--sub">
            <button
              v-for="m in recipientModes"
              :key="m.key"
              type="button"
              class="main-tab"
              :class="{ 'main-tab--active': recipientMode === m.key }"
              @click="recipientMode = m.key"
            >{{ m.label }}</button>
          </div>

          <!-- SINGLE -->
          <template v-if="recipientMode === 'single'">
            <label>Find student
              <input v-model="singleSearch" class="app-input__control" placeholder="Search name / roll / phone…" />
            </label>
            <ul v-if="singleSearch.trim()" class="roster__list">
              <li
                v-for="s in singleMatches.slice(0, 10)"
                :key="s.id"
                class="roster__row roster__row--pick"
                :class="{ 'roster__row--picked': sendForm.singleId === s.id }"
              >
                <button type="button" class="pick-btn" @click="sendForm.singleId = s.id">
                  <span>{{ s.name }} <span class="muted">· Roll {{ s.roll }} · {{ classNameOf(s.classId) }}</span></span>
                  <span class="muted">{{ guardianPhoneOf(s) || 'no phone' }}</span>
                </button>
              </li>
              <li v-if="singleMatches.length === 0" class="muted roster__row">No one found.</li>
            </ul>
            <p v-if="singleStudent" class="picked">Picked: <strong>{{ singleStudent.name }}</strong> ({{ audiencePhoneLabel(singleStudent) }})</p>
          </template>

          <!-- MULTIPLE -->
          <template v-else-if="recipientMode === 'multiple'">
            <label>Find + tick students
              <input v-model="multiSearch" class="app-input__control" placeholder="Search name / roll / phone…" />
            </label>
            <div class="roster__head">
              <span>{{ sendForm.multiIds.length }} selected</span>
              <button v-if="sendForm.multiIds.length > 0" type="button" class="link-btn" @click="sendForm.multiIds = []">Clear</button>
            </div>
            <ul v-if="multiSelected.length > 0" class="roster__list roster__list--picked">
              <li v-for="s in multiSelected" :key="s.id" class="roster__row roster__row--picked">
                <span>{{ s.name }} <span class="muted">· Roll {{ s.roll }} · {{ classNameOf(s.classId) }}</span></span>
                <button type="button" class="link-danger" @click="toggleMulti(s.id, false)">✕</button>
              </li>
            </ul>
            <ul v-if="multiSearch.trim()" class="roster__list">
              <li v-for="s in multiMatches.slice(0, 30)" :key="s.id" class="roster__row">
                <label class="roster__check">
                  <input
                    type="checkbox"
                    :checked="sendForm.multiIds.includes(s.id)"
                    @change="toggleMulti(s.id, ($event.target as HTMLInputElement).checked)"
                  />
                  <span>{{ s.name }} <span class="muted">· Roll {{ s.roll }} · {{ classNameOf(s.classId) }}</span></span>
                </label>
              </li>
              <li v-if="multiMatches.length === 0" class="muted roster__row">No one found.</li>
            </ul>
            <p v-else class="muted">Type a name / roll / phone above, then tick.</p>
          </template>

          <!-- GROUP -->
          <template v-else>
            <div class="form-row">
              <label>Class
                <select v-model="sendForm.classId" class="app-input__control">
                  <option value="">All classes</option>
                  <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.label }}</option>
                </select>
              </label>
              <label>Section
                <select v-model="sendForm.sectionFilter" class="app-input__control">
                  <option value="">All sections</option>
                  <optgroup v-if="!sendForm.classId" label="Same section across all classes">
                    <option v-for="lbl in allSectionLabels" :key="lbl" :value="`label:${lbl}`">
                      {{ lbl }} (all classes)
                    </option>
                  </optgroup>
                  <optgroup :label="sendForm.classId ? 'Sections of this class' : 'Section'">
                    <option v-for="s in classSections" :key="s.id" :value="s.id">
                      {{ s.label }}{{ sendForm.classId ? '' : ` · ${classNameOf(s.classId)}` }}
                    </option>
                  </optgroup>
                </select>
              </label>
            </div>
            <div class="form-row">
              <label>Department
                <select v-model="sendForm.deptId" class="app-input__control" :disabled="!deptOptions.length">
                  <option value="">{{ deptOptions.length ? 'All departments' : 'No departments' }}</option>
                  <option v-for="d in deptOptions" :key="d.id" :value="d.id">
                    {{ d.label }}{{ sendForm.classId ? '' : ` · ${classNameOf(d.classId)}` }}
                  </option>
                </select>
              </label>
              <label>Audience
                <input class="app-input__control" value="Guardians" disabled />
              </label>
            </div>
            <div class="roster">
              <div class="roster__head">
                <span>{{ groupSelected.length }} of {{ groupRoster.length }} auto-checked — untick anyone to skip</span>
                <span class="row-btns">
                  <button type="button" class="link-btn" @click="sendForm.excluded = []">Include all</button>
                  <button type="button" class="link-btn" @click="excludeAllGroup">Exclude all</button>
                </span>
              </div>
              <input v-model="sendForm.rosterSearch" class="app-input__control" placeholder="Search roster…" />
              <ul class="roster__list">
                <li v-for="s in filteredGroupRoster" :key="s.id" class="roster__row">
                  <label class="roster__check">
                    <input
                      type="checkbox"
                      :checked="!sendForm.excluded.includes(s.id)"
                      @change="toggleGroupExclude(s.id, ($event.target as HTMLInputElement).checked)"
                    />
                    <span>{{ s.name }} <span class="muted">· Roll {{ s.roll }} · {{ classNameOf(s.classId) }}</span></span>
                  </label>
                  <span class="muted">{{ audiencePhoneLabel(s) }}</span>
                </li>
                <li v-if="filteredGroupRoster.length === 0" class="muted roster__row">No one matches this filter.</li>
              </ul>
            </div>
          </template>

          <label>Template
            <select v-model="sendForm.templateId" class="app-input__control">
              <option :value="null">Custom message</option>
              <option v-for="t in generalTemplates" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </label>
          <p class="muted">Result SMS lives in the Exam Result tab — no result templates here.</p>
          <p v-if="activeTemplateVars.length > 0" class="vars">
            Variables:
            <code v-for="v in activeTemplateVars" :key="v" v-text="wrapVar(v)"></code>
          </p>
          <template v-for="v in manualVars" :key="v">
            <label>{{ v }}
              <input v-model="sendForm.variables[v]" class="app-input__control" :placeholder="wrapVar(v)" />
            </label>
          </template>
          <label v-if="needsExamVars">Exam (name + date auto-filled)
            <select v-model="sendForm.examFillId" class="app-input__control">
              <option value="">Type manually</option>
              <option v-for="e in allExams" :key="e.id" :value="e.id">
                {{ e.name }} - {{ e.examDate }}
              </option>
            </select>
          </label>
          <label v-if="!sendForm.templateId">Custom message
            <textarea
              v-model="sendForm.body"
              class="app-input__control"
              rows="3"
              placeholder="Dear guardian, {{studentName}} ..."
            />
          </label>
          <div v-if="generalPreview" class="preview">
            <span class="preview__label">Preview ({{ generalPreviewName }})</span>
            <p>{{ generalPreview }}</p>
            <span class="muted">{{ generalPreview.length }} chars · ~{{ generalSegments }} segment(s)</span>
          </div>
          <p v-if="sendError" class="error">{{ sendError }}</p>
          <p v-if="sendResult" class="success">{{ sendResult }}</p>
          <AppButton type="submit" :disabled="sendingGeneral">
            {{ sendingGeneral ? 'Sending…' : `Send (${generalRecipients.length})` }}
          </AppButton>
        </form>
        <form v-else-if="sendMode === 'exam'" class="form" @submit.prevent="sendExamSms">
          <label>Published exam
            <select v-model="examSms.examId" class="app-input__control">
              <option value="">Select exam…</option>
              <option v-for="e in publishedExams" :key="e.id" :value="e.id">
                {{ e.name }} — {{ e.examDate }}
              </option>
            </select>
          </label>
          <p v-if="heldBackExams > 0" class="muted">
            {{ heldBackExams }} unpublished exam(s) not listed — they appear after publishing.
          </p>
          <label>Template (each guardian gets their own child's result)
            <select v-model="examSms.templateId" class="app-input__control">
              <option value="">Select template…</option>
              <option v-for="t in resultTemplates" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </label>
          <div v-if="examSms.examId" class="roster">
            <div class="roster__head">
              <span>{{ rosterSelected.length }} of {{ rosterStudents.length }} guardians will be sent to</span>
              <span class="row-btns">
                <button type="button" class="link-btn" @click="examSms.excluded = []">Include all</button>
                <button type="button" class="link-btn" @click="excludeAllRoster">Exclude all</button>
              </span>
            </div>
            <input v-model="examSms.search" class="app-input__control" placeholder="Search name / roll…" />
            <ul class="roster__list">
              <li v-for="s in filteredRoster" :key="s.id" class="roster__row">
                <label class="roster__check">
                  <input
                    type="checkbox"
                    :checked="!examSms.excluded.includes(s.id)"
                    @change="toggleRoster(s.id, ($event.target as HTMLInputElement).checked)"
                  />
                  <span>{{ s.name }} <span class="muted">· Roll {{ s.roll }}</span></span>
                </label>
                <span v-if="!hasExamResult(s.id)" class="pill pill--pending">no result</span>
              </li>
            </ul>
            <p v-if="noResultSelected.length > 0" class="error">
              {{ noResultSelected.length }} have no result ({{ noResultSelected.slice(0, 5).map((s) => s.name).join(', ') }}{{ noResultSelected.length > 5 ? '…' : '' }}) — untick them before sending.
            </p>
          </div>
          <div v-if="examPreview" class="preview">
            <span class="preview__label">Preview ({{ examPreviewName }})</span>
            <p>{{ examPreview }}</p>
          </div>
          <p v-if="examSmsError" class="error">{{ examSmsError }}</p>
          <p v-if="examSmsResult" class="success">{{ examSmsResult }}</p>
          <AppButton type="submit" :disabled="sendingExam">{{ sendingExam ? 'Sending…' : 'Send Result SMS' }}</AppButton>
        </form>
        <form v-else-if="sendMode === 'teachers' && school.hasModule('staff')" class="form" @submit.prevent="sendTeacherSms">
          <p class="muted">All teachers with a phone number — teacher-only message.</p>
          <div class="roster">
            <div class="roster__head">
              <span>{{ teacherSelected.length }} of {{ teacherRoster.length }} auto-checked — untick anyone to skip</span>
              <span class="row-btns">
                <button type="button" class="link-btn" @click="teacherSms.excluded = []">Include all</button>
                <button type="button" class="link-btn" @click="teacherSms.excluded = teacherRoster.map((t) => t.id)">Exclude all</button>
              </span>
            </div>
            <input v-model="teacherSms.search" class="app-input__control" placeholder="Search name / phone…" />
            <ul class="roster__list">
              <li v-for="t in filteredTeachers" :key="t.id" class="roster__row">
                <label class="roster__check">
                  <input
                    type="checkbox"
                    :checked="!teacherSms.excluded.includes(t.id)"
                    @change="teacherSms.excluded = ($event.target as HTMLInputElement).checked ? teacherSms.excluded.filter((x) => x !== t.id) : [...teacherSms.excluded, t.id]"
                  />
                  <span>{{ t.name }} <span class="muted">· {{ t.designation || 'Teacher' }}</span></span>
                </label>
                <span class="muted">{{ t.phone }}</span>
              </li>
              <li v-if="filteredTeachers.length === 0" class="muted roster__row">No one here.</li>
            </ul>
          </div>
          <label>Template
            <select v-model="teacherSms.templateId" class="app-input__control">
              <option :value="null">Custom message</option>
              <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </label>
          <label v-if="!teacherSms.templateId">Custom message
            <textarea v-model="teacherSms.body" class="app-input__control" rows="3" placeholder="Dear sir, {{teacherName}} ..." />
          </label>
          <div v-if="teacherPreview" class="preview">
            <span class="preview__label">Preview ({{ teacherSelected[0]?.name ?? 'Teacher' }})</span>
            <p>{{ teacherPreview }}</p>
          </div>
          <p v-if="teacherSmsError" class="error">{{ teacherSmsError }}</p>
          <p v-if="teacherSmsResult" class="success">{{ teacherSmsResult }}</p>
          <AppButton type="submit" :disabled="sendingTeacher">
            {{ sendingTeacher ? 'Sending…' : `Send (${teacherSelected.length})` }}
          </AppButton>
        </form>
      </AppCard>
    </div>

    <!-- TEMPLATES (read-only: CRUD lives on the super-admin SMS Control page) -->
    <div v-show="activeTab === 'templates'">
      <AppCard title="Templates">
        <p class="muted">
          The list of SMS formats in use. To change one, ask a
          <RouterLink v-if="canManageTemplates" to="/super-admin/sms" class="link-btn">super admin (SMS Control)</RouterLink>
          <span v-else>super admin</span>.
        </p>
        <ul class="list">
          <li v-for="t in templates" :key="t.id" class="list__row">
            <div>
              <strong>{{ t.name }}</strong>
              <span class="muted"> · {{ t.type }}</span>
              <p class="muted">{{ t.body }}</p>
              <p v-if="(t.variables ?? []).length > 0" class="vars">
                <code v-for="v in t.variables" :key="v" v-text="wrapVar(v)"></code>
              </p>
            </div>
          </li>
          <li v-if="templates.length === 0" class="muted">No templates yet.</li>
        </ul>
      </AppCard>
    </div>

    <!-- HISTORY -->
    <div v-show="activeTab === 'history'">
      <AppCard title="Send History">
        <div class="chips-row">
          <button
            v-for="c in statusChips"
            :key="c.key"
            type="button"
            class="chip-btn"
            :class="{ 'chip-btn--active': histStatus === c.key }"
            @click="histStatus = c.key"
          >{{ c.label }} ({{ c.count }})</button>
        </div>
        <FilterPanel>
          <input v-model="histSearch" class="app-input__control" placeholder="Search recipient / phone / exam / message…" />
        </FilterPanel>
        <p v-if="logsLoading" class="muted">Loading…</p>
        <div v-else class="table-scroll">
          <table class="table">
            <thead>
              <tr><th>Recipient</th><th>Phone</th><th>Template</th><th>Exam</th><th>Message</th><th>Status</th><th>Sent at</th></tr>
            </thead>
            <tbody>
              <tr v-for="l in pagedLogs" :key="l.id">
                <td>{{ l.recipientName || '—' }}<span class="muted"> · {{ l.audience || '—' }}</span></td>
                <td>{{ l.phone || '—' }}</td>
                <td>{{ l.templateName }}</td>
                <td>
                  <RouterLink v-if="l.examId" :to="`/admin/exams/${l.examId}`" class="link-btn" :title="`Open ${l.examName}`">
                    {{ l.examName || `Exam ${l.examId}` }}
                  </RouterLink>
                  <span v-else class="muted">—</span>
                </td>
                <td class="msg">
                  <button type="button" class="msg-toggle" @click="toggleMsg(l.id)">
                    {{ expandedMsgs.has(l.id) ? l.message : shortMsg(l.message) }}
                  </button>
                </td>
                <td>
                  <span class="pill" :class="`pill--${l.status || 'sent'}`">{{ l.status || 'sent' }}</span>
                </td>
                <td>{{ formatTime(l.sentAt) }}</td>
              </tr>
              <tr v-if="pagedLogs.length === 0">
                <td colspan="7" class="muted">No messages match the current filters.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <AppPagination v-model:page="page" v-model:per-page="perPage" :total="filteredLogs.length" />
      </AppCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppButton from '@/components/common/AppButton.vue'
import AppCard from '@/components/common/AppCard.vue'
import AppPagination from '@/components/common/AppPagination.vue'
import FilterPanel from '@/components/common/FilterPanel.vue'
import { usePagedList } from '@/composables/usePagedList'
import {
  useAttendanceDay,
  useClasses,
  useDepartments,
  useDues,
  useExamResults,
  useExams,
  useSections,
  useSendBulkSms,
  useSmsBalance,
  useSmsLogs,
  useSmsTemplates,
  useStudents,
  useTeachers,
} from '@/composables/useQueries'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { useSchoolStore } from '@/stores/school'
import { buildResultVariables } from '@/utils/resultSms'

const auth = useAuthStore()
const school = useSchoolStore()
// System templates: only super admin can add/edit/remove (also locked in backend).
const canManageTemplates = computed(() => auth.user?.role === 'super_admin')

const toast = useToast()
function wrapVar(v: string): string {
  return `{{${v}}}`
}
const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'send', label: 'Send SMS' },
  { key: 'templates', label: 'Templates' },
  { key: 'history', label: 'History' },
] as const
const activeTab = ref<'overview' | 'send' | 'templates' | 'history'>('overview')

const { data: balanceData } = useSmsBalance()
const balance = computed(() => balanceData.value?.data)
const usedPct = computed(() => {
  const b = balance.value
  if (!b || !b.total) return 0
  return Math.min(100, Math.round((b.used / b.total) * 100))
})

const { data: tplData } = useSmsTemplates()
const templates = computed(() => tplData.value?.data ?? [])
const { data: classData } = useClasses()
const classes = computed(() => classData.value?.data ?? [])

// ---------- overview: delivery snapshot (client-side counts, coaching pattern) ----------
const { data: allLogsData } = useSmsLogs({})
const allLogs = computed(() => allLogsData.value?.data ?? [])
const statusCounts = computed(() => {
  const c = { sent: 0, failed: 0, pending: 0 }
  for (const m of allLogs.value) {
    const s = (m.status || 'sent') as keyof typeof c
    if (s in c) c[s] += 1
  }
  return c
})

// ---------- overview: quick alerts ----------
const { data: studentsData } = useStudents({ perPage: 500 })
const students = computed(() => studentsData.value?.data.items ?? [])
const studentMap = computed(() => new Map(students.value.map((s) => [s.id, s])))
const { data: duesData } = useDues()
const dues = computed(() => (duesData.value?.data ?? []) as { id: string; dueAmount: number }[])
const todayIso = new Date().toISOString().slice(0, 10)
const { data: dayData } = useAttendanceDay(todayIso)
const absentToday = computed(() => (dayData.value?.data ?? []).filter((r) => r.status === 'absent'))

const { mutateAsync: sendBulk, isPending: quickBusy } = useSendBulkSms()
const quickKind = ref<'fees' | 'absent' | ''>('')
const quickResult = ref('')
async function runQuickAlert(kind: 'fees' | 'absent'): Promise<void> {
  quickKind.value = kind
  quickResult.value = ''
  // Format comes only from super-admin SMS Control — no hardcoded body.
  const tplName = kind === 'fees' ? /fee.*due|due.*reminder/i : /absent/i
  const tpl = templates.value.find((t) => tplName.test(t.name))
  if (!tpl) {
    quickResult.value = 'Template missing — ask a super admin to create it on the SMS Control page.'
    toast.error(quickResult.value)
    quickKind.value = ''
    return
  }
  try {
    let targets: { id: string; name: string }[] = []
    let variables: Record<string, string> = {}
    if (kind === 'fees') {
      targets = dues
        .value
        .filter((d) => (Number(d.dueAmount) || 0) > 0)
        .map((d) => ({ id: d.id, name: '' }))
    } else {
      targets = absentToday.value.map((r) => ({ id: r.studentId, name: r.studentName || '' }))
      variables = { absentDate: todayIso }
    }
    const recipients: { recipientId: string; recipientType: string; phone?: string }[] = []
    let missing = 0
    for (const t of targets) {
      const st = studentMap.value.get(t.id)
      const phone = (st?.guardianPhone || '').trim() || (st?.phone || '').trim()
      if (!phone) {
        missing += 1
        continue
      }
      recipients.push({ recipientId: t.id, recipientType: 'guardian', phone })
    }
    if (recipients.length === 0) {
      quickResult.value = 'No guardian with a phone number found.'
      quickKind.value = ''
      return
    }
    // Template syntax is always double-brace.
    const res = await sendBulk({ templateId: tpl.id, recipients, variables })
    quickResult.value = `${res.data.sent} SMS sent. ${missing + (res.data.failed ?? []).length} failed (no phone).`
    toast.success(quickResult.value)
  } catch (e) {
    quickResult.value = 'Could not send the quick alert.'
    toast.error(e instanceof Error ? e.message : 'Failed')
  } finally {
    quickKind.value = ''
  }
}

// ---------- send: recipient picker (single / multiple / group) ----------
const recipientModes = [
  { key: 'single', label: 'Single' },
  { key: 'multiple', label: 'Multiple' },
  { key: 'group', label: 'Group' },
] as const
const recipientMode = ref<'single' | 'multiple' | 'group'>('group')
const sendForm = reactive({
  templateId: null as string | null,
  body: '',
  audience: 'guardians',
  classId: '',
  sectionFilter: '',
  deptId: '',
  singleId: '',
  multiIds: [] as string[],
  excluded: [] as string[],
  rosterSearch: '',
  examFillId: '',
  variables: {} as Record<string, string>,
})
const sendError = ref('')
const sendResult = ref('')

const classNameOf = (classId: string): string =>
  classes.value.find((c) => c.id === classId)?.label ?? classId
const guardianPhoneOf = (s: { guardianPhone: string; phone: string }): string =>
  (s.guardianPhone || '').trim() || (s.phone || '').trim()
const audiencePhoneLabel = (s: { guardianPhone: string; phone: string }): string =>
  guardianPhoneOf(s) || 'no phone'

// Sections + departments for filter dropdowns
const { data: allSectionsData } = useSections()
const allSections = computed(() => allSectionsData.value?.data ?? [])
const { data: allDeptsData } = useDepartments()
const allDepts = computed(() => allDeptsData.value?.data ?? [])
const allSectionLabels = computed(() => {
  const seen: string[] = []
  for (const s of allSections.value) {
    if (s.label && !seen.includes(s.label)) seen.push(s.label)
  }
  return seen
})
const classSections = computed(() =>
  sendForm.classId ? allSections.value.filter((s) => s.classId === sendForm.classId) : allSections.value,
)
const deptOptions = computed(() =>
  sendForm.classId ? allDepts.value.filter((d) => d.classId === sendForm.classId) : allDepts.value,
)
watch([() => sendForm.classId], () => {
  sendForm.sectionFilter = ''
  sendForm.deptId = ''
  sendForm.excluded = []
})

function matchStudent(
  s: { name: string; roll: string; phone: string; guardianPhone: string },
  q: string,
): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  return (
    s.name.toLowerCase().includes(needle) ||
    String(s.roll ?? '').toLowerCase().includes(needle) ||
    (s.phone || '').includes(needle) ||
    (s.guardianPhone || '').includes(needle)
  )
}

// Single + multiple search
const singleSearch = ref('')
const singleMatches = computed(() => students.value.filter((s) => matchStudent(s, singleSearch.value)))
const singleStudent = computed(() => students.value.find((s) => s.id === sendForm.singleId))
const multiSearch = ref('')
const multiMatches = computed(() => students.value.filter((s) => matchStudent(s, multiSearch.value)))
const multiSelected = computed(() =>
  sendForm.multiIds
    .map((id) => students.value.find((s) => s.id === id))
    .filter((s): s is (typeof students.value)[number] => Boolean(s)),
)
function toggleMulti(id: string, checked: boolean): void {
  sendForm.multiIds = checked
    ? [...sendForm.multiIds, id]
    : sendForm.multiIds.filter((x) => x !== id)
}

// Group roster: class + section + department filter, all auto-checked
function sectionMatches(s: { sectionId: string | null }, filter: string): boolean {
  if (!filter) return true
  if (filter.startsWith('label:')) {
    const label = filter.slice(6)
    if (s.sectionId === label) return true
    return allSections.value.some((sec) => sec.id === s.sectionId && sec.label === label)
  }
  return s.sectionId === filter
}
const groupRoster = computed(() =>
  students.value.filter(
    (s) =>
      (!sendForm.classId || s.classId === sendForm.classId) &&
      sectionMatches(s, sendForm.sectionFilter) &&
      (!sendForm.deptId || s.departmentId === sendForm.deptId),
  ),
)
const showGroupRoster = computed(() => groupRoster.value.length > 0)
const filteredGroupRoster = computed(() => {
  const q = sendForm.rosterSearch.trim().toLowerCase()
  if (!q) return groupRoster.value
  return groupRoster.value.filter((s) => matchStudent(s, q))
})
const groupSelected = computed(() => groupRoster.value.filter((s) => !sendForm.excluded.includes(s.id)))
function toggleGroupExclude(id: string, included: boolean): void {
  sendForm.excluded = included
    ? sendForm.excluded.filter((x) => x !== id)
    : [...sendForm.excluded, id]
}
function excludeAllGroup(): void {
  sendForm.excluded = groupRoster.value.map((s) => s.id)
}

// Teachers roster (audience teachers/all)
const { data: teachersData } = useTeachers({ perPage: 500 })
const teacherRoster = computed(() =>
  ((teachersData.value?.data.items ?? []) as { id: string; name: string; phone: string; designation: string }[]).filter(
    (t) => (t.phone || '').trim(),
  ),
)
const teacherSms = reactive({
  templateId: null as string | null,
  body: '',
  excluded: [] as string[],
  search: '',
})
const teacherSmsError = ref('')
const teacherSmsResult = ref('')
const filteredTeachers = computed(() => {
  const q = teacherSms.search.trim().toLowerCase()
  if (!q) return teacherRoster.value
  return teacherRoster.value.filter(
    (t) => t.name.toLowerCase().includes(q) || (t.phone || '').includes(q),
  )
})
const teacherSelected = computed(() => teacherRoster.value.filter((t) => !teacherSms.excluded.includes(t.id)))
const teacherPreview = computed(() => {
  const tpl = templates.value.find((t) => t.id === teacherSms.templateId)
  const raw = tpl?.body ?? teacherSms.body
  if (!raw.trim() || teacherSelected.value.length === 0) return ''
  return raw.replace(/{{\s*(\w+)\s*}}/g, (_m, key: string) => {
    if (key === 'teacherName') return teacherSelected.value[0]?.name ?? 'Sir'
    return `[${key}]`
  })
})
const { mutateAsync: sendTeacherBulk, isPending: sendingTeacher } = useSendBulkSms()
async function sendTeacherSms(): Promise<void> {
  teacherSmsError.value = ''
  teacherSmsResult.value = ''
  if (teacherSelected.value.length === 0) {
    teacherSmsError.value = 'Select teachers first (auto-checked — untick to skip).'
    return
  }
  if (!teacherSms.templateId && !teacherSms.body.trim()) {
    teacherSmsError.value = 'Select a template or write a custom message.'
    return
  }
  try {
    const res = await sendTeacherBulk({
      templateId: teacherSms.templateId ?? undefined,
      body: teacherSms.templateId ? undefined : teacherSms.body.trim(),
      recipients: teacherSelected.value.map((t) => ({
        recipientId: t.id,
        recipientType: 'teacher',
        phone: t.phone,
        variables: { teacherName: t.name },
      })),
    })
    const failed = res.data.failed ?? []
    teacherSmsResult.value = res.data.sent > 0 ? `${res.data.sent} messages sent` : 'No recipients found'
    if (failed.length > 0) teacherSmsResult.value += ` · ${failed.length} failed (no phone)`
    toast.success(teacherSmsResult.value)
  } catch (e) {
    teacherSmsError.value = e instanceof Error ? e.message : 'Failed'
  }
}

// Final recipients → explicit /sms/bulk (coaching send payload pattern).
// General/Group mode: guardians only. Teachers have their own Teachers tab.
const generalRecipients = computed(() => {
  if (recipientMode.value === 'single') {
    const s = singleStudent.value
    return s ? [{ recipientId: s.id, recipientType: 'guardian' }] : []
  }
  if (recipientMode.value === 'multiple') {
    return sendForm.multiIds.map((id) => ({ recipientId: id, recipientType: 'guardian' }))
  }
  return groupSelected.value.map((s) => ({ recipientId: s.id, recipientType: 'guardian' }))
})

const activeTemplate = computed(() => templates.value.find((t) => t.id === sendForm.templateId))
// Auto-filled vars (resolved from records — never typed by hand):
// studentName/teacherName + roll/className/dueAmount/absentDate/feeName/paidAmount (from backend DB),
// exam/result vars (from exam mode). Only the rest (examName/examDate/dueFor...) are manual.
const AUTO_VARS = new Set([
  'studentName', 'teacherName', 'roll', 'className', 'dueAmount', 'absentDate',
  'feeName', 'paidAmount', 'examName', 'examDate', 'marks', 'total', 'fullMarks',
  'passMarks', 'grade', 'percentage', 'rank', 'resultStatus', 'resultLine', 'resultHeadline',
  'resultNote', 'subjects', 'passedSubjects', 'failedSubjects',
])
const activeTemplateVars = computed<string[]>(() => {
  const t = activeTemplate.value
  if (!t) return []
  if (t.variables && t.variables.length > 0) return t.variables
  const found: string[] = []
  const re = /{{\s*(\w+)\s*}}/g
  let m: RegExpExecArray | null
  const body = t.body || ''
  while ((m = re.exec(body)) !== null) {
    const v = m[1]
    if (v && !found.includes(v)) found.push(v)
  }
  return found
})
const manualVars = computed(() => activeTemplateVars.value.filter((v) => !AUTO_VARS.has(v)))
// Templates needing examName/examDate get them from the exam picker (no typing needed)
const needsExamVars = computed(
  () => activeTemplateVars.value.includes('examName') || activeTemplateVars.value.includes('examDate'),
)
watch(() => sendForm.examFillId, (id) => {
  const exam = allExams.value.find((e) => e.id === id) as
    | { name?: string; examDate?: string }
    | undefined
  if (!exam) return
  if (manualVars.value.includes('examName')) sendForm.variables.examName = exam.name ?? ''
  if (manualVars.value.includes('examDate')) sendForm.variables.examDate = exam.examDate ?? ''
})
function renderPreview(body: string): string {
  // Preview uses real record data too (first recipient) — the backend
  // fills each person's own data at send time.
  const firstId =
    recipientMode.value === 'single'
      ? sendForm.singleId
      : recipientMode.value === 'multiple'
        ? sendForm.multiIds[0]
        : groupSelected.value[0]?.id
  const st = students.value.find((s) => s.id === firstId)
  const due = dues.value.find((d) => d.id === firstId)
  const sample: Record<string, string> = {
    studentName: st?.name ?? generalPreviewName.value,
    roll: String(st?.roll ?? ''),
    className: st ? classNameOf(st.classId) : '',
    dueAmount: String((due as { dueAmount?: number } | undefined)?.dueAmount ?? ''),
  }
  return body.replace(/{{\s*(\w+)\s*}}/g, (_m, key: string) => {
    if (key in sample && sample[key]) return sample[key]
    if (key === 'teacherName') return 'Karim Sir'
    return sendForm.variables[key] || `[${key}]`
  })
}
const rawBody = computed(() => activeTemplate.value?.body ?? sendForm.body)
const generalPreviewName = computed(() => {
  if (recipientMode.value === 'single') return singleStudent.value?.name ?? 'Student'
  const first = recipientMode.value === 'multiple'
    ? students.value.find((s) => s.id === sendForm.multiIds[0])
    : groupSelected.value[0]
  return first?.name ?? 'Student'
})
const generalPreview = computed(() => (rawBody.value.trim() ? renderPreview(rawBody.value) : ''))
const generalSegments = computed(() => Math.max(1, Math.ceil(generalPreview.value.length / 160)))

const { mutateAsync: sendGeneralBulk, isPending: sendingGeneral } = useSendBulkSms()
async function sendGeneral(): Promise<void> {
  sendError.value = ''
  sendResult.value = ''
  if (generalRecipients.value.length === 0) {
    sendError.value = 'Select recipients first (single pick / multiple tick / group roster).'
    return
  }
  if (!sendForm.templateId && !sendForm.body.trim()) {
    sendError.value = 'Select a template or write a custom message.'
    return
  }
  try {
    const manual: Record<string, string> = {}
    for (const v of manualVars.value) {
      if (sendForm.variables[v]) manual[v] = sendForm.variables[v]
    }
    const res = await sendGeneralBulk({
      templateId: sendForm.templateId ?? undefined,
      body: sendForm.templateId ? undefined : sendForm.body.trim(),
      recipients: generalRecipients.value.map((r) => ({
        ...r,
        variables: { studentName: studentMap.value.get(r.recipientId)?.name ?? '' },
      })),
      variables: manual,
    })
    const failed = res.data.failed ?? []
    sendResult.value =
      res.data.sent > 0 ? `${res.data.sent} messages sent` : 'No recipients found'
    if (failed.length > 0) sendResult.value += ` · ${failed.length} failed (no phone)`
    toast.success(sendResult.value)
  } catch (e) {
    sendError.value = e instanceof Error ? e.message : 'Failed'
  }
}

// ---------- send mode: general vs exam (coaching exam-mode pattern) ----------
// Pick a specific published exam → that exam's class roster → each guardian
// gets their own child's result vars in the message. Unpublished exams are not listed.
const sendMode = ref<'general' | 'exam' | 'teachers'>('general')
const { data: examsData } = useExams({ perPage: 500 })
const allExams = computed(() => examsData.value?.data.items ?? [])
const publishedExams = computed(() => allExams.value.filter((e) => e.status === 'published'))
const heldBackExams = computed(() => allExams.value.filter((e) => e.status !== 'published').length)
const resultTemplates = computed(() => templates.value.filter((t) => t.type === 'result'))
// No result templates in general mode — those live in the Exam Result tab (per-student marks needed)
const generalTemplates = computed(() => templates.value.filter((t) => t.type !== 'result'))

const examSms = reactive({ examId: '', templateId: '', excluded: [] as string[], search: '' })
const selectedExam = computed(() => allExams.value.find((e) => e.id === examSms.examId))
const { data: examResultsData } = useExamResults(() => examSms.examId)
const examRows = computed(() => examResultsData.value?.data.rows ?? [])
const examFullMarks = computed(() => examResultsData.value?.data.fullMarks ?? 0)
const examRowByStudent = computed(() => new Map(examRows.value.map((r) => [r.studentId, r])))

const rosterStudents = computed(() => {
  const exam = selectedExam.value as
    | { classId?: string; sectionId?: string | null; departmentId?: string | null }
    | undefined
  if (!exam) return []
  return students.value.filter(
    (s) =>
      (!exam.classId || s.classId === exam.classId) &&
      (exam.sectionId == null || s.sectionId === exam.sectionId) &&
      (exam.departmentId == null || s.departmentId === exam.departmentId),
  )
})
const filteredRoster = computed(() => {
  const q = examSms.search.trim().toLowerCase()
  if (!q) return rosterStudents.value
  return rosterStudents.value.filter(
    (s) => s.name.toLowerCase().includes(q) || String(s.roll ?? '').toLowerCase().includes(q),
  )
})
const rosterSelected = computed(() => rosterStudents.value.filter((s) => !examSms.excluded.includes(s.id)))
function toggleRoster(id: string, included: boolean): void {
  examSms.excluded = included
    ? examSms.excluded.filter((x) => x !== id)
    : [...examSms.excluded, id]
}
function excludeAllRoster(): void {
  examSms.excluded = rosterStudents.value.map((s) => s.id)
}
function hasExamResult(studentId: string): boolean {
  return examRowByStudent.value.has(studentId)
}
const noResultSelected = computed(() => rosterSelected.value.filter((s) => !hasExamResult(s.id)))
watch(() => examSms.examId, () => {
  examSms.excluded = []
  examSms.search = ''
})
const examPreviewName = computed(() => rosterSelected.value[0]?.name ?? 'Student')
const examPreview = computed(() => {
  const tpl = templates.value.find((t) => t.id === examSms.templateId)
  const first = rosterSelected.value[0]
  if (!tpl || !first) return ''
  const row = examRowByStudent.value.get(first.id)
  const vars: Record<string, string> = {
    studentName: first.name,
    examName: selectedExam.value?.name ?? '',
    examDate: (selectedExam.value as { examDate?: string } | undefined)?.examDate ?? '',
    ...(row ? buildResultVariables(row, examFullMarks.value) : {}),
  }
  return tpl.body.replace(/{{\s*(\w+)\s*}}/g, (_m, key: string) => vars[key] ?? `{{${key}}}`)
})

const examSmsError = ref('')
const examSmsResult = ref('')
const { mutateAsync: sendExamBulk, isPending: sendingExam } = useSendBulkSms()
async function sendExamSms(): Promise<void> {
  examSmsError.value = ''
  examSmsResult.value = ''
  if (!examSms.examId) {
    examSmsError.value = 'Select a published exam.'
    return
  }
  if (!examSms.templateId) {
    examSmsError.value = 'Select a result template.'
    return
  }
  if (noResultSelected.value.length > 0) {
    examSmsError.value = `${noResultSelected.value.length} have no result — untick them before sending.`
    return
  }
  try {
    const res = await sendExamBulk({
      templateId: examSms.templateId,
      examId: examSms.examId,
      recipients: rosterSelected.value.map((s) => {
        const row = examRowByStudent.value.get(s.id)
        return {
          recipientId: s.id,
          recipientType: 'guardian',
          variables: {
            studentName: s.name,
            examName: selectedExam.value?.name ?? '',
            examDate: (selectedExam.value as { examDate?: string } | undefined)?.examDate ?? '',
            ...(row ? buildResultVariables(row, examFullMarks.value) : {}),
          },
        }
      }),
    })
    const failed = res.data.failed ?? []
    examSmsResult.value = res.data.sent > 0 ? `${res.data.sent} result SMS sent` : 'No recipients found'
    if (failed.length > 0) examSmsResult.value += ` · ${failed.length} failed (no phone)`
    toast.success(examSmsResult.value)
  } catch (e) {
    examSmsError.value = e instanceof Error ? e.message : 'Failed'
  }
}

// ---------- templates: read-only list (CRUD → /super-admin/sms) ----------

// ---------- history: chips + search + expand (coaching pattern) ----------
const histStatus = ref('')
const histSearch = ref('')
const histParams = computed(() => ({
  status: histStatus.value || undefined,
  search: histSearch.value.trim() || undefined,
}))
const { data: logData, isLoading: logsLoading } = useSmsLogs(histParams)
const logs = computed(() => logData.value?.data ?? [])
const statusChips = computed(() => [
  { key: '', label: 'All', count: allLogs.value.length },
  { key: 'sent', label: 'Sent', count: statusCounts.value.sent },
  { key: 'failed', label: 'Failed', count: statusCounts.value.failed },
  { key: 'pending', label: 'Pending', count: statusCounts.value.pending },
])
const filteredLogs = computed(() => {
  const q = histSearch.value.trim().toLowerCase()
  if (!q) return logs.value
  return logs.value.filter((l) =>
    [l.recipientName, l.phone, l.message, l.templateName, (l as { examName?: string }).examName ?? '']
      .join(' ')
      .toLowerCase()
      .includes(q),
  )
})
const { page, perPage } = usePagedList(10)
watch([histStatus, histSearch], () => {
  page.value = 1
})
const pagedLogs = computed(() => {
  const start = (page.value - 1) * perPage.value
  return filteredLogs.value.slice(start, start + perPage.value)
})
const expandedMsgs = ref(new Set<string>())
function toggleMsg(id: string): void {
  const next = new Set(expandedMsgs.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedMsgs.value = next
}
function shortMsg(msg: string): string {
  return msg.length > 90 ? `${msg.slice(0, 90)}… (more)` : msg
}
function formatTime(iso: string): string {
  if (!iso) return '—'
  return iso.slice(0, 16).replace('T', ' ')
}
</script>

<style scoped>
.page__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
}
.page__title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
}
.balance {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-size: var(--font-size-sm);
}
.balance__label {
  color: var(--color-text-muted);
  text-transform: uppercase;
  font-size: var(--font-size-xs);
  letter-spacing: 0.04em;
}
.balance--low {
  border-color: var(--color-danger);
}
.main-tabs {
  display: flex;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--spacing-sm);
}
.main-tab {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: var(--radius-md);
  padding: 6px var(--spacing-lg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}
.main-tab--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-primary-contrast);
}
.mode-row {
  display: flex;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}
.mode-row--sub {
  margin-bottom: var(--spacing-sm);
}
.mode-row--sub .main-tab {
  padding: 4px var(--spacing-md);
  font-size: var(--font-size-xs);
}
.picked {
  font-size: var(--font-size-sm);
}
.pick-btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: inherit;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
  cursor: pointer;
  text-align: left;
}
.roster__row--picked {
  background: var(--color-primary-light);
}
.roster {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.roster__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
  font-size: var(--font-size-sm);
}
.roster__list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.roster__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
.roster__check {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
}
.roster__check input {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary);
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}
@media (max-width: 640px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }
}
.stat-grid :deep(.app-card__body) {
  padding: var(--spacing-md) var(--spacing-lg);
}
.stat-label {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  margin: 0 0 4px;
}
.stat-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin: 0;
}
.usage-bar {
  height: 10px;
  border-radius: var(--radius-full);
  background: var(--color-surface-alt);
  overflow: hidden;
  margin: var(--spacing-sm) 0;
}
.usage-bar__fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  transition: width 0.3s;
}
.chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin: var(--spacing-sm) 0;
}
.chip-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: var(--radius-full);
  padding: 4px var(--spacing-md);
  font-size: var(--font-size-xs);
  cursor: pointer;
}
.chip-btn--active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-primary-contrast);
  font-weight: var(--font-weight-semibold);
}
.quick-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
}
.form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
.form h4 {
  margin: 0;
}
.form label {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-sm);
}
@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
.vars {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  align-items: center;
}
.vars code {
  background: var(--color-surface-alt);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0 6px;
  font-size: var(--font-size-xs);
}
.preview {
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-surface-alt);
  font-size: var(--font-size-sm);
}
.preview__label {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}
.preview p {
  margin: var(--spacing-xs) 0;
}
.muted {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
.error {
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}
.success {
  color: var(--color-success);
  font-size: var(--font-size-sm);
}
.list {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--spacing-md);
  display: flex;
  flex-direction: column;
}
.list__row {
  display: flex;
  justify-content: space-between;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}
.row-btns {
  display: inline-flex;
  gap: var(--spacing-sm);
  align-items: center;
  flex-shrink: 0;
}
.link-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-primary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  text-decoration: none;
}
.link-danger {
  background: none;
  border: none;
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  flex-shrink: 0;
  cursor: pointer;
}
.table-scroll {
  overflow-x: auto;
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
  vertical-align: top;
}
.msg {
  max-width: 320px;
}
.msg-toggle {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.pill {
  display: inline-block;
  padding: 1px var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  text-transform: capitalize;
}
.pill--sent {
  background: var(--color-success-light);
  color: var(--color-success);
}
.pill--failed {
  background: var(--color-danger-light);
  color: var(--color-danger);
}
.pill--pending {
  background: var(--color-warning-light);
  color: var(--color-warning);
}
</style>
