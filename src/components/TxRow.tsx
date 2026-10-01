import type { MockTx } from '../data/mock'
import { formatSigned } from '../lib/money'
import { CatIcon } from './Icon'

export function TxRow({ tx, meta }: { tx: MockTx; meta: string }) {
  return (
    <div className="tx">
      <CatIcon cat={tx.cat} />
      <div className="tx-main">
        <div className="tx-name">{tx.name}</div>
        <div className="tx-meta">{meta}</div>
      </div>
      <div className="tx-side">
        <div className="tx-amount" style={{ color: tx.cents < 0 ? 'var(--text)' : 'var(--positive)' }}>
          {formatSigned(tx.cents)}
        </div>
        {tx.tag && <div className="tag">{tx.tag}</div>}
      </div>
    </div>
  )
}
