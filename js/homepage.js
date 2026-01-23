/**
 * HOMEPAGE - Simple Silhouette Controller
 * Just loads animal images and populates the scrolling panels
 */

'use strict';

const HomepageController = {
    initialized: false,
    animalImages: [],
    
    /**
     * Initialize and populate panels
     */
    activate(animals) {
        if (!animals || !animals.length) return;
        
        const trackLeft = document.getElementById('silhouette-track-left');
        const trackRight = document.getElementById('silhouette-track-right');
        
        if (!trackLeft || !trackRight) {
            console.warn('Homepage: silhouette tracks not found');
            return;
        }
        
        // Only populate once
        if (this.initialized) return;
        this.initialized = true;
        
        // Filter to animals with valid images
        const validAnimals = animals.filter(a => a.image && !a.image.includes('fallback'));
        
        // Shuffle and pick 20
        const shuffled = this.shuffle([...validAnimals]);
        const selected = shuffled.slice(0, 20);
        const images = selected.map(a => a.image);
        
        // Populate panels (double images for seamless loop)
        this.populateTrack(trackLeft, images);
        this.populateTrack(trackRight, [...images].reverse());
    },
    
    /**
     * Populate a track with images
     */
    populateTrack(track, images) {
        track.innerHTML = '';
        
        // Double for seamless loop
        const allImages = [...images, ...images];
        
        allImages.forEach(src => {
            const img = document.createElement('img');
            img.className = 'silhouette-img';
            img.loading = 'lazy';
            img.alt = '';
            img.draggable = false;
            img.onerror = () => { img.style.display = 'none'; };
            img.src = src;
            track.appendChild(img);
        });
    },
    
    /**
     * Fisher-Yates shuffle
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
};

window.HomepageController = HomepageController;
