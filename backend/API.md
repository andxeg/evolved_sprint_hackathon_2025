# API Documentation

This document describes the REST API endpoints for the Evolved Hackathon Backend.

**Base URL:** `http://localhost:8000/v1`

All endpoints return JSON responses unless otherwise specified.

## Table of Contents

- [File Upload](#file-upload)
- [Design Check](#design-check)
- [Design Job Management](#design-job-management)
- [File Serving](#file-serving)

---

## File Upload

### Upload Files

Upload one or more files to the server. Files are stored in the uploads folder with unique filenames.

**Endpoint:** `POST /v1/upload`

**Content-Type:** `multipart/form-data`

**Request:**
- `files` (file, required): One or more files to upload
- Additional form fields (optional): Any additional fields will be included in the response

**cURL Example:**
```bash
curl -X POST http://localhost:8000/v1/upload \
  -F "files=@design_spec.yaml" \
  -F "files=@target.cif"
```

**Python Example:**
```python
import requests

files = [
    ('files', open('design_spec.yaml', 'rb')),
    ('files', open('target.cif', 'rb'))
]

response = requests.post('http://localhost:8000/v1/upload', files=files)
print(response.json())
```

**Response (200 OK):**
```json
{
  "message": "Files uploaded successfully",
  "files": [
    {
      "file_name": "a1b2c3d4e5f6_design_spec.yaml"
    },
    {
      "file_name": "f6e5d4c3b2a1_target.cif"
    }
  ],
  "folder": "/app/tmp/output/results/uploads"
}
```

**Error Responses:**
- `400 Bad Request`: No files provided or no valid files found
- `500 Internal Server Error`: File upload failed

---

## Design Check

### Check Design Specification

Validates a design specification YAML file and generates a visualization CIF file. The input YAML must already be uploaded via the upload endpoint.

**Endpoint:** `POST /v1/design/check`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "inputYamlFilename": "a1b2c3d4e5f6_design_spec.yaml",
  "cifFileFilename": "target.cif",
  "protocolName": "design",
  "numDesigns": 100,
  "budget": 10,
  "pipelineName": "default"
}
```

**Fields:**
- `inputYamlFilename` (string, required): Filename of the uploaded YAML file
- `cifFileFilename` (string, required): Filename of the CIF file (for reference)
- `protocolName` (string, required): Protocol name (e.g., "design", "inverse_fold")
- `numDesigns` (integer, required): Number of designs to generate
- `budget` (integer, required): Budget for filtering designs
- `pipelineName` (string, optional): Pipeline name

**cURL Example:**
```bash
curl -X POST http://localhost:8000/v1/design/check \
  -H "Content-Type: application/json" \
  -d '{
    "inputYamlFilename": "a1b2c3d4e5f6_design_spec.yaml",
    "cifFileFilename": "target.cif",
    "protocolName": "design",
    "numDesigns": 100,
    "budget": 10,
    "pipelineName": "default"
  }'
```

**Python Example:**
```python
import requests

payload = {
    "inputYamlFilename": "a1b2c3d4e5f6_design_spec.yaml",
    "cifFileFilename": "target.cif",
    "protocolName": "design",
    "numDesigns": 100,
    "budget": 10,
    "pipelineName": "default"
}

response = requests.post(
    'http://localhost:8000/v1/design/check',
    json=payload
)
print(response.json())
```

**Response (200 OK):**
```json
{
  "message": "Design check completed",
  "check_passed": true,
  "cif_filename": "design_spec.cif",
  "cif_url": "/v1/files/checks/design_spec.cif",
  "output": "Checking design specification...\nValidation passed."
}
```

**Error Responses:**
- `400 Bad Request`: Invalid request body
- `404 Not Found`: Input YAML file not found
- `500 Internal Server Error`: Design check failed or CIF file was not generated

---

## Design Job Management

### Create Design Job

Creates a new design job and starts the BoltzGen pipeline in the background.

**Endpoint:** `POST /v1/design/create`

**Content-Type:** `application/json`

**Request Body:**
```json
{
  "inputYamlFilename": "a1b2c3d4e5f6_design_spec.yaml",
  "cifFileFilename": "target.cif",
  "protocolName": "design",
  "numDesigns": 100,
  "budget": 10,
  "pipelineName": "default"
}
```

**Fields:** Same as Design Check endpoint

**cURL Example:**
```bash
curl -X POST http://localhost:8000/v1/design/create \
  -H "Content-Type: application/json" \
  -d '{
    "inputYamlFilename": "a1b2c3d4e5f6_design_spec.yaml",
    "cifFileFilename": "target.cif",
    "protocolName": "design",
    "numDesigns": 100,
    "budget": 10,
    "pipelineName": "default"
  }'
```

**Python Example:**
```python
import requests

payload = {
    "inputYamlFilename": "a1b2c3d4e5f6_design_spec.yaml",
    "cifFileFilename": "target.cif",
    "protocolName": "design",
    "numDesigns": 100,
    "budget": 10,
    "pipelineName": "default"
}

response = requests.post(
    'http://localhost:8000/v1/design/create',
    json=payload
)
print(response.json())
```

**Response (201 Created):**
```json
{
  "message": "Design job created successfully and pipeline started",
  "job": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "input_yaml_filename": "a1b2c3d4e5f6_design_spec.yaml",
    "budget": 10,
    "protocol_name": "design",
    "num_designs": 100,
    "status": "pending",
    "pipeline_name": "default",
    "created_at": "2025-01-15T10:30:00",
    "updated_at": "2025-01-15T10:30:00"
  }
}
```

**Job Status Values:**
- `pending`: Job created but pipeline not started yet
- `running`: Pipeline is currently executing
- `completed`: Pipeline completed successfully
- `failed`: Pipeline encountered an error

**Error Responses:**
- `400 Bad Request`: Invalid request body
- `500 Internal Server Error`: Failed to create design job

---

### List Design Jobs

Retrieves all design jobs, ordered by creation date (newest first).

**Endpoint:** `GET /v1/design/list`

**cURL Example:**
```bash
curl http://localhost:8000/v1/design/list
```

**Python Example:**
```python
import requests

response = requests.get('http://localhost:8000/v1/design/list')
print(response.json())
```

**Response (200 OK):**
```json
{
  "message": "Design jobs retrieved successfully",
  "count": 2,
  "jobs": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "input_yaml_filename": "a1b2c3d4e5f6_design_spec.yaml",
      "budget": 10,
      "protocol_name": "design",
      "num_designs": 100,
      "status": "completed",
      "pipeline_name": "default",
      "created_at": "2025-01-15T10:30:00",
      "updated_at": "2025-01-15T11:45:00"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "input_yaml_filename": "b2c3d4e5f6a1_another_spec.yaml",
      "budget": 5,
      "protocol_name": "inverse_fold",
      "num_designs": 50,
      "status": "running",
      "pipeline_name": "default",
      "created_at": "2025-01-15T09:15:00",
      "updated_at": "2025-01-15T09:15:00"
    }
  ]
}
```

**Error Responses:**
- `500 Internal Server Error`: Failed to retrieve design jobs

---

### Get Design Job Results

Lists all available result files for a completed design job.

**Endpoint:** `GET /v1/design/results/<job_id>`

**Parameters:**
- `job_id` (UUID, required): The unique identifier of the design job

**cURL Example:**
```bash
curl http://localhost:8000/v1/design/results/550e8400-e29b-41d4-a716-446655440000
```

**Python Example:**
```python
import requests

job_id = "550e8400-e29b-41d4-a716-446655440000"
response = requests.get(f'http://localhost:8000/v1/design/results/{job_id}')
print(response.json())
```

**Response (200 OK):**
```json
{
  "message": "Design job results retrieved successfully",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "count": 8,
  "files": [
    {
      "name": "a1b2c3d4e5f6_design_spec.yaml",
      "path": "uploads/a1b2c3d4e5f6_design_spec.yaml",
      "url": "/v1/files/uploads/a1b2c3d4e5f6_design_spec.yaml"
    },
    {
      "name": "design_spec.cif",
      "path": "boltzgen_outputs/550e8400-e29b-41d4-a716-446655440000/design_spec.cif",
      "url": "/v1/files/boltzgen_outputs/550e8400-e29b-41d4-a716-446655440000/design_spec.cif"
    },
    {
      "name": "all_designs_metrics.csv",
      "path": "boltzgen_outputs/550e8400-e29b-41d4-a716-446655440000/final_ranked_designs/all_designs_metrics.csv",
      "url": "/v1/files/boltzgen_outputs/550e8400-e29b-41d4-a716-446655440000/final_ranked_designs/all_designs_metrics.csv"
    },
    {
      "name": "final_designs_metrics_10.csv",
      "path": "boltzgen_outputs/550e8400-e29b-41d4-a716-446655440000/final_ranked_designs/final_designs_metrics_10.csv",
      "url": "/v1/files/boltzgen_outputs/550e8400-e29b-41d4-a716-446655440000/final_ranked_designs/final_designs_metrics_10.csv"
    },
    {
      "name": "results_overview.pdf",
      "path": "boltzgen_outputs/550e8400-e29b-41d4-a716-446655440000/final_ranked_designs/results_overview.pdf",
      "url": "/v1/files/boltzgen_outputs/550e8400-e29b-41d4-a716-446655440000/final_ranked_designs/results_overview.pdf"
    },
    {
      "name": "rank_1.cif",
      "path": "boltzgen_outputs/550e8400-e29b-41d4-a716-446655440000/final_ranked_designs/final_10_designs/rank_1.cif",
      "url": "/v1/files/boltzgen_outputs/550e8400-e29b-41d4-a716-446655440000/final_ranked_designs/final_10_designs/rank_1.cif"
    },
    {
      "name": "aggregate_metrics_analyze.csv",
      "path": "boltzgen_outputs/550e8400-e29b-41d4-a716-446655440000/intermediate_designs_inverse_folded/aggregate_metrics_analyze.csv",
      "url": "/v1/files/boltzgen_outputs/550e8400-e29b-41d4-a716-446655440000/intermediate_designs_inverse_folded/aggregate_metrics_analyze.csv"
    },
    {
      "name": "per_target_metrics_analyze.csv",
      "path": "boltzgen_outputs/550e8400-e29b-41d4-a716-446655440000/intermediate_designs_inverse_folded/per_target_metrics_analyze.csv",
      "url": "/v1/files/boltzgen_outputs/550e8400-e29b-41d4-a716-446655440000/intermediate_designs_inverse_folded/per_target_metrics_analyze.csv"
    }
  ]
}
```

**Available Result Files:**
- Input YAML file (from uploads folder)
- Root CIF file (generated from YAML)
- `all_designs_metrics.csv` - Metrics for all generated designs
- `final_designs_metrics_{budget}.csv` - Metrics for final filtered designs
- `results_overview.pdf` - Visual overview of results
- `rank_*.cif` - Ranked design structures in final designs folder
- `rank_*.cif` - Design structures before refolding (in `before_refolding` subdirectory)
- `aggregate_metrics_analyze.csv` - Aggregate metrics from analysis
- `per_target_metrics_analyze.csv` - Per-target metrics from analysis

**Error Responses:**
- `400 Bad Request`: Invalid job ID format
- `404 Not Found`: Design job not found
- `500 Internal Server Error`: Failed to retrieve design job results

---

## File Serving

### Serve Files

Serves files from the output directory. Supports files from `uploads`, `checks`, and `boltzgen_outputs` folders.

**Endpoint:** `GET /v1/files/<file_path>`

**Parameters:**
- `file_path` (string, required): Relative path from output directory (e.g., `checks/file.cif` or `boltzgen_outputs/job_id/final_ranked_designs/file.csv`)

**Supported File Types:**
- `.cif` - Chemical CIF format (`chemical/x-cif`)
- `.yaml` / `.yml` - YAML files (`application/x-yaml`)
- `.json` - JSON files (`application/json`)
- `.txt` - Text files (`text/plain`)
- `.csv` - CSV files (`text/csv`)
- `.pdf` - PDF files (`application/pdf`)
- Other files - Binary (`application/octet-stream`)

**cURL Examples:**
```bash
# Download a CIF file from checks
curl http://localhost:8000/v1/files/checks/design_spec.cif -o design_spec.cif

# Download a CSV file from results
curl http://localhost:8000/v1/files/boltzgen_outputs/550e8400-e29b-41d4-a716-446655440000/final_ranked_designs/all_designs_metrics.csv -o metrics.csv

# Download an uploaded YAML file
curl http://localhost:8000/v1/files/uploads/a1b2c3d4e5f6_design_spec.yaml -o design_spec.yaml
```

**Python Example:**
```python
import requests

# Download a file
url = "http://localhost:8000/v1/files/checks/design_spec.cif"
response = requests.get(url)

if response.status_code == 200:
    with open('design_spec.cif', 'wb') as f:
        f.write(response.content)
    print("File downloaded successfully")
else:
    print(f"Error: {response.status_code}")
    print(response.json())
```

**Response:**
- `200 OK`: File content with appropriate Content-Type header
- `400 Bad Request`: Invalid file path or folder not allowed
- `404 Not Found`: File not found
- `500 Internal Server Error`: Error reading file

**Allowed Folders:**
- `uploads` - User-uploaded files
- `checks` - Validation and check results
- `boltzgen_outputs` - Pipeline output files

---

## Complete Workflow Example

Here's a complete example of using the API to create and monitor a design job:

```python
import requests
import time

BASE_URL = "http://localhost:8000/v1"

# Step 1: Upload design specification YAML file
print("Step 1: Uploading files...")
with open('design_spec.yaml', 'rb') as f:
    files = [('files', f)]
    upload_response = requests.post(f'{BASE_URL}/upload', files=files)
    upload_data = upload_response.json()
    yaml_filename = upload_data['files'][0]['file_name']
    print(f"Uploaded: {yaml_filename}")

# Step 2: Check the design specification
print("\nStep 2: Checking design specification...")
check_payload = {
    "inputYamlFilename": yaml_filename,
    "cifFileFilename": "target.cif",
    "protocolName": "design",
    "numDesigns": 100,
    "budget": 10,
    "pipelineName": "default"
}
check_response = requests.post(f'{BASE_URL}/design/check', json=check_payload)
check_data = check_response.json()
print(f"Check passed: {check_data['check_passed']}")
print(f"CIF URL: {check_data['cif_url']}")

# Step 3: Create a design job
print("\nStep 3: Creating design job...")
create_response = requests.post(f'{BASE_URL}/design/create', json=check_payload)
create_data = create_response.json()
job_id = create_data['job']['id']
status = create_data['job']['status']
print(f"Job ID: {job_id}")
print(f"Status: {status}")

# Step 4: Monitor job status
print("\nStep 4: Monitoring job status...")
while status in ['pending', 'running']:
    time.sleep(5)  # Wait 5 seconds
    list_response = requests.get(f'{BASE_URL}/design/list')
    jobs = list_response.json()['jobs']
    job = next((j for j in jobs if j['id'] == job_id), None)
    if job:
        status = job['status']
        print(f"Status: {status}")

# Step 5: Get results when completed
if status == 'completed':
    print("\nStep 5: Retrieving results...")
    results_response = requests.get(f'{BASE_URL}/design/results/{job_id}')
    results_data = results_response.json()
    print(f"Found {results_data['count']} result files")
    
    # Download the final metrics CSV
    for file_info in results_data['files']:
        if file_info['name'].endswith('_metrics.csv'):
            print(f"\nDownloading: {file_info['name']}")
            file_response = requests.get(f"http://localhost:8000{file_info['url']}")
            with open(file_info['name'], 'wb') as f:
                f.write(file_response.content)
            print(f"Downloaded: {file_info['name']}")
elif status == 'failed':
    print("\nJob failed. Check logs for details.")
```

---

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "message": "Error description here"
}
```

**Common HTTP Status Codes:**
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error occurred

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- Job IDs are UUIDs (version 4)
- File paths in responses are relative to the output directory
- The API uses CORS and supports credentials
- Long-running requests (like design jobs) may take several minutes to complete

