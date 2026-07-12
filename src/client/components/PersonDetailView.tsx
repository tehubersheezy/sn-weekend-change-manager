import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { ChangeRecord, TaskRecord } from '../types'
import type { UserService, UserRecord } from '../services/UserService'
import { display, value } from '../utils/fields'
import { taskProgress } from '../utils/progress'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Skeleton } from './ui/skeleton'
import { CenteredState, GroupLabel } from './ChangeList'
import { ChangeCard } from './ChangeCard'
import { TaskList } from './TaskList'

/**
 * A person, as a page: who they are (sys_user name + title) and what's on
 * their plate THIS WEEKEND — the changes and change tasks assigned to them,
 * filtered from the window population the app already holds.
 *
 * The lists never wait on the network: they come from props and render
 * immediately (and refresh live, since the parent arrays are AMB-fed). Only
 * the title needs a sys_user fetch — so a failed lookup degrades to a page
 * with no job title, not an error page, unless we know nothing about the
 * person at all. Scope is deliberately the window, not all time: this console
 * answers "what is this person doing this weekend", not "who is this person
 * in the org".
 */
export function PersonDetailView({
  userService,
  personId,
  backLabel,
  onBack,
  onLoaded,
  changes,
  tasks,
  tasksByChange,
  onOpenChange,
  onOpenTask,
}: {
  userService: UserService
  personId: string
  /** What closing this page returns to — a change number, or the root view. */
  backLabel: string
  onBack: () => void
  onLoaded?: (name: string) => void
  /** The weekend window population, already loaded and live in the shell. */
  changes: ChangeRecord[]
  tasks: TaskRecord[]
  tasksByChange: Map<string, TaskRecord[]>
  onOpenChange: (sysId: string) => void
  onOpenTask: (taskSysId: string, changeSysId: string) => void
}) {
  const [user, setUser] = useState<UserRecord | null>(null)
  const [pending, setPending] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setPending(true)
    setFailed(false)
    setUser(null)
    userService
      .getUser(personId)
      .then((u) => {
        if (!cancelled) setUser(u)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setPending(false)
      })
    return () => {
      cancelled = true
    }
  }, [userService, personId])

  const myChanges = useMemo(
    () => changes.filter((c) => value(c.assigned_to) === personId),
    [changes, personId],
  )
  const myTasks = useMemo(
    () => tasks.filter((t) => value(t.assigned_to) === personId),
    [tasks, personId],
  )

  // The window rows already carry the display name — use it while (or if) the
  // sys_user read hasn't landed, so the page never blocks on the lookup.
  const fallbackName =
    (myChanges[0] && display(myChanges[0].assigned_to)) ||
    (myTasks[0] && display(myTasks[0].assigned_to)) ||
    ''
  const name = (user && display(user.name)) || fallbackName
  const title = user ? display(user.title) : ''

  useEffect(() => {
    if (name) onLoaded?.(name)
  }, [name, onLoaded])

  const counts = [
    `${myChanges.length} change${myChanges.length === 1 ? '' : 's'}`,
    `${myTasks.length} change task${myTasks.length === 1 ? '' : 's'}`,
  ].join(' · ')

  // Nothing assigned, lookup failed, nothing cached: we know literally nothing.
  const unknowable = failed && !name

  return (
    <div className="flex flex-col gap-8 px-8 py-8">
      <div className="-mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3.5 text-muted-foreground"
          onClick={onBack}
        >
          <ArrowLeft />
          {backLabel}
        </Button>
      </div>

      {unknowable ? (
        <CenteredState title="Person not found">
          <p className="max-w-md text-body-sm text-muted-foreground">
            This user couldn't be read from sys_user, and nothing in the window is assigned to
            them.
          </p>
        </CenteredState>
      ) : (
        // Content arrival. Keyed by personId: this page renders straight from
        // props (no loading flip to remount it), so navigating person → person
        // — a task's assignee from another person's task list — replays the
        // rise by remounting this block. The AMB-fed arrays refresh props
        // without touching the key, so live updates stay quiet.
        <div key={personId} className="flex animate-rise-in flex-col gap-8">
          <header className="flex flex-col gap-2">
            <div className="font-sans text-caption text-muted-foreground">Person</div>
            {name ? (
              <h2 className="text-display-sm text-ink">{name}</h2>
            ) : (
              <Skeleton className="h-8 w-2/5" />
            )}
            {pending && !user ? null : title ? (
              <p className="text-body-sm text-muted-foreground">{title}</p>
            ) : null}
            <p className="mt-2 text-caption text-muted-foreground">{counts} this weekend</p>
          </header>

          <section className="flex flex-col gap-3">
            <GroupLabel>Changes this weekend</GroupLabel>
            {myChanges.length === 0 ? (
              <Card className="p-6 text-sm text-muted-foreground">
                No changes assigned to them in this window.
              </Card>
            ) : (
              myChanges.map((c) => (
                <ChangeCard
                  key={value(c.sys_id)}
                  change={c}
                  progress={taskProgress(tasksByChange.get(value(c.sys_id)) ?? [])}
                  onOpen={onOpenChange}
                />
              ))
            )}
          </section>

          <section className="flex flex-col gap-3">
            <GroupLabel>Change tasks this weekend</GroupLabel>
            {myTasks.length === 0 ? (
              <Card className="p-6 text-sm text-muted-foreground">
                No change tasks assigned to them in this window.
              </Card>
            ) : (
              <TaskList
                tasks={myTasks}
                showChange
                showAssignee={false}
                onOpenTask={onOpenTask}
                onOpenChange={onOpenChange}
              />
            )}
          </section>
        </div>
      )}
    </div>
  )
}
