# Social Features Documentation

This document preserves all details about the social features in MemoMuse, enabling easy re-implementation after focused core feature testing.

**To re-enable social features:** Set `CORE_FEATURES_ONLY = false` in `src/lib/featureFlags.ts`

---

## 1. Feature Overview

| Feature | Description |
|---------|-------------|
| **Discover Feed** | Browse public memos from other users with 5 feed types |
| **Inbox** | View memos shared directly with you, manage contacts |
| **Followers/Following** | Social connections between users |
| **Groups** | Private groups for sharing memos with multiple people |
| **Likes** | Heart/like memos in the discover feed |
| **Bookmarks** | Save public memos to your library |
| **Sharing & Visibility** | Control who can see your memos (private/shared/followers/void) |
| **Notifications** | Real-time alerts for follows and likes |

---

## 2. Tab Navigation Configuration

**File:** `src/components/TabNavigation.tsx`

### Full 5-Tab Structure
```typescript
const tabs = [
  { id: "record", icon: Mic, label: "Record" },
  { id: "discover", icon: Compass, label: "Discover" },
  { id: "inbox", icon: Inbox, label: "Inbox" },
  { id: "library", icon: FolderOpen, label: "My Library" },
  { id: "settings", icon: Settings, label: "Settings" },
];
```

### Features
- Inbox tab shows unread badge with count (via `inboxUnreadCount` prop)
- Active tab has animated background indicator (`layoutId="activeTab"`)
- Haptic feedback on tab change via `useHaptics`

---

## 3. Component Inventory

### Views
| File | Purpose |
|------|---------|
| `src/components/views/DiscoverView.tsx` | Main discover feed with 5 sub-feeds, filtering, search |
| `src/components/views/InboxView.tsx` | Two tabs: Messages (shared memos) and Contacts (followed users) |

### Social Components
| File | Purpose |
|------|---------|
| `DiscoverFeedCard.tsx` | Card displaying memo with like, bookmark, follow, share buttons |
| `DiscoverFilterSheet.tsx` | Bottom sheet for category and search filters |
| `DiscoverCardSkeleton.tsx` | Loading skeleton for discover cards |
| `ContactsList.tsx` | Display list of followed users with avatars |
| `AddContactSheet.tsx` | Search users by username/email and follow them |
| `InboxRecordingSheet.tsx` | Record and send a memo directly to a contact |
| `ShareButton.tsx` | Share memo via native share, WhatsApp, or email |
| `ShareVisibilityModal.tsx` | Change memo visibility after creation |
| `ShareRecipientPicker.tsx` | Select users/groups to share memo with |
| `VisibilitySelector.tsx` | Choose visibility level (private/shared/followers/void) |
| `GroupManager.tsx` | Create/edit groups, manage members |
| `NotificationBell.tsx` | Header bell icon with unread count and dropdown |

### Pages
| File | Purpose |
|------|---------|
| `src/pages/ProfilePage.tsx` | Public user profile with follow button, stats, public memos |

---

## 4. Hook Inventory

| Hook | File | Purpose |
|------|------|---------|
| `useFollow` | `src/hooks/useFollow.ts` | Follow/unfollow users, get follower/following counts |
| `useLikes` | `src/hooks/useLikes.ts` | Like/unlike memos, optimistic updates, uses `toggle_memo_like` RPC |
| `useBookmarks` | `src/hooks/useBookmarks.ts` | Save/unsave public memos to library |
| `useMemoSharing` | `src/hooks/useMemoSharing.ts` | Update visibility, manage share recipients |
| `useSharedWithMe` | `src/hooks/useSharedWithMe.ts` | Fetch memos shared with current user (direct + group) |
| `useGroups` | `src/hooks/useGroups.ts` | CRUD for groups, manage group members |
| `useDiscoverMemos` | `src/hooks/useDiscoverMemos.ts` | Fetch memos for discover feeds with personalization |
| `useVoidFeed` | `src/hooks/useVoidFeed.ts` | Fetch random anonymous "void" memos |
| `useInboxUnread` | `src/hooks/useInboxUnread.ts` | Track unread inbox count with realtime subscription |
| `useNotifications` | `src/hooks/useNotifications.ts` | Fetch/manage in-app notifications with realtime |
| `useUserPreferences` | `src/hooks/useUserPreferences.ts` | Category weights for "For You" personalization |

---

## 5. Database Schema

### Tables

#### `follows`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| follower_id | UUID | User who is following |
| following_id | UUID | User being followed |
| created_at | TIMESTAMP | When follow occurred |

#### `memo_likes`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User who liked |
| memo_id | UUID | Memo that was liked (FK to memos) |
| created_at | TIMESTAMP | When like occurred |

#### `bookmarks`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User who bookmarked |
| memo_id | UUID | Memo that was bookmarked (FK to memos) |
| created_at | TIMESTAMP | When bookmark occurred |

#### `memo_shares`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| memo_id | UUID | Memo being shared (FK to memos) |
| shared_by | UUID | User who shared |
| shared_with_user_id | UUID | Direct share recipient (nullable) |
| shared_with_group_id | UUID | Group share recipient (nullable, FK to groups) |
| created_at | TIMESTAMP | When share occurred |

#### `groups`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Group name |
| description | TEXT | Group description (nullable) |
| avatar_url | TEXT | Group avatar (nullable) |
| created_by | UUID | User who created group |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

#### `group_members`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| group_id | UUID | Group (FK to groups) |
| user_id | UUID | Member user ID |
| role | TEXT | 'admin' or 'member' |
| joined_at | TIMESTAMP | When user joined |

#### `notifications`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Notification recipient |
| type | TEXT | 'follow', 'like', 'share', etc. |
| actor_id | UUID | User who triggered notification |
| memo_id | UUID | Related memo (nullable, FK to memos) |
| read | BOOLEAN | Whether notification was read |
| created_at | TIMESTAMP | When notification occurred |

### Memo Social Fields
| Column | Type | Description |
|--------|------|-------------|
| visibility | TEXT | 'private', 'shared', 'followers', 'void' |
| is_public | BOOLEAN | Legacy field, synced with visibility |
| likes | INTEGER | Like counter (denormalized) |
| view_count | INTEGER | View counter |

---

## 6. Database Functions (RPC)

| Function | Parameters | Returns | Purpose |
|----------|------------|---------|---------|
| `toggle_memo_like` | p_memo_id, p_user_id | BOOLEAN | Atomic like/unlike with counter update |
| `increment_view_count` | memo_uuid | VOID | Increment memo view counter |
| `create_notification` | p_user_id, p_type, p_actor_id, p_memo_id | VOID | Create notification securely |
| `is_group_member` | _user_id, _group_id | BOOLEAN | Check if user is group member |
| `is_group_admin` | _user_id, _group_id | BOOLEAN | Check if user is group admin |
| `has_memo_access` | _user_id, _memo_id | BOOLEAN | Check if user can access shared memo |

---

## 7. RLS Policies Summary

### `follows`
- SELECT: Anyone can view follows
- INSERT: User can only create follows where they are the follower
- DELETE: User can only delete their own follows

### `memo_likes`
- SELECT: Anyone can view likes
- INSERT: User can only like as themselves
- DELETE: User can only unlike their own likes

### `bookmarks`
- SELECT: User can only view their own bookmarks
- INSERT/DELETE: User can only manage their own bookmarks

### `memo_shares`
- SELECT: User can view shares where they are sender or recipient
- INSERT: User can only share memos they own
- DELETE: Memo owner can delete shares

### `groups` / `group_members`
- SELECT: Members can view their groups
- INSERT/UPDATE/DELETE: Based on admin status

### `notifications`
- SELECT: User can only view their own notifications
- UPDATE: User can only mark their own as read

### `memos` (social visibility)
- SELECT includes:
  - Own memos (user_id = auth.uid())
  - Void memos (visibility = 'void')
  - Follower memos (visibility = 'followers' AND follower relationship exists)
  - Shared memos (via has_memo_access function)

---

## 8. RecordingModal Integration

**File:** `src/components/RecordingModal.tsx`

### Visibility Selector (lines ~230-260)
```tsx
{/* Visibility Selection */}
<VisibilitySelector
  value={visibility}
  onChange={setVisibility}
/>

{/* Share Recipients (when visibility is 'shared') */}
{visibility === 'shared' && (
  <ShareRecipientPicker
    selectedRecipients={shareRecipients}
    onRecipientsChange={setShareRecipients}
  />
)}

{/* Void Explainer */}
{visibility === 'void' && (
  <p className="text-xs text-muted-foreground">
    Your memo will be anonymous and visible to everyone in The Void.
  </p>
)}
```

### State Variables
```typescript
const [visibility, setVisibility] = useState<MemoVisibility>('private');
const [shareRecipients, setShareRecipients] = useState<ShareRecipient[]>([]);
```

### Validation
```typescript
if (visibility === 'shared' && shareRecipients.length === 0) {
  toast.error("Please select at least one recipient");
  return;
}
```

### onSave Callback
```typescript
onSave({
  title,
  visibility,
  folderId: selectedFolderId,
  recipients: visibility === 'shared' ? shareRecipients : undefined,
});
```

---

## 9. Discover Feed Types

**File:** `src/hooks/useDiscoverMemos.ts`

### Feed Tabs
| Tab | ID | Description |
|-----|-----|-------------|
| For You | `foryou` | Personalized feed with scoring algorithm |
| Trending | `trending` | Sorted by likes descending |
| Recent | `recent` | Chronological order |
| Following | `following` | Only from followed users |
| The Void | `void` | Random anonymous memos |

### "For You" Scoring Algorithm
```typescript
// Base scores
const categoryMatch = userCategories.has(category) ? 150 : 0;
const followingBonus = isFollowing(author) ? 100 : 0;
const likedCategoryMatch = likedCategories.has(category) ? 50 : 0;

// Engagement metrics
const engagementScore = (likes * 2) + viewCount;

// Recency bonus (decays over time)
const ageInHours = (now - createdAt) / 3600000;
const recencyBonus = Math.max(0, 100 - ageInHours);

const totalScore = categoryMatch + followingBonus + likedCategoryMatch + engagementScore + recencyBonus;
```

---

## 10. Re-implementation Checklist

When ready to re-enable social features:

### Step 1: Enable Feature Flag
```typescript
// src/lib/featureFlags.ts
export const FEATURE_FLAGS = {
  CORE_FEATURES_ONLY: false, // Changed from true
};
```

### Step 2: Verify Navigation
- All 5 tabs should appear: Record, Discover, Inbox, Library, Settings
- Inbox badge should show unread count

### Step 3: Verify RecordingModal
- VisibilitySelector should appear below folder selection
- ShareRecipientPicker should appear when visibility is 'shared'
- Void explainer should appear when visibility is 'void'

### Step 4: Test Core Flows
1. **Follow Flow**: Go to Discover → tap author avatar → tap Follow
2. **Like Flow**: Tap heart on any DiscoverFeedCard
3. **Bookmark Flow**: Tap bookmark icon on any DiscoverFeedCard
4. **Share Flow**: Record memo → set visibility to 'shared' → select recipients → save
5. **Notification Flow**: Have another user follow/like → check NotificationBell

### Step 5: Verify Realtime
- Notifications should appear without refresh
- Inbox unread count should update in real-time

---

## 11. Files Modified for Core Features Mode

These files were modified to support the feature flag:

| File | Changes |
|------|---------|
| `src/lib/featureFlags.ts` | Created with `CORE_FEATURES_ONLY` flag |
| `src/components/TabNavigation.tsx` | Filters tabs based on flag |
| `src/components/RecordingModal.tsx` | Hides visibility selector when flag is true |
| `src/pages/Index.tsx` | Removes inbox tracking when flag is true |

To fully restore, ensure these files import and respect `FEATURE_FLAGS.CORE_FEATURES_ONLY`.
