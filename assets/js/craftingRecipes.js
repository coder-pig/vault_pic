import * as THREE from 'three';
import { SimplexNoise } from './utils.js';

export const BASIC_RECIPES = [
    {
        pattern: ['wood', null, null, null],
        result: { type: 'plank', count: 4 },
        needsExactMatch: false,
        displayName: 'Wood Planks',
        ingredients: ['1x Wood']
    },
    {
        pattern: [null, 'wood', null, null],
        result: { type: 'plank', count: 4 },
        needsExactMatch: false,
        displayName: 'Wood Planks',
        ingredients: ['1x Wood']
    },
    {
        pattern: [null, null, 'wood', null],
        result: { type: 'plank', count: 4 },
        needsExactMatch: false,
        displayName: 'Wood Planks',
        ingredients: ['1x Wood']
    },
    {
        pattern: [null, null, null, 'wood'],
        result: { type: 'plank', count: 4 },
        needsExactMatch: false,
        displayName: 'Wood Planks',
        ingredients: ['1x Wood']
    },
    {
        pattern: ['birchwood', null, null, null],
        result: { type: 'birchplank', count: 4 },
        needsExactMatch: false,
        displayName: 'Birch Planks',
        ingredients: ['1x Birch Wood']
    },
    {
        pattern: [null, 'birchwood', null, null],
        result: { type: 'birchplank', count: 4 },
        needsExactMatch: false,
        displayName: 'Birch Planks',
        ingredients: ['1x Birch Wood']
    },
    {
        pattern: [null, null, 'birchwood', null],
        result: { type: 'birchplank', count: 4 },
        needsExactMatch: false,
        displayName: 'Birch Planks',
        ingredients: ['1x Birch Wood']
    },
    {
        pattern: [null, null, null, 'birchwood'],
        result: { type: 'birchplank', count: 4 },
        needsExactMatch: false,
        displayName: 'Birch Planks',
        ingredients: ['1x Birch Wood']
    },
    {
        pattern: ['plank', null, 'plank', null],
        result: { type: 'stick', count: 4 },
        needsExactMatch: true,
        displayName: 'Sticks',
        ingredients: ['2x Planks']
    },
    {
        pattern: [null, 'plank', null, 'plank'],
        result: { type: 'stick', count: 4 },
        needsExactMatch: true,
        displayName: 'Sticks',
        ingredients: ['2x Planks']
    },
    {
        pattern: ['birchplank', null, 'birchplank', null],
        result: { type: 'stick', count: 4 },
        needsExactMatch: true,
        displayName: 'Sticks',
        ingredients: ['2x Birch Planks']
    },
    {
        pattern: [null, 'birchplank', null, 'birchplank'],
        result: { type: 'stick', count: 4 },
        needsExactMatch: true,
        displayName: 'Sticks',
        ingredients: ['2x Birch Planks']
    },
    {
        pattern: ['plank', 'plank', 'plank', 'plank'],
        result: { type: 'craftingtable', count: 1 },
        needsExactMatch: true,
        displayName: 'Crafting Table',
        ingredients: ['4x Planks']
    },
    {
        pattern: ['birchplank', 'birchplank', 'birchplank', 'birchplank'],
        result: { type: 'craftingtable', count: 1 },
        needsExactMatch: true,
        displayName: 'Crafting Table',
        ingredients: ['4x Birch Planks']
    },
    {
        pattern: ['plank', 'plank', null, null],
        result: { type: 'oakslab', count: 3 },
        needsExactMatch: true,
        displayName: 'Oak Slabs',
        ingredients: ['2x Oak Planks']
    },
    {
        pattern: [null, null, 'plank', 'plank'],
        result: { type: 'oakslab', count: 3 },
        needsExactMatch: true,
        displayName: 'Oak Slabs',
        ingredients: ['2x Oak Planks']
    },
    {
        pattern: ['plank', null, 'plank', null],
        result: { type: 'oakslab', count: 3 },
        needsExactMatch: true,
        displayName: 'Oak Slabs',
        ingredients: ['2x Oak Planks']
    },
    {
        pattern: [null, 'plank', null, 'plank'],
        result: { type: 'oakslab', count: 3 },
        needsExactMatch: true,
        displayName: 'Oak Slabs',
        ingredients: ['2x Oak Planks']
    },
    {
        pattern: ['birchplank', 'birchplank', null, null],
        result: { type: 'birchslab', count: 3 },
        needsExactMatch: true,
        displayName: 'Birch Slabs',
        ingredients: ['2x Birch Planks']
    },
    {
        pattern: [null, null, 'birchplank', 'birchplank'],
        result: { type: 'birchslab', count: 3 },
        needsExactMatch: true,
        displayName: 'Birch Slabs',
        ingredients: ['2x Birch Planks']
    },
    {
        pattern: ['birchplank', null, 'birchplank', null],
        result: { type: 'birchslab', count: 3 },
        needsExactMatch: true,
        displayName: 'Birch Slabs',
        ingredients: ['2x Birch Planks']
    },
    {
        pattern: ['plank', 'plank', 'plank', 'plank'],
        result: { type: 'chest', count: 1 },
        needsExactMatch: false,
        displayName: 'Chest',
        ingredients: ['4x Planks']
    },
    {
        pattern: ['birchplank', 'birchplank', 'birchplank', 'birchplank'],
        result: { type: 'chest', count: 1 },
        needsExactMatch: false,
        displayName: 'Chest',
        ingredients: ['4x Birch Planks']
    },
    {
        pattern: ['glass', 'glass', 'glass', null],
        result: { type: 'newglass', count: 1 },
        needsExactMatch: true,
        displayName: 'New Glass',
        ingredients: ['3x Glass']
    },
    {
        pattern: [null, 'glass', 'glass', 'glass'],
        result: { type: 'newglass', count: 1 },
        needsExactMatch: true,
        displayName: 'New Glass',
        ingredients: ['3x Glass']
    }
];

export const TABLE_RECIPES = [
    {
        pattern: ['wood', null, null, null, null, null, null, null, null],
        result: { type: 'plank', count: 4 },
        needsExactMatch: false,
        displayName: 'Wood Planks',
        ingredients: ['1x Wood']
    },
    {
        pattern: [null, 'wood', null, null, null, null, null, null, null],
        result: { type: 'plank', count: 4 },
        needsExactMatch: false,
        displayName: 'Wood Planks',
        ingredients: ['1x Wood']
    },
    {
        pattern: ['birchwood', null, null, null, null, null, null, null, null],
        result: { type: 'birchplank', count: 4 },
        needsExactMatch: false,
        displayName: 'Birch Planks',
        ingredients: ['1x Birch Wood']
    },
    {
        pattern: [null, 'birchwood', null, null, null, null, null, null, null],
        result: { type: 'birchplank', count: 4 },
        needsExactMatch: false,
        displayName: 'Birch Planks',
        ingredients: ['1x Birch Wood']
    },
    {
        pattern: ['plank', null, null, 'plank', null, null, null, null, null],
        result: { type: 'stick', count: 4 },
        needsExactMatch: true,
        displayName: 'Sticks',
        ingredients: ['2x Planks']
    },
    {
        pattern: [null, 'plank', null, null, 'plank', null, null, null, null],
        result: { type: 'stick', count: 4 },
        needsExactMatch: true,
        displayName: 'Sticks',
        ingredients: ['2x Planks']
    },
    {
        pattern: ['birchplank', null, null, 'birchplank', null, null, null, null, null],
        result: { type: 'stick', count: 4 },
        needsExactMatch: true,
        displayName: 'Sticks',
        ingredients: ['2x Birch Planks']
    },
    {
        pattern: [null, 'birchplank', null, null, 'birchplank', null, null, null, null],
        result: { type: 'stick', count: 4 },
        needsExactMatch: true,
        displayName: 'Sticks',
        ingredients: ['2x Birch Planks']
    },
    {
        pattern: [
            'plank', 'plank', null,
            'plank', 'plank', null,
            'plank', 'plank', null
        ],
        result: { type: 'oakdoor', count: 1 },
        needsExactMatch: true,
        displayName: 'Oak Door',
        ingredients: ['6x Planks']
    },
    {
        pattern: [
            'birchplank', 'birchplank', null,
            'birchplank', 'birchplank', null,
            'birchplank', 'birchplank', null
        ],
        result: { type: 'birchdoor', count: 1 },
        needsExactMatch: true,
        displayName: 'Birch Door',
        ingredients: ['6x Birch Planks']
    },
    {
        pattern: [
            'glass', null, null,
            'glass', null, null,
            'glass', null, null
        ],
        result: { type: 'newglass', count: 1 },
        needsExactMatch: true,
        displayName: 'New Glass',
        ingredients: ['3x Glass']
    },
    {
        pattern: [
            null, 'glass', null,
            null, 'glass', null,
            null, 'glass', null
        ],
        result: { type: 'newglass', count: 1 },
        needsExactMatch: true,
        displayName: 'New Glass',
        ingredients: ['3x Glass']
    },
    {
        pattern: [
            null, null, 'glass',
            null, null, 'glass',
            null, null, 'glass'
        ],
        result: { type: 'newglass', count: 1 },
        needsExactMatch: true,
        displayName: 'New Glass',
        ingredients: ['3x Glass']
    },
    {
        pattern: [
            'cobble', 'cobble', 'cobble',
            'cobble', null, 'cobble',
            'cobble', 'cobble', 'cobble'
        ],
        result: { type: 'furnace', count: 1 },
        needsExactMatch: true,
        displayName: 'Furnace',
        ingredients: ['8x Cobblestone']
    },
    {
        pattern: [
            'wheat', 'wheat', 'wheat',
            'wheat', 'wheat', 'wheat',
            'wheat', 'wheat', 'wheat'
        ],
        result: { type: 'haybale', count: 1 },
        needsExactMatch: true,
        displayName: 'Hay Bale',
        ingredients: ['9x Wheat']
    },
    {
        pattern: [
            'plank', 'plank', 'plank',
            'plank', null, 'plank',
            'plank', 'plank', 'plank'
        ],
        result: { type: 'chest', count: 1 },
        needsExactMatch: true,
        displayName: 'Chest',
        ingredients: ['8x Planks']
    },
    {
        pattern: [
            'birchplank', 'birchplank', 'birchplank',
            'birchplank', null, 'birchplank',
            'birchplank', 'birchplank', 'birchplank'
        ],
        result: { type: 'chest', count: 1 },
        needsExactMatch: true,
        displayName: 'Chest',
        ingredients: ['8x Birch Planks']
    },
];

export const SMELTING_RECIPES = [
    {
        input: 'sand',
        result: 'glass',
        count: 1
    },
    {
        input: 'cobble',
        result: 'smoothstone',
        count: 1
    },
    {
        input: 'wood',
        result: 'plank',
        count: 4
    },
    {
        input: 'birchwood',
        result: 'birchplank',
        count: 4
    }
];

export const FUEL_TYPES = {
    'wood': 20,      
    'birchwood': 20, 
    'plank': 10,     
    'birchplank': 10 
};
