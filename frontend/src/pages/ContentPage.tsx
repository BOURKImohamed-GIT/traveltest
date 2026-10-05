import { api } from '../api'
import { useAsync } from '../useAsync'
import NotFound from './NotFound'

/** A page written in WordPress (Pages menu), e.g. About Us, FAQs or a policy. */
export default function ContentPage({ slug }: { slug: string }) {
  const page = useAsync(() => api.page(slug), [slug])

  if (page.error && 'status' in page.error && page.error.status === 404) return <NotFound />

  return (
    <div className="container narrow content-page">
      {page.data ? (
        <>
          <h1>{page.data.title}</h1>
          {/* Written by the site team in wp-admin; already filtered by the_content. */}
          <div className="prose long" dangerouslySetInnerHTML={{ __html: page.data.content }} />
        </>
      ) : page.error ? (
        <p className="notice error">Couldn't load this page: {page.error.message}</p>
      ) : (
        <div aria-busy="true">
          <div className="skeleton" style={{ height: 40, width: '50%', margin: '32px 0 16px' }} />
          <div className="skeleton" style={{ height: 240 }} />
        </div>
      )}
    </div>
  )
}
