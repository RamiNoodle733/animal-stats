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
    
    createEnhancedAnimalModel(animalType) {
        const type = animalType.toLowerCase();
        const group = new THREE.Group();
        
        // Elephant - body + trunk + ears + tusks
        if (type.includes('elephant')) {
            const body = new THREE.Mesh(
                new THREE.SphereGeometry(1, 32, 32),
                this.createAnimalMaterial(0x888888)
            );
            body.scale.set(1.2, 1, 1.5);
            
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.6, 32, 32),
                this.createAnimalMaterial(0x888888)
            );
            head.position.set(0, 0.4, 1.3);
            
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15, 0.2, 1.2, 16),
                this.createAnimalMaterial(0x888888)
            );
            trunk.position.set(0, -0.3, 1.8);
            trunk.rotation.x = Math.PI / 6;
            
            group.add(body, head, trunk);
            return group;
        }
        
        // Crocodile/Alligator - long streamlined body
        if (type.includes('crocodile') || type.includes('alligator')) {
            const body = new THREE.Mesh(
                new THREE.CylinderGeometry(0.3, 0.4, 2.5, 16),
                this.createAnimalMaterial(0x4A5F3A)
            );
            body.rotation.z = Math.PI / 2;
            
            const head = new THREE.Mesh(
                new THREE.ConeGeometry(0.35, 0.8, 8),
                this.createAnimalMaterial(0x4A5F3A)
            );
            head.position.set(1.7, 0, 0);
            head.rotation.z = -Math.PI / 2;
            
            const tail = new THREE.Mesh(
                new THREE.ConeGeometry(0.25, 1.2, 8),
                this.createAnimalMaterial(0x4A5F3A)
            );
            tail.position.set(-1.7, 0, 0);
            tail.rotation.z = Math.PI / 2;
            
            group.add(body, head, tail);
            return group;
        }
        
        // Shark - streamlined aquatic predator
        if (type.includes('shark')) {
            const body = new THREE.Mesh(
                new THREE.CylinderGeometry(0.4, 0.2, 2, 16),
                this.createAnimalMaterial(0x4A6D8C)
            );
            body.rotation.z = Math.PI / 2;
            
            const head = new THREE.Mesh(
                new THREE.ConeGeometry(0.4, 0.8, 8),
                this.createAnimalMaterial(0x4A6D8C)
            );
            head.position.set(1.4, 0, 0);
            head.rotation.z = -Math.PI / 2;
            
            const dorsalFin = new THREE.Mesh(
                new THREE.ConeGeometry(0.3, 0.8, 4),
                this.createAnimalMaterial(0x3A5D7C)
            );
            dorsalFin.position.set(-0.2, 0.7, 0);
            
            group.add(body, head, dorsalFin);
            return group;
        }
        
        // Bear/Lion/Tiger - quadrupedal predator
        if (type.includes('bear') || type.includes('lion') || type.includes('tiger') || type.includes('leopard') || type.includes('jaguar') || type.includes('cougar')) {
            const color = type.includes('bear') ? 0x5C4033 : 0xD4A574;
            
            const body = new THREE.Mesh(
                new THREE.BoxGeometry(1.5, 0.8, 1),
                this.createAnimalMaterial(color)
            );
            
            const head = new THREE.Mesh(
                new THREE.BoxGeometry(0.7, 0.7, 0.7),
                this.createAnimalMaterial(color)
            );
            head.position.set(0, 0.2, 1);
            
            const ears = [
                new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 8), this.createAnimalMaterial(color)),
                new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 8), this.createAnimalMaterial(color))
            ];
            ears[0].position.set(-0.3, 0.5, 1.2);
            ears[1].position.set(0.3, 0.5, 1.2);
            
            group.add(body, head, ...ears);
            return group;
        }
        
        // Bird/Eagle - flying predator
        if (type.includes('bird') || type.includes('eagle') || type.includes('falcon') || type.includes('hawk')) {
            const body = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.3, 1, 8, 16),
                this.createAnimalMaterial(0x8B7355)
            );
            
            const head = new THREE.Mesh(
                new THREE.SphereGeometry(0.35, 16, 16),
                this.createAnimalMaterial(0x9B8365)
            );
            head.position.set(0, 0.8, 0);
            
            const beak = new THREE.Mesh(
                new THREE.ConeGeometry(0.1, 0.4, 8),
                this.createAnimalMaterial(0xFFD700)
            );
            beak.position.set(0, 0.8, 0.3);
            beak.rotation.x = Math.PI / 2;
            
            const wings = [
                new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.8), this.createAnimalMaterial(0x7B6345)),
                new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.8), this.createAnimalMaterial(0x7B6345))
            ];
            wings[0].position.set(-0.9, 0.2, 0);
            wings[1].position.set(0.9, 0.2, 0);
            wings[0].rotation.z = Math.PI / 6;
            wings[1].rotation.z = -Math.PI / 6;
            
            group.add(body, head, beak, ...wings);
            return group;
        }
        
        // Snake - coiled serpent
        if (type.includes('snake') || type.includes('cobra') || type.includes('python') || type.includes('anaconda')) {
            const curve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0.5, 0.2, 0.5),
                new THREE.Vector3(0, 0.4, 1),
                new THREE.Vector3(-0.5, 0.2, 1.5),
                new THREE.Vector3(0, 0, 2)
            ]);
            
            const geometry = new THREE.TubeGeometry(curve, 64, 0.2, 16, false);
            const snake = new THREE.Mesh(
                geometry,
                this.createAnimalMaterial(0x3D5C2F)
            );
            
            group.add(snake);
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
