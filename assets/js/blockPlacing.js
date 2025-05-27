import * as THREE from 'three';

export class BlockPlacer {
    constructor(voxelWorld, inventory) {
        this.voxelWorld = voxelWorld;
        this.inventory = inventory;
    }
    
    attemptPlaceBlock(targetBlock, playerPosition, isCreative) {
        if (!targetBlock) return false;
        
        const { x, y, z } = targetBlock.position;
        const targetBlockType = this.voxelWorld.getBlock(x, y, z);
        
        const selectedSlot = this.inventory.getSelectedItem();
        
        // Prevent wheat from being placed
        if (selectedSlot.type === 'wheat') return false;
        
        // Handle seeds planting on farmland
        if (selectedSlot.type === 'seeds' && targetBlockType === 'farmland') {
            return this.plantSeeds(x, y, z, isCreative);
        }
        
        if (selectedSlot.type === 'woodhoe' && this.canTillBlock(targetBlockType)) {
            return this.tillBlock(x, y, z, targetBlockType);
        }
        
        if (this.handleSpecialBlockInteraction(targetBlockType, x, y, z)) {
            return true;
        }
        
        if (!selectedSlot.type || selectedSlot.count <= 0) {
            return false;
        }
        
        if (this.isTool(selectedSlot.type)) {
            return false;
        }
        
        const { normal } = targetBlock.face;
        const placeX = x + normal.x;
        const placeY = y + normal.y;
        const placeZ = z + normal.z;
        
        // Check if there's already a block at the placement position
        const existingBlock = this.voxelWorld.getBlock(placeX, placeY, placeZ);
        if (existingBlock) {
            return false; // Cannot place block where another block already exists
        }
        
        if (this.wouldCollideWithPlayer(placeX, placeY, placeZ, playerPosition)) {
            return false;
        }
        
        let blockType;
        if (!isCreative) {
            blockType = this.inventory.removeSelectedItem();
        } else {
            blockType = selectedSlot.type;
        }
        
        if (blockType) {
            this.voxelWorld.placeBlock(placeX, placeY, placeZ, blockType, playerPosition);
            
            if (!isCreative) {
                this.inventory.saveInventory();
            }
            
            return true;
        }
        
        return false;
    }
    
    plantSeeds(x, y, z, isCreative) {
        // Check if there's already something planted or a block above
        const blockAbove = this.voxelWorld.getBlock(x, y + 1, z);
        if (blockAbove) {
            return false;
        }
        
        // Place a "crop" decoration on top of the farmland
        const chunkX = Math.floor(x / this.voxelWorld.chunkSize);
        const chunkZ = Math.floor(z / this.voxelWorld.chunkSize);
        const localX = ((x % this.voxelWorld.chunkSize) + this.voxelWorld.chunkSize) % this.voxelWorld.chunkSize;
        const localZ = ((z % this.voxelWorld.chunkSize) + this.voxelWorld.chunkSize) % this.voxelWorld.chunkSize;
        const chunkKey = `${chunkX},${chunkZ}`;
        
        const chunk = this.voxelWorld.chunks.get(chunkKey);
        if (!chunk) return false;
        
        const cropKey = `${localX},${y+1},${localZ}_crop`;
        
        // Don't plant if there's already a crop there
        if (chunk.blocks.has(cropKey)) {
            return false;
        }
        
        // Set up the crop
        chunk.blocks.set(cropKey, 'crop');
        this.voxelWorld.markChunkDirty(chunkX, chunkZ);
        
        // Initialize the crop in the world's crop system with current time
        this.voxelWorld.plantCrop(x, y+1, z);
        
        // If not in creative mode, consume a seed
        if (!isCreative) {
            this.inventory.removeSelectedItem();
            this.inventory.saveInventory();
        }
        
        return true;
    }
    
    canTillBlock(blockType) {
        return blockType === 'dirt' || blockType === 'grass' || blockType === 'farmland';
    }
    
    tillBlock(x, y, z, currentBlockType) {
        const blockAbove = this.voxelWorld.getBlock(x, y + 1, z);
        if (blockAbove) {
            return false;
        }
        
        if (currentBlockType === 'farmland') {
            this.voxelWorld.placeBlock(x, y, z, 'dirt');
        } else {
            this.voxelWorld.placeBlock(x, y, z, 'farmland');
        }
        
        return true;
    }
    
    handleSpecialBlockInteraction(blockType, x, y, z) {
        if (blockType === 'oakdoor' || blockType === 'birchdoor') {
            this.voxelWorld.toggleDoor(x, y, z);
            return true;
        }
        
        if (blockType === 'craftingtable') {
            this.inventory.openCraftingTable();
            return true;
        }
        
        if (blockType === 'furnace') {
            this.inventory.openFurnace();
            return true;
        }
        
        if (blockType === 'chest') {
            const chestData = this.voxelWorld.getChestData(x, y, z);
            if (chestData) {
                this.inventory.openChest(chestData);
                return true;
            }
        }
        
        return false;
    }
    
    wouldCollideWithPlayer(placeX, placeY, placeZ, playerPosition) {
        if (!playerPosition) return false;
        
        const playerWidth = 0.6;
        const playerHeight = 1.8;
        
        const playerBounds = {
            minX: playerPosition.x - playerWidth / 2,
            maxX: playerPosition.x + playerWidth / 2,
            minY: playerPosition.y - playerHeight / 2,
            maxY: playerPosition.y + playerHeight / 2,
            minZ: playerPosition.z - playerWidth / 2,
            maxZ: playerPosition.z + playerWidth / 2
        };
        
        const blockBounds = {
            minX: placeX,
            maxX: placeX + 1,
            minY: placeY, 
            maxY: placeY + 1,
            minZ: placeZ,
            maxZ: placeZ + 1
        };
        
        return !(
            playerBounds.maxX <= blockBounds.minX ||
            playerBounds.minX >= blockBounds.maxX ||
            playerBounds.maxY <= blockBounds.minY ||
            playerBounds.minY >= blockBounds.maxY ||
            playerBounds.maxZ <= blockBounds.minZ ||
            playerBounds.minZ >= blockBounds.maxZ
        );
    }
    
    isTool(itemType) {
        return itemType === 'woodpickaxe' || 
               itemType === 'stonepickaxe' || 
               itemType === 'woodhoe' ||
               itemType === 'stick' ||
               itemType === 'seeds';
    }
}
