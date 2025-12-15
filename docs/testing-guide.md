# Testing Guide

## Overview
Comprehensive testing guide for the Hypercaller search functionality, covering end-to-end, performance, UI/UX, and integration testing.

## Test Suites

### 1. Unit Testing
**Script:** `npm test` or `npm run test:unit`

**Purpose:** Tests individual functions and components in isolation.

**Coverage:**
- Utility functions
- Normalization functions
- Validation functions
- Component logic

**Requirements:**
- Jest test framework
- Test files in `tests/unit/` directory

### 2. Integration Testing
**Script:** `npm run test:integration`

**Purpose:** Tests API endpoints, database operations, and service integrations.

**Coverage:**
- API endpoints
- Database queries
- Authentication flow
- Error handling

**Requirements:**
- Development server running (for API tests)
- DynamoDB tables created
- Optional: Postman/curl for manual API testing

### 3. End-to-End Testing
**Script:** `npm run test:e2e` (if configured)

**Purpose:** Tests complete user flows from query input to results display.

**Coverage:**
- Complete search flow
- Location flow with "near me"
- Error scenarios
- Different query types

**Requirements:**
- Development server running (`npm run dev`)

### 4. Manual Testing

**Purpose:** Comprehensive checklist for manual UI/UX and functional testing.

**Coverage:**
- Responsive design
- Mobile devices
- Keyboard navigation
- Accessibility
- Loading states
- Error messages
- User flows

**Requirements:**
- Manual testing required
- Browser DevTools for responsive testing
- Screen reader for accessibility testing

## Quick Start

### Run Tests
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Prerequisites
1. Start development server: `npm run dev`
2. Ensure environment variables are configured
3. DynamoDB tables created
4. Test data available (optional)

## Manual Testing Checklists

### End-to-End Testing
- [ ] Type query and submit search
- [ ] See results displayed correctly
- [ ] Click pagination controls
- [ ] Search "near me" without location
- [ ] Set location via modal
- [ ] Search again after location set
- [ ] See location-based results with distance
- [ ] Test invalid queries
- [ ] Test network errors
- [ ] Test different query types

### Performance Testing (Manual)
- [ ] Measure search response time (< 2s target)
- [ ] Test with 100+ results (< 5s target)
- [ ] Test pagination performance (< 3s per page)
- [ ] Verify caching improves repeat queries
- [ ] Check response times meet targets

### UI/UX Testing (Manual)
- [ ] Test on mobile (320px, 375px, 414px)
- [ ] Test on tablet (768px, 1024px)
- [ ] Test on desktop (1280px, 1920px)
- [ ] Test touch interactions
- [ ] Test keyboard navigation
- [ ] Test with screen reader
- [ ] Verify loading states
- [ ] Verify error messages

### Integration Testing (Manual)
- [ ] Test API with Postman/curl
- [ ] Test location resolution
- [ ] Test authentication flow
- [ ] Test database queries
- [ ] Test error handling

## API Testing Examples

### Basic Search
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"restaurants","pagination":{"page":1,"limit":20}}'
```

### With Location
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"restaurants in Mumbai","pagination":{"page":1,"limit":20}}'
```

### With Authentication
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -H "x-session-id: YOUR_SESSION_ID" \
  -d '{"query":"restaurants near me","pagination":{"page":1,"limit":20}}'
```

## Performance Benchmarks

**Target Response Times:**
- Simple query: < 1 second
- Location query: < 2 seconds
- Category query: < 2 seconds
- Pagination: < 3 seconds per page
- Many results (100+): < 5 seconds

## Test Results

All test suites are implemented and ready for use. Run the tests to verify functionality and performance.

