// ============================================
// 3D MODEL VIEWER - Three.js Integration
// ============================================

class Animal3DViewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.currentModel = null;
        this.mixer = null;
        this.animationId = null;
        
        this.init();
    }
    
    init() {
        if (!this.container) return;
        
        // Check if Three.js is loaded
        if (typeof THREE === 'undefined') {
            console.error('Three.js not loaded');
            return;
        }
        
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = null; // Transparent background
        
        // Camera setup
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(0, 2, 5);
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true 
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);
        
        // Orbit controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 2;
        this.controls.maxDistance = 10;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 2;
        
        // Lighting
        this.setupLighting();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start animation loop
        this.animate();
    }
    
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light (main)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Rim light (cyan glow effect)
        const rimLight = new THREE.DirectionalLight(0x00d4ff, 0.4);
        rimLight.position.set(-5, 3, -5);
        this.scene.add(rimLight);
        
        // Fill light (orange accent)
        const fillLight = new THREE.DirectionalLight(0xff6b00, 0.3);
        fillLight.position.set(0, -5, 5);
        this.scene.add(fillLight);
    }
    
    loadGLTFModel(url, scale = 1.0, onSuccess = null, onError = null) {
        // Clear existing model
        this.clearModel();
        
        // Check if GLTFLoader exists
        if (typeof THREE.GLTFLoader === 'undefined') {
            console.error('GLTFLoader not available, falling back to primitive');
            if (onError) onError();
            return;
        }
        
        const loader = new THREE.GLTFLoader();
        
        loader.load(
            url,
            (gltf) => {
                this.currentModel = gltf.scene;
                
                // Apply scale
                this.currentModel.scale.set(scale, scale, scale);
                
                // Enable shadows
                this.currentModel.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                        
                        // Enhance materials
                        if (node.material) {
                            node.material.roughness = 0.7;
                            node.material.metalness = 0.2;
                            node.material.emissive = new THREE.Color(0x00d4ff);
                            node.material.emissiveIntensity = 0.05;
                        }
                    }
                });
                
                this.scene.add(this.currentModel);
                this.centerAndScaleModel();
                
                // Play animations if available
                if (gltf.animations && gltf.animations.length > 0) {
                    this.mixer = new THREE.AnimationMixer(this.currentModel);
                    const action = this.mixer.clipAction(gltf.animations[0]);
                    action.play();
                }
                
                if (onSuccess) onSuccess();
            },
            (progress) => {
                // Optional: handle progress
                const percentComplete = (progress.loaded / progress.total) * 100;
                console.log(`Loading model: ${percentComplete.toFixed(2)}%`);
            },
            (error) => {
                console.error('Error loading GLTF model:', error);
                if (onError) onError();
            }
        );
    }
    
    loadPrimitiveModel(animalName, animalType) {
        // Clear existing model
        this.clearModel();
        
        // Create enhanced animal model
        this.currentModel = this.createEnhancedAnimalModel(animalType);
        
        // Enable shadows for all meshes
        this.currentModel.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });
        
        // Add detail shapes (eyes, glow)
        this.addDetailShapes(this.currentModel, animalType);
        
        this.scene.add(this.currentModel);
        
        // Center and scale the model
        this.centerAndScaleModel();
    }
    
    createEnhancedAnimalModel(animalName) {
        const name = animalName.toLowerCase();
        const group = new THREE.Group();
        
        // Set initial rotation to face front-left
        group.rotation.y = -Math.PI / 6; // 30 degrees to the left
        
        // Helper function to add eyes to models
        const addEyes = (x, y, z, scale = 1, separation = 0.5) => {
            const eyeGeometry = new THREE.SphereGeometry(0.06 * scale, 16, 16);
            const eyeWhite = new THREE.SphereGeometry(0.08 * scale, 16, 16);
            
            // Left eye
            const leftEyeWhite = new THREE.Mesh(eyeWhite, this.createAnimalMaterial(0xFFFFFF));
            leftEyeWhite.position.set(x - separation * scale * 0.3, y, z);
            const leftPupil = new THREE.Mesh(eyeGeometry, this.createAnimalMaterial(0x000000));
            leftPupil.position.set(x - separation * scale * 0.3, y, z + 0.05 * scale);
            group.add(leftEyeWhite, leftPupil);
            
            // Right eye
            const rightEyeWhite = new THREE.Mesh(eyeWhite, this.createAnimalMaterial(0xFFFFFF));
            rightEyeWhite.position.set(x + separation * scale * 0.3, y, z);
            const rightPupil = new THREE.Mesh(eyeGeometry, this.createAnimalMaterial(0x000000));
            rightPupil.position.set(x + separation * scale * 0.3, y, z + 0.05 * scale);
            group.add(rightEyeWhite, rightPupil);
        };
        
        // ===== ELEPHANTS =====
        if (name.includes('elephant')) {
            const color = 0x808080;
            
            // Body (large oval)
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(1.2, 32, 32),
                this.createAnimalMaterial(color)
            );
            body.scale.set(1.3, 1.1, 1.8);
            body.position.y = 0.2;
            
            // Head (smaller sphere)
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.7, 32, 32),
                this.createAnimalMaterial(color)
            );
            head.position.set(0, 0.7, 1.9);
            
            // Eyes
            addEyes(0, 0.9, 2.3, 1.2, 0.8);
            
            // Trunk (curved cylinder)
            const trunkCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0, 0.3, 2.2),
                new THREE.Vector3(0, 0, 2.5),
                new THREE.Vector3(0, -0.4, 2.7),
                new THREE.Vector3(0, -0.8, 2.6)
            ]);
            const trunk = new THREE.Mesh(
                new THREE.TubeGeometry(trunkCurve, 20, 0.18, 12, false),
                this.createAnimalMaterial(0x707070)
            );
            
            // Ears (flat discs)
            const earGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 32);
            const leftEar = new THREE.Mesh(earGeometry, this.createAnimalMaterial(0x787878));
            leftEar.position.set(-0.8, 0.7, 1.5);
            leftEar.rotation.z = Math.PI / 3;
            
            const rightEar = new THREE.Mesh(earGeometry, this.createAnimalMaterial(0x787878));
            rightEar.position.set(0.8, 0.7, 1.5);
            rightEar.rotation.z = -Math.PI / 3;
            
            // Tusks (white cones)
            const tuskGeometry = new THREE.ConeGeometry(0.08, 0.8, 8);
            const leftTusk = new THREE.Mesh(tuskGeometry, this.createAnimalMaterial(0xFFFFF0));
            leftTusk.position.set(-0.3, 0.1, 2.3);
            leftTusk.rotation.x = Math.PI / 2;
            leftTusk.rotation.z = -Math.PI / 8;
            
            const rightTusk = new THREE.Mesh(tuskGeometry, this.createAnimalMaterial(0xFFFFF0));
            rightTusk.position.set(0.3, 0.1, 2.3);
            rightTusk.rotation.x = Math.PI / 2;
            rightTusk.rotation.z = Math.PI / 8;
            
            // Legs (cylinders)
            const legGeometry = new THREE.CylinderGeometry(0.25, 0.3, 1.5, 16);
            const legPositions = [
                [-0.7, -1.2, 0.8],
                [0.7, -1.2, 0.8],
                [-0.7, -1.2, -0.8],
                [0.7, -1.2, -0.8]
            ];
            
            legPositions.forEach(pos => {
                const leg = new THREE.Mesh(legGeometry, this.createAnimalMaterial(0x707070));
                leg.position.set(...pos);
                group.add(leg);
            });
            
            // Tail
            const tail = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.05, 0.8, 8),
                this.createAnimalMaterial(0x707070)
            );
            tail.position.set(0, 0, -2.2);
            tail.rotation.x = -Math.PI / 4;
            
            group.add(body, head, trunk, leftEar, rightEar, leftTusk, rightTusk, tail);
            return group;
        }
        
        // ===== CROCODILES & ALLIGATORS =====
        if (name.includes('crocodile') || name.includes('alligator')) {
            // Body (elongated cylinder)
            const body = new THREE.Mesh(
                new THREE.CylinderGeometry(0.35, 0.4, 3, 16),
                this.createAnimalMaterial(0x3A4F2A)
            );
            body.rotation.z = Math.PI / 2;
            body.scale.set(1, 1, 1.2);
            
            // Head (box + snout)
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(0.6, 0.5, 1.2),
                this.createAnimalMaterial(0x3A4F2A)
            );
            head.position.set(2.2, 0, 0);
            
            // Snout (elongated box)
            const snout = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.3, 0.8),
                this.createAnimalMaterial(0x3A4F2A)
            );
            snout.position.set(2.8, -0.05, 0);
            
            // Jaw (lower)
            const jaw = new THREE.Mesh(
                new THREE.BoxGeometry(0.35, 0.15, 0.7),
                this.createAnimalMaterial(0x2A3F1A)
            );
            jaw.position.set(2.8, -0.25, 0);
            
            // Tail (tapered cone)
            const tail = new THREE.Mesh(
                new THREE.ConeGeometry(0.35, 2, 12),
                this.createAnimalMaterial(0x3A4F2A)
            );
            tail.position.set(-2.5, 0, 0);
            tail.rotation.z = Math.PI / 2;
            
            // Spikes along back
            for (let i = -1; i < 2; i += 0.5) {
                const spike = new THREE.Mesh(
                    new THREE.ConeGeometry(0.1, 0.3, 4),
                    this.createAnimalMaterial(0x2A3F1A)
                );
                spike.position.set(i, 0.4, 0);
                group.add(spike);
            }
            
            // Legs (short and wide)
            const legPositions = [
                [1, -0.5, 0.5],
                [1, -0.5, -0.5],
                [-0.5, -0.5, 0.5],
                [-0.5, -0.5, -0.5]
            ];
            
            legPositions.forEach(pos => {
                const leg = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.15, 0.18, 0.5, 8),
                    this.createAnimalMaterial(0x3A4F2A)
                );
                leg.position.set(...pos);
                group.add(leg);
            });
            
            // Eyes (on top of head)
            addEyes(0, 0.3, 1.8, 1.2, 0.6);
            
            group.add(body, head, snout, jaw, tail);
            return group;
        }
        
        // ===== SHARKS =====
        if (name.includes('shark')) {
            // Body (streamlined cylinder)
            const body = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 0.25, 3, 24),
                this.createAnimalMaterial(0x4A6D8C)
            );
            body.rotation.z = Math.PI / 2;
            body.scale.set(1, 1, 1.3);
            
            // Head (cone for nose)
            const head = new THREE.Mesh(
                new THREE.ConeGeometry(0.5, 1, 16),
                this.createAnimalMaterial(0x4A6D8C)
            );
            head.position.set(2, 0, 0);
            head.rotation.z = -Math.PI / 2;
            
            // Mouth (darker underside)
            const mouth = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 0.2, 0.6),
                this.createAnimalMaterial(0xE8E8E8)
            );
            mouth.position.set(1.8, -0.3, 0);
            
            // Dorsal fin (large triangular)
            const dorsalFin = new THREE.Mesh(
                new THREE.ConeGeometry(0.4, 1.2, 4),
                this.createAnimalMaterial(0x3A5D7C)
            );
            dorsalFin.position.set(0.2, 0.9, 0);
            dorsalFin.rotation.x = Math.PI / 10;
            
            // Pectoral fins (side fins)
            const pectoralGeometry = new THREE.ConeGeometry(0.3, 0.8, 4);
            const leftPectoral = new THREE.Mesh(pectoralGeometry, this.createAnimalMaterial(0x3A5D7C));
            leftPectoral.position.set(0.8, -0.2, -0.6);
            leftPectoral.rotation.set(Math.PI / 6, 0, Math.PI / 4);
            
            const rightPectoral = new THREE.Mesh(pectoralGeometry, this.createAnimalMaterial(0x3A5D7C));
            rightPectoral.position.set(0.8, -0.2, 0.6);
            rightPectoral.rotation.set(Math.PI / 6, 0, -Math.PI / 4);
            
            // Tail fin (vertical)
            const upperTail = new THREE.Mesh(
                new THREE.ConeGeometry(0.2, 1.2, 4),
                this.createAnimalMaterial(0x3A5D7C)
            );
            upperTail.position.set(-2, 0.4, 0);
            upperTail.rotation.set(0, 0, -Math.PI / 3);
            
            const lowerTail = new THREE.Mesh(
                new THREE.ConeGeometry(0.15, 0.7, 4),
                this.createAnimalMaterial(0x3A5D7C)
            );
            lowerTail.position.set(-2, -0.3, 0);
            lowerTail.rotation.set(0, 0, Math.PI / 2.5);
            
            // Eyes (side-mounted)
            addEyes(0, 0.3, 1.3, 0.8, 0.7);
            
            group.add(body, head, mouth, dorsalFin, leftPectoral, rightPectoral, upperTail, lowerTail);
            return group;
        }
        
        // ===== BEARS =====
        if (name.includes('bear')) {
            const bearColor = name.includes('polar') ? 0xF0F0E8 : name.includes('grizzly') ? 0x5C4033 : 0x4A3428;
            
            // Body (large oval)
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(1, 32, 32),
                this.createAnimalMaterial(bearColor)
            );
            body.scale.set(1.3, 1, 1.5);
            
            // Head (rounded)
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.6, 32, 32),
                this.createAnimalMaterial(bearColor)
            );
            head.position.set(0, 0.3, 1.5);
            head.scale.set(1, 0.9, 1.1);
            
            // Snout (protruding)
            const snout = new THREE.Mesh(
                new THREE.CylinderGeometry(0.25, 0.3, 0.5, 16),
                this.createAnimalMaterial(bearColor)
            );
            snout.position.set(0, 0.1, 2);
            snout.rotation.x = Math.PI / 2;
            
            // Ears (round)
            const earGeometry = new THREE.SphereGeometry(0.2, 16, 16);
            const leftEar = new THREE.Mesh(earGeometry, this.createAnimalMaterial(bearColor));
            leftEar.position.set(-0.4, 0.7, 1.5);
            
            const rightEar = new THREE.Mesh(earGeometry, this.createAnimalMaterial(bearColor));
            rightEar.position.set(0.4, 0.7, 1.5);
            
            // Legs (thick and powerful)
            const legGeometry = new THREE.CylinderGeometry(0.25, 0.3, 1.2, 16);
            const legPositions = [
                [-0.6, -1, 0.7],
                [0.6, -1, 0.7],
                [-0.6, -1, -0.7],
                [0.6, -1, -0.7]
            ];
            
            legPositions.forEach(pos => {
                const leg = new THREE.Mesh(legGeometry, this.createAnimalMaterial(bearColor));
                leg.position.set(...pos);
                group.add(leg);
            });
            
            // Shoulder hump (for grizzly)
            if (name.includes('grizzly')) {
                const hump = new THREE.Mesh(
                    new THREE.SphereGeometry(0.4, 16, 16),
                    this.createAnimalMaterial(bearColor)
                );
                hump.position.set(0, 0.8, 0.5);
                group.add(hump);
            }
            
            // Eyes
            addEyes(0, 0.6, 1.3, 1, 0.5);
            
            group.add(body, head, snout, leftEar, rightEar);
            return group;
        }
        
        // ===== LIONS & TIGERS =====
        if (name.includes('lion') || name.includes('tiger') || name.includes('leopard') || name.includes('jaguar') || name.includes('cheetah') || name.includes('cougar') || name.includes('lynx')) {
            let catColor;
            if (name.includes('lion')) catColor = 0xC8A060;
            else if (name.includes('tiger')) catColor = 0xE89030;
            else if (name.includes('leopard')) catColor = 0xD4A060;
            else if (name.includes('cheetah')) catColor = 0xE8C070;
            else catColor = 0xB89050;
            
            // Body (sleek and muscular)
            const body = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.4, 1.5, 16, 32),
                this.createAnimalMaterial(catColor)
            );
            body.rotation.z = Math.PI / 2;
            body.scale.set(1.1, 1, 1);
            
            // Head (rectangular with rounded edges)
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(0.6, 0.5, 0.7),
                this.createAnimalMaterial(catColor)
            );
            head.position.set(0, 0.3, 1.3);
            
            // Muzzle (snout area)
            const muzzle = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.3, 0.4),
                this.createAnimalMaterial(catColor)
            );
            muzzle.position.set(0, 0.15, 1.65);
            
            // Ears (triangular)
            const earGeometry = new THREE.ConeGeometry(0.15, 0.25, 4);
            const leftEar = new THREE.Mesh(earGeometry, this.createAnimalMaterial(catColor));
            leftEar.position.set(-0.25, 0.6, 1.3);
            
            const rightEar = new THREE.Mesh(earGeometry, this.createAnimalMaterial(catColor));
            rightEar.position.set(0.25, 0.6, 1.3);
            
            // Lion's mane (if lion)
            if (name.includes('lion')) {
                const mane = new THREE.Mesh(
                    new THREE.SphereGeometry(0.8, 32, 32),
                    this.createAnimalMaterial(0x8B6F47)
                );
                mane.position.set(0, 0.3, 1.2);
                mane.scale.set(1.3, 1, 1.3);
                group.add(mane);
            }
            
            // Stripes (if tiger)
            if (name.includes('tiger')) {
                for (let i = 0; i < 6; i++) {
                    const stripe = new THREE.Mesh(
                        new THREE.BoxGeometry(0.1, 0.9, 0.2),
                        this.createAnimalMaterial(0x000000)
                    );
                    stripe.position.set(-0.8 + i * 0.35, 0, 0);
                    group.add(stripe);
                }
            }
            
            // Legs (long and slender)
            const legGeometry = new THREE.CylinderGeometry(0.12, 0.15, 1, 12);
            const legPositions = [
                [-0.3, -0.9, 0.8],
                [0.3, -0.9, 0.8],
                [-0.3, -0.9, -0.5],
                [0.3, -0.9, -0.5]
            ];
            
            legPositions.forEach(pos => {
                const leg = new THREE.Mesh(legGeometry, this.createAnimalMaterial(catColor));
                leg.position.set(...pos);
                group.add(leg);
            });
            
            // Tail (long and curved)
            const tailCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0, 0, -1.2),
                new THREE.Vector3(0, 0.2, -1.6),
                new THREE.Vector3(0, 0.4, -2),
                new THREE.Vector3(0, 0.3, -2.4)
            ]);
            const tail = new THREE.Mesh(
                new THREE.TubeGeometry(tailCurve, 20, 0.08, 8, false),
                this.createAnimalMaterial(catColor)
            );
            
            // Eyes
            addEyes(0, 0.4, 1, 0.9, 0.6);
            
            group.add(body, head, muzzle, leftEar, rightEar, tail);
            return group;
        }
        
        // ===== BIRDS & EAGLES =====
        if (name.includes('eagle') || name.includes('falcon') || name.includes('hawk') || name.includes('bird') || name.includes('cassowary') || name.includes('shoebill')) {
            const birdColor = name.includes('bald') ? 0xFFFFFF : name.includes('harpy') ? 0x4A4A3A : 0x8B7355;
            
            // Body (sleek capsule)
            const body = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.35, 1.2, 16, 32),
                this.createAnimalMaterial(birdColor)
            );
            body.scale.set(1, 1, 1.1);
            
            // Head (rounded sphere)
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.4, 24, 24),
                this.createAnimalMaterial(name.includes('bald') ? 0xFFFFFF : birdColor)
            );
            head.position.set(0, 1, 0);
            
            // Beak (sharp cone)
            const beak = new THREE.Mesh(
                new THREE.ConeGeometry(0.12, 0.5, 8),
                this.createAnimalMaterial(0xE8C040)
            );
            beak.position.set(0, 1, 0.45);
            beak.rotation.x = Math.PI / 2;
            
            // Wings (detailed with feathers)
            const wingGeometry = new THREE.BoxGeometry(2, 0.15, 1);
            const leftWing = new THREE.Mesh(wingGeometry, this.createAnimalMaterial(birdColor));
            leftWing.position.set(-1.2, 0.3, 0);
            leftWing.rotation.set(0, Math.PI / 12, Math.PI / 4);
            
            const rightWing = new THREE.Mesh(wingGeometry, this.createAnimalMaterial(birdColor));
            rightWing.position.set(1.2, 0.3, 0);
            rightWing.rotation.set(0, -Math.PI / 12, -Math.PI / 4);
            
            // Wing feathers (tips)
            const featherGeometry = new THREE.BoxGeometry(0.8, 0.08, 0.4);
            for (let i = 0; i < 3; i++) {
                const leftFeather = new THREE.Mesh(featherGeometry, this.createAnimalMaterial(birdColor));
                leftFeather.position.set(-2 - i * 0.3, 0.2 - i * 0.15, 0);
                leftFeather.rotation.set(0, 0, Math.PI / 3 + i * 0.2);
                group.add(leftFeather);
                
                const rightFeather = new THREE.Mesh(featherGeometry, this.createAnimalMaterial(birdColor));
                rightFeather.position.set(2 + i * 0.3, 0.2 - i * 0.15, 0);
                rightFeather.rotation.set(0, 0, -Math.PI / 3 - i * 0.2);
                group.add(rightFeather);
            }
            
            // Tail feathers
            const tailGeometry = new THREE.BoxGeometry(0.15, 0.08, 1.2);
            for (let i = -2; i <= 2; i++) {
                const tailFeather = new THREE.Mesh(tailGeometry, this.createAnimalMaterial(birdColor));
                tailFeather.position.set(i * 0.15, -0.8, -0.6);
                tailFeather.rotation.x = -Math.PI / 4;
                group.add(tailFeather);
            }
            
            // Legs/Talons (if eagle/falcon)
            if (!name.includes('cassowary') && !name.includes('shoebill')) {
                const legGeometry = new THREE.CylinderGeometry(0.06, 0.08, 0.6, 8);
                const leftLeg = new THREE.Mesh(legGeometry, this.createAnimalMaterial(0xE8C040));
                leftLeg.position.set(-0.2, -1, 0);
                
                const rightLeg = new THREE.Mesh(legGeometry, this.createAnimalMaterial(0xE8C040));
                rightLeg.position.set(0.2, -1, 0);
                
                group.add(leftLeg, rightLeg);
            }
            
            // Eyes
            addEyes(0, 0.4, 0.85, 0.8, 0.35);
            
            group.add(body, head, beak, leftWing, rightWing);
            return group;
        }
        
        // ===== WOLVES =====
        if (name.includes('wolf')) {
            // Body (lean and muscular)
            const body = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.35, 1.3, 16, 32),
                this.createAnimalMaterial(0x707070)
            );
            body.rotation.z = Math.PI / 2;
            
            // Head (elongated snout)
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(0.5, 0.45, 0.8),
                this.createAnimalMaterial(0x707070)
            );
            head.position.set(0, 0.2, 1.2);
            
            // Snout (pointed)
            const snout = new THREE.Mesh(
                new THREE.ConeGeometry(0.22, 0.5, 8),
                this.createAnimalMaterial(0x707070)
            );
            snout.position.set(0, 0.1, 1.65);
            snout.rotation.x = Math.PI / 2;
            
            // Ears (pointed triangular)
            const earGeometry = new THREE.ConeGeometry(0.12, 0.35, 4);
            const leftEar = new THREE.Mesh(earGeometry, this.createAnimalMaterial(0x707070));
            leftEar.position.set(-0.2, 0.5, 1.2);
            
            const rightEar = new THREE.Mesh(earGeometry, this.createAnimalMaterial(0x707070));
            rightEar.position.set(0.2, 0.5, 1.2);
            
            // Legs (long and slender)
            const legGeometry = new THREE.CylinderGeometry(0.1, 0.12, 1.1, 12);
            const legPositions = [
                [-0.25, -0.9, 0.7],
                [0.25, -0.9, 0.7],
                [-0.25, -0.9, -0.4],
                [0.25, -0.9, -0.4]
            ];
            
            legPositions.forEach(pos => {
                const leg = new THREE.Mesh(legGeometry, this.createAnimalMaterial(0x707070));
                leg.position.set(...pos);
                group.add(leg);
            });
            
            // Tail (bushy and curved)
            const tailCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0, 0.1, -1),
                new THREE.Vector3(0, -0.1, -1.4),
                new THREE.Vector3(0, -0.3, -1.8)
            ]);
            const tail = new THREE.Mesh(
                new THREE.TubeGeometry(tailCurve, 15, 0.15, 12, false),
                this.createAnimalMaterial(0x707070)
            );
            
            // Eyes
            addEyes(0, 0.35, 1.1, 1, 0.4);
            
            group.add(body, head, snout, leftEar, rightEar, tail);
            return group;
        }
        
        // ===== FOXES (Arctic, Fennec, Red, Coyote, Dingo, Jackal) =====
        if (name.includes('fox') || name.includes('coyote') || name.includes('dingo') || name.includes('jackal')) {
            let color = 0xC85028; // default red fox
            let earSize = 0.25;
            let bodySize = 0.5;
            
            if (name.includes('arctic')) {
                color = 0xF0F0F0;
            } else if (name.includes('fennec')) {
                color = 0xE8D8C0;
                earSize = 0.5; // huge ears
                bodySize = 0.35; // smaller body
            } else if (name.includes('red')) {
                color = 0xC85028;
            } else if (name.includes('coyote')) {
                color = 0xA09080;
                bodySize = 0.6;
            } else if (name.includes('dingo')) {
                color = 0xD8A860;
                bodySize = 0.55;
            } else if (name.includes('jackal')) {
                color = 0xB09070;
                bodySize = 0.48;
            }
            
            // Body
            const body = new THREE.Mesh(
                new THREE.CapsuleGeometry(bodySize * 0.5, bodySize * 1.8, 16, 32),
                this.createAnimalMaterial(color)
            );
            body.rotation.z = Math.PI / 2;
            body.position.y = 0.3;
            
            // Head
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(bodySize * 0.5, 32, 32),
                this.createAnimalMaterial(color)
            );
            head.position.set(0, 0.3, bodySize * 1.2);
            head.scale.set(1, 0.9, 1.1);
            
            // Pointed snout
            const snout = new THREE.Mesh(
                new THREE.ConeGeometry(bodySize * 0.3, bodySize * 0.6, 16),
                this.createAnimalMaterial(color)
            );
            snout.position.set(0, 0.2, bodySize * 1.7);
            snout.rotation.x = Math.PI / 2;
            
            // Nose
            const nose = new THREE.Mesh(
                new THREE.SphereGeometry(0.06, 16, 16),
                this.createAnimalMaterial(0x000000)
            );
            nose.position.set(0, 0.2, bodySize * 2);
            
            // Large triangular ears
            const earGeometry = new THREE.ConeGeometry(earSize * 0.4, earSize, 16);
            const leftEar = new THREE.Mesh(earGeometry, this.createAnimalMaterial(color));
            leftEar.position.set(-bodySize * 0.35, 0.6, bodySize * 1);
            leftEar.rotation.z = -Math.PI / 6;
            const rightEar = new THREE.Mesh(earGeometry, this.createAnimalMaterial(color));
            rightEar.position.set(bodySize * 0.35, 0.6, bodySize * 1);
            rightEar.rotation.z = Math.PI / 6;
            
            // Inner ear (pink/white)
            const innerEarColor = name.includes('fennec') ? 0xFFD0D0 : 0xFFE0E0;
            const leftInner = new THREE.Mesh(
                new THREE.ConeGeometry(earSize * 0.25, earSize * 0.7, 16),
                this.createAnimalMaterial(innerEarColor)
            );
            leftInner.position.copy(leftEar.position);
            leftInner.rotation.copy(leftEar.rotation);
            const rightInner = new THREE.Mesh(
                new THREE.ConeGeometry(earSize * 0.25, earSize * 0.7, 16),
                this.createAnimalMaterial(innerEarColor)
            );
            rightInner.position.copy(rightEar.position);
            rightInner.rotation.copy(rightEar.rotation);
            
            // Eyes
            addEyes(0, 0.4, bodySize * 1.5, bodySize * 1.5, 0.6);
            
            // Legs
            const legGeometry = new THREE.CylinderGeometry(bodySize * 0.12, bodySize * 0.15, bodySize * 1.2, 12);
            const legPositions = [
                [-bodySize * 0.35, -bodySize * 0.3, bodySize * 0.6],
                [bodySize * 0.35, -bodySize * 0.3, bodySize * 0.6],
                [-bodySize * 0.35, -bodySize * 0.3, -bodySize * 0.4],
                [bodySize * 0.35, -bodySize * 0.3, -bodySize * 0.4]
            ];
            legPositions.forEach(pos => {
                const leg = new THREE.Mesh(legGeometry, this.createAnimalMaterial(color));
                leg.position.set(...pos);
                group.add(leg);
            });
            
            // Bushy tail
            const tailCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0, 0.2, -bodySize * 0.8),
                new THREE.Vector3(0, 0.1, -bodySize * 1.3),
                new THREE.Vector3(0, 0, -bodySize * 1.8)
            ]);
            const tail = new THREE.Mesh(
                new THREE.TubeGeometry(tailCurve, 20, bodySize * 0.2, 12, false),
                this.createAnimalMaterial(color)
            );
            
            // White tail tip for foxes
            if (name.includes('fox') && !name.includes('arctic')) {
                const tailTip = new THREE.Mesh(
                    new THREE.SphereGeometry(bodySize * 0.25, 16, 16),
                    this.createAnimalMaterial(0xFFFFFF)
                );
                tailTip.position.set(0, 0, -bodySize * 1.8);
                group.add(tailTip);
            }
            
            group.add(body, head, snout, nose, leftEar, rightEar, leftInner, rightInner, tail);
            return group;
        }
        
        // ===== HYENA =====
        if (name.includes('hyena')) {
            const color = 0xA89878;
            
            // Body (stocky front, sloping back)
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(0.6, 32, 32),
                this.createAnimalMaterial(color)
            );
            body.scale.set(1.3, 1, 1.5);
            body.position.set(0, 0.4, 0);
            body.rotation.x = -Math.PI / 12;
            
            // Head (powerful)
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(0.6, 0.5, 0.7),
                this.createAnimalMaterial(color)
            );
            head.position.set(0, 0.5, 1.2);
            
            // Powerful jaw
            const jaw = new THREE.Mesh(
                new THREE.BoxGeometry(0.55, 0.3, 0.5),
                this.createAnimalMaterial(color)
            );
            jaw.position.set(0, 0.2, 1.5);
            
            // Large rounded ears
            const earGeometry = new THREE.SphereGeometry(0.2, 16, 16);
            const leftEar = new THREE.Mesh(earGeometry, this.createAnimalMaterial(color));
            leftEar.position.set(-0.3, 0.75, 1);
            const rightEar = new THREE.Mesh(earGeometry, this.createAnimalMaterial(color));
            rightEar.position.set(0.3, 0.75, 1);
            
            // Eyes
            addEyes(0, 0.6, 1.4, 1, 0.5);
            
            // Spots
            for (let i = 0; i < 8; i++) {
                const spot = new THREE.Mesh(
                    new THREE.SphereGeometry(0.1, 8, 8),
                    this.createAnimalMaterial(0x6A5A4A)
                );
                spot.position.set(
                    (Math.random() - 0.5) * 1.2,
                    0.3 + Math.random() * 0.4,
                    (Math.random() - 0.5) * 1.2
                );
                group.add(spot);
            }
            
            // Strong front legs
            const frontLegGeom = new THREE.CylinderGeometry(0.15, 0.18, 0.9, 12);
            const backLegGeom = new THREE.CylinderGeometry(0.14, 0.16, 0.7, 12);
            
            const frontLeft = new THREE.Mesh(frontLegGeom, this.createAnimalMaterial(color));
            frontLeft.position.set(-0.4, -0.15, 0.6);
            const frontRight = new THREE.Mesh(frontLegGeom, this.createAnimalMaterial(color));
            frontRight.position.set(0.4, -0.15, 0.6);
            const backLeft = new THREE.Mesh(backLegGeom, this.createAnimalMaterial(color));
            backLeft.position.set(-0.4, -0.35, -0.5);
            const backRight = new THREE.Mesh(backLegGeom, this.createAnimalMaterial(color));
            backRight.position.set(0.4, -0.35, -0.5);
            
            // Short tail
            const tail = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.05, 0.6, 12),
                this.createAnimalMaterial(color)
            );
            tail.position.set(0, 0.3, -1);
            tail.rotation.x = Math.PI / 3;
            
            group.add(body, head, jaw, leftEar, rightEar, frontLeft, frontRight, backLeft, backRight, tail);
            return group;
        }
        
        // ===== SNAKES =====
        if (name.includes('snake') || name.includes('cobra') || name.includes('python') || name.includes('anaconda')) {
            const snakeColor = name.includes('cobra') ? 0x2A2A1A : name.includes('anaconda') ? 0x3A4A2A : 0x3D5C2F;
            
            // Coiled body (S-curve)
            const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0.7, 0.3, 0.6),
                new THREE.Vector3(0, 0.5, 1.2),
                new THREE.Vector3(-0.7, 0.3, 1.8),
                new THREE.Vector3(0, 0, 2.4),
                new THREE.Vector3(0.5, -0.2, 3),
                new THREE.Vector3(0, -0.3, 3.5)
            ]);
            
            const body = new THREE.Mesh(
                new THREE.TubeGeometry(curve, 80, 0.22, 16, false),
                this.createAnimalMaterial(snakeColor)
            );
            
            // Head (diamond shape)
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(0.35, 0.25, 0.4),
                this.createAnimalMaterial(snakeColor)
            );
            head.position.set(0, -0.3, 3.7);
            head.rotation.x = -Math.PI / 6;
            
            // Cobra hood (if cobra)
            if (name.includes('cobra')) {
                const hood = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.6, 0.3, 0.1, 32),
                    this.createAnimalMaterial(snakeColor)
                );
                hood.position.set(0, 0, 3.2);
                hood.rotation.x = Math.PI / 2;
                group.add(hood);
            }
            
            // Scales texture (rings)
            for (let i = 0; i < 30; i++) {
                const scale = new THREE.Mesh(
                    new THREE.TorusGeometry(0.22, 0.02, 8, 12),
                    this.createAnimalMaterial(0x2A3A1A)
                );
                const t = i / 30;
                const pos = curve.getPoint(t);
                scale.position.copy(pos);
                group.add(scale);
            }
            
            // Eyes (small, on sides of head)
            addEyes(0, -0.15, 3.75, 0.6, 0.5);
            
            group.add(body, head);
            return group;
        }
        
        // ===== WHALES & DOLPHINS =====
        if (name.includes('whale') || name.includes('orca') || name.includes('dolphin')) {
            const isOrca = name.includes('orca');
            const color = isOrca ? 0x1A1A1A : name.includes('blue') ? 0x4A6A8A : 0x5A7A9A;
            
            // Body (massive streamlined)
            const body = new THREE.Mesh(
                new THREE.CylinderGeometry(0.8, 0.4, 4, 32),
                this.createAnimalMaterial(color)
            );
            body.rotation.z = Math.PI / 2;
            body.scale.set(1, 1, name.includes('blue') ? 1.5 : 1.2);
            
            // Head (rounded)
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.8, 32, 32),
                this.createAnimalMaterial(color)
            );
            head.position.set(2.5, 0, 0);
            head.scale.set(1.2, 1, 1);
            
            // Dorsal fin
            const dorsalFin = new THREE.Mesh(
                new THREE.ConeGeometry(0.4, isOrca ? 1.5 : 0.8, 4),
                this.createAnimalMaterial(color)
            );
            dorsalFin.position.set(0, isOrca ? 1.2 : 0.9, 0);
            dorsalFin.rotation.x = Math.PI / 10;
            
            // Pectoral fins
            const pectoralGeometry = new THREE.BoxGeometry(1.2, 0.15, 0.6);
            const leftPectoral = new THREE.Mesh(pectoralGeometry, this.createAnimalMaterial(color));
            leftPectoral.position.set(1, -0.4, -0.9);
            leftPectoral.rotation.set(Math.PI / 6, 0, Math.PI / 8);
            
            const rightPectoral = new THREE.Mesh(pectoralGeometry, this.createAnimalMaterial(color));
            rightPectoral.position.set(1, -0.4, 0.9);
            rightPectoral.rotation.set(Math.PI / 6, 0, -Math.PI / 8);
            
            // Tail flukes (horizontal)
            const flukeGeometry = new THREE.BoxGeometry(0.2, 0.1, 2);
            const flukes = new THREE.Mesh(flukeGeometry, this.createAnimalMaterial(color));
            flukes.position.set(-2.5, 0, 0);
            
            // Orca white patches
            if (isOrca) {
                const whitePatch = new THREE.Mesh(
                    new THREE.SphereGeometry(0.6, 16, 16),
                    this.createAnimalMaterial(0xFFFFFF)
                );
                whitePatch.position.set(1.5, -0.4, 0);
                whitePatch.scale.set(1.5, 0.8, 1);
                group.add(whitePatch);
                
                const eyePatch = new THREE.Mesh(
                    new THREE.SphereGeometry(0.2, 16, 16),
                    this.createAnimalMaterial(0xFFFFFF)
                );
                eyePatch.position.set(2.2, 0.3, 0.4);
                group.add(eyePatch);
            }
            
            // Eyes
            addEyes(0, 0.3, 2.7, 1.2, 0.6);
            
            group.add(body, head, dorsalFin, leftPectoral, rightPectoral, flukes);
            return group;
        }
        
        // ===== GORILLAS & PRIMATES =====
        if (name.includes('gorilla') || name.includes('chimp')) {
            const primateColor = name.includes('gorilla') ? 0x2A2A2A : 0x3A3A2A;
            
            // Body (powerful chest)
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(0.8, 32, 32),
                this.createAnimalMaterial(primateColor)
            );
            body.scale.set(1, 1.2, 0.9);
            
            // Head (large with pronounced brow)
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.5, 32, 32),
                this.createAnimalMaterial(primateColor)
            );
            head.position.set(0, 1.1, 0.3);
            head.scale.set(1, 0.9, 1.1);
            
            // Face (lighter)
            const face = new THREE.Mesh(
                new THREE.SphereGeometry(0.35, 16, 16),
                this.createAnimalMaterial(0x4A3A2A)
            );
            face.position.set(0, 1.1, 0.7);
            face.scale.set(0.9, 1, 0.7);
            
            // Arms (long and powerful)
            const armGeometry = new THREE.CylinderGeometry(0.15, 0.18, 1.5, 12);
            const leftArm = new THREE.Mesh(armGeometry, this.createAnimalMaterial(primateColor));
            leftArm.position.set(-0.7, 0.2, 0);
            leftArm.rotation.z = Math.PI / 4;
            
            const rightArm = new THREE.Mesh(armGeometry, this.createAnimalMaterial(primateColor));
            rightArm.position.set(0.7, 0.2, 0);
            rightArm.rotation.z = -Math.PI / 4;
            
            // Legs
            const legGeometry = new THREE.CylinderGeometry(0.2, 0.22, 1, 12);
            const leftLeg = new THREE.Mesh(legGeometry, this.createAnimalMaterial(primateColor));
            leftLeg.position.set(-0.4, -1, 0);
            
            const rightLeg = new THREE.Mesh(legGeometry, this.createAnimalMaterial(primateColor));
            rightLeg.position.set(0.4, -1, 0);
            
            // Eyes
            addEyes(0, 1.25, 0.9, 1, 0.5);
            
            group.add(body, head, face, leftArm, rightArm, leftLeg, rightLeg);
            return group;
        }
        
        // ===== HIPPOS =====
        if (name.includes('hippo')) {
            // Massive barrel body
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(1.2, 32, 32),
                this.createAnimalMaterial(0x5A4A4A)
            );
            body.scale.set(1.5, 1, 1.2);
            
            // Large head
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(1, 0.8, 1.2),
                this.createAnimalMaterial(0x5A4A4A)
            );
            head.position.set(0, 0.2, 1.8);
            
            // Huge mouth/jaw
            const mouth = new THREE.Mesh(
                new THREE.BoxGeometry(0.9, 0.4, 1),
                this.createAnimalMaterial(0xF0D0C0)
            );
            mouth.position.set(0, -0.2, 2);
            
            // Small ears
            const earGeometry = new THREE.SphereGeometry(0.15, 16, 16);
            const leftEar = new THREE.Mesh(earGeometry, this.createAnimalMaterial(0x5A4A4A));
            leftEar.position.set(-0.4, 0.6, 1.5);
            const rightEar = new THREE.Mesh(earGeometry, this.createAnimalMaterial(0x5A4A4A));
            rightEar.position.set(0.4, 0.6, 1.5);
            
            // Thick legs
            const legGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.9, 12);
            const positions = [[-0.7, -0.9, 0.5], [0.7, -0.9, 0.5], [-0.7, -0.9, -0.5], [0.7, -0.9, -0.5]];
            positions.forEach(pos => {
                const leg = new THREE.Mesh(legGeometry, this.createAnimalMaterial(0x5A4A4A));
                leg.position.set(...pos);
                group.add(leg);
            });
            
            // Eyes (small, high on head)
            addEyes(0, 0.75, 1.7, 1, 0.6);
            
            group.add(body, head, mouth, leftEar, rightEar);
            return group;
        }
        
        // ===== RHINOS =====
        if (name.includes('rhino')) {
            // Massive body
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(1.1, 32, 32),
                this.createAnimalMaterial(0x6A6A6A)
            );
            body.scale.set(1.6, 1, 1.2);
            
            // Head with pronounced snout
            const head = new THREE.Mesh(
                new THREE.ConeGeometry(0.6, 1.2, 32),
                this.createAnimalMaterial(0x6A6A6A)
            );
            head.position.set(0, 0, 2);
            head.rotation.x = Math.PI / 2;
            
            // Large horn (or two)
            const hornGeometry = new THREE.ConeGeometry(0.15, 0.8, 12);
            const horn1 = new THREE.Mesh(hornGeometry, this.createAnimalMaterial(0x8A8A7A));
            horn1.position.set(0, 0.3, 2.5);
            horn1.rotation.x = Math.PI / 12;
            group.add(horn1);
            
            if (name.includes('black') || name.includes('white')) {
                const horn2 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 12), this.createAnimalMaterial(0x8A8A7A));
                horn2.position.set(0, 0.2, 2.2);
                horn2.rotation.x = Math.PI / 12;
                group.add(horn2);
            }
            
            // Small ears
            const earGeometry = new THREE.ConeGeometry(0.2, 0.4, 12);
            const leftEar = new THREE.Mesh(earGeometry, this.createAnimalMaterial(0x6A6A6A));
            leftEar.position.set(-0.4, 0.5, 1.5);
            leftEar.rotation.z = -Math.PI / 6;
            const rightEar = new THREE.Mesh(earGeometry, this.createAnimalMaterial(0x6A6A6A));
            rightEar.position.set(0.4, 0.5, 1.5);
            rightEar.rotation.z = Math.PI / 6;
            
            // Thick legs
            const legGeometry = new THREE.CylinderGeometry(0.25, 0.28, 1.1, 12);
            const legPositions = [[-0.8, -1, 0.6], [0.8, -1, 0.6], [-0.8, -1, -0.6], [0.8, -1, -0.6]];
            legPositions.forEach(pos => {
                const leg = new THREE.Mesh(legGeometry, this.createAnimalMaterial(0x6A6A6A));
                leg.position.set(...pos);
                group.add(leg);
            });
            
            // Eyes
            addEyes(0, 0.65, 2.1, 1.1, 0.5);
            
            group.add(body, head, leftEar, rightEar);
            return group;
        }
        
        // ===== GIRAFFES =====
        if (name.includes('giraffe')) {
            // Body
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(0.8, 32, 32),
                this.createAnimalMaterial(0xC8A060)
            );
            body.scale.set(1.2, 1, 0.9);
            
            // Extremely long neck
            const neck = new THREE.Mesh(
                new THREE.CylinderGeometry(0.25, 0.3, 2.5, 16),
                this.createAnimalMaterial(0xC8A060)
            );
            neck.position.set(0, 1.8, 0);
            neck.rotation.x = -Math.PI / 8;
            
            // Small head
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(0.4, 0.5, 0.6),
                this.createAnimalMaterial(0xC8A060)
            );
            head.position.set(0, 3.2, 0.3);
            
            // Ossicones (horn-like protrusions)
            const ossiconeGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
            const leftOssicone = new THREE.Mesh(ossiconeGeometry, this.createAnimalMaterial(0x8A6A3A));
            leftOssicone.position.set(-0.12, 3.6, 0.2);
            const rightOssicone = new THREE.Mesh(ossiconeGeometry, this.createAnimalMaterial(0x8A6A3A));
            rightOssicone.position.set(0.12, 3.6, 0.2);
            
            // Long legs
            const legGeometry = new THREE.CylinderGeometry(0.12, 0.15, 1.8, 12);
            const giraffe_positions = [[-0.5, -1.4, 0.4], [0.5, -1.4, 0.4], [-0.5, -1.4, -0.4], [0.5, -1.4, -0.4]];
            giraffe_positions.forEach(pos => {
                const leg = new THREE.Mesh(legGeometry, this.createAnimalMaterial(0xC8A060));
                leg.position.set(...pos);
                group.add(leg);
            });
            
            // Spots pattern
            for (let i = 0; i < 12; i++) {
                const spot = new THREE.Mesh(
                    new THREE.SphereGeometry(0.15, 8, 8),
                    this.createAnimalMaterial(0x6A4A2A)
                );
                spot.position.set(
                    (Math.random() - 0.5) * 1.5,
                    (Math.random() - 0.5) * 1.5,
                    (Math.random() - 0.5) * 1
                );
                spot.scale.set(1, 1, 0.5);
                group.add(spot);
            }
            
            // Eyes
            addEyes(0, 3.25, 0.5, 0.6, 0.35);
            
            group.add(body, neck, head, leftOssicone, rightOssicone);
            return group;
        }
        
        // ===== KOMODO DRAGONS =====
        if (name.includes('komodo')) {
            // Long body
            const body = new THREE.Mesh(
                new THREE.CylinderGeometry(0.35, 0.3, 2.5, 16),
                this.createAnimalMaterial(0x4A4A3A)
            );
            body.rotation.z = Math.PI / 2;
            
            // Head with powerful jaws
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(0.6, 0.4, 0.8),
                this.createAnimalMaterial(0x4A4A3A)
            );
            head.position.set(1.5, 0, 0);
            
            // Long forked tongue
            const tongue = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8),
                this.createAnimalMaterial(0xFF4040)
            );
            tongue.position.set(1.9, 0, 0);
            tongue.rotation.z = Math.PI / 2;
            
            // Four lizard legs (splayed out)
            const legGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.6, 12);
            const frontLeft = new THREE.Mesh(legGeometry, this.createAnimalMaterial(0x4A4A3A));
            frontLeft.position.set(0.8, -0.4, -0.5);
            frontLeft.rotation.z = Math.PI / 6;
            
            const frontRight = new THREE.Mesh(legGeometry, this.createAnimalMaterial(0x4A4A3A));
            frontRight.position.set(0.8, -0.4, 0.5);
            frontRight.rotation.z = Math.PI / 6;
            
            const backLeft = new THREE.Mesh(legGeometry, this.createAnimalMaterial(0x4A4A3A));
            backLeft.position.set(-0.8, -0.4, -0.5);
            backLeft.rotation.z = Math.PI / 6;
            
            const backRight = new THREE.Mesh(legGeometry, this.createAnimalMaterial(0x4A4A3A));
            backRight.position.set(-0.8, -0.4, 0.5);
            backRight.rotation.z = Math.PI / 6;
            
            // Long thick tail
            const tailCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(-1.25, 0, 0),
                new THREE.Vector3(-1.8, -0.1, 0),
                new THREE.Vector3(-2.3, -0.15, 0),
                new THREE.Vector3(-2.8, -0.1, 0)
            ]);
            const tail = new THREE.Mesh(
                new THREE.TubeGeometry(tailCurve, 20, 0.25, 12, false),
                this.createAnimalMaterial(0x4A4A3A)
            );
            
            // Eyes
            addEyes(0, 0.15, 1.6, 0.8, 0.5);
            
            group.add(body, head, tongue, frontLeft, frontRight, backLeft, backRight, tail);
            return group;
        }
        
        // ===== KANGAROOS =====
        if (name.includes('kangaroo')) {
            // Body (upright posture)
            const body = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.5, 1.2, 16, 32),
                this.createAnimalMaterial(0xA08070)
            );
            body.position.y = 0.8;
            
            // Head with snout
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.35, 32, 32),
                this.createAnimalMaterial(0xA08070)
            );
            head.position.set(0, 1.8, 0.2);
            head.scale.set(1, 0.9, 1.2);
            
            // Large ears
            const earGeometry = new THREE.ConeGeometry(0.2, 0.6, 16);
            const leftEar = new THREE.Mesh(earGeometry, this.createAnimalMaterial(0xA08070));
            leftEar.position.set(-0.25, 2.3, 0);
            leftEar.rotation.z = -Math.PI / 8;
            const rightEar = new THREE.Mesh(earGeometry, this.createAnimalMaterial(0xA08070));
            rightEar.position.set(0.25, 2.3, 0);
            rightEar.rotation.z = Math.PI / 8;
            
            // Small arms
            const armGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.6, 12);
            const leftArm = new THREE.Mesh(armGeometry, this.createAnimalMaterial(0xA08070));
            leftArm.position.set(-0.4, 1, 0);
            leftArm.rotation.z = Math.PI / 4;
            const rightArm = new THREE.Mesh(armGeometry, this.createAnimalMaterial(0xA08070));
            rightArm.position.set(0.4, 1, 0);
            rightArm.rotation.z = -Math.PI / 4;
            
            // Powerful hind legs
            const legGeometry = new THREE.CylinderGeometry(0.15, 0.18, 1, 12);
            const leftLeg = new THREE.Mesh(legGeometry, this.createAnimalMaterial(0xA08070));
            leftLeg.position.set(-0.3, -0.3, 0);
            const rightLeg = new THREE.Mesh(legGeometry, this.createAnimalMaterial(0xA08070));
            rightLeg.position.set(0.3, -0.3, 0);
            
            // Large feet
            const footGeometry = new THREE.BoxGeometry(0.25, 0.15, 0.6);
            const leftFoot = new THREE.Mesh(footGeometry, this.createAnimalMaterial(0x8A7060));
            leftFoot.position.set(-0.3, -0.8, 0.2);
            const rightFoot = new THREE.Mesh(footGeometry, this.createAnimalMaterial(0x8A7060));
            rightFoot.position.set(0.3, -0.8, 0.2);
            
            // Thick tail (for balance)
            const tailCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0, 0, -0.3),
                new THREE.Vector3(0, -0.3, -0.8),
                new THREE.Vector3(0, -0.5, -1.3)
            ]);
            const tail = new THREE.Mesh(
                new THREE.TubeGeometry(tailCurve, 20, 0.2, 12, false),
                this.createAnimalMaterial(0xA08070)
            );
            
            // Eyes
            addEyes(0, 1.9, 0.5, 0.8, 0.6);
            
            group.add(body, head, leftEar, rightEar, leftArm, rightArm, leftLeg, rightLeg, leftFoot, rightFoot, tail);
            return group;
        }
        
        // ===== ZEBRA =====
        if (name.includes('zebra')) {
            const baseColor = 0xF0F0F0;
            
            // Body
            const body = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.5, 1.2, 16, 32),
                this.createAnimalMaterial(baseColor)
            );
            body.rotation.z = Math.PI / 2;
            body.position.y = 0.7;
            
            // Head/neck
            const neck = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2, 0.25, 0.8, 16),
                this.createAnimalMaterial(baseColor)
            );
            neck.position.set(0, 1.2, 0.8);
            neck.rotation.x = -Math.PI / 6;
            
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(0.35, 0.4, 0.5),
                this.createAnimalMaterial(baseColor)
            );
            head.position.set(0, 1.5, 1.2);
            
            // Muzzle
            const muzzle = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15, 0.18, 0.3, 16),
                this.createAnimalMaterial(baseColor)
            );
            muzzle.position.set(0, 1.4, 1.5);
            muzzle.rotation.x = Math.PI / 2;
            
            // Ears
            const earGeom = new THREE.ConeGeometry(0.12, 0.25, 12);
            const leftEar = new THREE.Mesh(earGeom, this.createAnimalMaterial(baseColor));
            leftEar.position.set(-0.15, 1.75, 1.1);
            const rightEar = new THREE.Mesh(earGeom, this.createAnimalMaterial(baseColor));
            rightEar.position.set(0.15, 1.75, 1.1);
            
            // Mane
            for (let i = 0; i < 5; i++) {
                const tuft = new THREE.Mesh(
                    new THREE.BoxGeometry(0.3, 0.15, 0.08),
                    this.createAnimalMaterial(0x000000)
                );
                tuft.position.set(0, 1.3 + i * 0.1, 0.8 + i * 0.15);
                tuft.rotation.x = Math.PI / 4;
                group.add(tuft);
            }
            
            // Eyes
            addEyes(0, 1.55, 1.35, 0.8, 0.5);
            
            // Legs
            const legGeom = new THREE.CylinderGeometry(0.08, 0.1, 1.2, 12);
            const legPos = [[-0.3, 0.1, 0.5], [0.3, 0.1, 0.5], [-0.3, 0.1, -0.4], [0.3, 0.1, -0.4]];
            legPos.forEach(pos => {
                const leg = new THREE.Mesh(legGeom, this.createAnimalMaterial(baseColor));
                leg.position.set(...pos);
                group.add(leg);
            });
            
            // Tail with tuft
            const tail = new THREE.Mesh(
                new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8),
                this.createAnimalMaterial(baseColor)
            );
            tail.position.set(0, 0.7, -0.9);
            tail.rotation.x = Math.PI / 4;
            const tailTuft = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 12, 12),
                this.createAnimalMaterial(0x000000)
            );
            tailTuft.position.set(0, 0.3, -1.4);
            
            // Stripes
            for (let i = 0; i < 12; i++) {
                const stripe = new THREE.Mesh(
                    new THREE.BoxGeometry(0.12, 0.6, 0.7),
                    this.createAnimalMaterial(0x000000)
                );
                stripe.position.set(0, 0.7, -0.5 + i * 0.15);
                stripe.rotation.z = Math.PI / 2;
                group.add(stripe);
            }
            
            group.add(body, neck, head, muzzle, leftEar, rightEar, tail, tailTuft);
            return group;
        }
        
        // ===== DEER/ELK/MOOSE/REINDEER =====
        if (name.includes('elk') || name.includes('moose') || name.includes('reindeer') || name.includes('deer')) {
            let color = 0xA08050;
            let antlerSize = 0.8;
            let bodyScale = 1;
            
            if (name.includes('moose')) {
                color = 0x5A4030;
                antlerSize = 1.5;
                bodyScale = 1.3;
            } else if (name.includes('elk')) {
                color = 0xB09060;
                antlerSize = 1.2;
                bodyScale = 1.2;
            } else if (name.includes('reindeer')) {
                color = 0x9A8A7A;
                antlerSize = 1;
            }
            
            // Body
            const body = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.4 * bodyScale, 1 * bodyScale, 16, 32),
                this.createAnimalMaterial(color)
            );
            body.rotation.z = Math.PI / 2;
            body.position.y = 0.8 * bodyScale;
            
            // Neck
            const neck = new THREE.Mesh(
                new THREE.CylinderGeometry(0.18 * bodyScale, 0.22 * bodyScale, 0.6 * bodyScale, 16),
                this.createAnimalMaterial(color)
            );
            neck.position.set(0, 1.2 * bodyScale, 0.7 * bodyScale);
            neck.rotation.x = -Math.PI / 5;
            
            // Head
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(0.3 * bodyScale, 0.35 * bodyScale, 0.45 * bodyScale),
                this.createAnimalMaterial(color)
            );
            head.position.set(0, 1.5 * bodyScale, 1.1 * bodyScale);
            
            // Snout
            const snout = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12 * bodyScale, 0.15 * bodyScale, 0.25 * bodyScale, 16),
                this.createAnimalMaterial(color)
            );
            snout.position.set(0, 1.4 * bodyScale, 1.4 * bodyScale);
            snout.rotation.x = Math.PI / 2;
            
            // Ears
            const earGeom = new THREE.ConeGeometry(0.12 * bodyScale, 0.25 * bodyScale, 12);
            const leftEar = new THREE.Mesh(earGeom, this.createAnimalMaterial(color));
            leftEar.position.set(-0.15 * bodyScale, 1.75 * bodyScale, 1 * bodyScale);
            const rightEar = new THREE.Mesh(earGeom, this.createAnimalMaterial(color));
            rightEar.position.set(0.15 * bodyScale, 1.75 * bodyScale, 1 * bodyScale);
            
            // Eyes
            addEyes(0, 1.55 * bodyScale, 1.3 * bodyScale, bodyScale * 0.8, 0.5);
            
            // Antlers (branching)
            const antlerMaterial = this.createAnimalMaterial(0x8A7A6A);
            const leftAntlerBase = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05 * antlerSize, 0.08 * antlerSize, 0.6 * antlerSize, 8),
                antlerMaterial
            );
            leftAntlerBase.position.set(-0.18 * bodyScale, 1.8 * bodyScale, 1 * bodyScale);
            leftAntlerBase.rotation.z = -Math.PI / 8;
            
            const rightAntlerBase = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05 * antlerSize, 0.08 * antlerSize, 0.6 * antlerSize, 8),
                antlerMaterial
            );
            rightAntlerBase.position.set(0.18 * bodyScale, 1.8 * bodyScale, 1 * bodyScale);
            rightAntlerBase.rotation.z = Math.PI / 8;
            
            // Antler branches
            for (let i = 0; i < 3; i++) {
                const branch = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.03 * antlerSize, 0.05 * antlerSize, 0.4 * antlerSize, 8),
                    antlerMaterial
                );
                branch.position.set(-0.25 * bodyScale, 2 * bodyScale + i * 0.15 * antlerSize, 1 * bodyScale);
                branch.rotation.set(Math.PI / 6, 0, -Math.PI / 4 - i * 0.2);
                group.add(branch);
                
                const branch2 = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.03 * antlerSize, 0.05 * antlerSize, 0.4 * antlerSize, 8),
                    antlerMaterial
                );
                branch2.position.set(0.25 * bodyScale, 2 * bodyScale + i * 0.15 * antlerSize, 1 * bodyScale);
                branch2.rotation.set(Math.PI / 6, 0, Math.PI / 4 + i * 0.2);
                group.add(branch2);
            }
            
            // Legs
            const legGeom = new THREE.CylinderGeometry(0.08 * bodyScale, 0.1 * bodyScale, 1.3 * bodyScale, 12);
            const legPos = [
                [-0.25 * bodyScale, 0.15 * bodyScale, 0.5 * bodyScale],
                [0.25 * bodyScale, 0.15 * bodyScale, 0.5 * bodyScale],
                [-0.25 * bodyScale, 0.15 * bodyScale, -0.3 * bodyScale],
                [0.25 * bodyScale, 0.15 * bodyScale, -0.3 * bodyScale]
            ];
            legPos.forEach(pos => {
                const leg = new THREE.Mesh(legGeom, this.createAnimalMaterial(color));
                leg.position.set(...pos);
                group.add(leg);
            });
            
            // Short tail
            const tail = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05 * bodyScale, 0.03 * bodyScale, 0.3 * bodyScale, 8),
                this.createAnimalMaterial(color)
            );
            tail.position.set(0, 0.9 * bodyScale, -0.8 * bodyScale);
            tail.rotation.x = Math.PI / 3;
            
            group.add(body, neck, head, snout, leftEar, rightEar, leftAntlerBase, rightAntlerBase, tail);
            return group;
        }
        
        // ===== GAZELLE/IMPALA =====
        if (name.includes('gazelle') || name.includes('impala')) {
            const color = 0xC8A878;
            
            // Slender body
            const body = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.3, 0.9, 16, 32),
                this.createAnimalMaterial(color)
            );
            body.rotation.z = Math.PI / 2;
            body.position.y = 0.7;
            
            // Graceful neck
            const neck = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12, 0.15, 0.5, 16),
                this.createAnimalMaterial(color)
            );
            neck.position.set(0, 1.1, 0.6);
            neck.rotation.x = -Math.PI / 6;
            
            // Small head
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(0.25, 0.28, 0.35),
                this.createAnimalMaterial(color)
            );
            head.position.set(0, 1.35, 0.9);
            
            // Delicate snout
            const snout = new THREE.Mesh(
                new THREE.CylinderGeometry(0.08, 0.1, 0.2, 12),
                this.createAnimalMaterial(color)
            );
            snout.position.set(0, 1.25, 1.15);
            snout.rotation.x = Math.PI / 2;
            
            // Large ears
            const earGeom = new THREE.ConeGeometry(0.1, 0.22, 12);
            const leftEar = new THREE.Mesh(earGeom, this.createAnimalMaterial(color));
            leftEar.position.set(-0.12, 1.55, 0.85);
            const rightEar = new THREE.Mesh(earGeom, this.createAnimalMaterial(color));
            rightEar.position.set(0.12, 1.55, 0.85);
            
            // Eyes
            addEyes(0, 1.4, 1.05, 0.7, 0.45);
            
            // Curved horns
            const hornCurveLeft = new THREE.CatmullRomCurve3([
                new THREE.Vector3(-0.12, 1.6, 0.85),
                new THREE.Vector3(-0.15, 1.9, 0.85),
                new THREE.Vector3(-0.12, 2.1, 0.9)
            ]);
            const hornLeft = new THREE.Mesh(
                new THREE.TubeGeometry(hornCurveLeft, 10, 0.03, 8, false),
                this.createAnimalMaterial(0x3A3A3A)
            );
            
            const hornCurveRight = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0.12, 1.6, 0.85),
                new THREE.Vector3(0.15, 1.9, 0.85),
                new THREE.Vector3(0.12, 2.1, 0.9)
            ]);
            const hornRight = new THREE.Mesh(
                new THREE.TubeGeometry(hornCurveRight, 10, 0.03, 8, false),
                this.createAnimalMaterial(0x3A3A3A)
            );
            
            // Long slender legs
            const legGeom = new THREE.CylinderGeometry(0.05, 0.07, 1.1, 12);
            const legPos = [[-0.2, 0.15, 0.4], [0.2, 0.15, 0.4], [-0.2, 0.15, -0.3], [0.2, 0.15, -0.3]];
            legPos.forEach(pos => {
                const leg = new THREE.Mesh(legGeom, this.createAnimalMaterial(color));
                leg.position.set(...pos);
                group.add(leg);
            });
            
            // Small tail with tuft
            const tail = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03, 0.02, 0.5, 8),
                this.createAnimalMaterial(color)
            );
            tail.position.set(0, 0.7, -0.7);
            tail.rotation.x = Math.PI / 4;
            
            const tailTuft = new THREE.Mesh(
                new THREE.SphereGeometry(0.08, 12, 12),
                this.createAnimalMaterial(0x2A2A2A)
            );
            tailTuft.position.set(0, 0.4, -1);
            
            group.add(body, neck, head, snout, leftEar, rightEar, hornLeft, hornRight, tail, tailTuft);
            return group;
        }
        
        // ===== BUFFALO/BISON/YAK/MUSK OX/WILDEBEEST =====
        if (name.includes('buffalo') || name.includes('bison') || name.includes('yak') || name.includes('musk') || name.includes('wildebeest')) {
            let color = 0x4A3A2A;
            let humpSize = 0;
            let bodyScale = 1.2;
            let hornStyle = 'curved';
            
            if (name.includes('bison')) {
                color = 0x5A4030;
                humpSize = 0.6;
                bodyScale = 1.4;
            } else if (name.includes('buffalo')) {
                color = 0x3A2A1A;
                bodyScale = 1.3;
                hornStyle = 'wide';
            } else if (name.includes('yak')) {
                color = 0x2A1A0A;
                humpSize = 0.3;
                bodyScale = 1.3;
            } else if (name.includes('musk')) {
                color = 0x4A3A2A;
                bodyScale = 1.2;
            } else if (name.includes('wildebeest')) {
                color = 0x6A5A4A;
                bodyScale = 1.1;
                hornStyle = 'curved_up';
            }
            
            // Massive body
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(0.7 * bodyScale, 32, 32),
                this.createAnimalMaterial(color)
            );
            body.scale.set(1.4, 1.1, 1.3);
            body.position.y = 0.6 * bodyScale;
            
            // Shoulder hump (for bison/yak)
            if (humpSize > 0) {
                const hump = new THREE.Mesh(
                    new THREE.SphereGeometry(humpSize * bodyScale, 16, 16),
                    this.createAnimalMaterial(color)
                );
                hump.position.set(0, 1.2 * bodyScale, 0.3 * bodyScale);
                group.add(hump);
            }
            
            // Head
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(0.5 * bodyScale, 0.5 * bodyScale, 0.6 * bodyScale),
                this.createAnimalMaterial(color)
            );
            head.position.set(0, 0.7 * bodyScale, 1.2 * bodyScale);
            
            // Snout
            const snout = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2 * bodyScale, 0.25 * bodyScale, 0.3 * bodyScale, 16),
                this.createAnimalMaterial(color)
            );
            snout.position.set(0, 0.6 * bodyScale, 1.6 * bodyScale);
            snout.rotation.x = Math.PI / 2;
            
            // Ears
            const earGeom = new THREE.ConeGeometry(0.12 * bodyScale, 0.22 * bodyScale, 12);
            const leftEar = new THREE.Mesh(earGeom, this.createAnimalMaterial(color));
            leftEar.position.set(-0.28 * bodyScale, 1 * bodyScale, 1.1 * bodyScale);
            leftEar.rotation.z = -Math.PI / 6;
            const rightEar = new THREE.Mesh(earGeom, this.createAnimalMaterial(color));
            rightEar.position.set(0.28 * bodyScale, 1 * bodyScale, 1.1 * bodyScale);
            rightEar.rotation.z = Math.PI / 6;
            
            // Eyes
            addEyes(0, 0.8 * bodyScale, 1.5 * bodyScale, bodyScale, 0.6);
            
            // Horns
            const hornMaterial = this.createAnimalMaterial(0x2A2A1A);
            if (hornStyle === 'wide') {
                // Wide curved horns (buffalo)
                const hornCurveLeft = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(-0.3 * bodyScale, 1 * bodyScale, 1.1 * bodyScale),
                    new THREE.Vector3(-0.6 * bodyScale, 1.1 * bodyScale, 1.1 * bodyScale),
                    new THREE.Vector3(-0.8 * bodyScale, 1 * bodyScale, 1.2 * bodyScale)
                ]);
                const hornLeft = new THREE.Mesh(
                    new THREE.TubeGeometry(hornCurveLeft, 15, 0.08 * bodyScale, 8, false),
                    hornMaterial
                );
                group.add(hornLeft);
                
                const hornCurveRight = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(0.3 * bodyScale, 1 * bodyScale, 1.1 * bodyScale),
                    new THREE.Vector3(0.6 * bodyScale, 1.1 * bodyScale, 1.1 * bodyScale),
                    new THREE.Vector3(0.8 * bodyScale, 1 * bodyScale, 1.2 * bodyScale)
                ]);
                const hornRight = new THREE.Mesh(
                    new THREE.TubeGeometry(hornCurveRight, 15, 0.08 * bodyScale, 8, false),
                    hornMaterial
                );
                group.add(hornRight);
            } else if (hornStyle === 'curved_up') {
                // Upward curved horns (wildebeest)
                const hornCurveLeft = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(-0.25 * bodyScale, 0.9 * bodyScale, 1.2 * bodyScale),
                    new THREE.Vector3(-0.3 * bodyScale, 0.7 * bodyScale, 1.2 * bodyScale),
                    new THREE.Vector3(-0.25 * bodyScale, 0.9 * bodyScale, 1.3 * bodyScale),
                    new THREE.Vector3(-0.2 * bodyScale, 1.3 * bodyScale, 1.3 * bodyScale)
                ]);
                const hornLeft = new THREE.Mesh(
                    new THREE.TubeGeometry(hornCurveLeft, 15, 0.05 * bodyScale, 8, false),
                    hornMaterial
                );
                group.add(hornLeft);
                
                const hornCurveRight = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(0.25 * bodyScale, 0.9 * bodyScale, 1.2 * bodyScale),
                    new THREE.Vector3(0.3 * bodyScale, 0.7 * bodyScale, 1.2 * bodyScale),
                    new THREE.Vector3(0.25 * bodyScale, 0.9 * bodyScale, 1.3 * bodyScale),
                    new THREE.Vector3(0.2 * bodyScale, 1.3 * bodyScale, 1.3 * bodyScale)
                ]);
                const hornRight = new THREE.Mesh(
                    new THREE.TubeGeometry(hornCurveRight, 15, 0.05 * bodyScale, 8, false),
                    hornMaterial
                );
                group.add(hornRight);
            } else {
                // Short curved horns (default)
                const leftHorn = new THREE.Mesh(
                    new THREE.ConeGeometry(0.06 * bodyScale, 0.4 * bodyScale, 8),
                    hornMaterial
                );
                leftHorn.position.set(-0.25 * bodyScale, 1.1 * bodyScale, 1.1 * bodyScale);
                leftHorn.rotation.z = -Math.PI / 6;
                group.add(leftHorn);
                
                const rightHorn = new THREE.Mesh(
                    new THREE.ConeGeometry(0.06 * bodyScale, 0.4 * bodyScale, 8),
                    hornMaterial
                );
                rightHorn.position.set(0.25 * bodyScale, 1.1 * bodyScale, 1.1 * bodyScale);
                rightHorn.rotation.z = Math.PI / 6;
                group.add(rightHorn);
            }
            
            // Beard (for bison/yak/wildebeest)
            if (name.includes('bison') || name.includes('yak') || name.includes('wildebeest')) {
                for (let i = 0; i < 5; i++) {
                    const beardTuft = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.04 * bodyScale, 0.02 * bodyScale, 0.3 * bodyScale, 8),
                        this.createAnimalMaterial(color)
                    );
                    beardTuft.position.set(
                        (Math.random() - 0.5) * 0.3 * bodyScale,
                        0.3 * bodyScale,
                        1.5 * bodyScale
                    );
                    beardTuft.rotation.x = Math.PI / 6;
                    group.add(beardTuft);
                }
            }
            
            // Strong legs
            const legGeom = new THREE.CylinderGeometry(0.12 * bodyScale, 0.15 * bodyScale, 1.1 * bodyScale, 12);
            const legPos = [
                [-0.5 * bodyScale, -0.05 * bodyScale, 0.5 * bodyScale],
                [0.5 * bodyScale, -0.05 * bodyScale, 0.5 * bodyScale],
                [-0.5 * bodyScale, -0.05 * bodyScale, -0.4 * bodyScale],
                [0.5 * bodyScale, -0.05 * bodyScale, -0.4 * bodyScale]
            ];
            legPos.forEach(pos => {
                const leg = new THREE.Mesh(legGeom, this.createAnimalMaterial(color));
                leg.position.set(...pos);
                group.add(leg);
            });
            
            // Tail with tuft
            const tail = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05 * bodyScale, 0.03 * bodyScale, 0.7 * bodyScale, 8),
                this.createAnimalMaterial(color)
            );
            tail.position.set(0, 0.7 * bodyScale, -0.9 * bodyScale);
            tail.rotation.x = Math.PI / 4;
            
            const tailTuft = new THREE.Mesh(
                new THREE.SphereGeometry(0.12 * bodyScale, 12, 12),
                this.createAnimalMaterial(color)
            );
            tailTuft.position.set(0, 0.3 * bodyScale, -1.3 * bodyScale);
            
            group.add(body, head, snout, leftEar, rightEar, tail, tailTuft);
            return group;
        }
        
        // ===== SHEEP/GOATS (Bighorn, Ibex, Mountain Goat) =====
        if (name.includes('sheep') || name.includes('goat') || name.includes('ibex')) {
            let color = 0xE8E8E8;
            let hornType = 'curved';
            let bodyScale = 1;
            
            if (name.includes('bighorn')) {
                color = 0xA08870;
                hornType = 'bighorn';
                bodyScale = 1.1;
            } else if (name.includes('ibex')) {
                color = 0x8A7A6A;
                hornType = 'long';
                bodyScale = 0.9;
            } else if (name.includes('mountain')) {
                color = 0xF0F0F0;
                hornType = 'short';
                bodyScale = 1;
            }
            
            // Fluffy body
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(0.5 * bodyScale, 32, 32),
                this.createAnimalMaterial(color)
            );
            body.scale.set(1.2, 1, 1.1);
            body.position.y = 0.6 * bodyScale;
            
            // Head
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(0.3 * bodyScale, 0.35 * bodyScale, 0.4 * bodyScale),
                this.createAnimalMaterial(color)
            );
            head.position.set(0, 0.7 * bodyScale, 0.9 * bodyScale);
            
            // Snout
            const snout = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12 * bodyScale, 0.14 * bodyScale, 0.22 * bodyScale, 16),
                this.createAnimalMaterial(color)
            );
            snout.position.set(0, 0.6 * bodyScale, 1.2 * bodyScale);
            snout.rotation.x = Math.PI / 2;
            
            // Ears
            const earGeom = new THREE.ConeGeometry(0.1 * bodyScale, 0.2 * bodyScale, 12);
            const leftEar = new THREE.Mesh(earGeom, this.createAnimalMaterial(color));
            leftEar.position.set(-0.15 * bodyScale, 0.95 * bodyScale, 0.85 * bodyScale);
            const rightEar = new THREE.Mesh(earGeom, this.createAnimalMaterial(color));
            rightEar.position.set(0.15 * bodyScale, 0.95 * bodyScale, 0.85 * bodyScale);
            
            // Eyes
            addEyes(0, 0.75 * bodyScale, 1.05 * bodyScale, bodyScale * 0.8, 0.5);
            
            // Horns
            const hornMaterial = this.createAnimalMaterial(0x4A4A3A);
            if (hornType === 'bighorn') {
                // Large curved ram horns
                const hornCurveLeft = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(-0.18 * bodyScale, 0.9 * bodyScale, 0.85 * bodyScale),
                    new THREE.Vector3(-0.4 * bodyScale, 0.8 * bodyScale, 0.9 * bodyScale),
                    new THREE.Vector3(-0.5 * bodyScale, 0.6 * bodyScale, 1.1 * bodyScale),
                    new THREE.Vector3(-0.4 * bodyScale, 0.5 * bodyScale, 1.3 * bodyScale)
                ]);
                const hornLeft = new THREE.Mesh(
                    new THREE.TubeGeometry(hornCurveLeft, 20, 0.12 * bodyScale, 8, false),
                    hornMaterial
                );
                group.add(hornLeft);
                
                const hornCurveRight = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(0.18 * bodyScale, 0.9 * bodyScale, 0.85 * bodyScale),
                    new THREE.Vector3(0.4 * bodyScale, 0.8 * bodyScale, 0.9 * bodyScale),
                    new THREE.Vector3(0.5 * bodyScale, 0.6 * bodyScale, 1.1 * bodyScale),
                    new THREE.Vector3(0.4 * bodyScale, 0.5 * bodyScale, 1.3 * bodyScale)
                ]);
                const hornRight = new THREE.Mesh(
                    new THREE.TubeGeometry(hornCurveRight, 20, 0.12 * bodyScale, 8, false),
                    hornMaterial
                );
                group.add(hornRight);
            } else if (hornType === 'long') {
                // Long curved ibex horns
                const hornCurveLeft = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(-0.15 * bodyScale, 0.9 * bodyScale, 0.85 * bodyScale),
                    new THREE.Vector3(-0.2 * bodyScale, 1.3 * bodyScale, 0.85 * bodyScale),
                    new THREE.Vector3(-0.18 * bodyScale, 1.7 * bodyScale, 0.9 * bodyScale)
                ]);
                const hornLeft = new THREE.Mesh(
                    new THREE.TubeGeometry(hornCurveLeft, 20, 0.06 * bodyScale, 8, false),
                    hornMaterial
                );
                group.add(hornLeft);
                
                const hornCurveRight = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(0.15 * bodyScale, 0.9 * bodyScale, 0.85 * bodyScale),
                    new THREE.Vector3(0.2 * bodyScale, 1.3 * bodyScale, 0.85 * bodyScale),
                    new THREE.Vector3(0.18 * bodyScale, 1.7 * bodyScale, 0.9 * bodyScale)
                ]);
                const hornRight = new THREE.Mesh(
                    new THREE.TubeGeometry(hornCurveRight, 20, 0.06 * bodyScale, 8, false),
                    hornMaterial
                );
                group.add(hornRight);
            } else {
                // Short horns
                const leftHorn = new THREE.Mesh(
                    new THREE.ConeGeometry(0.05 * bodyScale, 0.3 * bodyScale, 8),
                    hornMaterial
                );
                leftHorn.position.set(-0.15 * bodyScale, 1 * bodyScale, 0.85 * bodyScale);
                leftHorn.rotation.z = -Math.PI / 8;
                group.add(leftHorn);
                
                const rightHorn = new THREE.Mesh(
                    new THREE.ConeGeometry(0.05 * bodyScale, 0.3 * bodyScale, 8),
                    hornMaterial
                );
                rightHorn.position.set(0.15 * bodyScale, 1 * bodyScale, 0.85 * bodyScale);
                rightHorn.rotation.z = Math.PI / 8;
                group.add(rightHorn);
            }
            
            // Legs
            const legGeom = new THREE.CylinderGeometry(0.07 * bodyScale, 0.09 * bodyScale, 0.9 * bodyScale, 12);
            const legPos = [
                [-0.3 * bodyScale, 0.15 * bodyScale, 0.4 * bodyScale],
                [0.3 * bodyScale, 0.15 * bodyScale, 0.4 * bodyScale],
                [-0.3 * bodyScale, 0.15 * bodyScale, -0.3 * bodyScale],
                [0.3 * bodyScale, 0.15 * bodyScale, -0.3 * bodyScale]
            ];
            legPos.forEach(pos => {
                const leg = new THREE.Mesh(legGeom, this.createAnimalMaterial(color));
                leg.position.set(...pos);
                group.add(leg);
            });
            
            // Small tail
            const tail = new THREE.Mesh(
                new THREE.CylinderGeometry(0.04 * bodyScale, 0.02 * bodyScale, 0.2 * bodyScale, 8),
                this.createAnimalMaterial(color)
            );
            tail.position.set(0, 0.7 * bodyScale, -0.7 * bodyScale);
            tail.rotation.x = Math.PI / 3;
            
            group.add(body, head, snout, leftEar, rightEar, tail);
            return group;
        }
        
        // ===== CAMEL/LLAMA/ALPACA =====
        if (name.includes('camel') || name.includes('llama') || name.includes('alpaca')) {
            let color = 0xC8A878;
            let neckLength = 1.2;
            let hasHump = false;
            let bodyScale = 1;
            
            if (name.includes('camel')) {
                color = 0xB89868;
                hasHump = true;
                bodyScale = 1.3;
                neckLength = 1;
            } else if (name.includes('llama')) {
                color = 0xE8D8C8;
                neckLength = 1.5;
                bodyScale = 1.1;
            } else if (name.includes('alpaca')) {
                color = 0xD8C8B8;
                neckLength = 1.3;
                bodyScale = 0.9;
            }
            
            // Body
            const body = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.4 * bodyScale, 1 * bodyScale, 16, 32),
                this.createAnimalMaterial(color)
            );
            body.rotation.z = Math.PI / 2;
            body.position.y = 0.8 * bodyScale;
            
            // Hump(s) for camel
            if (hasHump) {
                const hump = new THREE.Mesh(
                    new THREE.SphereGeometry(0.35 * bodyScale, 16, 16),
                    this.createAnimalMaterial(color)
                );
                hump.position.set(0, 1.3 * bodyScale, 0);
                group.add(hump);
            }
            
            // Long neck
            const neck = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15 * bodyScale, 0.2 * bodyScale, neckLength * bodyScale, 16),
                this.createAnimalMaterial(color)
            );
            neck.position.set(0, 1.2 * bodyScale, 0.7 * bodyScale);
            neck.rotation.x = -Math.PI / 6;
            
            // Head
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(0.25 * bodyScale, 0.3 * bodyScale, 0.4 * bodyScale),
                this.createAnimalMaterial(color)
            );
            head.position.set(0, 1.2 * bodyScale + neckLength * bodyScale * 0.7, 1.1 * bodyScale);
            
            // Snout
            const snout = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1 * bodyScale, 0.12 * bodyScale, 0.25 * bodyScale, 16),
                this.createAnimalMaterial(color)
            );
            snout.position.set(0, 1.2 * bodyScale + neckLength * bodyScale * 0.7 - 0.1 * bodyScale, 1.4 * bodyScale);
            snout.rotation.x = Math.PI / 2;
            
            // Large ears
            const earGeom = new THREE.ConeGeometry(0.12 * bodyScale, 0.3 * bodyScale, 12);
            const leftEar = new THREE.Mesh(earGeom, this.createAnimalMaterial(color));
            leftEar.position.set(-0.15 * bodyScale, 1.2 * bodyScale + neckLength * bodyScale * 0.7 + 0.25 * bodyScale, 1 * bodyScale);
            const rightEar = new THREE.Mesh(earGeom, this.createAnimalMaterial(color));
            rightEar.position.set(0.15 * bodyScale, 1.2 * bodyScale + neckLength * bodyScale * 0.7 + 0.25 * bodyScale, 1 * bodyScale);
            
            // Eyes
            addEyes(0, 1.2 * bodyScale + neckLength * bodyScale * 0.7, 1.25 * bodyScale, bodyScale * 0.8, 0.5);
            
            // Long legs
            const legGeom = new THREE.CylinderGeometry(0.08 * bodyScale, 0.1 * bodyScale, 1.3 * bodyScale, 12);
            const legPos = [
                [-0.25 * bodyScale, 0.15 * bodyScale, 0.5 * bodyScale],
                [0.25 * bodyScale, 0.15 * bodyScale, 0.5 * bodyScale],
                [-0.25 * bodyScale, 0.15 * bodyScale, -0.3 * bodyScale],
                [0.25 * bodyScale, 0.15 * bodyScale, -0.3 * bodyScale]
            ];
            legPos.forEach(pos => {
                const leg = new THREE.Mesh(legGeom, this.createAnimalMaterial(color));
                leg.position.set(...pos);
                group.add(leg);
            });
            
            // Tail
            const tail = new THREE.Mesh(
                new THREE.CylinderGeometry(0.04 * bodyScale, 0.02 * bodyScale, 0.6 * bodyScale, 8),
                this.createAnimalMaterial(color)
            );
            tail.position.set(0, 0.9 * bodyScale, -0.8 * bodyScale);
            tail.rotation.x = Math.PI / 4;
            
            group.add(body, neck, head, snout, leftEar, rightEar, tail);
            return group;
        }
        
        // ===== WARTHOG/WILD BOAR =====
        if (name.includes('warthog') || name.includes('boar')) {
            const color = name.includes('warthog') ? 0x8A7A6A : 0x4A3A2A;
            const bodyScale = name.includes('warthog') ? 1 : 1.1;
            
            // Stocky body
            const body = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.4 * bodyScale, 1 * bodyScale, 16, 32),
                this.createAnimalMaterial(color)
            );
            body.rotation.z = Math.PI / 2;
            body.position.y = 0.5 * bodyScale;
            
            // Large head
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(0.5 * bodyScale, 0.45 * bodyScale, 0.6 * bodyScale),
                this.createAnimalMaterial(color)
            );
            head.position.set(0, 0.5 * bodyScale, 1 * bodyScale);
            
            // Long snout
            const snout = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15 * bodyScale, 0.18 * bodyScale, 0.5 * bodyScale, 16),
                this.createAnimalMaterial(color)
            );
            snout.position.set(0, 0.4 * bodyScale, 1.5 * bodyScale);
            snout.rotation.x = Math.PI / 2;
            
            // Tusks
            const tuskGeom = new THREE.ConeGeometry(0.04 * bodyScale, 0.35 * bodyScale, 8);
            const leftTusk = new THREE.Mesh(tuskGeom, this.createAnimalMaterial(0xFFFFF0));
            leftTusk.position.set(-0.12 * bodyScale, 0.4 * bodyScale, 1.7 * bodyScale);
            leftTusk.rotation.set(Math.PI / 6, 0, -Math.PI / 8);
            const rightTusk = new THREE.Mesh(tuskGeom, this.createAnimalMaterial(0xFFFFF0));
            rightTusk.position.set(0.12 * bodyScale, 0.4 * bodyScale, 1.7 * bodyScale);
            rightTusk.rotation.set(Math.PI / 6, 0, Math.PI / 8);
            
            // Warts (for warthog)
            if (name.includes('warthog')) {
                for (let i = 0; i < 4; i++) {
                    const wart = new THREE.Mesh(
                        new THREE.SphereGeometry(0.06 * bodyScale, 8, 8),
                        this.createAnimalMaterial(0xA08870)
                    );
                    wart.position.set(
                        (i % 2 === 0 ? -0.15 : 0.15) * bodyScale,
                        0.5 * bodyScale + (i < 2 ? 0.1 : -0.1) * bodyScale,
                        1.2 * bodyScale
                    );
                    group.add(wart);
                }
            }
            
            // Ears
            const earGeom = new THREE.ConeGeometry(0.12 * bodyScale, 0.25 * bodyScale, 12);
            const leftEar = new THREE.Mesh(earGeom, this.createAnimalMaterial(color));
            leftEar.position.set(-0.25 * bodyScale, 0.75 * bodyScale, 0.9 * bodyScale);
            const rightEar = new THREE.Mesh(earGeom, this.createAnimalMaterial(color));
            rightEar.position.set(0.25 * bodyScale, 0.75 * bodyScale, 0.9 * bodyScale);
            
            // Eyes
            addEyes(0, 0.6 * bodyScale, 1.3 * bodyScale, bodyScale * 0.8, 0.5);
            
            // Bristly mane (for boar)
            if (name.includes('boar')) {
                for (let i = 0; i < 6; i++) {
                    const bristle = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.02 * bodyScale, 0.01 * bodyScale, 0.15 * bodyScale, 8),
                        this.createAnimalMaterial(0x2A2A2A)
                    );
                    bristle.position.set(0, 0.7 * bodyScale, 0.7 * bodyScale - i * 0.15 * bodyScale);
                    bristle.rotation.x = -Math.PI / 6;
                    group.add(bristle);
                }
            }
            
            // Short legs
            const legGeom = new THREE.CylinderGeometry(0.08 * bodyScale, 0.1 * bodyScale, 0.7 * bodyScale, 12);
            const legPos = [
                [-0.25 * bodyScale, -0.15 * bodyScale, 0.5 * bodyScale],
                [0.25 * bodyScale, -0.15 * bodyScale, 0.5 * bodyScale],
                [-0.25 * bodyScale, -0.15 * bodyScale, -0.3 * bodyScale],
                [0.25 * bodyScale, -0.15 * bodyScale, -0.3 * bodyScale]
            ];
            legPos.forEach(pos => {
                const leg = new THREE.Mesh(legGeom, this.createAnimalMaterial(color));
                leg.position.set(...pos);
                group.add(leg);
            });
            
            // Thin tail
            const tail = new THREE.Mesh(
                new THREE.CylinderGeometry(0.03 * bodyScale, 0.02 * bodyScale, 0.5 * bodyScale, 8),
                this.createAnimalMaterial(color)
            );
            tail.position.set(0, 0.7 * bodyScale, -0.8 * bodyScale);
            tail.rotation.x = Math.PI / 3;
            
            group.add(body, head, snout, leftTusk, rightTusk, leftEar, rightEar, tail);
            return group;
        }
        
        // ===== SMALL MAMMALS (Raccoon, Red Panda, Badger, Honey Badger, Wolverine, Skunk, Otter, Sea Otter, Beaver, Meerkat, Mongoose, Opossum, Sloth, Pangolin, Porcupine, Armadillo, Anteater, Platypus, Tasmanian Devil) =====
        if (name.includes('raccoon') || name.includes('panda') || name.includes('badger') || name.includes('wolverine') || 
            name.includes('skunk') || name.includes('otter') || name.includes('beaver') || name.includes('meerkat') ||
            name.includes('mongoose') || name.includes('opossum') || name.includes('sloth') || name.includes('pangolin') ||
            name.includes('porcupine') || name.includes('armadillo') || name.includes('anteater') || name.includes('platypus') ||
            name.includes('tasmanian') || name.includes('devil')) {
            
            let color = 0x808080;
            let bodyScale = 0.5;
            let tailStyle = 'bushy';
            let specialFeature = 'none';
            
            // Determine species-specific attributes
            if (name.includes('raccoon')) {
                color = 0x6A6A6A;
                bodyScale = 0.5;
                tailStyle = 'ringed';
            } else if (name.includes('red') && name.includes('panda')) {
                color = 0xC84020;
                bodyScale = 0.55;
                tailStyle = 'ringed';
            } else if (name.includes('honey') && name.includes('badger')) {
                color = 0x2A2A2A;
                bodyScale = 0.45;
                specialFeature = 'stripe';
            } else if (name.includes('badger') && !name.includes('honey')) {
                color = 0x4A4A4A;
                bodyScale = 0.5;
                specialFeature = 'stripe';
            } else if (name.includes('wolverine')) {
                color = 0x3A2A1A;
                bodyScale = 0.6;
                tailStyle = 'bushy';
            } else if (name.includes('skunk')) {
                color = 0x1A1A1A;
                bodyScale = 0.4;
                specialFeature = 'stripe';
                tailStyle = 'bushy';
            } else if (name.includes('sea') && name.includes('otter')) {
                color = 0x5A4A3A;
                bodyScale = 0.7;
                tailStyle = 'thick';
            } else if (name.includes('otter')) {
                color = 0x6A5A4A;
                bodyScale = 0.5;
                tailStyle = 'thick';
            } else if (name.includes('beaver')) {
                color = 0x5A4A3A;
                bodyScale = 0.6;
                tailStyle = 'flat';
            } else if (name.includes('meerkat')) {
                color = 0xB8A888;
                bodyScale = 0.35;
                specialFeature = 'upright';
            } else if (name.includes('mongoose')) {
                color = 0x9A8A7A;
                bodyScale = 0.4;
                tailStyle = 'thin';
            } else if (name.includes('opossum')) {
                color = 0xC8C8C8;
                bodyScale = 0.45;
                tailStyle = 'rat';
            } else if (name.includes('sloth')) {
                color = 0x8A8A7A;
                bodyScale = 0.5;
                specialFeature = 'hanging';
            } else if (name.includes('pangolin')) {
                color = 0x8A7A6A;
                bodyScale = 0.5;
                specialFeature = 'scales';
            } else if (name.includes('porcupine')) {
                color = 0x5A5A5A;
                bodyScale = 0.5;
                specialFeature = 'quills';
            } else if (name.includes('armadillo')) {
                color = 0x7A6A5A;
                bodyScale = 0.45;
                specialFeature = 'armor';
            } else if (name.includes('anteater')) {
                color = 0xA09080;
                bodyScale = 0.7;
                specialFeature = 'snout';
            } else if (name.includes('platypus')) {
                color = 0x6A5A4A;
                bodyScale = 0.4;
                specialFeature = 'bill';
            } else if (name.includes('tasmanian') || name.includes('devil')) {
                color = 0x2A2A2A;
                bodyScale = 0.5;
                specialFeature = 'jaw';
            }
            
            // Body
            const body = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.25 * bodyScale, 0.6 * bodyScale, 16, 32),
                this.createAnimalMaterial(color)
            );
            
            if (specialFeature === 'upright') {
                body.position.y = 0.5 * bodyScale;
            } else {
                body.rotation.z = Math.PI / 2;
                body.position.y = 0.3 * bodyScale;
            }
            
            // Head
            let head;
            if (specialFeature === 'bill') {
                head = new THREE.Mesh(
                    new THREE.SphereGeometry(0.18 * bodyScale, 16, 16),
                    this.createAnimalMaterial(color)
                );
            } else if (specialFeature === 'snout') {
                head = new THREE.Mesh(
                    new THREE.ConeGeometry(0.15 * bodyScale, 0.5 * bodyScale, 16),
                    this.createAnimalMaterial(color)
                );
                head.rotation.x = Math.PI / 2;
            } else {
                head = new THREE.Mesh(
                    new THREE.SphereGeometry(0.2 * bodyScale, 32, 32),
                    this.createAnimalMaterial(color)
                );
            }
            
            if (specialFeature === 'upright') {
                head.position.set(0, 0.9 * bodyScale, 0.15 * bodyScale);
            } else {
                head.position.set(0, 0.3 * bodyScale, 0.5 * bodyScale);
            }
            
            // Special features
            if (specialFeature === 'bill') {
                const bill = new THREE.Mesh(
                    new THREE.BoxGeometry(0.25 * bodyScale, 0.08 * bodyScale, 0.15 * bodyScale),
                    this.createAnimalMaterial(0x3A3A2A)
                );
                bill.position.set(0, 0.28 * bodyScale, 0.7 * bodyScale);
                group.add(bill);
            } else if (specialFeature === 'stripe') {
                const stripe = new THREE.Mesh(
                    new THREE.BoxGeometry(0.15 * bodyScale, 0.3 * bodyScale, 0.8 * bodyScale),
                    this.createAnimalMaterial(0xFFFFFF)
                );
                if (specialFeature === 'upright') {
                    stripe.position.set(0, 0.5 * bodyScale, 0);
                } else {
                    stripe.position.set(0, 0.45 * bodyScale, 0);
                    stripe.rotation.z = Math.PI / 2;
                }
                group.add(stripe);
            } else if (specialFeature === 'scales') {
                for (let i = 0; i < 15; i++) {
                    const scale = new THREE.Mesh(
                        new THREE.ConeGeometry(0.08 * bodyScale, 0.12 * bodyScale, 6),
                        this.createAnimalMaterial(0x6A5A4A)
                    );
                    scale.position.set(0, 0.35 * bodyScale, -0.2 * bodyScale + i * 0.05 * bodyScale);
                    scale.rotation.x = -Math.PI / 2;
                    group.add(scale);
                }
            } else if (specialFeature === 'quills') {
                for (let i = 0; i < 20; i++) {
                    const quill = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.01 * bodyScale, 0.015 * bodyScale, 0.25 * bodyScale, 8),
                        this.createAnimalMaterial(i % 2 === 0 ? 0xFFFFFF : 0x2A2A2A)
                    );
                    const angle = (i / 20) * Math.PI;
                    quill.position.set(
                        Math.sin(angle) * 0.15 * bodyScale,
                        0.4 * bodyScale + Math.cos(angle) * 0.1 * bodyScale,
                        (Math.random() - 0.5) * 0.4 * bodyScale
                    );
                    quill.rotation.z = angle - Math.PI / 2;
                    group.add(quill);
                }
            } else if (specialFeature === 'armor') {
                for (let i = 0; i < 5; i++) {
                    const band = new THREE.Mesh(
                        new THREE.TorusGeometry(0.25 * bodyScale, 0.04 * bodyScale, 8, 16),
                        this.createAnimalMaterial(0x5A4A3A)
                    );
                    band.position.set(0, 0.3 * bodyScale, -0.2 * bodyScale + i * 0.12 * bodyScale);
                    band.rotation.x = Math.PI / 2;
                    group.add(band);
                }
            }
            
            // Ears (most have ears)
            if (!name.includes('sloth') && !name.includes('pangolin') && !name.includes('armadillo')) {
                const earSize = name.includes('meerkat') ? 0.15 : 0.12;
                const earGeom = new THREE.SphereGeometry(earSize * bodyScale, 12, 12);
                const earColor = name.includes('raccoon') ? 0x8A8A8A : color;
                
                const leftEar = new THREE.Mesh(earGeom, this.createAnimalMaterial(earColor));
                const rightEar = new THREE.Mesh(earGeom, this.createAnimalMaterial(earColor));
                
                if (specialFeature === 'upright') {
                    leftEar.position.set(-0.15 * bodyScale, 1.05 * bodyScale, 0.1 * bodyScale);
                    rightEar.position.set(0.15 * bodyScale, 1.05 * bodyScale, 0.1 * bodyScale);
                } else {
                    leftEar.position.set(-0.15 * bodyScale, 0.42 * bodyScale, 0.55 * bodyScale);
                    rightEar.position.set(0.15 * bodyScale, 0.42 * bodyScale, 0.55 * bodyScale);
                }
                group.add(leftEar, rightEar);
            }
            
            // Eyes
            if (specialFeature === 'upright') {
                addEyes(0, 0.95 * bodyScale, 0.25 * bodyScale, bodyScale * 0.8, 0.4);
            } else {
                addEyes(0, 0.35 * bodyScale, 0.65 * bodyScale, bodyScale * 0.8, 0.4);
            }
            
            // Legs
            const legGeom = new THREE.CylinderGeometry(0.05 * bodyScale, 0.06 * bodyScale, 0.4 * bodyScale, 12);
            let legPos;
            if (specialFeature === 'upright') {
                legPos = [[-0.12 * bodyScale, 0.1 * bodyScale, 0], [0.12 * bodyScale, 0.1 * bodyScale, 0]];
                // Arms
                const armGeom = new THREE.CylinderGeometry(0.04 * bodyScale, 0.05 * bodyScale, 0.3 * bodyScale, 12);
                const leftArm = new THREE.Mesh(armGeom, this.createAnimalMaterial(color));
                leftArm.position.set(-0.2 * bodyScale, 0.5 * bodyScale, 0);
                leftArm.rotation.z = Math.PI / 4;
                const rightArm = new THREE.Mesh(armGeom, this.createAnimalMaterial(color));
                rightArm.position.set(0.2 * bodyScale, 0.5 * bodyScale, 0);
                rightArm.rotation.z = -Math.PI / 4;
                group.add(leftArm, rightArm);
            } else {
                legPos = [
                    [-0.15 * bodyScale, 0, 0.25 * bodyScale],
                    [0.15 * bodyScale, 0, 0.25 * bodyScale],
                    [-0.15 * bodyScale, 0, -0.15 * bodyScale],
                    [0.15 * bodyScale, 0, -0.15 * bodyScale]
                ];
            }
            legPos.forEach(pos => {
                const leg = new THREE.Mesh(legGeom, this.createAnimalMaterial(color));
                leg.position.set(...pos);
                group.add(leg);
            });
            
            // Tail
            if (tailStyle === 'ringed') {
                const tailCurve = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(0, 0.3 * bodyScale, -0.4 * bodyScale),
                    new THREE.Vector3(0, 0.25 * bodyScale, -0.7 * bodyScale),
                    new THREE.Vector3(0, 0.2 * bodyScale, -1 * bodyScale)
                ]);
                const tail = new THREE.Mesh(
                    new THREE.TubeGeometry(tailCurve, 20, 0.08 * bodyScale, 12, false),
                    this.createAnimalMaterial(color)
                );
                group.add(tail);
                
                // Rings
                for (let i = 0; i < 5; i++) {
                    const ring = new THREE.Mesh(
                        new THREE.TorusGeometry(0.08 * bodyScale, 0.02 * bodyScale, 8, 12),
                        this.createAnimalMaterial(i % 2 === 0 ? 0x2A2A2A : 0xE8E8E8)
                    );
                    const t = i / 5;
                    const pos = tailCurve.getPoint(t);
                    ring.position.copy(pos);
                    ring.rotation.x = Math.PI / 2;
                    group.add(ring);
                }
            } else if (tailStyle === 'bushy') {
                const tailCurve = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(0, 0.3 * bodyScale, -0.4 * bodyScale),
                    new THREE.Vector3(0, 0.3 * bodyScale, -0.8 * bodyScale),
                    new THREE.Vector3(0, 0.35 * bodyScale, -1.1 * bodyScale)
                ]);
                const tail = new THREE.Mesh(
                    new THREE.TubeGeometry(tailCurve, 20, 0.12 * bodyScale, 12, false),
                    this.createAnimalMaterial(color)
                );
                group.add(tail);
            } else if (tailStyle === 'flat') {
                const tail = new THREE.Mesh(
                    new THREE.BoxGeometry(0.35 * bodyScale, 0.08 * bodyScale, 0.5 * bodyScale),
                    this.createAnimalMaterial(color)
                );
                tail.position.set(0, 0.2 * bodyScale, -0.7 * bodyScale);
                tail.rotation.x = -Math.PI / 6;
                group.add(tail);
            } else if (tailStyle === 'rat') {
                const tail = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.02 * bodyScale, 0.01 * bodyScale, 0.6 * bodyScale, 8),
                    this.createAnimalMaterial(0xF0D0D0)
                );
                tail.position.set(0, 0.2 * bodyScale, -0.7 * bodyScale);
                tail.rotation.x = Math.PI / 4;
                group.add(tail);
            } else if (tailStyle === 'thick') {
                const tail = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.08 * bodyScale, 0.05 * bodyScale, 0.5 * bodyScale, 12),
                    this.createAnimalMaterial(color)
                );
                tail.position.set(0, 0.25 * bodyScale, -0.7 * bodyScale);
                tail.rotation.x = Math.PI / 6;
                group.add(tail);
            }
            
            group.add(body, head);
            return group;
        }
        
        // ===== LARGE FLIGHTLESS BIRDS (Ostrich, Emu, Cassowary) =====
        if ((name.includes('ostrich') || name.includes('emu') || name.includes('cassowary')) && !name.includes('eagle')) {
            let color = 0x2A2A2A;
            let neckLength = 1.5;
            let bodyScale = 1;
            let hasCasque = false;
            
            if (name.includes('ostrich')) {
                color = 0x3A3A3A;
                neckLength = 2;
                bodyScale = 1.3;
            } else if (name.includes('emu')) {
                color = 0x4A4A3A;
                neckLength = 1.5;
                bodyScale = 1.1;
            } else if (name.includes('cassowary')) {
                color = 0x1A1A2A;
                neckLength = 1.3;
                bodyScale = 1.2;
                hasCasque = true;
            }
            
            // Body (round, fluffy)
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(0.6 * bodyScale, 32, 32),
                this.createAnimalMaterial(color)
            );
            body.scale.set(1, 1.2, 1.1);
            body.position.y = 1 * bodyScale;
            
            // Long neck
            const neck = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12 * bodyScale, 0.15 * bodyScale, neckLength * bodyScale, 16),
                this.createAnimalMaterial(name.includes('cassowary') ? 0x4A6ACA : color)
            );
            neck.position.set(0, 1.4 * bodyScale + neckLength * 0.3, 0);
            neck.rotation.x = -Math.PI / 10;
            
            // Small head
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.18 * bodyScale, 16, 16),
                this.createAnimalMaterial(name.includes('cassowary') ? 0x4A6ACA : color)
            );
            head.position.set(0, 1.4 * bodyScale + neckLength * 0.8, 0.15 * bodyScale);
            
            // Beak
            const beak = new THREE.Mesh(
                new THREE.ConeGeometry(0.06 * bodyScale, 0.25 * bodyScale, 12),
                this.createAnimalMaterial(0x8A8A6A)
            );
            beak.position.set(0, 1.4 * bodyScale + neckLength * 0.8, 0.35 * bodyScale);
            beak.rotation.x = Math.PI / 2;
            
            // Casque (for cassowary)
            if (hasCasque) {
                const casque = new THREE.Mesh(
                    new THREE.ConeGeometry(0.12 * bodyScale, 0.4 * bodyScale, 8),
                    this.createAnimalMaterial(0x6A4A2A)
                );
                casque.position.set(0, 1.6 * bodyScale + neckLength * 0.8, 0.1 * bodyScale);
                group.add(casque);
                
                // Wattles (red neck flaps)
                const wattle = new THREE.Mesh(
                    new THREE.SphereGeometry(0.08 * bodyScale, 8, 8),
                    this.createAnimalMaterial(0xCA2A2A)
                );
                wattle.position.set(0, 1.3 * bodyScale + neckLength * 0.6, 0.12 * bodyScale);
                group.add(wattle);
            }
            
            // Eyes
            addEyes(0, 1.45 * bodyScale + neckLength * 0.8, 0.25 * bodyScale, bodyScale * 0.6, 0.3);
            
            // Wings (vestigial, small)
            const wingGeom = new THREE.BoxGeometry(0.15 * bodyScale, 0.6 * bodyScale, 0.4 * bodyScale);
            const leftWing = new THREE.Mesh(wingGeom, this.createAnimalMaterial(color));
            leftWing.position.set(-0.5 * bodyScale, 1.1 * bodyScale, 0);
            leftWing.rotation.z = -Math.PI / 6;
            const rightWing = new THREE.Mesh(wingGeom, this.createAnimalMaterial(color));
            rightWing.position.set(0.5 * bodyScale, 1.1 * bodyScale, 0);
            rightWing.rotation.z = Math.PI / 6;
            
            // Powerful legs
            const legGeom = new THREE.CylinderGeometry(0.12 * bodyScale, 0.15 * bodyScale, 1.5 * bodyScale, 12);
            const leftLeg = new THREE.Mesh(legGeom, this.createAnimalMaterial(0xA89878));
            leftLeg.position.set(-0.25 * bodyScale, 0.25 * bodyScale, 0);
            const rightLeg = new THREE.Mesh(legGeom, this.createAnimalMaterial(0xA89878));
            rightLeg.position.set(0.25 * bodyScale, 0.25 * bodyScale, 0);
            
            // Large feet
            const footGeom = new THREE.BoxGeometry(0.25 * bodyScale, 0.1 * bodyScale, 0.35 * bodyScale);
            const leftFoot = new THREE.Mesh(footGeom, this.createAnimalMaterial(0x8A7A68));
            leftFoot.position.set(-0.25 * bodyScale, -0.5 * bodyScale, 0.1 * bodyScale);
            const rightFoot = new THREE.Mesh(footGeom, this.createAnimalMaterial(0x8A7A68));
            rightFoot.position.set(0.25 * bodyScale, -0.5 * bodyScale, 0.1 * bodyScale);
            
            // Talons (dangerous for cassowary)
            if (hasCasque) {
                const talon = new THREE.Mesh(
                    new THREE.ConeGeometry(0.04 * bodyScale, 0.15 * bodyScale, 8),
                    this.createAnimalMaterial(0x2A2A2A)
                );
                talon.position.set(-0.25 * bodyScale, -0.55 * bodyScale, 0.25 * bodyScale);
                talon.rotation.x = Math.PI / 6;
                group.add(talon);
                
                const talon2 = new THREE.Mesh(
                    new THREE.ConeGeometry(0.04 * bodyScale, 0.15 * bodyScale, 8),
                    this.createAnimalMaterial(0x2A2A2A)
                );
                talon2.position.set(0.25 * bodyScale, -0.55 * bodyScale, 0.25 * bodyScale);
                talon2.rotation.x = Math.PI / 6;
                group.add(talon2);
            }
            
            // Small tail feathers
            for (let i = 0; i < 5; i++) {
                const feather = new THREE.Mesh(
                    new THREE.BoxGeometry(0.08 * bodyScale, 0.25 * bodyScale, 0.05 * bodyScale),
                    this.createAnimalMaterial(color)
                );
                feather.position.set((i - 2) * 0.08 * bodyScale, 0.9 * bodyScale, -0.6 * bodyScale);
                feather.rotation.x = Math.PI / 4;
                group.add(feather);
            }
            
            group.add(body, neck, head, beak, leftWing, rightWing, leftLeg, rightLeg, leftFoot, rightFoot);
            return group;
        }
        
        // ===== WATERBIRDS (Flamingo, Goose, Swan, Stork, Pelican) =====
        if (name.includes('flamingo') || name.includes('goose') || name.includes('swan') || 
            name.includes('stork') || name.includes('pelican')) {
            let color = 0xF0F0F0;
            let neckLength = 0.8;
            let legLength = 0.8;
            let bodyScale = 0.8;
            let beakStyle = 'normal';
            
            if (name.includes('flamingo')) {
                color = 0xFFB0C0;
                neckLength = 1.2;
                legLength = 1.5;
                bodyScale = 0.7;
                beakStyle = 'curved';
            } else if (name.includes('goose')) {
                color = 0xF0F0F0;
                neckLength = 0.8;
                legLength = 0.6;
                bodyScale = 0.8;
            } else if (name.includes('swan')) {
                color = 0xFFFFFF;
                neckLength = 1.3;
                legLength = 0.7;
                bodyScale = 0.9;
            } else if (name.includes('stork')) {
                color = 0xF0F0F0;
                neckLength = 1;
                legLength = 1.3;
                bodyScale = 0.8;
            } else if (name.includes('pelican')) {
                color = 0xF0E8D8;
                neckLength = 0.7;
                legLength = 0.7;
                bodyScale = 0.9;
                beakStyle = 'pouch';
            }
            
            // Body
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(0.4 * bodyScale, 32, 32),
                this.createAnimalMaterial(color)
            );
            body.scale.set(1.3, 1, 1.1);
            body.position.y = 0.5 * bodyScale + legLength;
            
            // Curved neck
            const neckCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0, 0.7 * bodyScale + legLength, 0.5 * bodyScale),
                new THREE.Vector3(0, 0.9 * bodyScale + legLength, 0.7 * bodyScale),
                new THREE.Vector3(0, 0.9 * bodyScale + legLength + neckLength * 0.5, 0.8 * bodyScale),
                new THREE.Vector3(0, 0.7 * bodyScale + legLength + neckLength, 0.9 * bodyScale)
            ]);
            const neck = new THREE.Mesh(
                new THREE.TubeGeometry(neckCurve, 25, 0.08 * bodyScale, 12, false),
                this.createAnimalMaterial(color)
            );
            
            // Head
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.15 * bodyScale, 16, 16),
                this.createAnimalMaterial(color)
            );
            head.position.set(0, 0.7 * bodyScale + legLength + neckLength, 1 * bodyScale);
            head.scale.set(1, 0.9, 1.1);
            
            // Beak
            let beak;
            if (beakStyle === 'curved') {
                beak = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.03 * bodyScale, 0.05 * bodyScale, 0.3 * bodyScale, 12),
                    this.createAnimalMaterial(0x2A2A2A)
                );
                beak.position.set(0, 0.6 * bodyScale + legLength + neckLength, 1.2 * bodyScale);
                beak.rotation.x = Math.PI / 3;
            } else if (beakStyle === 'pouch') {
                beak = new THREE.Mesh(
                    new THREE.ConeGeometry(0.12 * bodyScale, 0.5 * bodyScale, 12),
                    this.createAnimalMaterial(0xD8C060)
                );
                beak.position.set(0, 0.65 * bodyScale + legLength + neckLength, 1.3 * bodyScale);
                beak.rotation.x = Math.PI / 2;
                
                // Pouch
                const pouch = new THREE.Mesh(
                    new THREE.SphereGeometry(0.15 * bodyScale, 12, 12),
                    this.createAnimalMaterial(0xE8D070)
                );
                pouch.position.set(0, 0.5 * bodyScale + legLength + neckLength, 1.3 * bodyScale);
                pouch.scale.set(1, 1.5, 1);
                group.add(pouch);
            } else {
                beak = new THREE.Mesh(
                    new THREE.ConeGeometry(0.05 * bodyScale, 0.25 * bodyScale, 12),
                    this.createAnimalMaterial(0xE8A040)
                );
                beak.position.set(0, 0.7 * bodyScale + legLength + neckLength, 1.25 * bodyScale);
                beak.rotation.x = Math.PI / 2;
            }
            
            // Eyes
            addEyes(0, 0.75 * bodyScale + legLength + neckLength, 1.12 * bodyScale, bodyScale * 0.6, 0.3);
            
            // Wings (folded)
            const wingGeom = new THREE.BoxGeometry(0.2 * bodyScale, 0.6 * bodyScale, 0.5 * bodyScale);
            const leftWing = new THREE.Mesh(wingGeom, this.createAnimalMaterial(color));
            leftWing.position.set(-0.45 * bodyScale, 0.6 * bodyScale + legLength, 0);
            leftWing.rotation.z = -Math.PI / 8;
            const rightWing = new THREE.Mesh(wingGeom, this.createAnimalMaterial(color));
            rightWing.position.set(0.45 * bodyScale, 0.6 * bodyScale + legLength, 0);
            rightWing.rotation.z = Math.PI / 8;
            
            // Long legs
            const legGeom = new THREE.CylinderGeometry(0.04 * bodyScale, 0.05 * bodyScale, legLength * bodyScale, 12);
            const leftLeg = new THREE.Mesh(legGeom, this.createAnimalMaterial(name.includes('flamingo') ? 0xFFB0C0 : 0xE8A060));
            leftLeg.position.set(-0.15 * bodyScale, legLength * 0.5, 0);
            const rightLeg = new THREE.Mesh(legGeom, this.createAnimalMaterial(name.includes('flamingo') ? 0xFFB0C0 : 0xE8A060));
            rightLeg.position.set(0.15 * bodyScale, legLength * 0.5, 0);
            
            // Webbed feet
            const footGeom = new THREE.BoxGeometry(0.18 * bodyScale, 0.05 * bodyScale, 0.22 * bodyScale);
            const leftFoot = new THREE.Mesh(footGeom, this.createAnimalMaterial(name.includes('flamingo') ? 0xFFB0C0 : 0xE8A060));
            leftFoot.position.set(-0.15 * bodyScale, 0.02 * bodyScale, 0.05 * bodyScale);
            const rightFoot = new THREE.Mesh(footGeom, this.createAnimalMaterial(name.includes('flamingo') ? 0xFFB0C0 : 0xE8A060));
            rightFoot.position.set(0.15 * bodyScale, 0.02 * bodyScale, 0.05 * bodyScale);
            
            // Tail feathers
            for (let i = 0; i < 5; i++) {
                const feather = new THREE.Mesh(
                    new THREE.BoxGeometry(0.06 * bodyScale, 0.2 * bodyScale, 0.04 * bodyScale),
                    this.createAnimalMaterial(color)
                );
                feather.position.set((i - 2) * 0.06 * bodyScale, 0.5 * bodyScale + legLength, -0.5 * bodyScale);
                feather.rotation.x = Math.PI / 6;
                group.add(feather);
            }
            
            group.add(body, neck, head, beak, leftWing, rightWing, leftLeg, rightLeg, leftFoot, rightFoot);
            return group;
        }
        
        // ===== MARINE ANIMALS (Seal, Sea Lion, Walrus, Manatee, Octopus, Jellyfish, Electric Eel, Mantis Shrimp, Piranha) =====
        if ((name.includes('seal') || name.includes('walrus') || name.includes('manatee') || 
             name.includes('octopus') || name.includes('jellyfish') || name.includes('eel') ||
             name.includes('shrimp') || name.includes('piranha')) && !name.includes('leopard')) {
            
            let bodyType = 'seal';
            let color = 0x5A5A5A;
            let bodyScale = 1;
            
            if (name.includes('walrus')) {
                bodyType = 'walrus';
                color = 0x8A7A6A;
                bodyScale = 1.4;
            } else if (name.includes('sea') && name.includes('lion')) {
                bodyType = 'sea_lion';
                color = 0x6A5A4A;
                bodyScale = 1.2;
            } else if (name.includes('seal')) {
                bodyType = 'seal';
                color = 0x5A5A5A;
                bodyScale = 1;
            } else if (name.includes('manatee')) {
                bodyType = 'manatee';
                color = 0x7A7A6A;
                bodyScale = 1.3;
            } else if (name.includes('octopus')) {
                bodyType = 'octopus';
                color = 0xA85A8A;
                bodyScale = 0.8;
            } else if (name.includes('jellyfish')) {
                bodyType = 'jellyfish';
                color = 0x8AC8FF;
                bodyScale = 0.6;
            } else if (name.includes('eel')) {
                bodyType = 'eel';
                color = 0x4A4A3A;
                bodyScale = 1.2;
            } else if (name.includes('shrimp')) {
                bodyType = 'shrimp';
                color = 0x60C870;
                bodyScale = 0.4;
            } else if (name.includes('piranha')) {
                bodyType = 'piranha';
                color = 0x8A6A5A;
                bodyScale = 0.5;
            }
            
            if (bodyType === 'seal' || bodyType === 'sea_lion' || bodyType === 'walrus') {
                // Streamlined body
                const body = new THREE.Mesh(
                    new THREE.CapsuleGeometry(0.4 * bodyScale, 1.2 * bodyScale, 16, 32),
                    this.createAnimalMaterial(color)
                );
                body.rotation.z = Math.PI / 2;
                body.position.y = 0.3 * bodyScale;
                
                // Head
                const head = new THREE.Mesh(
                    new THREE.SphereGeometry(0.35 * bodyScale, 32, 32),
                    this.createAnimalMaterial(color)
                );
                head.position.set(0, 0.3 * bodyScale, 0.9 * bodyScale);
                head.scale.set(1, 0.9, 1.1);
                
                // Snout
                const snout = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.15 * bodyScale, 0.18 * bodyScale, 0.25 * bodyScale, 16),
                    this.createAnimalMaterial(color)
                );
                snout.position.set(0, 0.25 * bodyScale, 1.2 * bodyScale);
                snout.rotation.x = Math.PI / 2;
                
                // Whiskers
                for (let i = 0; i < 6; i++) {
                    const whisker = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.01 * bodyScale, 0.005 * bodyScale, 0.3 * bodyScale, 6),
                        this.createAnimalMaterial(0xFFFFFF)
                    );
                    const side = i % 2 === 0 ? -1 : 1;
                    whisker.position.set(side * 0.2 * bodyScale, 0.25 * bodyScale, 1.25 * bodyScale);
                    whisker.rotation.set(0, 0, side * Math.PI / 4);
                    whisker.rotation.y = (i / 2) * 0.3;
                    group.add(whisker);
                }
                
                // Eyes
                addEyes(0, 0.4 * bodyScale, 1.15 * bodyScale, bodyScale * 0.8, 0.4);
                
                // Tusks (for walrus)
                if (bodyType === 'walrus') {
                    const tuskGeom = new THREE.ConeGeometry(0.06 * bodyScale, 0.8 * bodyScale, 8);
                    const leftTusk = new THREE.Mesh(tuskGeom, this.createAnimalMaterial(0xFFFFF0));
                    leftTusk.position.set(-0.12 * bodyScale, 0.1 * bodyScale, 1.35 * bodyScale);
                    leftTusk.rotation.x = Math.PI / 2;
                    leftTusk.rotation.z = -Math.PI / 12;
                    const rightTusk = new THREE.Mesh(tuskGeom, this.createAnimalMaterial(0xFFFFF0));
                    rightTusk.position.set(0.12 * bodyScale, 0.1 * bodyScale, 1.35 * bodyScale);
                    rightTusk.rotation.x = Math.PI / 2;
                    rightTusk.rotation.z = Math.PI / 12;
                    group.add(leftTusk, rightTusk);
                }
                
                // Flippers
                const flipperGeom = new THREE.BoxGeometry(0.5 * bodyScale, 0.1 * bodyScale, 0.25 * bodyScale);
                const leftFlipper = new THREE.Mesh(flipperGeom, this.createAnimalMaterial(color));
                leftFlipper.position.set(-0.4 * bodyScale, 0.15 * bodyScale, 0.3 * bodyScale);
                leftFlipper.rotation.set(0, -Math.PI / 6, -Math.PI / 6);
                const rightFlipper = new THREE.Mesh(flipperGeom, this.createAnimalMaterial(color));
                rightFlipper.position.set(0.4 * bodyScale, 0.15 * bodyScale, 0.3 * bodyScale);
                rightFlipper.rotation.set(0, Math.PI / 6, Math.PI / 6);
                
                // Back flippers
                const backFlipperGeom = new THREE.BoxGeometry(0.4 * bodyScale, 0.08 * bodyScale, 0.15 * bodyScale);
                const backFlippers = new THREE.Mesh(backFlipperGeom, this.createAnimalMaterial(color));
                backFlippers.position.set(0, 0.2 * bodyScale, -0.8 * bodyScale);
                
                group.add(body, head, snout, leftFlipper, rightFlipper, backFlippers);
                return group;
            } else if (bodyType === 'manatee') {
                // Round body
                const body = new THREE.Mesh(
                    new THREE.SphereGeometry(0.7 * bodyScale, 32, 32),
                    this.createAnimalMaterial(color)
                );
                body.scale.set(1.5, 1, 1.2);
                body.position.y = 0.4 * bodyScale;
                
                // Head
                const head = new THREE.Mesh(
                    new THREE.SphereGeometry(0.5 * bodyScale, 32, 32),
                    this.createAnimalMaterial(color)
                );
                head.position.set(0, 0.3 * bodyScale, 1.3 * bodyScale);
                head.scale.set(1, 0.9, 1);
                
                // Snout
                const snout = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.2 * bodyScale, 0.25 * bodyScale, 0.3 * bodyScale, 16),
                    this.createAnimalMaterial(color)
                );
                snout.position.set(0, 0.2 * bodyScale, 1.7 * bodyScale);
                snout.rotation.x = Math.PI / 2;
                
                // Eyes
                addEyes(0, 0.45 * bodyScale, 1.6 * bodyScale, bodyScale * 0.8, 0.6);
                
                // Flippers
                const flipperGeom = new THREE.BoxGeometry(0.6 * bodyScale, 0.12 * bodyScale, 0.3 * bodyScale);
                const leftFlipper = new THREE.Mesh(flipperGeom, this.createAnimalMaterial(color));
                leftFlipper.position.set(-0.9 * bodyScale, 0.2 * bodyScale, 0.5 * bodyScale);
                leftFlipper.rotation.z = -Math.PI / 6;
                const rightFlipper = new THREE.Mesh(flipperGeom, this.createAnimalMaterial(color));
                rightFlipper.position.set(0.9 * bodyScale, 0.2 * bodyScale, 0.5 * bodyScale);
                rightFlipper.rotation.z = Math.PI / 6;
                
                // Tail
                const tail = new THREE.Mesh(
                    new THREE.BoxGeometry(0.8 * bodyScale, 0.1 * bodyScale, 0.4 * bodyScale),
                    this.createAnimalMaterial(color)
                );
                tail.position.set(0, 0.3 * bodyScale, -1.2 * bodyScale);
                
                group.add(body, head, snout, leftFlipper, rightFlipper, tail);
                return group;
            } else if (bodyType === 'octopus') {
                // Head/mantle
                const head = new THREE.Mesh(
                    new THREE.SphereGeometry(0.5 * bodyScale, 32, 32),
                    this.createAnimalMaterial(color)
                );
                head.position.y = 0.5 * bodyScale;
                head.scale.set(1, 1.3, 1);
                
                // Eyes (large)
                addEyes(0, 0.6 * bodyScale, 0.45 * bodyScale, bodyScale * 1.2, 0.5);
                
                // 8 tentacles
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const curve = new THREE.CatmullRomCurve3([
                        new THREE.Vector3(0, 0.2 * bodyScale, 0),
                        new THREE.Vector3(Math.sin(angle) * 0.3 * bodyScale, 0, Math.cos(angle) * 0.3 * bodyScale),
                        new THREE.Vector3(Math.sin(angle) * 0.6 * bodyScale, -0.3 * bodyScale, Math.cos(angle) * 0.6 * bodyScale),
                        new THREE.Vector3(Math.sin(angle) * 0.8 * bodyScale, -0.5 * bodyScale, Math.cos(angle) * 0.8 * bodyScale)
                    ]);
                    const tentacle = new THREE.Mesh(
                        new THREE.TubeGeometry(curve, 20, 0.08 * bodyScale * (1 - i * 0.01), 12, false),
                        this.createAnimalMaterial(color)
                    );
                    group.add(tentacle);
                    
                    // Suckers
                    for (let j = 0; j < 5; j++) {
                        const t = j / 5;
                        const pos = curve.getPoint(t);
                        const sucker = new THREE.Mesh(
                            new THREE.SphereGeometry(0.03 * bodyScale, 8, 8),
                            this.createAnimalMaterial(0xFFD0FF)
                        );
                        sucker.position.copy(pos);
                        group.add(sucker);
                    }
                }
                
                group.add(head);
                return group;
            } else if (bodyType === 'jellyfish') {
                // Bell (dome)
                const bell = new THREE.Mesh(
                    new THREE.SphereGeometry(0.5 * bodyScale, 32, 32),
                    new THREE.MeshStandardMaterial({
                        color: color,
                        transparent: true,
                        opacity: 0.6,
                        emissive: color,
                        emissiveIntensity: 0.3
                    })
                );
                bell.scale.set(1, 0.7, 1);
                bell.position.y = 0.5 * bodyScale;
                
                // Tentacles (many, flowing)
                for (let i = 0; i < 20; i++) {
                    const angle = (i / 20) * Math.PI * 2;
                    const length = 0.8 + Math.random() * 0.4;
                    const curve = new THREE.CatmullRomCurve3([
                        new THREE.Vector3(0, 0.2 * bodyScale, 0),
                        new THREE.Vector3(Math.sin(angle) * 0.3 * bodyScale, 0, Math.cos(angle) * 0.3 * bodyScale),
                        new THREE.Vector3(Math.sin(angle) * 0.35 * bodyScale, -length * 0.5 * bodyScale, Math.cos(angle) * 0.35 * bodyScale),
                        new THREE.Vector3(Math.sin(angle + 0.2) * 0.3 * bodyScale, -length * bodyScale, Math.cos(angle + 0.2) * 0.3 * bodyScale)
                    ]);
                    const tentacle = new THREE.Mesh(
                        new THREE.TubeGeometry(curve, 15, 0.01 * bodyScale, 8, false),
                        new THREE.MeshStandardMaterial({
                            color: color,
                            transparent: true,
                            opacity: 0.7,
                            emissive: color,
                            emissiveIntensity: 0.2
                        })
                    );
                    group.add(tentacle);
                }
                
                group.add(bell);
                return group;
            } else if (bodyType === 'piranha') {
                // Fish body
                const body = new THREE.Mesh(
                    new THREE.SphereGeometry(0.3 * bodyScale, 32, 32),
                    this.createAnimalMaterial(color)
                );
                body.scale.set(1.2, 1, 1.5);
                body.position.y = 0.3 * bodyScale;
                
                // Head with jaw
                const jaw = new THREE.Mesh(
                    new THREE.BoxGeometry(0.25 * bodyScale, 0.15 * bodyScale, 0.2 * bodyScale),
                    this.createAnimalMaterial(color)
                );
                jaw.position.set(0, 0.2 * bodyScale, 0.5 * bodyScale);
                
                // Sharp teeth
                for (let i = 0; i < 8; i++) {
                    const tooth = new THREE.Mesh(
                        new THREE.ConeGeometry(0.02 * bodyScale, 0.05 * bodyScale, 6),
                        this.createAnimalMaterial(0xFFFFFF)
                    );
                    tooth.position.set((i - 3.5) * 0.04 * bodyScale, 0.25 * bodyScale, 0.58 * bodyScale);
                    tooth.rotation.x = Math.PI;
                    group.add(tooth);
                }
                
                // Eyes
                addEyes(0, 0.38 * bodyScale, 0.48 * bodyScale, bodyScale * 0.6, 0.35);
                
                // Dorsal fin
                const dorsalFin = new THREE.Mesh(
                    new THREE.ConeGeometry(0.15 * bodyScale, 0.25 * bodyScale, 4),
                    this.createAnimalMaterial(color)
                );
                dorsalFin.position.set(0, 0.5 * bodyScale, 0);
                dorsalFin.rotation.z = Math.PI;
                
                // Tail fin
                const tailFin = new THREE.Mesh(
                    new THREE.BoxGeometry(0.05 * bodyScale, 0.3 * bodyScale, 0.25 * bodyScale),
                    this.createAnimalMaterial(color)
                );
                tailFin.position.set(0, 0.3 * bodyScale, -0.5 * bodyScale);
                
                group.add(body, jaw, dorsalFin, tailFin);
                return group;
            }
            
            // Default for other marine animals
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(0.5 * bodyScale, 32, 32),
                this.createAnimalMaterial(color)
            );
            body.position.y = 0.3 * bodyScale;
            group.add(body);
            return group;
        }
        
        // Default - use original primitive
        const geometry = this.getPrimitiveGeometry(name);
        const mesh = new THREE.Mesh(geometry, this.createAnimalMaterial(this.getAnimalColor(name)));
        group.add(mesh);
        return group;
    }
    
    createAnimalMaterial(color) {
        return new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.7,
            metalness: 0.2,
            emissive: 0x00d4ff,
            emissiveIntensity: 0.08
        });
    }
    
    getPrimitiveGeometry(animalType) {
        const type = animalType.toLowerCase();
        
        // Animal-specific geometries
        if (type.includes('elephant') || type.includes('hippo')) {
            return new THREE.SphereGeometry(1, 32, 32);
        } else if (type.includes('crocodile') || type.includes('shark') || type.includes('lizard')) {
            return new THREE.CylinderGeometry(0.3, 0.5, 2, 16);
        } else if (type.includes('bird') || type.includes('eagle') || type.includes('hawk')) {
            return new THREE.ConeGeometry(0.5, 1.5, 8);
        } else if (type.includes('snake')) {
            return new THREE.TorusGeometry(0.8, 0.2, 16, 100);
        } else if (type.includes('fish')) {
            return new THREE.TetrahedronGeometry(1);
        } else if (type.includes('bear') || type.includes('lion') || type.includes('tiger') || type.includes('wolf')) {
            return new THREE.BoxGeometry(1.2, 1, 1.5);
        } else if (type.includes('deer') || type.includes('gazelle') || type.includes('antelope')) {
            return new THREE.CapsuleGeometry(0.4, 1.5, 8, 16);
        } else {
            // Default animal shape
            return new THREE.DodecahedronGeometry(1);
        }
    }
    
    getAnimalColor(animalType) {
        const type = animalType.toLowerCase();
        
        if (type.includes('elephant')) return 0x888888;
        if (type.includes('lion') || type.includes('tiger')) return 0xD4A574;
        if (type.includes('bear')) return 0x5C4033;
        if (type.includes('crocodile')) return 0x4A5F3A;
        if (type.includes('shark')) return 0x4A6D8C;
        if (type.includes('bird') || type.includes('eagle')) return 0x8B7355;
        if (type.includes('snake')) return 0x3D5C2F;
        if (type.includes('zebra')) return 0xFFFFFF;
        if (type.includes('giraffe')) return 0xD4A574;
        if (type.includes('rhino')) return 0x808080;
        if (type.includes('hippo')) return 0x696969;
        
        return 0x6B8E23; // Default olive/nature color
    }
    
    addDetailShapes(group, animalType) {
        const type = animalType.toLowerCase();
        
        // Add eyes
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            emissive: 0x00d4ff,
            emissiveIntensity: 0.5
        });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        
        if (type.includes('elephant') || type.includes('bear') || type.includes('lion') || type.includes('tiger')) {
            leftEye.position.set(-0.3, 0.5, 0.8);
            rightEye.position.set(0.3, 0.5, 0.8);
        } else {
            leftEye.position.set(-0.2, 0.3, 0.9);
            rightEye.position.set(0.2, 0.3, 0.9);
        }
        
        group.add(leftEye);
        group.add(rightEye);
        
        // Add glow effect around model
        const glowGeometry = new THREE.SphereGeometry(1.5, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00d4ff,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);
    }
    
    centerAndScaleModel() {
        if (!this.currentModel) return;
        
        // Calculate bounding box
        const box = new THREE.Box3().setFromObject(this.currentModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Center the model
        this.currentModel.position.x = -center.x;
        this.currentModel.position.y = -center.y;
        this.currentModel.position.z = -center.z;
        
        // Scale to fit
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        this.currentModel.scale.multiplyScalar(scale);
    }
    
    clearModel() {
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
            this.currentModel.traverse(object => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            this.currentModel = null;
        }
    }
    
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // Update animations
        if (this.mixer) {
            this.mixer.update(0.016); // ~60fps
        }
        
        // Rotate model
        if (this.currentModel) {
            this.currentModel.rotation.y += 0.005;
        }
        
        // Update controls
        if (this.controls) {
            this.controls.update();
        }
        
        // Render
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        if (!this.container) return;
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    dispose() {
        // Cancel animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Clear model
        this.clearModel();
        
        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
            if (this.container && this.renderer.domElement) {
                this.container.removeChild(this.renderer.domElement);
            }
        }
        
        // Remove controls
        if (this.controls) {
            this.controls.dispose();
        }
    }
}

// Global viewer instance
let characterViewer = null;
let fighter1Viewer = null;
let fighter2Viewer = null;

// Initialize viewers when DOM is ready
function init3DViewers() {
    // Create character showcase viewer
    const showcaseContainer = document.querySelector('.character-model-container');
    if (showcaseContainer && !showcaseContainer.querySelector('canvas')) {
        showcaseContainer.innerHTML = '<div id="character-3d-viewer"></div>';
        characterViewer = new Animal3DViewer('character-3d-viewer');
    }
    
    // Note: Fighter viewers will be initialized when compare mode is activated
}

// Load 3D model for an animal
function load3DModel(viewer, animalName, animalClass) {
    if (!viewer) return;
    
    // Check if we have a real 3D model in the database
    const modelData = window.ANIMAL_3D_MODELS && window.ANIMAL_3D_MODELS[animalName];
    
    if (modelData && modelData.model_url && modelData.model_type === 'gltf') {
        // Try to load GLTF model
        const scale = modelData.scale || 1.0;
        viewer.loadGLTFModel(
            modelData.model_url,
            scale,
            () => {
                console.log(`Successfully loaded 3D model for ${animalName}`);
            },
            () => {
                // Fallback to primitive on error
                console.log(`Failed to load 3D model for ${animalName}, using primitive`);
                const modelType = animalName.toLowerCase();
                viewer.loadPrimitiveModel(animalName, modelType);
            }
        );
    } else {
        // Use primitive models as fallback
        const modelType = animalName.toLowerCase();
        viewer.loadPrimitiveModel(animalName, modelType);
    }
}

// Export for use in main script
window.Animal3DViewer = Animal3DViewer;
window.init3DViewers = init3DViewers;
window.load3DModel = load3DModel;
