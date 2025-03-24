# Three.js Level Generator - Guidelines

## Build Commands
- Dev server: `npm run dev` or `npx vite`
- Build: `npm run build` or `npx vite build`
- Serve built files: `npm run preview` or `npx vite preview`
- Quick testing: `npm run test:quick` (runs for 5 seconds to check for errors)
- Full Three.js testing: `npm run test` (runs for 10 seconds with forced restart)
- Console error testing: `npm run test:console` (builds and checks for console errors)

## Error Detection and Automatic Fixes
- When updating code, run with a short timeout to check for console errors:
  ```bash
  npm run test:quick      # Using npm script (5 second timeout)
  # OR
  timeout 5 npx vite      # Using npx directly
  ```
- Fix any errors detected in the console output before committing changes
- For Three.js specific testing, use the following command to catch WebGL errors:
  ```bash
  npm run test            # Using npm script (10 second timeout with force restart)
  # OR
  timeout 10 npx vite --force    # Force restart and check for Three.js errors
  ```
- For automated console error detection:
  ```bash
  npm run test:console    # Build and run Playwright tests to check for console errors
  ```
- Use ESLint to catch common JavaScript errors: `npx eslint .`
- For Three.js specific imports, ensure proper module paths are used:
  - Use `import WebGL from 'three/examples/jsm/capabilities/WebGL.js'` (default export)
  - Use `import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'` (named export)
  - Note that Three.js uses the `examples/jsm` path, not `addons`
- When updating level formats, ensure the parsing logic correctly handles the data format
- Check browser console for warnings about deprecated Three.js features
- Always test all level formats when changing the parser logic

## Code Style Guidelines

### Imports
- Use ES module syntax (`import * from 'module'`)
- Organize imports: external libraries first, then internal components
- Use named imports for specific functionality

### Formatting
- Indentation: 4 spaces
- Semicolons required
- Trailing commas in multi-line objects/arrays
- Maximum line length: 100 characters

### Naming Conventions
- Classes: PascalCase (FirstPersonCamera)
- Methods/Functions: camelCase
- Private methods/properties: camelCase with underscore suffix (updateCamera_)
- Constants: UPPERCASE (KEYS)
- Variables: camelCase

### Error Handling
- Use try/catch for error-prone operations
- Log errors with descriptive messages
- Provide fallbacks for user experience when possible

### Component Structure
- Class-based architecture
- Separation of concerns (input handling, camera movement, rendering)
- Initialize with constructor, dispose with explicit cleanup methods

### Mathematics
- Use THREE.Vector3/Quaternion for 3D math
- Prefer built-in Three.js methods for transformations
- Use helper functions for common operations (clamp, lerp)

## Performance Best Practices

### Rendering Optimization
- Limit the number of lights (max 4-8 point lights)
- Use geometry instancing for repeated objects (walls, decorations)
- Cache and reuse materials instead of creating new instances
- Enable frustum culling with `object.frustumCulled = true`

### Memory Management
- Dispose unused resources with `geometry.dispose()` and `material.dispose()`
- Use texture atlases where possible to reduce draw calls
- Cache procedural textures rather than regenerating them
- Implement proper cleanup when changing levels

### Physics & Collision
- Use spatial partitioning for large levels (quadtree/octree)
- Optimize collision shapes (use simple primitives when possible)
- Only update physics for objects near the player
- Consider frame-rate independent physics with fixed time steps

### Level Design
- Use period (.) for walls and dash (-) for corridors in level JSON
- Mark start (S) and end (E) positions directly in the grid
- Limit the number of lighting calculations with strategic placement
- Consider level-of-detail techniques for distant objects

### Level JSON Format
- Level grid format now uses an array of strings for easier level design
- Each string in the array represents an entire row in the level grid
- Example format:
```json
"grid": [
    "...............",
    ".S--.---------.",
    ".-.-.---.-.-.-.",
    ".-.-----.---.-.",
    ".-.......-..-.-.",
    ".-----.-------.",
    "..............."
]
```
- The level generator will automatically parse this format into a 2D array