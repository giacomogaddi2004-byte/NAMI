interface Props<T extends string> {
  options: readonly (readonly [T, string])[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/** Gruppo di pulsanti a scelta singola: `seg` (segmenti) o `chips` (pillole). */
export function Segmented<T extends string>({ options, value, onChange, className = 'seg' }: Props<T>) {
  return (
    <div className={className}>
      {options.map(([key, label]) => (
        <button key={key} type="button" aria-pressed={key === value} onClick={() => onChange(key)}>
          {label}
        </button>
      ))}
    </div>
  )
}
