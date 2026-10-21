'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

type Receipt = {
  value: number
  estimate_before_exemptions: true
  total: number
  partial: boolean
  slices: Array<{
    body_id: string
    name: string
    rate: number | null
    amount: number | null
    year: number | null
    source_url: string | null
    tax_set_by_name: string | null
    last_vote_date: string | null
    latest_election: {
      date: string | null
      type: string | null
      votes_cast: number | null
      registered_voters: number | null
      source_url: string | null
    } | null
  }>
}

const money = (value: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)

export function TaxReceiptClient({ token }: { token: string }) {
  const t = useTranslations('TaxReceipt')
  const [value, setValue] = useState('250000')
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const loadReceipt = useCallback(async (nextValue: string) => {
    if (!/^\d{1,8}$/.test(nextValue) || Number(nextValue) < 1 || Number(nextValue) > 10_000_000 || !token) {
      setError(true)
      return
    }
    setBusy(true)
    setError(false)
    try {
      const response = await fetch(`/api/tax-receipt?t=${encodeURIComponent(token)}&value=${encodeURIComponent(nextValue)}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error('receipt unavailable')
      setReceipt(data as Receipt)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }, [token])

  useEffect(() => {
    const timer = setTimeout(() => void loadReceipt('250000'), 0)
    // Initial load belongs to this signed results token.
    return () => clearTimeout(timer)
  }, [loadReceipt])

  return (
    <main id="main" className="mx-auto max-w-4xl px-4 py-10 md:px-8 md:py-14">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{t('eyebrow')}</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">{t('title')}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">{t('intro')}</p>

      <form className="mt-7 flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); void loadReceipt(value) }}>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          {t('valueLabel')}
          <span className="flex items-center rounded-xl border border-border bg-white px-3">
            <span aria-hidden="true">$</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              min={1}
              max={10_000_000}
              value={value}
              onChange={(event) => setValue(event.target.value.replace(/\D/g, '').slice(0, 8))}
              className="w-44 bg-transparent px-2 py-3 outline-none"
              aria-describedby="tax-value-hint"
            />
          </span>
        </label>
        <p id="tax-value-hint" className="w-full text-xs text-muted-foreground">{t('beforeExemptions')}</p>
        <Button type="submit" disabled={busy}>{busy ? t('loading') : t('update')}</Button>
      </form>

      {error && <p role="alert" className="mt-5 font-semibold text-brick">{t('error')}</p>}
      {receipt && (
        <section className="mt-8" aria-live="polite">
          <div className="rounded-[26px] bg-primary p-6 text-white md:p-8">
            <p className="text-sm font-semibold text-white/80">{receipt.partial ? t('partial') : t('total')}</p>
            <p className="mt-2 text-4xl font-extrabold tabular">{money(receipt.total)}<span className="ml-2 text-base font-semibold text-white/80">{t('perYear')}</span></p>
            <p className="mt-3 text-sm text-white/75">{t('estimateFor', { value: money(receipt.value) })}</p>
          </div>
          <ul className="mt-4 grid gap-3">
            {receipt.slices.map((slice) => (
              <li key={slice.body_id} className="rounded-2xl bg-white p-5 ring-1 ring-border">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-ink">{slice.name}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {slice.rate === null ? t('rateNotLoaded') : t('rate', { rate: slice.rate, year: slice.year ?? '' })}
                    </p>
                    {slice.tax_set_by_name && <p className="mt-1 text-xs text-muted-foreground">{t('setBy', { name: slice.tax_set_by_name })}</p>}
                  </div>
                  <p className="text-lg font-extrabold tabular text-ink">{slice.amount === null ? '—' : `${money(slice.amount)}/yr`}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                  {slice.last_vote_date && <span>{t('lastVote', { date: slice.last_vote_date })}</span>}
                  {slice.latest_election?.date && <span>{t('lastElection', { date: slice.latest_election.date })}</span>}
                  {slice.latest_election?.votes_cast !== null && slice.latest_election?.votes_cast !== undefined && (
                    <span>{t('turnout', { votes: slice.latest_election.votes_cast, registered: slice.latest_election.registered_voters ?? t('unknown') })}</span>
                  )}
                </div>
                {(slice.source_url || slice.latest_election?.source_url) && (
                  <div className="mt-3 flex gap-4 text-xs font-semibold text-primary">
                    {slice.source_url && <a href={slice.source_url} target="_blank" rel="noreferrer" className="underline">{t('rateSource')}</a>}
                    {slice.latest_election?.source_url && <a href={slice.latest_election.source_url} target="_blank" rel="noreferrer" className="underline">{t('electionSource')}</a>}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">{t('caveat')}</p>
        </section>
      )}
    </main>
  )
}
