import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { buildDeadlineOptions } from '../utils/project.js'

export function ListItems({ items = [], tone = 'blue' }) {
  const color = tone === 'green' ? 'var(--color-light-green)' : tone === 'yellow' ? 'var(--color-light-yellow)' : 'var(--color-light-blue)'
  return (
    <ul className="mt-4 grid gap-2">
      {items.map((item) => (
        <li key={item} style={{ backgroundColor: color }} className="rounded-md px-3 py-2 text-sm leading-6 text-[var(--color-dark-gray)]">
          {item}
        </li>
      ))}
    </ul>
  )
}

export function Modal({ title, children, onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-[rgba(0,35,78,0.36)] px-2 sm:px-5" onMouseDown={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-3 sm:max-h-[82vh] sm:p-5"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-secondary-light)] pb-3 sm:items-center sm:gap-4 sm:pb-4">
          <h3 className="min-w-0 text-xl font-semibold leading-7 tracking-[-0.03em] text-[var(--color-text-main)] sm:text-2xl">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--color-secondary-light)] px-3 py-1 text-sm font-semibold text-[var(--color-text-main)]">
            닫기
          </button>
        </div>
        <div className="pt-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export function DeadlineSelect({ value, onChange }) {
  const options = useMemo(() => buildDeadlineOptions(120), [])
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[var(--color-dark-gray)]">종료 날짜</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] px-3 text-[var(--color-black)] outline-none focus:border-[var(--color-primary)]"
      >
        <option value="">종료 날짜를 선택하세요</option>
        {options.map((option) => (
          <option key={option.value} value={option.label}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function PageHead({ eyebrow, title, description }) {
  return (
    <div className="max-w-3xl">
      <Pill>{eyebrow}</Pill>
      <h1 className="mt-4 text-4xl font-normal tracking-[-0.04em] text-[var(--color-text-main)] sm:text-5xl">{title}</h1>
      <p className="mt-4 text-base leading-7 text-[var(--color-text-secondary)]">{description}</p>
    </div>
  )
}

export function SectionTitle({ eyebrow, title, icon = null, iconAlt = '', iconHref = '' }) {
  const iconElement = icon ? (
    <img src={icon} alt={iconAlt} className="h-7 w-7 object-contain" />
  ) : null

  return (
    <div>
      <Pill>{eyebrow}</Pill>
      <div className="mt-3 flex items-center gap-2">
        <h2 className="text-2xl font-normal tracking-[-0.03em] text-[var(--color-text-main)]">{title}</h2>
        {iconHref && iconElement ? (
          <a
            href={iconHref}
            target="_blank"
            rel="noreferrer"
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-[var(--color-bg-white)]"
            aria-label={`${iconAlt} 열기`}
          >
            {iconElement}
          </a>
        ) : (
          iconElement
        )}
      </div>
    </div>
  )
}

export function TimelineRow({ tone, label, text }) {
  const tones = {
    blue: 'bg-[var(--color-light-blue)]',
    green: 'bg-[var(--color-light-green)]',
    yellow: 'bg-[var(--color-light-yellow)]',
    red: 'bg-[var(--color-light-red)]',
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-light)] p-3">
      <span className={`${tones[tone]} rounded-full px-2 py-1 text-[11px] font-semibold tracking-[0.08em] text-[var(--color-text-main)]`}>{label}</span>
      <p className="text-sm leading-6 text-[var(--color-text-secondary)]">{text}</p>
    </div>
  )
}

export function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-light)] p-3">
      <p className="text-xs text-[var(--color-gray)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">{value}</p>
    </div>
  )
}

export function ReadOnlyBlock({ title, text, tone = 'blue' }) {
  const bg = tone === 'yellow' ? 'var(--color-light-yellow)' : 'var(--color-bg-light)'
  return (
    <div style={{ backgroundColor: bg }} className="rounded-lg border border-[var(--color-secondary-light)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">{title}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-[var(--color-text-secondary)]">{text}</p>
    </div>
  )
}

export function InfoCard({ title, text }) {
  return (
    <div className="rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-5">
      <h2 className="text-xl font-normal tracking-[-0.02em] text-[var(--color-text-main)]">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">{text}</p>
    </div>
  )
}

export function Panel({ title, children }) {
  return (
    <section className="rounded-xl border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-5">
      <h2 className="text-xl font-normal tracking-[-0.02em] text-[var(--color-text-main)]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  )
}

export function TextInput({ label, value, onChange, placeholder = '' }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[var(--color-dark-gray)]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] px-3 text-[var(--color-black)] outline-none placeholder:text-[var(--color-light-gray)] focus:border-[var(--color-primary)]"
      />
    </label>
  )
}

export function TextArea({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[var(--color-dark-gray)]">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={5}
        className="mt-2 w-full resize-none rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] p-3 leading-7 text-[var(--color-black)] outline-none placeholder:text-[var(--color-light-gray)] focus:border-[var(--color-primary)]"
      />
    </label>
  )
}

export function Pill({ children }) {
  return (
    <span className="inline-flex rounded-full bg-[var(--color-primary-light)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-primary)]">
      {children}
    </span>
  )
}

export function PrimaryButton({ children, onClick, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold !text-white transition disabled:cursor-not-allowed disabled:bg-[var(--color-light-gray)]"
      style={{ color: '#ffffff' }}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-[var(--color-secondary-light)] bg-[var(--color-bg-white)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-main)]"
    >
      {children}
    </button>
  )
}

export function DangerButton({ children, onClick }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg bg-[var(--color-light-red)] px-4 py-2.5 text-sm font-semibold text-[var(--color-black)]">
      {children}
    </button>
  )
}

export function ErrorBox({ children }) {
  return <div className="mt-6 rounded-lg border border-[var(--color-light-red)] bg-[var(--color-light-red)] p-4 text-sm font-semibold text-[var(--color-black)]">{children}</div>
}
