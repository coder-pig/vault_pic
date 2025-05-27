import * as THREE from 'three';
import { SimplexNoise } from './utils.js';
import { generateSuperflat, getSuperflatHeight } from './superflat.js';
import { Door } from './door.js';

export class VoxelWorld {
    constructor(scene, worldData = null) {
        this.scene = scene;
        this.chunkSize = 16;
        this.blockSize = 1;
        this.chunks = new Map();
        this.textureLoader = new THREE.TextureLoader();
        this.materials = this.createMaterials();
        this.raycaster = new THREE.Raycaster();
        this.worldData = worldData;
        this.renderDistance = 6;
        this.visibleChunks = new Set();
        this.chunkUpdateNeeded = true;
        this.isSuperflat = false;
        this.dirtyChunks = new Set();
        this.rebuildQueue = [];
        this.maxRebuildsPerFrame = 2;
        this.isProcessingRebuilds = false;
        this.door = new Door();
        this.slabTypes = ['oakslab', 'birchslab'];
        this.hutLocations = new Set();
        this.chests = new Map();
        this.crops = new Map();

        if (worldData && worldData.chunks) {
            for (const chunkKey in worldData.chunks) {
                this.dirtyChunks.add(chunkKey);
            }
        }
        
        if (worldData && worldData.chests) {
            for (const [chestKey, chestData] of Object.entries(worldData.chests)) {
                this.chests.set(chestKey, chestData);
            }
        }
        
        if (worldData && worldData.crops) {
            for (const [cropKey, cropData] of Object.entries(worldData.crops)) {
                this.crops.set(cropKey, cropData);
            }
        }
        
        const worldSeed = worldData?.seed || Math.floor(Math.random() * 1000000);
        this.worldSeed = worldSeed;
        this.noise = new SimplexNoise(this.worldSeed);
        this.biomeNoise = new SimplexNoise(this.worldSeed + 10000);
        this.treeNoise = new SimplexNoise(this.worldSeed + 20000);
        this.cactusNoise = new SimplexNoise(this.worldSeed + 25000);
        this.treeTypeNoise = new SimplexNoise(this.worldSeed + 27000);
        this.structureNoise = new SimplexNoise(this.worldSeed + 90000); 
        this.caveNoise = new SimplexNoise(this.worldSeed + 30000);
        this.caveNoise2 = new SimplexNoise(this.worldSeed + 40000);
        this.grassNoise = new SimplexNoise(this.worldSeed + 50000);
        this.blendNoise = new SimplexNoise(this.worldSeed + 60000);
        this.snowNoise = new SimplexNoise(this.worldSeed + 70000);
        this.snowBlockNoise = new SimplexNoise(this.worldSeed + 80000);
        
        if (worldData && worldData.superflatLayers) {
            import('./superflat.js').then(module => {
                module.setSuperflatLayers(worldData.superflatLayers);
            });
        }

        this.biomes = {
            flatlands: {
                name: "Flatlands", baseHeight: 10, heightVariation: 1.5, hilliness: 0.5,
                detailScale: 0.3, treeDensity: 0.15, grassDensity: 0.1, topBlock: 'grass',
                underBlock: 'dirt', deepBlock: 'stone', colorIntensity: 1.3, hutChance: 0.000325
            },
            hills: {
                name: "Hills", baseHeight: 18, heightVariation: 18, hilliness: 7,
                detailScale: 0.7, treeDensity: 0.08, plateauThreshold: 0.82, grassDensity: 0.05,
                topBlock: 'grass', underBlock: 'dirt', deepBlock: 'stone', colorIntensity: 1.25
            },
            desert: {
                name: "Desert", baseHeight: 9, heightVariation: 2, hilliness: 0.4,
                detailScale: 0.2, cactusDensity: 0.05, topBlock: 'sand',
                underBlock: 'sand', deepBlock: 'sandstone', colorIntensity: 1.4
            },
            multiforest: {
                name: "Multi-forest", baseHeight: 12, heightVariation: 2, hilliness: 0.7,
                detailScale: 0.4, treeDensity: 0.49, birchTreeRatio: 0.5, grassDensity: 0.2,
                topBlock: 'grass', underBlock: 'dirt', deepBlock: 'stone', colorIntensity: 1.35
            },
            mountains: {
                name: "Mountains", baseHeight: 28, heightVariation: 40, hilliness: 12,
                detailScale: 0.9, treeDensity: 0.1, grassDensity: 0.05, snowHeight: 35,
                snowVariation: 5, snowBlockThreshold: 40, snowBlockVariation: 8,
                topBlock: 'grass', underBlock: 'dirt', deepBlock: 'stone', colorIntensity: 1.2
            }
        };
    }

    createMaterials() {
        const textures = {};
        const textureNames = [
            'dirt', 'grassTop', 'grassSide', 'stone', 'smoothstone', 'logSide', 'logTopBottom',
            'leaves', 'plank', 'craftingTableSide', 'craftingTableTop', 'oakdoor', 'oakdoorSide',
            'birchdoor', 'birchdoorSide', 'grass_plant', 'bedrock', 'sand', 'sandstone', 'cacti',
            'cobble', 'birchLogSide', 'birchLogTopBottom', 'birchLeaves', 'birchplank', 'snowGrassTop',
            'snowGrassSide', 'snow', 'furnaceFront', 'furnaceSide', 'furnaceTopBottom', 'glass', 'newglass',
            'oakSlab', 'birchSlab', 'chestFront', 'chestSide', 'chestTopBottom', 'farmland',
            'seeds', 'wheatstage1', 'wheatstage2', 'wheatstage3', 'wheatfinished', 'haybaleSide', 'haybaleTopBottom'
        ];
        
        const fileMap = {
                    'grassTop': '../images/grass_top.png', 'grassSide': '../images/grass_side.png', 'logSide': '../images/logside.png',
        'logTopBottom': '../images/logtopbottom.png', 'craftingTableSide': '../images/CFSIDE.png',
        'craftingTableTop': '../images/cftopbottom.png', 'oakdoorSide': '../images/oakdoorside.png',
        'birchdoorSide': '../images/birchdoorside.png', 'grass_plant': '../images/grass.png',
        'birchLogSide': '../images/birchlogside.png', 'birchLogTopBottom': '../images/birchlogtopbottom.png',
        'birchLeaves': '../images/birchleaves.png', 'birchPlank': '../images/birchplank.png',
        'snowGrassTop': '../images/grasssnowtop.png', 'snowGrassSide': '../images/snowgrassside.png',
        'furnaceFront': '../images/furnaceunlit.png', 'furnaceSide': '../images/furnaceside.png',
        'furnaceTopBottom': '../images/furnacetopbottom.png', 'oakSlab': '../images/plank.png',
        'birchSlab': '../images/birchplank.png', 'chestFront': '../images/chestfront.png',
        'chestSide': '../images/chestside.png', 'chestTopBottom': '../images/chesttopbottom.png',
        'cobble': '../images/cobbles.png',
        'oakdoor': '../images/door.png',
        'birchdoor': '../images/birchdoor.png',
        'wheatstage1': '../images/wheatstage1.png',
        'wheatstage2': '../images/wheatstage2.png',
        'wheatstage3': '../images/wheatstage3.png',
        'wheatfinished': '../images/wheatfinished.png',
        'haybaleSide': '../images/haybaleside.png',
        'haybaleTopBottom': '../images/haybaletopbottom.png'
        };

        textureNames.forEach(name => {
            const file = fileMap[name] || `../images/${name.toLowerCase()}.png`;
            textures[name] = this.textureLoader.load(file);
            textures[name].magFilter = THREE.NearestFilter;
            textures[name].minFilter = THREE.NearestFilter;
            textures[name].wrapS = textures[name].wrapT = THREE.RepeatWrapping;
        });

        const materials = {};
        const setupMaterial = (name, textureName, props = {}) => {
            materials[name] = new THREE.MeshLambertMaterial({ 
                map: textures[textureName], 
                ...props
            });
            materials[name].shadowSide = THREE.FrontSide;
        };

        setupMaterial('dirt', 'dirt', { color: 0xc69d71, reflectivity: 0.08, aoMapIntensity: 0.4 });
        setupMaterial('stone', 'stone', { color: 0x9a9a9a, reflectivity: 0.12, aoMapIntensity: 0.5 });
        setupMaterial('smoothstone', 'smoothstone', { color: 0x929292, reflectivity: 0.15, aoMapIntensity: 0.4 });
        setupMaterial('leaves', 'leaves', { transparent: true, alphaTest: 0.5, color: 0x47c52a, emissive: 0x183a0e, emissiveIntensity: 0.07, aoMapIntensity: 0.15 });
        setupMaterial('logSide', 'logSide', { color: 0xc68242, emissive: 0x3a2815, emissiveIntensity: 0.035, aoMapIntensity: 0.3 });
        setupMaterial('logTopBottom', 'logTopBottom', { color: 0xd99a56, emissive: 0x3a2815, emissiveIntensity: 0.035, aoMapIntensity: 0.3 });
        setupMaterial('grassTop', 'grassTop', { color: 0x5ac546, emissive: 0x0a3a05, emissiveIntensity: 0.035, aoMapIntensity: 0.25 });
        setupMaterial('grassSide', 'grassSide', { color: 0x7cc054, aoMapIntensity: 0.3 });
        setupMaterial('grassBottom', 'dirt', { color: 0xd6a877, aoMapIntensity: 0.5 });
        setupMaterial('plank', 'plank', { color: 0xc99e55, aoMapIntensity: 0.4 });
        setupMaterial('craftingTableSide', 'craftingTableSide', { color: 0xd6a65a, aoMapIntensity: 0.4 });
        setupMaterial('craftingTableTop', 'craftingTableTop', { color: 0xdaae65, aoMapIntensity: 0.3 });
        setupMaterial('oakdoor', 'oakdoor', { 
            color: 0xaf804c, 
            aoMapIntensity: 0.5, 
            transparent: true, 
            alphaTest: 0.1, 
            side: THREE.DoubleSide 
        });
        setupMaterial('oakdoorSide', 'oakdoorSide', { color: 0xaf804c, aoMapIntensity: 0.5, side: THREE.DoubleSide });
        setupMaterial('birchdoor', 'birchdoor', { 
            color: 0xe3d7b4, 
            aoMapIntensity: 0.5, 
            transparent: true, 
            alphaTest: 0.1, 
            side: THREE.DoubleSide 
        });
        setupMaterial('birchdoorSide', 'birchdoorSide', { color: 0xe3d7b4, aoMapIntensity: 0.5, side: THREE.DoubleSide });
        setupMaterial('grass_plant', 'grass_plant', { transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, color: 0x6fb542, emissive: 0x183a0e, emissiveIntensity: 0.025 });
        setupMaterial('bedrock', 'bedrock', { color: 0x606060, reflectivity: 0.05, aoMapIntensity: 0.6 });
        setupMaterial('sand', 'sand', { color: 0xffeeb0, reflectivity: 0.12, aoMapIntensity: 0.25 });
        setupMaterial('sandstone', 'sandstone', { color: 0xead9a3, reflectivity: 0.15, aoMapIntensity: 0.4 });
        setupMaterial('cacti', 'cacti', { color: 0x66bb44, emissive: 0x0a3a05, emissiveIntensity: 0.035, aoMapIntensity: 0.3 });
        setupMaterial('cobble', 'cobble', { color: 0x8a8a8a, reflectivity: 0.15, aoMapIntensity: 0.5 });
        setupMaterial('birchLogSide', 'birchLogSide', { color: 0xf5f5e8, emissive: 0x333322, emissiveIntensity: 0.035, aoMapIntensity: 0.2 });
        setupMaterial('birchLogTopBottom', 'birchLogTopBottom', { color: 0xededd0, emissive: 0x333322, emissiveIntensity: 0.035, aoMapIntensity: 0.2 });
        setupMaterial('birchLeaves', 'birchLeaves', { transparent: true, alphaTest: 0.5, color: 0xd1e367, emissive: 0x293a0a, emissiveIntensity: 0.07, aoMapIntensity: 0.2 });
        setupMaterial('birchplank', 'birchplank', { color: 0xeae4c0, aoMapIntensity: 0.3 });
        setupMaterial('snowGrassTop', 'snowGrassTop', { color: 0xffffff, reflectivity: 0.35, aoMapIntensity: 0.15 });
        setupMaterial('snowGrassSide', 'snowGrassSide', { color: 0xf8f8ff, reflectivity: 0.25, aoMapIntensity: 0.25 });
        setupMaterial('snow', 'snow', { color: 0xffffff, reflectivity: 0.4, emissive: 0x334455, emissiveIntensity: 0.045, aoMapIntensity: 0.15 });
        setupMaterial('furnaceFront', 'furnaceFront', { color: 0x8a8a8a, reflectivity: 0.1, aoMapIntensity: 0.5 });
        setupMaterial('furnaceSide', 'furnaceSide', { color: 0x8a8a8a, reflectivity: 0.1, aoMapIntensity: 0.5 });
        setupMaterial('furnaceTopBottom', 'furnaceTopBottom', { color: 0x8a8a8a, reflectivity: 0.1, aoMapIntensity: 0.5 });
        setupMaterial('glass', 'glass', { transparent: true, alphaTest: 0.5, color: 0xeeffff, reflectivity: 0.4, emissive: 0x112233, emissiveIntensity: 0.07, aoMapIntensity: 0.2 });
        setupMaterial('newglass', 'newglass', { transparent: true, alphaTest: 0.5, color: 0xeeffff, reflectivity: 0.4, emissive: 0x112233, emissiveIntensity: 0.07, aoMapIntensity: 0.2 });
        setupMaterial('oakSlab', 'oakSlab', { color: 0xc99e55, aoMapIntensity: 0.4 });
        setupMaterial('birchSlab', 'birchSlab', { color: 0xeae4c0, aoMapIntensity: 0.3 });
        setupMaterial('chestFront', 'chestFront', { color: 0xb7834c, aoMapIntensity: 0.4 });
        setupMaterial('chestSide', 'chestSide', { color: 0xb7834c, aoMapIntensity: 0.4 });
        setupMaterial('chestTopBottom', 'chestTopBottom', { color: 0xb7834c, aoMapIntensity: 0.4 });
        setupMaterial('farmland', 'farmland', { color: 0xa86f32, reflectivity: 0.08, aoMapIntensity: 0.4 });
        setupMaterial('snowyDirt', 'dirt', { color: 0xd5c0a8, reflectivity: 0.15, aoMapIntensity: 0.35 });
        setupMaterial('seeds', 'seeds', { 
            transparent: true, 
            alphaTest: 0.5, 
            side: THREE.DoubleSide, 
            color: 0x95c447, 
            emissive: 0x183a0e, 
            emissiveIntensity: 0.025 
        });
        
        setupMaterial('wheatstage1', 'wheatstage1', { 
            transparent: true, 
            alphaTest: 0.5, 
            side: THREE.DoubleSide, 
            color: 0xFFFFFF, 
            emissive: 0x183a0e, 
            emissiveIntensity: 0.025 
        });
        
        setupMaterial('wheatstage2', 'wheatstage2', { 
            transparent: true, 
            alphaTest: 0.5, 
            side: THREE.DoubleSide, 
            color: 0xFFFFFF, 
            emissive: 0x183a0e, 
            emissiveIntensity: 0.025 
        });
        
        setupMaterial('wheatstage3', 'wheatstage3', { 
            transparent: true, 
            alphaTest: 0.5, 
            side: THREE.DoubleSide, 
            color: 0xFFFFFF, 
            emissive: 0x183a0e, 
            emissiveIntensity: 0.025 
        });
        
        setupMaterial('wheatfinished', 'wheatfinished', { 
            transparent: true, 
            alphaTest: 0.5, 
            side: THREE.DoubleSide, 
            color: 0xFFFFFF, 
            emissive: 0x183a0e, 
            emissiveIntensity: 0.025 
        });
        
        setupMaterial('haybaleSide', 'haybaleSide', { color: 0xeedd55, aoMapIntensity: 0.4 });
        setupMaterial('haybaleTopBottom', 'haybaleTopBottom', { color: 0xeedd55, aoMapIntensity: 0.4 });
        
        return materials;
    }

    createMeshFromBlocks(blocks, offsetX, offsetY, offsetZ) {
        const geometries = {};
        const matNames = [
            'dirt', 'stone', 'smoothstone', 'logSide', 'logTopBottom', 'leaves', 'grassTop', 
            'grassSide', 'grassBottom', 'plank', 'craftingTableSide', 'craftingTableTop', 
            'oakdoor', 'oakdoorSide', 'birchdoor', 'birchdoorSide', 'grass_plant', 'bedrock', 
            'sand', 'sandstone', 'cacti', 'cobble', 'birchLogSide', 'birchLogTopBottom', 
            'birchLeaves', 'birchplank', 'snowGrassTop', 'snowGrassSide', 'snow', 'furnaceFront', 
            'furnaceSide', 'furnaceTopBottom', 'glass', 'newglass', 'oakSlab', 'birchSlab', 
            'chestFront', 'chestSide', 'chestTopBottom', 'farmland', 'snowyDirt', 'seeds', 
            'wheatstage1', 'wheatstage2', 'wheatstage3', 'wheatfinished', 'haybaleSide', 'haybaleTopBottom'
        ];
        
        matNames.forEach(name => {
            geometries[name] = { vertices: [], indices: [], uvs: [], normals: [], vertexIndex: 0 };
        });

        try {
            const customBlocks = JSON.parse(localStorage.getItem('minecraft_custom_blocks') || '[]');
            customBlocks.forEach(block => {
                if (!geometries[block.id]) {
                    geometries[block.id] = { vertices: [], indices: [], uvs: [], normals: [], vertexIndex: 0 };
                }
            });
        } catch (error) {
            console.error('Error loading custom block geometries:', error);
        }

        const transparentBlocks = ['leaves', 'birchleaves', 'glass', 'newglass'];
        const nonCullingBlocks = ['oakdoor', 'birchdoor', 'oakslab', 'birchslab', 'farmland'];

        for (const [blockKey, blockType] of blocks.entries()) {
            if (blockKey.endsWith('_grass_decoration')) {
                const [coords] = blockKey.split('_grass_decoration');
                const [x, y, z] = coords.split(',').map(Number);
                this.createCrossedGrass(geometries.grass_plant, x + offsetX, y + offsetY, z + offsetZ);
                continue;
            }
            
            if (blockKey.endsWith('_crop')) {
                const [coords] = blockKey.split('_crop');
                const [x, y, z] = coords.split(',').map(Number);
                
                const worldX = x + offsetX;
                const worldY = y + offsetY;
                const worldZ = z + offsetZ;
                
                const cropKey = `${worldX},${worldY},${worldZ}`;
                const cropData = this.crops.get(cropKey);
                let stage = 'wheatstage1';
                
                if (cropData) {
                    const now = Date.now();
                    const elapsedTime = (now - cropData.plantTime) / 60000; // Convert to minutes
                    
                    if (elapsedTime >= 7.5) { 
                        stage = 'wheatfinished';
                    } else if (elapsedTime >= 5) { 
                        stage = 'wheatstage3';
                    } else if (elapsedTime >= 2.5) { 
                        stage = 'wheatstage2';
                    } else {
                        stage = 'wheatstage1';
                    }
                }
                
                this.createCropPlant(geometries[stage], x + offsetX, y + offsetY, z + offsetZ);
                continue;
            }

            const [x, y, z] = blockKey.split(',').map(Number);
            
            if (blockType === 'oakdoor' || blockType === 'birchdoor') {
                const isOpen = this.door.isOpen(x + offsetX, y + offsetY, z + offsetZ);
                const isLowerHalf = !blocks.has(`${x},${y-1},${z}`) || 
                                   (blocks.get(`${x},${y-1},${z}`) !== 'oakdoor' && 
                                    blocks.get(`${x},${y-1},${z}`) !== 'birchdoor');
                
                const doorType = blockType === 'birchdoor' ? 'birch' : 'oak';
                const doorGeometry = doorType === 'birch' ? geometries.birchdoor : geometries.oakdoor;
                
                this.door.createDoorGeometry(doorGeometry, x + offsetX, y + offsetY, z + offsetZ, isOpen, isLowerHalf);
                continue;
            }

            const worldX = x + offsetX;
            const worldY = y + offsetY;
            const worldZ = z + offsetZ;
            
            const faces = this.getFaceData(x, y, z, blockType);
            for (let i = 0; i < faces.length; i++) {
                const [faceVertices, faceIndices, normal] = faces[i];
                const adjacentX = x + normal[0];
                const adjacentY = y + normal[1];
                const adjacentZ = z + normal[2];
                const adjacentBlock = blocks.get(`${adjacentX},${adjacentY},${adjacentZ}`);
                const isCurrentBlockTransparent = transparentBlocks.includes(blockType);
                const isAdjacentBlockTransparent = adjacentBlock && transparentBlocks.includes(adjacentBlock);
                const isAdjacentBlockNonCulling = adjacentBlock && nonCullingBlocks.includes(adjacentBlock);
                const isCustomBlock = blockType && blockType.startsWith('custom_');
                const isAdjacentCustomBlock = adjacentBlock && adjacentBlock.startsWith('custom_');

                if (!adjacentBlock || isCurrentBlockTransparent || isAdjacentBlockTransparent || 
                    isAdjacentBlockNonCulling || isCustomBlock || isAdjacentCustomBlock) {
                    let materialType;

                    if (blockType === 'grass') {
                        const isSnowy = this.isSnowHeight(worldX, worldY, worldZ);
                        if (normal[1] === 1) materialType = isSnowy ? 'snowGrassTop' : 'grassTop';
                        else if (normal[1] === -1) materialType = 'grassBottom';
                        else materialType = isSnowy ? 'snowGrassSide' : 'grassSide';
                    } else if (blockType === 'wood') {
                        materialType = (normal[1] === 1 || normal[1] === -1) ? 'logTopBottom' : 'logSide';
                    } else if (blockType === 'birchwood') {
                        materialType = (normal[1] === 1 || normal[1] === -1) ? 'birchLogTopBottom' : 'birchLogSide';
                    } else if (blockType === 'birchleaves') {
                        materialType = 'birchLeaves';
                    } else if (blockType === 'craftingtable') {
                        materialType = (normal[1] === 1 || normal[1] === -1) ? 'craftingTableTop' : 'craftingTableSide';
                    } else if (blockType === 'oakdoor') {
                        materialType = (normal[1] === 0) ? 'oakdoorSide' : 'oakdoor';
                    } else if (blockType === 'birchdoor') {
                        materialType = (normal[1] === 0) ? 'birchdoorSide' : 'birchdoor';
                    } else if (blockType === 'furnace') {
                        if (normal[1] === 1 || normal[1] === -1) materialType = 'furnaceTopBottom';
                        else if (normal[0] === 0 && normal[2] === 1) materialType = 'furnaceFront';
                        else materialType = 'furnaceSide';
                    } else if (blockType === 'glass') {
                        materialType = 'glass';
                    } else if (blockType === 'newglass') {
                        materialType = 'newglass';
                    } else if (blockType === 'oakslab') {
                        materialType = 'oakSlab';
                    } else if (blockType === 'birchslab') {
                        materialType = 'birchSlab';
                    } else if (blockType === 'chest') {
                        if (normal[1] === 1 || normal[1] === -1) materialType = 'chestTopBottom';
                        else if (normal[0] === 0 && normal[2] === 1) materialType = 'chestFront';
                        else materialType = 'chestSide';
                    } else if (blockType === 'farmland') {
                        materialType = (normal[1] === 1) ? 'farmland' : 'dirt';
                    } else if (blockType === 'snowydirt') {
                        materialType = 'snowyDirt';
                    } else if (blockType === 'haybale') {
                        materialType = (normal[1] === 1 || normal[1] === -1) ? 'haybaleTopBottom' : 'haybaleSide';
                    } else {
                        materialType = blockType;
                    }

                    const geo = geometries[materialType];
                    if (!geo) continue;

                    for (const vertex of faceVertices) {
                        geo.vertices.push(vertex[0] + worldX, vertex[1] + worldY, vertex[2] + worldZ);
                    }

                    for (let n = 0; n < 4; n++) {
                        geo.normals.push(normal[0], normal[1], normal[2]);
                    }

                    geo.uvs.push(0, 0, 1, 0, 1, 1, 0, 1);

                    for (const index of faceIndices) {
                        geo.indices.push(index + geo.vertexIndex);
                    }

                    geo.vertexIndex += 4;
                }
            }
        }
        
        const group = new THREE.Group();

        for (const type in geometries) {
            const geo = geometries[type];
            if (geo.vertices.length === 0) continue;

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(geo.vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(geo.normals, 3));
            geometry.setAttribute('uv', new THREE.Float32BufferAttribute(geo.uvs, 2));
            geometry.setIndex(geo.indices);

            let material;
            if (type.startsWith('custom_')) {
                try {
                    const customBlocks = JSON.parse(localStorage.getItem('minecraft_custom_blocks') || '[]');
                    const customBlock = customBlocks.find(block => block.id === type);
                    
                    if (customBlock && customBlock.textures) {
                        const texture = new THREE.TextureLoader().load(
                            customBlock.textures.front || Object.values(customBlock.textures)[0]
                        );
                        texture.magFilter = THREE.NearestFilter;
                        texture.minFilter = THREE.NearestFilter;
                        
                        material = new THREE.MeshLambertMaterial({
                            map: texture,
                            color: 0xFFFFFF,
                            transparent: false,
                            alphaTest: 0.1,
                            aoMapIntensity: 0.4
                        });
                    }
                } catch (error) {
                    console.error(`Error creating material for custom block ${type}:`, error);
                    material = new THREE.MeshLambertMaterial({ color: 0xFF00FF });
                }
            } else {
                material = this.materials[type];
            }

            if (!material) {
                material = new THREE.MeshLambertMaterial({ color: 0xFF00FF });
            }

            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = mesh.receiveShadow = true;
            group.add(mesh);
        }

        return group;
    }

    getFaceData(x, y, z, blockType) {
        const size = this.blockSize;
        
        if (blockType === 'farmland') {
            return [
                [[[0, 0, size], [size, 0, size], [size, 0.9, size], [0, 0.9, size]], [0, 1, 2, 0, 2, 3], [0, 0, 1]],
                [[[size, 0, 0], [0, 0, 0], [0, 0.9, 0], [size, 0.9, 0]], [0, 1, 2, 0, 2, 3], [0, 0, -1]],
                [[[0, 0.9, 0], [0, 0.9, size], [size, 0.9, size], [size, 0.9, 0]], [0, 1, 2, 0, 2, 3], [0, 1, 0]],
                [[[0, 0, size], [0, 0, 0], [size, 0, 0], [size, 0, size]], [0, 1, 2, 0, 2, 3], [0, -1, 0]],
                [[[size, 0, size], [size, 0, 0], [size, 0.9, 0], [size, 0.9, size]], [0, 1, 2, 0, 2, 3], [1, 0, 0]],
                [[[0, 0, 0], [0, 0, size], [0, 0.9, size], [0, 0.9, 0]], [0, 1, 2, 0, 2, 3], [-1, 0, 0]]
            ];
        } else if (this.isSlab(blockType)) {
            const halfHeight = size / 2;
            return [
                [[[0, 0, size], [size, 0, size], [size, halfHeight, size], [0, halfHeight, size]], [0, 1, 2, 0, 2, 3], [0, 0, 1]],
                [[[size, 0, 0], [0, 0, 0], [0, halfHeight, 0], [size, halfHeight, 0]], [0, 1, 2, 0, 2, 3], [0, 0, -1]],
                [[[0, halfHeight, 0], [0, halfHeight, size], [size, halfHeight, size], [size, halfHeight, 0]], [0, 1, 2, 0, 2, 3], [0, 1, 0]],
                [[[0, 0, size], [0, 0, 0], [size, 0, 0], [size, 0, size]], [0, 1, 2, 0, 2, 3], [0, -1, 0]],
                [[[size, 0, size], [size, 0, 0], [size, halfHeight, 0], [size, halfHeight, size]], [0, 1, 2, 0, 2, 3], [1, 0, 0]],
                [[[0, 0, 0], [0, 0, size], [0, halfHeight, size], [0, halfHeight, 0]], [0, 1, 2, 0, 2, 3], [-1, 0, 0]]
            ];
        } else if (blockType === 'haybale') {
            return [
                [[[0, 0, size], [size, 0, size], [size, size, size], [0, size, size]], [0, 1, 2, 0, 2, 3], [0, 0, 1]],
                [[[size, 0, 0], [0, 0, 0], [0, size, 0], [size, size, 0]], [0, 1, 2, 0, 2, 3], [0, 0, -1]],
                [[[0, size, 0], [0, size, size], [size, size, size], [size, size, 0]], [0, 1, 2, 0, 2, 3], [0, 1, 0]],
                [[[0, 0, size], [0, 0, 0], [size, 0, 0], [size, 0, size]], [0, 1, 2, 0, 2, 3], [0, -1, 0]],
                [[[size, 0, size], [size, 0, 0], [size, size, 0], [size, size, size]], [0, 1, 2, 0, 2, 3], [1, 0, 0]],
                [[[0, 0, 0], [0, 0, size], [0, size, size], [0, size, 0]], [0, 1, 2, 0, 2, 3], [-1, 0, 0]]
            ];
        } else {
            return [
                [[[0, 0, size], [size, 0, size], [size, size, size], [0, size, size]], [0, 1, 2, 0, 2, 3], [0, 0, 1]],
                [[[size, 0, 0], [0, 0, 0], [0, size, 0], [size, size, 0]], [0, 1, 2, 0, 2, 3], [0, 0, -1]],
                [[[0, size, 0], [0, size, size], [size, size, size], [size, size, 0]], [0, 1, 2, 0, 2, 3], [0, 1, 0]],
                [[[0, 0, size], [0, 0, 0], [size, 0, 0], [size, 0, size]], [0, 1, 2, 0, 2, 3], [0, -1, 0]],
                [[[size, 0, size], [size, 0, 0], [size, size, 0], [size, size, size]], [0, 1, 2, 0, 2, 3], [1, 0, 0]],
                [[[0, 0, 0], [0, 0, size], [0, size, size], [0, size, 0]], [0, 1, 2, 0, 2, 3], [-1, 0, 0]]
            ];
        }
    }

    createCrossedGrass(geometry, x, y, z) {
        const halfWidth = 0.4;
        const centerX = x + 0.5;
        const centerZ = z + 0.5;
        
        const positions = [
            [centerX - halfWidth, y, centerZ - halfWidth],
            [centerX + halfWidth, y, centerZ + halfWidth],
            [centerX + halfWidth, y + 0.8, centerZ + halfWidth],
            [centerX - halfWidth, y + 0.8, centerZ - halfWidth],
            [centerX - halfWidth, y, centerZ + halfWidth],
            [centerX + halfWidth, y, centerZ - halfWidth],
            [centerX + halfWidth, y + 0.8, centerZ - halfWidth],
            [centerX - halfWidth, y + 0.8, centerZ + halfWidth]
        ];
        
        for (const pos of positions) {
            geometry.vertices.push(pos[0], pos[1], pos[2]);
        }
        
        for (let i = 0; i < 8; i++) {
            geometry.normals.push(0, 1, 0);
        }
        
        geometry.uvs.push(0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1);
        
        const indices = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7];
        
        for (const index of indices) {
            geometry.indices.push(index + geometry.vertexIndex);
        }
        
        geometry.vertexIndex += 8;
    }

    createCropPlant(geometry, x, y, z) {
        const halfWidth = 0.4;
        const centerX = x + 0.5;
        const centerZ = z + 0.5;
        
        const cropHeight = 0.8;
        const yPos = y; // Changed from y - 0.5 to y to place the crop on top of the farmland
        
        const positions = [
            [centerX - halfWidth, yPos, centerZ - halfWidth],
            [centerX + halfWidth, yPos, centerZ + halfWidth],
            [centerX + halfWidth, yPos + cropHeight, centerZ + halfWidth],
            [centerX - halfWidth, yPos + cropHeight, centerZ - halfWidth],
            [centerX - halfWidth, yPos, centerZ + halfWidth],
            [centerX + halfWidth, yPos, centerZ - halfWidth],
            [centerX + halfWidth, yPos + cropHeight, centerZ - halfWidth],
            [centerX - halfWidth, yPos + cropHeight, centerZ + halfWidth]
        ];
        
        for (const pos of positions) {
            geometry.vertices.push(pos[0], pos[1], pos[2]);
        }
        
        for (let i = 0; i < 8; i++) {
            geometry.normals.push(0, 1, 0);
        }
        
        geometry.uvs.push(0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1);
        
        const indices = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7];
        
        for (const index of indices) {
            geometry.indices.push(index + geometry.vertexIndex);
        }
        
        geometry.vertexIndex += 8;
    }

    initializeChest(x, y, z, playerPosition) {
        const chestKey = `${x},${y},${z}`;
        this.chests.set(chestKey, {
            inventory: Array(27).fill().map(() => ({ type: null, count: 0 })),
            orientation: 0
        });
        
        if (playerPosition) {
            const chestPos = new THREE.Vector3(x + 0.5, y, z + 0.5);
            const playerToChest = new THREE.Vector2(
                chestPos.x - playerPosition.x,
                chestPos.z - playerPosition.z
            ).normalize();
            
            const angle = Math.atan2(playerToChest.y, playerToChest.x);
            let orientation;
            
            if (angle >= -Math.PI/4 && angle < Math.PI/4) orientation = 0;
            else if (angle >= Math.PI/4 && angle < 3*Math.PI/4) orientation = 1;
            else if (angle >= 3*Math.PI/4 || angle < -3*Math.PI/4) orientation = 2;
            else orientation = 3;
            
            this.chests.get(chestKey).orientation = orientation;
        }
    }

    getChestData(x, y, z) {
        return this.chests.get(`${x},${y},${z}`);
    }

    plantCrop(x, y, z) {
        const cropKey = `${x},${y},${z}`;
        
        this.crops.set(cropKey, {
            plantTime: Date.now(),
            stage: 0
        });
        
        return true;
    }

    getCropStage(x, y, z) {
        const cropKey = `${x},${y},${z}`;
        const cropData = this.crops.get(cropKey);
        
        if (!cropData) return 0;
        
        const now = Date.now();
        const elapsedTime = (now - cropData.plantTime) / 60000;
        
        if (elapsedTime >= 7.5) { 
            return 3; 
        } else if (elapsedTime >= 5) { 
            return 2; 
        } else if (elapsedTime >= 2.5) { 
            return 1; 
        } else {
            return 0; 
        }
    }

    harvestCrop(x, y, z) {
        const cropKey = `${x},${y},${z}`;
        const cropData = this.crops.get(cropKey);
        
        if (!cropData) return { seeds: 1, wheat: 0 };
        
        const stage = this.getCropStage(x, y, z);
        let result = { seeds: 1, wheat: 0 };
        
        if (stage === 3) { 
            result.seeds = 3;
            result.wheat = 2; 
        }
        
        this.crops.delete(cropKey);
        
        return result;
    }

    placeBlock(x, y, z, blockType, playerPosition = null) {
        const chunkX = Math.floor(x / this.chunkSize);
        const chunkZ = Math.floor(z / this.chunkSize);
        const chunkKey = `${chunkX},${chunkZ}`;

        const chunk = this.chunks.get(chunkKey);
        if (!chunk) return false;

        const localX = ((x % this.chunkSize) + this.chunkSize) % this.chunkSize;
        const localZ = ((z % this.chunkSize) + this.chunkSize) % this.chunkSize;

        const blockKey = `${localX},${y},${localZ}`;

        const currentBlockType = chunk.blocks.get(blockKey);
        if (currentBlockType === blockType) return true;

        if (blockType === 'oakdoor' || blockType === 'birchdoor') {
            const blockAboveKey = `${localX},${y+1},${localZ}`;
            if (chunk.blocks.get(blockAboveKey)) return false;
            
            chunk.blocks.set(blockKey, blockType);
            chunk.blocks.set(blockAboveKey, blockType);
            
            const doorType = blockType === 'birchdoor' ? 'birch' : 'oak';
            this.door.place(x, y, z, playerPosition, doorType);
            
            this.markChunkDirty(chunkX, chunkZ);
            return true;
        }

        if (blockType === 'chest') {
            const chestKey = `${x},${y},${z}`;
            if (!this.chests.has(chestKey)) {
                this.initializeChest(x, y, z, playerPosition);
            }
        }

        chunk.blocks.set(blockKey, blockType);
        this.markChunkDirty(chunkX, chunkZ);
        
        if (localX === 0) this.markChunkDirty(chunkX - 1, chunkZ);
        else if (localX === this.chunkSize - 1) this.markChunkDirty(chunkX + 1, chunkZ);
        
        if (localZ === 0) this.markChunkDirty(chunkX, chunkZ - 1);
        else if (localZ === this.chunkSize - 1) this.markChunkDirty(chunkX, chunkZ + 1);
        
        return true;
    }

    breakBlock(x, y, z) {
        const chunkX = Math.floor(x / this.chunkSize);
        const chunkZ = Math.floor(z / this.chunkSize);
        const chunkKey = `${chunkX},${chunkZ}`;

        const chunk = this.chunks.get(chunkKey);
        if (!chunk) return false;

        const localX = ((x % this.chunkSize) + this.chunkSize) % this.chunkSize;
        const localZ = ((z % this.chunkSize) + this.chunkSize) % this.chunkSize;

        const grassKey = `${localX},${y},${localZ}_grass_decoration`;
        if (chunk.blocks.has(grassKey)) {
            chunk.blocks.delete(grassKey);
            this.markChunkDirty(chunkX, chunkZ);
            return Math.random() < 0.08 ? "seeds" : null;
        }
        
        const cropKey = `${localX},${y},${localZ}_crop`;
        if (chunk.blocks.has(cropKey)) {
            chunk.blocks.delete(cropKey);
            
            const worldCropKey = `${x},${y},${z}`;
            const harvest = this.harvestCrop(x, y, z);
            
            this.markChunkDirty(chunkX, chunkZ);
            return { type: 'crop', ...harvest };
        }

        const blockKey = `${localX},${y},${localZ}`;
        const blockType = chunk.blocks.get(blockKey);
        if (!blockType) return false;

        if (blockType === 'oakdoor' || blockType === 'birchdoor') {
            this.door.remove(x, y, z);
            
            const blockAboveKey = `${localX},${y+1},${localZ}`;
            const blockBelowKey = `${localX},${y-1},${localZ}`;
        
            chunk.blocks.delete(blockKey);
        
            if (chunk.blocks.get(blockAboveKey) === 'oakdoor' || chunk.blocks.get(blockAboveKey) === 'birchdoor') {
                chunk.blocks.delete(blockAboveKey);
                this.door.remove(x, y+1, z);
            }
        
            if (chunk.blocks.get(blockBelowKey) === 'oakdoor' || chunk.blocks.get(blockBelowKey) === 'birchdoor') {
                chunk.blocks.delete(blockBelowKey);
                this.door.remove(x, y-1, z);
            }
        
            this.markChunkDirty(chunkX, chunkZ);
            this.markAdjacentChunksIfNeeded(chunkX, chunkZ, localX, localZ);
            return blockType;
        }

        if (blockType === 'chest') {
            this.chests.delete(`${x},${y},${z}`);
        }

        if (blockType === 'stone') {
            chunk.blocks.delete(blockKey);
            this.markChunkDirty(chunkX, chunkZ);
            this.markAdjacentChunksIfNeeded(chunkX, chunkZ, localX, localZ);
            return "cobble";
        }
        
        if (blockType === 'grass') {
            chunk.blocks.delete(blockKey);
            this.markChunkDirty(chunkX, chunkZ);
            this.markAdjacentChunksIfNeeded(chunkX, chunkZ, localX, localZ);
            
            if (Math.random() < 0.05) {
                return "seeds";
            }
            return blockType;
        }

        chunk.blocks.delete(blockKey);
        this.markChunkDirty(chunkX, chunkZ);
        this.markAdjacentChunksIfNeeded(chunkX, chunkZ, localX, localZ);
        return blockType;
    }

    markAdjacentChunksIfNeeded(chunkX, chunkZ, localX, localZ) {
        if (localX === 0) this.markChunkDirty(chunkX - 1, chunkZ);
        else if (localX === this.chunkSize - 1) this.markChunkDirty(chunkX + 1, chunkZ);
        
        if (localZ === 0) this.markChunkDirty(chunkX, chunkZ - 1);
        else if (localZ === this.chunkSize - 1) this.markChunkDirty(chunkX, chunkZ + 1);
    }

    isBlockSolid(x, y, z) {
        const block = this.getBlock(x, y, z);
        if (!block) return false;
        
        if (block === 'oakdoor' || block === 'birchdoor') {
            return this.door.isSolid(x, y, z);
        }
        
        return block != null;
    }

    isSlab(blockType) {
        return this.slabTypes.includes(blockType);
    }

    generateTree(blocks, x, y, z) {
        if (x < 2 || x > this.chunkSize - 3 || z < 2 || z > this.chunkSize - 3) return;
        
        const trunkHeight = 4 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < trunkHeight; i++) {
            blocks.set(`${x},${y + i},${z}`, 'wood');
        }
        
        if (Math.random() < 0.5) {
            const extraHeight = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < extraHeight; i++) {
                blocks.set(`${x},${y + trunkHeight + i},${z}`, 'wood');
            }
        }
        
        const hasBranches = Math.random() < 0.6;
        
        if (hasBranches) {
            const branchY = y + Math.floor(trunkHeight * 0.6);
            const branchDirections = [];
            
            const possibleDirections = [{dx: 1, dz: 0}, {dx: -1, dz: 0}, {dx: 0, dz: 1}, {dx: 0, dz: -1}];
            const branchCount = 1 + Math.floor(Math.random() * 2);
            
            for (let i = 0; i < branchCount; i++) {
                if (possibleDirections.length > 0) {
                    const randIndex = Math.floor(Math.random() * possibleDirections.length);
                    branchDirections.push(possibleDirections.splice(randIndex, 1)[0]);
                }
            }
            
            branchDirections.forEach(dir => {
                blocks.set(`${x + dir.dx},${branchY},${z + dir.dz}`, 'wood');
                blocks.set(`${x + dir.dx * 2},${branchY},${z + dir.dz * 2}`, 'wood');
                
                for (let lx = -1; lx <= 1; lx++) {
                    for (let ly = 0; ly <= 1; ly++) {
                        for (let lz = -1; lz <= 1; lz++) {
                            blocks.set(`${x + dir.dx * 2 + lx},${branchY + ly},${z + dir.dz * 2 + lz}`, 'leaves');
                        }
                    }
                }
            });
        }
        
        const leavesY = y + trunkHeight - 1;
        for (let lx = -2; lx <= 2; lx++) {
            for (let lz = -2; lz <= 2; lz++) {
                if (Math.abs(lx) == 2 && Math.abs(lz) == 2) continue; // Skip corner blocks for rounded shape
                
                blocks.set(`${x + lx},${leavesY},${z + lz}`, 'leaves');
                blocks.set(`${x + lx},${leavesY + 1},${z + lz}`, 'leaves');
                
                if (Math.abs(lx) < 2 && Math.abs(lz) < 2) {
                    blocks.set(`${x + lx},${leavesY + 2},${z + lz}`, 'leaves');
                }
            }
        }
        
        blocks.set(`${x},${leavesY + 3},${z}`, 'leaves');
    }

    generateBirchTree(blocks, x, y, z) {
        if (x < 2 || x > this.chunkSize - 3 || z < 2 || z > this.chunkSize - 3) return;
        
        const trunkHeight = 5 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < trunkHeight; i++) {
            blocks.set(`${x},${y + i},${z}`, 'birchwood');
        }
        
        if (Math.random() < 0.4) {
            const branchY = y + Math.floor(trunkHeight * 0.7);
            const direction = Math.floor(Math.random() * 4);
            let dx = 0, dz = 0;
            
            if (direction === 0) dx = 1;
            else if (direction === 1) dx = -1;
            else if (direction === 2) dz = 1;
            else dz = -1;
            
            blocks.set(`${x + dx},${branchY},${z + dz}`, 'birchwood');
            
            for (let lx = -1; lx <= 1; lx++) {
                for (let lz = -1; lz <= 1; lz++) {
                    if ((lx != 0 || lz != 0) && Math.random() < 0.7) {
                        blocks.set(`${x + dx + lx},${branchY},${z + dz + lz}`, 'birchleaves');
                        if (Math.random() < 0.5) {
                            blocks.set(`${x + dx + lx},${branchY + 1},${z + dz + lz}`, 'birchleaves');
                        }
                    }
                }
            }
        }
        
        const leavesY = y + trunkHeight - 2;
        for (let lx = -2; lx <= 2; lx++) {
            for (let lz = -2; lz <= 2; lz++) {
                if (Math.abs(lx) == 2 && Math.abs(lz) == 2) {
                    if (Math.random() < 0.4) { // Some corner leaves for less cubic look
                        blocks.set(`${x + lx},${leavesY},${z + lz}`, 'birchleaves');
                        if (Math.random() < 0.5) {
                            blocks.set(`${x + lx},${leavesY + 1},${z + lz}`, 'birchleaves');
                        }
                    }
                } else {
                    blocks.set(`${x + lx},${leavesY},${z + lz}`, 'birchleaves');
                    blocks.set(`${x + lx},${leavesY + 1},${z + lz}`, 'birchleaves');
                    
                    if ((Math.abs(lx) + Math.abs(lz)) < 3 || Math.random() < 0.7) {
                        blocks.set(`${x + lx},${leavesY + 2},${z + lz}`, 'birchleaves');
                    }
                    
                    if ((Math.abs(lx) < 2 && Math.abs(lz) < 2) && Math.random() < 0.5) {
                        blocks.set(`${x + lx},${leavesY + 3},${z + lz}`, 'birchleaves');
                    }
                }
            }
        }
        
        blocks.set(`${x},${leavesY + 3},${z}`, 'birchleaves');
        blocks.set(`${x},${leavesY + 4},${z}`, 'birchleaves');
    }

    generateCactus(blocks, x, y, z) {
        if (x < 0 || x >= this.chunkSize || z < 0 || z >= this.chunkSize) return;
        
        for (let i = 0; i < 3; i++) {
            blocks.set(`${x},${y + i},${z}`, 'cacti');
        }
    }

    isNearVegetation(vegetationPositions, x, z, minDistance) {
        for (let dx = -minDistance; dx <= minDistance; dx++) {
            for (let dz = -minDistance; dz <= minDistance; dz++) {
                if (dx === 0 && dz === 0) continue;
                
                const checkX = x + dx;
                const checkZ = z + dz;
                
                if (vegetationPositions.has(`${checkX},${checkZ}`)) {
                    const distSq = dx*dx + dz*dz;
                    if (distSq <= minDistance*minDistance) return true;
                }
            }
        }
        return false;
    }

    getBlock(x, y, z) {
        const chunkX = Math.floor(x / this.chunkSize);
        const chunkZ = Math.floor(z / this.chunkSize);
        const chunkKey = `${chunkX},${chunkZ}`;

        const chunk = this.chunks.get(chunkKey);
        if (!chunk) return null;

        const localX = ((x % this.chunkSize) + this.chunkSize) % this.chunkSize;
        const localZ = ((z % this.chunkSize) + this.chunkSize) % this.chunkSize;

        return chunk.blocks.get(`${localX},${y},${localZ}`);
    }

    getBiomeAt(x, z) {
        const biomeValue = this.biomeNoise.noise2D(x * 0.0005, z * 0.0005);
        const secondaryNoise = this.biomeNoise.noise2D(x * 0.0005 + 500, z * 0.0005 + 500);
        const tertiaryNoise = this.biomeNoise.noise2D(x * 0.0005 + 1000, z * 0.0005 + 1000);
        const mountainNoise = this.biomeNoise.noise2D(x * 0.0005 + 1500, z * 0.0005 + 1500);
        const microVariation = this.blendNoise.noise2D(x * 0.02, z * 0.02) * 0.02;
        
        const hillsThreshold = 0.35, transitionWidth = 0.10 + microVariation;
        const desertThreshold = 0.2, desertTransitionWidth = 0.10 + microVariation;
        const multiforestThreshold = 0.2, forestTransitionWidth = 0.10 + microVariation;
        const mountainThreshold = 0.65, mountainTransitionWidth = 0.15 + microVariation;
        
        let hillBlendFactor = 0, desertBlendFactor = 0, multiforestBlendFactor = 0, mountainBlendFactor = 0;
        
        if (mountainNoise > mountainThreshold + mountainTransitionWidth) {
            mountainBlendFactor = 1.0;
        } 
        else if (mountainNoise > mountainThreshold - mountainTransitionWidth) {
            const t = (mountainNoise - (mountainThreshold - mountainTransitionWidth)) / (mountainTransitionWidth * 2);
            mountainBlendFactor = this.smoothStep(t);
        }
        
        if (mountainBlendFactor < 0.8) {
            if (biomeValue > hillsThreshold + transitionWidth) {
                hillBlendFactor = 1.0 - mountainBlendFactor;
            } 
            else if (biomeValue > hillsThreshold - transitionWidth) {
                const t = (biomeValue - (hillsThreshold - transitionWidth)) / (transitionWidth * 2);
                hillBlendFactor = this.smoothStep(t) * (1.0 - mountainBlendFactor);
            }
        }
        
        if (hillBlendFactor + mountainBlendFactor < 0.9) {
            if (secondaryNoise > desertThreshold + desertTransitionWidth) {
                desertBlendFactor = 1.0 - Math.max(hillBlendFactor, mountainBlendFactor);
            } 
            else if (secondaryNoise > desertThreshold - desertTransitionWidth) {
                const t = (secondaryNoise - (desertThreshold - desertTransitionWidth)) / (desertTransitionWidth * 2);
                desertBlendFactor = this.smoothStep(t) * (1.0 - Math.max(hillBlendFactor, mountainBlendFactor));
            }
            
            if (tertiaryNoise > multiforestThreshold + forestTransitionWidth) {
                multiforestBlendFactor = 1.0 - Math.max(hillBlendFactor, desertBlendFactor, mountainBlendFactor);
            }
            else if (tertiaryNoise > multiforestThreshold - forestTransitionWidth) {
                const t = (tertiaryNoise - (multiforestThreshold - forestTransitionWidth)) / (forestTransitionWidth * 2);
                multiforestBlendFactor = this.smoothStep(t) * (1.0 - Math.max(hillBlendFactor, desertBlendFactor, mountainBlendFactor));
            }
        }

        if (hillBlendFactor > 0 && hillBlendFactor < 1) {
            const heightDiff = this.biomes.hills.baseHeight - 
                               (hillBlendFactor < 0.5 ? 
                                Math.max(
                                    this.biomes.flatlands.baseHeight,
                                    this.biomes.desert.baseHeight,
                                    this.biomes.multiforest.baseHeight
                                ) : this.biomes.desert.baseHeight);
            
            const reducedDiff = heightDiff * 0.6;
            
            if (hillBlendFactor < 0.5) {
                const adjustedHeight = this.biomes.flatlands.baseHeight + reducedDiff * (hillBlendFactor * 2);
                this.biomes.hills.baseHeight = adjustedHeight;
            } else {
                const adjustedHeight = this.biomes.desert.baseHeight + reducedDiff * ((1 - hillBlendFactor) * 2);
                this.biomes.hills.baseHeight = adjustedHeight;
            }
        }
        
        const flatlandsBlend = Math.max(0, 1 - hillBlendFactor - desertBlendFactor - multiforestBlendFactor - mountainBlendFactor);
        
        return {
            hillsBlend: hillBlendFactor,
            desertBlend: desertBlendFactor,
            multiforestBlend: multiforestBlendFactor,
            mountainBlend: mountainBlendFactor,
            flatlandsBlend: flatlandsBlend,
            biome: this.getBlendedBiome(hillBlendFactor, desertBlendFactor, multiforestBlendFactor, mountainBlendFactor, flatlandsBlend)
        };
    }
    
    smoothStep(t) {
        return t * t * (3 - 2 * t);
    }
    
    getBlendedBiome(hillsBlend, desertBlend, multiforestBlend, mountainBlend, flatlandsBlend) {
        if (hillsBlend > 0.85) return this.biomes.hills;
        if (desertBlend > 0.85) return this.biomes.desert;
        if (multiforestBlend > 0.85) return this.biomes.multiforest;
        if (mountainBlend > 0.85) return this.biomes.mountains;
        if (flatlandsBlend > 0.85) return this.biomes.flatlands;
        
        const dominantBiome = this.getDominantBiome(hillsBlend, desertBlend, multiforestBlend, mountainBlend, flatlandsBlend);
        
        return {
            name: this.getBlendedBiomeName(hillsBlend, desertBlend, multiforestBlend, mountainBlend, flatlandsBlend),
            baseHeight: this.blendBiomeValue('baseHeight', hillsBlend, desertBlend, multiforestBlend, mountainBlend, flatlandsBlend),
            heightVariation: this.blendBiomeValue('heightVariation', hillsBlend, desertBlend, multiforestBlend, mountainBlend, flatlandsBlend),
            hilliness: this.blendBiomeValue('hilliness', hillsBlend, desertBlend, multiforestBlend, mountainBlend, flatlandsBlend),
            detailScale: this.blendBiomeValue('detailScale', hillsBlend, desertBlend, multiforestBlend, mountainBlend, flatlandsBlend),
            treeDensity: Math.max(0.05, this.blendSpecificValue('treeDensity', [hillsBlend, multiforestBlend, mountainBlend, flatlandsBlend])),
            birchTreeRatio: multiforestBlend > 0.3 ? this.biomes.multiforest.birchTreeRatio * multiforestBlend : 0,
            grassDensity: Math.max(this.blendSpecificValue('grassDensity', [hillsBlend, multiforestBlend, mountainBlend, flatlandsBlend])),
            cactusDensity: this.biomes.desert.cactusDensity * desertBlend,
            snowHeight: mountainBlend > 0.3 ? this.biomes.mountains.snowHeight : 999,
            snowVariation: this.biomes.mountains.snowVariation,
            snowBlockThreshold: this.biomes.mountains.snowBlockThreshold,
            snowBlockVariation: this.biomes.mountains.snowBlockVariation,
            dominantBiome
        };
    }
    
    blendBiomeValue(property, hillsBlend, desertBlend, multiforestBlend, mountainBlend, flatlandsBlend) {
        return (
            this.biomes.hills[property] * hillsBlend +
            this.biomes.desert[property] * desertBlend +
            this.biomes.multiforest[property] * multiforestBlend +
            this.biomes.mountains[property] * mountainBlend +
            this.biomes.flatlands[property] * flatlandsBlend
        );
    }
    
    blendSpecificValue(property, blendFactors) {
        const biomeTypes = [this.biomes.hills, this.biomes.multiforest, this.biomes.mountains, this.biomes.flatlands];
        let maxValue = 0;
        
        for (let i = 0; i < biomeTypes.length; i++) {
            if (biomeTypes[i][property] * blendFactors[i] > maxValue) {
                maxValue = biomeTypes[i][property] * blendFactors[i];
            }
        }
        
        return maxValue;
    }
    
    getBlendedBiomeName(hillsBlend, desertBlend, multiforestBlend, mountainBlend, flatlandsBlend) {
        const blends = [
            { type: "Mountains", value: mountainBlend },
            { type: "Hills", value: hillsBlend },
            { type: "Desert", value: desertBlend },
            { type: "Multi-forest", value: multiforestBlend },
            { type: "Flatlands", value: flatlandsBlend }
        ];
        
        blends.sort((a, b) => b.value - a.value);
        
        if (blends[0].value > 0.85) return blends[0].type;
        
        if (blends[0].type === "Mountains") {
            if (blends[1].type === "Hills" && blends[1].value > 0.2) return "Mountain Range";
            if (blends[1].type === "Desert" && blends[1].value > 0.2) return "Desert Mountains";
            if (blends[1].type === "Multi-forest" && blends[1].value > 0.2) return "Forested Mountains";
            if (blends[1].type === "Flatlands" && blends[1].value > 0.2) return "Mountain Foothills";
            return "Mountains";
        }
        
        if (blends[0].type === "Hills") {
            if (blends[1].type === "Mountains" && blends[1].value > 0.2) return "Mountain Foothills";
            if (blends[1].type === "Multi-forest" && blends[1].value > 0.2) return "Forested Hills";
            if (blends[1].type === "Desert" && blends[1].value > 0.2) return "Hill Desert";
            if (blends[1].type === "Flatlands" && blends[1].value > 0.2) return "Rolling Hills";
            return "Hills";
        }
        
        if (blends[0].type === "Desert") {
            if ((blends[1].type === "Mountains" || blends[1].type === "Hills") && blends[1].value > 0.2) return "Desert Mountains";
            if (blends[1].type === "Multi-forest" && blends[1].value > 0.2) return "Oasis";
            if (blends[1].type === "Flatlands" && blends[1].value > 0.2) return "Sandy Plains";
            return "Desert";
        }
        
        if (blends[0].type === "Multi-forest") {
            if (blends[1].type === "Mountains" && blends[1].value > 0.2) return "Forested Mountains";
            if (blends[1].type === "Hills" && blends[1].value > 0.2) return "Forest Hills";
            if (blends[1].type === "Desert" && blends[1].value > 0.2) return "Sparse Forest";
            if (blends[1].type === "Flatlands" && blends[1].value > 0.2) return "Light Forest";
            return "Multi-forest";
        }
        
        if (blends[1].type === "Mountains" && blends[1].value > 0.2) return "Mountain Plains";
        if (blends[1].type === "Hills" && blends[1].value > 0.2) return "Highland Plains";
        if (blends[1].type === "Desert" && blends[1].value > 0.2) return "Scrubland";
        if (blends[1].type === "Multi-forest" && blends[1].value > 0.2) return "Wooded Plains";
        return "Flatlands";
    }
    
    getDominantBiome(hillsBlend, desertBlend, multiforestBlend, mountainBlend, flatlandsBlend) {
        const maxBlend = Math.max(hillsBlend, desertBlend, multiforestBlend, mountainBlend, flatlandsBlend);
        
        if (mountainBlend === maxBlend) return this.biomes.mountains;
        if (hillsBlend === maxBlend) return this.biomes.hills;
        if (desertBlend === maxBlend) return this.biomes.desert;
        if (multiforestBlend === maxBlend) return this.biomes.multiforest;
        return this.biomes.flatlands;
    }

    generateNormalTerrain(blocks, worldOffsetX, worldOffsetZ, treesToGenerate, cactiToGenerate, grassToGenerate, vegetationPositions) {
        let canSpawnHut = false;
        let hutX = 0, hutZ = 0, hutHeight = 0;
        let canSpawnPyramid = false;
        let pyramidX = 0, pyramidZ = 0, pyramidHeight = 0;
        
        const chunkCenterX = worldOffsetX + this.chunkSize / 2;
        const chunkCenterZ = worldOffsetZ + this.chunkSize / 2;
        const biomeData = this.getBiomeAt(chunkCenterX, chunkCenterZ);
        
        if (biomeData.flatlandsBlend > 0.7) {
            const structureValue = this.structureNoise.noise2D(worldOffsetX * 0.01, worldOffsetZ * 0.01);
            let tooClose = false;
            for (const location of this.hutLocations) {
                const [existingX, existingZ] = location.split(',').map(Number);
                const dx = existingX - chunkCenterX;
                const dz = existingZ - chunkCenterZ;
                const distanceSquared = dx * dx + dz * dz;
                
                if (distanceSquared < 230400) { 
                    tooClose = true;
                    break;
                }
            }
            if (!tooClose && structureValue < this.biomes.flatlands.hutChance) {
                hutX = Math.floor(this.chunkSize / 2) - 2 + Math.floor(this.structureNoise.noise2D(worldOffsetX, worldOffsetZ) * 3);
                hutZ = Math.floor(this.chunkSize / 2) - 2 + Math.floor(this.structureNoise.noise2D(worldOffsetX + 100, worldOffsetZ + 100) * 3);
                hutX = Math.max(3, Math.min(hutX, this.chunkSize - 6));
                hutZ = Math.max(3, Math.min(hutZ, this.chunkSize - 6));
                
                // Check if all hut foundation positions are at the same height
                const baseHeight = this.getHeight(worldOffsetX + hutX, worldOffsetZ + hutZ);
                let validHutSpawn = true;
                for (let dx = 0; dx <= 6 && validHutSpawn; dx++) {
                    for (let dz = 0; dz <= 4 && validHutSpawn; dz++) {
                        const checkHeight = this.getHeight(worldOffsetX + hutX + dx, worldOffsetZ + hutZ + dz);
                        if (checkHeight !== baseHeight) {
                            validHutSpawn = false;
                        }
                    }
                }
                
                if (validHutSpawn) {
                    canSpawnHut = true;
                    hutHeight = baseHeight;
                    this.hutLocations.add(`${chunkCenterX},${chunkCenterZ}`);
                }
            }
        }
        
        if (biomeData.desertBlend > 0.7) {
            const pyramidStructureValue = this.structureNoise.noise2D(worldOffsetX * 0.008, worldOffsetZ * 0.008);
            let tooCloseToPyramid = false;
            for (const location of this.hutLocations) {
                const [existingX, existingZ] = location.split(',').map(Number);
                const dx = existingX - chunkCenterX;
                const dz = existingZ - chunkCenterZ;
                const distanceSquared = dx * dx + dz * dz;
                
                if (distanceSquared < 230400) { 
                    tooCloseToPyramid = true;
                    break;
                }
            }
            if (!tooCloseToPyramid && pyramidStructureValue < 0.08) {
                pyramidX = Math.floor(this.chunkSize / 2) - 7;
                pyramidZ = Math.floor(this.chunkSize / 2) - 7;
                pyramidX = Math.max(0, Math.min(pyramidX, this.chunkSize - 15));
                pyramidZ = Math.max(0, Math.min(pyramidZ, this.chunkSize - 15));
                
                // Check if all pyramid foundation positions are at the same height
                const baseHeight = this.getHeight(worldOffsetX + pyramidX, worldOffsetZ + pyramidZ);
                let validPyramidSpawn = true;
                for (let dx = 0; dx < 15 && validPyramidSpawn; dx++) {
                    for (let dz = 0; dz < 15 && validPyramidSpawn; dz++) {
                        const checkHeight = this.getHeight(worldOffsetX + pyramidX + dx, worldOffsetZ + pyramidZ + dz);
                        if (checkHeight !== baseHeight) {
                            validPyramidSpawn = false;
                        }
                    }
                }
                
                if (validPyramidSpawn) {
                    canSpawnPyramid = true;
                    pyramidHeight = baseHeight;
                    this.hutLocations.add(`${chunkCenterX},${chunkCenterZ}`);
                }
            }
        }
        
        for (let x = 0; x < this.chunkSize; x++) {
            for (let z = 0; z < this.chunkSize; z++) {
                const worldX = worldOffsetX + x;
                const worldZ = worldOffsetZ + z;

                const height = this.getHeight(worldX, worldZ);
                
                const biomeData = this.getBiomeAt(worldX, worldZ);
                const { hillsBlend, desertBlend, multiforestBlend, mountainBlend, flatlandsBlend } = biomeData;
                
                let topBlockType = null;
                
                for (let y = 0; y < height; y++) {
                    let blockType;

                    if (y === 0) {
                        blockType = 'bedrock';
                    } 
                    else if (y >= height - 3 && y < height) {
                        if (y === height - 1) {
                            if (mountainBlend > 0.3 && this.shouldPlaceSnowBlock(worldX, y, worldZ)) {
                                blockType = 'snow';
                            } else if (this.isSnowHeight(worldX, y, worldZ)) {
                                blockType = 'grass';
                            } else {
                                const choices = [
                                    { item: 'grass', weight: flatlandsBlend + hillsBlend * 0.8 + multiforestBlend + mountainBlend },
                                    { item: 'sand', weight: desertBlend }
                                ];
                                blockType = this.weightedChoice(choices);
                            }
                            topBlockType = blockType;
                        }
                        else {
                            if (this.isSnowHeight(worldX, y, worldZ)) {
                                blockType = 'snowydirt';
                            } else {
                                const choices = [
                                    { item: 'dirt', weight: flatlandsBlend + hillsBlend * 0.8 + multiforestBlend + mountainBlend },
                                    { item: 'sand', weight: desertBlend }
                                ];
                                blockType = this.weightedChoice(choices);
                            }
                        }
                    } 
                    else {
                        const choices = [
                            { item: 'stone', weight: flatlandsBlend + hillsBlend + multiforestBlend + mountainBlend },
                            { item: 'sandstone', weight: desertBlend }
                        ];
                        blockType = this.weightedChoice(choices);
                    }
                    
                    blocks.set(`${x},${y},${z}`, blockType);
                }
                if (topBlockType === 'grass' || topBlockType === 'snow') {
                    const treeNoiseSample = this.treeNoise.noise2D(worldX * 0.1, worldZ * 0.1);
                    const effectiveTreeDensity = biomeData.biome.treeDensity;
                    
                    if (treeNoiseSample > 0.85 - effectiveTreeDensity && !this.isNearVegetation(vegetationPositions, x, z, 4)) {
                        const treeTypeNoiseSample = this.treeTypeNoise.noise2D(worldX * 0.05, worldZ * 0.05);
                        const shouldBeBirch = multiforestBlend > 0.3 && 
                                            treeTypeNoiseSample > 1 - biomeData.biome.birchTreeRatio;
                        
                        treesToGenerate.push({
                            x: x, y: height, z: z, type: shouldBeBirch ? 'birch' : 'oak'
                        });
                        
                        vegetationPositions.add(`${x},${z}`);
                    } 
                    else if (!this.isNearVegetation(vegetationPositions, x, z, 1)) {
                        const grassNoiseSample = this.grassNoise.noise2D(worldX * 0.5, worldZ * 0.5);
                        const effectiveGrassDensity = biomeData.biome.grassDensity;
                        
                        if (grassNoiseSample > 1 - effectiveGrassDensity) {
                            grassToGenerate.push({ x: x, y: height, z: z });
                            vegetationPositions.add(`${x},${z}`);
                        }
                    }
                } 
                else if (topBlockType === 'sand' && desertBlend > 0.6) {
                    const cactusNoiseSample = this.cactusNoise.noise2D(worldX * 0.2, worldZ * 0.2);
                    const effectiveCactusDensity = biomeData.biome.cactusDensity || 0.05;
                    
                    if (cactusNoiseSample > 1 - effectiveCactusDensity && !this.isNearVegetation(vegetationPositions, x, z, 3)) {
                        cactiToGenerate.push({ x: x, y: height, z: z });
                        vegetationPositions.add(`${x},${z}`);
                    }
                }
            }
        }
        if (canSpawnHut) {
            this.generateHut(blocks, hutX, hutZ, hutHeight, vegetationPositions, worldOffsetX, worldOffsetZ);
        }
        if (canSpawnPyramid) {
            this.generatePyramid(blocks, pyramidX, pyramidZ, pyramidHeight, vegetationPositions, worldOffsetX, worldOffsetZ);
        }
    }

    generateHut(blocks, x, z, y, vegetationPositions, chunkOffsetX = 0, chunkOffsetZ = 0) {
        for (let dx = -3; dx <= 7; dx++) {
            for (let dz = -3; dz <= 5; dz++) {
                vegetationPositions.add(`${x + dx},${z + dz}`);
            }
        }
        
        for (let dx = -1; dx <= 7; dx++) {
            for (let dz = -1; dz <= 5; dz++) {
                const blockKey = `${x + dx},${y},${z + dz}_grass_decoration`;
                if (blocks.has(blockKey)) {
                    blocks.delete(blockKey);
                }
            }
        }
        
        const floorMaterial = 'plank';
        for (let dx = 0; dx <= 6; dx++) {
            for (let dz = 0; dz <= 4; dz++) {
                blocks.set(`${x + dx},${y},${z + dz}`, floorMaterial);
            }
        }
        blocks.set(`${x + 3},${y},${z - 1}`, 'oakslab');
        
        const wallMaterial = 'plank';
        for (let dx = 0; dx <= 6; dx++) {
            for (let h = 1; h <= 3; h++) {
                if (dx !== 3 || h > 2) {
                    blocks.set(`${x + dx},${y + h},${z}`, wallMaterial);
                }
                blocks.set(`${x + dx},${y + h},${z + 4}`, wallMaterial);
            }
        }
        
        for (let dz = 1; dz <= 3; dz++) {
            for (let h = 1; h <= 3; h++) {
                if (!((dz === 2 && h === 2))) {
                    blocks.set(`${x},${y + h},${z + dz}`, wallMaterial);
                    blocks.set(`${x + 6},${y + h},${z + dz}`, wallMaterial);
                }
            }
        }
        
        // Add log corners for better structure
        for (let h = 1; h <= 3; h++) {
            blocks.set(`${x},${y + h},${z}`, 'wood');      // Front left corner
            blocks.set(`${x + 6},${y + h},${z}`, 'wood');  // Front right corner
            blocks.set(`${x},${y + h},${z + 4}`, 'wood');  // Back left corner
            blocks.set(`${x + 6},${y + h},${z + 4}`, 'wood'); // Back right corner
        }
        
        const doorMaterial = 'oakdoor';
        blocks.set(`${x + 3},${y + 1},${z}`, doorMaterial);
        blocks.set(`${x + 3},${y + 2},${z}`, doorMaterial);
        
        const worldX = x + 3, worldY = y + 1, worldZ = z;
        this.door.place(worldX, worldY, worldZ, null, 'oak');
        blocks.set(`${x},${y + 2},${z + 2}`, 'glass');
        blocks.set(`${x + 6},${y + 2},${z + 2}`, 'glass');
        
        const roofMaterial = 'plank';
        
        for (let dx = -1; dx <= 7; dx++) {
            for (let dz = -1; dz <= 5; dz++) {
                blocks.set(`${x + dx},${y + 4},${z + dz}`, roofMaterial);
            }
        }
        for (let dx = 0; dx <= 6; dx++) {
            for (let dz = 0; dz <= 4; dz++) {
                blocks.set(`${x + dx},${y + 5},${z + dz}`, roofMaterial);
            }
        }
        for (let dx = 1; dx <= 5; dx++) {
            for (let dz = 1; dz <= 3; dz++) {
                blocks.set(`${x + dx},${y + 6},${z + dz}`, roofMaterial);
            }
        }
        for (let dx = 2; dx <= 4; dx++) {
            blocks.set(`${x + dx},${y + 7},${z + 2}`, roofMaterial);
        }
        blocks.set(`${x + 1},${y + 1},${z + 3}`, 'craftingtable');
        blocks.set(`${x + 5},${y + 1},${z + 3}`, 'furnace');
        
        // Add chest with random items
        blocks.set(`${x + 1},${y + 1},${z + 1}`, 'chest');
        const chestWorldX = x + 1 + chunkOffsetX; 
        const chestWorldY = y + 1; 
        const chestWorldZ = z + 1 + chunkOffsetZ;
        this.initializeChest(chestWorldX, chestWorldY, chestWorldZ, null);
        
        // Populate chest with random items
        const chestKey = `${chestWorldX},${chestWorldY},${chestWorldZ}`;
        const chestData = this.chests.get(chestKey);
        if (chestData) {
            const possibleItems = [
                'plank', 'birchplank', 'stick', 'cobble', 'stone', 'dirt', 
                'wood', 'birchwood', 'sand', 'glass', 'seeds', 'wheat'
            ];
            
            try {
                const customBlocks = JSON.parse(localStorage.getItem('minecraft_custom_blocks') || '[]');
                customBlocks.forEach(block => {
                    possibleItems.push(block.id);
                });
            } catch (error) {
                console.error('Error loading custom blocks for chest:', error);
            }
            
            const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
            for (let i = 0; i < numItems; i++) {
                const randomItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];
                const randomCount = Math.floor(Math.random() * 8) + 1; // 1-8 count
                const emptySlot = chestData.inventory.find(slot => !slot.type);
                if (emptySlot) {
                    emptySlot.type = randomItem;
                    emptySlot.count = randomCount;
                }
            }
        }
    }

    generatePyramid(blocks, x, z, y, vegetationPositions, chunkOffsetX = 0, chunkOffsetZ = 0) {
        // Clear vegetation in a larger area around the pyramid
        for (let dx = -2; dx <= 17; dx++) {
            for (let dz = -2; dz <= 17; dz++) {
                vegetationPositions.add(`${x + dx},${z + dz}`);
            }
        }
        
        // Remove any existing grass decorations
        for (let dx = 0; dx < 15; dx++) {
            for (let dz = 0; dz < 15; dz++) {
                const blockKey = `${x + dx},${y},${z + dz}_grass_decoration`;
                if (blocks.has(blockKey)) {
                    blocks.delete(blockKey);
                }
            }
        }
        
        // Build pyramid layer by layer
        let currentSize = 15;
        let currentHeight = y + 1;
        
        while (currentSize > 0) {
            const offset = Math.floor((15 - currentSize) / 2);
            
            for (let dx = 0; dx < currentSize; dx++) {
                for (let dz = 0; dz < currentSize; dz++) {
                    blocks.set(`${x + offset + dx},${currentHeight},${z + offset + dz}`, 'sandstone');
                }
            }
            
            currentSize -= 2;
            currentHeight++;
        }
        
        // Place chest at the top with 8 random items
        const chestWorldX = x + 7 + chunkOffsetX; 
        const chestWorldY = currentHeight - 1; 
        const chestWorldZ = z + 7 + chunkOffsetZ;
        
        blocks.set(`${x + 7},${currentHeight - 1},${z + 7}`, 'chest');
        this.initializeChest(chestWorldX, chestWorldY, chestWorldZ, null);
        
        // Populate chest with exactly 8 random items
        const chestKey = `${chestWorldX},${chestWorldY},${chestWorldZ}`;
        const chestData = this.chests.get(chestKey);
        if (chestData) {
            const possibleItems = [
                'sandstone', 'sand', 'glass', 'cobble', 'stone', 'wood', 'plank', 
                'stick', 'seeds', 'wheat', 'cacti', 'dirt', 'birchwood', 'birchplank'
            ];
            
            try {
                const customBlocks = JSON.parse(localStorage.getItem('minecraft_custom_blocks') || '[]');
                customBlocks.forEach(block => {
                    possibleItems.push(block.id);
                });
            } catch (error) {
                console.error('Error loading custom blocks for chest:', error);
            }
            
            const numItems = 8; 
            for (let i = 0; i < numItems; i++) {
                const randomItem = possibleItems[Math.floor(Math.random() * possibleItems.length)];
                const randomCount = Math.floor(Math.random() * 16) + 1; 
                const emptySlot = chestData.inventory.find(slot => !slot.type);
                if (emptySlot) {
                    emptySlot.type = randomItem;
                    emptySlot.count = randomCount;
                }
            }
        }
    }

    markChunkDirty(chunkX, chunkZ) {
        const chunkKey = `${chunkX},${chunkZ}`;
        const chunk = this.chunks.get(chunkKey);
        
        if (chunk) {
            chunk.isDirty = true;
            this.dirtyChunks.add(chunkKey);
            
            if (!this.rebuildQueue.some(item => item.chunkKey === chunkKey)) {
                const isVisible = this.visibleChunks.has(chunkKey);
                this.rebuildQueue.push({
                    chunkKey,
                    isVisible,
                    priority: isVisible ? 1 : 0
                });
                
                this.rebuildQueue.sort((a, b) => b.priority - a.priority);
            }
        }
    }

    rebuildChunkMesh(chunk) {
        if (chunk.mesh) {
            if (this.visibleChunks.has(`${chunk.x},${chunk.z}`)) {
                this.scene.remove(chunk.mesh);
            }
            
            if (chunk.mesh.children && chunk.mesh.children.length > 0) {
                chunk.mesh.children.forEach(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }
        }
        
        const worldOffsetX = chunk.x * this.chunkSize;
        const worldOffsetZ = chunk.z * this.chunkSize;
        
        chunk.mesh = this.createMeshFromBlocks(chunk.blocks, worldOffsetX, 0, worldOffsetZ);
        
        if (this.visibleChunks.has(`${chunk.x},${chunk.z}`)) {
            this.scene.add(chunk.mesh);
        }
    }

    processRebuildQueue() {
        if (this.rebuildQueue.length === 0 || this.isProcessingRebuilds) return;
        
        this.isProcessingRebuilds = true;
        let rebuildsThisFrame = 0;
        
        while (rebuildsThisFrame < this.maxRebuildsPerFrame && this.rebuildQueue.length > 0) {
            const { chunkKey } = this.rebuildQueue.shift();
            const chunk = this.chunks.get(chunkKey);
            
            if (chunk && chunk.isDirty) {
                this.rebuildChunkMesh(chunk);
                rebuildsThisFrame++;
                chunk.isDirty = false;
            }
        }
        
        this.isProcessingRebuilds = false;
    }

    connectChunkNeighbors(chunkX, chunkZ) {
        const chunk = this.chunks.get(`${chunkX},${chunkZ}`);
        if (!chunk) return;
        
        const neighbors = [
            { x: 1, z: 0, dir: 'east' },
            { x: -1, z: 0, dir: 'west' },
            { x: 0, z: 1, dir: 'south' },
            { x: 0, z: -1, dir: 'north' },
        ];
        
        for (const neighbor of neighbors) {
            const nx = chunkX + neighbor.x;
            const nz = chunkZ + neighbor.z;
            const neighborKey = `${nx},${nz}`;
            const neighborChunk = this.chunks.get(neighborKey);
            
            if (neighborChunk) {
                chunk.neighbors[neighbor.dir] = neighborChunk;
                const oppositeDir = this.getOppositeDirection(neighbor.dir);
                neighborChunk.neighbors[oppositeDir] = chunk;
            }
        }
    }
    
    getOppositeDirection(direction) {
        switch (direction) {
            case 'east': return 'west';
            case 'west': return 'east';
            case 'north': return 'south';
            case 'south': return 'north';
            default: return direction;
        }
    }

    generateChunk(chunkX, chunkZ) {
        const chunkKey = `${chunkX},${chunkZ}`;
        if (this.chunks.has(chunkKey)) return;

        const blocks = new Map();
        const worldOffsetX = chunkX * this.chunkSize;
        const worldOffsetZ = chunkZ * this.chunkSize;
        
        const treesToGenerate = [];
        const cactiToGenerate = [];
        const vegetationPositions = new Set();
        const grassToGenerate = [];

        let isModified = false;
        let hasExistingData = false;
        
        if (this.worldData && this.worldData.chunks) {
            const savedChunk = this.worldData.chunks[chunkKey];
            if (savedChunk) {
                for (const [blockKey, blockType] of Object.entries(savedChunk)) {
                    blocks.set(blockKey, blockType);
                    hasExistingData = true;
                }
                isModified = true;
            }
        }
        
        const needsNaturalTerrain = !hasExistingData;
        
        if (needsNaturalTerrain) {
            if (this.isSuperflat) {
                generateSuperflat(blocks, this.chunkSize);
            } else {
                this.generateNormalTerrain(blocks, worldOffsetX, worldOffsetZ, treesToGenerate, cactiToGenerate, grassToGenerate, vegetationPositions);
            }
            
            if (!this.isSuperflat) {
                for (const tree of treesToGenerate) {
                    if (tree.type === 'birch') {
                        this.generateBirchTree(blocks, tree.x, tree.y, tree.z);
                    } else {
                        this.generateTree(blocks, tree.x, tree.y, tree.z);
                    }
                }
                
                for (const cactus of cactiToGenerate) {
                    this.generateCactus(blocks, cactus.x, cactus.y, cactus.z);
                }
                
                for (const grass of grassToGenerate) {
                    blocks.set(`${grass.x},${grass.y},${grass.z}_grass_decoration`, 'tall_grass');
                }
            }
        }

        const mesh = this.createMeshFromBlocks(blocks, worldOffsetX, 0, worldOffsetZ);

        this.chunks.set(chunkKey, {
            blocks,
            mesh,
            x: chunkX,
            z: chunkZ,
            isDirty: isModified,
            neighbors: {}
        });
        
        if (isModified) {
            this.dirtyChunks.add(chunkKey);
        }
        
        this.connectChunkNeighbors(chunkX, chunkZ);
    }

    getHeight(x, z) {
        if (this.isSuperflat) {
            return getSuperflatHeight();
        }
        
        const biomeData = this.getBiomeAt(x, z);
        const { hillsBlend, desertBlend, multiforestBlend, mountainBlend, flatlandsBlend } = biomeData;
        
        const totalBlend = hillsBlend + desertBlend + multiforestBlend + mountainBlend + flatlandsBlend;
        const normalizedHillsBlend = hillsBlend / totalBlend;
        const normalizedDesertBlend = desertBlend / totalBlend;
        const normalizedMultiforestBlend = multiforestBlend / totalBlend;
        const normalizedMountainBlend = mountainBlend / totalBlend;
        const normalizedFlatlandsBlend = flatlandsBlend / totalBlend;

        const scale1 = 0.003;
        const scale2 = 0.015;
        const scale3 = 0.05;

        const coherentNoise = (this.noise.noise2D(x * 0.004, z * 0.004) * 0.5 + 0.5);
        const baseNoise = (this.noise.noise2D(x * scale1, z * scale1) * 0.5 + 0.5);
        const connectedBaseNoise = baseNoise * 0.7 + coherentNoise * 0.3;

        const hillsBaseHeight = this.biomes.hills.baseHeight + connectedBaseNoise * this.biomes.hills.heightVariation;
        const hillsNoise = this.noise.noise2D(x * scale2, z * scale2) * 0.5 + 0.5;
        const hillsHilliness = hillsNoise * this.biomes.hills.hilliness;
        const hillsDetails = this.noise.noise2D(x * scale3, z * scale3) * this.biomes.hills.detailScale;
        let hillsHeight = hillsBaseHeight + hillsHilliness + hillsDetails;
        
        if (hillsNoise > this.biomes.hills.plateauThreshold) {
            const plateauSize = 0.8 + this.noise.noise2D(x * 0.08, z * 0.08) * 0.3;
            const plateauStrength = Math.min(1.0, (hillsNoise - this.biomes.hills.plateauThreshold) / 0.15);
            
            const flatHeight = hillsBaseHeight + hillsHilliness;
            hillsHeight = hillsHeight * (1 - plateauStrength * plateauSize) + 
                          flatHeight * plateauStrength * plateauSize;
        }
        
        const mountainBaseHeight = this.biomes.mountains.baseHeight + connectedBaseNoise * this.biomes.mountains.heightVariation;
        const mountainRidgeNoise = (this.noise.noise2D(x * 0.05, z * 0.05) * 0.5 + 0.5);
        const ridgedNoise = 1.0 - Math.abs(this.noise.noise2D(x * 0.03, z * 0.03));
        const poweredRidgedNoise = Math.pow(ridgedNoise, 2) * 3.0;
        const mountainCoherentNoise = (this.noise.noise2D(x * 0.01, z * 0.01) * 0.5 + 0.5) * 10;
        const mountainNoise = this.noise.noise2D(x * scale2 * 0.7, z * scale2 * 0.7) * 0.5 + 0.5;
        const mountainHilliness = (mountainNoise * this.biomes.mountains.hilliness + poweredRidgedNoise * 10);
        const mountainDetails = this.noise.noise2D(x * scale3 * 1.2, z * scale3 * 1.2) * this.biomes.mountains.detailScale;
        const detailsReduction = Math.max(0, mountainBaseHeight - 30) / 20;
        const scaledMountainDetails = mountainDetails * Math.max(0.2, 1 - detailsReduction);
        
        let mountainHeight;
        if (mountainBaseHeight > 40) {
            const coherentFactor = Math.min(1.0, (mountainBaseHeight - 40) / 20);
            mountainHeight = mountainBaseHeight + 
                            (mountainHilliness * (1 - coherentFactor) + mountainCoherentNoise * coherentFactor) + 
                            scaledMountainDetails;
        } else {
            mountainHeight = mountainBaseHeight + mountainHilliness + scaledMountainDetails;
        }
        
        const desertBaseHeight = this.biomes.desert.baseHeight + connectedBaseNoise * this.biomes.desert.heightVariation;
        const desertNoise = this.noise.noise2D(x * scale2, z * scale2) * 0.5 + 0.5;
        const desertHilliness = desertNoise * this.biomes.desert.hilliness;
        const desertDetails = this.noise.noise2D(x * scale3, z * scale3) * this.biomes.desert.detailScale;
        const desertHeight = desertBaseHeight + desertHilliness + desertDetails;
        
        const forestBaseHeight = this.biomes.multiforest.baseHeight + connectedBaseNoise * this.biomes.multiforest.heightVariation;
        const forestNoise = this.noise.noise2D(x * scale2, z * scale2) * 0.5 + 0.5;
        const forestHilliness = forestNoise * this.biomes.multiforest.hilliness;
        const forestDetails = this.noise.noise2D(x * scale3, z * scale3) * this.biomes.multiforest.detailScale;
        const forestHeight = forestBaseHeight + forestHilliness + forestDetails;
        
        const flatlandsBaseHeight = this.biomes.flatlands.baseHeight + connectedBaseNoise * this.biomes.flatlands.heightVariation;
        const flatlandsNoise = this.noise.noise2D(x * scale2, z * scale2) * 0.5 + 0.5;
        const flatlandsHilliness = flatlandsNoise * this.biomes.flatlands.hilliness;
        const flatlandsDetails = this.noise.noise2D(x * scale3, z * scale3) * this.biomes.flatlands.detailScale;
        const flatlandsHeight = flatlandsBaseHeight + flatlandsHilliness + flatlandsDetails;
        
        const smoothHillsBlend = this.smoothStep(normalizedHillsBlend);
        const smoothDesertBlend = this.smoothStep(normalizedDesertBlend);
        const smoothMultiforestBlend = this.smoothStep(normalizedMultiforestBlend);
        const smoothMountainBlend = this.smoothStep(normalizedMountainBlend);
        const smoothFlatlandsBlend = this.smoothStep(normalizedFlatlandsBlend);
        
        let finalHeight = 
            hillsHeight * smoothHillsBlend +
            desertHeight * smoothDesertBlend +
            forestHeight * smoothMultiforestBlend +
            mountainHeight * smoothMountainBlend +
            flatlandsHeight * smoothFlatlandsBlend;
        
        const minHeight = Math.min(
            this.biomes.flatlands.baseHeight - 1,
            this.biomes.desert.baseHeight - 1,
            this.biomes.multiforest.baseHeight - 1
        );
        
        if (finalHeight < minHeight) {
            finalHeight = minHeight;
        }

        return Math.floor(finalHeight);
    }

    isSnowHeight(x, y, z) {
        const biomeData = this.getBiomeAt(x, z);
        const snowVariation = this.snowNoise.noise2D(x * 0.04, z * 0.04) * biomeData.biome.snowVariation;
        
        if (biomeData.mountainBlend > 0.3) {
            const modifiedSnowHeight = this.biomes.mountains.snowHeight + 
                snowVariation - (5 * biomeData.mountainBlend);
            return y >= modifiedSnowHeight;
        }
        
        return y >= (biomeData.biome.snowHeight + snowVariation);
    }

    shouldPlaceSnowBlock(x, y, z) {
        const biomeData = this.getBiomeAt(x, z);
        if (biomeData.mountainBlend < 0.3) return false;
        
        const snowBlockVariation = this.snowBlockNoise.noise2D(x * 0.06, z * 0.06) * 
                                   biomeData.biome.snowBlockVariation;
        const snowPatchNoise = this.snowBlockNoise.noise2D(x * 0.02, z * 0.02);
        
        let heightFactor = 0;
        if (y > biomeData.biome.snowBlockThreshold) {
            heightFactor = Math.min(1.0, (y - biomeData.biome.snowBlockThreshold) / 15);
            heightFactor = heightFactor * heightFactor;
        }
        
        const threshold = 0.5 - (heightFactor * 0.7) - (biomeData.mountainBlend * 0.1);
        const snowPatchFactor = snowPatchNoise * 0.2;
        
        if (y > biomeData.biome.snowBlockThreshold + 20) {
            return true;
        }
        
        return this.snowBlockNoise.noise2D(x * 0.3, z * 0.3) > threshold - snowPatchFactor;
    }

    generateWorld(centerChunkX, centerChunkZ) {
        for (let x = -this.renderDistance; x <= this.renderDistance; x++) {
            for (let z = -this.renderDistance; z <= this.renderDistance; z++) {
                const chunkX = centerChunkX + x;
                const chunkZ = centerChunkZ + z;
                const distSq = x * x + z * z;
                
                if (distSq <= this.renderDistance * this.renderDistance) {
                    this.generateChunk(chunkX, chunkZ);
                }
            }
        }
    }

    updateChunks(playerChunkX, playerChunkZ) {
        const chunksToShow = new Set();
        
        for (let x = -this.renderDistance; x <= this.renderDistance; x++) {
            for (let z = -this.renderDistance; z <= this.renderDistance; z++) {
                const chunkX = playerChunkX + x;
                const chunkZ = playerChunkZ + z;
                const distSq = x * x + z * z;
                
                if (distSq <= this.renderDistance * this.renderDistance) {
                    const chunkKey = `${chunkX},${chunkZ}`;
                    chunksToShow.add(chunkKey);
                    
                    const chunk = this.chunks.get(chunkKey);
                    
                    if (chunk) {
                        if (!this.visibleChunks.has(chunkKey)) {
                            this.visibleChunks.add(chunkKey);
                            if (chunk.mesh) {
                                this.scene.add(chunk.mesh);
                            }
                        }
                    } else {
                        this.generateChunk(chunkX, chunkZ);
                    }
                }
            }
        }
        
        for (const chunkKey of this.visibleChunks) {
            if (!chunksToShow.has(chunkKey)) {
                const chunk = this.chunks.get(chunkKey);
                if (chunk && chunk.mesh) {
                    this.scene.remove(chunk.mesh);
                }
                this.visibleChunks.delete(chunkKey);
            }
        }
    }

    ensureChunkLoaded(chunkX, chunkZ) {
        const chunkKey = `${chunkX},${chunkZ}`;
        if (!this.chunks.has(chunkKey)) {
            this.generateChunk(chunkX, chunkZ);
        }
    }

    raycast(pos, dir) {
        const stepDistance = 0.05;
        const maxDistance = this.worldData?.settings?.isCreative ? 100 : 5;
        const currentPos = new THREE.Vector3(pos.x, pos.y, pos.z);
        const direction = new THREE.Vector3(dir.x, dir.y, dir.z).normalize();
        const step = direction.clone().multiplyScalar(stepDistance);
        
        let stepCount = 0;
        const maxSteps = maxDistance / stepDistance;
        
        let lastNonSolidX = Math.floor(currentPos.x);
        let lastNonSolidY = Math.floor(currentPos.y);
        let lastNonSolidZ = Math.floor(currentPos.z);
        
        let lastPos = currentPos.clone();
        let faceNormal = new THREE.Vector3();
        
        while (stepCount < maxSteps) {
            lastPos.copy(currentPos);
            currentPos.add(step);
            stepCount++;
            
            const blockX = Math.floor(currentPos.x);
            const blockY = Math.floor(currentPos.y);
            const blockZ = Math.floor(currentPos.z);
            
            if (blockX !== lastNonSolidX || blockY !== lastNonSolidY || blockZ !== lastNonSolidZ) {
                const chunkX = Math.floor(blockX / this.chunkSize);
                const chunkZ = Math.floor(blockZ / this.chunkSize);
                const chunkKey = `${chunkX},${chunkZ}`;
                const chunk = this.chunks.get(chunkKey);
                
                const localX = ((blockX % this.chunkSize) + this.chunkSize) % this.chunkSize;
                const localZ = ((blockZ % this.chunkSize) + this.chunkSize) % this.chunkSize;
                
                const grassKey = `${localX},${blockY},${localZ}_grass_decoration`;
                const isGrass = chunk && chunk.blocks.has(grassKey);
                
                const cropKey = `${localX},${blockY},${localZ}_crop`;
                const isCrop = chunk && chunk.blocks.has(cropKey);
                
                if (isGrass || isCrop) {
                    const crossedX = blockX !== lastNonSolidX;
                    const crossedY = blockY !== lastNonSolidY;
                    const crossedZ = blockZ !== lastNonSolidZ;
                    
                    if (crossedX) faceNormal.set(Math.sign(lastNonSolidX - blockX), 0, 0);
                    else if (crossedY) faceNormal.set(0, Math.sign(lastNonSolidY - blockY), 0);
                    else if (crossedZ) faceNormal.set(0, 0, Math.sign(lastNonSolidZ - blockZ));
                    
                    return {
                        position: { x: blockX, y: blockY, z: blockZ },
                        face: { normal: faceNormal }
                    };
                }
                
                const blockType = this.getBlock(blockX, blockY, blockZ);
                const isHighlightableBlock = blockType === 'oakdoor' || blockType === 'birchdoor' || 
                                           blockType === 'glass' || blockType === 'newglass' || blockType === 'leaves' || blockType === 'birchleaves';
                let blockCollision = false;
                
                if (this.isSlab(blockType)) {
                    const localY = currentPos.y - blockY;
                    
                    if (localY <= 0.5) {
                        blockCollision = true;
                    } else if (direction.y < 0) {
                        const topFaceY = blockY + 0.5;
                        const entryPoint = lastPos.clone();
                        const t = (topFaceY - entryPoint.y) / direction.y;
                        
                        if (t >= 0) {
                            const hitX = entryPoint.x + direction.x * t;
                            const hitZ = entryPoint.z + direction.z * t;
                            
                            if (hitX >= blockX && hitX <= blockX + 1 && 
                                hitZ >= blockZ && hitZ <= blockZ + 1) {
                                blockCollision = true;
                                faceNormal.set(0, 1, 0);
                                return {
                                    position: { x: blockX, y: blockY, z: blockZ },
                                    face: { normal: faceNormal },
                                    isSlab: true
                                };
                            }
                        }
                    }
                } else if (this.isBlockSolid(blockX, blockY, blockZ) || isHighlightableBlock) {
                    blockCollision = true;
                }
                
                if (blockCollision) {
                    const crossedX = blockX !== lastNonSolidX;
                    const crossedY = blockY !== lastNonSolidY;
                    const crossedZ = blockZ !== lastNonSolidZ;
                    
                    if (crossedX) faceNormal.set(Math.sign(lastNonSolidX - blockX), 0, 0);
                    else if (crossedY) faceNormal.set(0, Math.sign(lastNonSolidY - blockY), 0);
                    else if (crossedZ) faceNormal.set(0, 0, Math.sign(lastNonSolidZ - blockZ));
                    
                    if (faceNormal.lengthSq() === 0) {
                        const xDist = currentPos.x - blockX;
                        const yDist = currentPos.y - blockY;
                        const zDist = currentPos.z - blockZ;
                        
                        const xDistFromBoundary = Math.min(xDist, 1 - xDist);
                        const yDistFromBoundary = Math.min(yDist, 1 - yDist);
                        const zDistFromBoundary = Math.min(zDist, 1 - zDist);
                        
                        if (xDistFromBoundary <= yDistFromBoundary && xDistFromBoundary <= zDistFromBoundary) {
                            faceNormal.set(xDist < 0.5 ? -1 : 1, 0, 0);
                        } else if (yDistFromBoundary <= xDistFromBoundary && yDistFromBoundary <= zDistFromBoundary) {
                            faceNormal.set(0, yDist < 0.5 ? -1 : 1, 0);
                        } else {
                            faceNormal.set(0, 0, zDist < 0.5 ? -1 : 1);
                        }
                    }
                    
                    return {
                        position: { x: blockX, y: blockY, z: blockZ },
                        face: { normal: faceNormal },
                        isSlab: this.isSlab(blockType)
                    };
                }
                
                lastNonSolidX = blockX;
                lastNonSolidY = blockY;
                lastNonSolidZ = blockZ;
            }
        }
        
        return null;
    }
    
    weightedChoice(choices) {
        const totalWeight = choices.reduce((sum, choice) => sum + choice.weight, 0);
        if (totalWeight <= 0) return null;
        
        let random = Math.random() * totalWeight;
        for (const choice of choices) {
            random -= choice.weight;
            if (random <= 0) return choice.item;
        }
        
        return choices[0].item;
    }

    isPositionColliding(position) {
        const x = Math.floor(position.x);
        const y = Math.floor(position.y);
        const z = Math.floor(position.z);
        
        const blockType = this.getBlock(x, y, z);
        
        if (!blockType) return false;
        
        if (blockType === 'oakdoor' || blockType === 'birchdoor') {
            const isOpen = this.door.isOpen(x, y, z);
            
            if (isOpen) {
                const localX = position.x - x;
                const localZ = position.z - z;
                
                const orientation = this.door.getOrientation(x, y, z);
                
                const doorThickness = this.door.thickness;
                
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
        
        if (this.isSlab(blockType)) {
            const localY = position.y - y;
            
            if (localY > 0.5) {
                return false;
            }
        }
        
        return this.isBlockSolid(x, y, z);
    }

    getVoxelBelow(position) {
        const x = Math.floor(position.x);
        const y = Math.floor(position.y);
        const z = Math.floor(position.z);
        
        return this.isBlockSolid(x, y, z);
    }

    toggleDoor(x, y, z) {
        return this.door.toggle(x, y, z, this);
    }

    updateCrops(deltaTime) {
        if (!this._lastCropUpdate || Date.now() - this._lastCropUpdate > 10000) { 
            this._lastCropUpdate = Date.now();
            
            for (const [cropKey, cropData] of this.crops.entries()) {
                const [x, y, z] = cropKey.split(',').map(Number);
                
                const oldStage = cropData.stage;
                const newStage = this.getCropStage(x, y, z);
                
                if (newStage !== oldStage) {
                    cropData.stage = newStage;
                    
                    const chunkX = Math.floor(x / this.chunkSize);
                    const chunkZ = Math.floor(z / this.chunkSize);
                    this.markChunkDirty(chunkX, chunkZ);
                }
            }
        }
    }
}
