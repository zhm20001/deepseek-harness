# 有登记处就别扫 DOM——UI 发现类功能的数据源直觉

用户为 palette-board 的扫描机制先后经历了「没看懂 slots 注册表口径」→ 听完重讲后自行复述出正确原则:「直接寻找 slots 才是扫描的正道,我制作 palette 的逻辑也是 for plugin,理应直接指向 slots」。misconception(界面上有什么要从 DOM 里发现)已纠正,且纠正后能说出**为什么**(palette 的对象是插件,插件的东西都登记在 slots 里)。

## Evidence

- 原话自述因果:「我制作这个 palette 本身的逻辑也是 for plugin,理应直接指向 slots。但为什么第一次没有直接找到 slots 而是扫全局?」——不仅接受了结论,还在追问 v1.8 决策错在哪(教材已把这条复盘写进 Lesson 0009 第 6 节)。
- 同轮还自行分清了两条点击路:质疑「卡片触发不是手动写链接吗?」——经确认 link 卡从未变,footerTrigger 是并存路径,未再混淆。

## Implications

- 以后教/验收「列出、发现、枚举」类功能需求时,可以直接引用这条锚点:「先问宿主有没有注册表可读」;他大概率能自己接上下半句「没有才碰 DOM」。
- slots 体系的教学从「呈现形态」(LR 来自 Lesson 0008)推进到了「登记形态」,下次可做动手课:挑 slot-catalog 一个 key 让 AI 登记最小插件、由他验收 key/kind/label 选型。
