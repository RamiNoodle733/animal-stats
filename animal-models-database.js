// ============================================
// 3D MODEL DATABASE - Real Animal Models
// ============================================
// HOW TO ADD YOUR OWN 3D MODELS:
// 1. Find a .glb or .gltf file for the animal (see README for sources)
// 2. Host it online (GitHub, Cloudflare, your own server) OR place in /models/ folder
// 3. Add entry below with model_url, scale, and optional rotation/position
// 4. Set model_type to "gltf"
// 5. If URL fails, system automatically falls back to enhanced primitive models
//
// EXAMPLE FORMAT:
// "Animal Name": {
//     "model_url": "https://your-cdn.com/model.glb",  // or "./models/elephant.glb"
//     "model_type": "gltf",
//     "scale": 1.5,
//     "rotation": [0, Math.PI, 0],  // optional: [x, y, z] in radians
//     "position": [0, -0.5, 0]       // optional: [x, y, z] offset
// }

const ANIMAL_3D_MODELS = {
    "African Elephant": {
        "model_url": "./models/elephant.glb",
        "model_type": "gltf",
        "scale": 2.0
    },
    "Saltwater Crocodile": {
        "model_url": "https://models.readyplayer.me/64c0e0f3e0c4c1c3e0c4c1c3.glb",
        "model_type": "gltf",
        "scale": 1.5
    },
    "Great White Shark": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/shark/model.gltf",
        "model_type": "gltf",
        "scale": 1.8
    },
    "Grizzly Bear": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/bear/model.gltf",
        "model_type": "gltf",
        "scale": 1.5
    },
    "Siberian Tiger": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/tiger/model.gltf",
        "model_type": "gltf",
        "scale": 1.6
    },
    "African Lion": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/lion/model.gltf",
        "model_type": "gltf",
        "scale": 1.5
    },
    "Hippopotamus": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/hippo/model.gltf",
        "model_type": "gltf",
        "scale": 1.7
    },
    "Polar Bear": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/polar-bear/model.gltf",
        "model_type": "gltf",
        "scale": 1.5
    },
    "Orca": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/orca/model.gltf",
        "model_type": "gltf",
        "scale": 2.0
    },
    "Cheetah": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/cheetah/model.gltf",
        "model_type": "gltf",
        "scale": 1.3
    },
    "Peregrine Falcon": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/falcon/model.gltf",
        "model_type": "gltf",
        "scale": 0.8
    },
    "Komodo Dragon": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/komodo/model.gltf",
        "model_type": "gltf",
        "scale": 1.4
    },
    "Gorilla": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/gorilla/model.gltf",
        "model_type": "gltf",
        "scale": 1.6
    },
    "Anaconda": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/snake/model.gltf",
        "model_type": "gltf",
        "scale": 1.2
    },
    "Leopard": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/leopard/model.gltf",
        "model_type": "gltf",
        "scale": 1.3
    },
    "Jaguar": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/jaguar/model.gltf",
        "model_type": "gltf",
        "scale": 1.3
    },
    "Honey Badger": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/badger/model.gltf",
        "model_type": "gltf",
        "scale": 0.9
    },
    "Wolverine": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/wolverine/model.gltf",
        "model_type": "gltf",
        "scale": 1.0
    },
    "Cape Buffalo": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/buffalo/model.gltf",
        "model_type": "gltf",
        "scale": 1.6
    },
    "Bottlenose Dolphin": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/dolphin/model.gltf",
        "model_type": "gltf",
        "scale": 1.4
    },
    "Chimpanzee": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/chimp/model.gltf",
        "model_type": "gltf",
        "scale": 1.2
    },
    "Mantis Shrimp": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/shrimp/model.gltf",
        "model_type": "gltf",
        "scale": 0.7
    },
    "Cassowary": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/cassowary/model.gltf",
        "model_type": "gltf",
        "scale": 1.3
    },
    "King Cobra": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/cobra/model.gltf",
        "model_type": "gltf",
        "scale": 1.2
    },
    "Bald Eagle": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/eagle/model.gltf",
        "model_type": "gltf",
        "scale": 1.0
    },
    "Harpy Eagle": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/harpy-eagle/model.gltf",
        "model_type": "gltf",
        "scale": 1.1
    },
    "Rhinoceros": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/rhino/model.gltf",
        "model_type": "gltf",
        "scale": 1.8
    },
    "Moose": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/moose/model.gltf",
        "model_type": "gltf",
        "scale": 1.7
    },
    "Gray Wolf": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/wolf/model.gltf",
        "model_type": "gltf",
        "scale": 1.2
    },
    "Hyena": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/hyena/model.gltf",
        "model_type": "gltf",
        "scale": 1.2
    },
    "Cougar": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/cougar/model.gltf",
        "model_type": "gltf",
        "scale": 1.3
    },
    "Lynx": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/lynx/model.gltf",
        "model_type": "gltf",
        "scale": 1.0
    },
    "Snow Leopard": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/snow-leopard/model.gltf",
        "model_type": "gltf",
        "scale": 1.3
    },
    "Walrus": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/walrus/model.gltf",
        "model_type": "gltf",
        "scale": 1.6
    },
    "Box Jellyfish": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/jellyfish/model.gltf",
        "model_type": "gltf",
        "scale": 1.0
    },
    "Blue Whale": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/whale/model.gltf",
        "model_type": "gltf",
        "scale": 3.0
    },
    "Electric Eel": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/eel/model.gltf",
        "model_type": "gltf",
        "scale": 1.0
    },
    "Octopus": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/octopus/model.gltf",
        "model_type": "gltf",
        "scale": 1.2
    },
    "Bison": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/bison/model.gltf",
        "model_type": "gltf",
        "scale": 1.7
    },
    "Wild Boar": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/boar/model.gltf",
        "model_type": "gltf",
        "scale": 1.2
    },
    "Alligator": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/alligator/model.gltf",
        "model_type": "gltf",
        "scale": 1.5
    },
    "Python": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/python/model.gltf",
        "model_type": "gltf",
        "scale": 1.3
    },
    "Secretary Bird": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/secretary-bird/model.gltf",
        "model_type": "gltf",
        "scale": 1.0
    },
    "Sloth Bear": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/sloth-bear/model.gltf",
        "model_type": "gltf",
        "scale": 1.4
    },
    "Tasmanian Devil": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/tasmanian-devil/model.gltf",
        "model_type": "gltf",
        "scale": 0.8
    },
    "Shoebill": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/shoebill/model.gltf",
        "model_type": "gltf",
        "scale": 1.0
    },
    "Kangaroo": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/kangaroo/model.gltf",
        "model_type": "gltf",
        "scale": 1.4
    },
    "Platypus": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/platypus/model.gltf",
        "model_type": "gltf",
        "scale": 0.7
    },
    "Piranha": {
        "model_url": "https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/piranha/model.gltf",
        "model_type": "gltf",
        "scale": 0.6
    }
};

// Export for use in 3d-viewer.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ANIMAL_3D_MODELS;
}
