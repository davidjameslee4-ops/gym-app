# Avner's Gym Tracker - Product Requirements Document

## App Overview
A comprehensive offline-first gym workout tracking app focused on simplicity, reliability, and long-term progress tracking. All data is stored permanently on the user's device.

## Tech Stack
- **Frontend**: React Native with Expo (SDK 54)
- **Navigation**: Expo Router with bottom tabs
- **Storage**: AsyncStorage (via @/src/utils/storage)
- **Charts**: Custom chart components + victory-native
- **Calendar**: react-native-calendars
- **Image Picker**: expo-image-picker (base64 storage)

## Features Implemented

### 1. Home Screen
- Today's workout auto-displayed based on day of week
- Workout focus indicator
- Weight stats (Current/Goal/Remaining)
- Current streak with motivational messages
- "Mark as Complete" button for workout logging

### 2. Schedule Screen
- 7-day default workout program pre-loaded
- Expandable workout day cards
- Full CRUD for exercises (Add/Edit/Delete)
- Multiple program support:
  - Create new programs
  - Switch between programs
  - Duplicate programs
  - Delete programs (long-press)
- Edit sets, reps, weight, notes for each exercise

### 3. Timer Screen
- **Stopwatch**: Start, Pause, Resume, Reset
- **Countdown Timer**: Custom duration with quick presets (30s, 1m, 1.5m, 2m, 3m, 5m)
- Alert notification when countdown completes
- Persistent timer settings

### 4. History Screen
- Workout calendar with marked completed days
- Stats: Day Streak, This Month, Total
- Recent workouts list with detail view
- Tap calendar dates to view workout details

### 5. Progress Screen
- Current/Longest Streak tracking
- Weight Progress chart (simple custom chart)
- Weekly/Monthly Completion percentages
- Total Workouts and Sets counter
- **Nutrition Calculator**:
  - Inputs: Age, Height, Weight, Gender, Activity Level, Goal
  - Outputs: Daily Calories, Protein, Carbs, Fat
  - BMR and TDEE calculation

### 6. Profile Screen
- Profile picture (camera/gallery upload, base64 storage)
- Personal info: Name, Age, Height
- Current/Goal Weight with auto-calculation of remaining
- Weight unit selector (kg/lbs)
- Edit mode with save/cancel

### 7. Settings Screen
- Dark/Light mode toggle
- Weight unit selector
- Export Data
- Import Data
- Backup Data (to local storage)
- Restore Data (from backup)
- Clear All Data (danger zone)

## Data Storage
**All data is stored locally using AsyncStorage:**
- `userProfile` - User profile information
- `workoutPrograms` - Array of workout programs
- `workoutLogs` - History of completed workouts
- `weightEntries` - Weight tracking history
- `theme` - Dark/Light theme preference
- `timerDuration` - Last used timer duration
- `backup_latest` - Latest backup snapshot

## Theme
- **Dark Mode** (default): Black (#000000) background, white text, Crimson red (#DC143C) accents
- **Light Mode**: White background, black text, same red accents

## Offline-First Architecture
- No backend required
- No login/authentication needed
- All data persists across app restarts
- Works completely offline
- Default program auto-initialized on first launch
