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
        
        // ===== ELEPHANTS =====
        if (name.includes('elephant')) {
            // Body (large oval)
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(1.2, 32, 32),
                this.createAnimalMaterial(0x808080)
            );
            body.scale.set(1.3, 1.1, 1.8);
            
            // Head (smaller sphere)
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.7, 32, 32),
                this.createAnimalMaterial(0x787878)
            );
            head.position.set(0, 0.5, 1.7);
            
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
            
            group.add(body, head, snout, leftEar, rightEar, tail);
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
            
            group.add(body, head, leftEar, rightEar, leftArm, rightArm, leftLeg, rightLeg, leftFoot, rightFoot, tail);
            return group;
        }
        
        // Default - use original primitive
        const geometry = this.getPrimitiveGeometry(animalType);
        const mesh = new THREE.Mesh(geometry, this.createAnimalMaterial(this.getAnimalColor(animalType)));
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
