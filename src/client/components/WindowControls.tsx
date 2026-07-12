import { useState } from 'react'
import { ChevronLeft, ChevronRight, Settings2, Undo2 } from 'lucide-react'
import type { WindowConfig } from '../utils/weekendWindow'
import { DEFAULT_WINDOW_CONFIG } from '../utils/weekendWindow'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Input } from './ui/input'

/**
 * Weekend selector (‹ current weekend ›) plus the change-window settings
 * dialog. The window label itself is rendered by the caller — this row only
 * carries the controls.
 */
export function WindowControls({
  weekOffset,
  onWeekOffset,
  config,
  onConfigChange,
}: {
  weekOffset: number
  onWeekOffset: (offset: number) => void
  config: WindowConfig
  onConfigChange: (config: WindowConfig) => void
}) {
  return (
    <div className="flex items-center gap-2">
      {weekOffset !== 0 && (
        <Button
          variant="secondary"
          size="icon"
          aria-label="Back to this weekend"
          title="Back to this weekend"
          onClick={() => onWeekOffset(0)}
        >
          <Undo2 />
        </Button>
      )}
      <Button
        variant="secondary"
        size="icon"
        aria-label="Previous weekend"
        onClick={() => onWeekOffset(weekOffset - 1)}
      >
        <ChevronLeft />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        aria-label="Next weekend"
        onClick={() => onWeekOffset(weekOffset + 1)}
      >
        <ChevronRight />
      </Button>
      <WindowSettingsDialog config={config} onConfigChange={onConfigChange} />
    </div>
  )
}

function WindowSettingsDialog({
  config,
  onConfigChange,
}: {
  config: WindowConfig
  onConfigChange: (config: WindowConfig) => void
}) {
  const [open, setOpen] = useState(false)
  const [startTime, setStartTime] = useState(config.startTime)
  const [endTime, setEndTime] = useState(config.endTime)

  const openChange = (next: boolean) => {
    if (next) {
      // Re-seed the form from the live config each time the dialog opens.
      setStartTime(config.startTime)
      setEndTime(config.endTime)
    }
    setOpen(next)
  }

  const save = () => {
    onConfigChange({
      startTime: startTime || DEFAULT_WINDOW_CONFIG.startTime,
      endTime: endTime || DEFAULT_WINDOW_CONFIG.endTime,
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="icon" aria-label="Change window settings">
          <Settings2 />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change window</DialogTitle>
          <DialogDescription>
            The weekend window runs Friday to Sunday in US Eastern time.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-body-text">Friday start (ET)</span>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-body-text">Sunday end (ET)</span>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
          {/*
            The system's text-link, not a hand-rolled <button>. The hand-rolled one
            was keyboard-focusable with no focus indicator at all, and painted in
            the coral FILL hue (3.1:1 on cream). The link variant carries both the
            shared focus ring and primary-ink. -ml-3.5 cancels the size padding so
            the label still sits flush with the two fields above it.
          */}
          <Button
            variant="link"
            size="sm"
            className="-ml-3.5 self-start"
            onClick={() => {
              setStartTime(DEFAULT_WINDOW_CONFIG.startTime)
              setEndTime(DEFAULT_WINDOW_CONFIG.endTime)
            }}
          >
            Reset to default (5:00 PM – 11:59 PM)
          </Button>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
