import { Link } from 'react-router-dom'
import { CAT } from '../data/categories'
import type { Tx } from '../data/model'
import { formatEur, formatSigned } from '../lib/money'
import { CatIcon, Icon, ICONS } from './Icon'

export function txTitle(tx: Tx): string {
  return tx.merchant || (tx.type === 'giroconto' ? 'Giroconto' : CAT[tx.category ?? 'altro'].name)
}

/** "−42,80 €" per le uscite, "+1.250,00 €" per le entrate, senza segno per i giroconti. */
export function txAmount(tx: Tx): string {
  if (tx.type === 'giroconto') return formatEur(tx.cents)
  return formatSigned(tx.type === 'entrata' ? tx.cents : -tx.cents)
}

export function TxRow({ tx, meta }: { tx: Tx; meta: string }) {
  return (
    // Il giroconto automatico delle tasse si modifica dall'entrata che l'ha generato.
    <Link to={`/movimento/${tx.taxOf ?? tx.id}`} className="tx" style={{ color: 'inherit' }}>
      {tx.type === 'giroconto' ? (
        <span className="cat-icon" style={{ width: 42, height: 42, borderRadius: 14, background: '#ECEEF3' }}>
          <Icon d={ICONS.swap} size={22} color="#5E6578" />
        </span>
      ) : (
        <CatIcon cat={tx.category ?? 'altro'} />
      )}
      <div className="tx-main">
        <div className="tx-name">{txTitle(tx)}</div>
        <div className="tx-meta">{meta}</div>
      </div>
      <div className="tx-side">
        <div className="tx-amount" style={{ color: tx.type === 'entrata' ? 'var(--positive)' : tx.type === 'giroconto' ? 'var(--text-2)' : 'var(--text)' }}>
          {txAmount(tx)}
        </div>
        {tx.taxOf && <div className="tag">Tasse</div>}
        {tx.review && <div className="tag" style={{ background: '#FFF1D6', color: '#8A4B00' }}>Da controllare</div>}
      </div>
    </Link>
  )
}
