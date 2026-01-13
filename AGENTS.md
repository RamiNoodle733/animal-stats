# Agent Instructions for UI Changes

## UI Snapshot Workflow

When making any frontend/UI changes (CSS, HTML structure, JS that affects rendering), you **must** run the UI snapshot tool to verify your changes visually.

### Setup
The dev server must be running before taking snapshots:
```bash
npm run dev
```

### Taking Snapshots
```bash
# Capture all pages at mobile, tablet, and desktop sizes
npm run ui:snap

# Or with a specific port
npm run ui:snap:local   # localhost:3000
```

### What Gets Captured
- **Mobile**: 390×844 (iPhone 14 Pro size)
- **Tablet**: 768×1024 (iPad size)  
- **Desktop**: 1280×800 (laptop size)

Routes captured: `/`, `/stats`, `/compare`, `/rankings`, `/community`

### Output Location
Screenshots and logs are saved to: `ui-snapshots/<timestamp>/`

Each session includes:
- PNG screenshots for each viewport × route combination
- `console.log` - Browser console output
- `summary.json` - Session metadata

### Verification Checklist
After running snapshots, check:
1. ✅ No horizontal scroll on mobile
2. ✅ All content visible and readable
3. ✅ Touch targets are thumb-friendly (min 44px)
4. ✅ No overlapping elements
5. ✅ Navigation works at all sizes
6. ✅ No console errors related to layout

### Example Workflow
1. Make CSS/UI changes
2. Save files
3. Run `npm run ui:snap`
4. Open `ui-snapshots/<latest>/` folder
5. Review screenshots at all viewport sizes
6. Fix any issues found
7. Repeat until layout is correct
8. Commit changes

### Important Notes
- Always check mobile-home.png to ensure bottom nav is hidden on home page
- Check mobile-stats.png to verify stat bars and animal image display correctly
- Check mobile-rankings.png to verify list items aren't too cramped
- Tournament modal should be tested by navigating to `/rankings` and clicking "Play Now"
