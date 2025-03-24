import * as THREE from 'three';
import { ResourceManager } from './resource-manager.js';

export class TextureGenerator {
    constructor() {
        // Color palettes for office wallpapers
        this.palettes = {
            corporate: [
                '#feffeb', // Base off-white
                '#eceddf', // Accent off-white
                '#8795a1', // Medium blue-gray
                '#3d4852'  // Dark blue-gray
            ],
            warm: [
                '#f5f5dc', // Beige
                '#e8d0a9', // Light tan
                '#d3bc8d', // Tan
                '#b0a388'  // Dark tan
            ],
            cool: [
                '#e3e8ee', // Light gray-blue
                '#cbd5e0', // Gray-blue
                '#a0aec0', // Medium gray-blue
                '#718096'  // Dark gray-blue
            ],
            // New 90s office palette with off-white base
            nineties: [
                '#f7f6f2', // Off-white base
                '#e9e8e4', // Slightly darker off-white for stripes
                '#dad9d5', // Medium off-white
                '#c5c3bc'  // Darker accent
            ]
        };

        // Texture dimensions (reduced for better performance)
        this.textureSize = 256;
        
        // Get the resource manager instance
        this.resourceManager = new ResourceManager();
    }

    /**
     * Creates a canvas texture with procedural office wallpaper
     * @param {string} style - Texture style ('stripes', 'geometric', 'noise')
     * @param {string} palette - Color palette ('corporate', 'warm', 'cool')
     * @returns {THREE.CanvasTexture} The generated texture
     */
    generateWallTexture(style = 'stripes', palette = 'corporate') {
        // Create a unique key for this texture
        const textureKey = `wall_${style}_${palette}`;
        
        // Check if this texture is already cached
        return this.resourceManager.getTexture(textureKey, () => {
            // If not cached, create the texture
            const canvas = document.createElement('canvas');
            canvas.width = this.textureSize;
            canvas.height = this.textureSize;
            
            const ctx = canvas.getContext('2d');
            
            // Fill with base color
            const colors = this.palettes[palette] || this.palettes.corporate;
            ctx.fillStyle = colors[0];
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Apply selected pattern
            switch (style) {
                case 'stripes':
                    this.generateStripes(ctx, colors);
                    break;
                case 'geometric':
                    this.generateGeometric(ctx, colors);
                    break;
                case 'noise':
                    this.generateNoise(ctx, colors);
                    break;
                default:
                    this.generateStripes(ctx, colors);
            }
            
            // Add subtle noise overlay to all textures for realism
            this.addNoiseOverlay(ctx, 0.0001);
            
            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(2, 2); // Repeat the texture
            texture.needsUpdate = true;
            
            // Enable mipmapping for better performance at distance
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipMapLinearFilter;
            
            return texture;
        });
    }

    /**
     * Generate a striped wallpaper pattern
     */
    generateStripes(ctx, colors) {
        // Use wider stripes for 90s office aesthetic
        const stripeWidth = 64;
        const numStripes = Math.floor(this.textureSize / stripeWidth);
        
        // For 90s office walls, we want subtle, wide stripes
        const is90sOffice = (colors[0] === this.palettes.nineties[0]);
        
        if (is90sOffice) {
            // Create a subtle striping pattern for 90s office
            ctx.fillStyle = colors[0]; // Off-white base
            ctx.fillRect(0, 0, this.textureSize, this.textureSize);
            
            // Apply subtle, wider stripes with minimal contrast
            for (let i = 0; i < numStripes; i++) {
                if (i % 2 === 1) { // Only every other stripe has the slightly darker color
                    ctx.fillStyle = colors[1]; // Slightly darker off-white
                    ctx.fillRect(i * stripeWidth, 0, stripeWidth, this.textureSize);
                }
            }
            
            // Very subtle vertical lines
            ctx.strokeStyle = 'rgba(200, 198, 195, 0.3)'; // Very light gray, nearly transparent
            ctx.lineWidth = 0.5;
            
            for (let i = 0; i <= numStripes; i++) {
                ctx.beginPath();
                ctx.moveTo(i * stripeWidth, 0);
                ctx.lineTo(i * stripeWidth, this.textureSize);
                ctx.stroke();
            }
        } else {
            // Original stripe pattern for other styles
            for (let i = 0; i < numStripes; i++) {
                // Alternating colors for stripes
                ctx.fillStyle = (i % 2 === 0) ? colors[0] : colors[1];
                ctx.fillRect(i * stripeWidth, 0, stripeWidth, this.textureSize);
            }
            
            // Add thin accent lines
            ctx.strokeStyle = colors[3];
            ctx.lineWidth = 1;
            
            for (let i = 0; i <= numStripes; i += 2) {
                ctx.beginPath();
                ctx.moveTo(i * stripeWidth, 0);
                ctx.lineTo(i * stripeWidth, this.textureSize);
                ctx.stroke();
            }
        }
    }

    /**
     * Generate a geometric pattern wallpaper
     */
    generateGeometric(ctx, colors) {
        const size = 64;
        const numShapes = Math.floor(this.textureSize / size);
        
        // Base layer
        ctx.fillStyle = colors[0];
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Draw geometric shapes in a grid
        for (let x = 0; x < numShapes; x++) {
            for (let y = 0; y < numShapes; y++) {
                const posX = x * size;
                const posY = y * size;
                
                // Select random shape
                const shape = Math.floor(Math.random() * 3);
                
                ctx.fillStyle = colors[1 + (Math.floor(Math.random() * 3))];
                
                switch (shape) {
                    case 0: // Square
                        ctx.fillRect(
                            posX + size * 0.2,
                            posY + size * 0.2,
                            size * 0.6,
                            size * 0.6
                        );
                        break;
                    case 1: // Circle
                        ctx.beginPath();
                        ctx.arc(
                            posX + size / 2,
                            posY + size / 2,
                            size * 0.3,
                            0,
                            Math.PI * 2
                        );
                        ctx.fill();
                        break;
                    case 2: // Diamond
                        ctx.beginPath();
                        ctx.moveTo(posX + size / 2, posY + size * 0.1);
                        ctx.lineTo(posX + size * 0.9, posY + size / 2);
                        ctx.lineTo(posX + size / 2, posY + size * 0.9);
                        ctx.lineTo(posX + size * 0.1, posY + size / 2);
                        ctx.closePath();
                        ctx.fill();
                        break;
                }
            }
        }
    }

    /**
     * Generate a noise pattern wallpaper
     */
    generateNoise(ctx, colors) {
        // Base layer
        ctx.fillStyle = colors[0];
        ctx.fillRect(0, 0, this.textureSize, this.textureSize);
        
        // Create noise with different intensities
        this.addNoiseOverlay(ctx, 0.2, colors[1]);
        
        // Add some lines for structure
        const lineSpacing = 64;
        ctx.strokeStyle = colors[2];
        ctx.lineWidth = 1;
        
        // Horizontal lines
        for (let y = lineSpacing; y < this.textureSize; y += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.textureSize, y);
            ctx.stroke();
        }
        
        // Vertical lines
        for (let x = lineSpacing; x < this.textureSize; x += lineSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.textureSize);
            ctx.stroke();
        }
    }

    /**
     * Add a subtle noise overlay to add realism to the texture
     */
    addNoiseOverlay(ctx, intensity = 0.05, color = 'rgba(0,0,0,0.1)') {
        const imageData = ctx.getImageData(0, 0, this.textureSize, this.textureSize);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            if (Math.random() < intensity) {
                if (color) {
                    // Use specific color for noise
                    const noiseColor = new THREE.Color(color);
                    data[i] = Math.floor(noiseColor.r * 255);
                    data[i + 1] = Math.floor(noiseColor.g * 255);
                    data[i + 2] = Math.floor(noiseColor.b * 255);
                } else {
                    // Random grayscale noise
                    const value = Math.random() * 255;
                    data[i] = value;
                    data[i + 1] = value;
                    data[i + 2] = value;
                }
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    /**
     * Generate a floor texture
     */
    generateFloorTexture() {
        // Create a unique key for the floor texture
        const textureKey = '90s_office_carpet';
        
        // Check if this texture is already cached
        return this.resourceManager.getTexture(textureKey, () => {
            const canvas = document.createElement('canvas');
            canvas.width = this.textureSize;
            canvas.height = this.textureSize;
            
            const ctx = canvas.getContext('2d');
            
            // Dark green carpet base color - typical of 90s offices
            const darkGreen = '#1a3c2a'; // Dark green base
            const speckleColor = '#15331f'; // Slightly darker green for texture variation
            
            // Fill with base carpet color
            ctx.fillStyle = darkGreen;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Create carpet texture with small speckles
            for (let i = 0; i < 5000; i++) { // More speckles for textured carpet feel
                const x = Math.random() * canvas.width;
                const y = Math.random() * canvas.height;
                const size = 0.5 + Math.random() * 1.5; // Small dots for carpet texture
                
                // Randomly vary between a few similar dark green shades
                const colorVariation = Math.random();
                if (colorVariation < 0.7) {
                    ctx.fillStyle = speckleColor; // Main speckle color
                } else if (colorVariation < 0.9) {
                    ctx.fillStyle = '#1d4432'; // Slightly lighter accent
                } else {
                    ctx.fillStyle = '#132920'; // Slightly darker accent
                }
                
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // Add subtle vertical and horizontal "fibers" for a carpet look
            ctx.strokeStyle = 'rgba(20, 45, 30, 0.2)'; // Very subtle lines
            ctx.lineWidth = 0.5;
            
            // Add some subtle fabric-like texture lines
            for (let i = 0; i < 40; i++) {
                // Horizontal fibers
                const y = Math.random() * canvas.height;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
                
                // Vertical fibers
                const x = Math.random() * canvas.width;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            
            // Add subtle noise for carpet texture
            this.addNoiseOverlay(ctx, 0.005, 'rgba(20, 45, 30, 0.3)');
            
            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(4, 4); // Repeat the texture less for carpet (don't want obvious repeating)
            texture.needsUpdate = true;
            
            // Enable mipmapping for better performance at distance
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipMapLinearFilter;
            
            return texture;
        });
    }

    /**
     * Generate a ceiling texture
     */
    generateCeilingTexture() {
        // Create a unique key for the ceiling texture
        const textureKey = '90s_office_ceiling';
        
        // Check if this texture is already cached
        return this.resourceManager.getTexture(textureKey, () => {
            const canvas = document.createElement('canvas');
            canvas.width = this.textureSize;
            canvas.height = this.textureSize;
            
            const ctx = canvas.getContext('2d');
            
            // Base ceiling color - slightly off-white for 90s office feel
            ctx.fillStyle = '#f2f1ed'; // Slightly off-white
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw ceiling tile pattern - common in 90s offices
            const tileSize = Math.floor(this.textureSize / 2); // Larger tiles (2×2 grid)
            const numTiles = Math.floor(this.textureSize / tileSize);
            
            // Ceiling grid lines
            ctx.strokeStyle = '#e6e4df'; // Very subtle grid lines
            ctx.lineWidth = 2; // Slightly thicker for 90s drop ceiling tile look
            
            // Draw the primary grid lines (standard office ceiling tile layout)
            for (let x = 0; x <= numTiles; x++) {
                ctx.beginPath();
                ctx.moveTo(x * tileSize, 0);
                ctx.lineTo(x * tileSize, this.textureSize);
                ctx.stroke();
            }
            
            for (let y = 0; y <= numTiles; y++) {
                ctx.beginPath();
                ctx.moveTo(0, y * tileSize);
                ctx.lineTo(this.textureSize, y * tileSize);
                ctx.stroke();
            }
            
            // Add texture details to ceiling tiles
            for (let x = 0; x < numTiles; x++) {
                for (let y = 0; y < numTiles; y++) {
                    // Draw the characteristic small holes/perforations in ceiling tiles
                    const holesPerRow = 8; // Number of holes in each row within a tile
                    const holeSpacing = tileSize / holesPerRow;
                    
                    for (let hx = 1; hx < holesPerRow; hx++) {
                        for (let hy = 1; hy < holesPerRow; hy++) {
                            // Only draw some of the holes for a more natural look
                            if (Math.random() > 0.4) {
                                const holeX = x * tileSize + hx * holeSpacing;
                                const holeY = y * tileSize + hy * holeSpacing;
                                const holeSize = 0.8 + Math.random() * 0.7; // Small holes
                                
                                // Subtle indentations
                                ctx.fillStyle = 'rgba(220, 218, 215, 0.7)';
                                ctx.beginPath();
                                ctx.arc(holeX, holeY, holeSize, 0, Math.PI * 2);
                                ctx.fill();
                            }
                        }
                    }
                    
                    // Add occasional small smudge or stain for realism
                    if (Math.random() < 0.3) { // 30% chance per tile
                        const smudgeX = x * tileSize + Math.random() * tileSize;
                        const smudgeY = y * tileSize + Math.random() * tileSize;
                        const smudgeSize = 3 + Math.random() * 5;
                        
                        ctx.fillStyle = 'rgba(210, 208, 200, 0.2)'; // Very subtle stain
                        ctx.beginPath();
                        ctx.arc(smudgeX, smudgeY, smudgeSize, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            }
            
            // Add subtle noise for ceiling
            this.addNoiseOverlay(ctx, 0.02, 'rgba(200, 198, 190, 0.2)');
            
            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(4, 4); // Repeat the texture for larger areas
            texture.needsUpdate = true;
            
            // Enable mipmapping for better performance at distance
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipMapLinearFilter;
            
            return texture;
        });
    }
}