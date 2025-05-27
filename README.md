# Minecraft Voxel Sandbox

一个基于Web的Minecraft风格体素沙盒游戏 🎮

## 📁 项目结构

```
mc_test/
├── index.html              # 主HTML文件
├── README.md              # 项目说明文档
└── assets/                # 资源文件夹
    ├── images/            # 图片资源 (56个文件)
    │   ├── Minecraftlogo.png
    │   ├── grass_top.png
    │   ├── dirt.png
    │   └── ...
    ├── audio/             # 音频资源 (1个文件)
    │   └── click.mp3
    ├── css/               # 样式文件 (2个文件)
    │   ├── style.css
    │   └── world-item.css
    └── js/                # JavaScript文件 (16个文件)
        ├── main.js        # 主程序入口
        ├── voxelWorld.js  # 世界生成逻辑
        ├── player.js      # 玩家控制
        ├── inventory.js   # 物品栏系统
        └── ...
```

## 🚀 运行项目

1. 确保所有文件都在正确的目录结构中
2. 使用本地服务器打开 `index.html` 文件
3. 开始游戏！

## 📝 文件说明

### 核心文件
- `index.html` - 游戏主页面，包含所有UI元素
- `assets/js/main.js` - 游戏主逻辑和初始化代码
- `assets/css/style.css` - 游戏样式定义

### 游戏系统
- `voxelWorld.js` - 世界生成、区块管理
- `player.js` - 玩家移动、交互
- `inventory.js` - 物品栏、合成系统
- `settings.js` - 游戏设置管理
- `mods.js` - 模组系统

### 功能模块
- `blockBreaking.js` - 方块破坏系统
- `blockPlacing.js` - 方块放置系统
- `blockParticles.js` - 粒子效果系统
- `dayNightCycle.js` - 昼夜循环系统
- `door.js` - 门的交互逻辑
- `pickaxes.js` - 工具系统
- `craftingRecipes.js` - 合成配方
- `superflat.js` - 超平坦世界生成
- `utils.js` - 工具函数
- `keybinds.js` - 按键绑定

## 🎨 资源文件

### 图片资源 (assets/images/)
包含所有游戏纹理，如方块纹理、UI元素、工具图标等

### 音频资源 (assets/audio/)
包含游戏音效文件

### 样式文件 (assets/css/)
包含游戏界面的CSS样式定义

## 🔧 开发说明

所有文件引用都使用相对路径：
- JavaScript文件中的图片引用：`../images/filename.png`
- JavaScript文件中的音频引用：`../audio/filename.mp3`
- CSS文件中的图片引用：`../images/filename.png`
- HTML文件中的资源引用：`assets/type/filename.ext`

这样的结构使项目更加整洁和易于维护！ ✨ 