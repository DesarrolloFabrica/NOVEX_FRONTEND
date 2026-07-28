import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import type { CaptureFileAttachment } from '@/modules/situations/types/situation-capture.types'
import {
  formatFileSize,
  inferEvidenceType,
} from '@/modules/situations/services/situation-evidences.service'
import { TEXT_LABEL } from '@/modules/monitoring/constants/monitoringTheme'

const EVIDENCE_TYPE_LABEL: Record<string, string> = {
  IMAGE: 'Imagen',
  DOCUMENT: 'Documento',
  VIDEO: 'Video',
  EMAIL: 'Correo',
  LINK: 'Enlace',
  NOTE: 'Nota',
  OTHER: 'Archivo',
}

interface EvidenceFileDropzoneProps {
  attachments: CaptureFileAttachment[]
  onChange: (next: CaptureFileAttachment[]) => void
}

function createAttachment(file: File): CaptureFileAttachment {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
    file,
  }
}

export function EvidenceFileDropzone({
  attachments,
  onChange,
}: EvidenceFileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const next = [...attachments]
    for (const file of Array.from(fileList)) {
      next.push(createAttachment(file))
    }
    onChange(next)
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files)
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    addFiles(event.dataTransfer.files)
  }

  function removeAttachment(id: string) {
    onChange(attachments.filter((item) => item.id !== id))
  }

  return (
    <div className="space-y-2">
      <span className={TEXT_LABEL}>Archivos</span>

      <div
        className={`cunmark-capture-dropzone ${dragging ? 'is-dragging' : ''}`}
        onDragEnter={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setDragging(false)
        }}
        onDrop={handleDrop}
      >
        <p className="cunmark-capture-dropzone__text">
          Arrastre archivos aquí o{' '}
          <button
            type="button"
            className="cunmark-capture-dropzone__action"
            onClick={() => inputRef.current?.click()}
          >
            seleccione archivos
          </button>
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={handleInputChange}
        />
      </div>

      {attachments.length > 0 ? (
        <ul className="cunmark-capture-file-list space-y-1.5">
          {attachments.map((attachment) => {
            const evidenceType = inferEvidenceType(attachment.file)
            return (
              <li key={attachment.id} className="cunmark-capture-file-item">
                <div className="min-w-0">
                  <p className="cunmark-capture-file-item__name truncate text-sm font-medium">
                    {attachment.file.name}
                  </p>
                  <p className="cunmark-capture-file-item__meta text-[0.72rem]">
                    {EVIDENCE_TYPE_LABEL[evidenceType] ?? 'Archivo'} ·{' '}
                    {formatFileSize(attachment.file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  className="cunmark-capture-file-item__remove"
                  onClick={() => removeAttachment(attachment.id)}
                >
                  Eliminar
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
