# Architecture Documentation

This document describes the architecture and project structure of Hypercaller.

## Overview

Hypercaller is a modern business discovery platform built with:
- **Frontend**: Next.js 14 with TypeScript, React
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: AWS DynamoDB
- **Search**: Hybrid search with AWS Bedrock NLP and semantic embeddings
- **Caching**: Redis (Upstash) for query caching and performance
- **Authentication**: Custom OTP-based authentication with session management
- **AI/ML**: AWS Bedrock for natural language processing and embeddings

## Project Structure

```
hypercaller/
├── app/                      # Next.js app directory
│   ├── api/                  # API routes
│   │   └── auth/            # Authentication endpoints
│   │       ├── check-username/
│   │       ├── google/
│   │       ├── login/
│   │       ├── logout/
│   │       ├── register/
│   │       ├── send-otp/
│   │       ├── session/
│   │       └── verify-otp/
│   ├── login/               # Login page
│   ├── register/            # Registration page
│   ├── layout.tsx           # Root layout with theme provider
│   ├── page.tsx             # Home page
│   └── globals.css          # Global styles
├── components/              # React components
│   ├── ui/                 # shadcn/ui components
│   │   ├── avatar.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── otp-input.tsx
│   │   ├── progress.tsx
│   │   └── toast.tsx
│   ├── business-search-bar.tsx
│   ├── confetti-celebration.tsx
│   ├── theme-provider.tsx
│   ├── theme-toggle.tsx
│   └── user-profile-dropdown.tsx
├── hooks/                   # Custom React hooks
│   └── use-user-session.ts
├── lib/                     # Utility functions and modules
│   ├── bedrock/           # AWS Bedrock integration
│   │   ├── bedrock-client.ts      # Bedrock client configuration
│   │   ├── embeddings.ts          # Embedding generation
│   │   ├── nlp.ts                 # Natural language processing
│   │   ├── fallback-handler.ts   # Fallback logic for API failures
│   │   └── rate-limiter.ts       # Rate limiting for API calls
│   ├── cache/              # Caching layer
│   │   └── redis-config.ts # Redis configuration
│   ├── db/                 # Database operations
│   │   ├── businesses.js   # Business CRUD operations
│   │   ├── embeddings.js   # Embedding storage and retrieval
│   │   ├── otp.js          # OTP management
│   │   ├── search-history.js # Search history tracking
│   │   ├── search-queries.js # Query caching
│   │   ├── sessions.js     # Session management
│   │   └── users.js        # User CRUD operations
│   ├── search/             # Search pipeline
│   │   ├── query-processor.ts    # Query processing and analysis
│   │   ├── semantic-search.ts    # Semantic/vector search
│   │   ├── keyword-search.ts     # Keyword-based search
│   │   ├── hybrid-search.ts      # Hybrid search combining both
│   │   ├── location-resolver.ts  # Location extraction and resolution
│   │   ├── category-mapper.ts    # Category mapping and classification
│   │   ├── ranking.ts            # Result ranking and relevance
│   │   ├── filters.ts            # Search filters
│   │   └── deduplication.ts      # Result deduplication
│   ├── normalization/      # Data normalization
│   │   ├── category-normalizer.ts
│   │   ├── location-normalizer.ts
│   │   ├── phone-normalizer.ts
│   │   └── ... (other normalizers)
│   ├── validation/         # Data validation
│   │   ├── business-validator.ts
│   │   ├── location-validator.ts
│   │   └── ... (other validators)
│   ├── mapping/            # Data mapping
│   │   ├── bedrock-category-mapper.ts
│   │   ├── bedrock-location-mapper.ts
│   │   └── ... (other mappers)
│   ├── monitoring/         # Monitoring and error tracking
│   │   ├── error-tracker.ts
│   │   └── performance-tracker.ts
│   ├── data/               # Static data and taxonomies
│   │   ├── categories.ts   # Category taxonomy
│   │   ├── location-aliases.ts # Location aliases
│   │   └── ... (other data files)
│   ├── schemas/            # Data schemas (Zod)
│   │   ├── business-schema.ts
│   │   ├── search-schema.ts
│   │   └── ... (other schemas)
│   ├── utils/              # Utility functions
│   │   ├── cache.ts        # Cache utilities
│   │   ├── distance.ts     # Distance calculations
│   │   └── ... (other utilities)
│   ├── avatar-map.ts       # Avatar mapping
│   ├── dynamodb.js         # DynamoDB client configuration
│   ├── server-utils.js     # Server-side utilities
│   └── utils.ts            # Client-side utilities
├── scripts/                 # Setup and utility scripts
│   ├── create-dynamodb-tables.ps1  # Windows table creation
│   └── create-dynamodb-tables.sh    # Linux/Mac table creation
├── server/                  # Legacy Express server (if applicable)
├── docs/                    # Documentation
├── public/                  # Static assets
├── .env.local               # Environment variables (not in git)
├── next.config.mjs          # Next.js configuration
├── tailwind.config.ts       # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

## Architecture Layers

### 1. Presentation Layer

**Location**: `app/`, `components/`

- **Pages**: Next.js pages using the App Router
- **Components**: Reusable React components
- **UI Components**: shadcn/ui component library
- **Styling**: Tailwind CSS with dark/light theme support

**Key Components**:
- `app/page.tsx`: Home page with business discovery features
- `app/login/page.tsx`: Login page with form validation
- `app/register/page.tsx`: 3-step registration form
- `components/confetti-celebration.tsx`: Success celebration animation
- `components/theme-toggle.tsx`: Dark/light mode toggle

### 2. API Layer

**Location**: `app/api/`

- **Next.js API Routes**: Serverless API endpoints
- **Authentication**: All auth endpoints under `/api/auth/`
- **Request/Response**: JSON-based communication

**API Endpoints**:

**Authentication**:
- `POST /api/auth/send-otp`: Send OTP to phone
- `POST /api/auth/verify-otp`: Verify OTP code
- `POST /api/auth/check-username`: Check username availability
- `POST /api/auth/register`: Complete registration
- `POST /api/auth/login`: User authentication
- `GET /api/auth/session`: Validate session
- `POST /api/auth/logout`: End session

**Search**:
- `POST /api/search`: Business search with NLP and semantic search
- `POST /api/embeddings`: Generate embeddings for text

**Profile**:
- `GET /api/profile`: Get user profile
- `PUT /api/profile`: Update user profile

### 3. Business Logic Layer

**Location**: `lib/search/`, `lib/normalization/`, `lib/validation/`, `lib/mapping/`

- **Search Pipeline**: Query processing, NLP analysis, semantic search, ranking
- **Data Normalization**: Category, location, phone, and other data normalization
- **Data Validation**: Comprehensive validation using Zod schemas
- **Data Mapping**: Mapping between Bedrock outputs and internal data structures
- **Business Rules**: Validation, normalization, security

**Key Modules**:
- `lib/search/query-processor.ts`: Main query processing orchestrator
- `lib/search/hybrid-search.ts`: Combines semantic and keyword search
- `lib/normalization/`: Data normalization modules
- `lib/validation/`: Data validation modules
- `lib/mapping/`: Data mapping modules
- `lib/db/users.js`: User CRUD operations
- `lib/db/businesses.js`: Business CRUD operations
- `lib/db/embeddings.js`: Embedding storage and retrieval
- `lib/db/otp.js`: OTP generation and verification
- `lib/db/sessions.js`: Session management
- `lib/server-utils.js`: Server-side utilities (hashing, normalization)

### 4. Data Layer

**Location**: `lib/dynamodb.js`, `lib/cache/redis-config.ts`

- **DynamoDB Client**: AWS SDK client configuration
- **Connection Management**: Single client instance
- **Region Configuration**: ap-southeast-1 (Singapore)
- **Redis Cache**: Upstash Redis for query caching and performance
- **Embedding Storage**: Business embeddings stored in DynamoDB
- **Search History**: User search history tracking

## Data Flow

### Registration Flow

1. **User Input** → Registration form (`app/register/page.tsx`)
2. **Step 1**: Send OTP → `POST /api/auth/send-otp`
3. **OTP Generation** → `lib/db/otp.js` → DynamoDB
4. **Step 1**: Verify OTP → `POST /api/auth/verify-otp`
5. **Step 2**: Password setup (client-side validation)
6. **Step 3**: Profile setup → Username check → `POST /api/auth/check-username`
7. **Submit** → `POST /api/auth/register`
8. **User Creation** → `lib/db/users.js` → DynamoDB
9. **Session Creation** → `lib/db/sessions.js` → DynamoDB
10. **Response** → Client stores session → Redirect to home

### Login Flow

1. **User Input** → Login form (`app/login/page.tsx`)
2. **Submit** → `POST /api/auth/login`
3. **Authentication** → `lib/db/users.js` → Verify password
4. **Session Creation** → `lib/db/sessions.js` → DynamoDB
5. **Response** → Client stores session → Redirect to home

### Session Validation Flow

1. **Client Request** → Includes session ID (cookie/localStorage)
2. **API Endpoint** → `GET /api/auth/session`
3. **Session Lookup** → `lib/db/sessions.js` → DynamoDB
4. **Validation** → Check expiration, account status
5. **Response** → User data or error

### Search Flow

1. **User Query** → Search bar component (`components/business-search-bar.tsx`)
2. **API Request** → `POST /api/search` with query and pagination
3. **Query Processing** → `lib/search/query-processor.ts`:
   - Extract intent (search, question, etc.)
   - NLP Analysis → `lib/bedrock/nlp.ts` → AWS Bedrock
   - Category Classification → Bedrock NLP + Category Mapper
   - Location Extraction → `lib/search/location-resolver.ts`
   - Entity Extraction → Bedrock NLP
4. **Embedding Generation** → `lib/bedrock/embeddings.ts` → AWS Bedrock
5. **Hybrid Search** → `lib/search/hybrid-search.ts`:
   - Semantic Search → `lib/search/semantic-search.ts` (vector similarity)
   - Keyword Search → `lib/search/keyword-search.ts` (text matching)
   - Combine and deduplicate results
6. **Filtering** → `lib/search/filters.ts`:
   - Category filter
   - Location filter (radius-based)
   - Price range filter
   - Rating filter
7. **Ranking** → `lib/search/ranking.ts`:
   - Relevance scoring
   - Distance-based ranking
   - Rating and review count
8. **Response** → Return paginated results to client
9. **Caching** → Cache query embeddings and results in Redis

## Security Architecture

### Authentication

1. **OTP Verification**: Phone number verification via OTP
2. **Password Hashing**: bcrypt with 12 rounds
3. **Session Management**: Secure session tokens with expiration
4. **Input Validation**: Server-side validation for all inputs
5. **Data Normalization**: Phone numbers (E.164) and usernames (lowercase)

### Data Protection

1. **Password Storage**: Never stored in plain text
2. **OTP Expiration**: 10-minute TTL via DynamoDB
3. **Session Expiration**: 1 day (default) or 30 days (remember me)
4. **Input Sanitization**: All user inputs are validated and normalized

## State Management

### Client-Side State

- **React State**: Component-level state for forms, search results, loading states
- **Local Storage**: Session storage for authentication
- **URL Parameters**: Query params for success messages
- **Search State**: Query analysis, results, pagination, filters

### Server-Side State

- **DynamoDB**: Single source of truth for all data
- **Sessions**: Stored in DynamoDB with TTL
- **Redis Cache**: Query embeddings, search results, geocoding results
- **Embeddings**: Business embeddings stored in DynamoDB
- **Search History**: User search history in DynamoDB

## Styling Architecture

### Tailwind CSS

- **Utility-First**: Tailwind utility classes
- **Custom Configuration**: `tailwind.config.ts`
- **Dark Mode**: Next-themes integration
- **Responsive Design**: Mobile-first approach

### Component Library

- **shadcn/ui**: Radix UI primitives with Tailwind
- **Custom Components**: Built on top of shadcn/ui
- **Theme Support**: Dark/light mode variants

## Environment Configuration

### Environment Variables

```env
# AWS Configuration
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_BEDROCK_REGION=ap-southeast-1

# AWS Bedrock Models
AWS_BEDROCK_EMBEDDING_MODEL_ID=amazon.titan-embed-text-v1
AWS_BEDROCK_NLP_MODEL_ID=mistral.mixtral-8x7b-instruct-v0:1
AWS_BEDROCK_NLP_FALLBACK_MODEL_ID=mistral.mistral-large-2402-v1:0

# Redis Cache
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# Application
NODE_ENV=development
```

### Configuration Files

- `next.config.mjs`: Next.js configuration
- `tailwind.config.ts`: Tailwind CSS configuration
- `tsconfig.json`: TypeScript configuration
- `components.json`: shadcn/ui configuration

## Deployment Architecture

### Development

- **Local Server**: `npm run dev` on port 3000
- **Hot Reload**: Next.js Fast Refresh
- **API Routes**: Same server as frontend

### Production

- **Build**: `npm run build`
- **Start**: `npm run start`
- **Deployment**: Can be deployed to Vercel, AWS, or any Node.js hosting
- **Database**: AWS DynamoDB (managed service)

## Scalability Considerations

### Current Architecture

- **Single Region**: ap-southeast-1 (Singapore)
- **Caching**: Redis (Upstash) for query caching
- **Embeddings**: 1536-dimensional embeddings stored in DynamoDB
- **Hybrid Search**: Combines semantic (vector) and keyword search
- **Rate Limiting**: Built-in rate limiting for Bedrock API calls
- **Fallback Handling**: Automatic fallback to secondary NLP model

### Future Improvements

1. **Multi-Region**: DynamoDB Global Tables
2. **Enhanced Caching**: More aggressive caching strategies
3. **CDN**: Static asset delivery
4. **Load Balancing**: Multiple server instances
5. **Auto Scaling**: DynamoDB on-demand or auto-scaling
6. **Search Analytics**: Track search patterns and optimize
7. **Personalization**: User-specific search ranking

## Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first CSS
- **shadcn/ui**: Component library
- **Lucide React**: Icons
- **next-themes**: Theme management

### Backend
- **Next.js API Routes**: Serverless API
- **AWS SDK**: DynamoDB and Bedrock clients
- **AWS Bedrock**: NLP and embedding generation
- **Redis (Upstash)**: Query caching and performance
- **bcryptjs**: Password hashing
- **uuid**: Unique ID generation
- **Zod**: Schema validation

### Database
- **AWS DynamoDB**: NoSQL database
- **TTL**: Automatic expiration
- **GSI**: Global Secondary Indexes for queries
- **Embeddings**: Vector embeddings stored in DynamoDB
- **Search History**: User search history tracking

### AI/ML
- **AWS Bedrock**: Natural language processing and embeddings
- **Embedding Model**: amazon.titan-embed-text-v1 (1536 dimensions)
- **NLP Model**: mistral.mixtral-8x7b-instruct-v0:1 (primary)
- **NLP Fallback**: mistral.mistral-large-2402-v1:0

## Development Workflow

1. **Local Development**: `npm run dev`
2. **API Testing**: Use browser DevTools or Postman
3. **Database Setup**: Run table creation scripts
4. **Environment**: Configure `.env.local`
5. **Linting**: `npm run lint`

For more details, see [Development Guide](./development.md).

