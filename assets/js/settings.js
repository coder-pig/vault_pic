import * as THREE from 'three';

export const gameSettings = {
    renderDistance: 4,
    maxRenderDistance: 24,
    minRenderDistance: 1,
    shadows: true,
    fog: true,
    fov: 90,
    cameraSensitivity: 100,
    chunkUpdateRate: 1,
    colorVibrancy: true,
    keybindings: {
        forward: 'KeyW',
        backward: 'KeyS',
        left: 'KeyA',
        right: 'KeyD',
        jump: 'Space',
        sprint: 'ShiftLeft',
        inventory: 'KeyE'
    }
};

export const fogSettings = {
    fogType: 'linear',
    fogColor: 0xD8E8FF,
    linearFogNear: 38,
    linearFogFar: 140,
    expFogDensity: 0.0044,
    fogHeightFalloff: true,
    skyHeightCutoff: 45 
};

export const volumeSettings = {
    master: 100,
    music: 100,
    sound: 100
};

export function loadGameSettings() {
    try {
        const savedSettings = JSON.parse(localStorage.getItem('minecraft_settings') || '{}');

        if (savedSettings.renderDistance) {
            gameSettings.renderDistance = Math.max(
                gameSettings.minRenderDistance, 
                Math.min(savedSettings.renderDistance, gameSettings.maxRenderDistance)
            );
        }

        if (savedSettings.shadows !== undefined) {
            gameSettings.shadows = savedSettings.shadows;
        }
        
        if (savedSettings.fog !== undefined) {
            gameSettings.fog = savedSettings.fog;
        }

        if (savedSettings.fov !== undefined) {
            gameSettings.fov = savedSettings.fov;
        }

        if (savedSettings.cameraSensitivity !== undefined) {
            gameSettings.cameraSensitivity = savedSettings.cameraSensitivity;
        }
        
        if (savedSettings.chunkUpdateRate !== undefined) {
            gameSettings.chunkUpdateRate = savedSettings.chunkUpdateRate;
        }

        if (savedSettings.colorVibrancy !== undefined) {
            gameSettings.colorVibrancy = savedSettings.colorVibrancy;
        }

        if (savedSettings.keybindings) {
            gameSettings.keybindings = {...gameSettings.keybindings, ...savedSettings.keybindings};
        }
    } catch (e) {
        console.error('Error loading game settings:', e);
    }
}

export function saveGameSettings() {
    try {
        localStorage.setItem('minecraft_settings', JSON.stringify(gameSettings));
    } catch (e) {
        console.error('Error saving game settings:', e);
    }
}

export function resetSettings() {
    gameSettings.renderDistance = 4;
    gameSettings.shadows = true;
    gameSettings.fog = true;
    gameSettings.fov = 90;
    gameSettings.cameraSensitivity = 100;
    gameSettings.chunkUpdateRate = 1;
    gameSettings.colorVibrancy = true;
}

export function resetKeybindings() {
    gameSettings.keybindings = {
        forward: 'KeyW',
        backward: 'KeyS',
        left: 'KeyA',
        right: 'KeyD',
        jump: 'Space',
        sprint: 'ShiftLeft',
        inventory: 'KeyE'
    };
}

export function updateSettingsUI() {
    const fovSlider = document.getElementById('fov-slider');
    const fovValue = document.getElementById('fov-value');
    if (fovSlider && fovValue) {
        fovSlider.value = gameSettings.fov;
        fovValue.textContent = gameSettings.fov;
    }
    
    const renderDistanceMenuSlider = document.getElementById('render-distance-menu-slider');
    const renderDistanceMenuValue = document.getElementById('render-distance-menu-value');
    if (renderDistanceMenuSlider && renderDistanceMenuValue) {
        renderDistanceMenuSlider.value = gameSettings.renderDistance;
        renderDistanceMenuValue.textContent = gameSettings.renderDistance;
    }
    
    const renderDistanceSlider = document.getElementById('render-distance-slider');
    const renderDistanceValue = document.getElementById('render-distance-value');
    if (renderDistanceSlider && renderDistanceValue) {
        renderDistanceSlider.value = gameSettings.renderDistance;
        renderDistanceValue.textContent = gameSettings.renderDistance;
    }
    
    const shadowMenuToggle = document.getElementById('shadow-menu-toggle');
    const shadowToggle = document.getElementById('shadow-toggle');
    if (shadowMenuToggle) shadowMenuToggle.checked = gameSettings.shadows;
    if (shadowToggle) shadowToggle.checked = gameSettings.shadows;
    
    const fogMenuToggle = document.getElementById('fog-menu-toggle');
    const fogToggle = document.getElementById('fog-toggle');
    if (fogMenuToggle) fogMenuToggle.checked = gameSettings.fog;
    if (fogToggle) fogToggle.checked = gameSettings.fog;
    
    const sensitivitySlider = document.getElementById('sensitivity-slider');
    const sensitivityValue = document.getElementById('sensitivity-value');
    if (sensitivitySlider && sensitivityValue) {
        sensitivitySlider.value = gameSettings.cameraSensitivity;
        sensitivityValue.textContent = `${gameSettings.cameraSensitivity}%`;
    }
    
    const sensitivityPauseSlider = document.getElementById('sensitivity-pause-slider');
    const sensitivityPauseValue = document.getElementById('sensitivity-pause-value');
    if (sensitivityPauseSlider && sensitivityPauseValue) {
        sensitivityPauseSlider.value = gameSettings.cameraSensitivity;
        sensitivityPauseValue.textContent = `${gameSettings.cameraSensitivity}%`;
    }
    
    const chunkUpdateSlider = document.getElementById('chunk-update-slider');
    const chunkUpdateValue = document.getElementById('chunk-update-value');
    if (chunkUpdateSlider && chunkUpdateValue) {
        chunkUpdateSlider.value = gameSettings.chunkUpdateRate;
        let rateText = 'Medium';
        switch(gameSettings.chunkUpdateRate) {
            case 0: rateText = 'Low'; break;
            case 1: rateText = 'Medium'; break;
            case 2: rateText = 'High'; break;
        }
        chunkUpdateValue.textContent = rateText;
    }
    
    const chunkUpdatePauseSlider = document.getElementById('chunk-update-pause-slider');
    const chunkUpdatePauseValue = document.getElementById('chunk-update-pause-value');
    if (chunkUpdatePauseSlider && chunkUpdatePauseValue) {
        chunkUpdatePauseSlider.value = gameSettings.chunkUpdateRate;
        let rateText = 'Medium';
        switch(gameSettings.chunkUpdateRate) {
            case 0: rateText = 'Low'; break;
            case 1: rateText = 'Medium'; break;
            case 2: rateText = 'High'; break;
        }
        chunkUpdatePauseValue.textContent = rateText;
    }

    const masterVolumeSlider = document.getElementById('master-volume-slider');
    const masterVolumeValue = document.getElementById('master-volume-value');
    if (masterVolumeSlider && masterVolumeValue) {
        masterVolumeSlider.value = volumeSettings.master;
        masterVolumeValue.textContent = volumeSettings.master + '%';
    }
    
    const musicVolumeSlider = document.getElementById('music-volume-slider');
    const musicVolumeValue = document.getElementById('music-volume-value');
    if (musicVolumeSlider && musicVolumeValue) {
        musicVolumeSlider.value = volumeSettings.music;
        musicVolumeValue.textContent = volumeSettings.music + '%';
    }
    
    const soundVolumeSlider = document.getElementById('sound-volume-slider');
    const soundVolumeValue = document.getElementById('sound-volume-value');
    if (soundVolumeSlider && soundVolumeValue) {
        soundVolumeSlider.value = volumeSettings.sound;
        soundVolumeValue.textContent = volumeSettings.sound + '%';
    }
}

export function updateKeybindButtonsDisplay() {
    for (const [action, keyCode] of Object.entries(gameSettings.keybindings)) {
        const button = document.querySelector(`.keybind-button[data-action="${action}"]`);
        if (button) {
            button.textContent = getKeyDisplayName(keyCode);
        }
    }
}

export function getKeyDisplayName(keyCode) {
    const specialKeyNames = {
        'Space': 'Space',
        'ShiftLeft': 'Shift',
        'ShiftRight': 'R-Shift',
        'ControlLeft': 'Ctrl',
        'ControlRight': 'R-Ctrl',
        'AltLeft': 'Alt',
        'AltRight': 'R-Alt',
        'ArrowUp': 'â†?,
        'ArrowDown': 'â†?,
        'ArrowLeft': 'â†?,
        'ArrowRight': 'â†?,
        'Enter': 'Enter',
        'Escape': 'Esc',
        'Tab': 'Tab'
    };

    if (specialKeyNames[keyCode]) {
        return specialKeyNames[keyCode];
    }

    if (keyCode.startsWith('Key')) {
        return keyCode.slice(3);
    }

    return keyCode;
}

export function updateCameraFOV(camera) {
    if (camera) {
        camera.fov = gameSettings.fov;
        camera.updateProjectionMatrix();
    }
}

export function applyCameraSensitivity(controls) {
    if (!controls) return;
    
    const sensitivityFactor = gameSettings.cameraSensitivity / 100;
    
    controls.onMouseMove = function(event) {
        const movementX = event.movementX * sensitivityFactor;
        const movementY = event.movementY * sensitivityFactor;
        
        if (this.isLocked === false) return;
        
        this.yawObject.rotation.y -= movementX * 0.002;
        this.pitchObject.rotation.x -= movementY * 0.002;
        
        this.pitchObject.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitchObject.rotation.x));
    };
}

export function updateShadowSettings(renderer, directionalLight) {
    if (renderer) {
        renderer.shadowMap.enabled = gameSettings.shadows;

        if (directionalLight) {
            directionalLight.castShadow = gameSettings.shadows;
        }
    }
}

export function updateFogForRenderDistance(scene) {
    if (!gameSettings.fog) return;
    
    const renderDistanceScale = gameSettings.renderDistance / 6;
    fogSettings.linearFogNear = 38 * renderDistanceScale;
    fogSettings.linearFogFar = 140 * renderDistanceScale; 
    
    fogSettings.expFogDensity = 0.0044 / Math.sqrt(renderDistanceScale); 
    
    if (scene && scene.fog) {
        if (scene.fog.isFog) {
            scene.fog.near = fogSettings.linearFogNear;
            scene.fog.far = fogSettings.linearFogFar;
            scene.fog._baseFar = fogSettings.linearFogFar; 
        } else {
            scene.fog.density = fogSettings.expFogDensity;
            scene.fog._baseDensity = fogSettings.expFogDensity; 
        }
    }
}

export function updateFog(scene, camera) {
    if (!gameSettings.fog || !scene || !scene.fog || !camera) return;

    const playerHeight = camera.position.y;

    if (fogSettings.fogHeightFalloff) {
        const heightFactor = Math.max(0, 1 - (playerHeight - 10) / 50);

        if (scene.fog.isFog) {
            scene.fog.near = fogSettings.linearFogNear + (1 - heightFactor) * 30;
            scene.fog.far = fogSettings.linearFogFar + (1 - heightFactor) * 50;
            scene.fog._baseFar = scene.fog.far; 
        } else {
            scene.fog.density = fogSettings.expFogDensity * (0.5 + heightFactor * 0.5);
            scene.fog._baseDensity = scene.fog.density; 
        }

        if (scene.background && scene.background.isColor) {
            const baseColor = new THREE.Color(fogSettings.fogColor);
            const skyColor = new THREE.Color(0x94DAFF);
            const lowFogColor = new THREE.Color(0xD5E0EE); 

            const colorFactor = Math.max(0, Math.min(1, (playerHeight - 5) / 40));
            const blendedColor = lowFogColor.clone().lerp(skyColor, colorFactor);

            scene.fog._heightAdjustedColor = blendedColor;
        }
    }
}

export function toggleFog(scene) {
    gameSettings.fog = !gameSettings.fog;
    
    if (gameSettings.fog) {
        if (fogSettings.fogType === 'linear') {
            scene.fog = new THREE.Fog(fogSettings.fogColor, fogSettings.linearFogNear, fogSettings.linearFogFar);
            scene.fog._baseFar = fogSettings.linearFogFar;
        } else {
            scene.fog = new THREE.FogExp2(fogSettings.fogColor, fogSettings.expFogDensity);
            scene.fog._baseDensity = fogSettings.expFogDensity;
        }
        updateFog(scene);
    } else {
        scene.fog = null;
    }
    
    saveGameSettings();
    
    updateSettingsUI();
}

export function toggleFogType(scene) {
    if (!gameSettings.fog) return;
    
    if (fogSettings.fogType === 'linear') {
        fogSettings.fogType = 'exponential';
        scene.fog = new THREE.FogExp2(fogSettings.fogColor, fogSettings.expFogDensity);
        scene.fog._baseDensity = fogSettings.expFogDensity;
    } else {
        fogSettings.fogType = 'linear';
        scene.fog = new THREE.Fog(fogSettings.fogColor, fogSettings.linearFogNear, fogSettings.linearFogFar);
        scene.fog._baseFar = fogSettings.linearFogFar;
    }

    updateFog(scene);
}

export function updateChunkUpdateRate(voxelWorld) {
    if (!voxelWorld) return;
    
    switch (gameSettings.chunkUpdateRate) {
        case 0:
            voxelWorld.maxRebuildsPerFrame = 1;
            break;
        case 1:
            voxelWorld.maxRebuildsPerFrame = 2;
            break;
        case 2:
            voxelWorld.maxRebuildsPerFrame = 4;
            break;
    }
}

export function saveVolumeSettings() {
    try {
        localStorage.setItem('minecraft_volume_settings', JSON.stringify(volumeSettings));
    } catch (e) {
        console.error('Error saving volume settings:', e);
    }
}

export function loadVolumeSettings() {
    try {
        const savedSettings = JSON.parse(localStorage.getItem('minecraft_volume_settings') || '{}');
        
        if (savedSettings.master !== undefined) {
            volumeSettings.master = savedSettings.master;
        }
        
        if (savedSettings.music !== undefined) {
            volumeSettings.music = savedSettings.music;
        }
        
        if (savedSettings.sound !== undefined) {
            volumeSettings.sound = savedSettings.sound;
        }
    } catch (e) {
        console.error('Error loading volume settings:', e);
    }
}

export function setVolume(type, value) {
    volumeSettings[type] = Math.round(value * 100);
    
    if (type === 'master' || type === 'sound') {
        const effectiveVolume = (volumeSettings.master / 100) * (volumeSettings.sound / 100);
    }
    
    if (type === 'master' || type === 'music') {
        const effectiveVolume = (volumeSettings.master / 100) * (volumeSettings.music / 100);
    }
    
    saveVolumeSettings();
}
