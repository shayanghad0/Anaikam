import * as React from 'react'
import { configApi } from '@/services/client'
import { hexToHslString } from '@/lib/utils'
import type { AppearanceSettings, ChatDisplaySettings, ConfigUpdate, PublicConfig } from '@shared/types'
import { DEFAULT_CHAT_SETTINGS, DEFAULT_APPEARANCE } from '@shared/types'

interface SettingsContextValue {
  config: PublicConfig | null
  loading: boolean
  appearance: AppearanceSettings
  chatSettings: ChatDisplaySettings
  resolvedTheme: 'dark' | 'light'
  selectedModel: string
  setSelectedModel: (m: string) => void
  refresh: () => Promise<void>
  update: (patch: ConfigUpdate) => Promise<PublicConfig>
}

const SettingsContext = React.createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = React.useState<PublicConfig | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [resolvedTheme, setResolvedTheme] = React.useState<'dark' | 'light'>('dark')
  const [selectedModel, setSelectedModel] = React.useState('')

  const applyAppearance = React.useCallback((appearance: AppearanceSettings) => {
    const root = document.documentElement
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const theme = appearance.theme === 'system' ? (prefersDark ? 'dark' : 'light') : appearance.theme
    root.classList.toggle('dark', theme === 'dark')
    root.classList.toggle('light', theme === 'light')
    root.style.setProperty('--primary', hexToHslString(appearance.accentColor))
    root.style.setProperty('--ring', hexToHslString(appearance.accentColor))
    root.style.setProperty('--chat-width', `${appearance.chatWidth}px`)
    root.style.setProperty('--app-font-size', `${appearance.fontSize}px`)
    setResolvedTheme(theme)
  }, [])

  const refresh = React.useCallback(async () => {
    try {
      const data = await configApi.get()
      setConfig(data)
      applyAppearance(data.appearance)
    } catch {
      setConfig(null)
    } finally {
      setLoading(false)
    }
  }, [applyAppearance])

  React.useEffect(() => {
    void refresh()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      setConfig((current) => {
        if (current && current.appearance.theme === 'system') {
          applyAppearance(current.appearance)
        }
        return current
      })
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [refresh, applyAppearance])

  React.useEffect(() => {
    if (config?.model && (!selectedModel || selectedModel === config.model)) {
      setSelectedModel(config.model)
    }
  }, [config?.model])

  const update = React.useCallback(
    async (patch: ConfigUpdate) => {
      const next = await configApi.update(patch)
      setConfig(next)
      if (patch.appearance) applyAppearance(next.appearance)
      return next
    },
    [applyAppearance],
  )

  const value = React.useMemo<SettingsContextValue>(
    () => ({
      config,
      loading,
      appearance: config?.appearance ?? { ...DEFAULT_APPEARANCE },
      chatSettings: { ...DEFAULT_CHAT_SETTINGS, ...(config?.chat ?? {}) },
      resolvedTheme,
      selectedModel,
      setSelectedModel,
      refresh,
      update,
    }),
    [config, loading, resolvedTheme, selectedModel, refresh, update],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const ctx = React.useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
