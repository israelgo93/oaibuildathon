interface StatusMessageProps {
  kind?: 'error' | 'success' | 'info'
  children: string
}

export function StatusMessage({ kind = 'info', children }: StatusMessageProps) {
  return <p className={`status-message status-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</p>
}
