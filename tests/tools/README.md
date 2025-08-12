# Playwright MCP Tools Tests

这个目录包含了Playwright MCP工具的测试文件，包括selector返回功能和其他功能测试。


运行所有测试

```
npm test -- tests/tools --project=chrome
```

## 📁 测试文件

### 1. click.spec.ts

测试 `browser_click` 工具功能

- ✅ 3个测试用例 (当前为selector功能)
- 验证点击元素后返回CSS选择器
- 测试不同优先级的属性选择器生成
- *可扩展：未来可添加其他click相关测试*

### 2. type.spec.ts

测试 `browser_type` 工具功能

- ✅ 4个测试用例 (当前为selector功能)
- 验证文本输入后返回CSS选择器
- 包含submit功能的选择器测试
- *可扩展：未来可添加其他type相关测试*

### 3. drag.spec.ts

测试 `browser_drag` 工具功能

- ✅ 2个测试用例 (当前为selector功能)
- 验证拖拽操作返回起始和目标元素的选择器
- 测试拖拽错误处理
- *可扩展：未来可添加其他drag相关测试*

### 4. hover.spec.ts

测试 `browser_hover` 工具功能

- ✅ 3个测试用例 (当前为selector功能)
- 验证悬停操作返回悬停元素的选择器
- 测试不同属性的选择器生成
- *可扩展：未来可添加其他hover相关测试*

## 🎯 测试覆盖的功能

### Selector优先级测试

1. `data-test-automation-id` (最高优先级)
2. `aria-label`
3. `name` 属性
4. 唯一 `id`
5. 标签名 (fallback)

### 错误处理测试

- 验证当选择器生成失败时，工具仍能正常工作
- 确保向后兼容性

### 返回格式测试

验证每个工具返回一致的格式：

- Click: `"Clicked element with selector: [selector]"`
- Type: `"Typed text into element with selector: [selector]"`
- Drag: `"Dragged from element with selector: [start] to element with selector: [end]"`
- Hover: `"Hovered over element with selector: [selector]"`

## 🚀 运行测试

```bash
# 运行所有selector功能测试
npm test -- tests/tools/ --project=chrome

# 运行特定测试文件
npm test -- tests/tools/click.spec.ts --project=chrome
npm test -- tests/tools/type.spec.ts --project=chrome
npm test -- tests/tools/drag.spec.ts --project=chrome
npm test -- tests/tools/hover.spec.ts --project=chrome
```

## 📊 测试结果

**总计**: 12个测试用例
**状态**: ✅ 全部通过
**浏览器**: Chrome (已验证)

## 🔧 技术实现

所有测试都使用以下模式：

1. 设置HTML内容
2. 导航到页面
3. 获取页面快照
4. 提取元素的ref参数
5. 调用对应的browser工具
6. 验证返回的selector信息

测试确保了所有selector功能的正确性和一致性。
