import { useRef, useState } from 'react'

type Props = {
  compact?: boolean
  disabled?: boolean
  label?: string
  onFiles: (files: File[]) => void
}

export function UploadDropzone({ compact = false, disabled = false, label, onFiles }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [active, setActive] = useState(false)

  function take(fileList: FileList | null) {
    if (!fileList || disabled) return
    const files = [...fileList].filter((file) => file.name.toLowerCase().endsWith('.epub'))
    if (files.length) onFiles(files)
  }

  if (compact) {
    return (
      <>
        <input
          ref={inputRef}
          className="file-input"
          type="file"
          accept=".epub,application/epub+zip"
          multiple
          disabled={disabled}
          onChange={(event) => {
            take(event.target.files)
            event.target.value = ''
          }}
        />
        <button type="button" className="btn" disabled={disabled} onClick={() => inputRef.current?.click()}>
          {label ?? 'Add EPUB'}
        </button>
      </>
    )
  }

  return (
    <div
      className="dropzone"
      data-active={active}
      data-disabled={disabled}
      onDragEnter={(event) => {
        event.preventDefault()
        if (!disabled) setActive(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return
        setActive(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setActive(false)
        take(event.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        className="file-input"
        type="file"
        accept=".epub,application/epub+zip"
        multiple
        disabled={disabled}
        onChange={(event) => {
          take(event.target.files)
          event.target.value = ''
        }}
      />
      <p className="dropzone-title">{active ? 'Drop to add' : 'Drop an EPUB here'}</p>
      <p className="dropzone-hint">or</p>
      <button type="button" className="btn" disabled={disabled} onClick={() => inputRef.current?.click()}>
        Browse
      </button>
    </div>
  )
}
