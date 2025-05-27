import * as THREE from 'three';

export const dayNightCycle = {
    dayDuration: 15 * 60, // 15 minutes in seconds
    nightDuration: 12 * 60, // 12 minutes in seconds
    get totalDuration() { return this.dayDuration + this.nightDuration; },
    transitionDuration: 120 // 2 minutes sunrise/sunset transition (increased from 60)
};

let stars = [];
let starsGroup;
let moon;
let voxelSun;

export function initDayNightCycle(scene) {
    createStars(scene);
    createMoon(scene);
    createVoxelSun(scene);
    return {
        stars,
        moon,
        voxelSun
    };
}

export function createStars(scene) {
    starsGroup = new THREE.Group();
    scene.add(starsGroup);

    const starMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.6,
        transparent: true,
        opacity: 0,
        sizeAttenuation: false,
        depthWrite: false,
        fog: false // Ensure stars aren't affected by fog
    });

    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = [];

    for (let i = 0; i < 1000; i++) {
        const theta = Math.random() * Math.PI * 2; 
        const phi = Math.random() * Math.PI * 0.5;
        const radius = 500 + Math.random() * 100; 

        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);

        starPositions.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    const starPoints = new THREE.Points(starsGeometry, starMaterial);
    starsGroup.add(starPoints);

    stars.push(starMaterial);
}

export function createMoon(scene) {
    const moonGeometry = new THREE.SphereGeometry(15, 16, 16);
    const moonMaterial = new THREE.MeshBasicMaterial({
        color: 0xdddddd, 
        opacity: 0,
        transparent: true,
        fog: false // Ensure moon isn't affected by fog
    });

    moon = new THREE.Mesh(moonGeometry, moonMaterial);
    scene.add(moon);
}

export function createVoxelSun(scene) {
    voxelSun = new THREE.Group();

    const sunMaterial = new THREE.MeshLambertMaterial({ 
        color: 0xFFFFFF, 
        emissive: 0xFFFFEE,
        emissiveIntensity: 1.0,
        fog: false // Ensure sun isn't affected by fog
    });

    const blockGeometry = new THREE.BoxGeometry(16, 16, 16);

    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            const block = new THREE.Mesh(blockGeometry, sunMaterial);
            block.position.set(x * 16, y * 16, 0);
            
            block.castShadow = false;
            block.receiveShadow = false;
            
            voxelSun.add(block);
        }
    }

    voxelSun.position.set(0, 200, -300);

    scene.add(voxelSun);
    
    return voxelSun;
}

export function updateStarsPosition(camera) {
    if (!starsGroup || !camera) return;
    
    const playerPos = camera.position.clone();
    starsGroup.position.x = playerPos.x;
    starsGroup.position.z = playerPos.z;
}

export function updateSunPosition(camera) {
    if (!voxelSun || !camera) return;

    const playerPos = camera.position.clone();
    voxelSun.position.x = playerPos.x;
    voxelSun.position.z = playerPos.z - 300;
}

export function updateShadowPosition(camera, directionalLight, sunTarget) {
    if (!directionalLight || !camera || !sunTarget) return;

    const pos = camera.position.clone();

    sunTarget.position.set(pos.x, 0, pos.z);
    sunTarget.updateMatrixWorld();
}

function smoothTransition(t) {
    // Smooth step function for more natural transitions
    return t * t * (3 - 2 * t);
}

export function updateDayNightCycle(deltaTime, gameTime, scene, camera, directionalLight, sunTarget, ambientLight, hemisphereLight, backLight) {
    gameTime += deltaTime;
    
    const cycleTime = gameTime % dayNightCycle.totalDuration;
    const timeOfDay = cycleTime / dayNightCycle.totalDuration; // 0 to 1
    
    const isDay = cycleTime < dayNightCycle.dayDuration;
    const isNight = !isDay;
    
    const sunriseStart = dayNightCycle.nightDuration - dayNightCycle.transitionDuration / 2;
    const sunriseEnd = dayNightCycle.nightDuration + dayNightCycle.transitionDuration / 2;
    const sunsetStart = dayNightCycle.dayDuration - dayNightCycle.transitionDuration / 2;
    const sunsetEnd = dayNightCycle.dayDuration + dayNightCycle.transitionDuration / 2;
    
    let transitionFactor = 0;
    
    if (cycleTime > sunriseStart && cycleTime < sunriseEnd) {
        const rawFactor = (cycleTime - sunriseStart) / dayNightCycle.transitionDuration;
        transitionFactor = smoothTransition(rawFactor);
    } else if (cycleTime > sunsetStart && cycleTime < sunsetEnd) {
        const rawFactor = 1 - (cycleTime - sunsetStart) / dayNightCycle.transitionDuration;
        transitionFactor = smoothTransition(rawFactor);
    } else if (isDay) {
        transitionFactor = 1;
    } else {
        transitionFactor = 0;
    }
    
    const dayColor = new THREE.Color(0x9edfff);
    const nightColor = new THREE.Color(0x000010);
    const skyColor = nightColor.clone().lerp(dayColor, transitionFactor);
    
    scene.background = skyColor;
    
    if (scene.fog) {
        // Create darker fog for night
        const dayFogColor = new THREE.Color(0xC8D8EE);
        const nightFogColor = new THREE.Color(0x050510); // Much darker fog at night
        const fogColor = nightFogColor.clone().lerp(dayFogColor, transitionFactor);
        
        scene.fog.color = fogColor;
        
        // Adjust fog density based on time of day
        if (scene.fog.isFog) {
            // Linear fog - adjust near/far
            const nightFarMultiplier = 0.6; // Reduce visibility at night
            const farAdjustment = 1 - (1-transitionFactor) * (1-nightFarMultiplier);
            
            scene.fog.far = scene.fog._baseFar * farAdjustment;
        } else {
            // Exponential fog - adjust density
            const nightDensityMultiplier = 2.0; // Increase density at night
            const densityAdjustment = 1 + (1-transitionFactor) * (nightDensityMultiplier-1);
            
            scene.fog.density = scene.fog._baseDensity * densityAdjustment;
        }
    }
    
    // Improved light intensity transitions - made nighttime slightly brighter
    directionalLight.intensity = Math.max(0.06, 0.1 + transitionFactor * 0.9); // Increased from 0.02 to 0.06
    
    // Adjust shadow settings based on time of day
    if (directionalLight.shadow) {
        if (isNight || transitionFactor < 0.3) {
            // Night shadow settings - softer, less harsh shadows
            directionalLight.shadow.bias = -0.00025;
            directionalLight.shadow.normalBias = 0.05;
            directionalLight.shadow.radius = 1.5;
        } else {
            // Day shadow settings - more defined shadows
            directionalLight.shadow.bias = -0.0005;
            directionalLight.shadow.normalBias = 0.03;
            directionalLight.shadow.radius = 1;
        }
    }
    
    // Adjust ambient lighting for night - made slightly brighter
    ambientLight.intensity = 0.12 + transitionFactor * 0.23; // Increased from 0.08 to 0.12
    hemisphereLight.intensity = 0.08 + transitionFactor * 0.32; // Increased from 0.05 to 0.08
    
    // Make backlight dimmer at night - made slightly brighter
    if (backLight) {
        backLight.intensity = 0.12 + transitionFactor * 0.18; // Increased from 0.08 to 0.12
    }
    
    stars.forEach(starMaterial => {
        starMaterial.opacity = Math.max(0, 0.8 - transitionFactor * 0.8);
    });
    
    if (moon) {
        const moonAngle = (timeOfDay * Math.PI * 2) + Math.PI;
        const moonRadius = 400; 
        const moonX = camera.position.x + Math.cos(moonAngle) * moonRadius;
        const moonY = 100 * Math.sin(moonAngle);
        const moonZ = camera.position.z + Math.sin(moonAngle) * moonRadius;
        
        moon.position.set(moonX, Math.max(10, moonY), moonZ);
        
        moon.material.opacity = Math.max(0, 0.7 - transitionFactor * 0.7);
    }
    
    if (voxelSun) {
        const sunAngle = timeOfDay * Math.PI * 2;
        const sunHeight = Math.sin(sunAngle) * 200;
        const sunDist = 600; 
        
        voxelSun.position.x = camera.position.x;
        voxelSun.position.y = Math.max(10, sunHeight);
        voxelSun.position.z = camera.position.z - sunDist;
        
        const sunMaterial = voxelSun.children[0].material;
        
        if (cycleTime > dayNightCycle.nightDuration - 200 && cycleTime < dayNightCycle.nightDuration + 200) {
            sunMaterial.color.setHex(0xffaa55);
            sunMaterial.emissive.setHex(0xff8844);
        } else if (cycleTime > dayNightCycle.dayDuration - 200 && cycleTime < dayNightCycle.dayDuration + 200) {
            sunMaterial.color.setHex(0xffaa55);
            sunMaterial.emissive.setHex(0xff8844);
        } else if (isDay) {
            sunMaterial.color.setHex(0xffffff);
            sunMaterial.emissive.setHex(0xffffee);
        }
        
        voxelSun.visible = (sunHeight > -20);
    }
    
    const sunAngle = timeOfDay * Math.PI * 2;
    const sunRadius = 400; 
    const sunX = camera.position.x + Math.cos(sunAngle) * sunRadius;
    const sunY = 100 * Math.sin(sunAngle);
    const sunZ = camera.position.z + Math.sin(sunAngle) * sunRadius;
    
    directionalLight.position.set(sunX, Math.max(10, sunY), sunZ);

    if (backLight) {
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        backLight.position.set(
            camera.position.x - direction.x * 50,
            camera.position.y + 30,
            camera.position.z - direction.z * 50
        );
    }
    
    return gameTime;
}
