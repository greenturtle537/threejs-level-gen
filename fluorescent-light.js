import * as THREE from 'three';

export class FluorescentLight {
    constructor(length = 1.2, width = 0.1) {
        this.length = length;
        this.width = width;
    }

    createLightFixture(enabled = true) {
        const group = new THREE.Group();

        // Create the light housing (metal frame)
        const housingGeometry = new THREE.BoxGeometry(this.length, this.width-0.2, this.width);
        const housingMaterial = new THREE.MeshStandardMaterial({
            color: 0x808080,
            metalness: 0.8,
            roughness: 0.2
        });
        const housing = new THREE.Mesh(housingGeometry, housingMaterial);

        // Create the glowing tube
        const tubeGeometry = new THREE.BoxGeometry(this.length - 0.05, this.width / 2, this.width / 2);
        const tubeMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: enabled ? 1 : 0
        });
        const glowTube = new THREE.Mesh(tubeGeometry, tubeMaterial);

        // Create the light source using SpotLight instead of PointLight
        const light = new THREE.SpotLight(0xffffff, 1);
        light.castShadow = false;
        light.position.set(0, -0.1, 0);
        light.visible = enabled;
        light.angle = Math.PI / 3; // 60 degrees cone
        light.penumbra = 0.5; // Soft edges
        light.decay = 2; // Physical light decay
        light.distance = 10; // Maximum distance of light effect

        // Point the spotlight downward
        light.target.position.set(0, -1, 0);
        group.add(light.target);

        // Add everything to the group
        group.add(light, housing, glowTube);

        // Store references in userData for later access
        group.userData.light = light;
        group.userData.glowTube = glowTube;

        // Add methods to control the light
        group.setIntensity = (intensity) => {
            light.intensity = intensity;
        };

        group.setEnabled = (isEnabled) => {
            light.visible = isEnabled;
            glowTube.material.emissiveIntensity = isEnabled ? 1 : 0;
        };

        return group;
    }
}