import * as THREE from 'three';
import WebGL from 'three/examples/jsm/capabilities/WebGL.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { LevelGenerator } from './level-generator.js';
import { CollisionSystem } from './collision-system.js';
import { ResourceManager } from './resource-manager.js';

// Key mappings
const KEYS = {
    a: 65,
    s: 83,
    w: 87,
    d: 68,
    space: 32,
    shift: 16,
    left: 37,
    up: 38,
    right: 39,
    down: 40,
    ctrl: 17,
};

function clamp(x, a, b) {
    return Math.min(Math.max(x, a), b);
}

class InputController {
    constructor(target) {
        this.target_ = target || document;
        this.initialize_();
    }

    initialize_() {
        this.current_ = {
            leftButton: false,
            rightButton: false,
            mouseXDelta: 0,
            mouseYDelta: 0,
            mouseX: 0,
            mouseY: 0,
        };
        this.previous_ = null;
        this.keys_ = {};
        this.previousKeys_ = {};
        this.target_.addEventListener("click", (e) => this.onClick_(e), false);
        this.target_.addEventListener("mousedown", (e) => this.onMouseDown_(e), false);
        this.target_.addEventListener("mousemove", (e) => this.onMouseMove_(e), false);
        this.target_.addEventListener("mouseup", (e) => this.onMouseUp_(e), false);
        this.target_.addEventListener("keydown", (e) => this.onKeyDown_(e), false);
        this.target_.addEventListener("keyup", (e) => this.onKeyUp_(e), false);
    }

    onClick_(e) {
        const canvas = document.querySelector("canvas");
        const promise = canvas.requestPointerLock({
            unadjustedMovement: true,
        });

        if (!promise) {
            console.log("disabling mouse acceleration is not supported");
            return;
        }

        return promise
            .then(() => console.log("pointer is locked"))
            .catch((error) => {
                if (error.name === "NotSupportedError") {
                    // Some platforms may not support unadjusted movement.
                    // You can request again a regular pointer lock.
                    return canvas.requestPointerLock();
                }
            });
    }

    onMouseMove_(e) {
        this.current_.mouseX = e.screenX;
        this.current_.mouseY = e.screenY;

        if (this.previous_ === null) {
            this.previous_ = { ...this.current_ };
        }
        this.current_.mouseXDelta = e.movementX;
        this.current_.mouseYDelta = e.movementY;
    }

    onMouseDown_(e) {
        this.onMouseMove_(e);

        switch (e.button) {
            case 0: {
                this.current_.leftButton = true;
                break;
            }
            case 2: {
                this.current_.rightButton = true;
                break;
            }
        }
    }

    onMouseUp_(e) {
        this.onMouseMove_(e);

        switch (e.button) {
            case 0: {
                this.current_.leftButton = false;
                break;
            }
            case 2: {
                this.current_.rightButton = false;
                break;
            }
        }
    }

    onKeyDown_(e) {
        this.keys_[e.keyCode] = true;
    }

    onKeyUp_(e) {
        this.keys_[e.keyCode] = false;
    }

    key(keyCode) {
        return !!this.keys_[keyCode];
    }

    isReady() {
        return this.previous_ !== null;
    }

    update(_) {
        if (this.previous_ !== null) {
            this.current_.mouseXDelta = this.current_.mouseX - this.previous_.mouseX;
            this.current_.mouseYDelta = this.current_.mouseY - this.previous_.mouseY;
            this.previous_ = { ...this.current_ };
        }
    }
}

class FirstPersonCamera {
    constructor(camera, objects, collisionSystem) {
        this.camera_ = camera;
        this.input_ = new InputController();
        this.rotation_ = new THREE.Quaternion();
        this.translation_ = new THREE.Vector3(0, 0, 0);
        this.phi_ = 0;
        this.phiSpeed_ = 8;
        this.theta_ = 0;
        this.thetaSpeed_ = 5;
        this.headBobActive_ = false;
        this.headBobTimer_ = 0;
        this.objects_ = objects || [];
        this.forwardSpeed_ = 2;
        this.strafeSpeed_ = 2;
        this.bobIntensity_ = 0.1;
        this.collisionSystem_ = collisionSystem; // Collision detection system
    }

    update(timeElapsedS) {
        if (!document.pointerLockElement) {
            return;
        }
        this.updateRotation_(timeElapsedS);
        this.updateTranslation_(timeElapsedS);
        this.updateHeadBob_(timeElapsedS);
        this.updateCamera_(timeElapsedS);
        this.input_.update(timeElapsedS);
    }

    updateCamera_(_) {
        this.camera_.quaternion.copy(this.rotation_);
        this.camera_.position.copy(this.translation_);
        this.camera_.position.y += Math.sin(this.headBobTimer_ * 10) * this.bobIntensity_;
        
        // Update collision system with new player position
        if (this.collisionSystem_) {
            this.collisionSystem_.updatePlayerPosition(this.camera_.position);
        }
    }

    updateHeadBob_(timeElapsedS) {
        if (this.headBobActive_) {
            const wavelength = Math.PI;
            const nextStep = 1 + Math.floor(((this.headBobTimer_ + 0.000001) * 10) / wavelength);
            const nextStepTime = (nextStep * wavelength) / 10;
            this.headBobTimer_ = Math.min(
                this.headBobTimer_ + timeElapsedS,
                nextStepTime,
            );

            if (this.headBobTimer_ == nextStepTime) {
                this.headBobActive_ = false;
            }
        }
    }

    updateTranslation_(timeElapsedS) {
        const forwardVelocity =
            (this.input_.key(KEYS.w) ? 1 : 0) + (this.input_.key(KEYS.s) ? -1 : 0);
        const strafeVelocity =
            (this.input_.key(KEYS.a) ? 1 : 0) + (this.input_.key(KEYS.d) ? -1 : 0);

        const qx = new THREE.Quaternion();
        qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);

        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(qx);
        forward.multiplyScalar(forwardVelocity * timeElapsedS * this.forwardSpeed_);

        const left = new THREE.Vector3(-1, 0, 0);
        left.applyQuaternion(qx);
        left.multiplyScalar(strafeVelocity * timeElapsedS * this.strafeSpeed_);

        // Store current position for collision check
        const currentPosition = this.translation_.clone();
        
        // Calculate proposed new position
        const proposedPosition = currentPosition.clone();
        proposedPosition.add(forward);
        proposedPosition.add(left);
        
        // Check for collisions and get adjusted position
        if (this.collisionSystem_) {
            const adjustedPosition = this.collisionSystem_.checkCollisions(
                currentPosition, 
                proposedPosition
            );
            
            // Update with collision-adjusted position
            this.translation_.copy(adjustedPosition);
        } else {
            // No collision system, just update normally
            this.translation_.add(forward);
            this.translation_.add(left);
        }

        if (forwardVelocity != 0 || strafeVelocity != 0) {
            this.headBobActive_ = true;
        }
    }

    updateRotation_(timeElapsedS) {
        const xh = this.input_.current_.mouseXDelta / window.innerWidth;
        const yh = this.input_.current_.mouseYDelta / window.innerHeight;

        this.phi_ += -xh * this.phiSpeed_;
        this.theta_ = clamp(
            this.theta_ + -yh * this.thetaSpeed_,
            -Math.PI / 3,
            Math.PI / 3,
        );

        const qx = new THREE.Quaternion();
        qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_);
        const qz = new THREE.Quaternion();
        qz.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.theta_);

        const q = new THREE.Quaternion();
        q.multiply(qx);
        q.multiply(qz);

        this.rotation_.copy(q);
    }
}

class threejsdemo {
        constructor() {
                // Create scene
                this.scene = new THREE.Scene();
                this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
                
                // Create renderer using best available option
                if (WebGL.isWebGL2Available()) {
                    this.renderer = new THREE.WebGLRenderer({ 
                        antialias: true,
                        powerPreference: 'high-performance' 
                    });
                    console.log("Using WebGL2 renderer");
                } else {
                    this.renderer = new THREE.WebGLRenderer({ antialias: true });
                    console.log("Using WebGL1 renderer");
                }
                
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.renderer.shadowMap.enabled = true;
                document.body.appendChild(this.renderer.domElement);
                
                // Set up stats
                this.stats = new Stats();
                this.stats.dom.style.position = 'absolute';
                document.body.appendChild(this.stats.dom);
                
                // Create level generator instance
                this.levelGenerator = new LevelGenerator();
                
                // Create collision system
                this.collisionSystem = new CollisionSystem(this.scene);
                
                // For performance tracking
                this.stats.addPanel(new Stats.Panel('FPS', '#0ff', '#002'));
                this.stats.showPanel(0);
                
                // Set up custom FPS controls with head bobbing
                this.setupControls();
                
                // Handle resize
                window.addEventListener('resize', () => this.onWindowResize());
                
                // Time tracking for animation
                this.clock = new THREE.Clock();
                this.previousRAF = null;
                this.fixedTimeStep = 1/60; // 60 FPS physics
                this.timeAccumulator = 0;
                
                // Resource manager for cleanup
                this.resourceManager = new ResourceManager();
                
                // Load and generate the level
                this.loadLevel('level1.json');
        }
        
        async loadLevel(levelFile) {
                try {
                        // Clear any existing level
                        if (this.currentLevel) {
                                this.scene.remove(this.currentLevel);
                                
                                // Clean up resources
                                this.collisionSystem.clear();
                        }
                
                        // Generate level from JSON
                        const level = await this.levelGenerator.loadLevel(levelFile);
                        this.scene.add(level);
                        this.currentLevel = level;
                        
                        // Connect spatial grid from level generator to collision system
                        if (level.userData.spatialGrid) {
                                this.collisionSystem.setSpatialGrid(level.userData.spatialGrid);
                        }
                        
                        // Set player at starting position
                        if (level.userData.startPosition) {
                                this.camera.position.copy(level.userData.startPosition);
                                this.fpsCamera.translation_.copy(level.userData.startPosition);
                                
                                // Create player collider
                                this.collisionSystem.createPlayerCollider(level.userData.startPosition);
                        }
                        
                        // Create wall colliders from level
                        this.setupColliders(level);
                        
                        // Store goal position for collision detection
                        this.goalPosition = level.userData.goalPosition;
                        
                        // Start animation loop if not already running
                        if (this.previousRAF === null) {
                                this.animate();
                        }
                } catch (error) {
                        console.error("Failed to load level:", error);
                }
        }
        
        setupColliders(levelGroup) {
                levelGroup.traverse((object) => {
                        // Only add colliders for wall objects
                        if (object.isMesh && object.name !== 'floor' && object.name !== 'ceiling') {
                                this.collisionSystem.addWallCollider(object);
                        }
                });
        }
        
        setupControls() {
                // Create the custom FPS camera controller with collision system
                this.fpsCamera = new FirstPersonCamera(this.camera, null, this.collisionSystem);
                
                // Add basic lighting if no level is loaded yet
                const ambient = new THREE.AmbientLight(0xffffff, 0.5);
                this.scene.add(ambient);
        }
        
        checkGoalReached() {
                if (!this.goalPosition) return false;
                
                const distance = this.camera.position.distanceTo(this.goalPosition);
                if (distance < 1.5) {
                        console.log("Goal reached!");
                        return true;
                }
                return false;
        }
        
        onWindowResize() {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
        
        animate() {
                requestAnimationFrame((t) => {
                        if (this.previousRAF === null) {
                                this.previousRAF = t;
                        }
                        
                        // Get elapsed time in seconds (with max to avoid spiral of death on tab switch)
                        const timeElapsedS = Math.min((t - this.previousRAF) * 0.001, 0.1);
                        
                        // Fixed timestep for physics/collision updates
                        this.timeAccumulator += timeElapsedS;
                        
                        // Update at fixed intervals for consistent physics
                        while (this.timeAccumulator >= this.fixedTimeStep) {
                                // Update camera with head bobbing
                                this.fpsCamera.update(this.fixedTimeStep);
                                
                                // Check if goal reached
                                this.checkGoalReached();
                                
                                this.timeAccumulator -= this.fixedTimeStep;
                        }
                        
                        // Update stats
                        this.stats.update();
                        
                        // Render the scene
                        this.renderer.render(this.scene, this.camera);
                        
                        this.previousRAF = t;
                        this.animate();
                });
        }
        
        // Clean up resources when changing levels or closing
        dispose() {
                // Dispose resources
                this.resourceManager.dispose();
                
                // Clean up event listeners
                window.removeEventListener('resize', this.onWindowResize);
                
                // Dispose renderer
                if (this.renderer) {
                        this.renderer.dispose();
                }
                
                // Clear scene
                if (this.scene) {
                        this.scene.traverse(object => {
                                if (object.isMesh) {
                                        if (object.geometry) object.geometry.dispose();
                                        if (object.material) object.material.dispose();
                                }
                        });
                }
        }
}

let _APP = null;

// Check for WebGL2 compatibility first, then fall back to WebGL1
if (WebGL.isWebGL2Available()) {
    // WebGL2 is available - best performance
    window.addEventListener("DOMContentLoaded", () => {
        _APP = new threejsdemo();
    });
} else if (WebGL.isWebGLAvailable()) {
    // WebGL1 is available as fallback - limited functionality
    console.log("WebGL2 not available, falling back to WebGL1");
    
    // Create warning but wait until after DOM content loaded to add it
    window.addEventListener("DOMContentLoaded", () => {
        // Create and show a warning about using WebGL1
        const webglVersionWarning = document.createElement("div");
        webglVersionWarning.style.position = "absolute";
        webglVersionWarning.style.top = "10px";
        webglVersionWarning.style.left = "10px";
        webglVersionWarning.style.backgroundColor = "rgba(255, 255, 0, 0.7)";
        webglVersionWarning.style.padding = "5px";
        webglVersionWarning.style.borderRadius = "5px";
        webglVersionWarning.style.color = "black";
        webglVersionWarning.style.zIndex = "10"; // Lower than container but still visible
        webglVersionWarning.innerHTML = "⚠️ Using WebGL1 - Some features may be limited";
        document.body.appendChild(webglVersionWarning);
        
        // Initialize the application
        _APP = new threejsdemo();
    });
} else {
    // Neither WebGL2 nor WebGL1 is available
    const container = document.getElementById("container");
    
    // Make container visible for error messages
    container.style.display = "flex";
    
    // Use official Three.js error message
    const webglError = WebGL.getWebGLErrorMessage();
    container.appendChild(webglError);
    
    // Add a more detailed explanation
    const detailedError = document.createElement("div");
    detailedError.style.maxWidth = "500px";
    detailedError.style.textAlign = "center";
    detailedError.style.margin = "20px";
    detailedError.innerHTML = `
        <h2>WebGL Not Available</h2>
        <p>This application requires WebGL support to run. Your browser or device does not appear to support WebGL.</p>
        <p>You can try the following:</p>
        <ul style="text-align: left">
            <li>Make sure your graphics drivers are up to date</li>
            <li>Try using a different, more modern browser</li>
            <li>Check if hardware acceleration is enabled in your browser settings</li>
            <li>If using a mobile device, try a desktop computer</li>
        </ul>
    `;
    container.appendChild(detailedError);
}