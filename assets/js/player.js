import * as THREE from 'three';
import { getBlockCategory, BLOCK_CATEGORIES } from './pickaxes.js';
import { BlockBreaker } from './blockBreaking.js';
import { BlockPlacer } from './blockPlacing.js';

class HealthDisplay {
    constructor(maxHealth, currentHealth) {
        this.maxHealth = maxHealth;
        this.currentHealth = currentHealth;
        
        this.container = document.createElement('div');
        this.container.id = 'hearts-container';
        this.container.style.position = 'absolute';
        this.container.style.bottom = '55px';
        this.container.style.left = 'calc(50% - 190px)';
        this.container.style.transform = 'none';
        document.getElementById('game-container').appendChild(this.container);
        
        this.updateHearts(currentHealth);
    }
    
    updateHearts(health) {
        this.currentHealth = health;
        this.container.innerHTML = '';
        
        const heartCount = Math.ceil(this.maxHealth / 2);
        
        for (let i = 0; i < heartCount; i++) {
            const heartValue = Math.min(2, Math.max(0, this.currentHealth - (i * 2)));
            const heartImg = document.createElement('img');
            
            if (heartValue === 2) {
                heartImg.src = '../images/heartfull.png';
            } else if (heartValue === 1) {
                heartImg.src = '../images/hearthalf.png';
            } else {
                heartImg.src = '../images/heartempty.png';
            }
            
            heartImg.className = 'heart-icon';
            this.container.appendChild(heartImg);
        }
    }
}

export class Player {
    constructor(camera, controls, voxelWorld, inventory, keybindings) {
        this.camera = camera;
        this.controls = controls;
        this.voxelWorld = voxelWorld;
        this.inventory = inventory;
        this.keybindings = keybindings || {
            forward: 'KeyW',
            backward: 'KeyS',
            left: 'KeyA',
            right: 'KeyD',
            jump: 'Space',
            sprint: 'ShiftLeft',
            inventory: 'KeyE'
        };
        
        this.moveSpeed = 5.022; 
        this.sprintSpeed = 7.533;
        this.jumpForce = 7.36;
        this.gravity = 20.0;
        
        this.isCreative = false;
        this.canFly = false;
        this.isFlying = false;
        this.flySpeed = 10.0;
        this.lastJumpTime = 0;
        this.doubleJumpThreshold = 300;
        
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.grounded = false;
        this.lastPosition = new THREE.Vector3();
        this.camera.position.y = 30; 
        this.lastPosition.copy(this.camera.position);
        
        this.height = 1.8; 
        this.width = 0.6;
        
        this.eyeLevel = 1.6;
        
        this.stepHeight = 0.5;
        
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            sprint: false
        };
        
        this.targetBlock = null;
        this.isMoving = false;
        this.isJumping = false;
        this.isSprinting = false;
        
        this.inventory.registerCallbacks(
            () => this.onInventoryChange(),
            (blockType) => this.onItemDrop(blockType)
        );
        
        this.setupKeyListeners();
        this.setupMouseListeners();
        
        this.maxHealth = 20;
        this.currentHealth = 20;
        this.invulnerableTime = 0;
        this.healthDisplay = new HealthDisplay(this.maxHealth, this.currentHealth);
        
        this.timeSinceLastDamage = 0;
        this.regenDelay = 3.0;
        this.regenTimer = 0;
        
        this.lastCactusDamageTime = 0;
        this.cactusDamageInterval = 0.8; // 0.8 seconds between cactus damage
        
        // Initialize the block breaker
        this.blockBreaker = new BlockBreaker(this, voxelWorld);
        
        // Initialize the block placer
        this.blockPlacer = new BlockPlacer(voxelWorld, inventory);
        
        this.blockBreakTimes = BLOCK_CATEGORIES;
        
        this.particleSystem = null;
    }
    
    setupKeyListeners() {
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
    }
    
    setupMouseListeners() {
        document.addEventListener('mousedown', (event) => {
            if (!this.controls.isLocked) return;
            
            if (event.button === 0 && this.targetBlock) {
                const { x, y, z } = this.targetBlock.position;
                const blockType = this.voxelWorld.getBlock(x, y, z);
                const grassKey = `${x},${y},${z}_grass_decoration`;
                const grassChunkX = Math.floor(x / this.voxelWorld.chunkSize);
                const grassChunkZ = Math.floor(z / this.voxelWorld.chunkSize);
                const grassChunkKey = `${grassChunkX},${grassChunkZ}`;
                const grassChunk = this.voxelWorld.chunks.get(grassChunkKey);
                
                const isGrass = grassChunk && grassChunk.blocks.has(`${
                    ((x % this.voxelWorld.chunkSize) + this.voxelWorld.chunkSize) % this.voxelWorld.chunkSize
                },${y},${
                    ((z % this.voxelWorld.chunkSize) + this.voxelWorld.chunkSize) % this.voxelWorld.chunkSize
                }_grass_decoration`);
                
                if (isGrass) {
                    const result = this.voxelWorld.breakBlock(x, y, z);
                    if (result === "seeds") {
                        this.inventory.addItem(result);
                        this.inventory.saveInventory();
                    }
                    return;
                }
                
                this.blockBreaker.startBreakingBlock(this.targetBlock, this.isCreative);
            } else if (event.button === 2 && this.targetBlock) {
                const success = this.blockPlacer.attemptPlaceBlock(
                    this.targetBlock, 
                    this.camera.position, 
                    this.isCreative
                );
                
                if (success && !this.controls.isLocked) {
                    this.controls.unlock();
                }
            }
        });
        
        document.addEventListener('mouseup', (event) => {
            if (event.button === 0) {
                this.blockBreaker.cancelBlockBreaking();
            }
        });
        
        document.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }
    
    onMouseDown = function(event) {
        if (!this.controls.isLocked) return;
        
        if (event.button === 0 && this.targetBlock) {
            const { x, y, z } = this.targetBlock.position;
            const blockType = this.voxelWorld.getBlock(x, y, z);
            
            const result = this.voxelWorld.breakBlock(x, y, z);
            
            if (result !== false) {
                if (this.particleSystem) {
                    this.particleSystem.createBlockParticles(
                        result || blockType, 
                        { x, y, z }
                    );
                }
                
                if (result !== null) {
                    this.inventory.addItem(result);
                    this.inventory.saveInventory();
                }
            }
        } else if (event.button === 2 && this.targetBlock) {
            const success = this.blockPlacer.attemptPlaceBlock(
                this.targetBlock, 
                this.camera.position, 
                this.isCreative
            );
            
            if (success && !this.controls.isLocked) {
                this.controls.unlock();
            }
        }
    }
    
    onKeyDown(event) {
        if (event.code === this.keybindings.forward) {
            this.keys.forward = true;
            this.isMoving = true;
        } else if (event.code === this.keybindings.backward) {
            this.keys.backward = true;
            this.isMoving = true;
        } else if (event.code === this.keybindings.left) {
            this.keys.left = true;
            this.isMoving = true;
        } else if (event.code === this.keybindings.right) {
            this.keys.right = true;
            this.isMoving = true;
        } else if (event.code === this.keybindings.jump) {
            this.keys.jump = true;
            
            if (this.isCreative) {
                const now = Date.now();
                if (now - this.lastJumpTime < this.doubleJumpThreshold) {
                    this.isFlying = !this.isFlying;
                    
                    if (typeof updateFlyingIndicator === 'function') {
                        updateFlyingIndicator(this.isFlying);
                    }
                    
                    if (this.isFlying) {
                        this.velocity.y = 0;
                    }
                }
                this.lastJumpTime = now;
                
                if (this.isFlying) {
                    this.velocity.y = this.flySpeed;
                } else if (this.grounded) {
                    this.velocity.y = this.jumpForce;
                    this.grounded = false;
                    this.isJumping = true;
                }
            } else {
                if (this.grounded) {
                    this.velocity.y = this.jumpForce;
                    this.grounded = false;
                    this.isJumping = true;
                }
            }
        } else if (event.code === this.keybindings.sprint) {
            this.keys.sprint = true;
            this.isSprinting = true;
        } else if (event.code === this.keybindings.inventory) {
            this.inventory.toggleInventory();
        }
    }
    
    onKeyUp(event) {
        if (event.code === this.keybindings.forward) {
            this.keys.forward = false;
        } else if (event.code === this.keybindings.backward) {
            this.keys.backward = false;
        } else if (event.code === this.keybindings.left) {
            this.keys.left = false;
        } else if (event.code === this.keybindings.right) {
            this.keys.right = false;
        } else if (event.code === this.keybindings.jump) {
            this.keys.jump = false;
            
            if (this.isCreative && this.isFlying && this.velocity.y > 0) {
                this.velocity.y = 0;
            }
        } else if (event.code === this.keybindings.sprint) {
            this.keys.sprint = false;
            this.isSprinting = false;
        }
        
        this.isMoving = this.keys.forward || this.keys.backward || this.keys.left || this.keys.right;
    }
    
    update(deltaTime) {
        if (!this.controls.isLocked) return;
        
        const cappedDelta = Math.min(deltaTime, 0.1);
        
        if (this.invulnerableTime > 0) {
            this.invulnerableTime -= deltaTime;
        }
        
        if (!this.isCreative) {
            this.updateHealthRegeneration(deltaTime);
            this.checkCactusCollision(deltaTime);
        }
        
        if (!this.isCreative || !this.isFlying) {
            this.applyGravity(deltaTime);
        }
        
        this.handleMovement(cappedDelta);
        
        if (this.isCreative && this.isFlying) {
            if (this.keys.sprint) {
                this.velocity.y = -this.flySpeed;
            }
            
            this.camera.position.y += this.velocity.y * cappedDelta;
            
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            forward.y = 0;
            forward.normalize();
            
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            right.y = 0;
            right.normalize();
            
            const moveAmount = this.flySpeed * cappedDelta;
            
            if (this.keys.forward) this.camera.position.addScaledVector(forward, moveAmount);
            if (this.keys.backward) this.camera.position.addScaledVector(forward, -moveAmount);
            if (this.keys.right) this.camera.position.addScaledVector(right, moveAmount);
            if (this.keys.left) this.camera.position.addScaledVector(right, -moveAmount);
        } else {
            this.detectCollisions(cappedDelta);
            
            this.resolveBlockCollisions();
        }
        
        const isInMotion = this.isMoving || !this.grounded || Math.abs(this.velocity.y) > 0.1;
        
        if (!isInMotion || this._frameCounter % 2 === 0) {
            this.updateTargetBlock();
        }
        
        if (!this._frameCounter) this._frameCounter = 0;
        this._frameCounter++;
        
        if (this.grounded) {
            this.isJumping = false;
        }
        
        this.lastPosition.copy(this.camera.position);
        
        this.savePosition();
        if (this.blockBreaker.isBreakingBlock()) {
            const brokenBlockType = this.blockBreaker.continueBreakingBlock(
                deltaTime, 
                this.targetBlock, 
                this.camera, 
                this.isCreative
            );
            
            if (brokenBlockType) {
                if (this.particleSystem && this.targetBlock) {
                    this.particleSystem.createBlockParticles(
                        brokenBlockType, 
                        this.targetBlock.position
                    );
                }
                
                if (!this.isCreative) {
                    this.inventory.addItem(brokenBlockType);
                    this.inventory.saveInventory();
                }
            }
        }
    }
    
    handleMovement(deltaTime) {
        if (this.isCreative && this.isFlying) return;
        
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        forward.y = 0;
        forward.normalize();
        
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        right.y = 0;
        right.normalize();
        
        const moveDirection = new THREE.Vector3(0, 0, 0);
        
        if (this.keys.forward) moveDirection.add(forward);
        if (this.keys.backward) moveDirection.sub(forward);
        if (this.keys.right) moveDirection.add(right);
        if (this.keys.left) moveDirection.sub(right);
        
        if (moveDirection.lengthSq() > 0) {
            moveDirection.normalize();
            const currentSpeed = this.keys.sprint ? this.sprintSpeed : this.moveSpeed;
            moveDirection.multiplyScalar(currentSpeed * deltaTime);
            
            this.velocity.x = moveDirection.x;
            this.velocity.z = moveDirection.z;
        } else {
            this.velocity.x = 0;
            this.velocity.z = 0;
        }
    }
    
    applyGravity(deltaTime) {
        this.velocity.y -= this.gravity * deltaTime;
    }
    
    detectCollisions(deltaTime) {
        const position = this.camera.position.clone();
        
        const originalVelocity = this.velocity.clone();
        
        const nextPosition = position.clone();
        nextPosition.y += this.velocity.y * deltaTime;
        
        const feetPos = nextPosition.clone();
        feetPos.y -= this.eyeLevel;
        const blockBelowFeet = this.getVoxelBelow(feetPos);
        
        if (blockBelowFeet && this.velocity.y <= 0) {
            nextPosition.y = Math.floor(feetPos.y) + 1 + this.eyeLevel; 
            this.velocity.y = 0;
            this.grounded = true;
        } else {
            this.grounded = false;
        }
        
        const headPos = nextPosition.clone();
        const headOffset = this.height - this.eyeLevel + 0.1;
        headPos.y += headOffset;
        if (this.isPositionColliding(headPos) && this.velocity.y > 0) {
            this.velocity.y = 0;
            nextPosition.y = Math.ceil(headPos.y) - headOffset - 0.01;
        }
        
        this.handleHorizontalCollision(nextPosition, originalVelocity, deltaTime);
        
        this.camera.position.copy(nextPosition);
    }
    
    handleHorizontalCollision(nextPosition, velocity, deltaTime) {
        const originalY = nextPosition.y;
        
        if (Math.abs(velocity.x) > 0.0001) {
            nextPosition.x += velocity.x;
            if (this.checkBodyCollision(nextPosition)) {
                nextPosition.y += this.stepHeight;
                if (this.checkBodyCollision(nextPosition)) {
                    nextPosition.y = originalY;
                    nextPosition.x -= velocity.x;
                    this.velocity.x = 0;
                }
            }
        }
        
        if (Math.abs(velocity.z) > 0.0001) {
            nextPosition.z += velocity.z;
            if (this.checkBodyCollision(nextPosition)) {
                nextPosition.y += this.stepHeight;
                if (this.checkBodyCollision(nextPosition)) {
                    nextPosition.y = originalY;
                    nextPosition.z -= velocity.z;
                    this.velocity.z = 0;
                }
            }
        }
        
        if (nextPosition.y > originalY) {
            if (!this.checkBodyCollision(nextPosition)) {
                const floorCheck = nextPosition.clone();
                floorCheck.y -= this.stepHeight + 0.01;
                if (!this.checkBodyCollision(floorCheck)) {
                    nextPosition.y = originalY;
                }
            } else {
                nextPosition.y = originalY;
            }
        }
    }
    
    ensureValidPosition() {
        const position = this.camera.position.clone();
        
        if (this.checkBodyCollision(position)) {
            for (let y = 1; y < 20; y++) {
                position.y += 1;
                if (!this.checkBodyCollision(position)) {
                    this.camera.position.copy(position);
                    return;
                }
            }
            
            this.camera.position.set(0, 30, 0);
        }
        
        const feetPos = position.clone();
        feetPos.y -= this.eyeLevel;
        if (!this.getVoxelBelow(feetPos)) {
            this.voxelWorld.ensureChunkLoaded(
                Math.floor(position.x / this.voxelWorld.chunkSize),
                Math.floor(position.z / this.voxelWorld.chunkSize)
            );
            
            for (let y = Math.floor(position.y); y > 0; y--) {
                if (this.voxelWorld.isBlockSolid(
                    Math.floor(position.x), 
                    y - 1, 
                    Math.floor(position.z)
                )) {
                    this.camera.position.y = y + this.eyeLevel;
                    return;
                }
            }
            
            this.camera.position.set(0, 30, 0);
        }
    }
    
    resolveBlockCollisions() {
        if (!this.checkBodyCollision(this.camera.position)) {
            return;
        }
        
        const position = this.camera.position.clone();
        const pushDistance = 0.1;
        const maxAttempts = 10;
        
        const directions = [
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(-1, 0, 0),
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, -1)
        ];
        
        let bestDirection = null;
        let shortestDistance = Infinity;
        
        for (const dir of directions) {
            const tempPos = position.clone();
            let distance = 0;
            let attempts = 0;
            
            while (attempts < maxAttempts) {
                tempPos.add(dir.clone().multiplyScalar(pushDistance));
                distance += pushDistance;
                attempts++;
                
                if (!this.checkBodyCollision(tempPos)) {
                    if (distance < shortestDistance) {
                        shortestDistance = distance;
                        bestDirection = dir;
                    }
                    break;
                }
            }
        }
        
        if (bestDirection) {
            const pushVector = bestDirection.clone().multiplyScalar(shortestDistance + 0.05);
            this.camera.position.add(pushVector);
            
            const velocityDot = this.velocity.dot(bestDirection);
            if (velocityDot < 0) {
                this.velocity.sub(bestDirection.clone().multiplyScalar(velocityDot));
            }
        } else {
            this.camera.position.y += this.height;
        }
    }
    
    checkBodyCollision(position) {
        const radius = this.width / 2;
        const tests = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(radius, 0, 0),
            new THREE.Vector3(-radius, 0, 0),
            new THREE.Vector3(0, 0, radius),
            new THREE.Vector3(0, 0, -radius),
            new THREE.Vector3(radius * 0.7, 0, radius * 0.7),
            new THREE.Vector3(radius * 0.7, 0, -radius * 0.7),
            new THREE.Vector3(-radius * 0.7, 0, radius * 0.7),
            new THREE.Vector3(-radius * 0.7, 0, -radius * 0.7)
        ];
        
        const eyeToFeet = this.eyeLevel;
        const eyeToHead = this.height - this.eyeLevel;
        
        const heights = [
            -eyeToFeet + 0.1,
            -eyeToFeet/2,
            0,
            eyeToHead/2,
            eyeToHead - 0.1
        ];
        
        for (const height of heights) {
            for (const test of tests) {
                const testPoint = position.clone().add(test);
                testPoint.y += height;
                
                if (this.isPositionColliding(testPoint)) {
                    return true;
                }
            }
        }
        return false;
    }
    
    isPositionColliding(position) {
        const x = Math.floor(position.x);
        const y = Math.floor(position.y);
        const z = Math.floor(position.z);
        
        const blockType = this.voxelWorld.getBlock(x, y, z);
        
        if (!blockType) return false;
        
        if (blockType === 'oakdoor' || blockType === 'birchdoor') {
            const isOpen = this.voxelWorld.door.isOpen(x, y, z);
            
            if (isOpen) {
                const localX = position.x - x;
                const localZ = position.z - z;
                
                const orientation = this.voxelWorld.door.getOrientation(x, y, z);
                
                const doorThickness = this.voxelWorld.door.thickness;
                
                switch(orientation) {
                    case 0: 
                        if (localX > doorThickness) return false;
                        break;
                    case 1: 
                        if (localZ > doorThickness) return false;
                        break;
                    case 2: 
                        if (localX < 1 - doorThickness) return false;
                        break;
                    case 3: 
                        if (localZ < 1 - doorThickness) return false;
                        break;
                }
            }
        }
        
        if (this.voxelWorld.isSlab(blockType)) {
            const localY = position.y - y;
            
            if (localY > 0.5) {
                return false;
            }
        }
        
        return this.voxelWorld.isBlockSolid(x, y, z);
    }
    
    getVoxelBelow(position) {
        const x = Math.floor(position.x);
        const y = Math.floor(position.y);
        const z = Math.floor(position.z);
        
        return this.voxelWorld.isBlockSolid(x, y, z);
    }
    
    updateTargetBlock() {
        const raycaster = new THREE.Raycaster();
        const center = new THREE.Vector2(0, 0);
        
        raycaster.setFromCamera(center, this.camera);
        
        this.targetBlock = this.voxelWorld.raycast(this.camera.position, raycaster.ray.direction);
    }
    
    onInventoryChange() {
    }
    
    onItemDrop(blockType) {
    }
    
    takeDamage(amount) {
        if (this.isCreative) return;
        
        if (this.invulnerableTime > 0) return;
        
        this.currentHealth = Math.max(0, this.currentHealth - amount);
        this.invulnerableTime = 0.5;
        this.healthDisplay.updateHearts(this.currentHealth);
        
        this.timeSinceLastDamage = 0;
        this.regenTimer = 0;
        
        const gameContainer = document.getElementById('game-container');
        gameContainer.classList.add('damage-flash');
        setTimeout(() => {
            gameContainer.classList.remove('damage-flash');
        }, 150);
        
        if (this.currentHealth <= 0) {
            this.die();
        }
    }
    
    heal(amount) {
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
        this.healthDisplay.updateHearts(this.currentHealth);
    }
    
    die() {
        this.currentHealth = this.maxHealth;
        this.healthDisplay.updateHearts(this.currentHealth);
        
        const currentPos = this.camera.position.clone();
        
        // Find a valid spawn point on the ground instead of using fixed Y value
        let y = 100;
        const x = Math.floor(currentPos.x);
        const z = Math.floor(currentPos.z);
        
        // Make sure the chunk is loaded
        this.voxelWorld.ensureChunkLoaded(
            Math.floor(x / this.voxelWorld.chunkSize),
            Math.floor(z / this.voxelWorld.chunkSize)
        );
        
        // Scan downward to find the ground
        while (y > 0) {
            if (this.voxelWorld.isBlockSolid(x, y-1, z)) {
                this.camera.position.set(currentPos.x, y + this.eyeLevel, currentPos.z);
                break;
            }
            y--;
        }
        
        // Fallback in case no ground is found
        if (y <= 0) {
            this.camera.position.set(currentPos.x, 30, currentPos.z);
        }
        
        this.velocity.set(0, 0, 0);
    }
    
    updateHealthRegeneration(deltaTime) {
        this.timeSinceLastDamage += deltaTime;
        
        if (this.currentHealth >= this.maxHealth) {
            return;
        }
        
        if (this.timeSinceLastDamage >= this.regenDelay) {
            this.regenTimer += deltaTime;
            
            if (this.regenTimer >= 1.0) {
                this.heal(1);
                
                this.regenTimer -= 1.0;
            }
        }
    }
    
    checkCactusCollision(deltaTime) {
        if (this.invulnerableTime > 0) return;
        
        const x = Math.floor(this.camera.position.x);
        const y = Math.floor(this.camera.position.y);
        const z = Math.floor(this.camera.position.z);
        
        // Check current position and positions around player for cacti
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const blockType = this.voxelWorld.getBlock(x + dx, y + dy, z + dz);
                    if (blockType === 'cacti') {
                        const now = Date.now() / 1000; // Convert to seconds
                        if (now - this.lastCactusDamageTime >= this.cactusDamageInterval) {
                            this.takeDamage(2); // 1 heart = 2 health points
                            this.lastCactusDamageTime = now;
                        }
                        return;
                    }
                }
            }
        }
    }
    
    getPlayerData() {
        return {
            position: {
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z
            },
            rotation: {
                x: this.camera.rotation.x,
                y: this.camera.rotation.y,
                z: this.camera.rotation.z
            },
            health: this.currentHealth
        };
    }
    
    loadFromData(playerData) {
        if (playerData) {
            try {
                this.camera.position.set(
                    playerData.position.x,
                    playerData.position.y,
                    playerData.position.z
                );
                
                this.camera.rotation.set(
                    playerData.rotation.x,
                    playerData.rotation.y,
                    playerData.rotation.z
                );
                
                if (playerData.health !== undefined) {
                    this.currentHealth = playerData.health;
                    this.healthDisplay.updateHearts(this.currentHealth);
                }
                
                this.ensureValidPosition();
                
                return true;
            } catch (e) {
                console.error('Error loading player data:', e);
            }
        }
        return false;
    }
    
    savePosition() {
        const now = Date.now();
        if (!this._lastSaveTime || now - this._lastSaveTime > 1000) {
            const pos = this.camera.position;
            const rot = this.camera.rotation;
            
            const playerData = {
                position: { x: pos.x, y: pos.y, z: pos.z },
                rotation: { x: rot.x, y: rot.y, z: rot.z }
            };
            
            localStorage.setItem('playerData', JSON.stringify(playerData));
            this._lastSaveTime = now;
        }
    }
    
    loadPosition() {
        const savedData = localStorage.getItem('playerData');
        if (savedData) {
            try {
                const playerData = JSON.parse(savedData);
                
                this.camera.position.set(
                    playerData.position.x,
                    playerData.position.y,
                    playerData.position.z
                );
                
                this.camera.rotation.set(
                    playerData.rotation.x,
                    playerData.rotation.y,
                    playerData.rotation.z
                );
                
                this.ensureValidPosition();
                
                return true;
            } catch (e) {
                console.error('Error loading player data:', e);
            }
        }
        return false;
    }
}
