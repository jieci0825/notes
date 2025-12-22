const template = `<div>Hello World</div>`

const Status = {
    /**初始状态 */
    INITIAL: 'INITIAL',
    /**标签开始状态 */
    TAG_OPEN: 'TAG_OPEN',
    /**标签名状态 */
    TAG_NAME: 'TAG_NAME',
    /**标签结束状态 */
    TAG_CLOSE: 'TAG_CLOSE',
    /**文本状态 */
    TEXT: 'TEXT'
}

/**
 * 判断是否是字母
 */
function isAlpha(char) {
    return char.match(/[a-zA-Z]/)
}

/**
 * 将模板字符串转换为 token 数组
 */
function tokenize(str) {
    str = str.trim()
    if (!str) {
        return []
    }

    let curState = Status.INITIAL
    const tokens = [] // 存储 token 数组
    const chars = [] // 存储当前字符串

    while (str) {
        let char = str[0] // 提取当前字符

        switch (curState) {
            // -- 初始状态，则可能是标签开始、文本、注释、CDATA 等 --
            //  - 这里简单实现，只判断标签开始和文本
            case Status.INITIAL:
                // 如果当前字符是 <，则更新状态为标签开始
                if (char === '<') {
                    // 更新状态为标签开始
                    curState = Status.TAG_OPEN
                    // 截取掉已经处理的字符
                    str = str.slice(1)
                } else {
                    // 否则，认为是一个文本节点
                    curState = Status.TEXT
                    // 将当前字符添加到 chars 中
                    chars.push(char)
                    str = str.slice(1)
                }
                break
            // -- 标签开始状态，则可能是标签名、结束标签、注释、CDATA 等 --
            //  - 这里简单实现，只判断标签名和结束标签
            case Status.TAG_OPEN:
                // 如果当前字符是字母，则拼接成标签名
                if (isAlpha(char)) {
                    curState = Status.TAG_NAME
                    chars.push(char)
                    str = str.slice(1)
                } else if (char === '/') {
                    // 否则，认为是一个结束标签
                    curState = Status.TAG_CLOSE
                    chars.push(char)
                    str = str.slice(1)
                }
                break
            // -- 标签名状态，则可能是标签名、结束标签、空格 --
            case Status.TAG_NAME:
                // 如果当前字符是字母，则拼接成标签名
                if (isAlpha(char)) {
                    chars.push(char)
                    str = str.slice(1)
                } else if (char === '>') {
                    curState = Status.TAG_CLOSE
                    chars.push(char)
                    str = str.slice(1)
                }
                break
        }
    }
}

const ast = parse(template)

console.log(ast)
