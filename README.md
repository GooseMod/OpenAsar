# OpenAsar
**Open-source alternative of Discord desktop's `app.asar`**

## Goals
- **Hotpluggable** - just swap the asar file, nothing else needed
- **Lightweight** - it should be at least as fast or lightweight, hopefully more
- **No Tracking** - no crash reporting, error tracking, etc
- **Minimal** - generally only doing what is needed (see: implementation)

## Implementation
Below is a list in order of priority, marked as complete when finished:
- [X] Bootstrapping
- [X] Splash screen
- [X] Error handling
- [ ] A bunch of specific minor fixes / features
  - [ ] Handle hardware acceleration
- [ ] Auto start
- [ ] First run
- [ ] Self-write updater code (currently mostly copied)
- [ ] Self-write some small parts of internals