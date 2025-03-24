import * as THREE from 'three';

export class CollisionSystem {
    constructor(scene) {
        this.scene = scene;
        this.colliders = [];
        this.playerCollider = null;
        this.playerRadius = 0.5; // Player collision radius
        this.playerHeight = 1.8; // Player height (approx 6 feet)
        
        // Collision optimization settings
        this.spatialGrid = null;
        this.maxCheckDistance = 5; // Only check collisions within this distance
        this.activeColliders = new Set(); // Colliders that are currently active
        
        // For debugging
        this.debug = false;
        this.collisionHelpers = new THREE.Group();
        this.collisionHelpers.name = "CollisionHelpers";
        if (this.debug) {
            this.scene.add(this.collisionHelpers);
        }
        
        // Performance metrics
        this.lastFrameCollisionChecks = 0;
        this.totalCollisionChecks = 0;
    }
    
    /**
     * Create a player collider at the given position
     * @param {THREE.Vector3} position - Initial player position
     */
    createPlayerCollider(position) {
        this.playerCollider = {
            position: position.clone(),
            radius: this.playerRadius,
            height: this.playerHeight
        };
        
        // Add visual debug helper for player collider
        if (this.debug) {
            const geometry = new THREE.CylinderGeometry(
                this.playerRadius, 
                this.playerRadius, 
                this.playerHeight, 
                16
            );
            const material = new THREE.MeshBasicMaterial({
                color: 0xff0000, 
                wireframe: true
            });
            
            this.playerHelper = new THREE.Mesh(geometry, material);
            this.playerHelper.position.copy(position);
            this.collisionHelpers.add(this.playerHelper);
        }
    }
    
    /**
     * Add a wall collider from a mesh object
     * @param {THREE.Mesh} mesh - Wall mesh to add as collider
     */
    addWallCollider(mesh) {
        // Get the position and size from mesh
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        
        const collider = {
            position: mesh.position.clone(),
            size: size,
            mesh: mesh // Store reference to the mesh
        };
        
        this.colliders.push(collider);
        
        // Add visual debug helper for wall collider
        if (this.debug) {
            const helper = new THREE.Box3Helper(box, 0x00ff00);
            this.collisionHelpers.add(helper);
        }
    }
    
    /**
     * Update player collider position
     * @param {THREE.Vector3} position - New player position
     */
    updatePlayerPosition(position) {
        if (!this.playerCollider) return;
        
        this.playerCollider.position.copy(position);
        
        // Update debug helper if it exists
        if (this.debug && this.playerHelper) {
            this.playerHelper.position.copy(position);
        }
    }
    
    /**
     * Set the spatial hash grid for optimized collision detection
     * @param {SpatialHashGrid} grid - The spatial grid
     */
    setSpatialGrid(grid) {
        this.spatialGrid = grid;
    }
    
    /**
     * Check for collisions with walls and adjust player position
     * @param {THREE.Vector3} playerPosition - Current player position
     * @param {THREE.Vector3} proposedPosition - Proposed new position after movement
     * @returns {THREE.Vector3} Adjusted position after collision resolution
     */
    checkCollisions(playerPosition, proposedPosition) {
        if (!this.playerCollider) return proposedPosition;
        
        // Create a temporary vector to hold our adjusted position
        const adjustedPosition = proposedPosition.clone();
        
        // Reset collision check count for this frame
        this.lastFrameCollisionChecks = 0;
        
        // Determine which colliders to check based on spatial grid
        let collidersToCheck = this.colliders;
        
        if (this.spatialGrid) {
            // Only check nearby colliders using spatial grid
            this.activeColliders.clear();
            const nearbyObjects = this.spatialGrid.findNearbyObjects(
                proposedPosition, 
                this.maxCheckDistance
            );
            
            // Filter for only collider objects
            for (const obj of nearbyObjects) {
                // Find the matching collider from our colliders array (if it exists)
                const matchingCollider = this.colliders.find(c => c.mesh === obj);
                if (matchingCollider) {
                    this.activeColliders.add(matchingCollider);
                }
            }
            
            collidersToCheck = Array.from(this.activeColliders);
        }
        
        // Check each active wall collider
        for (const collider of collidersToCheck) {
            this.lastFrameCollisionChecks++;
            this.totalCollisionChecks++;
            
            // Simple cylinder vs box collision check 
            // (we only need horizontal collision, not vertical)
            
            // Get box extents
            const halfSize = collider.size.clone().multiplyScalar(0.5);
            const boxMin = collider.position.clone().sub(halfSize);
            const boxMax = collider.position.clone().add(halfSize);
            
            // Create a 2D point for closest point test (ignoring Y axis)
            const point2D = new THREE.Vector2(
                adjustedPosition.x, 
                adjustedPosition.z
            );
            
            // Get box bounds in 2D (ignoring Y axis)
            const boxMin2D = new THREE.Vector2(boxMin.x, boxMin.z);
            const boxMax2D = new THREE.Vector2(boxMax.x, boxMax.z);
            
            // Find closest point on box to cylinder center
            const closestPoint = new THREE.Vector2(
                Math.max(boxMin2D.x, Math.min(point2D.x, boxMax2D.x)),
                Math.max(boxMin2D.y, Math.min(point2D.y, boxMax2D.y))
            );
            
            // Calculate distance from closestPoint to cylinder center
            const distance = point2D.distanceTo(closestPoint);
            
            // If distance is less than cylinder radius, we have a collision
            if (distance < this.playerRadius) {
                // Calculate penetration depth
                const penetration = this.playerRadius - distance;
                
                // If we're colliding
                if (penetration > 0 && distance > 0) {
                    // Direction from closest point to cylinder center
                    const direction = new THREE.Vector2(
                        point2D.x - closestPoint.x,
                        point2D.y - closestPoint.y
                    ).normalize();
                    
                    // Adjust position by penetration along collision normal
                    adjustedPosition.x += direction.x * penetration;
                    adjustedPosition.z += direction.y * penetration;
                } 
                // Special case for when we're directly inside the box
                else if (distance === 0) {
                    // Find the shallowest penetration axis to push out
                    const dists = [
                        adjustedPosition.x - boxMin.x, // distance to left edge
                        boxMax.x - adjustedPosition.x, // distance to right edge
                        adjustedPosition.z - boxMin.z, // distance to bottom edge
                        boxMax.z - adjustedPosition.z  // distance to top edge
                    ];
                    
                    // Find minimum penetration distance and axis
                    let minDist = dists[0];
                    let minAxis = 0;
                    
                    for (let i = 1; i < 4; i++) {
                        if (dists[i] < minDist) {
                            minDist = dists[i];
                            minAxis = i;
                        }
                    }
                    
                    // Push out along minimum penetration axis
                    switch (minAxis) {
                        case 0: adjustedPosition.x = boxMin.x - this.playerRadius; break;
                        case 1: adjustedPosition.x = boxMax.x + this.playerRadius; break;
                        case 2: adjustedPosition.z = boxMin.z - this.playerRadius; break;
                        case 3: adjustedPosition.z = boxMax.z + this.playerRadius; break;
                    }
                }
            }
        }
        
        // Keep original Y position
        adjustedPosition.y = playerPosition.y;
        
        return adjustedPosition;
    }
    
    /**
     * Extract colliders from a level group
     * @param {THREE.Group} levelGroup - Group containing level meshes
     */
    extractCollidersFromLevel(levelGroup) {
        levelGroup.traverse((object) => {
            // Only add colliders for walls (not floor, ceiling, etc.)
            if (object.isMesh && object.name !== 'floor' && 
                object.name !== 'ceiling') {
                this.addWallCollider(object);
            }
        });
    }
    
    /**
     * Clear all colliders and reset the system
     */
    clear() {
        this.colliders = [];
        this.playerCollider = null;
        
        if (this.debug) {
            this.collisionHelpers.clear();
        }
    }
}