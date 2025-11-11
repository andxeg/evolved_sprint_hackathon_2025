import { fetchWithAuth,handleApiError } from '@/utils/api-error-handler'

export interface SequenceRelated {
  sequence: string
  id: string
}

export interface SequenceRecent {
  name: string
  cover: string
  hoverGif: string
  meanPLLDT: number
  ptmScore: number
  modelName: string
  maxPaeScore: number
  jobId: string
  featuredSequenceId: string
  jobRunId: string
  createdAt: string
  weightSet: string
  updatedAt: string
  relatedSequences: SequenceRelated[]
}

/**
 * Fetches home sequences from the API and maps them to SequenceRecent[].
 */
export async function fetchHomeSequences(): Promise<SequenceRecent[]> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL

  const fetchAsset = async (jobId: string, jobRunId: string, sequenceId: string, asset: string, modelName: string) => {
    let filePath = null
    
    if (modelName === 'monomer') {
      filePath = `${jobId}/${jobRunId}/${sequenceId}/${asset}`
    } else {
      filePath = `complex/${jobRunId}/${asset}`
    }

    if (filePath) {
      try {
        const response = await fetchWithAuth(`${API_URL}/v1/sequences/files/${filePath}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }, 
          credentials: 'include'
        })
        if (!response.ok) {
          throw new Error(`[fetchHomeSequences] Failed to fetch: ${response.status}`)
        }
        return await response.json()
      } catch (error) {
        await handleApiError(error)
        throw error
      }
    } else {
      return ''
    }
  }

  let home
  try {
    const response = await fetchWithAuth(`${API_URL}/v1/sequences/home`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    })
    if (!response.ok) {
      throw new Error(`[fetchHomeSequences] Failed to fetch: ${response.status}`)
    }
    const data = await response.json()
    home = data.home
  } catch (error) {
    await handleApiError(error)
    throw error
  }

  return Promise.all(home.map(async (item: any) => ({
    name: item.jobRunId,
    cover: await fetchAsset(item.jobId, item.jobRunId, item.relatedSequences[0].id, item.pngImage, item.modelName),
    hoverGif: await fetchAsset(item.jobId, item.jobRunId, item.relatedSequences[0].id, item.hoverGif, item.modelName),
    meanPLLDT: item.meanPLLDT,
    ptmScore: item.ptmScore,
    maxPaeScore: item.maxPaeScore,
    jobRunId: item.jobRunId,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    relatedSequences: item.relatedSequences,
    jobId: item.jobId,
    featuredSequenceId: item.featuredSequenceId,
    weightSet: item.weightSet,
    modelName: item.modelName
  })))
}
