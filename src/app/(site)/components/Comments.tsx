'use client'
import React, { useActionState, useEffect, useRef, useState } from 'react'

import type { PublicComment } from '@/comments/comments'
import { COMMENT_MAX_LENGTH as MAX_LENGTH, COMMENT_MIN_LENGTH } from '@/comments/limits'
import { signInReader, signOutReader, submitComment, type FormState } from '../actions'
import { formatAgo } from '../format'
import { strings, type Lang, type Strings } from '../strings'

type Props = {
  articleId: string
  path: string
  lang: Lang
  enabled: boolean
  threads: PublicComment[]
  count: number
  reader: { name: string } | null
  signInAvailable: boolean
}

export function Comments({ articleId, path, lang, enabled, threads, count, reader, signInAvailable }: Props) {
  const t = strings[lang]
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const canPost = enabled && Boolean(reader)

  return (
    <section className="comments" aria-labelledby="comments-title">
      <h2 id="comments-title" className="comments-title">
        {t.comments} <span className="count">{count}</span>
      </h2>

      {!enabled ? (
        <p className="comments-note">{t.off}</p>
      ) : reader ? (
        <div className="composer">
          <div className="composer-head">
            <Avatar name={reader.name} />
            <span>
              {t.signedInAs} <strong>{reader.name}</strong>
            </span>
            <form action={signOutReader} className="sign-out">
              <input type="hidden" name="path" value={path} />
              <button type="submit" className="link-button">
                {t.signOut}
              </button>
            </form>
          </div>
          <CommentForm articleId={articleId} path={path} t={t} />
          <p className="guidelines">{t.guidelines}</p>
        </div>
      ) : (
        <SignIn path={path} t={t} available={signInAvailable} />
      )}

      {threads.length === 0 && enabled && <p className="comments-note">{t.beFirst}</p>}

      <ol className="thread-list">
        {threads.map((thread) => (
          <li key={thread.id} className="thread">
            <CommentItem comment={thread} lang={lang} t={t} />
            {canPost && !thread.removed && (
              <div className="comment-actions">
                <button type="button" className="link-button" onClick={() => setReplyingTo(replyingTo === thread.id ? null : thread.id)}>
                  {replyingTo === thread.id ? t.cancel : t.reply}
                </button>
              </div>
            )}
            {(thread.replies.length > 0 || replyingTo === thread.id) && (
              <ol className="reply-list">
                {thread.replies.map((reply) => (
                  <li key={reply.id}>
                    <CommentItem comment={reply} lang={lang} t={t} />
                  </li>
                ))}
                {replyingTo === thread.id && (
                  <li>
                    <CommentForm articleId={articleId} path={path} t={t} parentId={thread.id} onPosted={() => setReplyingTo(null)} />
                  </li>
                )}
              </ol>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}

function CommentItem({ comment, lang, t }: { comment: PublicComment; lang: Lang; t: Strings }) {
  if (comment.removed) return <p className="comment removed">{t.removed}</p>
  return (
    <article className="comment">
      <Avatar name={comment.authorName} />
      <div className="comment-main">
        <p className="comment-head">
          <strong>{comment.authorName}</strong>
          <time dateTime={comment.createdAt} suppressHydrationWarning>
            {formatAgo(comment.createdAt, lang)}
          </time>
        </p>
        {/* Plain text: React escapes it, and CSS keeps the reader's line breaks. */}
        <p className="comment-body" dir="auto">
          {comment.body}
        </p>
      </div>
    </article>
  )
}

function CommentForm({ articleId, path, t, parentId, onPosted }: { articleId: string; path: string; t: Strings; parentId?: string; onPosted?: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitComment, {})
  const [text, setText] = useState('')
  const lastNonce = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (state.ok && state.nonce !== lastNonce.current) {
      lastNonce.current = state.nonce
      setText('')
      onPosted?.()
    }
  }, [state, onPosted])

  return (
    <form action={action} className={parentId ? 'comment-form reply-form' : 'comment-form'}>
      <input type="hidden" name="articleId" value={articleId} />
      <input type="hidden" name="path" value={path} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <textarea
        name="body"
        dir="auto"
        rows={parentId ? 2 : 3}
        maxLength={MAX_LENGTH}
        placeholder={parentId ? t.replyPlaceholder : t.placeholder}
        value={text}
        onChange={(event) => setText(event.target.value)}
        autoFocus={Boolean(parentId)}
        required
      />
      <div className="form-row">
        {state.error ? <p className="form-error" role="alert">{state.error}</p> : <span className="char-count">{text.length}/{MAX_LENGTH}</span>}
        <button type="submit" className="btn-primary" disabled={pending || text.trim().length < COMMENT_MIN_LENGTH}>
          {pending ? t.posting : parentId ? t.postReply : t.post}
        </button>
      </div>
    </form>
  )
}

function SignIn({ path, t, available }: { path: string; t: Strings; available: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signInReader, {})
  return (
    <div className="sign-in">
      <p className="sign-in-title">{t.signInPrompt}</p>
      {available ? (
        <form action={action} className="sign-in-form" dir="ltr">
          <input type="hidden" name="path" value={path} />
          <input type="email" name="email" placeholder="reader@example.com" autoComplete="email" required />
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? '…' : 'Sign in'}
          </button>
          <p className="demo-hint">
            Demo sign-in: enter the email of any active customer in <em>Customers → Users</em>. No password; it stands in for the
            real UA Finance login.
          </p>
          {state.error && <p className="form-error" role="alert">{state.error}</p>}
        </form>
      ) : (
        <p className="comments-note">Sign-in is not available on this server.</p>
      )}
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')
  return (
    <span className="avatar" aria-hidden="true">
      {initials || '?'}
    </span>
  )
}
