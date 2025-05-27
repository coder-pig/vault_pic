// Mods management system

// ---------- UI Dialog Controls ----------
export function showModsDialog() {
    document.getElementById('mods-dialog').style.display = 'flex';
}

export function hideModsDialog() {
    document.getElementById('mods-dialog').style.display = 'none';
}

export function showBlockCreationDialog() {
    document.getElementById('block-creation-dialog').style.display = 'flex';
}

export function hideBlockCreationDialog() {
    document.getElementById('block-creation-dialog').style.display = 'none';
}

export function showBlockFacesDialog() {
    document.getElementById('block-faces-dialog').style.display = 'flex';
}

export function hideBlockFacesDialog() {
    document.getElementById('block-faces-dialog').style.display = 'none';
}

export function showBlockTextureUploader() {
    document.getElementById('block-texture-uploader').style.display = 'flex';
    
    document.getElementById('block-name').value = '';
    document.getElementById('is-slab-checkbox').checked = false;
    
    const previewElements = document.querySelectorAll('.texture-preview');
    previewElements.forEach(preview => {
        preview.style.backgroundImage = '';
    });
    
    setupTextureUploadButtons();
}

export function hideBlockTextureUploader() {
    document.getElementById('block-texture-uploader').style.display = 'none';
}

export function showSingleTextureUploader() {
    document.getElementById('single-texture-uploader').style.display = 'flex';
    
    document.getElementById('single-block-name').value = '';
    document.getElementById('single-is-slab-checkbox').checked = false;
    document.getElementById('preview-single').style.backgroundImage = '';
    
    setupSingleTextureUploadButton();
}

export function hideSingleTextureUploader() {
    document.getElementById('single-texture-uploader').style.display = 'none';
}

export function showModImportDialog() {
    document.getElementById('mod-import-dialog').style.display = 'flex';
    loadCustomBlocks();
}

export function hideModImportDialog() {
    document.getElementById('mod-import-dialog').style.display = 'none';
}

export function showCraftingRecipeCreator() {
    document.getElementById('crafting-recipe-creator').style.display = 'flex';
    populateBlockSelector();
}

export function hideCraftingRecipeCreator() {
    document.getElementById('crafting-recipe-creator').style.display = 'none';
}

// ---------- Texture Upload Handling ----------
export function setupTextureUploadButtons() {
    const uploadButtons = document.querySelectorAll('.upload-texture-btn');
    
    uploadButtons.forEach(button => {
        button.removeEventListener('click', handleTextureUpload);
        button.addEventListener('click', handleTextureUpload);
    });
}

export function setupSingleTextureUploadButton() {
    const uploadButton = document.querySelector('#single-texture-uploader .upload-texture-btn');
    if (uploadButton) {
        uploadButton.removeEventListener('click', handleSingleTextureUpload);
        uploadButton.addEventListener('click', handleSingleTextureUpload);
    }
}

async function handleTextureUpload(event) {
    const face = event.target.getAttribute('data-face');
    if (!face) return;
    
    const fileInput = document.getElementById(`texture-${face}`);
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        alert(`Please select a file for the ${face} face first.`);
        return;
    }
    
    const previewElement = document.getElementById(`preview-${face}`);
    if (!previewElement) return;
    
    const file = fileInput.files[0];
    
    previewElement.innerHTML = '<div class="loading-texture">Uploading...</div>';
    
    try {
        let url;
        if (window.websim && window.websim.upload) {
            url = await window.websim.upload(file);
        } else {
            url = await readFileAsDataURL(file);
        }
        
        previewElement.innerHTML = '';
        previewElement.style.backgroundImage = `url('${url}')`;
        previewElement.setAttribute('data-texture-url', url);
        
        if (typeof playClickSound === 'function') {
            playClickSound();
        }
    } catch (error) {
        console.error(`Error uploading texture for ${face}:`, error);
        previewElement.innerHTML = '';
        alert(`Failed to upload texture for ${face}. Please try again.`);
    }
}

async function handleSingleTextureUpload(event) {
    const fileInput = document.getElementById('texture-single');
    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
        alert('Please select a file first.');
        return;
    }
    
    const previewElement = document.getElementById('preview-single');
    if (!previewElement) return;
    
    const file = fileInput.files[0];
    
    previewElement.innerHTML = '<div class="loading-texture">Uploading...</div>';
    
    try {
        let url;
        if (window.websim && window.websim.upload) {
            url = await window.websim.upload(file);
        } else {
            url = await readFileAsDataURL(file);
        }
        
        previewElement.innerHTML = '';
        previewElement.style.backgroundImage = `url('${url}')`;
        previewElement.setAttribute('data-texture-url', url);
        
        if (typeof playClickSound === 'function') {
            playClickSound();
        }
    } catch (error) {
        console.error('Error uploading texture:', error);
        previewElement.innerHTML = '';
        alert('Failed to upload texture. Please try again.');
    }
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = function(e) {
            reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
    });
}

// ---------- Block Creation Functions ----------
export async function saveBlockWithTextures() {
    const blockName = document.getElementById('block-name').value.trim();
    if (!blockName) {
        alert('Please enter a block name.');
        return;
    }
    
    const isSlab = document.getElementById('is-slab-checkbox').checked;
    
    const blockId = 'custom_' + blockName.toLowerCase().replace(/\s+/g, '_');
    
    const faces = ['top', 'bottom', 'front', 'back', 'left', 'right'];
    const textures = {};
    
    let hasAtLeastOne = false;
    
    for (const face of faces) {
        const preview = document.getElementById(`preview-${face}`);
        if (preview && preview.style.backgroundImage) {
            const textureUrl = preview.getAttribute('data-texture-url');
            if (textureUrl) {
                textures[face] = textureUrl;
                hasAtLeastOne = true;
            }
        }
    }
    
    if (!hasAtLeastOne) {
        alert('Please upload at least one texture.');
        return;
    }
    
    window.tempBlockData = {
        id: blockId,
        name: blockName,
        type: 'multi',
        textures,
        isSlab
    };
    
    hideBlockTextureUploader();
    showCraftingRecipeCreator();
}

export async function saveSingleTextureBlock() {
    const blockName = document.getElementById('single-block-name').value.trim();
    if (!blockName) {
        alert('Please enter a block name.');
        return;
    }
    
    const isSlab = document.getElementById('single-is-slab-checkbox').checked;
    
    const blockId = 'custom_' + blockName.toLowerCase().replace(/\s+/g, '_');
    
    const preview = document.getElementById('preview-single');
    if (!preview || !preview.style.backgroundImage) {
        alert('Please upload a texture.');
        return;
    }
    
    const textureUrl = preview.getAttribute('data-texture-url');
    if (!textureUrl) {
        alert('Please upload a texture.');
        return;
    }
    
    window.tempBlockData = {
        id: blockId,
        name: blockName,
        type: 'single',
        textures: {
            front: textureUrl
        },
        isSlab
    };
    
    hideSingleTextureUploader();
    showCraftingRecipeCreator();
}

export function saveCustomBlockWithRecipe() {
    if (!window.tempBlockData) {
        alert('No block data available.');
        return;
    }
    
    const recipe = [];
    for (let i = 0; i < 9; i++) {
        const slot = document.querySelector(`.crafting-recipe-slot[data-index="${i}"]`);
        const blockItem = slot.querySelector('.block-item');
        if (blockItem) {
            recipe.push(blockItem.getAttribute('data-block-type'));
        } else {
            recipe.push(null);
        }
    }
    
    window.tempBlockData.recipe = recipe;
    
    try {
        const customBlocks = JSON.parse(localStorage.getItem('minecraft_custom_blocks') || '[]');
        customBlocks.push(window.tempBlockData);
        localStorage.setItem('minecraft_custom_blocks', JSON.stringify(customBlocks));
        
        alert(`Block "${window.tempBlockData.name}" created successfully!`);
        window.tempBlockData = null;
        
        hideCraftingRecipeCreator();
        hideBlockCreationDialog();
        hideBlockFacesDialog();
        hideBlockTextureUploader();
        hideSingleTextureUploader();
    } catch (error) {
        console.error('Error saving custom block:', error);
        alert('Failed to save custom block. Please try again.');
    }
}

export function skipRecipe() {
    if (!window.tempBlockData) {
        alert('No block data available.');
        return;
    }
    
    window.tempBlockData.recipe = Array(9).fill(null);
    
    try {
        const customBlocks = JSON.parse(localStorage.getItem('minecraft_custom_blocks') || '[]');
        customBlocks.push(window.tempBlockData);
        localStorage.setItem('minecraft_custom_blocks', JSON.stringify(customBlocks));
        
        alert(`Block "${window.tempBlockData.name}" created successfully!`);
        window.tempBlockData = null;
        
        hideCraftingRecipeCreator();
        hideBlockCreationDialog();
        hideBlockFacesDialog();
        hideBlockTextureUploader();
        hideSingleTextureUploader();
    } catch (error) {
        console.error('Error saving custom block:', error);
        alert('Failed to save custom block. Please try again.');
    }
}

export function populateBlockSelector() {
    const selectorGrid = document.getElementById('block-selector-grid');
    if (!selectorGrid) return;
    
    selectorGrid.innerHTML = '';
    
    const standardBlocks = [
        'grass', 'dirt', 'stone', 'cobble', 'wood', 'birchwood', 
        'plank', 'birchplank', 'glass', 'sand', 'sandstone'
    ];
    
    standardBlocks.forEach(blockType => {
        const blockItem = document.createElement('div');
        blockItem.className = 'block-selector-item';
        
        const blockIcon = document.createElement('div');
        blockIcon.className = 'block-icon';
        blockIcon.style.backgroundImage = `url('${getItemTexture(blockType)}')`;
        
        blockItem.appendChild(blockIcon);
        blockItem.setAttribute('data-block-type', blockType);
        
        blockItem.addEventListener('click', () => {
            selectBlockForRecipe(blockType);
        });
        
        selectorGrid.appendChild(blockItem);
    });
    
    try {
        const customBlocks = JSON.parse(localStorage.getItem('minecraft_custom_blocks') || '[]');
        
        customBlocks.forEach(block => {
            const blockItem = document.createElement('div');
            blockItem.className = 'block-selector-item';
            
            const blockIcon = document.createElement('div');
            blockIcon.className = 'block-icon';
            
            const textureUrl = block.textures && block.textures.front ? 
                block.textures.front : 
                (block.textures ? Object.values(block.textures)[0] : null);
            
            if (textureUrl) {
                blockIcon.style.backgroundImage = `url('${textureUrl}')`;
            } else {
                blockIcon.style.backgroundColor = '#ff00ff';
            }
            
            blockItem.appendChild(blockIcon);
            blockItem.setAttribute('data-block-type', block.id);
            
            blockItem.addEventListener('click', () => {
                selectBlockForRecipe(block.id);
            });
            
            selectorGrid.appendChild(blockItem);
        });
    } catch (error) {
        console.error('Error loading custom blocks for recipes:', error);
    }
}

export function selectBlockForRecipe(blockType) {
    const selectedSlot = document.querySelector('.crafting-recipe-slot.selected');
    if (!selectedSlot) {
        alert('Please select a crafting slot first.');
        return;
    }
    
    selectedSlot.innerHTML = '';
    
    const blockItem = document.createElement('div');
    blockItem.className = 'block-item';
    blockItem.style.backgroundImage = `url('${getItemTexture(blockType)}')`;
    blockItem.setAttribute('data-block-type', blockType);
    
    selectedSlot.appendChild(blockItem);
    
    selectedSlot.classList.remove('selected');
}

export function loadCustomBlocks() {
    const availableModsList = document.getElementById('available-mods-list');
    if (!availableModsList) return;
    
    availableModsList.innerHTML = '';
    
    try {
        const customBlocks = JSON.parse(localStorage.getItem('minecraft_custom_blocks') || '[]');
        
        if (customBlocks.length === 0) {
            const noModsMessage = document.createElement('p');
            noModsMessage.className = 'no-mods-message';
            noModsMessage.textContent = 'No custom blocks available yet.';
            availableModsList.appendChild(noModsMessage);
            return;
        }
        
        customBlocks.forEach(block => {
            const modItem = document.createElement('div');
            modItem.className = 'mod-item';
            modItem.setAttribute('data-block-id', block.id);
            
            const modCheckbox = document.createElement('input');
            modCheckbox.type = 'checkbox';
            modCheckbox.className = 'mod-item-checkbox';
            
            const modIcon = document.createElement('div');
            modIcon.className = 'mod-item-icon';
            modIcon.style.backgroundImage = block.textures && block.textures.front ? 
                                           `url('${block.textures.front}')` : 
                                           `url('../images/dirt.png')`;
            
            const modDetails = document.createElement('div');
            modDetails.className = 'mod-item-details';
            
            const modName = document.createElement('div');
            modName.className = 'mod-item-name';
            modName.textContent = block.name;
            
            const modInfo = document.createElement('div');
            modInfo.className = 'mod-item-info';
            modInfo.textContent = `Type: ${block.type === 'multi' ? 'Multiple Textures' : 'Single Texture'}`;
            if (block.isSlab) {
                modInfo.textContent += ', Slab';
            }
            
            const modStatus = document.createElement('div');
            modStatus.className = 'mod-status enabled';
            modStatus.textContent = 'Enabled';
            
            const modActions = document.createElement('div');
            modActions.className = 'mod-item-actions';
            
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'menu-button button-java-old small-button';
            toggleBtn.textContent = 'Disable';
            toggleBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                playClickSound();
                const isEnabled = modStatus.classList.contains('enabled');
                if (isEnabled) {
                    modStatus.classList.remove('enabled');
                    modStatus.classList.add('disabled');
                    modStatus.textContent = 'Disabled';
                    toggleBtn.textContent = 'Enable';
                } else {
                    modStatus.classList.remove('disabled');
                    modStatus.classList.add('enabled');
                    modStatus.textContent = 'Enabled';
                    toggleBtn.textContent = 'Disable';
                }
            });
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'menu-button button-java-old small-button';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                playClickSound();
                if (confirm(`Are you sure you want to delete the "${block.name}" block?`)) {
                    deleteCustomBlock(block.id);
                    modItem.remove();
                    
                    if (availableModsList.children.length === 0) {
                        const noModsMessage = document.createElement('p');
                        noModsMessage.className = 'no-mods-message';
                        noModsMessage.textContent = 'No custom blocks available yet.';
                        availableModsList.appendChild(noModsMessage);
                    }
                }
            });
            
            modActions.appendChild(toggleBtn);
            modActions.appendChild(deleteBtn);
            
            modDetails.appendChild(modName);
            modDetails.appendChild(modInfo);
            
            modItem.appendChild(modCheckbox);
            modItem.appendChild(modIcon);
            modItem.appendChild(modDetails);
            modItem.appendChild(modStatus);
            modItem.appendChild(modActions);
            
            availableModsList.appendChild(modItem);
        });
    } catch (error) {
        console.error('Error loading custom blocks:', error);
        const errorMessage = document.createElement('p');
        errorMessage.className = 'no-mods-message';
        errorMessage.textContent = 'Error loading custom blocks. Please try again.';
        availableModsList.appendChild(errorMessage);
    }
}

export function deleteCustomBlock(blockId) {
    try {
        const customBlocks = JSON.parse(localStorage.getItem('minecraft_custom_blocks') || '[]');
        const updatedBlocks = customBlocks.filter(block => block.id !== blockId);
        localStorage.setItem('minecraft_custom_blocks', JSON.stringify(updatedBlocks));
    } catch (error) {
        console.error('Error deleting custom block:', error);
        alert('Failed to delete block. Please try again.');
    }
}

export function getItemTexture(blockType) {
    switch (blockType) {
        case 'grass': return '../images/grass_top.png';
        case 'dirt': return '../images/dirt.png';
        case 'stone': return '../images/stone.png';
        case 'smoothstone': return '../images/smoothstone.png';
        case 'cobble': return '../images/cobbles.png';
        case 'wood': return '../images/logtopbottom.png';
        case 'leaves': return '../images/leaves.png';
        case 'plank': return '../images/plank.png';
        case 'craftingtable': return '../images/cftopbottom.png';
        case 'oakdoor': return '../images/door.png';
        case 'birchdoor': return '../images/birchdoor.png';
        case 'sand': return '../images/sand.png';
        case 'sandstone': return '../images/sandstone.png';
        case 'cacti': return '../images/cacti.png';
        case 'birchwood': return '../images/birchlogtopbottom.png';
        case 'birchleaves': return '../images/birchleaves.png';
        case 'birchplank': return '../images/birchplank.png';
        case 'stick': return '../images/stick.png';
        case 'furnace': return '../images/cobbles.png';
        case 'glass': return '../images/glass.png';
        case 'snow': return '../images/snow.png';
        case 'oakslab': return '../images/plank.png';
        case 'birchslab': return '../images/birchplank.png';
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

export function shareSelectedMods(blockIds) {
    alert('Sharing functionality has been disabled.');
}

// Pre-load the click sound to avoid delay
    const clickSound = new Audio('../audio/click.mp3');
clickSound.volume = 0.5;
clickSound.load();

function playClickSound() {
    // Clone the sound to allow overlapping playback
    clickSound.cloneNode().play().catch(e => console.error("Error playing sound:", e));
}
