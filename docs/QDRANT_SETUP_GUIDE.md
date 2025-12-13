# Qdrant Vector Database Setup Guide

## Option 1: Docker (Recommended for Development)

```bash
# Pull and run Qdrant
docker run -p 6333:6333 -p 6334:6334 \
    -v $(pwd)/qdrant_storage:/qdrant/storage:z \
    qdrant/qdrant
```

Qdrant will be available at:
- REST API: http://localhost:6333
- gRPC: http://localhost:6334
- Dashboard: http://localhost:6333/dashboard

## Option 2: Qdrant Cloud (Recommended for Production)

1. Go to [cloud.qdrant.io](https://cloud.qdrant.io)
2. Create an account
3. Create a new cluster (free tier available)
4. Get your:
   - Cluster URL (e.g., `https://xxx-xxx.aws.cloud.qdrant.io`)
   - API Key

## Create Collection

### Via Dashboard (http://localhost:6333/dashboard)
1. Click "Create Collection"
2. Name: `clinic_knowledge_base`
3. Vector size: `1536` (for OpenAI text-embedding-3-small)
4. Distance: `Cosine`

### Via API
```bash
curl -X PUT 'http://localhost:6333/collections/clinic_knowledge_base' \
  -H 'Content-Type: application/json' \
  -d '{
    "vectors": {
      "size": 1536,
      "distance": "Cosine"
    }
  }'
```

## Collection Schema

Each document in the knowledge base will have:

```json
{
  "id": "uuid",
  "vector": [0.1, 0.2, ...],  // 1536 dimensions
  "payload": {
    "content": "The actual text content",
    "category": "institutional|treatments|faq|objection_handling|compliance",
    "language": "pt|en|both",
    "tags": ["pricing", "consultation", "ozempic"],
    "priority": "high|normal|low",
    "requires_handoff": false,
    "source_file": "about_clinic.md",
    "chunk_index": 0
  }
}
```

## Environment Variables

```env
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_api_key  # Only needed for cloud
QDRANT_COLLECTION_NAME=clinic_knowledge_base
```

## Embedding Documents

Use the script `scripts/embed_knowledge_base.js` to:
1. Read all markdown files from `knowledge-base/`
2. Chunk them into smaller pieces
3. Generate embeddings via OpenAI
4. Upload to Qdrant

```bash
# Install dependencies
npm install @qdrant/js-client-rest openai

# Run embedding script
node scripts/embed_knowledge_base.js
```

## Testing the Setup

```bash
# Check collection info
curl 'http://localhost:6333/collections/clinic_knowledge_base'

# Test search
curl -X POST 'http://localhost:6333/collections/clinic_knowledge_base/points/search' \
  -H 'Content-Type: application/json' \
  -d '{
    "vector": [0.1, 0.2, ...],  // Your query embedding
    "limit": 5,
    "with_payload": true
  }'
```

## Backup and Restore

```bash
# Create snapshot
curl -X POST 'http://localhost:6333/collections/clinic_knowledge_base/snapshots'

# List snapshots
curl 'http://localhost:6333/collections/clinic_knowledge_base/snapshots'

# Restore from snapshot
curl -X PUT 'http://localhost:6333/collections/clinic_knowledge_base/snapshots/{snapshot_name}/recover'
```
