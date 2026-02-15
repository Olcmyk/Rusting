# Rust in Time - 铁的生锈

一个用 Rust 和 Bevy 引擎制作的艺术项目，展示一块铁在 15 年时间里缓慢生锈的过程。

## 项目特点

- 🦀 **纯 Rust 实现**：使用 Bevy 游戏引擎，编译为 WebAssembly
- 🎨 **物理正确的 PBR 渲染**：使用真实的 PBR 材质和光照模型
- ⏰ **时间驱动**：基于 Unix 时间戳实时计算生锈程度
- 🎬 **实时颜色混合**：在 GPU 中混合两套颜色纹理
- 🌐 **Web 部署**：可部署到任何静态网站托管服务
- ⚡ **优化性能**：针对 Apple M1/Metal 优化，避免 GPU 资源限制

## 时间线

- **开始时间**：2026-02-15 00:00:00 UTC
- **结束时间**：2041-02-15 00:00:00 UTC（15 年后）
- **当前进度**：每次打开网页都会根据当前时间显示对应的生锈状态

## 技术实现

### 核心技术栈

- **Rust**：系统编程语言
- **Bevy 0.13**：游戏引擎和渲染框架
- **WebAssembly**：编译目标，运行在浏览器中
- **WebGPU/WebGL2**：图形 API

### 材质系统

项目使用自定义的 `MaterialExtension` 来混合两套 PBR 颜色纹理：

1. **Metal056A**（干净的铁）
   - Base Color（基础颜色）

2. **Metal056C**（生锈的铁）
   - Base Color（基础颜色）

**注意**：为了避免 GPU 资源限制（特别是在 Apple M1/Metal 上），当前版本只混合颜色纹理。金属度和粗糙度使用固定值（metallic: 0.9, roughness: 0.3）。详见 `GPU_FIX.md`。

### 生锈计算

```rust
// 开始时间: 2026-02-15 00:00:00 UTC
let start_timestamp = 1739577600i64;

// 总时长: 15 年
let total_duration = 15.0 * 365.25 * 24.0 * 60.0 * 60.0;

// 当前进度 (0.0 到 1.0)
let rust_amount = (current_time - start_time) / total_duration;
```

在 GPU shader 中，颜色会根据 `rust_amount` 进行线性插值：

```wgsl
let base_color = mix(clean_color, rust_color, rust_amount);
```

## 快速开始

### 前置要求

- Rust 1.75+
- Trunk（WASM 构建工具）

### 安装依赖

```bash
# 安装 Rust（如果还没有）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 添加 WASM 目标
rustup target add wasm32-unknown-unknown

# 安装 Trunk
cargo install trunk
```

### 运行开发服务器

```bash
# 使用快速启动脚本
./run.sh

# 或手动运行
trunk serve
```

然后在浏览器中打开 `http://127.0.0.1:8080`

### 构建生产版本

```bash
trunk build --release
```

构建产物会在 `dist/` 目录中，可以直接部署到任何静态网站托管服务。

## 项目结构

```
Rusting/
├── src/
│   └── main.rs                    # 主程序（180 行）
├── assets/
│   ├── shaders/
│   │   └── rust_pbr.wgsl          # 自定义 PBR shader（70 行）
│   ├── Metal056A_1K-PNG/          # 干净的铁（使用颜色纹理）
│   │   └── Metal056A_1K-PNG_Color.png
│   └── Metal056C_1K-PNG/          # 生锈的铁（使用颜色纹理）
│       └── Metal056C_1K-PNG_Color.png
├── Cargo.toml                     # Rust 依赖配置
├── Trunk.toml                     # WASM 构建配置
├── index.html                     # HTML 入口
└── README.md                      # 本文件
```

## 浏览器兼容性

- ✅ **Chrome/Edge 113+**：完全支持 WebGPU
- ✅ **Firefox 115+**：支持 WebGL2
- ⚠️ **Safari**：WebGPU 支持有限，建议使用 WebGL2

## 性能指标

- **WASM 大小**：~2-3 MB（压缩后）
- **纹理总大小**：~2 MB（2 个 1K 纹理）
- **目标帧率**：60 FPS
- **内存占用**：~30-50 MB

## 部署

### 部署到 GitHub Pages

```bash
# 构建
trunk build --release --public-url /Rusting/

# 部署到 gh-pages 分支
# （需要先配置 GitHub Pages）
```

### 部署到 Vercel/Netlify

直接将 `dist/` 目录部署即可。

## 未来改进

- [ ] 添加完整的 PBR 纹理混合（金属度、粗糙度、法线）
- [ ] 添加 HDR 环境贴图（IBL）
- [ ] 实现非线性生锈曲线（更真实）
- [ ] 添加位移贴图（Displacement）
- [ ] 支持时间轴滑块（查看不同时期）
- [ ] 添加相机控制（缩放、旋转）
- [ ] 优化纹理压缩（减小文件大小）

**注意**：完整的 PBR 纹理混合需要解决 GPU 资源限制问题，详见 `GPU_FIX.md`。

## 许可证

MIT License

## 致谢

- PBR 纹理来自 [ambientCG](https://ambientcg.com/)
- Bevy 引擎和社区
