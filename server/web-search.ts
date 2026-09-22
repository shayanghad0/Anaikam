export interface WebSearchResult {
  title: string
  url: string
  snippet: string
}

const MAX_SOURCES = 35

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'

const SEARX_INSTANCES = [
  'https://s.trung.fun/search',
  'https://opnxng.com/search',
  'https://searx.perennialte.ch/search',
  'https://search.inetol.net/search',
  'https://paulgo.io/search',
  'https://searx.tiekoetter.com/search',
  'https://priv.au/search',
]

const STOPWORDS = new Set(
  'a an and are as at be by for from has have how i in is it of on or that the this to was what when where which who why will with you your'.split(
    ' ',
  ),
)

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ''
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|ref|ref_src|msockid)/i.test(key)) u.searchParams.delete(key)
    }
    const path = u.pathname.replace(/\/$/, '') || '/'
    return `${u.protocol}//${u.host}${path}${u.search ? `?${u.search}` : ''}`
  } catch {
    return url
  }
}

function isUsableUrl(url: string): boolean {
  if (!url || !/^https?:\/\//i.test(url)) return false
  if (
    /duckduckgo\.com|bing\.com\/ck|google\.|searx|paulgo\.io|tiekoetter|hbubli|disroot|perennialte|trung\.fun|opnxng|inetol|priv\.au|northboot|projectsegfau|baresearch|rhscz/i.test(
      url,
    )
  ) {
    return false
  }
  if (/\.(png|jpe?g|gif|svg|webp|mp4|mp3)(\?|$)/i.test(url)) return false
  return true
}

/** Soft relevance: drop only clearly off-topic hits; keep strong matches first. */
function scoreRelevance(query: string, item: WebSearchResult): number {
  const qTokens = tokens(query)
  if (!qTokens.length) return 1
  const hay = `${item.title} ${item.snippet} ${decodeURIComponent(item.url)}`.toLowerCase()
  let hits = 0
  for (const t of qTokens) {
    if (hay.includes(t)) hits++
  }
  if (hits === 0) return 0
  return hits / qTokens.length
}

function filterRelevant(query: string, items: WebSearchResult[]): WebSearchResult[] {
  const scored = items
    .map((item) => ({ item, score: scoreRelevance(query, item) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.map((x) => x.item)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchHtml(url: string, signal: AbortSignal, timeoutMs = 12_000): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
      redirect: 'follow',
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  }
}

function parseSearxHtml(html: string): WebSearchResult[] {
  const results: WebSearchResult[] = []
  const blocks = html.split(/<article/i).slice(1)
  for (const block of blocks) {
    const href = block.match(/href="(https?:\/\/[^"]+)"/)?.[1]
    if (!href || !isUsableUrl(href)) continue
    const titleHtml =
      block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ??
      block.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1] ??
      ''
    const title = stripTags(titleHtml)
    if (!title) continue
    const snipHtml =
      block.match(/<p class="content">([\s\S]*?)<\/p>/i)?.[1] ??
      block.match(/<p class="snippet">([\s\S]*?)<\/p>/i)?.[1] ??
      block.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ??
      ''
    results.push({ title, url: href, snippet: stripTags(snipHtml).slice(0, 400) })
  }
  return results
}

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

function parseDdgHtml(html: string): WebSearchResult[] {
  if (html.includes('anomaly-modal')) return []
  const results: WebSearchResult[] = []
  const blockRe =
    /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>([\s\S]*?)(?=<a[^>]*class="[^"]*result__a|<div class="nav-link|$)/gi
  for (const m of html.matchAll(blockRe)) {
    const url = decodeDdgUrl(m[1])
    if (!isUsableUrl(url)) continue
    const title = stripTags(m[2])
    if (!title) continue
    const snipMatch = m[3]?.match(/class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/i)
    const snippet = snipMatch ? stripTags(snipMatch[1]) : ''
    results.push({ title, url, snippet: snippet.slice(0, 400) })
  }
  return results
}

async function searchWikipedia(query: string): Promise<WebSearchResult[]> {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      query,
    )}&format=json&srlimit=15&srprop=snippet`
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = (await res.json()) as {
      query?: { search?: Array<{ title: string; snippet: string }> }
    }
    const hits = data.query?.search ?? []
    return hits.map((h) => ({
      title: h.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(h.title.replace(/ /g, '_'))}`,
      snippet: stripTags(h.snippet ?? ''),
    }))
  } catch {
    return []
  }
}

function queryVariants(query: string): string[] {
  const base = query.trim().replace(/\s+/g, ' ').slice(0, 200)
  if (!base) return []
  const compact = base.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const variants = [base]
  if (compact && compact !== base) variants.push(compact)
  const head = base.split(/[?.!]/)[0].trim()
  if (head && head !== base) variants.push(head)
  if (!/how to|guide|tutorial|examples/i.test(base)) {
    variants.push(`${base} guide`)
    variants.push(`${base} examples`)
  }
  return [...new Set(variants.filter(Boolean))].slice(0, 5)
}

async function searchSearx(query: string, signal: AbortSignal): Promise<WebSearchResult[]> {
  const collected: WebSearchResult[] = []
  const encoded = encodeURIComponent(query)

  for (const instance of SEARX_INSTANCES) {
    if (signal.aborted || collected.length >= MAX_SOURCES + 10) break
    for (const pageno of [1, 2, 3]) {
      if (signal.aborted || collected.length >= MAX_SOURCES + 10) break
      const url = `${instance}?q=${encoded}&language=en&pageno=${pageno}`
      const html = await fetchHtml(url, signal)
      if (!html) break
      const hits = parseSearxHtml(html)
      if (!hits.length) break
      collected.push(...hits)
      // First popular instance often returns 50+ on page 1 — stop early if enough
      if (collected.length >= MAX_SOURCES && instance === SEARX_INSTANCES[0]) break
      if (pageno < 3) await sleep(200)
    }
    if (collected.length >= MAX_SOURCES) break
    await sleep(150)
  }

  return collected
}

async function searchDdg(query: string, signal: AbortSignal): Promise<WebSearchResult[]> {
  const collected: WebSearchResult[] = []
  const encoded = encodeURIComponent(query)
  const html = await fetchHtml(`https://html.duckduckgo.com/html/?q=${encoded}&kl=us-en`, signal)
  if (html) collected.push(...parseDdgHtml(html))
  return collected
}

function mergeResults(...lists: WebSearchResult[][]): WebSearchResult[] {
  const seen = new Set<string>()
  const out: WebSearchResult[] = []
  for (const list of lists) {
    for (const item of list) {
      if (out.length >= MAX_SOURCES) return out
      const key = normalizeUrl(item.url).toLowerCase()
      if (seen.has(key) || !item.title) continue
      seen.add(key)
      out.push(item)
    }
  }
  return out
}

export async function webSearch(query: string, signal?: AbortSignal): Promise<WebSearchResult[]> {
  const q = query.trim().slice(0, 400)
  if (!q) return []

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 50_000)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort)

  try {
    const variants = queryVariants(q)
    const primary = variants[0] ?? q

    const searx = await searchSearx(primary, controller.signal)
    let merged = mergeResults(filterRelevant(q, searx))

    if (merged.length < MAX_SOURCES) {
      const ddg = await searchDdg(primary, controller.signal)
      merged = mergeResults(merged, filterRelevant(q, ddg))
    }

    if (merged.length < 10) {
      const wiki = await searchWikipedia(primary)
      merged = mergeResults(merged, filterRelevant(q, wiki))
    }

    for (const variant of variants.slice(1)) {
      if (merged.length >= MAX_SOURCES || controller.signal.aborted) break
      await sleep(300)
      const searxV = await searchSearx(variant, controller.signal)
      merged = mergeResults(merged, filterRelevant(q, searxV))
      if (merged.length < 15) {
        const ddgV = await searchDdg(variant, controller.signal)
        merged = mergeResults(merged, filterRelevant(q, ddgV))
      }
      if (merged.length < 12) {
        const wikiV = await searchWikipedia(variant)
        merged = mergeResults(merged, filterRelevant(q, wikiV))
      }
    }

    return merged.slice(0, MAX_SOURCES)
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
