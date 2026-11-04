import { ChevronIcon } from './Icons'

interface FaqItem {
  q: string
  a: string
}
interface FaqGroup {
  title: string
  items: FaqItem[]
}

/**
 * Turn a WordPress FAQs page into groups of questions: each <h2> starts a group,
 * each <h3> is a question and everything up to the next heading is its answer.
 */
function parseFaq(html: string): { intro: string; groups: FaqGroup[] } {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const groups: FaqGroup[] = []
  let intro = ''
  let item: FaqItem | null = null
  for (const node of Array.from(doc.body.childNodes)) {
    const el = node as Element
    const tag = node.nodeType === Node.ELEMENT_NODE ? el.tagName : ''
    if (tag === 'H2') {
      groups.push({ title: el.textContent?.trim() ?? '', items: [] })
      item = null
    } else if (tag === 'H3') {
      if (!groups.length) groups.push({ title: '', items: [] })
      item = { q: el.textContent?.trim() ?? '', a: '' }
      groups[groups.length - 1].items.push(item)
    } else {
      const chunk = tag ? el.outerHTML : (node.textContent ?? '')
      if (item) item.a += chunk
      else if (!groups.length) intro += chunk
    }
  }
  return { intro, groups: groups.filter((g) => g.items.length) }
}

/** Questions as an accordion, grouped by section. `html` comes from wp-admin (already filtered). */
export default function FaqList({ html, headingLevel = 2 }: { html: string; headingLevel?: 2 | 3 }) {
  const { intro, groups } = parseFaq(html)
  if (!groups.length) return <div className="prose long" dangerouslySetInnerHTML={{ __html: html }} />
  const H = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <div className="faq">
      {intro.trim() && <div className="prose" dangerouslySetInnerHTML={{ __html: intro }} />}
      {groups.map((g) => (
        <section key={g.title} className="faq-group">
          {g.title && <H className="faq-group-title">{g.title}</H>}
          {g.items.map((it) => (
            <details key={it.q} className="faq-item">
              <summary>
                <span>{it.q}</span>
                <ChevronIcon size={18} />
              </summary>
              <div className="prose" dangerouslySetInnerHTML={{ __html: it.a }} />
            </details>
          ))}
        </section>
      ))}
    </div>
  )
}
