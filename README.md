# hgcts
获取网页所以可以点击的标签以及输入框+提交按钮的标签

使用：`LocalHints.getInputHints()`

返回结果：  
返回结果格式是 输入框标签+提交标签<fakespliteinput>输入框标签+提交标签<fakespliteclick>可点击标签
`[<input> <input> <input#F_email> <input#F_password_input> <input#F_password> <button> <fakespliteinput> <input#searchword> <input#searchconfirm> <fakespliteclick> <a> <a> <a> <a> <a> <a> <a>]`

可以放在chrome 浏览器的代码片段中执行测试。

参考部分vimium代码
