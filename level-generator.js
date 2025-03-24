import * as THREE from 'three';
import { TextureGenerator } from './texture-generator.js';
import { ResourceManager } from './resource-manager.js';
import { SpatialHashGrid } from './spatial-hash-grid.js';

export class LevelGenerator {
    constructor() {
        // Get resource manager instance
        this.resourceManager = new ResourceManager();
        
        // Create texture generator
        this.textureGenerator = new TextureGenerator();
        
        // Generate shared textures for 90s office aesthetic
        const wallTexture = this.textureGenerator.generateWallTexture('stripes', 'nineties');
        const floorTexture = this.textureGenerator.generateFloorTexture();
        const ceilingTexture = this.textureGenerator.generateCeilingTexture();
        
        // Create shared geometries
        this.geometries = {
            wall: this.resourceManager.getGeometry('wall_block', () => {
                return new THREE.BoxGeometry(2, 3, 2);
            }),
            wallSection: this.resourceManager.getGeometry('wall_section', () => {
                return new THREE.BoxGeometry(2, 3, 0.2);
            }),
            floor: this.resourceManager.getGeometry('floor', () => {
                return new THREE.PlaneGeometry(1, 1);
            }),
            ceiling: this.resourceManager.getGeometry('ceiling', () => {
                return new THREE.PlaneGeometry(1, 1);
            })
        };
        
        // Create shared materials
        this.materials = {
            wall: this.resourceManager.getMaterial('wall', () => {
                return new THREE.MeshStandardMaterial({ 
                    map: wallTexture,
                    roughness: 0.6,
                    metalness: 0.15,
                    emissive: 0x111111,
                    emissiveIntensity: 0.1
                });
            }),
            floor: this.resourceManager.getMaterial('floor', () => {
                return new THREE.MeshStandardMaterial({ 
                    map: floorTexture, 
                    roughness: 0.9,
                    metalness: 0.0
                });
            }),
            ceiling: this.resourceManager.getMaterial('ceiling', () => {
                return new THREE.MeshStandardMaterial({ 
                    map: ceilingTexture, 
                    roughness: 0.5,
                    metalness: 0.1
                });
            }),
            goal: this.resourceManager.getMaterial('goal', () => {
                return new THREE.MeshStandardMaterial({ 
                    color: 0x00ff00, 
                    emissive: 0x002200,
                    roughness: 0.4,
                    metalness: 0.3
                });
            })
        };

        // Standard dimensions
        this.corridorWidth = 2;
        this.roomHeight = 3;
        this.wallThickness = 0.2;
        
        // For tracking instanced walls
        this.wallBlocks = [];
        this.wallSections = [];
    }
    
    /**
     * Parse the grid format from array of strings to 2D array
     * @param {Array<string>} gridStrings - Array of strings representing grid rows
     * @returns {Array<Array<string>>} 2D array of grid cells
     */
    parseGridFormat(gridStrings) {
        return gridStrings.map(row => row.split(''));
    }
    
    /**
     * Determine if a cell is a floor/walkable area
     * @param {string} cell - The cell character 
     * @returns {boolean} - True if walkable, false otherwise
     */
    isWalkableCell(cell) {
        return cell === '.' || cell === 'S' || cell === 'E';
    }
    
    /**
     * Determine if a cell is a hidden area (non-walkable, non-wall)
     * @param {string} cell - The cell character
     * @returns {boolean} - True if hidden area, false otherwise
     */
    isHiddenCell(cell) {
        return cell === 'x';
    }

    async loadLevel(levelFile) {
        try {
            const response = await fetch(levelFile);
            if (!response.ok) {
                throw new Error(`Failed to load level: ${response.status} ${response.statusText}`);
            }
            const levelData = await response.json();
            return this.generateLevel(levelData);
        } catch (error) {
            console.error("Error loading level:", error);
            throw error;
        }
    }

    generateLevel(levelData) {
        const levelGroup = new THREE.Group();
        levelGroup.name = "Level";
        
        // Store level data in the group's userData for reference in other methods
        levelGroup.userData.levelData = levelData;
        
        // Parse grid if needed
        const grid = Array.isArray(levelData.grid[0]) ? 
            levelData.grid : this.parseGridFormat(levelData.grid);
        
        // Calculate world size for spatial grid
        const worldSizeX = grid[0].length * this.corridorWidth;
        const worldSizeZ = grid.length * this.corridorWidth;
        
        // Initialize spatial grid for physics/collision optimization
        this.spatialGrid = new SpatialHashGrid(this.corridorWidth * 2, worldSizeX, worldSizeZ);
        levelGroup.userData.spatialGrid = this.spatialGrid;

        // Add a simple ambient light
        this.addLighting(levelGroup, levelData);
        
        // Generate grid-based layout
        this.generateGrid(levelGroup, levelData);

        // Enable frustum culling on the entire level
        levelGroup.traverse(object => {
            if (object.isMesh) {
                object.frustumCulled = true;
            }
        });

        return levelGroup;
    }

    addLighting(levelGroup, levelData) {
        // Use a lightweight ambient light only
        const ambient = new THREE.AmbientLight(0xb0b0b0);
        levelGroup.add(ambient);
    }

    generateGrid(levelGroup, levelData) {
        const grid = this.parseGridFormat(levelData.grid);
        const directions = [
            {x: 0, z: -1},
            {x: 1, z: 0},
            {x: 0, z: 1},
            {x: -1, z: 0}
        ];

        // Create floor and ceiling
        const gridWidth = grid[0].length;
        const gridHeight = grid.length;
        
        const floorGeometry = new THREE.PlaneGeometry(
            gridWidth * this.corridorWidth, 
            gridHeight * this.corridorWidth
        );
        
        // Floor
        const floor = new THREE.Mesh(floorGeometry, this.materials.floor);
        floor.name = "floor";
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(
            (gridWidth * this.corridorWidth) / 2 - this.corridorWidth / 2,
            0,
            (gridHeight * this.corridorWidth) / 2 - this.corridorWidth / 2
        );
        floor.receiveShadow = true;
        levelGroup.add(floor);
        
        // Ceiling
        const ceiling = new THREE.Mesh(floorGeometry, this.materials.ceiling);
        ceiling.name = "ceiling";
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.set(
            (gridWidth * this.corridorWidth) / 2 - this.corridorWidth / 2,
            this.roomHeight,
            (gridHeight * this.corridorWidth) / 2 - this.corridorWidth / 2
        );
        ceiling.receiveShadow = true;
        levelGroup.add(ceiling);

        // Variables to store start and goal positions
        let startPosition = null;
        let goalPosition = null;

        // Create walls based on grid
        for (let z = 0; z < grid.length; z++) {
            for (let x = 0; x < grid[z].length; x++) {
                const cell = grid[z][x];
                
                if (cell === '-') {
                    this.createWallBlock(levelGroup, x, z);
                } else if (cell === 'x') {
                    // Hidden area: do nothing
                } else if (cell === '.' || cell === 'S' || cell === 'E') {
                    for (let i = 0; i < 4; i++) {
                        const nx = x + directions[i].x;
                        const nz = z + directions[i].z;
                        
                        if (nx < 0 || nx >= grid[z].length || 
                            nz < 0 || nz >= grid.length || 
                            grid[nz][nx] === '-' || grid[nz][nx] === 'x') {
                            this.createWall(levelGroup, x, z, i);
                        }
                    }
                    
                    if (cell === 'S') {
                        startPosition = { x, z };
                        this.addStartPosition(levelGroup, { x, z });
                    } else if (cell === 'E') {
                        goalPosition = { x, z };
                        this.addGoalPosition(levelGroup, { x, z });
                    }
                }
            }
        }
        
        // Store positions in the level group for easy access
        if (startPosition) {
            levelGroup.userData.startPosition = new THREE.Vector3(
                startPosition.x * this.corridorWidth,
                1.8,
                startPosition.z * this.corridorWidth
            );
        }

        if (goalPosition) {
            levelGroup.userData.goalPosition = new THREE.Vector3(
                goalPosition.x * this.corridorWidth,
                1,
                goalPosition.z * this.corridorWidth
            );
        }
    }

    createWallBlock(levelGroup, x, z) {
        const position = new THREE.Vector3(
            x * this.corridorWidth,
            this.roomHeight / 2,
            z * this.corridorWidth
        );
        
        const wall = new THREE.Mesh(this.geometries.wall, this.materials.wall);
        wall.name = "wall_block";
        wall.position.copy(position);
        
        const stringGrid = levelGroup.userData.levelData?.grid;
        const grid = Array.isArray(stringGrid) && typeof stringGrid[0] === 'string' ?
            this.parseGridFormat(stringGrid) : stringGrid;
            
        const isPerimeter = grid ? (x === 0 || z === 0 || 
                            x === grid[0].length - 1 || 
                            z === grid.length - 1) : true;
                            
        wall.castShadow = isPerimeter;
        wall.receiveShadow = true;
        
        if (this.spatialGrid) {
            this.spatialGrid.insertObject(wall, position);
        }
        
        levelGroup.add(wall);
        this.wallBlocks.push(wall);
    }

    createWall(levelGroup, x, z, direction) {
        let wallWidth, wallDepth;
        let posX = x * this.corridorWidth;
        let posZ = z * this.corridorWidth;
        
        if (direction === 0 || direction === 2) { // North or South
            wallWidth = this.corridorWidth;
            wallDepth = this.wallThickness;
            posZ += direction === 0 ? -this.corridorWidth/2 : this.corridorWidth/2;
        } else { // East or West
            wallWidth = this.wallThickness;
            wallDepth = this.corridorWidth;
            posX += direction === 3 ? -this.corridorWidth/2 : this.corridorWidth/2;
        }
        
        const wall = new THREE.Mesh(this.geometries.wallSection, this.materials.wall);
        wall.name = "wall_section";
        
        if (direction === 0 || direction === 2) {
            wall.scale.set(1, 1, 0.1);
        } else {
            wall.scale.set(0.1, 1, 1);
        }
        
        wall.castShadow = (x + z) % 3 === 0;
        wall.receiveShadow = true;
        
        const position = new THREE.Vector3(posX, this.roomHeight / 2, posZ);
        wall.position.copy(position);
        
        if (this.spatialGrid) {
            this.spatialGrid.insertObject(wall, position);
        }
        
        levelGroup.add(wall);
        this.wallSections.push(wall);
    }

    addStartPosition(levelGroup, startPos) {
        const startMarker = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16),
            new THREE.MeshBasicMaterial({ color: 0x0000ff })
        );
        
        startMarker.position.set(
            startPos.x * this.corridorWidth,
            0.05,
            startPos.z * this.corridorWidth
        );
        
        levelGroup.add(startMarker);
        
        levelGroup.userData.startPosition = new THREE.Vector3(
            startPos.x * this.corridorWidth,
            1.8,
            startPos.z * this.corridorWidth
        );
    }

    addGoalPosition(levelGroup, goalPos) {
        const goalMarker = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            this.materials.goal
        );
        
        goalMarker.position.set(
            goalPos.x * this.corridorWidth,
            1,
            goalPos.z * this.corridorWidth
        );
        
        levelGroup.add(goalMarker);
        
        levelGroup.userData.goalPosition = new THREE.Vector3(
            goalPos.x * this.corridorWidth,
            1,
            goalPos.z * this.corridorWidth
        );
    }
}
