# Development Guide

This guide covers development practices, coding standards, and contribution guidelines for Hypercaller.

## Development Setup

### Prerequisites

- Node.js 18+ installed
- AWS account with DynamoDB access
- Git for version control
- Code editor (VS Code recommended)

### Initial Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Configure AWS credentials (see [Getting Started](./getting-started.md))
4. Create DynamoDB tables
5. Start development server: `npm run dev`

## Code Structure

### File Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Utilities**: camelCase (e.g., `server-utils.js`)
- **API Routes**: kebab-case directories (e.g., `send-otp/route.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)

### Directory Organization

- **`app/`**: Next.js pages and API routes
- **`components/`**: Reusable React components
- **`lib/`**: Utility functions and database modules
- **`hooks/`**: Custom React hooks
- **`scripts/`**: Setup and utility scripts
- **`docs/`**: Documentation

## Coding Standards

### TypeScript

- Use TypeScript for all new files
- Define types and interfaces explicitly
- Avoid `any` type - use `unknown` if type is truly unknown
- Use type inference where appropriate

**Example**:
```typescript
interface User {
  userId: string;
  username: string;
  email?: string; // Optional property
}

function getUser(id: string): Promise<User | null> {
  // Implementation
}
```

### JavaScript (Legacy Files)

- Use ES6+ features
- Prefer `const` and `let` over `var`
- Use async/await over callbacks
- Export using CommonJS (`module.exports`)

**Example**:
```javascript
const { dynamoClient } = require('../dynamodb');

async function createUser(userData) {
  // Implementation
}

module.exports = { createUser };
```

### React Components

- Use functional components with hooks
- Extract reusable logic into custom hooks
- Keep components small and focused
- Use TypeScript for component props

**Example**:
```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Button({ label, onClick, disabled }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
```

### API Routes

- Use Next.js API route handlers
- Validate all inputs
- Return consistent error responses
- Use appropriate HTTP status codes

**Example**:
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    if (!body.field) {
      return NextResponse.json(
        { error: 'Field is required' },
        { status: 400 }
      );
    }
    
    // Process request
    const result = await processRequest(body);
    
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Database Operations

### Best Practices

1. **Always normalize inputs**: Phone numbers, usernames, etc.
2. **Handle errors gracefully**: Check for null/undefined results
3. **Use transactions when needed**: For multi-step operations
4. **Respect TTL**: Don't manually delete items with TTL

**Example**:
```javascript
async function getUserByUsername(username) {
  const normalizedUsername = normalizeUsername(username);
  
  const result = await dynamoClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'username-index',
      KeyConditionExpression: 'username = :username',
      ExpressionAttributeValues: {
        ':username': normalizedUsername,
      },
      Limit: 1,
    })
  );
  
  return result.Items && result.Items.length > 0 
    ? result.Items[0] 
    : null;
}
```

## Testing

### Manual Testing

1. **Registration Flow**:
   - Test all 3 steps
   - Verify OTP functionality
   - Check username availability
   - Test form validation

2. **Login Flow**:
   - Test successful login
   - Test invalid credentials
   - Test remember me functionality

3. **Session Management**:
   - Test session validation
   - Test logout
   - Test session expiration

### Testing Checklist

- [ ] All API endpoints return expected responses
- [ ] Error handling works correctly
- [ ] Form validation prevents invalid submissions
- [ ] OTP expiration works (10 minutes)
- [ ] Session expiration works (1 day / 30 days)
- [ ] Dark/light theme toggle works
- [ ] Responsive design works on mobile

## Error Handling

### API Errors

Always return consistent error responses:

```typescript
// Validation error
return NextResponse.json(
  { error: 'Field is required' },
  { status: 400 }
);

// Authentication error
return NextResponse.json(
  { error: 'Invalid credentials' },
  { status: 401 }
);

// Server error
return NextResponse.json(
  { error: 'Internal server error' },
  { status: 500 }
);
```

### Client-Side Errors

Handle errors gracefully in components:

```typescript
try {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    setError(error.error || 'An error occurred');
    return;
  }
  
  const result = await response.json();
  // Handle success
} catch (error) {
  setError('Network error. Please try again.');
}
```

## Environment Variables

### Development

Create `.env.local`:
```env
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
NODE_ENV=development
```

### Production

- Never commit `.env.local` to git
- Use secure environment variable management
- Rotate credentials regularly
- Use IAM roles when possible (instead of access keys)

## Git Workflow

### Commit Messages

Use clear, descriptive commit messages:

```
feat: Add username availability check
fix: Resolve OTP expiration issue
docs: Update API documentation
refactor: Simplify user creation logic
```

### Branch Naming

- `feature/feature-name`: New features
- `fix/bug-description`: Bug fixes
- `docs/documentation-update`: Documentation updates
- `refactor/code-improvement`: Code refactoring

## Performance Optimization

### Frontend

1. **Code Splitting**: Use Next.js automatic code splitting
2. **Image Optimization**: Use Next.js Image component
3. **Lazy Loading**: Load components on demand
4. **Memoization**: Use React.memo for expensive components

### Backend

1. **Database Queries**: Use indexes efficiently
2. **Caching**: Consider caching for frequently accessed data
3. **Connection Pooling**: DynamoDB handles this automatically
4. **Batch Operations**: Use batch writes when possible

## Security Best Practices

1. **Input Validation**: Always validate and sanitize inputs
2. **Password Security**: Never log passwords, always hash
3. **Session Security**: Use secure session tokens
4. **Error Messages**: Don't expose sensitive information
5. **Rate Limiting**: Consider implementing rate limits
6. **HTTPS**: Always use HTTPS in production

## Debugging

### Common Issues

1. **DynamoDB Connection Errors**:
   - Check AWS credentials
   - Verify region configuration
   - Check IAM permissions

2. **OTP Not Working**:
   - Check OTPVerifications table exists
   - Verify TTL is configured
   - Check timestamp format

3. **Session Issues**:
   - Verify session storage (localStorage/cookies)
   - Check session expiration
   - Verify session lookup logic

### Debugging Tools

- **Browser DevTools**: Network tab, Console
- **AWS Console**: DynamoDB table inspection
- **Next.js DevTools**: React DevTools extension
- **Logging**: Console.log (remove in production)

## Code Review Checklist

Before submitting code for review:

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] No console.log statements (or removed)
- [ ] Error handling is implemented
- [ ] Input validation is present
- [ ] Documentation is updated (if needed)
- [ ] No sensitive data is committed
- [ ] TypeScript types are correct
- [ ] No unused imports or variables

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [AWS DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## Getting Help

- Check existing documentation in `docs/`
- Review API reference: `docs/api-reference.md`
- Check database schema: `docs/database.md`
- Review architecture: `docs/architecture.md`

