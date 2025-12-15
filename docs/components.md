# Components Documentation

This document describes all React components in the Hypercaller application, their props, usage, and implementation details.

## Table of Contents

- [Business Components](#business-components)
- [Search Components](#search-components)
- [User Interface Components](#user-interface-components)
- [Layout Components](#layout-components)
- [UI Primitives](#ui-primitives)

---

## Business Components

### BusinessCard

A comprehensive card component for displaying business information with save functionality, contact actions, and location details.

**Location**: `components/business-card.tsx`

**Props**:
```typescript
interface BusinessCardProps {
  business: Business;
  onClick?: () => void;
  showDistance?: boolean;
  className?: string;
  showSaveButton?: boolean;
  isSaved?: boolean;
  onSaveChange?: (saved: boolean) => void;
}
```

**Business Interface**:
```typescript
interface Business {
  businessId: string;
  name: string;
  description?: string;
  category?: string;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    latitude?: number;
    longitude?: number;
  };
  contact?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  rating?: number;
  reviewCount?: number;
  priceRange?: "$" | "$$" | "$$$" | "$$$$";
  images?: string[];
  logo?: string;
  distance?: number; // Distance in meters
  distanceKm?: number; // Distance in kilometers
  businessHours?: any;
  amenities?: string[];
  status?: string;
  isVerified?: boolean;
}
```

**Features**:
- **Save Functionality**: Toggle save/unsave with optimistic UI updates
- **Distance Display**: Shows distance in meters (< 1km) or kilometers
- **Rating Display**: Star rating with review count
- **Price Range**: Visual price range indicator
- **Business Hours**: Shows today's hours or "Closed today"
- **Contact Actions**: Call, Directions, and Website buttons
- **Verified Badge**: Shows verified status if applicable
- **Amenities**: Displays up to 3 amenities with overflow indicator
- **Responsive Design**: Mobile-first responsive layout
- **Loading States**: Shows loading spinner while checking/saving status

**Usage**:
```tsx
import { BusinessCard } from "@/components/business-card";

<BusinessCard
  business={businessData}
  onClick={() => handleBusinessClick(businessData)}
  showDistance={true}
  showSaveButton={true}
  isSaved={false}
  onSaveChange={(saved) => console.log("Saved:", saved)}
/>
```

**Implementation Details**:
- Uses `useUserSession` hook to check authentication
- Checks saved status on mount via `GET /api/profile/saved-businesses?businessId=xxx`
- Optimistic UI updates for better UX
- Error handling with toast notifications
- Prevents duplicate saves (409 conflict handling)
- Formats URLs for directions and website links
- Handles external images (uses `img` tag instead of Next.js Image)

**API Integration**:
- `GET /api/profile/saved-businesses?businessId=xxx` - Check if saved
- `POST /api/profile/saved-businesses` - Save business
- `DELETE /api/profile/saved-businesses?businessId=xxx` - Remove saved business

---

## Search Components

### BusinessSearchBar

Main search input component with query processing, filters, and result display.

**Location**: `components/business-search-bar.tsx`

**Props**:
```typescript
interface BusinessSearchBarProps {
  className?: string;
  onSearchComplete?: (summary: SearchSummary) => void;
  initialQuery?: string;
}
```

**Features**:
- **Natural Language Search**: Processes queries with NLP
- **Location Detection**: Detects "near me" keywords and uses user location
- **Filter Panel**: Category, rating, price range filters
- **Query Analysis**: Shows detected intent, category, and entities
- **Search History**: Records searches for authenticated users
- **Loading States**: Shows loading indicators during search
- **Error Handling**: Displays error messages with retry options
- **Performance Metrics**: Shows response time and cache status
- **Location Setup**: Prompts for location if not set

**Usage**:
```tsx
import { BusinessSearchBar } from "@/components/business-search-bar";

<BusinessSearchBar
  onSearchComplete={(summary) => console.log("Search completed:", summary)}
  initialQuery="Italian restaurants"
/>
```

**State Management**:
- Manages search query, results, loading, and error states
- Handles pagination internally
- Tracks location information and user preferences

**API Integration**:
- `POST /api/search` - Perform search
- `POST /api/search/history` - Record search history

---

### SearchResults

Component for displaying search results with pagination and location information.

**Location**: `components/search-results.tsx`

**Props**:
```typescript
interface SearchResultsProps {
  results: Business[];
  loading: boolean;
  error: string | null;
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  locationInfo?: LocationInfo;
  userId?: string;
  userLocation?: {
    address?: string;
    latitude?: number;
    longitude?: number;
    locationLastUpdated?: number | null;
  } | null;
  onBusinessClick?: (business: Business) => void;
  className?: string;
}
```

**Features**:
- **Result Grid**: Responsive grid layout for business cards
- **Pagination**: Page navigation with page numbers
- **Loading Skeletons**: Skeleton loaders while loading
- **Empty States**: Messages for no results or errors
- **Location Indicator**: Shows location used for search
- **Business Cards**: Renders `BusinessCard` components for each result

**Usage**:
```tsx
import { SearchResults } from "@/components/search-results";

<SearchResults
  results={searchResults}
  loading={isLoading}
  error={error}
  pagination={pagination}
  onPageChange={handlePageChange}
  locationInfo={locationInfo}
  userId={user?.userId}
  userLocation={userLocation}
  onBusinessClick={handleBusinessClick}
/>
```

---

## User Interface Components

### UserProfileDropdown

Dropdown menu for user profile actions (profile, logout).

**Location**: `components/user-profile-dropdown.tsx`

**Props**:
```typescript
interface UserProfileDropdownProps {
  user: User;
}
```

**Features**:
- **User Avatar**: Displays user avatar with fallback
- **User Info**: Shows username and full name
- **Profile Link**: Navigate to profile page
- **Logout**: Handles logout with session cleanup
- **Click Outside**: Closes dropdown when clicking outside
- **Keyboard Navigation**: Accessible keyboard interactions

**Usage**:
```tsx
import { UserProfileDropdown } from "@/components/user-profile-dropdown";

<UserProfileDropdown user={currentUser} />
```

**Implementation Details**:
- Uses `useRouter` for navigation
- Clears localStorage on logout
- Calls logout API endpoint
- Handles click outside events

---

### LocationSetupModal

Modal for setting up user location (current location or manual address).

**Location**: `components/location-setup-modal.tsx`

**Features**:
- **Current Location**: Uses browser geolocation API
- **Manual Address**: Text input for address entry
- **Geocoding**: Converts addresses to coordinates and vice versa
- **Validation**: Validates location data before saving
- **Error Handling**: Shows errors for geocoding failures

**API Integration**:
- `PUT /api/profile` - Updates user location

---

### LocationUpdateButton

Button component for updating user location.

**Location**: `components/location-update-button.tsx`

**Features**:
- **Quick Update**: One-click location update
- **Location Display**: Shows current location or "Set location"
- **Modal Trigger**: Opens location setup modal

---

### LocationIndicator

Component displaying the location being used for search.

**Location**: `components/location-indicator.tsx`

**Features**:
- **Location Source**: Shows if location is from profile, geolocation, or IP
- **Stale Warning**: Indicates if location may be outdated
- **Visual Indicator**: Icon and text display

---

## Layout Components

### AppHeader

Main application header with logo, navigation, and user menu.

**Location**: `components/app-header.tsx`

**Features**:
- **Logo**: Hypercaller logo with link to home
- **Navigation**: Links to different pages
- **User Menu**: User profile dropdown when authenticated
- **Auth Buttons**: Login/Register buttons when not authenticated
- **Theme Toggle**: Dark/light mode toggle

---

### AppFooter

Application footer with links and information.

**Location**: `components/app-footer.tsx`

**Features**:
- **Links**: Navigation links
- **Copyright**: Copyright information
- **Social Links**: Social media links (if applicable)

---

## UI Components

### ConfettiCelebration

Celebration animation component using confetti.

**Location**: `components/confetti-celebration.tsx`

**Features**:
- **Confetti Animation**: Animated confetti effect
- **Auto-hide**: Automatically hides after animation
- **Customizable**: Configurable colors and duration

**Usage**:
```tsx
import { ConfettiCelebration } from "@/components/confetti-celebration";

{showCelebration && <ConfettiCelebration />}
```

---

### ThemeToggle

Button for toggling between dark and light themes.

**Location**: `components/theme-toggle.tsx`

**Features**:
- **Theme Switching**: Toggles between dark and light modes
- **Icon Display**: Shows sun/moon icon based on current theme
- **Persistence**: Saves theme preference

---

### ThemeProvider

Provider component for theme management using next-themes.

**Location**: `components/theme-provider.tsx`

**Features**:
- **Theme Context**: Provides theme context to children
- **System Preference**: Respects system theme preference
- **Storage**: Persists theme in localStorage

---

### ToastProvider

Provider for toast notifications.

**Location**: `components/toast-provider.tsx`

**Features**:
- **Toast Context**: Provides toast context
- **Multiple Toasts**: Supports multiple simultaneous toasts
- **Auto-dismiss**: Automatically dismisses after timeout

---

## UI Primitives (shadcn/ui)

These components are from the shadcn/ui library and are located in `components/ui/`:

### Button

Button component with multiple variants and sizes.

**Variants**: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
**Sizes**: `default`, `sm`, `lg`, `icon`

### Card

Card container component with header, title, description, and content sections.

**Sub-components**: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

### Input

Text input component with various types and validation states.

### Avatar

Avatar component for displaying user images with fallback.

### Dialog

Modal dialog component for overlays and modals.

### Progress

Progress bar component for loading states.

### Toast

Toast notification component (used with ToastProvider).

### OTP Input

One-time password input component for OTP verification.

---

## Hooks

### useUserSession

Custom hook for managing user session state.

**Location**: `hooks/use-user-session.ts`

**Returns**:
```typescript
{
  user: User | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

**Usage**:
```tsx
import { useUserSession } from "@/hooks/use-user-session";

const { user, loading, error, refetch } = useUserSession();
```

**Features**:
- Fetches user session on mount
- Validates session with API
- Provides loading and error states
- Allows manual refetch

---

### useToast

Custom hook for displaying toast notifications.

**Location**: `hooks/use-toast.ts`

**Returns**:
```typescript
{
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}
```

**Usage**:
```tsx
import { useToast } from "@/hooks/use-toast";

const { success, error } = useToast();

success("Operation completed!");
error("Something went wrong");
```

---

## Component Patterns

### Optimistic Updates

Several components use optimistic updates for better UX:
- **BusinessCard**: Updates save state immediately before API call completes
- **SearchBar**: Shows loading state immediately

### Error Handling

Components follow consistent error handling patterns:
- Display user-friendly error messages
- Show retry options when applicable
- Log errors to console for debugging
- Use toast notifications for user feedback

### Loading States

Components provide visual feedback during async operations:
- Skeleton loaders for lists
- Spinner icons for buttons
- Disabled states during operations

### Responsive Design

All components are mobile-first and responsive:
- Use Tailwind CSS responsive utilities
- Adapt layout for different screen sizes
- Touch-friendly interactive elements

---

## Styling

Components use:
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Component library built on Radix UI
- **CSS Variables**: For theme customization
- **Dark Mode**: Full dark mode support

## Accessibility

Components follow accessibility best practices:
- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Focus management
- Screen reader support

---

## Best Practices

1. **Props Validation**: Use TypeScript interfaces for prop validation
2. **Error Boundaries**: Wrap components in error boundaries where appropriate
3. **Performance**: Use React.memo for expensive components
4. **Code Splitting**: Lazy load heavy components
5. **State Management**: Use local state for component-specific data
6. **API Calls**: Handle loading, error, and success states
7. **User Feedback**: Provide clear feedback for user actions

