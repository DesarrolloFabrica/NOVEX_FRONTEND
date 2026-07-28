import { createSituationEvidence } from '@/modules/api/evidences.api'
import type {
  CreateEvidencePayload,
  EvidenceType,
} from '@/modules/situations/types/situation.types'

export async function createSituationEvidenceRequest(
  situationId: string,
  payload: CreateEvidencePayload,
): Promise<void> {
  await createSituationEvidence(situationId, payload)
}

export function inferEvidenceType(file: File): EvidenceType {
  const mime = file.type.toLowerCase()
  if (mime.startsWith('image/')) return 'IMAGE'
  if (mime.startsWith('video/')) return 'VIDEO'
  if (
    mime.includes('pdf') ||
    mime.includes('document') ||
    mime.includes('word') ||
    mime.includes('sheet') ||
    mime.includes('presentation')
  ) {
    return 'DOCUMENT'
  }
  if (mime.includes('message/rfc822') || mime.includes('outlook')) {
    return 'EMAIL'
  }
  return 'OTHER'
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
