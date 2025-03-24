import * as THREE from 'three';

/**
 * Resource Manager for handling and caching threejs resources
 * Implements the singleton pattern for global access
 */
export class ResourceManager {
    constructor() {
        // Singleton instance check
        if (ResourceManager.instance) {
            return ResourceManager.instance;
        }
        
        ResourceManager.instance = this;
        
        // Initialize resource caches
        this.geometries = {};
        this.materials = {};
        this.textures = {};
    }

    /**
     * Get or create a geometry
     * @param {string} key - Unique identifier for the geometry
     * @param {Function} createFunc - Function to create the geometry if not cached
     * @returns {THREE.BufferGeometry}
     */
    getGeometry(key, createFunc) {
        if (!this.geometries[key] && createFunc) {
            this.geometries[key] = createFunc();
        }
        return this.geometries[key];
    }

    /**
     * Get or create a material
     * @param {string} key - Unique identifier for the material
     * @param {Function} createFunc - Function to create the material if not cached
     * @returns {THREE.Material}
     */
    getMaterial(key, createFunc) {
        if (!this.materials[key] && createFunc) {
            this.materials[key] = createFunc();
        }
        return this.materials[key];
    }

    /**
     * Get or create a texture
     * @param {string} key - Unique identifier for the texture
     * @param {Function} createFunc - Function to create the texture if not cached
     * @returns {THREE.Texture}
     */
    getTexture(key, createFunc) {
        if (!this.textures[key] && createFunc) {
            this.textures[key] = createFunc();
        }
        return this.textures[key];
    }

    /**
     * Clear all resources and properly dispose them
     */
    dispose() {
        // Dispose textures
        Object.values(this.textures).forEach(texture => {
            if (texture && texture.dispose) {
                texture.dispose();
            }
        });
        
        // Dispose materials
        Object.values(this.materials).forEach(material => {
            if (material && material.dispose) {
                material.dispose();
            }
        });
        
        // Dispose geometries
        Object.values(this.geometries).forEach(geometry => {
            if (geometry && geometry.dispose) {
                geometry.dispose();
            }
        });
        
        // Clear caches
        this.textures = {};
        this.materials = {};
        this.geometries = {};
    }

    /**
     * Create instanced mesh for efficient rendering of many identical objects
     * @param {string} geometryKey - Key for the geometry to instance
     * @param {string} materialKey - Key for the material to use
     * @param {number} count - Number of instances
     * @returns {THREE.InstancedMesh}
     */
    createInstancedMesh(geometryKey, materialKey, count) {
        const geometry = this.geometries[geometryKey];
        const material = this.materials[materialKey];
        
        if (!geometry || !material) {
            console.error('Geometry or material not found for instanced mesh');
            return null;
        }
        
        return new THREE.InstancedMesh(geometry, material, count);
    }

    /**
     * Dispose specific resources by type and key
     * @param {string} type - Resource type ('geometry', 'material', 'texture')
     * @param {string} key - Resource key to dispose
     */
    disposeResource(type, key) {
        const resourceMap = {
            'geometry': this.geometries,
            'material': this.materials,
            'texture': this.textures
        };
        
        const resource = resourceMap[type]?.[key];
        if (resource && resource.dispose) {
            resource.dispose();
            delete resourceMap[type][key];
        }
    }
}