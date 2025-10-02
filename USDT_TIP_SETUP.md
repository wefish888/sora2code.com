# USDT 打赏弹窗配置指南

## ✅ 已完成的修改

### 主要变更
1. ✅ **只保留 USDT (TRC20)** - 移除了 BTC 和 ETH 选项
2. ✅ **添加二维码展示** - 用户可以扫码支付
3. ✅ **绿色主题** - 使用 USDT 品牌色（绿色）
4. ✅ **TRC20 网络标识** - 明确标注低手续费的 TRC20 网络

## 🔑 配置你的 USDT 地址

### 1. 修改钱包地址

**文件位置**：`frontend/src/components/islands/TipModal.tsx`

**第 11 行**：
```typescript
const USDT_ADDRESS = 'TRo0xyRqw1kRnBdPWNKc4a7ij5w1YkJzHm';  // ← 替换成你的地址
```

### 2. 如何获取 USDT (TRC20) 地址？

推荐使用以下钱包：

#### 方法 1: Binance（币安）
1. 登录 Binance 账户
2. 点击 "钱包" → "充值"
3. 选择 "USDT"
4. 选择网络：**TRC20**
5. 复制地址（以 `T` 开头）

#### 方法 2: Trust Wallet
1. 打开 Trust Wallet
2. 点击 "接收"
3. 搜索 "Tron (TRX)"
4. 复制地址（以 `T` 开头）
5. 这个地址可以接收 TRC20 网络的 USDT

#### 方法 3: TronLink
1. 安装 TronLink 浏览器插件
2. 创建或导入钱包
3. 复制钱包地址
4. 这个地址可以接收 TRC20 的 USDT

### 3. 验证地址格式

正确的 TRC20 地址格式：
- ✅ 以 `T` 开头
- ✅ 总共 34 个字符
- ✅ 只包含字母和数字
- ✅ 示例：`TYourAddressHere1234567890ABCDEFG`

## 📱 二维码功能

### 工作原理
使用免费的 QR Code API 自动生成二维码：
```typescript
const generateQRCode = (address: string) => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}`;
};
```

### 二维码特点
- 📏 尺寸：200x200 像素
- 🎨 白色背景，绿色边框
- 🔄 自动根据地址生成
- 💾 不需要上传图片到服务器

### 自定义二维码尺寸
修改第 15 行的尺寸参数：
```typescript
// 改为 300x300
return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(address)}`;
```

### 使用自己的二维码图片（可选）
如果你想使用自己生成的二维码图片：

1. 上传图片到 `frontend/public/qr-code-usdt.png`
2. 修改代码：
```typescript
// 替换第 33 行
setQrCodeUrl('/qr-code-usdt.png');
```

## 🎨 UI 更新说明

### 颜色主题
从紫色改为绿色（USDT 品牌色）：
- **主色**：Green 500-600 (#22C55E - #16A34A)
- **辅助色**：Emerald 500-600
- **图标背景**：绿色到翠绿的渐变

### 新增元素
1. **二维码展示区**
   - 白色背景 + 绿色边框
   - 200x200px 尺寸
   - 加载动画效果

2. **网络标识徽章**
   - 显示 "🌐 TRC20 Network (Low Fees)"
   - 绿色背景
   - 圆角徽章样式

3. **简化的界面**
   - 移除了币种切换按钮
   - 只显示 USDT 地址
   - 更清晰的布局

## 📊 新界面结构

```
┌──────────────────────────────┐
│      ┌────────┐              │
│      │  💰   │  绿色图标     │
│      └────────┘              │
│                               │
│  ☕ Support Us with USDT?    │
│                               │
│  说明文字                     │
│                               │
├──────────────────────────────┤
│     ┌──────────────┐         │
│     │              │         │
│     │   二维码      │         │
│     │   200x200    │         │
│     │              │         │
│     └──────────────┘         │
│                               │
│  🌐 TRC20 Network (Low Fees) │
│                               │
├──────────────────────────────┤
│  USDT (TRC20) Address:       │
│  ┌─────────────────────┐    │
│  │ TYourAddress...     │    │
│  └─────────────────────┘    │
│  [📋 Copy Address]           │
├──────────────────────────────┤
│  Suggested: $1 $3 $5 $10    │
├──────────────────────────────┤
│  [🎉 I've Sent a Tip!]       │
│  [⏳ Please wait 10s...]     │
├──────────────────────────────┤
│  💝 Every contribution...    │
│  🔒 We never see...          │
└──────────────────────────────┘
```

## 🚀 测试步骤

### 1. 替换地址
```typescript
// 在 TipModal.tsx 第 11 行
const USDT_ADDRESS = '你的TRC20地址';
```

### 2. 启动开发服务器
```bash
cd frontend
npm run dev
```

### 3. 访问测试页面
```
http://localhost:4321/test-tip-modal
```

### 4. 验证功能
- [ ] 二维码正确显示
- [ ] 可以复制地址
- [ ] 倒计时正常工作
- [ ] 跳过按钮在10秒后可用
- [ ] 移动端显示正常

## 💡 为什么选择 TRC20？

### 优势
1. **低手续费** - 通常只需要 1-2 USDT
2. **到账快** - 几秒到几分钟
3. **支持广泛** - 所有主要交易所都支持
4. **稳定可靠** - Tron 网络成熟稳定

### 对比其他网络
| 网络 | 手续费 | 到账时间 | 支持度 |
|------|--------|----------|--------|
| TRC20 | ~1 USDT | 几分钟 | ⭐⭐⭐⭐⭐ |
| ERC20 | $10-50 | 10-30分钟 | ⭐⭐⭐⭐⭐ |
| BEP20 | ~0.5 USDT | 几分钟 | ⭐⭐⭐⭐ |

## ⚠️ 重要提醒

### 安全事项
1. ✅ **仔细核对地址** - 确保地址正确无误
2. ✅ **测试小额转账** - 先用小额测试
3. ✅ **保存私钥** - 备份钱包助记词
4. ⚠️ **警惕钓鱼** - 不要在可疑网站输入私钥

### 用户友好提示
建议在页面添加说明：
- "仅支持 TRC20 网络"
- "请勿使用其他网络转账"
- "最低打赏金额：1 USDT"

## 🔧 高级自定义

### 1. 添加最低金额提示
```typescript
// 在建议金额下方添加
<div className="text-xs text-orange-600 dark:text-orange-400 text-center mt-2">
  ⚠️ 最低打赏金额：1 USDT
</div>
```

### 2. 修改建议金额
```typescript
// 第 169 行左右
{['$1', '$3', '$5', '$10'].map((amount) => (
  // 改为你想要的金额
{['$2', '$5', '$10', '$20'].map((amount) => (
```

### 3. 添加实时汇率显示（可选）
```typescript
const [usdtPrice, setUsdtPrice] = useState<number | null>(null);

useEffect(() => {
  if (isOpen) {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd')
      .then(res => res.json())
      .then(data => setUsdtPrice(data.tether.usd))
      .catch(console.error);
  }
}, [isOpen]);

// 在界面中显示
{usdtPrice && (
  <div className="text-xs text-gray-500 text-center">
    1 USDT ≈ ${usdtPrice}
  </div>
)}
```

### 4. 添加打赏历史（需要后端支持）
可以记录打赏用户数量，显示社交证明：
```typescript
<div className="text-sm text-center text-gray-600 dark:text-gray-400 mb-4">
  💝 已有 <span className="font-bold text-green-600">127</span> 位用户支持我们
</div>
```

## 📞 常见问题

### Q1: 二维码不显示？
**A**: 检查网络连接，确保可以访问 `api.qrserver.com`。如果不行，可以使用本地图片。

### Q2: 能否同时支持多个网络？
**A**: 可以，但建议只用一个网络，避免用户转错网络导致资产丢失。

### Q3: 如何验证收到打赏？
**A**: 登录交易所或钱包查看交易记录。你可以使用区块浏览器：
```
https://tronscan.org/#/address/你的地址
```

### Q4: 用户转错网络怎么办？
**A**: 无法找回！务必在页面明确标注"仅支持 TRC20"。

## 📈 监控打赏数据（可选）

你可以使用 Tron 区块链浏览器 API 来监控收款：

```javascript
// 获取地址余额
fetch(`https://apilist.tronscan.org/api/account?address=${USDT_ADDRESS}`)
  .then(res => res.json())
  .then(data => console.log('USDT Balance:', data.trc20token_balances));
```

## 🎉 部署到生产

1. 确认地址正确
2. 测试所有功能
3. 构建生产版本：
```bash
npm run build
```
4. 部署到 Cloudflare Pages 或其他平台

---

**现在你有一个专业的 USDT 打赏系统了！** 🚀

如有问题，请检查浏览器控制台的错误信息。
