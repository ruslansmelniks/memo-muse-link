# Mindflow App Architecture

> **For Superapp iOS Recreation** - Complete technical specification for rebuilding this PWA as a native iOS app.

---

## 1. App Overview

| Property | Value |
|----------|-------|
| **App Name** | Mindflow |
| **Purpose** | Voice memo recording with AI transcription and summarization |
| **Platform** | Mobile-first PWA (React), targeting iOS recreation |
| **Current Mode** | Core Features Only (social features disabled via feature flags) |

---

## 2. Backend Connection (Supabase)

### Connection Details

```
SUPABASE_URL: https://zlwzuoigrrxwfqsgwuaz.supabase.co
SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpsd3p1b2lncnJ4d2Zxc2d3dWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNDEwODYsImV4cCI6MjA4MzgxNzA4Nn0.3WLATDWbI8d6gQMlK28jYG1somvkvxb7xxATjWnGXQE
```

### Authentication Methods

- **Email/Password** - Standard signup and login
- **Google OAuth** - Social login option
- **Auto-confirm** - Email confirmation is auto-enabled

### Supabase Client Usage

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage, // Use iOS Keychain equivalent
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

---

## 3. Database Schema

### `memos` Table (Primary Data)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | Yes | - | Owner reference |
| `title` | text | No | - | AI-generated title |
| `transcript` | text | No | - | Full transcription text |
| `summary` | text | Yes | - | AI-generated summary |
| `audio_url` | text | Yes | - | Path to audio file in storage |
| `duration` | integer | No | `0` | Recording duration in seconds |
| `categories` | text[] | Yes | `'{}'` | AI-detected categories |
| `tasks` | text[] | Yes | `'{}'` | Extracted action items |
| `folder_id` | uuid | Yes | - | Optional folder reference |
| `language` | text | Yes | - | Detected language code |
| `visibility` | text | No | `'private'` | Visibility setting |
| `transcription_status` | text | Yes | `'completed'` | Processing status |
| `author_name` | text | No | `'Anonymous'` | Display name |
| `likes` | integer | No | `0` | Like count (social feature) |
| `view_count` | integer | No | `0` | View count |
| `is_public` | boolean | No | `false` | Public visibility flag |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update timestamp |

**Categories enum values:** `Ideas`, `Nuggets`, `Reflections`, `Tasks`, `Questions`

**Transcription status values:** `pending`, `processing`, `completed`, `failed`

### `folders` Table

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | No | - | Owner reference |
| `name` | text | No | - | Folder name |
| `description` | text | Yes | - | Optional description |
| `icon` | text | Yes | `'folder'` | Icon name |
| `color` | text | Yes | `'primary'` | Color theme |
| `is_public` | boolean | No | `false` | Public visibility |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update timestamp |

### `profiles` Table

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | No | - | Auth user reference (unique) |
| `display_name` | text | Yes | - | User's display name |
| `username` | text | Yes | - | Unique username |
| `avatar_url` | text | Yes | - | Profile picture URL |
| `bio` | text | Yes | - | User biography |
| `preferred_language` | text | No | `'auto'` | Default recording language |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update timestamp |

### `bookmarks` Table

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | No | - | User who bookmarked |
| `memo_id` | uuid | No | - | Bookmarked memo reference |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

---

## 4. Storage Buckets

| Bucket Name | Public | Purpose | File Format |
|-------------|--------|---------|-------------|
| `audio-memos` | Yes | Voice memo audio files | WebM (audio/webm) |
| `avatars` | Yes | User profile pictures | PNG, JPG |

### Audio Upload Path Pattern
```
{user_id}/{timestamp}-{random_id}.webm
```

### Avatar Upload Path Pattern
```
{user_id}/avatar.{extension}
```

---

## 5. Edge Functions (Serverless Backend)

### `background-transcribe`

**Purpose:** Orchestrates the complete transcription and AI processing pipeline.

**Endpoint:** `POST https://zlwzuoigrrxwfqsgwuaz.supabase.co/functions/v1/background-transcribe`

**Request Payload:**
```json
{
  "memo_id": "uuid",
  "audio_url": "https://...",
  "language": "en" // optional, defaults to auto-detect
}
```

**Flow:**
1. Update memo status to `"processing"`
2. Download audio from storage URL
3. Send to ElevenLabs for transcription
4. Send transcript to `process-memo` for AI analysis
5. Update memo with all generated content
6. Set status to `"completed"` or `"failed"`

---

### `elevenlabs-transcribe`

**Purpose:** Direct speech-to-text transcription via ElevenLabs API.

**Endpoint:** `POST https://zlwzuoigrrxwfqsgwuaz.supabase.co/functions/v1/elevenlabs-transcribe`

**Request:** `multipart/form-data` with audio file

**Supported Languages:**
- `en` - English
- `ru` - Russian
- `uk` - Ukrainian
- `es` - Spanish
- `fr` - French
- `de` - German
- `lv` - Latvian
- `auto` - Auto-detect

**Response:**
```json
{
  "text": "Transcribed text...",
  "words": [...],
  "language": "en"
}
```

---

### `process-memo`

**Purpose:** AI processing for title generation, summarization, and categorization.

**Endpoint:** `POST https://zlwzuoigrrxwfqsgwuaz.supabase.co/functions/v1/process-memo`

**Request Payload:**
```json
{
  "transcript": "Full transcript text...",
  "language": "en"
}
```

**Response:**
```json
{
  "title": "Generated Title",
  "summary": "Concise summary of the memo...",
  "categories": ["Ideas", "Tasks"],
  "tasks": ["Action item 1", "Action item 2"],
  "language": "en"
}
```

**Category Options:** `Ideas`, `Nuggets`, `Reflections`, `Tasks`, `Questions`

---

### `summarize-folder`

**Purpose:** Generate AI summary of all memos within a folder.

**Endpoint:** `POST https://zlwzuoigrrxwfqsgwuaz.supabase.co/functions/v1/summarize-folder`

**Request Payload:**
```json
{
  "folderName": "My Folder",
  "memos": [
    { "title": "...", "summary": "...", "categories": [...] }
  ]
}
```

---

### `send-push-notification`

**Purpose:** Web push notifications (not used in Core Features mode).

**Endpoint:** `POST https://zlwzuoigrrxwfqsgwuaz.supabase.co/functions/v1/send-push-notification`

---

## 6. Core User Flow

```
┌─────────────────┐
│  User Records   │
│     Audio       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Save to Storage │
│ (audio-memos)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create Memo Row │
│ status: pending │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              background-transcribe                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 1. Download audio from storage                  │   │
│  │ 2. Send to ElevenLabs for transcription         │   │
│  │ 3. Call process-memo for AI analysis            │   │
│  │ 4. Update memo with title, summary, categories  │   │
│  │ 5. Set status to 'completed'                    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Display Memo   │
│   in Library    │
└─────────────────┘
```

---

## 7. Screen Structure (Core Features Mode)

### Tab Navigation (3 Tabs)

| Tab | Icon | View Component |
|-----|------|----------------|
| Record | `Mic` | `RecordView.tsx` |
| My Library | `Library` | `LibraryView.tsx` |
| Settings | `Settings` | `SettingsView.tsx` |

### Record Screen

```
┌─────────────────────────────────┐
│         [Language ▼]            │  ← Language selector dropdown
├─────────────────────────────────┤
│                                 │
│    ┌───────────────────────┐    │
│    │  ║ ║ ║ ║ ║ ║ ║ ║ ║ ║  │    │  ← Audio waveform (12 bars)
│    │                       │    │
│    │       00:00           │    │  ← Timer (serif font)
│    │                       │    │
│    │         ⏺            │    │  ← Record button (coral)
│    │                       │    │
│    │    [Pause] [Stop]     │    │  ← Controls (when recording)
│    └───────────────────────┘    │
│                                 │
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │Topic│ │Topic│ │Topic│       │  ← Topic suggestions
│  └─────┘ └─────┘ └─────┘       │
└─────────────────────────────────┘
```

### Library Screen

```
┌─────────────────────────────────┐
│  My Library                     │
│  ┌─────┐ ┌─────┐ ┌─────┐       │
│  │12   │ │45min│ │ 3   │       │  ← Stats (memos, duration, folders)
│  │memos│ │total│ │fldrs│       │
│  └─────┘ └─────┘ └─────┘       │
├─────────────────────────────────┤
│  [All Memos] [Saved]            │  ← Tab toggle
├─────────────────────────────────┤
│  ┌─────────────────────────┐    │
│  │ 📁 Folder Sidebar       │    │  ← Collapsible sidebar
│  │   > Work Ideas          │    │
│  │   > Personal            │    │
│  └─────────────────────────┘    │
├─────────────────────────────────┤
│  ┌─────────────────────────┐    │
│  │ 👤 Memo Title           │    │  ← Memo card
│  │ Summary text here...    │    │
│  │ [Ideas] [Tasks]         │    │  ← Category tags
│  │ ▶ ━━━━━━━━━━━ 2:34      │    │  ← Audio player
│  │ ☐ Task item 1           │    │  ← Checkable tasks
│  │ ☐ Task item 2           │    │
│  │ 📅 Jan 15, 2025         │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ Another memo card...    │    │
│  └─────────────────────────┘    │
└─────────────────────────────────┘
```

### Settings Screen

```
┌─────────────────────────────────┐
│  Settings                       │
├─────────────────────────────────┤
│  ┌─────────────────────────┐    │
│  │ 👤 Display Name         │    │  ← Profile card
│  │    user@email.com       │    │
│  │              [Edit]     │    │
│  └─────────────────────────┘    │
├─────────────────────────────────┤
│  Recording Language             │
│  [Auto-detect           ▼]      │  ← Language selector
├─────────────────────────────────┤
│  Account                        │
│  > Edit Profile                 │
│  > Manage Subscription          │
├─────────────────────────────────┤
│  Recording                      │
│  > Audio Quality                │
│  > Auto-save                    │
├─────────────────────────────────┤
│  Support                        │
│  > Help Center                  │
│  > Privacy Policy               │
│  > Terms of Service             │
├─────────────────────────────────┤
│  [Sign Out]                     │  ← Red button
└─────────────────────────────────┘
```

---

## 8. Color Theme / Design System

### CSS Variables (Light Mode - Primary)

```css
:root {
  /* Core colors */
  --background: 30 25% 98%;        /* Off-white: hsl(30, 25%, 98%) = #FDFBF9 */
  --foreground: 30 15% 15%;        /* Deep warm gray */
  
  /* Primary - Coral */
  --primary: 16 85% 55%;           /* hsl(16, 85%, 55%) */
  --primary-foreground: 0 0% 100%; /* White text on coral */
  
  /* Secondary - Lavender */
  --secondary: 260 50% 70%;        /* hsl(260, 50%, 70%) */
  --secondary-foreground: 260 50% 20%;
  
  /* Accent - Mint */
  --accent: 165 50% 70%;           /* hsl(165, 50%, 70%) */
  --accent-foreground: 165 50% 15%;
  
  /* Muted */
  --muted: 30 10% 94%;
  --muted-foreground: 30 10% 40%;
  
  /* Card */
  --card: 0 0% 100%;               /* Pure white cards */
  --card-foreground: 30 15% 15%;
  
  /* Border & Input */
  --border: 30 15% 90%;
  --input: 30 15% 90%;
  --ring: 16 85% 55%;              /* Coral focus ring */
  
  /* Radius */
  --radius: 1rem;                  /* 16px default */
}
```

### Extended Color Palette

```css
/* Coral shades */
--coral-50: 16 85% 97%;
--coral-100: 16 85% 94%;
--coral-200: 16 85% 87%;
--coral-300: 16 85% 75%;
--coral-400: 16 85% 65%;
--coral-500: 16 85% 55%;   /* Primary */
--coral-600: 16 85% 45%;
--coral-700: 16 85% 35%;

/* Lavender shades */
--lavender-100: 260 50% 95%;
--lavender-200: 260 50% 90%;
--lavender-300: 260 50% 80%;
--lavender-400: 260 50% 70%;  /* Secondary */
--lavender-500: 260 50% 60%;

/* Mint shades */
--mint-100: 165 50% 95%;
--mint-200: 165 50% 90%;
--mint-300: 165 50% 80%;
--mint-400: 165 50% 70%;   /* Accent */
--mint-500: 165 50% 60%;

/* Warm neutrals */
--warm-50: 30 20% 98%;
--warm-100: 30 15% 95%;
--warm-200: 30 10% 90%;
--warm-300: 30 8% 80%;
--warm-400: 30 6% 60%;
--warm-500: 30 5% 40%;
```

### Typography

```css
/* Font families */
--font-sans: 'Inter', system-ui, sans-serif;
--font-display: 'Source Serif 4', Georgia, serif;

/* Font sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px - Timer display */
```

### Shadows & Effects

```css
/* Shadows */
--shadow-soft: 0 2px 8px rgba(0, 0, 0, 0.04);
--shadow-medium: 0 4px 16px rgba(0, 0, 0, 0.08);
--shadow-large: 0 8px 32px rgba(0, 0, 0, 0.12);

/* Glass morphism */
--glass-blur: blur(20px);
--glass-bg: rgba(255, 255, 255, 0.8);

/* Glow effect (for record button) */
--glow-coral: 0 0 30px hsla(16, 85%, 55%, 0.4);
```

### Border Radius Scale

```css
--radius-sm: 0.5rem;   /* 8px - Small buttons, inputs */
--radius-md: 0.75rem;  /* 12px - Tags, chips */
--radius-lg: 1rem;     /* 16px - Cards (default) */
--radius-xl: 1.5rem;   /* 24px - Large cards */
--radius-2xl: 2rem;    /* 32px - Buttons, modals */
--radius-full: 9999px; /* Fully rounded - Avatar, record button */
```

---

## 9. Key UI Patterns

### Cards
- White background (`--card`)
- 1rem border radius
- Soft shadow
- 1px border on hover

### Buttons
- **Primary:** Coral background, white text, 2rem radius
- **Secondary:** Lavender background, dark text
- **Ghost:** Transparent, subtle hover background
- **Record button:** 80px circular, coral, pulsing glow animation when recording

### Tags/Chips
- 0.75rem border radius
- Colored backgrounds based on category:
  - Ideas: Coral
  - Nuggets: Gold/Amber
  - Reflections: Lavender
  - Tasks: Mint
  - Questions: Sky blue

### Bottom Sheets
- Slide up from bottom
- Blurred backdrop
- Rounded top corners (1.5rem)
- Drag handle indicator

### Skeleton Loading
- Gray pulsing rectangles
- Matches final content dimensions
- 1.5s animation duration

### Animations (Framer Motion)
```typescript
// Fade in
{ opacity: [0, 1], transition: { duration: 0.5 } }

// Scale in
{ scale: [0.95, 1], opacity: [0, 1], transition: { duration: 0.3 } }

// Slide up
{ y: [20, 0], opacity: [0, 1], transition: { duration: 0.6 } }

// Stagger children
{ staggerChildren: 0.1 }
```

---

## 10. Key Source Files Reference

| Purpose | File Path |
|---------|-----------|
| **App Entry** | `src/pages/Index.tsx` |
| **Main CSS Variables** | `src/index.css` |
| **Tailwind Config** | `tailwind.config.ts` |
| **Tab Navigation** | `src/components/TabNavigation.tsx` |
| **Header** | `src/components/Header.tsx` |
| **Voice Recorder** | `src/components/VoiceRecorder.tsx` |
| **Recording Modal** | `src/components/RecordingModal.tsx` |
| **Memo Card** | `src/components/MemoCard.tsx` |
| **Mini Audio Player** | `src/components/MiniAudioPlayer.tsx` |
| **Library View** | `src/components/views/LibraryView.tsx` |
| **Record View** | `src/components/views/RecordView.tsx` |
| **Settings View** | `src/components/views/SettingsView.tsx` |
| **Auth Context** | `src/contexts/AuthContext.tsx` |
| **Audio Player Context** | `src/contexts/AudioPlayerContext.tsx` |
| **Supabase Client** | `src/integrations/supabase/client.ts` |
| **Feature Flags** | `src/lib/featureFlags.ts` |
| **Profile Hook** | `src/hooks/useProfile.ts` |

---

## 11. Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | - | Type safety |
| Vite | - | Build tool |
| Tailwind CSS | - | Utility-first styling |
| Framer Motion | 12.x | Animations |
| Radix UI | - | Accessible UI primitives |
| shadcn/ui | - | Component library |
| Supabase JS | 2.90.1 | Backend client |
| Capacitor | 8.x | Native iOS/Android wrapper |
| Sonner | 1.7.4 | Toast notifications |
| Vaul | 0.9.9 | Drawer/bottom sheet |
| React Query | 5.x | Server state management |
| React Router | 7.x | Navigation |
| Lucide React | - | Icon library |

---

## 12. Feature Flags

The app uses feature flags to toggle between "Core Features Only" and "Social Features" modes.

**File:** `src/lib/featureFlags.ts`

```typescript
export const FEATURES = {
  SOCIAL_FEATURES_ENABLED: false,  // Set to false for App Store submission
};
```

**When `SOCIAL_FEATURES_ENABLED: false`:**
- Only 3 tabs visible: Record, Library, Settings
- No Discover/Inbox tabs
- No sharing, following, or public memos
- All memos default to private visibility

---

## 13. iOS-Specific Considerations

### Capacitor Configuration

**File:** `capacitor.config.ts`

```typescript
{
  appId: 'com.mindflow.app',
  appName: 'Mindflow',
  webDir: 'dist',
  plugins: {
    SplashScreen: { ... },
    StatusBar: { style: 'dark' },
    Haptics: { ... }
  }
}
```

### Required iOS Permissions
- `NSMicrophoneUsageDescription` - For voice recording
- `NSPhotoLibraryUsageDescription` - For avatar uploads (optional)

### Safe Areas
- Bottom navigation respects iOS safe area
- Status bar area has proper padding

### Haptic Feedback
Used for:
- Recording start/stop
- Button taps
- Pull-to-refresh

---

## 14. API Keys Required

| Secret Name | Purpose | Required |
|-------------|---------|----------|
| `ELEVENLABS_API_KEY` | Speech-to-text transcription | Yes |
| `LOVABLE_API_KEY` | AI processing (auto-configured) | Auto |
| `VAPID_PRIVATE_KEY` | Push notifications | No (Core mode) |

---

## 15. Quick Start for iOS Recreation

1. **Set up Supabase connection** using the URL and anon key above
2. **Implement authentication** (email/password + Google OAuth)
3. **Create the 3 main screens:** Record, Library, Settings
4. **Implement voice recording** with waveform visualization
5. **Connect to edge functions** for transcription flow
6. **Apply the color theme** using the CSS variables
7. **Add Framer Motion animations** for polish

---

*Last updated: January 2025*
