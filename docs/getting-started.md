# Getting Started

This guide will help you set up and run the Hypercaller application on your local machine.

## Prerequisites

- **Node.js** 18+ and npm/yarn/pnpm
- **AWS Account** with DynamoDB access
- **AWS CLI** (optional, but recommended)

## Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure AWS Credentials

You have two options for configuring AWS credentials:

#### Option A: Using AWS CLI (Recommended)

1. Install AWS CLI: https://aws.amazon.com/cli/
2. Configure credentials:
   ```bash
   aws configure
   ```
   Enter:
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region: `ap-southeast-1`
   - Default output format: `json`

#### Option B: Using Environment Variables

Create a `.env.local` file in the root directory:

```env
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
NODE_ENV=development
```

**Note**: If AWS CLI is configured, the `.env.local` file is optional. Environment variables will override CLI settings if provided.

### 3. Create DynamoDB Tables

Before running the application, you need to create the required DynamoDB tables.

**Windows (PowerShell):**
```powershell
.\scripts\create-dynamodb-tables.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/create-dynamodb-tables.sh
./scripts/create-dynamodb-tables.sh
```

**Verify tables were created:**
```bash
aws dynamodb list-tables --region ap-southeast-1
```

You should see three tables:
- `Users`
- `OTPVerifications`
- `Sessions`

For more details about the database schema, see [Database Documentation](./database.md).

### 4. Start the Application

Start the Next.js development server:

```bash
npm run dev
```

The application will be available at:
- **Frontend & API**: http://localhost:3000

## Available Scripts

- `npm run dev` - Start Next.js development server (includes API routes)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Next Steps

- Read the [API Reference](./api-reference.md) to understand available endpoints
- Check the [Architecture Documentation](./architecture.md) to understand the project structure
- Review the [Development Guide](./development.md) for contributing guidelines

## Troubleshooting

### Issue: AWS credentials not found

**Solution**: 
- Make sure AWS CLI is configured: `aws configure`
- OR create `.env.local` with AWS credentials

### Issue: DynamoDB tables don't exist

**Solution**: Run the table creation scripts:
- Windows: `.\scripts\create-dynamodb-tables.ps1`
- Linux/Mac: `./scripts/create-dynamodb-tables.sh`

### Issue: "Cannot find module" errors

**Solution**: Run `npm install` to install all dependencies

### Issue: Port 3000 already in use

**Solution**: Either stop the process using port 3000, or modify the port in `package.json`:
```json
"dev": "next dev -p 3001"
```

