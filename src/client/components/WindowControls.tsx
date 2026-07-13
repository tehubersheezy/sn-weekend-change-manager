import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Settings2, Undo2 } from 'lucide-react'
import type { WindowConfig } from '../utils/weekendWindow'
import { DEFAULT_WINDOW_CONFIG } from '../utils/weekendWindow'
import { browserTimeZone, zoneAbbreviation } from '../utils/datetime'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

/**
 * LLM connection settings — persisted plumbing for future AI features, with no
 * consumer yet. Lives beside the settings dialog that edits it (mirrors how
 * WindowConfig lives beside the window math it drives).
 */
export interface LlmConfig {
  endpoint: string
  token: string
}

export const DEFAULT_LLM_CONFIG: LlmConfig = { endpoint: '', token: '' }

/**
 * Zones offered when Intl.supportedValuesOf is unavailable. The browser zone is
 * prepended and deduped by the option builder, so it is omitted here.
 */
const FALLBACK_ZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Zurich',
  'Asia/Hong_Kong',
  'Asia/Tokyo',
  'Australia/Sydney',
]

/** IANA id → human label: 'America/New_York' → 'America/New York'. */
const readableZone = (zone: string) => zone.replace(/_/g, ' ')

/**
 * Weekend selector (‹ current weekend ›) plus the settings dialog (change
 * window + timezone + LLM connection). The window label itself is rendered by
 * the caller — this row only carries the controls.
 */
export function WindowControls({
  weekOffset,
  onWeekOffset,
  config,
  onConfigChange,
  llmConfig,
  onLlmConfigChange,
}: {
  weekOffset: number
  onWeekOffset: (offset: number) => void
  config: WindowConfig
  onConfigChange: (config: WindowConfig) => void
  llmConfig: LlmConfig
  onLlmConfigChange: (config: LlmConfig) => void
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
      <SettingsDialog
        config={config}
        onConfigChange={onConfigChange}
        llmConfig={llmConfig}
        onLlmConfigChange={onLlmConfigChange}
      />
    </div>
  )
}

function SettingsDialog({
  config,
  onConfigChange,
  llmConfig,
  onLlmConfigChange,
}: {
  config: WindowConfig
  onConfigChange: (config: WindowConfig) => void
  llmConfig: LlmConfig
  onLlmConfigChange: (config: LlmConfig) => void
}) {
  const [open, setOpen] = useState(false)
  const [startTime, setStartTime] = useState(config.startTime)
  const [endTime, setEndTime] = useState(config.endTime)
  const [timeZone, setTimeZone] = useState(config.timeZone)
  const [endpoint, setEndpoint] = useState(llmConfig.endpoint)
  const [token, setToken] = useState(llmConfig.token)

  // The full zone list: the browser zone pinned first (and deduped), then the
  // current selection (so a persisted non-canonical zone still has a matching
  // item and the trigger never renders blank), then every zone Intl knows — or
  // a curated fallback where Intl.supportedValuesOf isn't available.
  const zoneOptions = useMemo(() => {
    const seen = new Set<string>()
    const add = (z: string) => {
      if (z) seen.add(z)
    }
    add(browserTimeZone())
    add(config.timeZone)
    const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
      .supportedValuesOf
    const list = typeof supported === 'function' ? supported('timeZone') : FALLBACK_ZONES
    for (const z of list) add(z)
    return [...seen]
  }, [config.timeZone])

  const openChange = (next: boolean) => {
    if (next) {
      // Re-seed every field from the live config each time the dialog opens.
      setStartTime(config.startTime)
      setEndTime(config.endTime)
      setTimeZone(config.timeZone)
      setEndpoint(llmConfig.endpoint)
      setToken(llmConfig.token)
    }
    setOpen(next)
  }

  const save = () => {
    onConfigChange({
      startTime: startTime || DEFAULT_WINDOW_CONFIG.startTime,
      endTime: endTime || DEFAULT_WINDOW_CONFIG.endTime,
      timeZone: timeZone || DEFAULT_WINDOW_CONFIG.timeZone,
    })
    onLlmConfigChange({ endpoint: endpoint.trim(), token })
    setOpen(false)
  }

  // Live abbreviation of the DRAFT zone (EDT, CET, …) for the time-field
  // captions — recomputed as the select changes so the labels track it.
  const abbr = zoneAbbreviation(timeZone, new Date())
  const startLabel = abbr ? `Friday start (${abbr})` : 'Friday start'
  const endLabel = abbr ? `Sunday end (${abbr})` : 'Sunday end'

  return (
    <Dialog open={open} onOpenChange={openChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="icon" aria-label="Settings">
          <Settings2 />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            The weekend window runs Friday to Sunday in {readableZone(timeZone)}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {/* Select's trigger is a button, not a labelable field, so this is a
              div + aria-labelledby rather than a wrapping <label>. */}
          <div className="flex flex-col gap-1.5">
            <span id="wcm-timezone-label" className="text-caption font-medium text-body-text">
              Timezone
            </span>
            <Select value={timeZone} onValueChange={setTimeZone}>
              <SelectTrigger aria-labelledby="wcm-timezone-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {zoneOptions.map((z) => (
                  <SelectItem key={z} value={z}>
                    {readableZone(z)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-body-text">{startLabel}</span>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-body-text">{endLabel}</span>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
          {/*
            The system's text-link, not a hand-rolled <button>. The hand-rolled one
            was keyboard-focusable with no focus indicator at all, and painted in
            the coral FILL hue (3.1:1 on cream). The link variant carries both the
            shared focus ring and primary-ink. -ml-3.5 cancels the size padding so
            the label still sits flush with the fields above it. Scope is the
            window only (times + zone), which is why it sits with those fields and
            not below the LLM ones. Default zone is the browser's, i.e. local time.
          */}
          <Button
            variant="link"
            size="sm"
            className="-ml-3.5 self-start"
            onClick={() => {
              setStartTime(DEFAULT_WINDOW_CONFIG.startTime)
              setEndTime(DEFAULT_WINDOW_CONFIG.endTime)
              setTimeZone(DEFAULT_WINDOW_CONFIG.timeZone)
            }}
          >
            Reset window to default (5:00 PM – 11:59 PM, local time)
          </Button>
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-body-text">LLM endpoint</span>
            <Input
              type="text"
              placeholder="https://api.example.com/v1"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-body-text">LLM token</span>
            <Input
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </label>
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
