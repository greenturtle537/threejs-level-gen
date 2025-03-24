/**
 * A simple spatial hashing system for efficient collision detection
 * Divides the space into a grid of cells and tracks which objects are in each cell
 */
export class SpatialHashGrid {
    /**
     * Create a new spatial hash grid
     * @param {number} cellSize - Size of each grid cell (larger = fewer cells but more objects per cell)
     * @param {number} worldSizeX - Width of the world space
     * @param {number} worldSizeZ - Depth of the world space 
     */
    constructor(cellSize = 5, worldSizeX = 100, worldSizeZ = 100) {
        this.cellSize = cellSize;
        this.worldSizeX = worldSizeX;
        this.worldSizeZ = worldSizeZ;
        
        // Calculate grid dimensions
        this.numCellsX = Math.ceil(worldSizeX / cellSize);
        this.numCellsZ = Math.ceil(worldSizeZ / cellSize);
        
        // Create grid cells
        this.cells = new Array(this.numCellsX * this.numCellsZ);
        for (let i = 0; i < this.cells.length; i++) {
            this.cells[i] = new Set();
        }
        
        // Map to track which cell each object is in
        this.objectCells = new Map();
    }

    /**
     * Get the cell index from world coordinates
     * @param {number} x - World X coordinate
     * @param {number} z - World Z coordinate
     * @returns {number} Cell index
     */
    getCellIndex(x, z) {
        // Clamp coordinates to world bounds
        const cellX = Math.floor(Math.max(0, Math.min(x, this.worldSizeX - 0.001)) / this.cellSize);
        const cellZ = Math.floor(Math.max(0, Math.min(z, this.worldSizeZ - 0.001)) / this.cellSize);
        
        return cellX + cellZ * this.numCellsX;
    }

    /**
     * Add an object to the grid at the specified position
     * @param {Object} object - The object to add (any type)
     * @param {Object} position - Position with x, z coordinates
     */
    insertObject(object, position) {
        const cellIndex = this.getCellIndex(position.x, position.z);
        
        // Add object to the cell
        this.cells[cellIndex].add(object);
        
        // Track which cell this object is in
        this.objectCells.set(object, cellIndex);
    }

    /**
     * Update an object's position in the grid
     * @param {Object} object - The object to update
     * @param {Object} position - New position with x, z coordinates
     */
    updateObject(object, position) {
        // Remove from old cell
        this.removeObject(object);
        
        // Insert at new position
        this.insertObject(object, position);
    }

    /**
     * Remove an object from the grid
     * @param {Object} object - The object to remove
     */
    removeObject(object) {
        const cellIndex = this.objectCells.get(object);
        
        if (cellIndex !== undefined) {
            // Remove from cell
            this.cells[cellIndex].delete(object);
            
            // Remove from tracking map
            this.objectCells.delete(object);
        }
    }

    /**
     * Find all objects within a certain radius of a position
     * @param {Object} position - Center position with x, z coordinates
     * @param {number} radius - Search radius
     * @returns {Set} Set of objects within the radius
     */
    findNearbyObjects(position, radius) {
        const nearby = new Set();
        
        // Calculate cell range to check
        const minCellX = Math.floor(Math.max(0, position.x - radius) / this.cellSize);
        const maxCellX = Math.floor(Math.min(this.worldSizeX - 0.001, position.x + radius) / this.cellSize);
        const minCellZ = Math.floor(Math.max(0, position.z - radius) / this.cellSize);
        const maxCellZ = Math.floor(Math.min(this.worldSizeZ - 0.001, position.z + radius) / this.cellSize);
        
        // Check each cell in the range
        for (let z = minCellZ; z <= maxCellZ; z++) {
            for (let x = minCellX; x <= maxCellX; x++) {
                const cellIndex = x + z * this.numCellsX;
                const cell = this.cells[cellIndex];
                
                // Add all objects in this cell to the result
                if (cell) {
                    for (const obj of cell) {
                        nearby.add(obj);
                    }
                }
            }
        }
        
        return nearby;
    }

    /**
     * Clear all objects from the grid
     */
    clear() {
        for (let i = 0; i < this.cells.length; i++) {
            this.cells[i].clear();
        }
        this.objectCells.clear();
    }
}