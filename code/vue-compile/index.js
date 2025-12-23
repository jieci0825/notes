const template = `<div><p>Vue</p></div>`

const Status = {
    /**初始状态 */
    INITIAL: 'INITIAL',
    /**标签开始状态 */
    TAG_OPEN: 'TAG_OPEN',
    /**标签名状态 */
    TAG_NAME: 'TAG_NAME',
    /**标签结束状态 */
    TAG_CLOSE: 'TAG_CLOSE',
    /**标签结束名状态 */
    TAG_CLOSE_NAME: 'TAG_CLOSE_NAME',
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
function tokenizes(str) {
    let curState = Status.INITIAL

    const tokens = []

    const chars = []

    while (str) {
        let char = str[0]

        switch (curState) {
            case Status.INITIAL:
                if (char === '<') {
                    curState = Status.TAG_OPEN
                    str = str.slice(1)
                } else if (isAlpha(char)) {
                    curState = Status.TEXT
                }
                break
            case Status.TAG_OPEN:
                if (isAlpha(char)) {
                    curState = Status.TAG_NAME
                }
                // 进行条件补充
                else if (char === '/') {
                    curState = Status.TAG_CLOSE_NAME
                    str = str.slice(1)
                }
                break
            case Status.TAG_NAME:
                if (isAlpha(char)) {
                    chars.push(char)
                    str = str.slice(1)
                }
                if (char === '>') {
                    curState = Status.INITIAL
                    tokens.push({
                        type: 'tag_start',
                        name: chars.join('')
                    })
                    str = str.slice(1)
                    chars.length = 0
                }
                break
            case Status.TEXT:
                if (char === '<') {
                    curState = Status.TAG_OPEN
                    tokens.push({
                        type: 'text',
                        name: chars.join('')
                    })
                    chars.length = 0
                    str = str.slice(1)
                } else {
                    chars.push(char)
                    str = str.slice(1)
                }
                break
            case Status.TAG_CLOSE:
                // 如果是字母，则进入标签结束名状态
                if (isAlpha(char)) {
                    curState = Status.TAG_CLOSE_NAME
                    str = str.slice(1)
                }
                break
            case Status.TAG_CLOSE_NAME:
                // 如果是字母，则收集
                if (isAlpha(char)) {
                    chars.push(char)
                    str = str.slice(1)
                }
                // 如果是 >，则结束标签结束名状态
                if (char === '>') {
                    curState = Status.INITIAL
                    tokens.push({
                        type: 'tag_end',
                        name: chars.join('')
                    })
                    str = str.slice(1)
                    chars.length = 0
                }
                break
        }
    }

    return tokens
}

function parse(str) {
    const tokens = tokenizes(str)

    const root = {
        type: 'Root',
        children: []
    }

    const stack = [root]

    while (tokens.length) {
        // 取出当前栈顶元素作为父节点
        const parent = stack[stack.length - 1]
        // 取出当前要处理的 token
        const token = tokens[0]

        switch (token.type) {
            case 'tag_start':
                // 遇到开始标签，创建元素节点
                const elementNode = {
                    type: 'Element',
                    tag: token.name,
                    children: []
                }
                // 将元素节点添加到父节点的 children 中
                parent.children.push(elementNode)
                // 将元素节点压入栈中，作为后续节点的父节点
                stack.push(elementNode)
                break
            case 'text':
                // 遇到文本，创建文本节点
                const textNode = {
                    type: 'Text',
                    content: token.name
                }
                // 将文本节点添加到父节点的 children 中
                parent.children.push(textNode)
                break
            case 'tag_end':
                // 遇到结束标签，将栈顶元素弹出
                stack.pop()
                break
        }

        // 处理完当前 token 后，将其移除
        tokens.shift()
    }

    return root
}

const templateAST = parse(template)

function traverseNode(node, context) {
    const currentNode = node

    // 遍历所有转换函数
    const { nodeTransforms } = context
    for (let i = 0; i < nodeTransforms.length; i++) {
        nodeTransforms[i](currentNode, context)
    }

    if (node.children && node.children.length) {
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i]
            traverseNode(child, context)
        }
    }
}
/**
 * 处理文本节点
 */
function transformTextNode(node, context) {
    if (node.type !== 'Text') {
        return
    }
    console.log('-- 处理文本节点 --')
}

/**
 * 处理元素节点
 */
function transformElementNode(node, context) {
    if (node.type !== 'Element') {
        return
    }
    console.log('-- 处理元素节点 --')
}

const nodeTransforms = [transformTextNode, transformElementNode]

const context = {
    nodeTransforms: [transformTextNode, transformElementNode]
}

traverseNode(templateAST, context)

dump(templateAST)

function dump(node, indent = 0) {
    const hyphens = '-'.repeat(indent)
    const tag = node.tag || node.content || ''
    console.log(hyphens + node.type + ': ' + tag)

    if (node.children && node.children.length) {
        node.children.forEach(child => dump(child, indent + 2))
    }
}
