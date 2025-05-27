import * as THREE from 'three';
import { calculateBreakTime, getBlockCategory, BLOCK_CATEGORIES } from './pickaxes.js';

export class BlockBreaker {
    constructor(player, voxelWorld) {
        this.player = player;
        this.voxelWorld = voxelWorld;
        
        this.blockBreakProgress = 0;
        this.blockBreakTimer = 0;
        this.lastBreakPosition = null;
        
        // Create the break progress UI if it doesn't exist
        this.initializeBreakProgressUI();
    }
    
    initializeBreakProgressUI() {
        if (!document.getElementById('break-progress')) {
            const gameContainer = document.getElementById('game-container');
            const breakProgressBar = document.createElement('div');
            breakProgressBar.id = 'break-progress';
            breakProgressBar.className = 'break-progress';
            gameContainer.appendChild(breakProgressBar);
        }
    }
    
    startBreakingBlock(targetBlock, isCreative) {
        if (!targetBlock) return;
        
        const { x, y, z } = targetBlock.position;
        this.lastBreakPosition = { x, y, z };
        
        const blockType = this.voxelWorld.getBlock(x, y, z);
        if (!blockType) return;
        
        // Prevent bedrock from being broken
        if (blockType === 'bedrock') {
            this.cancelBlockBreaking();
            return;
        }
        
        this.blockBreakProgress = 0;
        this.blockBreakTimer = this.getBlockBreakTime(blockType, isCreative);
    }
    
    cancelBlockBreaking() {
        this.blockBreakProgress = 0;
        this.lastBreakPosition = null;
        
        const progressBar = document.getElementById('break-progress');
        if (progressBar) {
            progressBar.style.display = 'none';
            progressBar.className = 'break-progress';
        }
    }
    
    continueBreakingBlock(deltaTime, targetBlock, camera, isCreative) {
        if (!this.lastBreakPosition || !targetBlock) {
            this.cancelBlockBreaking();
            return null;
        }
        
        const { x, y, z } = targetBlock.position;
        if (x !== this.lastBreakPosition.x || 
            y !== this.lastBreakPosition.y || 
            z !== this.lastBreakPosition.z) {
            this.cancelBlockBreaking();
            return null;
        }
        
        this.blockBreakProgress += deltaTime / this.blockBreakTimer;
        
        if (this.blockBreakProgress >= 1) {
            const { x, y, z } = targetBlock.position;
            const blockType = this.voxelWorld.getBlock(x, y, z);
            
            // Check for special block types that don't drop items
            if (blockType && 
                (blockType === 'glass' || blockType === 'newglass' || 
                 blockType === 'leaves' || blockType === 'birchleaves')) {
                this.voxelWorld.breakBlock(x, y, z);
                this.cancelBlockBreaking();
                return null;
            }
            
            // Check if block is rock type and requires pickaxe
            const selectedItem = this.player.inventory.getSelectedItem();
            const toolType = selectedItem && selectedItem.type;
            const category = getBlockCategory(blockType);
            
            if (category === 'rock' && toolType !== 'woodpickaxe' && toolType !== 'stonepickaxe') {
                this.voxelWorld.breakBlock(x, y, z);
                this.cancelBlockBreaking();
                return null;
            }
            
            const brokenBlockType = this.voxelWorld.breakBlock(x, y, z);
            this.cancelBlockBreaking();
            return brokenBlockType;
        }
        
        const progressBar = document.getElementById('break-progress');
        if (progressBar) {
            progressBar.style.display = 'block';
            
            const elapsedTime = (this.blockBreakProgress * this.blockBreakTimer).toFixed(1);
            const totalTime = this.blockBreakTimer.toFixed(1);
            
            progressBar.innerHTML = `<span class="break-time">${elapsedTime}s/${totalTime}s</span>`;
            
            if (targetBlock) {
                const worldPos = new THREE.Vector3(
                    targetBlock.position.x + 0.5,
                    targetBlock.position.y + 0.5,
                    targetBlock.position.z + 0.5
                );
                
                const screenPos = worldPos.project(camera);
                progressBar.style.left = `${(screenPos.x + 1) * 50}%`;
                progressBar.style.top = `${(-screenPos.y + 1) * 50}%`;
            }
        }
        
        return null;
    }
    
    getBlockBreakTime(blockType, isCreative) {
        if (isCreative) return 0;
        
        const selectedItem = this.player.inventory.getSelectedItem();
        const toolType = selectedItem && selectedItem.type;
        
        return calculateBreakTime(blockType, toolType);
    }
    
    isBreakingBlock() {
        return this.lastBreakPosition !== null;
    }
    
    getProgress() {
        return this.blockBreakProgress;
    }
}
