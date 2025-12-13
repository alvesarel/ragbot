/**
 * Knowledge Base Embedding Script
 *
 * This script reads all markdown files from the knowledge-base directory,
 * chunks them, generates embeddings via OpenAI, and uploads to Qdrant.
 *
 * Usage: node scripts/embed_knowledge_base.js
 *
 * Required environment variables:
 * - OPENAI_API_KEY
 * - QDRANT_URL
 * - QDRANT_API_KEY (optional for local)
 * - QDRANT_COLLECTION_NAME
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  knowledgeBasePath: path.join(__dirname, '..', 'knowledge-base'),
  chunkSize: 500, // approximate tokens per chunk
  chunkOverlap: 50, // overlap between chunks
  embeddingModel: 'text-embedding-3-small',
  qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
  qdrantApiKey: process.env.QDRANT_API_KEY || '',
  qdrantCollection: process.env.QDRANT_COLLECTION_NAME || 'clinic_knowledge_base',
  openaiApiKey: process.env.OPENAI_API_KEY
};

// Parse frontmatter from markdown
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, content };
  }

  const frontmatter = match[1];
  const body = match[2];

  const metadata = {};
  frontmatter.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length) {
      let value = valueParts.join(':').trim();
      // Parse arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value.slice(1, -1).split(',').map(v => v.trim());
      }
      // Parse booleans
      if (value === 'true') value = true;
      if (value === 'false') value = false;
      metadata[key.trim()] = value;
    }
  });

  return { metadata, content: body };
}

// Split text into chunks
function chunkText(text, chunkSize = 500, overlap = 50) {
  const words = text.split(/\s+/);
  const chunks = [];

  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunk = words.slice(start, end).join(' ');
    chunks.push(chunk);
    start = end - overlap;
    if (start >= words.length - overlap) break;
  }

  return chunks;
}

// Read all markdown files recursively
function readMarkdownFiles(dir) {
  const files = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const relativePath = path.relative(dir, fullPath);
        files.push({ path: relativePath, content });
      }
    }
  }

  walk(dir);
  return files;
}

// Make HTTP request
function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    const req = lib.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Generate embeddings via OpenAI
async function generateEmbedding(text) {
  const response = await makeRequest(
    'https://api.openai.com/v1/embeddings',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.openaiApiKey}`
      }
    },
    {
      model: CONFIG.embeddingModel,
      input: text
    }
  );

  if (response.status !== 200) {
    throw new Error(`OpenAI API error: ${JSON.stringify(response.data)}`);
  }

  return response.data.data[0].embedding;
}

// Upload to Qdrant
async function uploadToQdrant(points) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (CONFIG.qdrantApiKey) {
    headers['api-key'] = CONFIG.qdrantApiKey;
  }

  const response = await makeRequest(
    `${CONFIG.qdrantUrl}/collections/${CONFIG.qdrantCollection}/points?wait=true`,
    {
      method: 'PUT',
      headers
    },
    { points }
  );

  if (response.status !== 200) {
    throw new Error(`Qdrant API error: ${JSON.stringify(response.data)}`);
  }

  return response.data;
}

// Create collection if not exists
async function ensureCollection() {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (CONFIG.qdrantApiKey) {
    headers['api-key'] = CONFIG.qdrantApiKey;
  }

  // Check if collection exists
  const checkResponse = await makeRequest(
    `${CONFIG.qdrantUrl}/collections/${CONFIG.qdrantCollection}`,
    { method: 'GET', headers }
  );

  if (checkResponse.status === 200) {
    console.log(`Collection '${CONFIG.qdrantCollection}' already exists`);
    return;
  }

  // Create collection
  const createResponse = await makeRequest(
    `${CONFIG.qdrantUrl}/collections/${CONFIG.qdrantCollection}`,
    { method: 'PUT', headers },
    {
      vectors: {
        size: 1536, // text-embedding-3-small dimension
        distance: 'Cosine'
      }
    }
  );

  if (createResponse.status !== 200) {
    throw new Error(`Failed to create collection: ${JSON.stringify(createResponse.data)}`);
  }

  console.log(`Created collection '${CONFIG.qdrantCollection}'`);
}

// Main function
async function main() {
  console.log('Starting knowledge base embedding...\n');

  // Validate environment
  if (!CONFIG.openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  // Ensure collection exists
  await ensureCollection();

  // Read all markdown files
  const files = readMarkdownFiles(CONFIG.knowledgeBasePath);
  console.log(`Found ${files.length} markdown files\n`);

  const allPoints = [];
  let pointId = 1;

  for (const file of files) {
    console.log(`Processing: ${file.path}`);

    // Parse frontmatter
    const { metadata, content } = parseFrontmatter(file.content);

    // Chunk the content
    const chunks = chunkText(content, CONFIG.chunkSize, CONFIG.chunkOverlap);
    console.log(`  - ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Skip empty chunks
      if (chunk.trim().length < 50) continue;

      // Generate embedding
      const embedding = await generateEmbedding(chunk);

      // Create point
      const point = {
        id: pointId++,
        vector: embedding,
        payload: {
          content: chunk,
          category: metadata.category || 'unknown',
          language: metadata.language || 'pt',
          tags: Array.isArray(metadata.tags) ? metadata.tags : [],
          priority: metadata.priority || 'normal',
          requires_handoff: metadata.requires_handoff || false,
          source_file: file.path,
          chunk_index: i
        }
      };

      allPoints.push(point);

      // Rate limiting - wait 100ms between embeddings
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`\nGenerated ${allPoints.length} embeddings`);

  // Upload in batches of 100
  const batchSize = 100;
  for (let i = 0; i < allPoints.length; i += batchSize) {
    const batch = allPoints.slice(i, i + batchSize);
    console.log(`Uploading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allPoints.length / batchSize)}...`);
    await uploadToQdrant(batch);
  }

  console.log('\nDone! Knowledge base embedded successfully.');
  console.log(`Total points: ${allPoints.length}`);
}

// Run
main().catch(console.error);
