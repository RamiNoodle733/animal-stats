# 🖼️ Image URL Auto-Updater

This script automatically updates animal image URLs in `animal_stats.json` using Wikimedia Commons images (which appear in top Google Image search results).

## ✨ Features

- **Automatic Updates**: Updates all animal images with one command
- **Selective Updates**: Update only specific animals
- **Reusable**: Easy to extend when you add new animals
- **Reliable Sources**: Uses Wikimedia Commons (top Google result for most animal searches)
- **Fast**: Updates all 98 animals in seconds

## 🚀 Usage

### Update All Animals
```bash
python auto_update_images.py
```

### Update Specific Animals
```bash
python auto_update_images.py "African Elephant" "Lion" "Tiger"
```

## ➕ Adding New Animals

When you add a new animal to your JSON:

1. **Search for the image**:
   - Go to Google Images
   - Search: `[animal name] wikimedia commons`
   - Click on the first good result
   - Copy the direct image URL (ends with `.jpg` or `.png`)

2. **Add to the script**:
   - Open `auto_update_images.py`
   - Find the `ANIMAL_IMAGES` dictionary
   - Add your new animal:
   ```python
   "Your Animal Name": "https://upload.wikimedia.org/wikipedia/commons/thumb/.../image.jpg",
   ```

3. **Run the updater**:
   ```bash
   python auto_update_images.py "Your Animal Name"
   ```

## 📋 Example

Adding a new animal called "Snow Fox":

1. Search Google: "Snow Fox wikimedia commons"
2. Copy image URL: `https://upload.wikimedia.org/wikipedia/commons/thumb/x/xx/SnowFox.jpg/1200px-SnowFox.jpg`
3. Edit `auto_update_images.py`:
   ```python
   ANIMAL_IMAGES = {
       # ... existing animals ...
       "Snow Fox": "https://upload.wikimedia.org/wikipedia/commons/thumb/x/xx/SnowFox.jpg/1200px-SnowFox.jpg",
   }
   ```
4. Run: `python auto_update_images.py "Snow Fox"`

## 🎯 Why Wikimedia Commons?

- ✅ Appears in **top Google Image results**
- ✅ **Reliable and fast** CDN
- ✅ **Public domain** images
- ✅ **High quality** photos
- ✅ **No copyright issues**
- ✅ **Works everywhere** (no CORS issues)

## 🔧 Current Status

- **Total Animals**: 98
- **All Updated**: ✅ Yes
- **Last Update**: October 23, 2025

---

Made with 💚 for animal-stats!
