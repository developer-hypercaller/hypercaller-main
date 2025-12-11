# Architecture Documentation

This document describes the architecture and project structure of Hypercaller.

## Overview

Hypercaller is a modern business discovery platform built with:
- **Frontend**: Next.js 14 with TypeScript, React
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: AWS DynamoDB
- **Authentication**: Custom OTP-based authentication with session management

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
│   ├── db/                 # Database operations
│   │   ├── otp.js          # OTP management
│   │   ├── sessions.js     # Session management
│   │   └── users.js        # User CRUD operations
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
- `POST /api/auth/send-otp`: Send OTP to phone
- `POST /api/auth/verify-otp`: Verify OTP code
- `POST /api/auth/check-username`: Check username availability
- `POST /api/auth/register`: Complete registration
- `POST /api/auth/login`: User authentication
- `GET /api/auth/session`: Validate session
- `POST /api/auth/logout`: End session

### 3. Business Logic Layer

**Location**: `lib/db/`, `lib/server-utils.js`

- **Database Operations**: Encapsulated in separate modules
- **Business Rules**: Validation, normalization, security
- **Utilities**: Password hashing, OTP generation, etc.

**Key Modules**:
- `lib/db/users.js`: User CRUD operations
- `lib/db/otp.js`: OTP generation and verification
- `lib/db/sessions.js`: Session management
- `lib/server-utils.js`: Server-side utilities (hashing, normalization)

### 4. Data Layer

**Location**: `lib/dynamodb.js`

- **DynamoDB Client**: AWS SDK client configuration
- **Connection Management**: Single client instance
- **Region Configuration**: ap-southeast-1 (Singapore)

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

- **React State**: Component-level state for forms
- **Local Storage**: Session storage for authentication
- **URL Parameters**: Query params for success messages

### Server-Side State

- **DynamoDB**: Single source of truth for all data
- **Sessions**: Stored in DynamoDB with TTL
- **No Server-Side Caching**: Direct DynamoDB queries

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
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
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

### Current Limitations

- **Single Region**: ap-southeast-1 only
- **Provisioned Capacity**: Fixed RCU/WCU
- **No Caching**: Direct DynamoDB queries

### Future Improvements

1. **Multi-Region**: DynamoDB Global Tables
2. **Caching**: Redis for session caching
3. **CDN**: Static asset delivery
4. **Load Balancing**: Multiple server instances
5. **Auto Scaling**: DynamoDB on-demand or auto-scaling

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
- **AWS SDK**: DynamoDB client
- **bcryptjs**: Password hashing
- **uuid**: Unique ID generation

### Database
- **AWS DynamoDB**: NoSQL database
- **TTL**: Automatic expiration
- **GSI**: Global Secondary Indexes for queries

## Development Workflow

1. **Local Development**: `npm run dev`
2. **API Testing**: Use browser DevTools or Postman
3. **Database Setup**: Run table creation scripts
4. **Environment**: Configure `.env.local`
5. **Linting**: `npm run lint`

For more details, see [Development Guide](./development.md).

