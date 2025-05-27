export const PICKAXE_EFFECTIVENESS = {
    'woodpickaxe': { rock: 0.42 }, // 90% faster
    'stonepickaxe': { rock: 0.08 } // 80% faster
};

export const BLOCK_CATEGORIES = {
    rock: ['stone', 'cobble', 'smoothstone', 'sandstone', 'furnace'],
    wood: ['plank', 'birchplank', 'wood', 'birchwood', 'craftingtable', 'oakslab', 'birchslab', 'chest'],
    simple: ['dirt', 'grass', 'sand', 'snow', 'cacti'],
    instant: ['leaves', 'birchleaves', 'glass', 'newglass']
};

export const BREAK_TIMES = {
    rock: 7.0,     
    wood: 1.7,    
    simple: 0.8,  
    instant: 0.1   
};

export function getBlockCategory(blockType) {
    for (const [category, blocks] of Object.entries(BLOCK_CATEGORIES)) {
        if (blocks.includes(blockType)) {
            return category;
        }
    }
    return 'simple';
}

export function calculateBreakTime(blockType, toolType) {
    const category = getBlockCategory(blockType);
    let breakTime = BREAK_TIMES[category] || BREAK_TIMES.simple;
    
    if (toolType && PICKAXE_EFFECTIVENESS[toolType] && PICKAXE_EFFECTIVENESS[toolType][category]) {
        breakTime *= PICKAXE_EFFECTIVENESS[toolType][category];
    }
    
    return breakTime;
}

export const PICKAXE_TABLE_RECIPES = [
    {
        pattern: [
            'plank', 'plank', 'plank',
            null, 'stick', null,
            null, 'stick', null
        ],
        result: { type: 'woodpickaxe', count: 1 },
        needsExactMatch: true,
        displayName: 'Wooden Pickaxe',
        ingredients: ['3x Planks', '2x Sticks']
    },
    {
        pattern: [
            'birchplank', 'birchplank', 'birchplank',
            null, 'stick', null,
            null, 'stick', null
        ],
        result: { type: 'woodpickaxe', count: 1 },
        needsExactMatch: true,
        displayName: 'Wooden Pickaxe',
        ingredients: ['3x Birch Planks', '2x Sticks']
    },
    {
        pattern: [
            'cobble', 'cobble', 'cobble',
            null, 'stick', null,
            null, 'stick', null
        ],
        result: { type: 'stonepickaxe', count: 1 },
        needsExactMatch: true,
        displayName: 'Stone Pickaxe',
        ingredients: ['3x Cobblestone', '2x Sticks']
    },
    {
        pattern: [
            'plank', 'plank', null,
            null, 'stick', null,
            null, 'stick', null
        ],
        result: { type: 'woodhoe', count: 1 },
        needsExactMatch: true,
        displayName: 'Wooden Hoe',
        ingredients: ['2x Planks', '2x Sticks']
    },
    {
        pattern: [
            'birchplank', 'birchplank', null,
            null, 'stick', null,
            null, 'stick', null
        ],
        result: { type: 'woodhoe', count: 1 },
        needsExactMatch: true,
        displayName: 'Wooden Hoe',
        ingredients: ['2x Birch Planks', '2x Sticks']
    }
];

export const PICKAXE_RECIPES = [
    {
        pattern: ['plank', null, 'plank', null, 'stick', null],
        result: { type: 'woodpickaxe', count: 1 },
        needsExactMatch: true,
        displayName: 'Wooden Pickaxe',
        ingredients: ['2x Planks', '1x Stick']
    },
    {
        pattern: ['birchplank', null, 'birchplank', null, 'stick', null],
        result: { type: 'woodpickaxe', count: 1 },
        needsExactMatch: true,
        displayName: 'Wooden Pickaxe',
        ingredients: ['2x Birch Planks', '1x Stick']
    },
    {
        pattern: ['plank', 'plank', null, 'stick', null, 'stick'],
        result: { type: 'woodhoe', count: 1 },
        needsExactMatch: true,
        displayName: 'Wooden Hoe',
        ingredients: ['2x Planks', '2x Sticks']
    },
    {
        pattern: ['birchplank', 'birchplank', null, 'stick', null, 'stick'],
        result: { type: 'woodhoe', count: 1 },
        needsExactMatch: true,
        displayName: 'Wooden Hoe',
        ingredients: ['2x Birch Planks', '2x Sticks']
    }
];

export function isPickaxe(itemType) {
    return itemType === 'woodpickaxe' || itemType === 'stonepickaxe' || itemType === 'woodhoe' || itemType === 'seeds';
}

// Get appropriate texture for pickaxe
export function getPickaxeTexture(pickaxeType) {
    switch(pickaxeType) {
        case 'woodpickaxe':
            return '../images/woodpickaxe.png';
        case 'stonepickaxe':
            return '../images/stonepickaxe.png';
        case 'woodhoe':
            return '../images/woodhoe.png'; 
        default:
            return null;
    }
}
