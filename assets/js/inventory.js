export class Inventory {
    constructor() {
        this.mainSlots = new Array(27).fill().map(() => ({ type: null, count: 0 }));
        this.slots = new Array(9).fill().map(() => ({ type: null, count: 0 }));
        this.isCreative = false;
        
        this.craftingSlots = new Array(4).fill().map(() => ({ type: null, count: 0 }));
        this.craftingResult = { type: null, count: 0 };
        this.tableCraftingSlots = new Array(9).fill().map(() => ({ type: null, count: 0 }));
        this.tableCraftingResult = { type: null, count: 0 };

        this.furnaceInput = { type: null, count: 0 };
        this.furnaceFuel = { type: null, count: 0 };
        this.furnaceResult = { type: null, count: 0 };

        this.furnaceActive = false;
        this.smeltProgress = 0;
        this.maxSmeltTime = 10;
        this.burnTimeLeft = 0;
        this.maxBurnTime = 0;

        this.currentFurnacePos = null;

        this.selectedSlot = 0;
        this.maxStackSize = 64;
        this.isDragging = false;
        this.draggedItem = null;
        this.draggedSource = null;
        this.dragButton = 0;

        this.preloadBlockTextures();

        this.createHotbarUI();

        this.createInventoryUI();

        this.createCraftingTableUI();

        this.createFurnaceUI();

        this.createChestUI();

        this.setupEventListeners();

        this.setupCraftingRecipes();

        this.setupSmeltingRecipes();
        
        this.createHeldItemDisplay = function() {};
    }

    preloadBlockTextures() {
        this.textureCache = {};
        
        const blockTypes = [
            'grass', 'dirt', 'stone', 'smoothstone', 'cobble', 
            'wood', 'birchwood', 'leaves', 'birchleaves',
            'plank', 'birchplank', 'craftingtable', 'door',
            'sand', 'sandstone', 'cacti', 'furnace', 'glass',
            'snow', 'stick', 'oakslab', 'birchslab', 'chest',
            'seeds', 'wheat', 'haybale', 'newglass'
        ];
        
        blockTypes.forEach(blockType => {
            const imgUrl = this.getItemTexture(blockType);
            if (imgUrl) {
                const img = new Image();
                img.src = imgUrl;
                this.textureCache[blockType] = img;
            }
        });
    }

    createHotbarUI() {
        const hotbar = document.getElementById('hotbar');
        hotbar.innerHTML = '';

        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot';
            slot.id = `slot-${i}`;
            slot.setAttribute('data-slot', `hotbar-${i}`);
            if (i === this.selectedSlot) {
                slot.classList.add('selected');
            }

            const item = document.createElement('div');
            item.className = 'slot-item';
            item.id = `item-${i}`;

            const count = document.createElement('div');
            count.className = 'slot-count';
            count.id = `count-${i}`;

            slot.appendChild(item);
            slot.appendChild(count);
            hotbar.appendChild(slot);
        }
    }

    createInventoryUI() {
        const mainInventory = document.querySelector('.main-inventory');
        mainInventory.innerHTML = '';

        for (let i = 0; i < 27; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.setAttribute('data-slot', `inventory-${i}`);
            mainInventory.appendChild(slot);
        }

        const inventoryHotbar = document.getElementById('inventory-hotbar');
        inventoryHotbar.innerHTML = '';

        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            slot.setAttribute('data-slot', `hotbar-${i}`);
            if (i === this.selectedSlot) {
                slot.classList.add('selected');
            }
            inventoryHotbar.appendChild(slot);
        }

        for (let i = 0; i < 4; i++) {
            const craftingSlot = document.querySelector(`[data-slot="craft-${i}"]`);
            if (craftingSlot) {
                craftingSlot.innerHTML = '';
            }
        }

        const resultSlot = document.querySelector('[data-slot="craft-result"]');
        if (resultSlot) {
            resultSlot.innerHTML = '';
        }

        this.updateAllDisplays();
    }

    createCraftingTableUI() {
        const craftingTableInventory = document.getElementById('crafting-table-inventory');
        if (craftingTableInventory) {
            craftingTableInventory.innerHTML = '';

            for (let i = 0; i < 27; i++) {
                const slot = document.createElement('div');
                slot.className = 'inventory-slot';
                slot.setAttribute('data-slot', `inventory-${i}`);
                craftingTableInventory.appendChild(slot);
            }
        }

        const craftingTableHotbar = document.getElementById('crafting-table-hotbar');
        if (craftingTableHotbar) {
            craftingTableHotbar.innerHTML = '';

            for (let i = 0; i < 9; i++) {
                const slot = document.createElement('div');
                slot.className = 'inventory-slot';
                slot.setAttribute('data-slot', `hotbar-${i}`);
                if (i === this.selectedSlot) {
                    slot.classList.add('selected');
                }
                craftingTableHotbar.appendChild(slot);
            }
        }

        const craftingTableContainer = document.querySelector('.crafting-table-container');
        if (craftingTableContainer) {
            if (!document.getElementById('quick-craft-sidebar')) {
                const quickCraftSidebar = document.createElement('div');
                quickCraftSidebar.id = 'quick-craft-sidebar';
                quickCraftSidebar.className = 'quick-craft-sidebar';

                const quickCraftTitle = document.createElement('div');
                quickCraftTitle.className = 'quick-craft-title';
                quickCraftTitle.textContent = 'Quick Craft';

                const quickCraftList = document.createElement('div');
                quickCraftList.id = 'quick-craft-list';
                quickCraftList.className = 'quick-craft-list';

                quickCraftSidebar.appendChild(quickCraftTitle);
                quickCraftSidebar.appendChild(quickCraftList);

                craftingTableContainer.appendChild(quickCraftSidebar);
            }
        }
    }

    createFurnaceUI() {
        const furnaceInputSlot = document.querySelector('[data-slot="furnace-input"]');
        furnaceInputSlot.innerHTML = '';

        const furnaceFuelSlot = document.querySelector('[data-slot="furnace-fuel"]');
        furnaceFuelSlot.innerHTML = '';

        const furnaceResultSlot = document.querySelector('[data-slot="furnace-result"]');
        furnaceResultSlot.innerHTML = '';

        const furnaceInventory = document.getElementById('furnace-inventory');
        if (furnaceInventory) {
            furnaceInventory.innerHTML = '';

            for (let i = 0; i < 27; i++) {
                const slot = document.createElement('div');
                slot.className = 'inventory-slot';
                slot.setAttribute('data-slot', `inventory-${i}`);
                furnaceInventory.appendChild(slot);
            }
        }

        const furnaceHotbar = document.getElementById('furnace-hotbar');
        if (furnaceHotbar) {
            furnaceHotbar.innerHTML = '';

            for (let i = 0; i < 9; i++) {
                const slot = document.createElement('div');
                slot.className = 'inventory-slot';
                slot.setAttribute('data-slot', `hotbar-${i}`);
                if (i === this.selectedSlot) {
                    slot.classList.add('selected');
                }
                furnaceHotbar.appendChild(slot);
            }
        }

        const fireIcon = document.querySelector('.furnace-fire');
        if (fireIcon) {
            if (!document.querySelector('.furnace-timer')) {
                const timerElement = document.createElement('div');
                timerElement.className = 'furnace-timer';
                timerElement.textContent = '0.0s';
                fireIcon.parentNode.insertBefore(timerElement, fireIcon.nextSibling);
            }
        }

        this.furnaceInput = { type: null, count: 0 };
        this.furnaceFuel = { type: null, count: 0 };
        this.furnaceResult = { type: null, count: 0 };

        this.updateFurnaceDisplay();
    }

    createChestUI() {
        const chestInventory = document.getElementById('chest-inventory');
        if (chestInventory) {
            chestInventory.innerHTML = '';

            for (let i = 0; i < 27; i++) {
                const slot = document.createElement('div');
                slot.className = 'chest-slot';
                slot.setAttribute('data-slot', `chest-${i}`);
                chestInventory.appendChild(slot);
            }
        }

        const chestPlayerInventory = document.getElementById('chest-player-inventory');
        if (chestPlayerInventory) {
            chestPlayerInventory.innerHTML = '';

            for (let i = 0; i < 27; i++) {
                const slot = document.createElement('div');
                slot.className = 'inventory-slot';
                slot.setAttribute('data-slot', `inventory-${i}`);
                chestPlayerInventory.appendChild(slot);
            }
        }

        const chestPlayerHotbar = document.getElementById('chest-player-hotbar');
        if (chestPlayerHotbar) {
            chestPlayerHotbar.innerHTML = '';

            for (let i = 0; i < 9; i++) {
                const slot = document.createElement('div');
                slot.className = 'inventory-slot';
                slot.setAttribute('data-slot', `hotbar-${i}`);
                if (i === this.selectedSlot) {
                    slot.classList.add('selected');
                }
                chestPlayerHotbar.appendChild(slot);
            }
        }
    }

    setupEventListeners() {
        window.addEventListener('wheel', (event) => {
            if (event.deltaY > 0) {
                this.selectSlot((this.selectedSlot + 1) % 9);
            } else {
                this.selectSlot((this.selectedSlot - 1 + 9) % 9);
            }
        });

        window.addEventListener('keydown', (event) => {
            const keyNum = parseInt(event.key);
            if (keyNum >= 1 && keyNum <= 9) {
                this.selectSlot(keyNum - 1);
            }

            if (event.key === 'q' || event.key === 'Q') {
                this.dropSelectedItem();
            }

            if (event.key === 'i' || event.key === 'I') {
                if (document.getElementById('crafting-table-screen').style.display === 'flex') {
                    this.closeCraftingTable();
                } 
                else if (document.getElementById('furnace-screen').style.display === 'flex') {
                    this.closeFurnace();
                }
                else if (document.getElementById('chest-screen').style.display === 'flex') {
                    this.closeChest();
                }
                else {
                    this.toggleInventory();
                }
            }

            if (event.key === 'Escape') {
                this.closeInventory();
            }

            if (event.key === 'Escape') {
                this.closeCraftingTable();
            }

            if (event.key === 'Escape') {
                this.closeFurnace();
            }

            if (event.key === 'Escape') {
                this.closeChest();
            }
        });

        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        const allSlots = document.querySelectorAll('.inventory-slot, .hotbar-slot, .crafting-slot, .crafting-result');
        const draggedItemEl = document.getElementById('dragged-item');

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging && draggedItemEl) {
                draggedItemEl.style.left = `${e.clientX - 16}px`;
                draggedItemEl.style.top = `${e.clientY - 16}px`;
            }
        });

        allSlots.forEach(slot => {
            slot.addEventListener('mousedown', (e) => {
                const isRightClick = e.button === 2;
                this.dragButton = e.button;

                if (e.button !== 0 && e.button !== 2) return;

                const slotType = slot.getAttribute('data-slot');
                if (!slotType) return;

                let itemData;
                if (slotType === 'craft-result') {
                    itemData = this.craftingResult;
                } else if (slotType === 'table-craft-result') {
                    itemData = this.tableCraftingResult;
                } else if (slotType.startsWith('hotbar-')) {
                    const index = parseInt(slotType.split('-')[1]);
                    itemData = this.slots[index];
                } else if (slotType.startsWith('inventory-')) {
                    const index = parseInt(slotType.split('-')[1]);
                    itemData = this.mainSlots[index];
                } else if (slotType.startsWith('craft-')) {
                    const index = parseInt(slotType.split('-')[1]);
                    itemData = this.craftingSlots[index];
                } else if (slotType.startsWith('table-craft-')) {
                    const index = parseInt(slotType.split('-')[2]);
                    itemData = this.tableCraftingSlots[index];
                } else if (slotType === 'furnace-input') {
                    itemData = this.furnaceInput;
                } else if (slotType === 'furnace-fuel') {
                    itemData = this.furnaceFuel;
                } else if (slotType === 'furnace-result') {
                    itemData = this.furnaceResult;
                }

                if (itemData && itemData.type && itemData.count > 0) {
                    // For crafting results, try to add directly to inventory first
                    if ((slotType === 'craft-result' || slotType === 'table-craft-result') && !isRightClick) {
                        const itemToAdd = { ...itemData };
                        
                        if (slotType === 'craft-result') {
                            this.takeFromCraftingResult();
                        } else if (slotType === 'table-craft-result') {
                            this.takeFromTableCraftingResult();
                        }
                        
                        if (this.addItem(itemToAdd.type, itemToAdd.count)) {
                            this.updateAllDisplays();
                            return; // Skip dragging if successfully added to existing stack
                        }
                        
                        // If we couldn't add it to an existing stack, continue with drag and drop
                        this.isDragging = true;
                        this.draggedItem = itemToAdd;
                    } else {
                        this.isDragging = true;

                        if (isRightClick) {
                            this.draggedItem = {
                                type: itemData.type,
                                count: 1
                            };

                            itemData.count -= 1;
                            if (itemData.count === 0) {
                                itemData.type = null;
                            }
                        } else {
                            this.draggedItem = { ...itemData };

                            if (slotType === 'craft-result') {
                                this.takeFromCraftingResult();
                            } else if (slotType === 'table-craft-result') {
                                this.takeFromTableCraftingResult();
                            } else if (slotType === 'furnace-result') {
                                itemData.type = null;
                                itemData.count = 0;
                            } else {
                                itemData.type = null;
                                itemData.count = 0;
                            }
                        }
                    }

                    this.draggedSource = slotType;

                    draggedItemEl.style.backgroundImage = `url('${this.getItemTexture(this.draggedItem.type)}')`;
                    if (this.draggedItem.count > 1) {
                        draggedItemEl.innerHTML = `<div class="item-count">${this.draggedItem.count}</div>`;
                    } else {
                        draggedItemEl.innerHTML = '';
                    }
                    draggedItemEl.style.display = 'block';

                    draggedItemEl.style.left = `${e.clientX - 16}px`;
                    draggedItemEl.style.top = `${e.clientY - 16}px`;

                    this.updateAllDisplays();
                    this.updateFurnaceDisplay();

                    e.preventDefault();
                }
            });

            slot.addEventListener('mouseup', (e) => {
                if (!this.isDragging || !this.draggedItem) return;

                const targetSlotType = slot.getAttribute('data-slot');
                if (!targetSlotType) return;

                if (this.dragButton === 2) {
                    this.completeRightClickTransfer(targetSlotType);
                } else {
                    this.completeItemTransfer(targetSlotType);
                }

                this.isDragging = false;
                this.draggedSource = null;
                this.dragButton = 0;
                draggedItemEl.style.display = 'none';

                e.preventDefault();
            });
        });

        const furnaceSlots = document.querySelectorAll('[data-slot^="furnace-"]');
        furnaceSlots.forEach(slot => {
            
            slot.addEventListener('mouseup', (e) => {
                if (!this.isDragging || !this.draggedItem) return;

                const slotType = slot.getAttribute('data-slot');
                if (!slotType) return;

                if (this.dragButton === 2) {
                    this.completeRightClickTransfer(slotType);
                } else {
                    this.completeItemTransfer(slotType);
                }

                this.isDragging = false;
                this.draggedSource = null;
                this.dragButton = 0;
                draggedItemEl.style.display = 'none';

                e.preventDefault();
            });
        });

        const chestSlots = document.querySelectorAll('.chest-slot');
        chestSlots.forEach(slot => {
            slot.addEventListener('mousedown', (e) => {
                const isRightClick = e.button === 2;
                this.dragButton = e.button;

                if (e.button !== 0 && e.button !== 2) return;

                const slotType = slot.getAttribute('data-slot');
                if (!slotType || !this.currentChestData) return;

                if (slotType.startsWith('chest-')) {
                    const index = parseInt(slotType.split('-')[1]);
                    const itemData = this.currentChestData.inventory[index];
                    
                    if (itemData && itemData.type && itemData.count > 0) {
                        this.isDragging = true;

                        if (isRightClick) {
                            this.draggedItem = {
                                type: itemData.type,
                                count: Math.ceil(itemData.count / 2)
                            };

                            itemData.count = Math.floor(itemData.count / 2);
                            if (itemData.count === 0) {
                                itemData.type = null;
                            }
                        } else {
                            this.draggedItem = { ...itemData };
                            itemData.type = null;
                            itemData.count = 0;
                        }

                        this.draggedSource = slotType;
                        
                        const draggedItemEl = document.getElementById('dragged-item');
                        draggedItemEl.style.backgroundImage = `url('${this.getItemTexture(this.draggedItem.type)}')`;
                        if (this.draggedItem.count > 1) {
                            draggedItemEl.innerHTML = `<div class="item-count">${this.draggedItem.count}</div>`;
                        } else {
                            draggedItemEl.innerHTML = '';
                        }
                        draggedItemEl.style.display = 'block';
                        
                        draggedItemEl.style.left = `${e.clientX - 16}px`;
                        draggedItemEl.style.top = `${e.clientY - 16}px`;
                        
                        this.updateChestDisplay();
                        e.preventDefault();
                    }
                }
            });
            
            slot.addEventListener('mouseup', (e) => {
                if (!this.isDragging || !this.draggedItem || !this.currentChestData) return;

                const targetSlotType = slot.getAttribute('data-slot');
                if (!targetSlotType) return;

                if (targetSlotType.startsWith('chest-')) {
                    const index = parseInt(targetSlotType.split('-')[1]);
                    const targetItem = this.currentChestData.inventory[index];
                    
                    if (this.dragButton === 2) {
                        if (!targetItem.type) {
                            targetItem.type = this.draggedItem.type;
                            targetItem.count = 1;
                            this.draggedItem.count--;
                        }
                        else if (targetItem.type === this.draggedItem.type && targetItem.count < this.maxStackSize) {
                            targetItem.count += 1;
                            this.draggedItem.count--;
                        }
                    } else {
                        if (!targetItem.type) {
                            Object.assign(targetItem, this.draggedItem);
                            this.draggedItem = null;
                        }
                        else if (targetItem.type === this.draggedItem.type && targetItem.count < this.maxStackSize) {
                            const spaceLeft = this.maxStackSize - targetItem.count;
                            const amountToAdd = Math.min(spaceLeft, this.draggedItem.count);
                            
                            targetItem.count += amountToAdd;
                            this.draggedItem.count -= amountToAdd;
                            
                            if (this.draggedItem.count <= 0) {
                                this.draggedItem = null;
                            }
                        }
                        else {
                            const temp = { ...targetItem };
                            Object.assign(targetItem, this.draggedItem);
                            this.draggedItem = temp;
                        }
                    }
                    
                    this.updateChestDisplay();
                }
                
                if (this.draggedItem && this.draggedItem.count > 0) {
                    if (this.dragButton === 2) {
                        this.completeRightClickTransfer(targetSlotType);
                    } else {
                        this.completeItemTransfer(targetSlotType);
                    }
                }
                
                this.isDragging = false;
                this.draggedSource = null;
                this.dragButton = 0;
                document.getElementById('dragged-item').style.display = 'none';
                
                e.preventDefault();
            });
        });
        
        document.addEventListener('mouseup', (e) => {
            if (this.isDragging) {
                if (this.draggedItem && this.draggedSource && this.draggedSource.startsWith('chest-') && this.currentChestData) {
                    const index = parseInt(this.draggedSource.split('-')[1]);
                    const slot = this.currentChestData.inventory[index];
                    
                    if (!slot.type) {
                        slot.type = this.draggedItem.type;
                        slot.count = this.draggedItem.count;
                    } else if (slot.type === this.draggedItem.type) {
                        slot.count += this.draggedItem.count;
                    }
                    
                    this.updateChestDisplay();
                } else {
                    this.returnItemToSource();
                }
                
                this.isDragging = false;
                this.draggedItem = null;
                document.getElementById('dragged-item').style.display = 'none';
                
                this.updateAllDisplays();
            }
        });

        document.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.inventory-slot, .hotbar-slot, .crafting-slot, .crafting-result, [data-slot^="furnace-"], .chest-slot')) {
                e.preventDefault();
            }
        });
    }

    completeRightClickTransfer(targetSlotType) {
        if (!this.draggedItem) return;

        let targetItem;
        if (targetSlotType.startsWith('hotbar-')) {
            const index = parseInt(targetSlotType.split('-')[1]);
            targetItem = this.slots[index];
        } else if (targetSlotType.startsWith('inventory-')) {
            const index = parseInt(targetSlotType.split('-')[1]);
            targetItem = this.mainSlots[index];
        } else if (targetSlotType.startsWith('craft-') && targetSlotType !== 'craft-result') {
            const index = parseInt(targetSlotType.split('-')[1]);
            targetItem = this.craftingSlots[index];
        } else if (targetSlotType.startsWith('table-craft-') && targetSlotType !== 'table-craft-result') {
            const index = parseInt(targetSlotType.split('-')[2]);
            targetItem = this.tableCraftingSlots[index];
        } else if (targetSlotType === 'craft-result' || targetSlotType === 'table-craft-result' || targetSlotType === 'furnace-result') {
            this.returnItemToSource();
            return;
        } else if (targetSlotType === 'furnace-input') {
            if (!this.getSmeltingRecipe(this.draggedItem.type)) {
                this.returnItemToSource();
                return;
            }
            targetItem = this.furnaceInput;
        } else if (targetSlotType === 'furnace-fuel') {
            if (!this.fuelTypes[this.draggedItem.type]) {
                this.returnItemToSource();
                return;
            }
            targetItem = this.furnaceFuel;
        } else {
            this.returnItemToSource();
            return;
        }

        if (!targetItem) {
            this.returnItemToSource();
            return;
        }

        if (!targetItem.type) {
            targetItem.type = this.draggedItem.type;
            targetItem.count = 1;
            this.draggedItem.count--;
        }
        else if (targetItem.type === this.draggedItem.type && targetItem.count < this.maxStackSize) {
            targetItem.count += 1;
            this.draggedItem.count--;
        }

        if (this.draggedItem.count <= 0) {
            this.draggedItem = null;
        }

        this.updateAllDisplays();
        this.updateFurnaceDisplay();

        this.checkCraftingRecipe();
        this.checkTableCraftingRecipe();

        if (document.getElementById('crafting-table-screen').style.display === 'flex') {
            this.updateQuickCraftSidebar();
        }

        this.checkContinueSmelting();

        if (targetSlotType.startsWith('hotbar-')) {
            if (this._onItemChange) {
                this._onItemChange();
            }
        }
    }

    takeFromCraftingResult() {
        if (!this.craftingResult.type || this.craftingResult.count <= 0) return;
        
        for (let i = 0; i < this.craftingSlots.length; i++) {
            if (this.craftingSlots[i].type && this.craftingSlots[i].count > 0) {
                this.craftingSlots[i].count--;
                if (this.craftingSlots[i].count <= 0) {
                    this.craftingSlots[i].type = null;
                }
            }
        }
        
        this.checkCraftingRecipe();
    }

    takeFromTableCraftingResult() {
        if (!this.tableCraftingResult.type || this.tableCraftingResult.count <= 0) return;
        
        for (let i = 0; i < this.tableCraftingSlots.length; i++) {
            if (this.tableCraftingSlots[i].type && this.tableCraftingSlots[i].count > 0) {
                this.tableCraftingSlots[i].count--;
                if (this.tableCraftingSlots[i].count <= 0) {
                    this.tableCraftingSlots[i].type = null;
                }
            }
        }
        
        this.checkTableCraftingRecipe();
        
        this.updateQuickCraftSidebar();
    }

    completeItemTransfer(targetSlotType) {
        if (!this.draggedItem) return;

        let targetItem;
        if (targetSlotType.startsWith('hotbar-')) {
            const index = parseInt(targetSlotType.split('-')[1]);
            targetItem = this.slots[index];
        } else if (targetSlotType.startsWith('inventory-')) {
            const index = parseInt(targetSlotType.split('-')[1]);
            targetItem = this.mainSlots[index];
        } else if (targetSlotType.startsWith('craft-') && targetSlotType !== 'craft-result') {
            const index = parseInt(targetSlotType.split('-')[1]);
            targetItem = this.craftingSlots[index];
        } else if (targetSlotType.startsWith('table-craft-') && targetSlotType !== 'table-craft-result') {
            const index = parseInt(targetSlotType.split('-')[2]);
            targetItem = this.tableCraftingSlots[index];
        } else if (targetSlotType === 'craft-result' || targetSlotType === 'table-craft-result' || targetSlotType === 'furnace-result') {
            this.returnItemToSource();
            return;
        } else if (targetSlotType === 'furnace-input') {
            if (!this.getSmeltingRecipe(this.draggedItem.type)) {
                this.returnItemToSource();
                return;
            }
            targetItem = this.furnaceInput;
        } else if (targetSlotType === 'furnace-fuel') {
            if (!this.fuelTypes[this.draggedItem.type]) {
                this.returnItemToSource();
                return;
            }
            targetItem = this.furnaceFuel;
        } else {
            this.returnItemToSource();
            return;
        }

        if (!targetItem) {
            this.returnItemToSource();
            return;
        }

        if (!targetItem.type) {
            Object.assign(targetItem, this.draggedItem);
            this.draggedItem = null;
        }
        else if (targetItem.type === this.draggedItem.type && targetItem.count < this.maxStackSize) {
            const spaceLeft = this.maxStackSize - targetItem.count;
            const amountToAdd = Math.min(spaceLeft, this.draggedItem.count);

            targetItem.count += amountToAdd;
            this.draggedItem.count -= amountToAdd;

            if (this.draggedItem.count > 0) {
                this.returnItemToSource();
            }
        }
        else {
            const temp = { ...targetItem };
            Object.assign(targetItem, this.draggedItem);
            this.draggedItem = temp;
            this.returnItemToSource();
        }

        this.updateAllDisplays();
        this.updateFurnaceDisplay();

        this.checkCraftingRecipe();
        this.checkTableCraftingRecipe();

        this.checkContinueSmelting();

        if (document.getElementById('crafting-table-screen').style.display === 'flex') {
            this.updateQuickCraftSidebar();
        }

        if (targetSlotType.startsWith('hotbar-')) {
            if (this._onItemChange) {
                this._onItemChange();
            }
        }
    }

    selectSlot(index) {
        document.getElementById(`slot-${this.selectedSlot}`).classList.remove('selected');

        this.selectedSlot = index;

        document.getElementById(`slot-${this.selectedSlot}`).classList.add('selected');

        const inventorySlot = document.querySelector(`#inventory-hotbar [data-slot="hotbar-${index}"]`);
        if (inventorySlot) {
            const allInventorySlots = document.querySelectorAll('#inventory-hotbar .inventory-slot');
            allInventorySlots.forEach(slot => slot.classList.remove('selected'));
            inventorySlot.classList.add('selected');
        }

        if (this._onItemChange) {
            this._onItemChange();
        }
    }

    toggleInventory() {
        const inventoryScreen = document.getElementById('inventory-screen');
        const isVisible = inventoryScreen.style.display === 'flex';

        if (isVisible) {
            this.closeInventory();
            
            if (window.controls && !window.controls.isLocked) {
                setTimeout(() => {
                    try {
                        window.controls.lock();
                    } catch (e) {
                        console.error('Could not lock controls:', e);
                    }
                }, 100);
            }
        } else {
            this.openInventory();
        }
    }

    openInventory() {
        const inventoryScreen = document.getElementById('inventory-screen');
        inventoryScreen.style.display = 'flex';

        if (window.controls && window.controls.isLocked) {
            window.controls.unlock();
        }

        this.updateAllDisplays();
    }

    closeInventory() {
        const inventoryScreen = document.getElementById('inventory-screen');
        inventoryScreen.style.display = 'none';

        this.isDragging = false;
        this.draggedItem = null;
        document.getElementById('dragged-item').style.display = 'none';
        
        const pauseMenu = document.getElementById('pause-menu');
        if (pauseMenu && pauseMenu.style.display === 'flex') {
            pauseMenu.style.display = 'none';
        }
    }

    openCraftingTable() {
        const craftingTableScreen = document.getElementById('crafting-table-screen');
        craftingTableScreen.style.display = 'flex';

        if (window.controls && window.controls.isLocked) {
            window.controls.unlock();
        }

        this.updateAllDisplays();
        this.updateCraftingTableDisplay();

        this.updateQuickCraftSidebar();
    }

    closeCraftingTable() {
        const craftingTableScreen = document.getElementById('crafting-table-screen');
        craftingTableScreen.style.display = 'none';

        this.returnCraftingTableItems();

        this.isDragging = false;
        this.draggedItem = null;
        document.getElementById('dragged-item').style.display = 'none';
    }

    returnCraftingTableItems() {
        for (let i = 0; i < this.tableCraftingSlots.length; i++) {
            const slot = this.tableCraftingSlots[i];
            if (slot.type && slot.count > 0) {
                for (let j = 0; j < slot.count; j++) {
                    this.addItem(slot.type);
                }
                slot.type = null;
                slot.count = 0;
            }
        }
    }

    openFurnace() {
        const furnaceScreen = document.getElementById('furnace-screen');
        furnaceScreen.style.display = 'flex';

        if (window.controls && window.controls.isLocked) {
            window.controls.unlock();
        }

        this.updateAllDisplays();
        this.updateFurnaceDisplay();
    }

    closeFurnace() {
        const furnaceScreen = document.getElementById('furnace-screen');
        furnaceScreen.style.display = 'none';

        this.returnFurnaceItems();

        this.currentFurnacePos = null;

        this.isDragging = false;
        this.draggedItem = null;
        document.getElementById('dragged-item').style.display = 'none';
    }

    returnFurnaceItems() {
        if (this.furnaceInput.type && this.furnaceInput.count > 0) {
            this.addItem(this.furnaceInput.type, this.furnaceInput.count);
            this.furnaceInput = { type: null, count: 0 };
        }

        if (this.furnaceFuel.type && this.furnaceFuel.count > 0) {
            this.addItem(this.furnaceFuel.type, this.furnaceFuel.count);
            this.furnaceFuel = { type: null, count: 0 };
        }

        if (this.furnaceResult.type && this.furnaceResult.count > 0) {
            this.addItem(this.furnaceResult.type, this.furnaceResult.count);
            this.furnaceResult = { type: null, count: 0 };
        }
    }

    openChest(chestData) {
        this.currentChestData = chestData;
        document.getElementById('chest-screen').style.display = 'flex';
        
        if (window.controls && window.controls.isLocked) {
            window.controls.unlock();
        }
        
        this.updateChestDisplay();
        this.updateAllDisplays();
    }

    closeChest() {
        document.getElementById('chest-screen').style.display = 'none';
        this.currentChestData = null;
        
        this.isDragging = false;
        this.draggedItem = null;
        document.getElementById('dragged-item').style.display = 'none';
    }

    updateChestDisplay() {
        if (!this.currentChestData) return;
        
        for (let i = 0; i < 27; i++) {
            const slotElement = document.querySelector(`[data-slot="chest-${i}"]`);
            if (!slotElement) continue;
            
            slotElement.innerHTML = '';
            
            const itemData = this.currentChestData.inventory[i];
            if (itemData && itemData.type && itemData.count > 0) {
                const item = document.createElement('div');
                item.className = 'item-stack';
                item.style.backgroundImage = `url('${this.getItemTexture(itemData.type)}')`;
                
                if (itemData.count > 1) {
                    const count = document.createElement('div');
                    count.className = 'item-count';
                    count.textContent = itemData.count;
                    item.appendChild(count);
                }
                
                slotElement.appendChild(item);
            }
        }
        
        for (let i = 0; i < this.mainSlots.length; i++) {
            const slot = document.querySelector(`#chest-player-inventory [data-slot="inventory-${i}"]`);
            if (!slot) continue;
            
            slot.innerHTML = '';
            
            const itemData = this.mainSlots[i];
            if (itemData.type && itemData.count > 0) {
                const item = document.createElement('div');
                item.className = 'item-stack';
                item.style.backgroundImage = `url('${this.getItemTexture(itemData.type)}')`;
                
                if (itemData.count > 1) {
                    const count = document.createElement('div');
                    count.className = 'item-count';
                    count.textContent = itemData.count;
                    item.appendChild(count);
                }
                
                slot.appendChild(item);
            }
        }
        
        for (let i = 0; i < this.slots.length; i++) {
            const slot = document.querySelector(`#chest-player-hotbar [data-slot="hotbar-${i}"]`);
            if (!slot) continue;
            
            slot.innerHTML = '';
            
            const itemData = this.slots[i];
            if (itemData.type && itemData.count > 0) {
                const item = document.createElement('div');
                item.className = 'item-stack';
                item.style.backgroundImage = `url('${this.getItemTexture(itemData.type)}')`;
                
                if (itemData.count > 1) {
                    const count = document.createElement('div');
                    count.className = 'item-count';
                    count.textContent = itemData.count;
                    item.appendChild(count);
                }
                
                slot.appendChild(item);
            }
            
            if (i === this.selectedSlot) {
                slot.classList.add('selected');
            } else {
                slot.classList.remove('selected');
            }
        }
    }

    setupCraftingRecipes() {
        Promise.all([
            import('./craftingRecipes.js'),
            import('./pickaxes.js')
        ]).then(([craftingRecipes, pickaxesModule]) => {
            // Initialize recipe arrays
            this.recipes = [...craftingRecipes.BASIC_RECIPES];
            this.recipes.push(...pickaxesModule.PICKAXE_RECIPES);
            
            this.tableRecipes = [...craftingRecipes.TABLE_RECIPES];
            this.tableRecipes.push(...pickaxesModule.PICKAXE_TABLE_RECIPES);
            
            this.smeltingRecipes = [...craftingRecipes.SMELTING_RECIPES];
            this.fuelTypes = {...craftingRecipes.FUEL_TYPES};
            
            // Load any custom block recipes
            try {
                const customBlocks = JSON.parse(localStorage.getItem('minecraft_custom_blocks') || '[]');
                customBlocks.forEach(block => {
                    if (block.recipe && block.recipe.some(item => item !== null)) {
                        this.tableRecipes.push({
                            pattern: block.recipe,
                            result: { type: block.id, count: 1 },
                            needsExactMatch: true,
                            displayName: block.name,
                            ingredients: ['Custom Recipe']
                        });
                    }
                });
            } catch (error) {
                console.error('Error loading custom block recipes:', error);
            }
        }).catch(error => {
            console.error('Error setting up crafting recipes:', error);
        });
    }

    setupSmeltingRecipes() {
        import('./craftingRecipes.js').then(craftingRecipes => {
            this.smeltingRecipes = [...craftingRecipes.SMELTING_RECIPES];
            this.fuelTypes = {...craftingRecipes.FUEL_TYPES};
        });
    }

    checkCraftingRecipe() {
        const ingredients = this.craftingSlots.map(slot => slot.type);

        if (ingredients.every(type => !type)) {
            this.craftingResult = { type: null, count: 0 };
            this.updateCraftingResult();
            return;
        }

        for (const recipe of this.recipes) {
            if (this.recipeMatches(ingredients, recipe.pattern, recipe.needsExactMatch)) {
                this.craftingResult = { ...recipe.result };
                this.updateCraftingResult();
                return;
            }
        }

        this.craftingResult = { type: null, count: 0 };
        this.updateCraftingResult();
    }

    checkTableCraftingRecipe() {
        const ingredients = this.tableCraftingSlots.map(slot => slot.type);

        if (ingredients.every(type => !type)) {
            this.tableCraftingResult = { type: null, count: 0 };
            this.updateTableCraftingResult();
            return;
        }

        for (const recipe of this.tableRecipes) {
            if (this.tableRecipeMatches(ingredients, recipe.pattern, recipe.needsExactMatch)) {
                this.tableCraftingResult = { ...recipe.result };
                this.updateTableCraftingResult();
                return;
            }
        }

        this.tableCraftingResult = { type: null, count: 0 };
        this.updateTableCraftingResult();
    }

    recipeMatches(ingredients, pattern, needsExactMatch) {
        if (!needsExactMatch) {
            const woodCount = ingredients.filter(type => type === 'wood').length;

            if (pattern.includes('wood') && pattern.filter(p => p !== null).length === 1) {
                return woodCount === 1 && ingredients.filter(type => type !== null && type !== 'wood').length === 0;
            }
        }

        if (needsExactMatch) {
            for (let i = 0; i < pattern.length; i++) {
                if (pattern[i] !== ingredients[i]) {
                    return false;
                }
            }
            return true;
        } else {
            for (let i = 0; i < pattern.length; i++) {
                if (pattern[i] === null) continue;

                if (ingredients[i] !== pattern[i]) {
                    return false;
                }
            }
            return true;
        }
    }

    tableRecipeMatches(ingredients, pattern, needsExactMatch) {
        if (needsExactMatch) {
            for (let i = 0; i < pattern.length; i++) {
                if (pattern[i] !== ingredients[i]) {
                    return false;
                }
            }
            return true;
        } else {
            for (let i = 0; i < pattern.length; i++) {
                if (pattern[i] === null) continue;

                if (ingredients[i] !== pattern[i]) {
                    return false;
                }
            }
            return true;
        }
    }

    updateCraftingResult() {
        const resultSlot = document.querySelector('[data-slot="craft-result"]');
        resultSlot.innerHTML = '';

        if (this.craftingResult.type && this.craftingResult.count > 0) {
            const item = document.createElement('div');
            item.className = 'item-stack';
            item.style.backgroundImage = `url('${this.getItemTexture(this.craftingResult.type)}')`;

            if (this.craftingResult.count > 1) {
                const count = document.createElement('div');
                count.className = 'item-count';
                count.textContent = this.craftingResult.count;
                item.appendChild(count);
            }

            resultSlot.appendChild(item);
        }
    }

    updateTableCraftingResult() {
        const resultSlot = document.querySelector('[data-slot="table-craft-result"]');
        if (!resultSlot) return;

        resultSlot.innerHTML = '';

        if (this.tableCraftingResult.type && this.tableCraftingResult.count > 0) {
            const item = document.createElement('div');
            item.className = 'item-stack';
            item.style.backgroundImage = `url('${this.getItemTexture(this.tableCraftingResult.type)}')`;

            if (this.tableCraftingResult.count > 1) {
                const count = document.createElement('div');
                count.className = 'item-count';
                count.textContent = this.tableCraftingResult.count;
                item.appendChild(count);
            }

            resultSlot.appendChild(item);
        }
    }

    updateFurnaceDisplay() {
        const inputSlot = document.querySelector('[data-slot="furnace-input"]');
        inputSlot.innerHTML = '';

        if (this.furnaceInput.type && this.furnaceInput.count > 0) {
            const item = document.createElement('div');
            item.className = 'item-stack';
            item.style.backgroundImage = `url('${this.getItemTexture(this.furnaceInput.type)}')`;

            if (this.furnaceInput.count > 1) {
                const count = document.createElement('div');
                count.className = 'item-count';
                count.textContent = this.furnaceInput.count;
                item.appendChild(count);
            }

            inputSlot.appendChild(item);
        }

        const fuelSlot = document.querySelector('[data-slot="furnace-fuel"]');
        fuelSlot.innerHTML = '';

        if (this.furnaceFuel.type && this.furnaceFuel.count > 0) {
            const item = document.createElement('div');
            item.className = 'item-stack';
            item.style.backgroundImage = `url('${this.getItemTexture(this.furnaceFuel.type)}')`;

            if (this.furnaceFuel.count > 1) {
                const count = document.createElement('div');
                count.className = 'item-count';
                count.textContent = this.furnaceFuel.count;
                item.appendChild(count);
            }

            fuelSlot.appendChild(item);
        }

        const resultSlot = document.querySelector('[data-slot="furnace-result"]');
        resultSlot.innerHTML = '';

        if (this.furnaceResult.type && this.furnaceResult.count > 0) {
            const item = document.createElement('div');
            item.className = 'item-stack';
            item.style.backgroundImage = `url('${this.getItemTexture(this.furnaceResult.type)}')`;

            if (this.furnaceResult.count > 1) {
                const count = document.createElement('div');
                count.className = 'item-count';
                count.textContent = this.furnaceResult.count;
                item.appendChild(count);
            }

            resultSlot.appendChild(item);
        }

        for (let i = 0; i < this.mainSlots.length; i++) {
            this.updateFurnaceInventorySlotUI(i);
        }

        for (let i = 0; i < this.slots.length; i++) {
            this.updateFurnaceHotbarUI(i);
        }

        const fireIcon = document.querySelector('.furnace-fire');
        if (fireIcon) {
            if (this.furnaceActive && this.burnTimeLeft > 0) {
                fireIcon.textContent = '';
                fireIcon.style.opacity = '1';
                fireIcon.classList.add('active');
                
                const burnProgress = this.burnTimeLeft / this.maxBurnTime;
                fireIcon.style.background = `linear-gradient(to top, #ff7700 ${burnProgress * 100}%, #333333 ${burnProgress * 100}%)`;
            } else {
                fireIcon.textContent = '';
                fireIcon.style.opacity = '0.3';
                fireIcon.classList.remove('active');
                fireIcon.style.background = '#333333';
            }
        }

        const timerElement = document.querySelector('.furnace-timer');
        if (timerElement) {
            if (this.furnaceActive && this.smeltProgress > 0) {
                const timeLeft = (this.maxSmeltTime - this.smeltProgress).toFixed(1);
                const fuelLeft = this.burnTimeLeft.toFixed(1);
                timerElement.innerHTML = `Smelting: ${timeLeft}s<br>Fuel: ${fuelLeft}s`;
                timerElement.style.display = 'block';
            } else if (this.burnTimeLeft > 0) {
                const fuelLeft = this.burnTimeLeft.toFixed(1);
                timerElement.innerHTML = `Fuel: ${fuelLeft}s`;
                timerElement.style.display = 'block';
            } else {
                timerElement.style.display = 'none';
            }
        }

        const arrow = document.querySelector('.crafting-arrow');
        if (this.furnaceActive && this.smeltProgress > 0) {
            const progressPercent = (this.smeltProgress / this.maxSmeltTime) * 100;
            arrow.style.background = `linear-gradient(to right, #4CAF50 ${progressPercent}%, transparent ${progressPercent}%, transparent 100%)`;
            arrow.style.color = '#4CAF50';
        } else {
            arrow.style.background = 'none';
            arrow.style.color = '#bbbbbb';
        }
    }

    updateFurnaceInventorySlotUI(index) {
        const slot = document.querySelector(`#furnace-inventory [data-slot="inventory-${index}"]`);
        if (!slot) return;

        slot.innerHTML = '';

        const itemData = this.mainSlots[index];
        if (itemData.type && itemData.count > 0) {
            const item = document.createElement('div');
            item.className = 'item-stack';
            item.style.backgroundImage = `url('${this.getItemTexture(itemData.type)}')`;

            if (itemData.count > 1) {
                const count = document.createElement('div');
                count.className = 'item-count';
                count.textContent = itemData.count;
                item.appendChild(count);
            }

            slot.appendChild(item);
        }
    }

    updateFurnaceHotbarUI(index) {
        const slot = document.querySelector(`#furnace-hotbar [data-slot="hotbar-${index}"]`);
        if (!slot) return;

        slot.innerHTML = '';

        const itemData = this.slots[index];
        if (itemData.type && itemData.count > 0) {
            const item = document.createElement('div');
            item.className = 'item-stack';
            item.style.backgroundImage = `url('${this.getItemTexture(itemData.type)}')`;

            if (itemData.count > 1) {
                const count = document.createElement('div');
                count.className = 'item-count';
                count.textContent = itemData.count;
                item.appendChild(count);
            }

            slot.appendChild(item);
        }

        if (index === this.selectedSlot) {
            slot.classList.add('selected');
        } else {
            slot.classList.remove('selected');
        }
    }

    updateAllDisplays() {
        for (let i = 0; i < this.slots.length; i++) {
            this.updateSlotUI(i);
            this.updateInventoryHotbarUI(i);
        }

        for (let i = 0; i < this.mainSlots.length; i++) {
            this.updateInventorySlotUI(i);
        }

        for (let i = 0; i < this.craftingSlots.length; i++) {
            this.updateCraftingSlotUI(i);
        }

        this.updateCraftingResult();

        if (document.getElementById('crafting-table-screen').style.display === 'flex') {
            this.updateCraftingTableDisplay();
        }

        if (document.getElementById('furnace-screen').style.display === 'flex') {
            this.updateFurnaceDisplay();
        }

        if (document.getElementById('chest-screen').style.display === 'flex') {
            this.updateChestDisplay();
        }
    }

    updateCraftingTableDisplay() {
        for (let i = 0; i < this.tableCraftingSlots.length; i++) {
            this.updateTableCraftingSlotUI(i);
        }

        this.updateTableCraftingResult();

        for (let i = 0; i < this.mainSlots.length; i++) {
            this.updateCraftingTableInventorySlotUI(i);
        }

        for (let i = 0; i < this.slots.length; i++) {
            this.updateCraftingTableHotbarUI(i);
        }

        this.updateQuickCraftSidebar();
    }

    updateCraftingTableInventorySlotUI(index) {
        const slot = document.querySelector(`#crafting-table-inventory [data-slot="inventory-${index}"]`);
        if (!slot) return;

        slot.innerHTML = '';

        const itemData = this.mainSlots[index];
        if (itemData.type && itemData.count > 0) {
            const item = document.createElement('div');
            item.className = 'item-stack';
            item.style.backgroundImage = `url('${this.getItemTexture(itemData.type)}')`;

            if (itemData.count > 1) {
                const count = document.createElement('div');
                count.className = 'item-count';
                count.textContent = itemData.count;
                item.appendChild(count);
            }

            slot.appendChild(item);
        }
    }

    updateCraftingTableHotbarUI(index) {
        const slot = document.querySelector(`#crafting-table-hotbar [data-slot="hotbar-${index}"]`);
        if (!slot) return;

        slot.innerHTML = '';

        const itemData = this.slots[index];
        if (itemData.type && itemData.count > 0) {
            const item = document.createElement('div');
            item.className = 'item-stack';
            item.style.backgroundImage = `url('${this.getItemTexture(itemData.type)}')`;

            if (itemData.count > 1) {
                const count = document.createElement('div');
                count.className = 'item-count';
                count.textContent = itemData.count;
                item.appendChild(count);
            }

            slot.appendChild(item);
        }

        if (index === this.selectedSlot) {
            slot.classList.add('selected');
        } else {
            slot.classList.remove('selected');
        }
    }

    updateQuickCraftSidebar() {
        const quickCraftList = document.getElementById('quick-craft-list');
        if (!quickCraftList) return;

        quickCraftList.innerHTML = '';

        const availableItems = {};

        [...this.slots, ...this.mainSlots].forEach(slot => {
            if (slot.type && slot.count > 0) {
                if (!availableItems[slot.type]) {
                    availableItems[slot.type] = 0;
                }
                availableItems[slot.type] += slot.count;
            }
        });

        const craftableRecipes = [];

        for (const recipe of this.tableRecipes) {
            const tempAvailable = { ...availableItems };
            let canCraft = true;

            const requiredItems = {};
            recipe.pattern.forEach(item => {
                if (item) {
                    if (!requiredItems[item]) {
                        requiredItems[item] = 0;
                    }
                    requiredItems[item]++;
                }
            });

            for (const [itemType, count] of Object.entries(requiredItems)) {
                if (!tempAvailable[itemType] || tempAvailable[itemType] < count) {
                    canCraft = false;
                    break;
                }
            }

            if (canCraft) {
                if (!craftableRecipes.some(r => r.result.type === recipe.result.type)) {
                    craftableRecipes.push(recipe);
                }
            }
        }

        craftableRecipes.forEach(recipe => {
            const recipeItem = document.createElement('div');
            recipeItem.className = 'quick-craft-item';

            const resultIcon = document.createElement('div');
            resultIcon.className = 'quick-craft-icon';
            resultIcon.style.backgroundImage = `url('${this.getItemTexture(recipe.result.type)}')`;

            const recipeInfo = document.createElement('div');
            recipeInfo.className = 'quick-craft-info';

            const recipeName = document.createElement('div');
            recipeName.className = 'quick-craft-name';
            recipeName.textContent = recipe.displayName;

            const recipeIngredients = document.createElement('div');
            recipeIngredients.className = 'quick-craft-ingredients';
            recipeIngredients.textContent = recipe.ingredients.join(', ');

            recipeInfo.appendChild(recipeName);
            recipeInfo.appendChild(recipeIngredients);

            recipeItem.appendChild(resultIcon);
            recipeItem.appendChild(recipeInfo);

            recipeItem.addEventListener('click', () => {
                this.autoFillCraftingGrid(recipe);
            });

            quickCraftList.appendChild(recipeItem);
        });

        if (craftableRecipes.length === 0) {
            const noRecipes = document.createElement('div');
            noRecipes.className = 'no-recipes';
            noRecipes.textContent = 'No recipes available with current items';
            quickCraftList.appendChild(noRecipes);
        }
    }

    autoFillCraftingGrid(recipe) {
        for (let i = 0; i < this.tableCraftingSlots.length; i++) {
            if (this.tableCraftingSlots[i].count > 0) {
                this.addItem(this.tableCraftingSlots[i].type, this.tableCraftingSlots[i].count);
                this.tableCraftingSlots[i].type = null;
                this.tableCraftingSlots[i].count = 0;
            }
        }

        for (let i = 0; i < recipe.pattern.length; i++) {
            if (recipe.pattern[i]) {
                if (this.removeItemFromInventory(recipe.pattern[i])) {
                    this.tableCraftingSlots[i].type = recipe.pattern[i];
                    this.tableCraftingSlots[i].count = 1;
                }
            }
        }

        this.checkTableCraftingRecipe();
        this.updateCraftingTableDisplay();
        this.updateQuickCraftSidebar();
    }

    removeItemFromInventory(itemType) {
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i].type === itemType && this.slots[i].count > 0) {
                this.slots[i].count--;
                if (this.slots[i].count === 0) {
                    this.slots[i].type = null;
                }
                return true;
            }
        }

        for (let i = 0; i < this.mainSlots.length; i++) {
            if (this.mainSlots[i].type === itemType && this.mainSlots[i].count > 0) {
                this.mainSlots[i].count--;
                if (this.mainSlots[i].count === 0) {
                    this.mainSlots[i].type = null;
                }
                return true;
            }
        }

        return false;
    }

    updateFurnace(deltaTime) {
        if (!this.furnaceActive) {
            if (this.furnaceInput.type && this.furnaceInput.count > 0 &&
                this.furnaceFuel.type && this.furnaceFuel.count > 0) {

                const recipe = this.getSmeltingRecipe(this.furnaceInput.type);
                if (recipe) {
                    if (!this.furnaceResult.type ||
                        (this.furnaceResult.type === recipe.result && this.furnaceResult.count + recipe.count <= this.maxStackSize)) {

                        this.furnaceActive = true;

                        if (this.burnTimeLeft <= 0) {
                            this.consumeFuel();
                        }
                    }
                }
            }
        }

        if (this.furnaceActive) {
            if (this.burnTimeLeft > 0) {
                this.burnTimeLeft -= deltaTime;

                this.smeltProgress += deltaTime;

                if (this.smeltProgress >= this.maxSmeltTime) {
                    this.completeSmelting();

                    this.smeltProgress = 0;

                    this.checkContinueSmelting();
                }
            } else {
                if (this.furnaceFuel.type && this.furnaceFuel.count > 0) {
                    this.consumeFuel();
                } else {
                    this.furnaceActive = false;
                    if (this.furnaceInput.type && this.furnaceInput.count > 0) {
                        this.showFuelNeededIndicator();
                    }
                }
            }

            if (document.getElementById('furnace-screen').style.display === 'flex') {
                this.updateFurnaceDisplay();
            }
        }
    }

    getSmeltingRecipe(inputType) {
        for (const recipe of this.smeltingRecipes) {
            if (recipe.input === inputType) {
                return recipe;
            }
        }
        return null;
    }

    consumeFuel() {
        if (!this.furnaceFuel.type || this.furnaceFuel.count <= 0) return false;

        const burnTime = this.fuelTypes[this.furnaceFuel.type];
        if (!burnTime) return false;

        this.furnaceFuel.count--;
        if (this.furnaceFuel.count === 0) {
            this.furnaceFuel.type = null;
        }

        this.burnTimeLeft = burnTime;
        this.maxBurnTime = burnTime;

        return true;
    }

    completeSmelting() {
        if (!this.furnaceInput.type || this.furnaceInput.count <= 0) return false;

        const recipe = this.getSmeltingRecipe(this.furnaceInput.type);
        if (!recipe) return false;

        this.furnaceInput.count--;
        if (this.furnaceInput.count === 0) {
            this.furnaceInput.type = null;
        }

        if (!this.furnaceResult.type) {
            this.furnaceResult.type = recipe.result;
            this.furnaceResult.count = recipe.count;
        } else if (this.furnaceResult.type === recipe.result) {
            this.furnaceResult.count += recipe.count;
        }

        this.playSmeltingCompleteSound();

        return true;
    }

    checkContinueSmelting() {
        if (!this.furnaceInput.type || this.furnaceInput.count <= 0) {
            this.furnaceActive = false;
            return;
        }

        const recipe = this.getSmeltingRecipe(this.furnaceInput.type);
        if (!recipe) {
            this.furnaceActive = false;
            return;
        }

        if (this.furnaceResult.type && this.furnaceResult.type !== recipe.result) {
            this.furnaceActive = false;
            return;
        }

        if (this.furnaceResult.count + recipe.count > this.maxStackSize) {
            this.furnaceActive = false;
            return;
        }

        if (this.burnTimeLeft <= 0 &&
            (!this.furnaceFuel.type || this.furnaceFuel.count <= 0)) {
            this.furnaceActive = false;
            return;
        }

        this.furnaceActive = true;
    }

    onItemDrop(blockType) {
    }

    addItem(itemType, count = 1) {
        if (!itemType) return false;
        
        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i].type === itemType && 
                this.slots[i].count + count <= this.maxStackSize) {
                this.slots[i].count += count;
                this.updateSlotUI(i);
                this.updateInventoryHotbarUI(i);
                
                if (i === this.selectedSlot && this._onItemChange) {
                    this._onItemChange();
                }
                
                return true;
            }
        }
        
        for (let i = 0; i < this.mainSlots.length; i++) {
            if (this.mainSlots[i].type === itemType && 
                this.mainSlots[i].count + count <= this.maxStackSize) {
                this.mainSlots[i].count += count;
                this.updateInventorySlotUI(i);
                return true;
            }
        }
        
        for (let i = 0; i < this.slots.length; i++) {
            if (!this.slots[i].type) {
                this.slots[i].type = itemType;
                this.slots[i].count = count;
                this.updateSlotUI(i);
                this.updateInventoryHotbarUI(i);
                
                if (i === this.selectedSlot && this._onItemChange) {
                    this._onItemChange();
                }
                
                return true;
            }
        }
        
        for (let i = 0; i < this.mainSlots.length; i++) {
            if (!this.mainSlots[i].type) {
                this.mainSlots[i].type = itemType;
                this.mainSlots[i].count = count;
                this.updateInventorySlotUI(i);
                return true;
            }
        }
        
        return false;
    }

    getItemTexture(blockType) {
        switch(blockType) {
            case 'dirt': return '../images/dirt.png';
            case 'stone': return '../images/stone.png';
            case 'smoothstone': return '../images/smoothstone.png';
            case 'cobble': return '../images/cobbles.png';
            case 'wood': return '../images/logtopbottom.png';
            case 'birchwood': return '../images/birchlogside.png';
            case 'leaves': return '../images/leaves.png';
            case 'birchleaves': return '../images/birchleaves.png';
            case 'plank': return '../images/plank.png';
            case 'birchplank': return '../images/birchplank.png';
            case 'craftingtable': return '../images/cftopbottom.png';
            case 'oakdoor': return '../images/door.png';
            case 'birchdoor': return '../images/birchdoor.png';
            case 'sand': return '../images/sand.png';
            case 'sandstone': return '../images/sandstone.png';
            case 'cacti': return '../images/cacti.png';
            case 'furnace': return '../images/furnaceunlit.png';
            case 'glass': return '../images/glass.png';
            case 'snow': return '../images/snow.png';
            case 'stick': return '../images/stick.png';
            case 'oakslab': return '../images/plank.png';
            case 'birchslab': return '../images/birchplank.png';
            case 'chest': return '../images/chestfront.png';
            case 'woodpickaxe': return '../images/woodpickaxe.png';
            case 'stonepickaxe': return '../images/stonepickaxe.png';
            case 'woodhoe': return '../images/woodhoe.png'; 
            case 'farmland': return '../images/farmland.png';
            case 'seeds': return '../images/seeds.png';
            case 'haybale': return '../images/haybaletopbottom.png';
            case 'wheat': return '../images/wheat.png';
            case 'newglass': return '../images/newglass.png';
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
        
        if (this.textureCache[blockType]) {
            return this.textureCache[blockType];
        }
        
        const img = new Image();
        img.src = this.getItemTexture(blockType);
        this.textureCache[blockType] = img;
        
        return img.src;
    }

    getInventoryData() {
        return {
            slots: this.slots,
            mainSlots: this.mainSlots,
            selectedSlot: this.selectedSlot
        };
    }

    loadFromData(inventoryData) {
        if (inventoryData && inventoryData.slots) {
            this.slots = inventoryData.slots;
            this.selectedSlot = inventoryData.selectedSlot || 0;

            if (inventoryData.mainSlots) {
                this.mainSlots = inventoryData.mainSlots;
            }

            this.updateAllDisplays();

            this.selectSlot(this.selectedSlot);

            return true;
        }
        return false;
    }

    saveInventory() {
    }

    loadInventory() {
        for (let i = 0; i < this.slots.length; i++) {
            this.slots[i] = { type: null, count: 0 };
            this.updateSlotUI(i);
        }

        for (let i = 0; i < this.mainSlots.length; i++) {
            this.mainSlots[i] = { type: null, count: 0 };
        }

        this.selectSlot(this.selectedSlot);

        return false;
    }

    registerCallbacks(onItemChange, onItemDrop) {
        this._onItemChange = onItemChange;
        this._onItemDrop = onItemDrop;
    }

    updateSlotUI(index) {
        const slot = this.slots[index];
        const itemEl = document.getElementById(`item-${index}`);
        const countEl = document.getElementById(`count-${index}`);

        if (slot.type && slot.count > 0) {
            itemEl.style.backgroundImage = `url('${this.getItemTexture(slot.type)}')`;
            
            // Add special class for slab items
            if (this.isSlab(slot.type)) {
                itemEl.classList.add('slab-item');
            } else {
                itemEl.classList.remove('slab-item');
            }

            if (slot.count > 1) {
                countEl.textContent = slot.count;
            } else {
                countEl.textContent = '';
            }
        } else {
            itemEl.style.backgroundImage = 'none';
            itemEl.classList.remove('slab-item');
            countEl.textContent = '';
        }
    }

    updateInventorySlotUI(index) {
        const slot = document.querySelector(`[data-slot="inventory-${index}"]`);
        if (!slot) return;

        slot.innerHTML = '';

        const itemData = this.mainSlots[index];
        if (itemData.type && itemData.count > 0) {
            const item = document.createElement('div');
            item.className = 'item-stack';
            if (this.isSlab(itemData.type)) {
                item.classList.add('slab-item');
            }
            item.style.backgroundImage = `url('${this.getItemTexture(itemData.type)}')`;

            if (itemData.count > 1) {
                const count = document.createElement('div');
                count.className = 'item-count';
                count.textContent = itemData.count;
                item.appendChild(count);
            }

            slot.appendChild(item);
        }
    }

    updateInventoryHotbarUI(index) {
        const slot = document.querySelector(`#inventory-hotbar [data-slot="hotbar-${index}"]`);
        if (!slot) return;

        slot.innerHTML = '';

        const itemData = this.slots[index];
        if (itemData.type && itemData.count > 0) {
            const item = document.createElement('div');
            item.className = 'item-stack';
            if (this.isSlab(itemData.type)) {
                item.classList.add('slab-item');
            }
            item.style.backgroundImage = `url('${this.getItemTexture(itemData.type)}')`;

            if (itemData.count > 1) {
                const count = document.createElement('div');
                count.className = 'item-count';
                count.textContent = itemData.count;
                item.appendChild(count);
            }

            slot.appendChild(item);
        }

        if (index === this.selectedSlot) {
            slot.classList.add('selected');
        } else {
            slot.classList.remove('selected');
        }
    }

    updateCraftingSlotUI(index) {
        const slot = document.querySelector(`[data-slot="craft-${index}"]`);
        if (!slot) return;

        slot.innerHTML = '';

        const itemData = this.craftingSlots[index];
        if (itemData.type && itemData.count > 0) {
            const item = document.createElement('div');
            item.className = 'item-stack';
            if (this.isSlab(itemData.type)) {
                item.classList.add('slab-item');
            }
            item.style.backgroundImage = `url('${this.getItemTexture(itemData.type)}')`;

            if (itemData.count > 1) {
                const count = document.createElement('div');
                count.className = 'item-count';
                count.textContent = itemData.count;
                item.appendChild(count);
            }

            slot.appendChild(item);
        }
    }

    updateTableCraftingSlotUI(index) {
        const slot = document.querySelector(`[data-slot="table-craft-${index}"]`);
        if (!slot) return;

        slot.innerHTML = '';

        const itemData = this.tableCraftingSlots[index];
        if (itemData.type && itemData.count > 0) {
            const item = document.createElement('div');
            item.className = 'item-stack';
            if (this.isSlab(itemData.type)) {
                item.classList.add('slab-item');
            }
            item.style.backgroundImage = `url('${this.getItemTexture(itemData.type)}')`;

            if (itemData.count > 1) {
                const count = document.createElement('div');
                count.className = 'item-count';
                count.textContent = itemData.count;
                item.appendChild(count);
            }

            slot.appendChild(item);
        }
    }

    returnItemToSource() {
        if (!this.draggedSource || !this.draggedItem) return;

        let sourceItem;
        if (this.draggedSource.startsWith('hotbar-')) {
            const index = parseInt(this.draggedSource.split('-')[1]);
            sourceItem = this.slots[index];
        } else if (this.draggedSource.startsWith('inventory-')) {
            const index = parseInt(this.draggedSource.split('-')[1]);
            sourceItem = this.mainSlots[index];
        } else if (this.draggedSource.startsWith('craft-') && !this.draggedSource.startsWith('craft-result')) {
            const index = parseInt(this.draggedSource.split('-')[1]);
            sourceItem = this.craftingSlots[index];
        } else if (this.draggedSource.startsWith('table-craft-') && !this.draggedSource.startsWith('table-craft-result')) {
            const index = parseInt(this.draggedSource.split('-')[2]);
            sourceItem = this.tableCraftingSlots[index];
        } else if (this.draggedSource === 'furnace-input') {
            sourceItem = this.furnaceInput;
        } else if (this.draggedSource === 'furnace-fuel') {
            sourceItem = this.furnaceFuel;
        } else if (this.draggedSource === 'furnace-result') {
            sourceItem = this.furnaceResult;
        } else if (this.draggedSource.startsWith('chest-')) {
            const index = parseInt(this.draggedSource.split('-')[1]);
            sourceItem = this.currentChestData.inventory[index];
        }

        if (!sourceItem) {
            this.addItemToFirstAvailableSlot(this.draggedItem);
        }
        else if (!sourceItem.type) {
            Object.assign(sourceItem, this.draggedItem);
        }
        else if (sourceItem.type === this.draggedItem.type &&
            sourceItem.count + this.draggedItem.count <= this.maxStackSize) {
            sourceItem.count += this.draggedItem.count;
        }
        else {
            const temp = { ...sourceItem };
            Object.assign(sourceItem, this.draggedItem);
            this.draggedItem = temp;
            this.returnItemToSource();
        }

        this.draggedItem = null;
        this.updateAllDisplays();
        this.updateFurnaceDisplay();
    }

    addItemToFirstAvailableSlot(item) {
        if (item.count <= 0) return;
        
        for (let i = 0; i < this.slots.length; i++) {
            if (!this.slots[i].type) {
                Object.assign(this.slots[i], item);
                return true;
            }
        }

        for (let i = 0; i < this.mainSlots.length; i++) {
            if (!this.mainSlots[i].type) {
                Object.assign(this.mainSlots[i], item);
                return true;
            }
        }

        for (let i = 0; i < this.slots.length; i++) {
            if (this.slots[i].type === item.type &&
                this.slots[i].count + item.count <= this.maxStackSize) {
                this.slots[i].count += item.count;
                this.updateSlotUI(i);
                this.updateInventoryHotbarUI(i);

                if (i === this.selectedSlot && this._onItemChange) {
                    this._onItemChange();
                }

                return true;
            }
        }

        for (let i = 0; i < this.mainSlots.length; i++) {
            if (this.mainSlots[i].type === item.type &&
                this.mainSlots[i].count + item.count <= this.maxStackSize) {
                this.mainSlots[i].count += item.count;
                this.updateInventorySlotUI(i);
                return true;
            }
        }

        return false;
    }

    getSelectedItem() {
        return this.slots[this.selectedSlot];
    }
    
    removeSelectedItem() {
        const selectedItem = this.slots[this.selectedSlot];
        if (selectedItem.type && selectedItem.count > 0) {
            const blockType = selectedItem.type;
            selectedItem.count--;
            
            if (selectedItem.count <= 0) {
                selectedItem.type = null;
            }
            
            this.updateSlotUI(this.selectedSlot);
            this.updateInventoryHotbarUI(this.selectedSlot);
            
            return blockType;
        }
        
        return null;
    }

    updateHeldItemDisplay() {}
    showHeldItem() {}
    hideHeldItem() {}

    playSmeltingCompleteSound() {
        if (typeof playClickSound === 'function') {
            try {
                const audio = new Audio('../audio/click.mp3');
                audio.playbackRate = 1.5;
                audio.volume = 0.3;
                audio.play().catch(e => console.log('Audio play failed:', e));
            } catch (e) {
                console.log('Audio creation failed:', e);
            }
        }
    }

    showFuelNeededIndicator() {
        const fireIcon = document.querySelector('.furnace-fire');
        if (fireIcon) {
            fireIcon.style.animation = 'fuel-needed 1s ease-in-out infinite';
            setTimeout(() => {
                if (fireIcon) {
                    fireIcon.style.animation = '';
                }
            }, 3000);
        }
    }

    isSlab(blockType) {
        return blockType === 'oakslab' || blockType === 'birchslab';
    }
}
