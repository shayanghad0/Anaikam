import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  KeyRound,
  Palette,
  MessageSquareText,
  User,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  Database,
  Upload,
  Download,
} from 'lucide-react'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { useSettings } from '@/contexts/SettingsContext'
import { useAuth } from '@/contexts/AuthContext'
import { configApi, backupApi } from '@/services/client'
import type { AppearanceSettings, ChatDisplaySettings } from '@shared/types'

const ACCENTS = ['#7C3AED', '#2563EB', '#0891B2', '#059669', '#D97706', '#DB2777', '#DC2626', '#4F46E5']

export default function SettingsPage() {
  const { config, update, loading } = useSettings()
  const { refresh: refreshAuth } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [saving, setSaving] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [showKey, setShowKey] = React.useState(false)
  const [testResult, setTestResult] = React.useState<{ ok: boolean; message: string } | null>(null)
  const [backupLoading, setBackupLoading] = React.useState(false)
  const backupFileRef = React.useRef<HTMLInputElement>(null)

  const [username, setUsername] = React.useState('')
  const [currentPassword, setCurrentPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')

  const [ai, setAi] = React.useState({
    apiProviderName: '',
    apiBaseURL: '',
    apiKey: '',
    model: '',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 16384,
    topP: 1,
    presencePenalty: 0,
    frequencyPenalty: 0,
    stream: true,
  })

  const [appearance, setAppearance] = React.useState<AppearanceSettings>({
    theme: 'system',
    accentColor: '#7C3AED',
    chatWidth: 768,
    fontSize: 16,
  })

  const [chat, setChat] = React.useState<ChatDisplaySettings>({
    autoScroll: true,
    showTokenCount: true,
    showModelName: true,
    showTimestamp: true,
    enableMarkdown: true,
    enableMermaid: true,
    enableKaTeX: true,
    webSearch: false,
    deepThink: false,
    thinkMode: 'off',
  })

  React.useEffect(() => {
    if (!config) return
    setUsername(config.username)
    setAi({
      apiProviderName: config.apiProviderName,
      apiBaseURL: config.apiBaseURL,
      apiKey: '',
      model: config.model,
      systemPrompt: config.systemPrompt,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
      presencePenalty: config.presencePenalty,
      frequencyPenalty: config.frequencyPenalty,
      stream: config.stream,
    })
    setAppearance(config.appearance)
    setChat(config.chat)
  }, [config])

  const saveAll = async () => {
    setSaving(true)
    setTestResult(null)
    try {
      const patch: Parameters<typeof update>[0] = {
        apiProviderName: ai.apiProviderName,
        apiBaseURL: ai.apiBaseURL,
        model: ai.model,
        systemPrompt: ai.systemPrompt,
        temperature: ai.temperature,
        maxTokens: ai.maxTokens,
        topP: ai.topP,
        presencePenalty: ai.presencePenalty,
        frequencyPenalty: ai.frequencyPenalty,
        stream: ai.stream,
        appearance,
        chat,
      }
      if (ai.apiKey.trim()) patch.apiKey = ai.apiKey.trim()
      if (username.trim() && username.trim() !== config?.username) patch.username = username.trim()
      if (newPassword) {
        patch.password = newPassword
        patch.currentPassword = currentPassword
      }

      await update(patch)
      await refreshAuth()
      setCurrentPassword('')
      setNewPassword('')
      setAi((prev) => ({ ...prev, apiKey: '' }))
      toast({ title: 'Settings saved', variant: 'success' })
    } catch (err) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Could not save settings',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      if (ai.apiKey.trim() || ai.apiBaseURL !== config?.apiBaseURL || ai.model !== config?.model) {
        await update({
          apiBaseURL: ai.apiBaseURL,
          model: ai.model,
          ...(ai.apiKey.trim() ? { apiKey: ai.apiKey.trim() } : {}),
          ...(ai.apiProviderName !== config?.apiProviderName ? { apiProviderName: ai.apiProviderName } : {}),
        })
      }
      const res = await configApi.test()
      if (res.ok) {
        setTestResult({ ok: true, message: res.warning || `Connected${res.modelCount ? ` · ${res.modelCount} models available` : ''}` })
      } else {
        setTestResult({ ok: false, message: res.error || 'Connection failed' })
      }
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : 'Connection failed' })
    } finally {
      setTesting(false)
    }
  }

  const reset = async () => {
    if (!config) return
    setAi({
      apiProviderName: config.apiProviderName,
      apiBaseURL: config.apiBaseURL,
      apiKey: '',
      model: config.model,
      systemPrompt: config.systemPrompt,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      topP: config.topP,
      presencePenalty: config.presencePenalty,
      frequencyPenalty: config.frequencyPenalty,
      stream: config.stream,
    })
    setAppearance(config.appearance)
    setChat(config.chat)
    setUsername(config.username)
    setCurrentPassword('')
    setNewPassword('')
    setTestResult(null)
    toast({ title: 'Changes reset', description: 'Reloaded last saved settings' })
  }

  if (loading || !config) {
    return (
      <AppShell>
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="h-6 w-6 text-primary" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl">
        <Button size="icon-sm" variant="ghost" onClick={() => navigate('/')} aria-label="Back to chat">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-sm font-semibold">Settings</h1>
          <p className="text-[11px] text-muted-foreground">Account, AI provider, appearance & chat</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto w-full max-w-2xl px-4 py-6 pb-24">
          <Tabs defaultValue="ai">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="ai">
                <Sparkles className="h-3.5 w-3.5" /> AI
              </TabsTrigger>
              <TabsTrigger value="account">
                <User className="h-3.5 w-3.5" /> Account
              </TabsTrigger>
              <TabsTrigger value="appearance">
                <Palette className="h-3.5 w-3.5" /> Appearance
              </TabsTrigger>
              <TabsTrigger value="chat">
                <MessageSquareText className="h-3.5 w-3.5" /> Chat
              </TabsTrigger>
              <TabsTrigger value="backup">
                <Database className="h-3.5 w-3.5" /> Backup
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ai" className="space-y-5">
              <Section
                icon={<Sparkles className="h-4 w-4" />}
                title="AI Configuration"
                description="Works with any OpenAI-compatible API — OpenAI, OpenRouter, Groq, DeepSeek, Ollama, LM Studio, and more."
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Provider Name">
                    <Input
                      value={ai.apiProviderName}
                      onChange={(e) => setAi({ ...ai, apiProviderName: e.target.value })}
                      placeholder="OpenAI, OpenRouter, Ollama…"
                    />
                  </Field>
                  <Field label="Model">
                    <Input
                      value={ai.model}
                      onChange={(e) => setAi({ ...ai, model: e.target.value })}
                      placeholder="gpt-4.1, deepseek-chat, llama3…"
                    />
                  </Field>
                </div>
                <Field label="API Base URL">
                  <Input
                    value={ai.apiBaseURL}
                    onChange={(e) => setAi({ ...ai, apiBaseURL: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    spellCheck={false}
                  />
                </Field>
                <Field label="API Key" hint={config.hasApiKey && !ai.apiKey ? 'A key is saved. Leave blank to keep it.' : undefined}>
                  <div className="relative">
                    <Input
                      type={showKey ? 'text' : 'password'}
                      value={ai.apiKey}
                      onChange={(e) => setAi({ ...ai, apiKey: e.target.value })}
                      placeholder={config.hasApiKey ? '••••••••••••••••' : 'sk-…'}
                      className="pr-10"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                      onClick={() => setShowKey((v) => !v)}
                      aria-label={showKey ? 'Hide API key' : 'Show API key'}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
                <Field label="System Prompt">
                  <textarea
                    value={ai.systemPrompt}
                    onChange={(e) => setAi({ ...ai, systemPrompt: e.target.value })}
                    rows={4}
                    placeholder="You are a helpful assistant…"
                    className="flex w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm shadow-sm focus-visible:outline-2 focus-visible:outline-ring resize-y"
                  />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <SliderField
                    label="Temperature"
                    value={ai.temperature}
                    min={0}
                    max={2}
                    step={0.05}
                    onChange={(v) => setAi({ ...ai, temperature: v })}
                  />
                  <SliderField
                    label="Top P"
                    value={ai.topP}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(v) => setAi({ ...ai, topP: v })}
                  />
                  <SliderField
                    label="Presence Penalty"
                    value={ai.presencePenalty}
                    min={-2}
                    max={2}
                    step={0.1}
                    onChange={(v) => setAi({ ...ai, presencePenalty: v })}
                  />
                  <SliderField
                    label="Frequency Penalty"
                    value={ai.frequencyPenalty}
                    min={-2}
                    max={2}
                    step={0.1}
                    onChange={(v) => setAi({ ...ai, frequencyPenalty: v })}
                  />
                </div>

                <Field label="Max Tokens">
                  <Input
                    type="number"
                    min={1}
                    max={1000000}
                    value={ai.maxTokens}
                    onChange={(e) => setAi({ ...ai, maxTokens: Number(e.target.value) || 16384 })}
                  />
                </Field>

                <div className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Stream responses</p>
                    <p className="text-xs text-muted-foreground">Show tokens as they arrive</p>
                  </div>
                  <Switch
                    checked={ai.stream}
                    onCheckedChange={(v) => setAi({ ...ai, stream: v })}
                    aria-label="Stream responses"
                  />
                </div>

                {testResult ? (
                  <div
                    role="status"
                    className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
                      testResult.ok
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-destructive/40 bg-destructive/10 text-destructive'
                    }`}
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{testResult.message}</span>
                  </div>
                ) : null}
              </Section>
            </TabsContent>

            <TabsContent value="account" className="space-y-5">
              <Section icon={<KeyRound className="h-4 w-4" />} title="Account" description="Single owner credentials. Password changes require the current password.">
                <Field label="Username">
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Current password" hint={newPassword ? 'Required to change password' : undefined}>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      disabled={!newPassword}
                    />
                  </Field>
                  <Field label="New password" hint="Leave blank to keep current">
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="••••••••"
                    />
                  </Field>
                </div>
              </Section>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-5">
              <Section icon={<Palette className="h-4 w-4" />} title="Appearance" description="Theme, accent color, chat width, and font size.">
                <Field label="Theme">
                  <Select
                    value={appearance.theme}
                    onValueChange={(v) => setAppearance({ ...appearance, theme: v as AppearanceSettings['theme'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <div className="space-y-2">
                  <Label>Accent color</Label>
                  <div className="flex flex-wrap gap-2">
                    {ACCENTS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setAppearance({ ...appearance, accentColor: color })}
                        className={`h-8 w-8 cursor-pointer rounded-full border-2 transition-transform hover:scale-110 ${
                          appearance.accentColor === color ? 'border-foreground scale-105' : 'border-transparent'
                        }`}
                        style={{ background: color }}
                        aria-label={`Accent ${color}`}
                        aria-pressed={appearance.accentColor === color}
                      />
                    ))}
                    <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-border hover:border-primary">
                      <input
                        type="color"
                        value={appearance.accentColor}
                        onChange={(e) => setAppearance({ ...appearance, accentColor: e.target.value })}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        aria-label="Custom accent color"
                      />
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                        +
                      </span>
                    </label>
                  </div>
                </div>

                <SliderField
                  label="Chat width"
                  value={appearance.chatWidth}
                  min={560}
                  max={1100}
                  step={8}
                  format={(v) => `${v}px`}
                  onChange={(v) => setAppearance({ ...appearance, chatWidth: v })}
                />
                <SliderField
                  label="Font size"
                  value={appearance.fontSize}
                  min={14}
                  max={20}
                  step={1}
                  format={(v) => `${v}px`}
                  onChange={(v) => setAppearance({ ...appearance, fontSize: v })}
                />
              </Section>
            </TabsContent>

            <TabsContent value="chat" className="space-y-5">
              <Section icon={<MessageSquareText className="h-4 w-4" />} title="Chat" description="Control what appears in the conversation.">
                {(
                  [
                    ['autoScroll', 'Auto scroll', 'Keep the view pinned to the latest message'],
                    ['showTokenCount', 'Show token count', 'Display usage on responses'],
                    ['showModelName', 'Show model name', 'Display the model under responses'],
                    ['showTimestamp', 'Show timestamp', 'Display message times'],
                    ['enableMarkdown', 'Enable Markdown', 'Render rich text, tables, and code'],
                    ['enableMermaid', 'Enable Mermaid', 'Render ```mermaid diagrams'],
                    ['enableKaTeX', 'Enable KaTeX', 'Render math expressions'],
                    ['webSearch', 'Web search by default', 'Start new messages with search mode on'],
                  ] as Array<[keyof ChatDisplaySettings, string, string]>
                ).map(([key, label, desc]) => (
                  <div key={key} className="flex items-center justify-between rounded-xl border border-border p-3">
                    <div className="pr-4">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      checked={Boolean(chat[key])}
                      onCheckedChange={(v) => setChat({ ...chat, [key]: v })}
                      aria-label={label}
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div className="pr-4">
                    <p className="text-sm font-medium">Default thinking mode</p>
                    <p className="text-xs text-muted-foreground">Off answers instantly · Normal 30–60s · Deep 30s–5m</p>
                  </div>
                  <Select
                    value={chat.thinkMode}
                    onValueChange={(v) => setChat({ ...chat, thinkMode: v as ChatDisplaySettings['thinkMode'] })}
                  >
                    <SelectTrigger className="w-40" aria-label="Default thinking mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="normal">Normal thinking</SelectItem>
                      <SelectItem value="deep">Deep thinking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </Section>
            </TabsContent>

            <TabsContent value="backup" className="space-y-5">
              <Section icon={<Database className="h-4 w-4" />} title="Backup & Restore" description="Export your entire database (chats, config, attachments) to a JSON file, or restore from a previously exported backup.">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Button onClick={() => void backupApi.export()} disabled={backupLoading}>
                    <Download className="h-4 w-4" />
                    {backupLoading ? 'Exporting…' : 'Export Database'}
                  </Button>
                  <label className="relative">
                    <input
                      ref={backupFileRef}
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0]
                        if (!f) return
                        e.target.value = ''
                        setBackupLoading(true)
                        try {
                          const result = await backupApi.import(f)
                          toast({ title: 'Imported', description: `${result.chatsRestored} chats restored`, variant: 'success' })
                        } catch (err) {
                          toast({
                            title: 'Import failed',
                            description: err instanceof Error ? err.message : 'Invalid backup file',
                            variant: 'destructive',
                          })
                        } finally {
                          setBackupLoading(false)
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => backupFileRef.current?.click()}
                      disabled={backupLoading}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4" />
                      {backupLoading ? 'Importing…' : 'Import Database'}
                    </Button>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">Importing will replace all existing data with the contents of the backup file.</p>
              </Section>
            </TabsContent>
          </Tabs>

          <div className="sticky bottom-0 -mx-4 mt-6 border-t border-border bg-background/90 px-4 py-4 backdrop-blur-xl">
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => void reset()} disabled={saving}>
                Reset
              </Button>
              <Button variant="secondary" onClick={() => void testConnection()} disabled={testing || saving}>
                {testing ? <Spinner /> : null}
                Test connection
              </Button>
              <Button onClick={() => void saveAll()} disabled={saving}>
                {saving ? <Spinner /> : null}
                Save changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format?: (v: number) => string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {format ? format(value) : value.toFixed(2).replace(/\.00$/, '')}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        aria-label={label}
      />
    </div>
  )
}
