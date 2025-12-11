# Hypercaller

A modern business discovery platform built with Next.js, Tailwind CSS, shadcn/ui, and DynamoDB.

## Features

- 🎨 Modern, responsive UI with Tailwind CSS
- ⚡ Fast and optimized with Next.js 14
- 🎯 shadcn/ui component library
- 🔐 Secure authentication with OTP verification
- 💾 AWS DynamoDB integration
- 📱 Mobile-friendly design
- 🌓 Dark/Light mode support

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: AWS DynamoDB
- **Icons**: Lucide React

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- AWS Account with DynamoDB access

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure AWS credentials (see [Getting Started Guide](./docs/getting-started.md))

3. Create DynamoDB tables:
```bash
# Windows
.\scripts\create-dynamodb-tables.ps1

# Linux/Mac
./scripts/create-dynamodb-tables.sh
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:3000

## Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

- **[Getting Started](./docs/getting-started.md)** - Installation and setup guide
- **[API Reference](./docs/api-reference.md)** - Complete API documentation
- **[Database Documentation](./docs/database.md)** - Database schema and setup
- **[Architecture](./docs/architecture.md)** - Project structure and architecture
- **[Development Guide](./docs/development.md)** - Coding standards and best practices

## Project Structure

```
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   ├── login/          # Login page
│   ├── register/       # Registration page
│   └── page.tsx        # Home page
├── components/         # React components
├── lib/               # Utility functions and DB modules
├── scripts/           # Database setup scripts
└── docs/              # Documentation
```

## Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## License

This project is private and proprietary.
