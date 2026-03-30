

# Landing Page for ThoughtSpark

## Overview
Create a dedicated marketing landing page at `/landing` that can be published as the public-facing website for ThoughtSpark. The main app remains at `/` for authenticated users.

## Structure

### New Files
1. **`src/pages/LandingPage.tsx`** — Full landing page with these sections:
   - **Hero**: Large headline ("Capture Ideas Instantly"), subtitle, coral gradient CTA button ("Download on the App Store"), decorative gradient blobs
   - **Features**: 3-column grid showcasing Voice Recording, AI Summaries, Smart Organization with icons
   - **How It Works**: 3-step visual flow (Record → AI Processes → Organized Library)
   - **More Features**: Secondary features grid (Search, Multi-language, Sync, Privacy)
   - **Social Proof / Use Cases**: "Perfect for" section with audience cards
   - **CTA Footer**: Final call-to-action with App Store badge
   - **Footer**: Links to Privacy Policy, Terms of Service

### Modified Files
2. **`src/App.tsx`** — Add `/landing` route pointing to `LandingPage`

## Design Details
- Uses existing design system: coral gradients, glassmorphism cards, Inter + Source Serif 4 fonts
- Scroll-triggered fade-in animations using existing `animate-fade-in` / `animate-slide-up` classes
- Fully responsive (mobile-first)
- No tab navigation or app header — clean standalone page
- Gradient blobs as background decoration (matching existing pattern)
- Glass-effect feature cards

## Technical Notes
- Pure static page, no backend calls needed
- App Store download link will be a placeholder URL (easy to update later)
- Reuses existing Button, Card components and Tailwind config
- Can be published at the `/landing` route or swapped to be the root `/` if desired

