import type { ReactNode } from 'react'
import type { ChangeRecord, TaskRecord } from '../types'
import type { ChangeService } from '../services/ChangeService'
import type { JiraService } from '../services/JiraService'
import type { UserService } from '../services/UserService'
import type { SnowAmb } from '../services/SnowAmb'
import { ChangeDetailView, type DetailTab } from './ChangeDetailView'
import { JiraDetailView } from './JiraDetailView'
import { TaskDetailView } from './TaskDetailView'
import { PersonDetailView } from './PersonDetailView'

/**
 * What a record surface is showing. A change is the BASE record; a Jira issue,
 * a person or a change task LAYERS over it (mutually exclusive — opening one
 * closes the others), and `id` survives underneath as the return path. Closing
 * an overlay lands on the record's home: the change's Jiras tab for an issue,
 * its Change tasks tab for a task, the change as-you-left-it for a person.
 */
export interface DetailNav {
  id: string | null
  jiraKey: string | null
  personId: string | null
  taskId: string | null
}

export const EMPTY_NAV: DetailNav = { id: null, jiraKey: null, personId: null, taskId: null }

/**
 * The one record-rendering switch, shared by the detail pane (rootLabel
 * "Weekend activity", resting view = the activity feed, URL-synced nav) and
 * the grid popout (rootLabel "Grid", no resting view, local nav). Keeping it
 * single-sourced is what guarantees a record looks and navigates identically
 * whether it opened beside the list or over the grid.
 */
export function RecordPane({
  nav,
  rootLabel,
  tab,
  onTabChange,
  changeNumber,
  onChangeLoaded,
  onTaskLoaded,
  onPersonLoaded,
  service,
  jiraService,
  userService,
  amb,
  refreshKey,
  changes,
  tasks,
  tasksByChange,
  onOpenChange,
  onOpenJira,
  onOpenPerson,
  onOpenTask,
  onCloseJira,
  onClosePerson,
  onCloseTask,
  onBackFromChange,
  resting,
}: {
  nav: DetailNav
  /** What the base record's back affordance names — the feed, or the grid. */
  rootLabel: string
  tab: DetailTab
  onTabChange: (tab: DetailTab) => void
  /** The base change's number, once known — overlays name it on their back button. */
  changeNumber: string | undefined
  onChangeLoaded: (changeNumber: string) => void
  onTaskLoaded?: (taskNumber: string) => void
  onPersonLoaded?: (name: string) => void
  service: ChangeService
  jiraService: JiraService
  userService: UserService
  amb: SnowAmb
  refreshKey: number
  changes: ChangeRecord[]
  tasks: TaskRecord[]
  tasksByChange: Map<string, TaskRecord[]>
  onOpenChange: (sysId: string, tab?: DetailTab) => void
  onOpenJira: (key: string) => void
  onOpenPerson: (personSysId: string) => void
  onOpenTask: (taskSysId: string, changeSysId: string) => void
  onCloseJira: () => void
  onClosePerson: () => void
  onCloseTask: () => void
  onBackFromChange: () => void
  /** Rendered when nothing is open. The pane passes the feed; the popout never
      renders empty (it closes instead), so it passes null. */
  resting: ReactNode
}) {
  const overlayBack = nav.id ? (changeNumber ?? 'Change') : rootLabel

  if (nav.personId) {
    return (
      <PersonDetailView
        userService={userService}
        personId={nav.personId}
        backLabel={overlayBack}
        onBack={onClosePerson}
        onLoaded={onPersonLoaded}
        changes={changes}
        tasks={tasks}
        tasksByChange={tasksByChange}
        onOpenChange={onOpenChange}
        onOpenTask={onOpenTask}
      />
    )
  }
  if (nav.taskId) {
    return (
      <TaskDetailView
        service={service}
        amb={amb}
        sysId={nav.taskId}
        refreshKey={refreshKey}
        backLabel={overlayBack}
        onBack={onCloseTask}
        onLoaded={onTaskLoaded}
        onOpenChange={onOpenChange}
        onOpenPerson={onOpenPerson}
        onOpenJira={onOpenJira}
      />
    )
  }
  if (nav.jiraKey) {
    return (
      <JiraDetailView
        service={jiraService}
        amb={amb}
        issueKey={nav.jiraKey}
        refreshKey={refreshKey}
        backLabel={overlayBack}
        onBack={onCloseJira}
        onOpenChange={onOpenChange}
      />
    )
  }
  if (nav.id) {
    return (
      <ChangeDetailView
        service={service}
        jiraService={jiraService}
        amb={amb}
        sysId={nav.id}
        refreshKey={refreshKey}
        tab={tab}
        onTabChange={onTabChange}
        onLoaded={onChangeLoaded}
        backLabel={rootLabel}
        onBack={onBackFromChange}
        onOpenJira={onOpenJira}
        onOpenTask={onOpenTask}
        onOpenPerson={onOpenPerson}
      />
    )
  }
  return <>{resting}</>
}
