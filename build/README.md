# 图标文件说明

## 📁 需要的图标文件

请将以下图标文件放在此目录：

### Windows

- **icon.ico** - Windows 图标文件
  - 尺寸：256x256（包含多个尺寸：256, 128, 64, 48, 32, 16）
  - 格式：ICO
  - 用途：应用图标、安装程序图标、快捷方式图标

### 通用

- **icon.png** - 通用图标文件
  - 尺寸：512x512 或 1024x1024
  - 格式：PNG
  - 用途：macOS、Linux 图标，或转换为其他格式

## 🛠️ 如何创建图标

### 方法 1: 在线转换工具

1. 准备一张 512x512 的 PNG 图片
2. 访问以下任一网站：
   - [ICO Convert](https://icoconvert.com/)
   - [CloudConvert](https://cloudconvert.com/png-to-ico)
   - [ConvertICO](https://convertico.com/)
3. 上传 PNG 文件
4. 下载生成的 ICO 文件
5. 保存为 `build/icon.ico`

### 方法 2: 使用 ImageMagick

```bash
# Windows (使用 Chocolatey)
choco install imagemagick

# macOS (使用 Homebrew)
brew install imagemagick

# Linux (Ubuntu/Debian)
sudo apt-get install imagemagick

# 转换命令
magick convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

### 方法 3: 使用在线图标生成器

访问 [Icon Generator](https://www.icongenerator.net/) 或 [Favicon Generator](https://realfavicongenerator.net/)，上传图片生成多尺寸图标。

## 📝 临时方案

如果没有图标文件，打包时 electron-builder 会使用默认图标。应用仍可正常打包和运行，只是会显示默认的 Electron 图标。

## ✅ 检查清单

打包前请确认：

- [ ] `build/icon.ico` 文件存在
- [ ] 图标文件大小合理（通常 < 1MB）
- [ ] 图标清晰可见（建议使用简洁的设计）

