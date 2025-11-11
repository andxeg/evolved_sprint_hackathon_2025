export interface Task {
  id: string;
  protocol_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  task_text_results: string;
  sequence_id: string;
}

export interface Protocol {
  id: string;
  description: string;
  plan_text: string;
  status: string;
  protocol_type: string;
  base_model_name: string;
  task_count: number;
  task_completed_count: number;
  task_failed_count: number;
  tasks: Task[];
  created_at: string;
  updated_at: string;
  protocol_markdown_results: string;
  protocol_raw_json: any[];
  png_url: string | null;
  gif_url: string | null;
  sequence_result_id: string;
}

export interface ProtocolRecent {
  id: string;
  description: string;
  plan_text: string;
  status: string;
  protocol_type: string;
  base_model_name: string;
  task_count: number;
  task_completed_count: number;
  task_failed_count: number;
  created_at: string;
  updated_at: string;
  protocol_markdown_results: string;
  protocol_raw_json: any[];
  png_url: string | null;
  gif_url: string | null;
  sequence_result_id: string;
}

/**
 * Fetches protocols from the API and maps them to ProtocolRecent[].
 */
export async function fetchProtocols(): Promise<ProtocolRecent[]> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL

  const fetchAsset = async (fullUrl: string) => {
    if (!fullUrl) return null
    
    // Extract the file path from the full URL
    // URL format: https://service.fastfold.ai/v1/sequences/files/complex/600ca841-1f9e-4400-bd1e-b2cb99b71c31/cover_600ca841-1f9e-4400-bd1e-b2cb99b71c31.png
    const urlParts = fullUrl.split('/v1/sequences/files/')
    if (urlParts.length !== 2) {
      console.warn(`Invalid URL format: ${fullUrl}`)
      return null
    }
    
    const filePath = urlParts[1]
    
    const response = await fetch(`${API_URL}/v1/sequences/files/${filePath}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }, 
      credentials: 'include'
    })
    if (!response.ok) {
      throw new Error(`[fetchProtocols] Failed to fetch asset: ${response.status}`)
    }
    return await response.json()
  }

  const response = await fetch(`${API_URL}/v1/protocols/list`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  })
  
  if (!response.ok) {
    throw new Error(`[fetchProtocols] Failed to fetch: ${response.status}`)
  }
  
  const { data } = await response.json()

  return Promise.all(data.map(async (item: any) => {
    let pngUrl = null
    let gifUrl = null

    // Extract file paths from the URLs if they exist
    if (item.png_url) {
      try {
        pngUrl = await fetchAsset(item.png_url)
      } catch (error) {
        console.warn(`Failed to fetch PNG for protocol ${item.id}:`, error)
      }
    }

    if (item.gif_url) {
      try {
        gifUrl = await fetchAsset(item.gif_url)
      } catch (error) {
        console.warn(`Failed to fetch GIF for protocol ${item.id}:`, error)
      }
    }

    return {
      id: item.id,
      description: item.description,
      plan_text: item.plan_text,
      status: item.status,
      protocol_type: item.protocol_type,
      base_model_name: item.base_model_name,
      task_count: item.task_count,
      task_completed_count: item.task_completed_count,
      task_failed_count: item.task_failed_count,
      created_at: item.created_at,
      updated_at: item.updated_at,
      protocol_markdown_results: item.protocol_markdown_results,
      protocol_raw_json: item.protocol_raw_json,
      png_url: pngUrl,
      gif_url: gifUrl,
      sequence_result_id: item.sequence_result_id
    }
  }))
} 