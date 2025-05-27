import * as THREE from 'three';

export class Door {
    constructor() {
        this.doorStates = new Map();
        this.doorOrientations = new Map();
        this.doorTypes = new Map();
        this.thickness = 0.2;
    }

    createDoorGeometry(geometry, x, y, z, isOpen, isLowerHalf) {
        const thickness = this.thickness;
        const doorHeight = 1.0;
        const doorWidth = 1.0;
        
        const cx = x + 0.5;
        const cy = y + 0.5;
        const cz = z + 0.5;
        
        const worldKey = `${x},${y},${z}`;
        const orientation = this.doorOrientations.get(worldKey) || 0;
        const doorType = this.doorTypes.get(worldKey) || 'oak';
        
        const isActuallyLowerHalf = !isLowerHalf;

        let vertices = [];
        
        if (isOpen) {
            let nx, nz;
            
            switch(orientation) {
                case 0:
                    nx = -1;
                    nz = 0;
                    break;
                case 1:
                    nx = 0;
                    nz = -1;
                    break;
                case 2:
                    nx = 1;
                    nz = 0;
                    break;
                case 3:
                    nx = 0;
                    nz = 1;
                    break;
            }
            
            const targetX = x + 0.5 + nx * 0.5;
            const targetZ = z + 0.5 + nz * 0.5;
            
            const v1 = [targetX - doorWidth/2 * Math.abs(nz), cy - doorHeight/2, targetZ - doorWidth/2 * Math.abs(nx)];
            const v2 = [targetX + doorWidth/2 * Math.abs(nz), cy - doorHeight/2, targetZ + doorWidth/2 * Math.abs(nx)];
            const v3 = [targetX + doorWidth/2 * Math.abs(nz), cy + doorHeight/2, targetZ + doorWidth/2 * Math.abs(nx)];
            const v4 = [targetX - doorWidth/2 * Math.abs(nz), cy + doorHeight/2, targetZ - doorWidth/2 * Math.abs(nx)];
            
            const v5 = [targetX - doorWidth/2 * Math.abs(nz) - thickness * nx, cy - doorHeight/2, targetZ - doorWidth/2 * Math.abs(nx) - thickness * nz];
            const v6 = [targetX + doorWidth/2 * Math.abs(nz) - thickness * nx, cy - doorHeight/2, targetZ + doorWidth/2 * Math.abs(nx) - thickness * nz];
            const v7 = [targetX + doorWidth/2 * Math.abs(nz) - thickness * nx, cy + doorHeight/2, targetZ + doorWidth/2 * Math.abs(nx) - thickness * nz];
            const v8 = [targetX - doorWidth/2 * Math.abs(nz) - thickness * nx, cy + doorHeight/2, targetZ - doorWidth/2 * Math.abs(nx) - thickness * nz];
            
            vertices = [
                v1, v2, v3, v4,
                v5, v6, v7, v8,
                v4, v3, v7, v8,
                v1, v2, v6, v5,
                v2, v3, v7, v6,
                v1, v4, v8, v5
            ];
        } else {
            let doorX, doorZ, doorNormalX, doorNormalZ;
            
            switch(orientation) {
                case 0:
                    doorX = cx;
                    doorZ = cz + 0.4;
                    doorNormalX = 0;
                    doorNormalZ = 1;
                    break;
                case 1:
                    doorX = cx - 0.4;
                    doorZ = cz;
                    doorNormalX = -1;
                    doorNormalZ = 0;
                    break;
                case 2:
                    doorX = cx;
                    doorZ = cz - 0.4;
                    doorNormalX = 0;
                    doorNormalZ = -1;
                    break;
                case 3:
                    doorX = cx + 0.4;
                    doorZ = cz;
                    doorNormalX = 1;
                    doorNormalZ = 0;
                    break;
            }
            
            vertices = [
                [doorX - doorWidth/2 * doorNormalZ, cy - doorHeight/2, doorZ - doorWidth/2 * doorNormalX],
                [doorX + doorWidth/2 * doorNormalZ, cy - doorHeight/2, doorZ + doorWidth/2 * doorNormalX],
                [doorX + doorWidth/2 * doorNormalZ, cy + doorHeight/2, doorZ + doorWidth/2 * doorNormalX],
                [doorX - doorWidth/2 * doorNormalZ, cy + doorHeight/2, doorZ - doorWidth/2 * doorNormalX],
                
                [doorX - doorWidth/2 * doorNormalZ + thickness * doorNormalX, cy - doorHeight/2, doorZ - doorWidth/2 * doorNormalX + thickness * doorNormalZ],
                [doorX + doorWidth/2 * doorNormalZ + thickness * doorNormalX, cy - doorHeight/2, doorZ + doorWidth/2 * doorNormalX + thickness * doorNormalZ],
                [doorX + doorWidth/2 * doorNormalZ + thickness * doorNormalX, cy + doorHeight/2, doorZ + doorWidth/2 * doorNormalX + thickness * doorNormalZ],
                [doorX - doorWidth/2 * doorNormalZ + thickness * doorNormalX, cy + doorHeight/2, doorZ - doorWidth/2 * doorNormalX + thickness * doorNormalZ],
                
                [doorX - doorWidth/2 * doorNormalZ, cy + doorHeight/2, doorZ - doorWidth/2 * doorNormalX],
                [doorX + doorWidth/2 * doorNormalZ, cy + doorHeight/2, doorZ + doorWidth/2 * doorNormalX],
                [doorX + doorWidth/2 * doorNormalZ + thickness * doorNormalX, cy + doorHeight/2, doorZ + doorWidth/2 * doorNormalX + thickness * doorNormalZ],
                [doorX - doorWidth/2 * doorNormalZ + thickness * doorNormalX, cy + doorHeight/2, doorZ - doorWidth/2 * doorNormalX + thickness * doorNormalZ],
                
                [doorX - doorWidth/2 * doorNormalZ, cy - doorHeight/2, doorZ - doorWidth/2 * doorNormalX],
                [doorX + doorWidth/2 * doorNormalZ, cy - doorHeight/2, doorZ + doorWidth/2 * doorNormalX],
                [doorX + doorWidth/2 * doorNormalZ + thickness * doorNormalX, cy - doorHeight/2, doorZ + doorWidth/2 * doorNormalX + thickness * doorNormalZ],
                [doorX - doorWidth/2 * doorNormalZ + thickness * doorNormalX, cy - doorHeight/2, doorZ - doorWidth/2 * doorNormalX + thickness * doorNormalZ],
                
                [doorX + doorWidth/2 * doorNormalZ, cy - doorHeight/2, doorZ + doorWidth/2 * doorNormalX],
                [doorX + doorWidth/2 * doorNormalZ + thickness * doorNormalX, cy - doorHeight/2, doorZ + doorWidth/2 * doorNormalX + thickness * doorNormalZ],
                [doorX + doorWidth/2 * doorNormalZ + thickness * doorNormalX, cy + doorHeight/2, doorZ + doorWidth/2 * doorNormalX + thickness * doorNormalZ],
                [doorX + doorWidth/2 * doorNormalZ, cy + doorHeight/2, doorZ + doorWidth/2 * doorNormalX],
                
                [doorX - doorWidth/2 * doorNormalZ, cy - doorHeight/2, doorZ - doorWidth/2 * doorNormalX],
                [doorX - doorWidth/2 * doorNormalZ + thickness * doorNormalX, cy - doorHeight/2, doorZ - doorWidth/2 * doorNormalX + thickness * doorNormalZ],
                [doorX - doorWidth/2 * doorNormalZ + thickness * doorNormalX, cy + doorHeight/2, doorZ - doorWidth/2 * doorNormalX + thickness * doorNormalZ],
                [doorX - doorWidth/2 * doorNormalZ, cy + doorHeight/2, doorZ - doorWidth/2 * doorNormalX]
            ];
        }
        
        const normals = [
            [0, 0, -1], 
            [0, 0, 1],  
            [0, 1, 0],  
            [0, -1, 0], 
            [1, 0, 0],  
            [-1, 0, 0]  
        ];
        
        const baseIndices = [
            [0, 1, 2, 0, 2, 3],     
            [4, 5, 6, 4, 6, 7],     
            [8, 9, 10, 8, 10, 11],   
            [12, 13, 14, 12, 14, 15], 
            [16, 17, 18, 16, 18, 19], 
            [20, 21, 22, 20, 22, 23]  
        ];
        
        const materialKey = doorType === 'birch' ? 'birchdoor' : 'oakdoor';
        const sideMaterialKey = doorType === 'birch' ? 'birchdoorSide' : 'oakdoorSide';
        
        for (let face = 0; face < 6; face++) {
            const faceVertices = vertices.slice(face * 4, (face + 1) * 4);
            const faceNormal = normals[face];
            
            for (const vertex of faceVertices) {
                geometry.vertices.push(vertex[0], vertex[1], vertex[2]);
            }
            
            for (let n = 0; n < 4; n++) {
                geometry.normals.push(faceNormal[0], faceNormal[1], faceNormal[2]);
            }
            
            if (face === 0 || face === 1) {
                const faceUVs = isActuallyLowerHalf ? 
                    [0, 0.5, 1, 0.5, 1, 1, 0, 1] : 
                    [0, 0, 1, 0, 1, 0.5, 0, 0.5];
                geometry.uvs.push(...faceUVs);
            } else {
                geometry.uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
            }
            
            for (const index of baseIndices[face]) {
                geometry.indices.push(index - (face * 4) + geometry.vertexIndex);
            }
            
            geometry.vertexIndex += 4;
        }
    }

    toggle(x, y, z, voxelWorld) {
        const worldKey = `${x},${y},${z}`;
        const currentState = this.doorStates.get(worldKey) || false;
        
        let bottomX = x;
        let bottomY = y;
        let bottomZ = z;
        
        const blockBelow = voxelWorld.getBlock(x, y-1, z);
        const blockAbove = voxelWorld.getBlock(x, y+1, z);
        
        if (blockBelow === 'oakdoor' || blockBelow === 'birchdoor') {
            bottomY = y-1;
        } else if (blockAbove === 'oakdoor' || blockAbove === 'birchdoor') {
        } else {
            return false;
        }
        
        const bottomWorldKey = `${bottomX},${bottomY},${bottomZ}`;
        this.doorStates.set(bottomWorldKey, !currentState);
        
        const topWorldKey = `${bottomX},${bottomY+1},${bottomZ}`;
        this.doorStates.set(topWorldKey, !currentState);
        
        const chunkX = Math.floor(x / voxelWorld.chunkSize);
        const chunkZ = Math.floor(z / voxelWorld.chunkSize);
        voxelWorld.markChunkDirty(chunkX, chunkZ);
        
        return true;
    }

    place(x, y, z, playerPosition, doorType = 'oak') {
        const worldKey = `${x},${y},${z}`;
        const topWorldKey = `${x},${y+1},${z}`;

        this.doorTypes.set(worldKey, doorType);
        this.doorTypes.set(topWorldKey, doorType);

        if (playerPosition) {
            const doorToPlayer = new THREE.Vector2(
                playerPosition.x - (x + 0.5),
                playerPosition.z - (z + 0.5)
            );
            
            doorToPlayer.normalize();
            
            const angle = Math.atan2(doorToPlayer.y, doorToPlayer.x);
            
            let orientation;
            if (angle >= -Math.PI/4 && angle < Math.PI/4) {
                orientation = 3;
            } else if (angle >= Math.PI/4 && angle < 3*Math.PI/4) {
                orientation = 0;
            } else if (angle >= 3*Math.PI/4 || angle < -3*Math.PI/4) {
                orientation = 1;
            } else {
                orientation = 2;
            }
            
            this.doorOrientations.set(worldKey, orientation);
            this.doorOrientations.set(topWorldKey, orientation);
        } else {
            this.doorOrientations.set(worldKey, 0);
            this.doorOrientations.set(topWorldKey, 0);
        }
        
        this.doorStates.set(worldKey, false);
        this.doorStates.set(topWorldKey, false);
    }

    remove(x, y, z) {
        const worldKey = `${x},${y},${z}`;
        this.doorStates.delete(worldKey);
        this.doorOrientations.delete(worldKey);
        this.doorTypes.delete(worldKey);
    }

    isOpen(x, y, z) {
        const worldKey = `${x},${y},${z}`;
        return this.doorStates.get(worldKey) || false;
    }

    getOrientation(x, y, z) {
        const worldKey = `${x},${y},${z}`;
        return this.doorOrientations.get(worldKey) || 0;
    }

    getDoorType(x, y, z) {
        const worldKey = `${x},${y},${z}`;
        return this.doorTypes.get(worldKey) || 'oak';
    }

    isSolid(x, y, z) {
        const worldKey = `${x},${y},${z}`;
        const isOpen = this.doorStates.get(worldKey) || false;
        return !isOpen;
    }
}
