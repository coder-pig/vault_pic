import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { VoxelWorld } from './voxelWorld.js';
import { Player } from './player.js';
import { Inventory } from './inventory.js';
import { 
    gameSettings, fogSettings, loadGameSettings, saveGameSettings, 
    updateSettingsUI, updateKeybindButtonsDisplay, getKeyDisplayName,
    updateCameraFOV, applyCameraSensitivity, updateShadowSettings,
    updateFogForRenderDistance, updateFog, toggleFog, toggleFogType,
    updateChunkUpdateRate, resetSettings, resetKeybindings
} from './settings.js';
import * as mods from './mods.js';
import './pickaxes.js';
import { BlockBreaker } from './blockBreaking.js';
import { BlockPlacer } from './blockPlacing.js';
import { BlockParticleSystem } from './blockParticles.js';
import { 
    dayNightCycle, initDayNightCycle, updateDayNightCycle, 
    updateShadowPosition, updateSunPosition, updateStarsPosition
} from './dayNightCycle.js';

let scene, camera, renderer, controls;
let player, voxelWorld, inventory;
let clock = new THREE.Clock();
let frameCount = 0;
let lastFpsUpdate = 0;
let highlightBox;
let highlightBoxEdges;
let currentWorldName = null;
let directionalLight;
let voxelSun;
let ambientLight, hemisphereLight, backLight, sunTarget;
let particleSystem;
let dayCounter = null;
let daysPassed = 0;
let lastDayCheck = 0;

// Day/night cycle variables
let gameTime = 0;
let stars = [];
let moon;

// Pre-load sounds to reduce delay
const clickSound = new Audio('../audio/click.mp3');
clickSound.volume = 0.5;

let worldSettings = {
    isCreative: false,
    isSuperflat: false
};

async function init(worldData = null) {
    document.getElementById('menu-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    document.getElementById('pause-menu').style.display = 'none';
    
    document.getElementById('inventory-screen').style.display = 'none';
    document.getElementById('crafting-table-screen').style.display = 'none';
    document.getElementById('furnace-screen').style.display = 'none';
    document.getElementById('chest-screen').style.display = 'none';
    
    // Remove the held item display if it exists
    const heldItemDisplay = document.getElementById('held-item-display');
    if (heldItemDisplay) {
        heldItemDisplay.style.display = 'none';
    }
    
    loadGameSettings();

    if (worldData && worldData.settings) {
        worldSettings = worldData.settings;
    }

    if (worldSettings.isCreative) {
        createFlyingIndicator();
    }

    scene = new THREE.Scene();
    
    // Initialize with day sky color but we'll update it based on time
    scene.background = new THREE.Color(0x9edfff);

    updateFogForRenderDistance(scene);

    if (gameSettings.fog) {
        if (fogSettings.fogType === 'linear') {
            scene.fog = new THREE.Fog(fogSettings.fogColor, fogSettings.linearFogNear, fogSettings.linearFogFar);
            scene.fog._baseFar = fogSettings.linearFogFar; 
        } else {
            scene.fog = new THREE.FogExp2(fogSettings.fogColor, fogSettings.expFogDensity);
            scene.fog._baseDensity = fogSettings.expFogDensity; 
        }
        
        function enhancedUpdateFog(scene, camera) {
            updateFog(scene, camera);
            
            if (scene && scene.fog && scene.fog.isFog) {
                scene.traverse(object => {
                    if (object.isMesh && object.position.y > fogSettings.skyHeightCutoff) {
                        if (!object._originalMaterial) {
                            object._originalMaterial = object.material;
                            object.material = object.material.clone();
                            object.material.fog = false;
                        }
                    } else if (object.isMesh && object._originalMaterial && object.position.y <= fogSettings.skyHeightCutoff) {
                        object.material = object._originalMaterial;
                        delete object._originalMaterial;
                    }
                });
            }
        }
        
        window.gameUpdateFog = enhancedUpdateFog;
    }

    camera = new THREE.PerspectiveCamera(gameSettings.fov, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 30, 0);

    const canvas = document.getElementById('game-canvas');
    renderer = new THREE.WebGLRenderer({ 
        canvas, 
        antialias: true,
        shadowMap: {
            enabled: true
        }
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    renderer.shadowMap.enabled = gameSettings.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    
    setupLighting();
    
    const dayNightObjects = initDayNightCycle(scene);
    stars = dayNightObjects.stars;
    moon = dayNightObjects.moon;
    voxelSun = dayNightObjects.voxelSun;
    
    controls = new PointerLockControls(camera, document.body);
    
    // Make controls globally accessible for inventory screens
    window.controls = controls;
    
    applyCameraSensitivity(controls);

    inventory = new Inventory();

    if (worldData && worldData.inventory) {
        inventory.loadFromData(worldData.inventory);
    } else {
        inventory.loadInventory();
    }

    particleSystem = new BlockParticleSystem(scene);
    particleSystem.setCamera(camera);

    voxelWorld = new VoxelWorld(scene, worldData);
    voxelWorld.renderDistance = gameSettings.renderDistance;
    voxelWorld.isSuperflat = worldSettings.isSuperflat;

    updateChunkUpdateRate(voxelWorld);

    player = new Player(camera, controls, voxelWorld, inventory, gameSettings.keybindings);
    player.particleSystem = particleSystem;
    
    if (worldSettings.isCreative) {
        player.isCreative = true;
        player.canFly = true;
        
        if (inventory) {
            fillCreativeInventory();
        }
    }
    
    player.justSpawned = true;
    player._lastGroundedY = player.camera.position.y;
    player._wasGrounded = false;
    
    const originalUpdate = player.update.bind(player);
    player.update = function(deltaTime) {
        originalUpdate(deltaTime);
        
        if (this.grounded) {
            if (!this._wasGrounded) {
                if (!this.justSpawned) {
                    const fallDistance = this._lastGroundedY - this.camera.position.y;
                    
                    if (fallDistance > 3) {
                        const damage = Math.floor((fallDistance - 3) * 2);
                        if (damage > 0) {
                            this.takeDamage(damage);
                        }
                    }
                } else {
                    this.justSpawned = false;
                }
                
                this._lastGroundedY = this.camera.position.y;
            }
            this._wasGrounded = true;
        } else {
            this._wasGrounded = false;
        }
    };

    setupEventListeners();

    let positionLoaded = false;
    if (worldData && worldData.player) {
        positionLoaded = player.loadFromData(worldData.player);
    } else {
        positionLoaded = player.loadPosition();
    }

    let centerChunkX = 0, centerChunkZ = 0;
    if (positionLoaded) {
        centerChunkX = Math.floor(camera.position.x / voxelWorld.chunkSize);
        centerChunkZ = Math.floor(camera.position.z / voxelWorld.chunkSize);
    }

    voxelWorld.generateWorld(centerChunkX, centerChunkZ);

    if (!positionLoaded) {
        const spawnPoint = findSpawnPoint(centerChunkX, centerChunkZ);
        camera.position.copy(spawnPoint);
    }

    createHighlightBox();

    updateShadowSettings(renderer, directionalLight);
    
    updateFogForRenderDistance(scene);
    if (window.gameUpdateFog) {
        window.gameUpdateFog(scene, camera);
    } else {
        updateFog(scene, camera);
    }

    // Setup day counter if needed
    if (worldData && worldData.settings && worldData.settings.showDays) {
        setupDayCounter();
    }
    setupAutosaveTimer();
    
    gameTime = worldData && worldData.gameTime !== undefined ? worldData.gameTime : 0;
    daysPassed = worldData && worldData.days !== undefined ? worldData.days : 0;
    lastDayCheck = gameTime;

    animate();

    window.addEventListener('beforeunload', saveGameState);
}

function setupLighting() {
    ambientLight = new THREE.AmbientLight(0xffffee, 0.35);
    scene.add(ambientLight);
    
    hemisphereLight = new THREE.HemisphereLight(0xbbeeff, 0x71a734, 0.4);
    scene.add(hemisphereLight);
    
    sunTarget = new THREE.Object3D();
    scene.add(sunTarget);
    
    directionalLight = new THREE.DirectionalLight(0xfff6e0, 1.0);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = gameSettings.shadows;
    directionalLight.shadow.bias = -0.0005;
    directionalLight.shadow.normalBias = 0.03;
    directionalLight.target = sunTarget;
    scene.add(directionalLight);
    
    const shadowSize = 180;
    const resolution = 2048;
    
    directionalLight.shadow.camera.left = -shadowSize / 2;
    directionalLight.shadow.camera.right = shadowSize / 2;
    directionalLight.shadow.camera.top = shadowSize / 2;
    directionalLight.shadow.camera.bottom = -shadowSize / 2;
    directionalLight.shadow.camera.near = 5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.mapSize.width = resolution;
    directionalLight.shadow.mapSize.height = resolution;
    
    const skyLight = new THREE.DirectionalLight(0xb0d8ff, 0.25);
    skyLight.position.set(0, 100, 0);
    scene.add(skyLight);
    
    const groundLight = new THREE.DirectionalLight(0xe5c580, 0.18);
    groundLight.position.set(0, -10, 0);
    scene.add(groundLight);
    
    const fillLight = new THREE.DirectionalLight(0xdfecff, 0.28);
    fillLight.position.set(-30, 40, -30);
    scene.add(fillLight);
    
    backLight = new THREE.DirectionalLight(0xffffee, 0.3);
    backLight.position.set(0, 30, -50);
    scene.add(backLight);
}

function findSpawnPoint(chunkX, chunkZ) {
    const startX = chunkX * voxelWorld.chunkSize + voxelWorld.chunkSize / 2;
    const startZ = chunkZ * voxelWorld.chunkSize + voxelWorld.chunkSize / 2;
    
    let y = 100;
    
    while (y > 0) {
        if (voxelWorld.isBlockSolid(Math.floor(startX), y-1, Math.floor(startZ))) {
            return new THREE.Vector3(startX, y + 0.1, startZ);
        }
        y--;
    }
    
    return new THREE.Vector3(startX, 30, startZ);
}

function createFlyingIndicator() {
    const flyingIndicator = document.createElement('div');
    flyingIndicator.id = 'flying-indicator';
    flyingIndicator.className = 'flying-indicator';
    flyingIndicator.textContent = 'Flying';
    document.getElementById('game-container').appendChild(flyingIndicator);
}

function updateFlyingIndicator(isFlying) {
    const indicator = document.getElementById('flying-indicator');
    if (indicator) {
        if (isFlying) {
            indicator.classList.add('visible');
        } else {
            indicator.classList.remove('visible');
        }
    }
}

function fillCreativeInventory() {
    inventory.isCreative = true;
    inventory.slots = new Array(9).fill().map(() => ({ type: null, count: 0 }));
    inventory.mainSlots = new Array(27).fill().map(() => ({ type: null, count: 0 }));
    
    const allBlocks = [
        'grass', 'dirt', 'stone', 'smoothstone', 'cobble', 
        'wood', 'birchwood', 'leaves', 'birchleaves',
        'plank', 'birchplank', 'craftingtable', 'oakdoor', 'birchdoor',
        'sand', 'sandstone', 'cacti', 'furnace', 'glass',
        'snow', 'oakslab', 'birchslab', 'chest', 'stick', 
        'woodpickaxe', 'stonepickaxe', 'woodhoe', 'seeds', 'wheat', 
        'haybale', 'farmland'
    ];
    
    allBlocks.forEach((blockType, index) => {
        if (index < 9) {
            inventory.slots[index] = { type: blockType, count: 64 };
        } else if (index < 36) {
            inventory.mainSlots[index - 9] = { type: blockType, count: 64 };
        }
    });
    
    inventory.updateAllDisplays();
}

function createAndStartWorld(worldName) {
    const worlds = JSON.parse(localStorage.getItem('minecraft_worlds') || '{}');

    if (worlds[worldName]) {
        alert('A world with this name already exists. Please choose another name.');
        return;
    }

    const seedInput = document.getElementById('world-seed-input').value.trim();
    let worldSeed;

    if (seedInput) {
        if (!isNaN(seedInput)) {
            worldSeed = parseInt(seedInput);
        } else {
            worldSeed = 0;
            for (let i = 0; i < seedInput.length; i++) {
                worldSeed += seedInput.charCodeAt(i);
            }
        }
    } else {
        worldSeed = Math.floor(Math.random() * 1000000);
    }

    const isCreative = document.getElementById('creative-toggle').checked;
    const isSuperflat = document.getElementById('superflat-toggle').checked;
    const showDays = document.getElementById('show-days-toggle').checked;

    currentWorldName = worldName;

    const initialWorldData = {
        seed: worldSeed,
        name: worldName,
        settings: {
            isCreative: isCreative,
            isSuperflat: isSuperflat,
            showDays: showDays
        },
        days: 0,
        gameTime: 0
    };

    if (isSuperflat) {
        import('./superflat.js').then(superflatModule => {
            initialWorldData.superflatLayers = superflatModule.getSuperflatLayers();
            init(initialWorldData);
        });
    } else {
        init(initialWorldData);
    }
}

function loadWorld(worldName) {
    const worlds = JSON.parse(localStorage.getItem('minecraft_worlds') || '{}');

    if (worlds[worldName]) {
        currentWorldName = worldName;
        
        if (!worlds[worldName].settings) {
            worlds[worldName].settings = {
                isCreative: false,
                isSuperflat: false,
                showDays: false
            };
        } else if (worlds[worldName].settings.showDays === undefined) {
            worlds[worldName].settings.showDays = false;
        }
        
        const worldData = JSON.parse(JSON.stringify(worlds[worldName]));
        if (worldData.settings.isSuperflat && worldData.superflatLayers) {
            import('./superflat.js').then(superflatModule => {
                superflatModule.setSuperflatLayers(worldData.superflatLayers);
                init(worldData);
            }).catch(err => {
                console.error('Error loading superflat layers:', err);
                init(worldData); 
            });
        } else {
            init(worldData);
        }
    } else {
        alert('World not found!');
    }
}

function showOptionsMenu() {
    // 隐藏所有菜单屏幕
    document.querySelectorAll('.menu-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // 显示Options菜单
    document.getElementById('options-menu').classList.add('active');

    updateFOVButtonText();
    
    updateSettingsUI();
    updateKeybindButtonsDisplay();
}

function pauseGame() {
    if (scene && player) {
        document.getElementById('pause-menu').style.display = 'flex';

        updateSettingsUI();
    }
}

function hidePauseMenu() {
    document.getElementById('pause-menu').style.display = 'none';
}

function showMainMenu() {
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('pause-menu').style.display = 'none';
    
    // 隐藏所有菜单屏幕
    document.querySelectorAll('.menu-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // 隐藏所有子菜单
    document.getElementById('fov-submenu').style.display = 'none';
    document.getElementById('sound-submenu').style.display = 'none';
    document.getElementById('video-submenu').style.display = 'none';
    document.getElementById('controls-submenu').style.display = 'none';

    document.querySelectorAll('.minecraft-dialog').forEach(dialog => {
        dialog.style.display = 'none';
    });

    document.getElementById('menu-container').style.display = 'flex';
    document.getElementById('main-menu').classList.add('active');

    if (scene) {
        saveGameState();

        scene = null;
        camera = null;
        renderer = null;
        controls = null;
        player = null;
        voxelWorld = null;
        inventory = null;
        highlightBox = null;
        highlightBoxEdges = null;
        currentWorldName = null;
        if (window.autosaveInterval) {
            clearInterval(window.autosaveInterval);
            window.autosaveInterval = null;
        }
    }
}

function showWorldSelection() {
    // 隐藏所有菜单屏幕
    document.querySelectorAll('.menu-screen').forEach(screen => {
        screen.classList.remove('active');
    });

    document.getElementById('world-selection').classList.add('active');

    const worldsList = document.getElementById('worlds-list');
    worldsList.innerHTML = '';

    const worlds = JSON.parse(localStorage.getItem('minecraft_worlds') || '{}');

    for (const [worldName, worldData] of Object.entries(worlds)) {
        const worldItem = document.createElement('div');
        worldItem.className = 'world-item';
        
        const worldContent = document.createElement('div');
        worldContent.className = 'world-content';
        
        const worldIcon = document.createElement('div');
        worldIcon.className = 'world-icon';
        
        const iconImg = document.createElement('img');
        if (worldData.settings && worldData.settings.isSuperflat) {
            iconImg.src = '../images/dirt.png';
        } else if (worldData.settings && worldData.settings.isCreative) {
            iconImg.src = '../images/grass_top.png';
        } else {
            iconImg.src = '../images/grass_side.png';
        }
        worldIcon.appendChild(iconImg);
        worldContent.appendChild(worldIcon);
        
        const worldDetails = document.createElement('div');
        worldDetails.className = 'world-details';
        
        const worldNameElem = document.createElement('div');
        worldNameElem.className = 'world-name';
        worldNameElem.textContent = worldName;
        worldDetails.appendChild(worldNameElem);
        
        const worldInfo = document.createElement('div');
        worldInfo.className = 'world-info';
        worldInfo.textContent = `Seed: ${worldData.seed}`;
        worldDetails.appendChild(worldInfo);
        
        if (worldData.settings) {
            const gameMode = document.createElement('div');
            gameMode.className = 'world-biome';
            gameMode.textContent = worldData.settings.isCreative ? 'Creative Mode' : 'Survival Mode';
            
            if (worldData.settings.isSuperflat) {
                gameMode.textContent += ', Superflat';
            }
            
            worldDetails.appendChild(gameMode);
        }
        
        if (worldData.lastSaved) {
            const lastPlayed = document.createElement('div');
            lastPlayed.className = 'world-last-played';
            
            const lastPlayedDate = new Date(worldData.lastSaved);
            const formattedDate = lastPlayedDate.toLocaleDateString() + ' ' + 
                                  lastPlayedDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            lastPlayed.textContent = `Last played: ${formattedDate}`;
            worldDetails.appendChild(lastPlayed);
        }
        
        worldContent.appendChild(worldDetails);
        worldItem.appendChild(worldContent);
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'world-button-container';
        
        const playBtn = document.createElement('button');
        playBtn.className = 'play-btn';
        playBtn.textContent = 'Play';
        buttonContainer.appendChild(playBtn);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Delete';
        buttonContainer.appendChild(deleteBtn);
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-btn';
        editBtn.textContent = 'Edit';
        buttonContainer.appendChild(editBtn);
        
        worldItem.appendChild(buttonContainer);
        worldsList.appendChild(worldItem);

        playBtn.addEventListener('click', function() {
            playClickSound();
            loadWorld(worldName);
        });

        deleteBtn.addEventListener('click', function() {
            playClickSound();
            deleteWorld(worldName);
            showWorldSelection();
        });

        editBtn.addEventListener('click', function() {
            playClickSound();
            showWorldEditDialog(worldName, worldData);
        });
    }

    if (Object.keys(worlds).length === 0) {
        const noWorlds = document.createElement('div');
        noWorlds.className = 'no-worlds';
        noWorlds.textContent = 'No worlds found. Create a new world to get started!';
        worldsList.appendChild(noWorlds);
    }

    const existingDeleteBtn = document.querySelector('.delete-all-btn');
    if (existingDeleteBtn) {
        existingDeleteBtn.remove();
    }

    const deleteAllButton = document.createElement('button');
    deleteAllButton.className = 'menu-button delete-all-btn';
    deleteAllButton.textContent = 'Delete All Worlds';
    deleteAllButton.addEventListener('click', function() {
        playClickSound();
        deleteAllWorlds();
    });

    document.querySelector('#world-selection .menu-buttons').prepend(deleteAllButton);
}

function showCreateWorldScreen() {
    // 隐藏所有菜单屏幕
    document.querySelectorAll('.menu-screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    document.getElementById('create-world-screen').classList.add('active');
    
    document.getElementById('world-name-input').value = '';
    document.getElementById('world-seed-input').value = '';
    document.getElementById('creative-toggle').checked = false;
    document.getElementById('superflat-toggle').checked = false;
    
    document.getElementById('world-name-input').focus();
}

function deleteWorld(worldName) {
    const worlds = JSON.parse(localStorage.getItem('minecraft_worlds') || '{}');

    if (worlds[worldName]) {
        if (confirm(`Are you sure you want to delete "${worldName}"? This action cannot be undone.`)) {
            delete worlds[worldName];
            localStorage.setItem('minecraft_worlds', JSON.stringify(worlds));
        }
    }
}

function deleteAllWorlds() {
    if (confirm('Are you sure you want to delete ALL worlds? This cannot be undone!')) {
        localStorage.removeItem('minecraft_worlds');
        showWorldSelection();
    }
}

function updateFps() {
    frameCount++;
    const now = performance.now();
    if (now - lastFpsUpdate > 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
        lastFpsUpdate = now;
        frameCount = 0;
    }
}

function updatePositionDisplay() {
}

function updateTargetBlockHighlight() {
    if (player.targetBlock) {
        const { x, y, z } = player.targetBlock.position;
        const isSlab = player.targetBlock.isSlab;
        
        if (isSlab) {
            highlightBox.position.set(x + 0.5, y + 0.25, z + 0.5);
            highlightBoxEdges.position.set(x + 0.5, y + 0.25, z + 0.5);
            
            highlightBox.scale.set(1, 0.5, 1);
            highlightBoxEdges.scale.set(1, 0.5, 1);
        } else {
            highlightBox.position.set(x + 0.5, y + 0.5, z + 0.5);
            highlightBoxEdges.position.set(x + 0.5, y + 0.5, z + 0.5);

            highlightBox.scale.set(1, 1, 1);
            highlightBoxEdges.scale.set(1, 1, 1);
        }

        highlightBox.visible = true;
        highlightBoxEdges.visible = true;
    } else {
        highlightBox.visible = false;
        highlightBoxEdges.visible = false;
    }
}

function animate() {
    if (!scene) return;

    const now = performance.now();
    
    const delta = clock.getDelta();

    // Update day/night cycle
    const previousDayCount = Math.floor(lastDayCheck / dayNightCycle.totalDuration);
    gameTime = updateDayNightCycle(delta, gameTime, scene, camera, directionalLight, sunTarget, ambientLight, hemisphereLight, backLight);
    const currentDayCount = Math.floor(gameTime / dayNightCycle.totalDuration);
    if (currentDayCount > previousDayCount) {
        daysPassed++;
        if (dayCounter) {
            dayCounter.textContent = `Day: ${daysPassed}`;
        }
    }
    lastDayCheck = gameTime;

    player.update(delta);

    if (particleSystem) {
        particleSystem.update(delta);
    }

    // Update crop growth
    if (voxelWorld) {
        voxelWorld.updateCrops(delta);
    }

    updateShadowPosition(camera, directionalLight, sunTarget);
    updateSunPosition(camera);
    updateStarsPosition(camera);

    updateFogForRenderDistance(scene);
    updateFog(scene, camera);

    updateFps();
    updatePositionDisplay();
    updateTargetBlockHighlight();

    const playerChunkX = Math.floor(camera.position.x / voxelWorld.chunkSize);
    const playerChunkZ = Math.floor(camera.position.z / voxelWorld.chunkSize);

    voxelWorld.updateChunks(playerChunkX, playerChunkZ);

    if (voxelWorld.rebuildQueue && voxelWorld.rebuildQueue.length > 0) {
        voxelWorld.processRebuildQueue();
    }

    if (inventory && inventory.furnaceActive) {
        inventory.updateFurnace(delta);
    }
    if (player.blockBreaker && player.blockBreaker.isBreakingBlock()) {
        const brokenBlockType = player.blockBreaker.continueBreakingBlock(
            delta, 
            player.targetBlock, 
            camera, 
            player.isCreative
        );
        
        if (brokenBlockType) {
            if (particleSystem && player.targetBlock) {
                particleSystem.createBlockParticles(
                    brokenBlockType, 
                    player.targetBlock.position
                );
            }
            
            if (!player.isCreative) {
                inventory.addItem(brokenBlockType);
                inventory.saveInventory();
            }
        }
    } else {
        document.getElementById('break-progress').style.display = 'none';
    }

    renderer.render(scene, camera);
    
    requestAnimationFrame(animate);
}

function createHighlightBox() {
    const geometry = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0x55aaff,
        opacity: 0.35,
        transparent: true,
        depthTest: true,
        depthWrite: false
    });
    highlightBox = new THREE.Mesh(geometry, material);

    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ 
        color: 0xffffff,
        linewidth: 2,
        opacity: 1.0,
        transparent: true,
        depthTest: true
    });
    highlightBoxEdges = new THREE.LineSegments(edgesGeometry, edgesMaterial);

    highlightBox.visible = false;
    highlightBoxEdges.visible = false;
    scene.add(highlightBox);
    scene.add(highlightBoxEdges);
}

function setupEventListeners() {
    document.getElementById('game-canvas').addEventListener('click', () => {
        controls.lock();
    });

    controls.addEventListener('lock', () => {
        if (document.getElementById('pause-menu').style.display === 'flex') {
            hidePauseMenu();
        }
    });

    controls.addEventListener('unlock', () => {
        if (scene && player) {
            const inventoryOpen = document.getElementById('inventory-screen').style.display === 'flex' ||
                             document.getElementById('crafting-table-screen').style.display === 'flex' ||
                             document.getElementById('furnace-screen').style.display === 'flex' ||
                             document.getElementById('chest-screen').style.display === 'flex';
                             
            if (!inventoryOpen) {
                pauseGame();
            }
        }
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const continueBtn = document.getElementById('continue-btn');
    if (continueBtn) {
        continueBtn.addEventListener('click', function() {
            hidePauseMenu();
            controls.lock();
        });
    }

    const saveQuitBtn = document.getElementById('save-quit-btn');
    if (saveQuitBtn) {
        saveQuitBtn.addEventListener('click', function() {
            saveGameState();
            hidePauseMenu();
            showMainMenu();
        });
    }

    const renderDistanceSlider = document.getElementById('render-distance-slider');
    if (renderDistanceSlider) {
        renderDistanceSlider.addEventListener('input', function() {
            const newValue = parseInt(this.value);
            gameSettings.renderDistance = newValue;
            document.getElementById('render-distance-value').textContent = newValue;

            if (voxelWorld) {
                voxelWorld.renderDistance = newValue;

                updateFogForRenderDistance(scene);
                updateFog(scene, camera);
            }
        });
    }

    const shadowToggle = document.getElementById('shadow-toggle');
    if (shadowToggle) {
        shadowToggle.addEventListener('change', function() {
            gameSettings.shadows = this.checked;
            updateShadowSettings(renderer, directionalLight);
        });
    }

    const sensitivitySlider = document.getElementById('sensitivity-slider');
    if (sensitivitySlider) {
        sensitivitySlider.addEventListener('input', function() {
            const value = parseInt(this.value);
            gameSettings.cameraSensitivity = value;
            
            document.getElementById('sensitivity-value').textContent = `${value}%`;
            
            if (controls) {
                applyCameraSensitivity(controls);
            }
        });
    }

    const sensitivityPauseSlider = document.getElementById('sensitivity-pause-slider');
    if (sensitivityPauseSlider) {
        sensitivityPauseSlider.addEventListener('input', function() {
            const value = parseInt(this.value);
            gameSettings.cameraSensitivity = value;
            
            document.getElementById('sensitivity-pause-value').textContent = `${value}%`;
            
            if (controls) {
                applyCameraSensitivity(controls);
            }
        });
    }

    const chunkUpdateSlider = document.getElementById('chunk-update-slider');
    if (chunkUpdateSlider) {
        chunkUpdateSlider.addEventListener('input', function() {
            const value = parseInt(this.value);
            gameSettings.chunkUpdateRate = value;
            
            let chunkUpdateText = 'Medium';
            switch (value) {
                case 0: chunkUpdateText = 'Low'; break;
                case 1: chunkUpdateText = 'Medium'; break;
                case 2: chunkUpdateText = 'High'; break;
            }
            
            document.getElementById('chunk-update-value').textContent = chunkUpdateText;
            updateChunkUpdateRate(voxelWorld);
        });
    }
    
    const resetSettingsBtn = document.getElementById('reset-settings-btn');
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', function() {
            if (confirm('Reset all game settings to default values?')) {
                resetSettings();
                
                if (voxelWorld) {
                    voxelWorld.renderDistance = gameSettings.renderDistance;
                }
                if (camera) {
                    updateCameraFOV(camera);
                }
                if (renderer) {
                    updateShadowSettings(renderer, directionalLight);
                }
                if (scene) {
                    updateFogForRenderDistance(scene);
                    updateFog(scene, camera);
                }
                if (voxelWorld) {
                    updateChunkUpdateRate(voxelWorld);
                }
                if (controls) {
                    applyCameraSensitivity(controls);
                }
                
                updateSettingsUI();
            }
        });
    }
    
    const resetKeybindsBtn = document.getElementById('reset-keybinds-btn');
    if (resetKeybindsBtn) {
        resetKeybindsBtn.addEventListener('click', function() {
            if (confirm('Reset all keybindings to default values?')) {
                resetKeybindings();
                
                if (player) {
                    player.keybindings = gameSettings.keybindings;
                }
                
                updateKeybindButtonsDisplay();
            }
        });
    }

    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (inventory) {
                inventory.closeChest();
            }
        }
    });

    const gameContainer = document.getElementById('game-container');
    const breakProgressBar = document.createElement('div');
    breakProgressBar.id = 'break-progress';
    breakProgressBar.className = 'break-progress';
    gameContainer.appendChild(breakProgressBar);

    setupVolumeSlider('master-volume-slider', 'master-volume-value');
    setupVolumeSlider('music-volume-slider', 'music-volume-value');
    setupVolumeSlider('sound-volume-slider', 'sound-volume-value');
    
    document.querySelectorAll('.crafting-recipe-slot').forEach(slot => {
        slot.addEventListener('click', () => {
            document.querySelectorAll('.crafting-recipe-slot').forEach(s => s.classList.remove('selected'));
            slot.classList.add('selected');
        });
    });
}

function setupVolumeSlider(sliderId, valueId) {
    const slider = document.getElementById(sliderId);
    const valueDisplay = document.getElementById(valueId);
    
    if (!slider || !valueDisplay) return;
    
    valueDisplay.textContent = slider.value + '%';
    
    slider.addEventListener('input', function() {
        valueDisplay.textContent = this.value + '%';
        
        const volumeType = sliderId.split('-')[0];
        
        if (typeof setVolume === 'function') {
            setVolume(volumeType, this.value / 100);
        }
    });
    
    slider.addEventListener('change', playClickSound);
}

function setupDayCounter() {
    // Create the day counter element if it doesn't exist
    if (!document.getElementById('day-counter')) {
        dayCounter = document.createElement('div');
        dayCounter.id = 'day-counter';
        dayCounter.className = 'day-counter';
        dayCounter.textContent = `Day: ${daysPassed}`;
        document.getElementById('game-container').appendChild(dayCounter);
    } else {
        dayCounter = document.getElementById('day-counter');
        dayCounter.textContent = `Day: ${daysPassed}`;
        dayCounter.style.display = 'block';
    }
}

function saveGameState() {
    if (!currentWorldName) return;

    try {
        const worlds = JSON.parse(localStorage.getItem('minecraft_worlds') || '{}');

        const modifiedChunks = {};
        
        if (voxelWorld) {
            for (const chunkKey of voxelWorld.dirtyChunks) {
                const chunk = voxelWorld.chunks.get(chunkKey);
                if (chunk) {
                    modifiedChunks[chunkKey] = {};
                    
                    for (const [blockKey, blockType] of chunk.blocks.entries()) {
                        modifiedChunks[chunkKey][blockKey] = blockType;
                    }
                }
            }
            
            if (worlds[currentWorldName] && worlds[currentWorldName].chunks) {
                for (const [chunkKey, chunkData] of Object.entries(worlds[currentWorldName].chunks)) {
                    if (!modifiedChunks[chunkKey]) {
                        modifiedChunks[chunkKey] = chunkData;
                    }
                }
            }
        }

        const chestData = {};
        if (voxelWorld && voxelWorld.chests) {
            for (const [chestKey, chest] of voxelWorld.chests.entries()) {
                chestData[chestKey] = chest;
            }
        }
        
        // Save crop data
        const cropData = {};
        if (voxelWorld && voxelWorld.crops) {
            for (const [cropKey, crop] of voxelWorld.crops.entries()) {
                cropData[cropKey] = crop;
            }
        }

        let superflatLayers = null;
        if (worldSettings.isSuperflat) {
            try {
                const superflatModule = require('./superflat.js');
                superflatLayers = superflatModule.getSuperflatLayers();
            } catch (e) {
                import('./superflat.js').then(module => {
                    superflatLayers = module.getSuperflatLayers();
                    finishSaving();
                    return;
                }).catch(err => {
                    console.error('Error importing superflat module:', err);
                    finishSaving();
                    return;
                });
            }
        }

        finishSaving();

        function finishSaving() {
            const worldData = {
                name: currentWorldName,
                seed: voxelWorld ? voxelWorld.worldSeed : (worlds[currentWorldName] ? worlds[currentWorldName].seed : Math.floor(Math.random() * 1000000)),
                player: player ? player.getPlayerData() : null,
                inventory: inventory ? inventory.getInventoryData() : null,
                chunks: modifiedChunks,
                chests: chestData,
                crops: cropData, 
                settings: worldSettings,
                lastSaved: new Date().toISOString(),
                gameTime: gameTime,
                days: daysPassed 
            };

            if (superflatLayers) {
                worldData.superflatLayers = superflatLayers;
            } else if (worlds[currentWorldName] && worlds[currentWorldName].superflatLayers) {
                worldData.superflatLayers = worlds[currentWorldName].superflatLayers;
            }

            worlds[currentWorldName] = worldData;
            
            saveGameSettings();

            try {
                localStorage.setItem('minecraft_worlds', JSON.stringify(worlds));
                document.getElementById('storage-error-message').style.display = 'none';
            } catch (e) {
                console.error('Error saving game:', e);
                showStorageError();
            }
            if (scene && controls && controls.isLocked) {
                showSaveIndicator();
            }
        }
    } catch (e) {
        console.error('Error building game state:', e);
        showStorageError();
    }
}

function playClickSound() {
    clickSound.cloneNode().play().catch(e => console.error("Error playing sound:", e));
}

function setupAutosaveTimer() {
    if (window.autosaveInterval) {
        clearInterval(window.autosaveInterval);
    }
    
    window.autosaveInterval = setInterval(() => {
        if (scene && player) {
            saveGameState();
        }
    }, 60000); 
}

function setupMenuEventListeners() {
    document.querySelectorAll('.menu-button').forEach(button => {
        button.addEventListener('click', function() {
            playClickSound();
        });
    });

    document.querySelectorAll('.back-btn').forEach(button => {
        button.addEventListener('click', function() {
            playClickSound();
            if (document.getElementById('world-selection').style.display === 'flex') {
                showMainMenu();
            } else if (document.getElementById('create-world-screen').style.display === 'flex') {
                showWorldSelection();
            }
        });
    });

    document.getElementById('singleplayer-btn').addEventListener('click', function() {
        playClickSound();
        showWorldSelection();
    });

    document.getElementById('information-btn').addEventListener('click', function() {
        playClickSound();
        document.getElementById('information-dialog').style.display = 'flex';
    });

    document.getElementById('options-btn').addEventListener('click', function() {
        playClickSound();
        showOptionsMenu();
    });
    
    document.getElementById('quit-game-btn').addEventListener('click', function() {
        playClickSound();
        window.location.href = 'https://websim.com';
    });

    document.getElementById('mods-btn').addEventListener('click', function() {
        playClickSound();
        mods.showModsDialog();
    });

    document.getElementById('import-mod-btn').addEventListener('click', function() {
        playClickSound();
        mods.hideModsDialog();
        mods.showModImportDialog();
    });

    document.getElementById('create-mod-btn').addEventListener('click', function() {
        playClickSound();
        mods.hideModsDialog();
        mods.showBlockCreationDialog();
    });

    document.getElementById('close-mods-dialog-btn').addEventListener('click', function() {
        playClickSound();
        mods.hideModsDialog();
    });
    
    document.getElementById('block-creation-btn').addEventListener('click', function() {
        playClickSound();
        mods.hideBlockCreationDialog();
        mods.showBlockFacesDialog();
    });
    
    document.getElementById('close-block-creation-dialog-btn').addEventListener('click', function() {
        playClickSound();
        mods.hideBlockCreationDialog();
        mods.showModsDialog();
    });
    
    document.getElementById('unique-faces-yes-btn').addEventListener('click', function() {
        playClickSound();
        mods.hideBlockFacesDialog();
        mods.showBlockTextureUploader();
    });
    
    document.getElementById('unique-faces-no-btn').addEventListener('click', function() {
        playClickSound();
        mods.hideBlockFacesDialog();
        mods.showSingleTextureUploader();
    });
    
    document.getElementById('close-block-faces-dialog-btn').addEventListener('click', function() {
        playClickSound();
        mods.hideBlockFacesDialog();
        mods.showBlockCreationDialog();
    });
    
    document.getElementById('cancel-texture-upload-btn').addEventListener('click', function() {
        playClickSound();
        mods.hideBlockTextureUploader();
        mods.showBlockFacesDialog();
    });
    
    document.getElementById('save-block-btn').addEventListener('click', function() {
        playClickSound();
        mods.saveBlockWithTextures();
    });
    
    document.getElementById('cancel-single-texture-btn').addEventListener('click', function() {
        playClickSound();
        mods.hideSingleTextureUploader();
        mods.showBlockFacesDialog();
    });
    
    document.getElementById('save-single-block-btn').addEventListener('click', function() {
        playClickSound();
        mods.saveSingleTextureBlock();
    });
    
    document.getElementById('close-import-dialog-btn').addEventListener('click', function() {
        playClickSound();
        mods.hideModImportDialog();
        mods.showModsDialog();
    });
    
    document.getElementById('save-recipe-btn').addEventListener('click', function() {
        playClickSound();
        mods.saveCustomBlockWithRecipe();
    });
    
    document.getElementById('skip-recipe-btn').addEventListener('click', function() {
        playClickSound();
        mods.skipRecipe();
    });
    
    document.getElementById('cancel-recipe-btn').addEventListener('click', function() {
        playClickSound();
        mods.hideCraftingRecipeCreator();
        if (window.tempBlockData && window.tempBlockData.type === 'multi') {
            mods.showBlockTextureUploader();
        } else {
            mods.showSingleTextureUploader();
        }
    });
    
    document.getElementById('share-selected-mods-btn').addEventListener('click', function() {
        playClickSound();
        const selectedMods = document.querySelectorAll('.mod-item-checkbox:checked');
        
        if (selectedMods.length === 0) {
            alert('Please select at least one mod to share.');
            return;
        }
        
        const selectedBlockIds = Array.from(selectedMods).map(checkbox => {
            return checkbox.closest('.mod-item').getAttribute('data-block-id');
        });
        
        mods.shareSelectedMods(selectedBlockIds);
    });

    document.getElementById('save-options-btn').addEventListener('click', function() {
        playClickSound();
        saveOptionsAndReturn();
    });

    document.getElementById('fov-settings-btn').addEventListener('click', function() {
        playClickSound();
        showSubMenu('fov-submenu');
    });

    document.getElementById('sound-settings-btn').addEventListener('click', function() {
        playClickSound();
        showSubMenu('sound-submenu');
    });

    document.getElementById('video-settings-btn').addEventListener('click', function() {
        playClickSound();
        showSubMenu('video-submenu');
    });

    document.getElementById('controls-settings-btn').addEventListener('click', function() {
        playClickSound();
        showSubMenu('controls-submenu');
    });

    document.getElementById('fov-back-btn').addEventListener('click', function() {
        playClickSound();
        hideSubMenu('fov-submenu');
        updateFOVButtonText();
    });

    document.getElementById('sound-back-btn').addEventListener('click', function() {
        playClickSound();
        hideSubMenu('sound-submenu');
    });

    document.getElementById('video-back-btn').addEventListener('click', function() {
        playClickSound();
        hideSubMenu('video-submenu');
    });

    document.getElementById('controls-back-btn').addEventListener('click', function() {
        playClickSound();
        hideSubMenu('controls-submenu');
    });

    const fovSlider = document.getElementById('fov-slider');
    if (fovSlider) {
        fovSlider.addEventListener('input', function() {
            const newValue = parseInt(this.value);
            document.getElementById('fov-value').textContent = newValue;
            gameSettings.fov = newValue;
            
            updateFOVDescription(newValue);
            
            if (camera) {
                updateCameraFOV(camera);
            }
        });
    }

    const renderDistanceMenuSlider = document.getElementById('render-distance-menu-slider');
    if (renderDistanceMenuSlider) {
        renderDistanceMenuSlider.addEventListener('input', function() {
            const newValue = parseInt(this.value);
            document.getElementById('render-distance-menu-value').textContent = newValue;
            gameSettings.renderDistance = newValue;
            
            if (voxelWorld) {
                voxelWorld.renderDistance = newValue;
            }
            
            updateFogForRenderDistance(scene);
            updateFog(scene, camera);
        });
    }

    const shadowMenuToggle = document.getElementById('shadow-menu-toggle');
    if (shadowMenuToggle) {
        shadowMenuToggle.addEventListener('change', function() {
            gameSettings.shadows = this.checked;
            updateShadowSettings(renderer, directionalLight);
        });
    }

    const fogMenuToggle = document.getElementById('fog-menu-toggle');
    if (fogMenuToggle) {
        fogMenuToggle.addEventListener('change', function() {
            gameSettings.fog = this.checked;
            toggleFog(scene);
        });
    }

    const keybindButtons = document.querySelectorAll('.keybind-button');
    keybindButtons.forEach(button => {
        button.addEventListener('click', function() {
            playClickSound();
            startKeybindChange(this.getAttribute('data-action'), this);
        });
    });

    document.getElementById('cancel-keybind-btn').addEventListener('click', function() {
        playClickSound();
        hideKeybindOverlay();
    });

    const sensitivitySlider = document.getElementById('sensitivity-slider');
    if (sensitivitySlider) {
        sensitivitySlider.addEventListener('input', function() {
            const value = parseInt(this.value);
            gameSettings.cameraSensitivity = value;
            
            document.getElementById('sensitivity-value').textContent = `${value}%`;
            
            if (controls) {
                applyCameraSensitivity(controls);
            }
        });
    }

    const sensitivityPauseSlider = document.getElementById('sensitivity-pause-slider');
    if (sensitivityPauseSlider) {
        sensitivityPauseSlider.addEventListener('input', function() {
            const value = parseInt(this.value);
            gameSettings.cameraSensitivity = value;
            
            document.getElementById('sensitivity-pause-value').textContent = `${value}%`;
            
            if (controls) {
                applyCameraSensitivity(controls);
            }
        });
    }

    const chunkUpdateSlider = document.getElementById('chunk-update-slider');
    if (chunkUpdateSlider) {
        chunkUpdateSlider.addEventListener('input', function() {
            const value = parseInt(this.value);
            gameSettings.chunkUpdateRate = value;
            
            let chunkUpdateText = 'Medium';
            switch (value) {
                case 0: chunkUpdateText = 'Low'; break;
                case 1: chunkUpdateText = 'Medium'; break;
                case 2: chunkUpdateText = 'High'; break;
            }
            
            document.getElementById('chunk-update-value').textContent = chunkUpdateText;
            updateChunkUpdateRate(voxelWorld);
        });
    }
    
    const resetSettingsBtn = document.getElementById('reset-settings-btn');
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', function() {
            playClickSound();
            if (confirm('Reset all game settings to default values?')) {
                resetSettings();
                
                if (voxelWorld) {
                    voxelWorld.renderDistance = gameSettings.renderDistance;
                }
                if (camera) {
                    updateCameraFOV(camera);
                }
                if (renderer) {
                    updateShadowSettings(renderer, directionalLight);
                }
                if (scene) {
                    updateFogForRenderDistance(scene);
                    updateFog(scene, camera);
                }
                if (voxelWorld) {
                    updateChunkUpdateRate(voxelWorld);
                }
                if (controls) {
                    applyCameraSensitivity(controls);
                }
                
                updateSettingsUI();
            }
        });
    }
    
    const resetKeybindsBtn = document.getElementById('reset-keybinds-btn');
    if (resetKeybindsBtn) {
        resetKeybindsBtn.addEventListener('click', function() {
            playClickSound();
            if (confirm('Reset all keybindings to default values?')) {
                resetKeybindings();
                
                if (player) {
                    player.keybindings = gameSettings.keybindings;
                }
                
                updateKeybindButtonsDisplay();
            }
        });
    }

    document.querySelectorAll('input[type="range"]').forEach(slider => {
        slider.addEventListener('change', playClickSound);
    });

    document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', playClickSound);
    });

    document.getElementById('create-world-btn').addEventListener('click', function() {
        playClickSound();
        showCreateWorldScreen();
    });
    
    document.getElementById('create-new-world-btn').addEventListener('click', function() {
        playClickSound();
        const worldName = document.getElementById('world-name-input').value.trim() || "My World";
        createAndStartWorld(worldName);
    });
    
    document.getElementById('world-name-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            playClickSound();
            const worldName = document.getElementById('world-name-input').value.trim() || "My World";
            createAndStartWorld(worldName);
        }
    });
    
    document.getElementById('superflat-advanced-btn').addEventListener('click', function() {
        playClickSound();
        showSuperflatAdvancedSettings();
    });
    
    document.getElementById('save-superflat-settings-btn').addEventListener('click', function() {
        playClickSound();
        saveSuperflatSettings();
    });
    
    document.getElementById('cancel-superflat-settings-btn').addEventListener('click', function() {
        playClickSound();
        hideSuperflatAdvancedSettings();
    });
    
    document.getElementById('add-layer-btn').addEventListener('click', function() {
        playClickSound();
        addSuperflatLayer();
    });
    
    document.getElementById('reset-layers-btn').addEventListener('click', function() {
        playClickSound();
        resetSuperflatLayers();
    });
    document.getElementById('update-log-btn').addEventListener('click', function() {
        playClickSound();
        document.getElementById('update-log-dialog').style.display = 'flex';
    });

    document.getElementById('close-update-log-dialog-btn').addEventListener('click', function() {
        playClickSound();
        document.getElementById('update-log-dialog').style.display = 'none';
    });
}

function showSubMenu(menuId) {
    document.getElementById('options-menu').style.display = 'none';
    document.getElementById(menuId).style.display = 'flex';
}

function hideSubMenu(menuId) {
    document.getElementById(menuId).style.display = 'none';
    document.getElementById('options-menu').style.display = 'flex';
}

function startKeybindChange(action, buttonElement) {
    const overlay = document.getElementById('keybind-overlay');
    const actionSpan = document.getElementById('keybind-action');
    
    actionSpan.textContent = action;
    overlay.style.display = 'flex';
    
    overlay.dataset.action = action;
    overlay.dataset.button = buttonElement.getAttribute('data-action');
    
    document.addEventListener('keydown', handleKeybindKeyPress);
}

function handleKeybindKeyPress(event) {
    event.preventDefault();
    
    const overlay = document.getElementById('keybind-overlay');
    const action = overlay.dataset.action;
    const buttonData = overlay.dataset.button;
    
    if (!action || !buttonData) {
        hideKeybindOverlay();
        return;
    }
    
    const keyCode = event.code;
    
    gameSettings.keybindings[buttonData] = keyCode;
    
    const button = document.querySelector(`.keybind-button[data-action="${buttonData}"]`);
    if (button) {
        button.textContent = getKeyDisplayName(keyCode);
    }
    
    document.removeEventListener('keydown', handleKeybindKeyPress);
    hideKeybindOverlay();
    
    saveGameSettings();
    
    if (player) {
        player.keybindings = gameSettings.keybindings;
    }
}

function hideKeybindOverlay() {
    const overlay = document.getElementById('keybind-overlay');
    overlay.style.display = 'none';
    overlay.dataset.action = '';
    overlay.dataset.button = '';
    
    document.removeEventListener('keydown', handleKeybindKeyPress);
}

function updateFOVButtonText() {
    const fovButton = document.getElementById('fov-settings-btn');
    if (fovButton) {
        const fovValue = gameSettings.fov;
        let fovText = 'Normal';
        
        if (fovValue < 50) fovText = 'Narrow';
        else if (fovValue < 60) fovText = 'Slightly Narrow';
        else if (fovValue < 70) fovText = 'Normal';
        else if (fovValue < 80) fovText = 'Slightly Wide';
        else if (fovValue < 90) fovText = 'Wide';
        else fovText = 'Quake Pro';
        
        fovButton.textContent = `FOV: ${fovText}`;
    }
}

function updateFOVDescription(fovValue) {
    let fovText = 'Normal';
    
    if (fovValue < 50) fovText = 'Narrow';
    else if (fovValue < 60) fovText = 'Slightly Narrow';
    else if (fovValue < 70) fovText = 'Normal';
    else if (fovValue < 80) fovText = 'Slightly Wide';
    else if (fovValue < 90) fovText = 'Wide';
    else fovText = 'Quake Pro';
    
    const fovStatus = document.querySelector('.fov-status');
    if (fovStatus) {
        fovStatus.textContent = fovText;
    }
}

function saveOptionsAndReturn() {
    saveGameSettings();
    document.getElementById('options-menu').style.display = 'none';
    document.getElementById('main-menu').style.display = 'flex';
}

async function showWorldEditDialog(worldName, worldData) {
    let editDialog = document.getElementById('world-edit-dialog');
    
    if (!editDialog) {
        editDialog = document.createElement('div');
        editDialog.id = 'world-edit-dialog';
        editDialog.className = 'minecraft-dialog';
        
        const dialogContent = document.createElement('div');
        dialogContent.className = 'minecraft-dialog-content';
        
        const title = document.createElement('h2');
        title.textContent = 'Edit World';
        dialogContent.appendChild(title);
        
        const form = document.createElement('div');
        form.className = 'world-creation-form';
        
        const nameGroup = document.createElement('div');
        nameGroup.className = 'form-group';
        
        const nameLabel = document.createElement('label');
        nameLabel.setAttribute('for', 'edit-world-name');
        nameLabel.textContent = 'World Name:';
        nameGroup.appendChild(nameLabel);
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'edit-world-name';
        nameInput.placeholder = 'Enter world name';
        nameGroup.appendChild(nameInput);
        
        form.appendChild(nameGroup);
        
        const gameModeGroup = document.createElement('div');
        gameModeGroup.className = 'form-group';
        
        const gameModeOptions = document.createElement('div');
        gameModeOptions.className = 'game-mode-options';
        
        const creativeLabel = document.createElement('label');
        creativeLabel.className = 'toggle-label';
        creativeLabel.textContent = 'Creative Mode';
        
        const creativeToggle = document.createElement('input');
        creativeToggle.type = 'checkbox';
        creativeToggle.id = 'edit-creative-toggle';
        creativeLabel.appendChild(creativeToggle);
        
        gameModeOptions.appendChild(creativeLabel);
        
        const gameModeHint = document.createElement('div');
        gameModeHint.className = 'settings-hint';
        gameModeHint.textContent = 'Fly, access all blocks, no damage';
        gameModeOptions.appendChild(gameModeHint);
        
        gameModeGroup.appendChild(gameModeOptions);
        form.appendChild(gameModeGroup);
        
        const daysGroup = document.createElement('div');
        daysGroup.className = 'form-group';
        
        const daysOptions = document.createElement('div');
        daysOptions.className = 'game-options';
        
        const daysLabel = document.createElement('label');
        daysLabel.className = 'toggle-label';
        daysLabel.textContent = 'Show Days Counter';
        
        const daysToggle = document.createElement('input');
        daysToggle.type = 'checkbox';
        daysToggle.id = 'edit-days-toggle';
        daysLabel.appendChild(daysToggle);
        
        daysOptions.appendChild(daysLabel);
        
        const daysHint = document.createElement('div');
        daysHint.className = 'settings-hint';
        daysHint.textContent = 'Display a counter showing how many days you\'ve survived';
        daysOptions.appendChild(daysHint);
        
        daysGroup.appendChild(daysOptions);
        form.appendChild(daysGroup);
        
        dialogContent.appendChild(form);
        
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'dialog-buttons';
        
        const saveButton = document.createElement('button');
        saveButton.id = 'save-world-edit-btn';
        saveButton.className = 'menu-button button-java-old';
        saveButton.textContent = 'Save Changes';
        buttonsDiv.appendChild(saveButton);
        
        const cancelButton = document.createElement('button');
        cancelButton.id = 'cancel-world-edit-btn';
        cancelButton.className = 'menu-button button-java-old';
        cancelButton.textContent = 'Cancel';
        buttonsDiv.appendChild(cancelButton);
        
        dialogContent.appendChild(buttonsDiv);
        editDialog.appendChild(dialogContent);
        document.getElementById('menu-container').appendChild(editDialog);
        
        saveButton.addEventListener('click', function() {
            playClickSound();
            saveWorldEdits();
        });
        
        cancelButton.addEventListener('click', function() {
            playClickSound();
            hideWorldEditDialog();
        });
    }
    
    editDialog.dataset.originalName = worldName;
    
    document.getElementById('edit-world-name').value = worldName;
    
    const isCreative = worldData.settings && worldData.settings.isCreative;
    document.getElementById('edit-creative-toggle').checked = isCreative;
    
    const showDays = worldData.settings && worldData.settings.showDays;
    document.getElementById('edit-days-toggle').checked = showDays;
    
    editDialog.style.display = 'flex';
}

function hideWorldEditDialog() {
    const editDialog = document.getElementById('world-edit-dialog');
    if (editDialog) {
        editDialog.style.display = 'none';
    }
}

function saveWorldEdits() {
    const editDialog = document.getElementById('world-edit-dialog');
    if (!editDialog) return;
    
    const originalName = editDialog.dataset.originalName;
    const newName = document.getElementById('edit-world-name').value.trim();
    const isCreative = document.getElementById('edit-creative-toggle').checked;
    const showDays = document.getElementById('edit-days-toggle').checked;
    
    if (!newName) {
        alert('Please enter a world name.');
        return;
    }
    
    const worlds = JSON.parse(localStorage.getItem('minecraft_worlds') || '{}');

    if (newName !== originalName && worlds[newName]) {
        alert('A world with this name already exists. Please choose another name.');
        return;
    }
    
    const worldData = worlds[originalName];
    
    if (!worldData) {
        alert('World data not found!');
        return;
    }
    
    if (!worldData.settings) {
        worldData.settings = {};
    }
    
    worldData.settings.isCreative = isCreative;
    worldData.settings.showDays = showDays;
    
    if (newName !== originalName) {
        worlds[newName] = worldData;
        worlds[newName].name = newName; 
        delete worlds[originalName];
    } else {
        worlds[originalName] = worldData;
    }
    
    localStorage.setItem('minecraft_worlds', JSON.stringify(worlds));
    
    hideWorldEditDialog();
    showWorldSelection(); 
    
    alert(`World "${newName}" has been updated.`);
}

document.getElementById('superflat-toggle').addEventListener('change', function() {
    updateSuperflatDescription();
});

function showSuperflatAdvancedSettings() {
    document.getElementById('superflat-advanced-dialog').style.display = 'flex';
    renderSuperflatLayers();
    updateSuperflatDescription();
}

function hideSuperflatAdvancedSettings() {
    document.getElementById('superflat-advanced-dialog').style.display = 'none';
}

function renderSuperflatLayers() {
    const layerList = document.getElementById('superflat-layer-list');
    layerList.innerHTML = '';
    
    import('./superflat.js').then(module => {
        const layers = module.getSuperflatLayers();
        
        layers.forEach((layer, index) => {
            const layerItem = document.createElement('div');
            layerItem.className = 'superflat-layer-item';
            
            const layerDetails = document.createElement('div');
            layerDetails.className = 'layer-details';
            
            const blockPreview = document.createElement('div');
            blockPreview.className = 'layer-block-preview';
            blockPreview.style.backgroundImage = `url('${getItemTexture(layer.blockType)}')`;
            
            const blockName = document.createElement('div');
            blockName.className = 'layer-block-name';
            blockName.textContent = getBlockDisplayName(layer.blockType);
            
            const thicknessInput = document.createElement('input');
            thicknessInput.type = 'number';
            thicknessInput.className = 'layer-thickness';
            thicknessInput.value = layer.thickness;
            thicknessInput.min = 1;
            thicknessInput.max = 32;
            thicknessInput.addEventListener('change', function() {
                const thickness = parseInt(this.value);
                if (thickness > 0 && thickness <= 32) {
                    updateSuperflatLayer(index, layer.blockType, thickness);
                }
            });
            
            layerDetails.appendChild(blockPreview);
            layerDetails.appendChild(blockName);
            layerDetails.appendChild(thicknessInput);
            
            const blockSelector = document.createElement('select');
            blockSelector.className = 'layer-block-selector';
            
            getAvailableBlockTypes().forEach(blockType => {
                const option = document.createElement('option');
                option.value = blockType;
                option.textContent = getBlockDisplayName(blockType);
                if (blockType === layer.blockType) {
                    option.selected = true;
                }
                blockSelector.appendChild(option);
            });
            
            blockSelector.addEventListener('change', function() {
                updateSuperflatLayer(index, this.value, layer.thickness);
                blockPreview.style.backgroundImage = `url('${getItemTexture(this.value)}')`;
                blockName.textContent = getBlockDisplayName(this.value);
            });
            
            layerDetails.appendChild(blockSelector);
            
            const layerActions = document.createElement('div');
            layerActions.className = 'layer-actions';
            
            if (layers.length > 1) {
                const removeBtn = document.createElement('button');
                removeBtn.textContent = 'X';
                removeBtn.className = 'remove-layer-btn';
                removeBtn.addEventListener('click', function() {
                    playClickSound();
                    removeSuperflatLayer(index);
                });
                
                layerActions.appendChild(removeBtn);
            }
            
            layerItem.appendChild(layerDetails);
            layerItem.appendChild(layerActions);
            
            layerList.appendChild(layerItem);
        });
    });
}

function updateSuperflatDescription() {
    import('./superflat.js').then(module => {
        const layers = module.getSuperflatLayers();
        let description = 'Default superflat world';
        if (layers && Array.isArray(layers) && layers.length > 0) {
            const layerDescriptions = layers.map(layer => {
                const blockName = getBlockDisplayName(layer.blockType);
                return `${layer.thickness} ${blockName}`;
            });
            description = layerDescriptions.join(', ');
        }
        const superflatHint = document.querySelector('.world-type-options .settings-hint');
        if (superflatHint) {
            superflatHint.textContent = description;
        }
    }).catch(error => {
        console.error('Error updating superflat description:', error);
    });
}

function saveSuperflatSettings() {
    import('./superflat.js').then(module => {
        const layers = module.getSuperflatLayers();
        console.log('Superflat layers saved:', layers);
        
        updateSuperflatDescription();
    }).catch(error => {
        console.error('Error saving superflat settings:', error);
    });
    
    hideSuperflatAdvancedSettings();
}

function addSuperflatLayer() {
    import('./superflat.js').then(module => {
        module.addLayer('stone', 1);
        setTimeout(() => {
            renderSuperflatLayers();
        }, 10);
    });
}

function removeSuperflatLayer(index) {
    import('./superflat.js').then(module => {
        module.removeLayer(index);
        setTimeout(() => {
            renderSuperflatLayers();
        }, 10);
    });
}

function updateSuperflatLayer(index, blockType, thickness) {
    import('./superflat.js').then(module => {
        module.updateLayer(index, blockType, thickness);
        setTimeout(() => {
            renderSuperflatLayers();
        }, 10);
    });
}

function resetSuperflatLayers() {
    import('./superflat.js').then(module => {
        module.resetSuperflatLayers();
        setTimeout(() => {
            renderSuperflatLayers();
        }, 10);
    });
}

function getSuperflatLayers() {
    try {
        return require('./superflat.js').getSuperflatLayers();
    } catch (e) {
        return [
            { blockType: 'bedrock', thickness: 1 },
            { blockType: 'dirt', thickness: 2 },
            { blockType: 'grass', thickness: 1 }
        ];
    }
}

function getBlockDisplayName(blockType) {
    switch(blockType) {
        case 'bedrock': return 'Bedrock';
        case 'dirt': return 'Dirt';
        case 'grass': return 'Grass';
        case 'stone': return 'Stone';
        case 'cobble': return 'Cobblestone';
        case 'sand': return 'Sand';
        case 'sandstone': return 'Sandstone';
        case 'wood': return 'Oak Log';
        case 'birchwood': return 'Birch Log';
        case 'plank': return 'Oak Planks';
        case 'birchplank': return 'Birch Planks';
        case 'glass': return 'Glass';
        case 'snow': return 'Snow';
        default: return blockType.charAt(0).toUpperCase() + blockType.slice(1);
    }
}

function getItemTexture(blockType) {
    switch(blockType) {
        case 'dirt': return '../images/dirt.png';
        case 'stone': return '../images/stone.png';
        case 'cobble': return '../images/cobbles.png';
        case 'bedrock': return '../images/bedrock.png';
        case 'grass': return '../images/grass_top.png';
        case 'sand': return '../images/sand.png';
        case 'sandstone': return '../images/sandstone.png';
        case 'wood': return '../images/logtopbottom.png';
        case 'birchwood': return '../images/birchlogtopbottom.png';
        case 'plank': return '../images/plank.png';
        case 'birchplank': return '../images/birchplank.png';
        case 'glass': return '../images/glass.png';
        case 'snow': return '../images/snow.png';
        case 'wheat': return '../images/wheatfinished.png';
        default: return '../images/dirt.png';
    }
}

function getAvailableBlockTypes() {
    return [
        'bedrock', 'dirt', 'grass', 'stone', 'cobble', 
        'sand', 'sandstone', 'wood', 'birchwood', 'plank', 
        'birchplank', 'glass', 'snow'
    ];
}

document.addEventListener('DOMContentLoaded', function() {
    clickSound.load();
    
    setupMenuEventListeners();
    showMainMenu();
    
    document.querySelectorAll('.upload-texture-btn').forEach(button => {
        button.addEventListener('click', function() {
            playClickSound();
        });
    });
    
    document.querySelectorAll('.crafting-recipe-slot').forEach(slot => {
        slot.addEventListener('click', function() {
            document.querySelectorAll('.crafting-recipe-slot').forEach(s => {
                s.classList.remove('selected');
            });
            this.classList.add('selected');
        });
    });
});
