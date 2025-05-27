import * as THREE from 'three';

export class BlockParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.textureLoader = new THREE.TextureLoader();
        this.textures = {};
        this.camera = null;
    }
    
    setCamera(camera) {
        this.camera = camera;
    }
    
    createBlockParticles(blockType, position, count = 12) {
        for (let i = 0; i < count; i++) {
            this.createParticle(blockType, position);
        }
    }
    
    createParticle(blockType, position) {
        const texturePath = this.getTexturePathForBlock(blockType);
        if (!texturePath) return null;
        
        let texture;
        if (this.textures[texturePath]) {
            texture = this.textures[texturePath].clone();
        } else {
            texture = this.textureLoader.load(texturePath);
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
            this.textures[texturePath] = texture.clone();
        }
        
        // Make particles 10% smaller
        const size = (0.1 + Math.random() * 0.15) * 0.9;
        const geometry = new THREE.PlaneGeometry(size, size);
        
        const segmentX = Math.floor(Math.random() * 2) * 0.5;
        const segmentY = Math.floor(Math.random() * 2) * 0.5;
        
        const uvs = geometry.attributes.uv;
        for (let i = 0; i < uvs.count; i++) {
            const u = uvs.getX(i) * 0.5 + segmentX;
            const v = uvs.getY(i) * 0.5 + segmentY;
            uvs.setXY(i, u, v);
        }
        uvs.needsUpdate = true;
        
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.1,
            color: 0xaaaaaa // Slightly darker color tint
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            position.x + 0.5 + (Math.random() - 0.5) * 0.5,
            position.y + 0.5 + (Math.random() - 0.5) * 0.5,
            position.z + 0.5 + (Math.random() - 0.5) * 0.5
        );
        
        mesh.rotation.set(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
        );
        
        const particle = {
            mesh,
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                // Reduced vertical velocity to make particles go less high
                Math.random() * 2.5 + 1.5, 
                (Math.random() - 0.5) * 3
            ),
            gravity: -9.8,
            lifetime: 0,
            maxLifetime: 1.2 + Math.random() * 0.8,
            rotation: new THREE.Vector3(
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8
            )
        };
        
        this.scene.add(mesh);
        this.particles.push(particle);
        
        return particle;
    }
    
    getTexturePathForBlock(blockType) {
        switch(blockType) {
            case 'grass': return '../images/grass_side.png';
            case 'dirt': return '../images/dirt.png';
            case 'stone': return '../images/stone.png';
            case 'smoothstone': return '../images/smoothstone.png';
            case 'cobble': return '../images/cobbles.png';
            case 'wood': return '../images/logside.png';
            case 'birchwood': return '../images/birchlogside.png';
            case 'leaves': return '../images/leaves.png';
            case 'birchleaves': return '../images/birchleaves.png';
            case 'plank': return '../images/plank.png';
            case 'birchplank': return '../images/birchplank.png';
            case 'craftingtable': return '../images/CFSIDE.png';
            case 'oakdoor': return '../images/door.png';
            case 'birchdoor': return '../images/birchdoor.png';
            case 'sand': return '../images/sand.png';
            case 'sandstone': return '../images/sandstone.png';
            case 'cacti': return '../images/cacti.png';
            case 'furnace': return '../images/furnaceside.png';
            case 'glass': return '../images/glass.png';
            case 'snow': return '../images/snow.png';
            case 'chest': return '../images/chestfront.png';
            case 'farmland': return '../images/farmland.png';
            case 'tall_grass': return '../images/grass.png';
            case 'oakslab': return '../images/plank.png';
            case 'birchslab': return '../images/birchplank.png';
            case 'seeds': return '../images/seeds.png';
            case 'haybale': return '../images/haybaletopbottom.png';
            case 'wheat': return '../images/wheat.png';
            default:
                try {
                    const customBlocks = JSON.parse(localStorage.getItem('minecraft_custom_blocks') || '[]');
                    const customBlock = customBlocks.find(block => block.id === blockType);
                    if (customBlock && customBlock.textures) {
                        return customBlock.textures.front || Object.values(customBlock.textures)[0];
                    }
                } catch (error) {
                    console.error('Error getting custom block texture:', error);
                }
                return '../images/dirt.png';
        }
    }
    
    update(delta) {
        if (!this.camera) return;
        
        const cameraPosition = this.camera.position.clone();
        
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            particle.lifetime += delta;
            if (particle.lifetime > particle.maxLifetime) {
                this.scene.remove(particle.mesh);
                particle.mesh.geometry.dispose();
                particle.mesh.material.dispose();
                this.particles.splice(i, 1);
                continue;
            }
            
            particle.velocity.y += particle.gravity * delta;
            
            particle.mesh.position.x += particle.velocity.x * delta;
            particle.mesh.position.y += particle.velocity.y * delta;
            particle.mesh.position.z += particle.velocity.z * delta;
            
            // Make particles face the camera
            const particlePosition = particle.mesh.position.clone();
            const directionToCamera = cameraPosition.sub(particlePosition).normalize();
            particle.mesh.lookAt(cameraPosition);
            
            // Add slight rotation for visual interest
            particle.mesh.rotation.z += particle.rotation.z * delta * 0.2;
            
            const alpha = 1 - (particle.lifetime / particle.maxLifetime);
            particle.mesh.material.opacity = alpha;
        }
    }
}
