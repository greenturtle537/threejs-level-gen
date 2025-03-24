# Three.js Level Generator

An interactive 3D maze generator and viewer built with Three.js.

## Features

- Procedural level generation from JSON-based grid format
- First-person camera with collision detection
- Dynamic lighting with shadow casting
- Memory-efficient level rendering with spatial hash grid optimization
- Support for multiple level designs

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
4. Build for production: `npm run build`

## Level Format

Levels are defined in JSON files with a grid-based format:

```json
{
  "name": "Office Maze - Level 1",
  "description": "Navigate through the complex office corridors to find the exit",
  "legend": {
      ".": "Wall",
      "-": "Corridor", 
      "S": "Start position",
      "E": "End/goal position"
  },
  "grid": [
      "...............",
      ".S--.---------.",
      ".-.-.---.-.-.-.",
      ".-.-----.---.-.",
      ".-.......-..-.-.",
      ".-----.-------.",
      "..............."
  ],
  "difficulty": "easy"
}
```

## Technical Details

The project uses:
- Three.js for 3D rendering
- Vite for fast development and builds
- ES6 modules for code organization
- Custom spatial partitioning for collision optimization
- Resource management for texture and geometry reuse

See CLAUDE.md for additional development guidelines.

## License

MIT
