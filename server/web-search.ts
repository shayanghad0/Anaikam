export interface WebSearchResult {
  title: string
  url: string
  snippet: string
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function decodeDdgUrl(href: string): string {
  try {
    if (href.startsWith('//')) href = `https:${href}`
    if (href.includes('duckduckgo.com/l/')) {
      const u = new URL(href)
      const udg = u.searchParams.get('uddg')
      if (udg) return decodeURIComponent(udg)
    }
    return href
  } catch {
    return href
  }
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function webSearch(query: string, signal?: AbortSignal): Promise<WebSearchResult[]> {
  const q = query.trim().slice(0, 400)
  if (!q) return []

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort)

  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html',
      },
      signal: controller.signal,
    })
    if (!res.ok) return []
    const html = await res.text()

    const results: WebSearchResult[] = []
    const anchors = html.matchAll(
      /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    )
    const snippets = [...html.matchAll(/<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)]

    let i = 0
    for (const m of anchors) {
      const url = decodeDdgUrl(m[1])
      if (!url || url.includes('duckduckgo.com')) continue
      const title = stripTags(m[2])
      if (!title) continue
      const snippet = snippets[i] ? stripTags(snippets[i][1]) : ''
      results.push({ title, url, snippet: snippet.slice(0, 400) })
      i++
      if (results.length >= 6) break
    }
    return results
  } catch {
    return []
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

export function formatSearchContext(query: string, results: WebSearchResult[]): string {
  if (!results.length) {
    return `[Web search for "${query}" returned no results. Answer from your knowledge and note that live search was unavailable.]`
  }
  const lines = results.map(
    (r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet || '(no snippet)'}`,
  )
  return [
    `[Live web search results for: "${query}"]`,
    ...lines,
    '',
    'Use these results when relevant. Prefer current facts from the results, cite sources with links when you use them, and say clearly when the results do not answer the question.',
  ].join('\n')
}
