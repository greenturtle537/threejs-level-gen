import * as THREE from 'three';

export class FluorescentLight {
    constructor() {
        // Standard dimensions for office fluorescent light fixture
        this.fixtureWidth = 0.6;      // Width of fixture (in meters)
        this.fixtureLength = 1.8;     // Length of fixture (in meters)
        this.fixtureHeight = 0.1;     // Height/thickness of fixture (in meters)
        this.tubeRadius = 0.04;       // Radius of the light tube
        this.frameThickness = 0.05;   // Thickness of the metal frame
        
        // Create reusable geometries and materials
        this.materials = {
            frame: new THREE.MeshStandardMaterial({
                color: 0xd9d9d9,          // Light gray metal
                roughness: 0.5,
                metalness: 0.8
            }),
            diffuser: new THREE.MeshStandardMaterial({
                color: 0xfcfcfc,          // Almost white
                roughness: 0.3,
                metalness: 0.1,
                transparent: true,
                opacity: 0.6              // Slightly transparent
            }),
            tube: new THREE.MeshStandardMaterial({
                color: 0xffffff,          // White
                roughness: 0.2,
                metalness: 0.1,
                emissive: 0xf2f5ff,       // Slight blue-white fluorescent color
                emissiveIntensity: 0.4    // Moderate glow when not illuminated
            }),
            illuminated: new THREE.MeshStandardMaterial({
                color: 0xffffff,          // Pure white
                emissive: 0xf8f9ff,       // Blue-white fluorescent glow
                emissiveIntensity: 1.5,   // Brighter glow
                metalness: 0.0,
                roughness: 0.1
            })
        };
    }
    
    /**
     * Create a single fluorescent light fixture mesh
     * @param {boolean} isIlluminated - Whether the light should be visibly lit
     * @returns {THREE.Group} - The light fixture group
     */
    createLightFixture(isIlluminated = true) {
        const fixtureGroup = new THREE.Group();
        fixtureGroup.name = "fluorescent_fixture";
        
        // Create the metal housing (the box/frame)
        const housingGeometry = new THREE.BoxGeometry(
            this.fixtureWidth,
            this.fixtureHeight,
            this.fixtureLength
        );
        
        // Create outer frame
        const frame = new THREE.Mesh(housingGeometry, this.materials.frame);
        frame.castShadow = true;
        frame.receiveShadow = true;
        fixtureGroup.add(frame);
        
        // Create inner diffuser panel cutout (slightly smaller)
        const diffuserGeometry = new THREE.BoxGeometry(
            this.fixtureWidth - this.frameThickness,
            this.fixtureHeight/8,
            this.fixtureLength - this.frameThickness
        );
        
        const diffuser = new THREE.Mesh(diffuserGeometry, this.materials.diffuser);
        diffuser.position.y = -this.fixtureHeight/3;
        diffuser.castShadow = false;
        diffuser.receiveShadow = true;
        fixtureGroup.add(diffuser);
        
        // Create light tubes inside (typically two parallel tubes)
        const tubeGeometry = new THREE.CylinderGeometry(
            this.tubeRadius,
            this.tubeRadius,
            this.fixtureLength - this.frameThickness*2,
            8,        // Lower segment count for performance
            1,
            false     // Not open-ended
        );
        
        // Rotate cylinder to align with fixture length
        tubeGeometry.rotateX(Math.PI/2);
        
        // Create the two tubes with appropriate material based on illumination state
        const tubeMaterial = isIlluminated ? this.materials.illuminated : this.materials.tube;
        
        // Left tube
        const leftTube = new THREE.Mesh(tubeGeometry, tubeMaterial);
        leftTube.position.set(-this.fixtureWidth/4, -this.fixtureHeight/4, 0);
        leftTube.castShadow = false;
        fixtureGroup.add(leftTube);
        
        // Right tube
        const rightTube = new THREE.Mesh(tubeGeometry, tubeMaterial);
        rightTube.position.set(this.fixtureWidth/4, -this.fixtureHeight/4, 0);
        rightTube.castShadow = false;
        fixtureGroup.add(rightTube);
        
        // Add a point light if illuminated - higher intensity to compensate for ambient only lighting
        if (isIlluminated) {
            const light = new THREE.PointLight(0xf8f9ff, 1.8, 14);
            light.castShadow = true;
            
            // Optimize shadow settings
            light.shadow.mapSize.width = 512;
            light.shadow.mapSize.height = 512;
            light.shadow.camera.near = 0.5;
            light.shadow.camera.far = 10;
            
            // Position the light at the center of the fixture
            light.position.set(0, -0.1, 0);
            fixtureGroup.add(light);
            
            // Store reference to light in the group's userData
            fixtureGroup.userData.light = light;
        }
        
        // For tracking if this light is on or off
        fixtureGroup.userData.isIlluminated = isIlluminated;
        
        return fixtureGroup;
    }
    
    /**
     * Toggle the illumination state of a fixture
     * @param {THREE.Group} fixture - The fixture to toggle
     * @param {boolean} illuminate - Whether to turn the light on (true) or off (false)
     */
    toggleIllumination(fixture, illuminate) {
        if (!fixture || fixture.name !== "fluorescent_fixture") return;
        
        // Only process if state is changing
        if (fixture.userData.isIlluminated === illuminate) return;
        
        // Update state
        fixture.userData.isIlluminated = illuminate;
        
        // Update tubes material
        fixture.children.forEach(child => {
            // Only modify the tube meshes
            if (child.geometry && child.geometry.type === "CylinderGeometry") {
                child.material = illuminate ? 
                    this.materials.illuminated : this.materials.tube;
            }
        });
        
        // Handle the light source
        if (illuminate && !fixture.userData.light) {
            // Create a new light if turning on and no light exists
            const light = new THREE.PointLight(0xf8f9ff, 0.7, 6);
            light.castShadow = true;
            light.position.set(0, -0.1, 0);
            fixture.add(light);
            fixture.userData.light = light;
        } else if (!illuminate && fixture.userData.light) {
            // Remove light if turning off
            fixture.remove(fixture.userData.light);
            fixture.userData.light = null;
        }
    }
    
    /**
     * Create a flickering effect for the fluorescent light
     * @param {THREE.Group} fixture - The fixture to flicker
     * @param {number} intensity - Intensity of the flicker (0-1)
     * @param {number} duration - Duration of the flicker effect in seconds
     */
    flicker(fixture, intensity = 0.5, duration = 2) {
        if (!fixture || fixture.name !== "fluorescent_fixture") return;
        
        const startTime = Date.now();
        const endTime = startTime + (duration * 1000);
        
        // Store original light intensity if the light exists
        let originalIntensity = 0;
        if (fixture.userData.light) {
            originalIntensity = fixture.userData.light.intensity;
        }
        
        // Create animation function
        const animate = () => {
            const now = Date.now();
            
            // End animation when duration is complete
            if (now > endTime) {
                if (fixture.userData.light) {
                    fixture.userData.light.intensity = originalIntensity;
                }
                return;
            }
            
            // Calculate flicker based on time
            if (fixture.userData.light && fixture.userData.isIlluminated) {
                const flicker = Math.random() * intensity;
                fixture.userData.light.intensity = originalIntensity * (1 - flicker);
            }
            
            // Continue animation
            requestAnimationFrame(animate);
        };
        
        // Start animation
        animate();
    }
}