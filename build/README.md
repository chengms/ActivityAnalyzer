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

### ⭐ 方法 1: 在线转换工具（推荐，最简单）

**无需安装任何软件，直接使用在线工具：**

1. 准备一张 512x512 或 1024x1024 的 PNG 图片
2. 访问以下任一网站：
   - [ICO Convert](https://icoconvert.com/) - 推荐，支持多尺寸
   - [CloudConvert](https://cloudconvert.com/png-to-ico) - 支持多种格式
   - [ConvertICO](https://convertico.com/) - 简单易用
3. 上传 PNG 文件
4. 选择生成多尺寸 ICO（256, 128, 64, 48, 32, 16）
5. 下载生成的 ICO 文件
6. 保存为 `build/icon.ico`

**优点：** 无需安装软件，操作简单，支持多尺寸自动生成

---

### 方法 2: 使用 ImageMagick（需要安装，不推荐）

**⚠️ 注意：** ImageMagick 安装可能遇到权限问题，建议优先使用方法 1（在线工具）。

**如果确实需要使用 ImageMagick：**

#### 选项 A: 从官网下载安装（推荐）

1. 访问 [ImageMagick 官网](https://imagemagick.org/script/download.php)
2. 下载 Windows 安装程序
3. 运行安装程序（可能需要管理员权限）
4. 安装后重启终端，在 `build` 目录下运行：
   ```bash
   cd build
   magick convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
   ```

#### 选项 B: 使用 Chocolatey（需要管理员权限）

```powershell
# 1. 以管理员身份运行 PowerShell
# 右键点击 PowerShell，选择"以管理员身份运行"

# 2. 如果遇到锁文件错误，先清理锁文件
Remove-Item "C:\ProgramData\chocolatey\lib\5352ed5add97328856283e218c3108f7f7d201ed" -Recurse -Force -ErrorAction SilentlyContinue

# 3. 安装 ImageMagick
choco install imagemagick -y

# 4. 安装后，在 build 目录下运行转换命令
cd build
magick convert icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

**常见问题：**
- **错误：无法获取锁文件** → 清理锁文件或重启后重试
- **错误：需要管理员权限** → 以管理员身份运行 PowerShell
- **命令无法识别** → 重启终端或检查 PATH 环境变量

**建议：** 如果遇到安装问题，直接使用方法 1（在线转换工具），更简单快捷。

---

### 方法 3: 使用在线图标生成器

访问以下网站，上传图片生成多尺寸图标：
- [Icon Generator](https://www.icongenerator.net/)
- [Favicon Generator](https://realfavicongenerator.net/)
- [Favicon.io](https://favicon.io/)

---

### 方法 4: 使用 Python 脚本（如果已安装 Python）

```bash
# 安装 Pillow 库
pip install Pillow

# 运行转换脚本（需要创建脚本文件）
python convert_to_ico.py icon.png icon.ico
```

**注意：** 此方法需要编写 Python 脚本，不推荐普通用户使用。

## 📝 临时方案

如果没有图标文件，打包时 electron-builder 会使用默认图标。应用仍可正常打包和运行，只是会显示默认的 Electron 图标。

## ✅ 检查清单

打包前请确认：

- [ ] `build/icon.ico` 文件存在
- [ ] 图标文件大小合理（通常 < 1MB）
- [ ] 图标清晰可见（建议使用简洁的设计）

