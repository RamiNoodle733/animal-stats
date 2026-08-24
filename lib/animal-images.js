'use strict';

const registry = require('../data/animal-image-sources.json');
const optimizedManifest = require('../images/animals/optimized/manifest.json');

function normalizeAnimalName(name) {
    return typeof name === 'string' ? name.trim().toLocaleLowerCase('en-US') : '';
}

const activeByName = new Map((registry.entries || [])
    .filter((entry) => entry.status === 'active' && entry.asset)
    .map((entry) => [normalizeAnimalName(entry.animal), entry]));

const manifestByName = new Map(Object.values(optimizedManifest.animals || {})
    .map((entry) => [normalizeAnimalName(entry.animal), entry]));

function getCanonicalAnimalImage(name, fallback = null) {
    return activeByName.get(normalizeAnimalName(name))?.asset || fallback;
}

function getCanonicalAnimalImageSet(name) {
    const manifestEntry = manifestByName.get(normalizeAnimalName(name));
    if (!manifestEntry) return null;
    return {
        schemaVersion: optimizedManifest.schemaVersion,
        fallback: manifestEntry.fallback,
        width: manifestEntry.width,
        height: manifestEntry.height,
        avif: manifestEntry.variants.avif,
        webp: manifestEntry.variants.webp
    };
}

function applyCanonicalAnimalImage(animal) {
    if (!animal || typeof animal !== 'object') return animal;
    const canonicalImage = getCanonicalAnimalImage(animal.name);
    if (!canonicalImage) return animal;
    const plainAnimal = typeof animal.toObject === 'function' ? animal.toObject() : animal;
    return {
        ...plainAnimal,
        image: canonicalImage,
        imageSet: getCanonicalAnimalImageSet(animal.name)
    };
}

function applyCanonicalAnimalImages(animals) {
    return Array.isArray(animals) ? animals.map(applyCanonicalAnimalImage) : [];
}

module.exports = {
    applyCanonicalAnimalImage,
    applyCanonicalAnimalImages,
    getCanonicalAnimalImage,
    getCanonicalAnimalImageSet,
    normalizeAnimalName
};
