/**
 * Feature Flags for MemoMuse
 * 
 * CORE_FEATURES_ONLY: When true, hides social features for focused testing
 * - Hides Discover and Inbox tabs
 * - Defaults memo visibility to 'private'
 * - Hides visibility selector in RecordingModal
 * 
 * To re-enable social features, set CORE_FEATURES_ONLY to false
 * and refer to SOCIAL_FEATURES.md for implementation details.
 */
export const FEATURE_FLAGS = {
  CORE_FEATURES_ONLY: true,
};
