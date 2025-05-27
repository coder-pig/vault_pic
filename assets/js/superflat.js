const DEFAULT_LAYERS = [
    { blockType: 'bedrock', thickness: 1 },
    { blockType: 'dirt', thickness: 2 },
    { blockType: 'grass', thickness: 1 }
];

let currentLayers = [];

function loadSavedLayers() {
    try {
        const savedLayers = localStorage.getItem('minecraft_superflat_layers');
        if (savedLayers) {
            const parsedLayers = JSON.parse(savedLayers);
            if (parsedLayers && Array.isArray(parsedLayers) && parsedLayers.length > 0) {
                currentLayers = parsedLayers;
                return true;
            }
        }
    } catch (error) {
        console.warn('Failed to load superflat layers from localStorage:', error);
    }
    return false;
}

const hasLoadedSavedLayers = loadSavedLayers();
if (!hasLoadedSavedLayers) {
    // If no saved layers were found, set the default layers
    currentLayers = [...DEFAULT_LAYERS];
}

export function generateSuperflat(blocks, chunkSize) {
    // Handle case where currentLayers is somehow undefined or empty
    if (!currentLayers || currentLayers.length === 0) {
        console.warn("No superflat layers defined, using defaults");
        currentLayers = [...DEFAULT_LAYERS];
    }
    let currentY = 0;
    
    // Generate from bottom to top
    for (const layer of currentLayers) {
        if (!layer.blockType || !layer.thickness) {
            console.warn("Invalid layer found:", layer);
            continue;
        }
        
        for (let thickness = 0; thickness < layer.thickness; thickness++) {
            for (let x = 0; x < chunkSize; x++) {
                for (let z = 0; z < chunkSize; z++) {
                    blocks.set(`${x},${currentY},${z}`, layer.blockType);
                }
            }
            currentY++;
        }
    }
}

export function getSuperflatHeight() {
    return currentLayers.reduce((sum, layer) => sum + layer.thickness, 0);
}

export function isSuperflatEdge(y) {
    let currentHeight = 0;
    for (const layer of currentLayers) {
        currentHeight += layer.thickness;
        if (y === currentHeight - 1) {
            return true;
        }
    }
    return false;
}

export function getSuperflatBlockType(y) {
    let currentY = 0;
    
    for (const layer of currentLayers) {
        if (y >= currentY && y < currentY + layer.thickness) {
            return layer.blockType;
        }
        currentY += layer.thickness;
    }
    
    return null;
}

export function getSuperflatLayers() {
    return JSON.parse(JSON.stringify(currentLayers));
}

export function setSuperflatLayers(layers) {
    if (Array.isArray(layers) && layers.length > 0) {
        currentLayers = JSON.parse(JSON.stringify(layers));
        try {
            localStorage.setItem('minecraft_superflat_layers', JSON.stringify(currentLayers));
        } catch (error) {
            console.warn('Failed to save superflat layers to localStorage:', error);
        }
        
        // Log the successful setting of layers to debug
        console.log("Superflat layers set:", currentLayers);
    } else {
        console.warn("Attempted to set invalid superflat layers:", layers);
    }
}

export function resetSuperflatLayers() {
    currentLayers = [...DEFAULT_LAYERS];
    try {
        localStorage.removeItem('minecraft_superflat_layers');
    } catch (error) {
        console.warn('Failed to remove superflat layers from localStorage:', error);
    }
}

export function addLayer(blockType, thickness) {
    currentLayers.push({
        blockType: blockType || 'stone',
        thickness: thickness || 1
    });
    
    try {
        localStorage.setItem('minecraft_superflat_layers', JSON.stringify(currentLayers));
    } catch (error) {
        console.warn('Failed to save superflat layers to localStorage:', error);
    }
}

export function removeLayer(index) {
    if (index >= 0 && index < currentLayers.length) {
        currentLayers.splice(index, 1);
        
        // Ensure we always have at least one layer
        if (currentLayers.length === 0) {
            resetSuperflatLayers();
            return;
        }
        
        try {
            localStorage.setItem('minecraft_superflat_layers', JSON.stringify(currentLayers));
        } catch (error) {
            console.warn('Failed to save superflat layers to localStorage:', error);
        }
    }
}

export function updateLayer(index, blockType, thickness) {
    if (index >= 0 && index < currentLayers.length) {
        currentLayers[index] = {
            blockType: blockType || currentLayers[index].blockType,
            thickness: thickness || currentLayers[index].thickness
        };
        
        try {
            localStorage.setItem('minecraft_superflat_layers', JSON.stringify(currentLayers));
        } catch (error) {
            console.warn('Failed to save superflat layers to localStorage:', error);
        }
    }
}

export function getAvailableBlockTypes() {
    return [
        'bedrock', 'stone', 'dirt', 'grass', 'sand', 'sandstone',
        'cobble', 'plank', 'birchplank', 'wood', 'birchwood',
        'glass', 'snow'
    ];
}
