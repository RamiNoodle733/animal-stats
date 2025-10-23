# 3D Models Directory

## How to Add Real 3D Models for Animals

This folder is where you can place 3D model files (.glb or .gltf format) for each animal.

### Quick Start Guide

1. **Find Free 3D Models:**
   - [Sketchfab](https://sketchfab.com/search?features=downloadable&licenses=7c23a1ba438d4306920229c12afcb5f9&sort_by=-likeCount&type=models) (CC0 - Free to use)
   - [Poly Pizza](https://poly.pizza/) (Google Poly archive)
   - [Free3D](https://free3d.com/3d-models/animals)
   - [CGTrader Free](https://www.cgtrader.com/free-3d-models/animals)
   - [TurboSquid Free](https://www.turbosquid.com/Search/3D-Models/free/animal)

2. **Download GLB or GLTF Files:**
   - GLB format is preferred (single file, faster loading)
   - GLTF also works (may have separate texture files)
   - Keep file sizes reasonable (under 5MB per model)

3. **Name Your Files:**
   ```
   models/
   ├── elephant.glb
   ├── crocodile.glb
   ├── shark.glb
   ├── bear.glb
   ├── tiger.glb
   └── ...
   ```

4. **Update animal-models-database.js:**
   ```javascript
   "African Elephant": {
       "model_url": "./models/elephant.glb",
       "model_type": "gltf",
       "scale": 2.0
   }
   ```

### Recommended Model Properties

- **Polygon Count:** 5,000 - 50,000 triangles (good balance)
- **Textures:** 1024x1024 or 2048x2048
- **Format:** GLB (preferred) or GLTF
- **Animations:** Optional but cool if available!
- **License:** CC0, CC-BY, or other free license

### File Naming Convention

Use lowercase with hyphens for multi-word names:
- `african-elephant.glb`
- `saltwater-crocodile.glb`
- `great-white-shark.glb`
- `grizzly-bear.glb`

### Bulk Download Script (Optional)

If you want to batch download models, I can create a script to:
1. Search Sketchfab API for each animal
2. Download CC0 licensed models
3. Automatically update the database

### Current Status

✅ **Enhanced Procedural Models Active**
- All 98 animals have beautiful, detailed procedural 3D models
- Different geometries for different animal types
- Auto-rotating with orbit controls
- Dynamic lighting effects

🔄 **Ready for Real Models**
- Drop .glb files in this folder
- Update database with model paths
- System automatically uses real models when available
- Falls back to procedural models if URL fails

### Testing Your Models

1. Place model file in `models/` folder
2. Update `animal-models-database.js`
3. Open `index.html` in browser
4. Click on the animal to see the 3D model
5. Check browser console for any loading errors

### Model Optimization Tips

If models load slowly or look weird:
- **Too Big?** Use [glTF-Transform](https://gltf-transform.donmccurdy.com/) to compress
- **Wrong Size?** Adjust the `scale` parameter in database
- **Wrong Orientation?** Add `rotation: [x, y, z]` in database
- **Offset Position?** Add `position: [x, y, z]` in database

### Need Help?

Check the browser console (F12) for error messages. Common issues:
- CORS errors: Model must be served from same domain or allow cross-origin
- 404 errors: Check file path spelling
- Loading errors: Model may be corrupted or wrong format

---

## AI-Generated Models (Advanced)

Want custom AI-generated 3D models?

1. **Meshy.ai** - Text to 3D in minutes
   - Sign up at https://www.meshy.ai/
   - Type: "realistic [animal name]"
   - Download GLB file

2. **Luma AI** - Image to 3D
   - Upload animal photo
   - Get 3D model
   - Export as GLB

3. **Spline AI** - 3D design with AI assistance
   - Create and export models
   - Direct GLB export

---

**Next:** Once you add models, commit and push to GitHub to update the live site!
