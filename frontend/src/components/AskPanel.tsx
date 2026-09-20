import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { askLibrary } from '../api/books'
import { readerLink } from '../lib/readerLink'
import type { AskResponse } from '../types/ask'

function looksLikeNotFound(answer: string) {
  return /could not find|cannot find|can't find|not able to find|don't know|do not know/i.test(answer)
}

function visibleAnswer(result: AskResponse) {
  const answer = result.answer?.trim() ?? ''
  if (!answer) return ''
  if (result.sources.length > 0 && looksLikeNotFound(answer)) return ''
  return answer
}

export function AskPanel() {
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AskResponse | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const text = question.trim()
    if (!text || busy) return
    setBusy(true)
    setError(null)
    try {
      setResult(await askLibrary(text))
    } catch (cause) {
      setResult(null)
      setError(cause instanceof Error ? cause.message : 'Ask failed. Matching passages may still appear in Search.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="ask" aria-labelledby="ask-title">
      <div className="ask-copy">
        <h2 id="ask-title">Ask</h2>
        <p className="quiet">Ask a question about your books. Answers cite chapters you can open.</p>
      </div>
      <form className="ask-form" onSubmit={onSubmit}>
        <label className="visually-hidden" htmlFor="ask-input">
          Question
        </label>
        <input
          id="ask-input"
          value={question}
          placeholder="e.g. How does Mizuuchi relate to the narrator?"
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button type="submit" className="btn" disabled={busy || !question.trim()}>
          {busy ? 'Asking…' : 'Ask'}
        </button>
      </form>
      {error ? (
        <p className="banner" role="alert">
          {error}
        </p>
      ) : null}
      {result ? (
        <div className="ask-result">
          {visibleAnswer(result) ? <p className="ask-answer">{visibleAnswer(result)}</p> : null}
          {result.sources.length > 0 ? (
            <ul className="ask-sources">
              {result.sources.map((source, index) => (
                <li key={`${source.bookId}-${source.href ?? 'none'}-${index}`}>
                  <Link className="chip" to={readerLink(source.bookId, source.href, question)}>
                    {source.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
