const template = `<div><p>Vue</p><p>Hello</p></div>`

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

const ast = parse(template)
// dump(ast)

function traverseNode(node, context) {
    context.currentNode = node

    // 用于存储退出函数
    const exitFns = []

    // 遍历所有转换函数
    const { nodeTransforms } = context
    for (let i = 0; i < nodeTransforms.length; i++) {
        // 获取退出函数
        const onExit = nodeTransforms[i](node, context)
        if (onExit) {
            exitFns.push(onExit)
        }
        if (!context.currentNode) return
    }

    const children = context.currentNode.children
    if (children && children.length) {
        for (let i = 0; i < children.length; i++) {
            context.parent = context.currentNode
            context.childIndex = i
            traverseNode(children[i], context)
        }
    }

    let i = exitFns.length
    while (i--) {
        exitFns[i]()
    }
}
/**
 * 处理文本节点
 */
function transformText(node) {
    if (node.type !== 'Text') {
        return
    }

    node.jsNode = createStringLiteral(node.content)
}

/**
 * 处理元素节点
 */
function transformElement(node) {
    // 返回一个退出函数，在子节点处理完成后执行
    return () => {
        // 只处理元素节点
        if (node.type !== 'Element') {
            return
        }

        // 创建 h 函数调用的参数数组
        //  - h('div', h('p', 'Vue'))
        const callArgs = [
            createStringLiteral(node.tag) // 第一个参数：标签名，如：div
        ]

        // 处理子节点
        if (node.children.length === 1) {
            // 只有一个子节点，直接作为第二个参数
            //  - 因为这是退出阶段，所以这个子节点已经被转换为 JavaScript AST 节点
            callArgs.push(node.children[0].jsNode)
        } else if (node.children.length > 1) {
            // 多个子节点，包装成数组
            callArgs.push(
                createArrayExpression(node.children.map(child => child.jsNode))
            )
        }

        // 创建 h 函数调用节点
        const callExp = createCallExpression('h', callArgs)

        // 将当前节点的 jsNode 属性设置为创建的函数调用节点
        node.jsNode = callExp
    }
}

function transformRoot(node) {
    // 同样返回退出函数，因为需要等所有子节点都处理完
    return () => {
        // 只处理根节点
        if (node.type !== 'Root') {
            return
        }

        // 获取根节点的第一个子节点（通常是最外层的元素）
        const vnodeJSAST = node.children[0].jsNode

        // 将它包装成 return 语句
        //  - return h("div", ...)
        const returnStatement = createReturnStatement(vnodeJSAST)

        // 再包装成完整的函数声明
        //  - function render() { return h("div", ...) }
        const functionDecl = createFunctionDecl('render', [], [returnStatement])

        // 将完整的函数声明挂载到根节点的 jsNode 上
        node.jsNode = functionDecl
    }
}

const context = {
    nodeTransforms: [transformText, transformElement, transformRoot],
    currentNode: null,
    parent: null,
    childIndex: 0,
    replaceNode(newNode) {
        context.parent.children[context.childIndex] = newNode
        context.currentNode = newNode
    },
    removeNode() {
        if (context.parent) {
            context.parent.children.splice(context.childIndex, 1)
            context.currentNode = null
        }
    }
}

traverseNode(ast, context)

function generate(node) {
    const context = {
        code: '', // 存放生成的代码字符串
        currentIndent: 0, // 当前缩进级别

        // 工具方法：向代码中添加内容
        push(code) {
            context.code += code
        },

        // 工具方法：换行
        newLine() {
            context.code += '\n' + '  '.repeat(context.currentIndent)
        },

        // 工具方法：增加缩进
        indent() {
            context.currentIndent++
            context.newLine()
        },

        // 工具方法：减少缩进
        deIndent() {
            context.currentIndent--
            context.newLine()
        }
    }

    genNode(node, context)

    return context
}

const code = generate(ast.jsNode)
console.log(code.code)

function genNode(node, context) {
    switch (node.type) {
        case 'FunctionDecl':
            genFunctionDecl(node, context)
            break
        case 'ReturnStatement':
            genReturnStatement(node, context)
            break
        case 'CallExpression':
            genCallExpression(node, context)
            break
        case 'StringLiteral':
            genStringLiteral(node, context)
            break
        case 'ArrayExpression':
            genArrayExpression(node, context)
            break
        case 'Identifier':
            genIdentifier(node, context)
            break
    }
}

function genStringLiteral(node, context) {
    // 字符串字面量：加上双引号
    context.push(`"${node.value}"`)
}

function genIdentifier(node, context) {
    // 标识符：直接输出名字
    context.push(node.name)
}

function genArrayExpression(node, context) {
    const { push } = context

    // 输出左方括号
    push('[')

    // 处理数组中的每个元素
    const { elements } = node
    for (let i = 0; i < elements.length; i++) {
        // 递归处理每个元素
        genNode(elements[i], context)

        // 如果不是最后一个元素，添加逗号和空格
        if (i < elements.length - 1) {
            push(', ')
        }
    }

    // 输出右方括号
    push(']')
}

function genCallExpression(node, context) {
    const { push } = context
    const { callee, arguments: args } = node

    // 先处理函数名
    genNode(callee, context)

    // 输出左括号
    push('(')

    // 处理参数列表
    for (let i = 0; i < args.length; i++) {
        // 递归处理每个参数
        genNode(args[i], context)

        // 如果不是最后一个参数，添加逗号和空格
        if (i < args.length - 1) {
            push(', ')
        }
    }

    // 输出右括号
    push(')')
}

function genFunctionDecl(node, context) {
    const { push, indent, deIndent } = context
    const { id, params, body } = node

    // 生成函数签名：function 函数名(参数列表) {
    push('function ')
    genNode(id, context)
    push('(')

    // 处理参数列表（这里我们的示例没有参数，所以留空）
    if (params && params.length) {
        for (let i = 0; i < params.length; i++) {
            genNode(params[i], context)
            if (i < params.length - 1) {
                push(', ')
            }
        }
    }

    push(') {')

    // 函数体：需要缩进
    indent()

    // 处理函数体中的语句（通常是返回语句）
    body.forEach(statement => {
        genNode(statement, context)
    })

    // 退出函数体：减少缩进
    deIndent()
    push('}')
}

function genReturnStatement(node, context) {
    const { push } = context

    // 输出 return 关键字
    push('return ')

    // 处理返回值
    genNode(node.return, context)
}

// function dump(node, indent = 0) {
//     const hyphens = '-'.repeat(indent)
//     const tag = node.tag || node.content || ''
//     console.log(hyphens + node.type + ': ' + tag)

//     if (node.children && node.children.length) {
//         node.children.forEach(child => dump(child, indent + 2))
//     }
// }

/**
 * 创建字符串字面量节点
 */
function createStringLiteral(value) {
    return {
        type: 'StringLiteral',
        value
    }
}

/**
 * 创建标识符节点
 */
function createIdentifier(name) {
    return {
        type: 'Identifier',
        name
    }
}

/**
 * 创建数组表达式节点
 */
function createArrayExpression(elements) {
    return {
        type: 'ArrayExpression',
        elements
    }
}

/**
 * 创建函数调用表达式节点
 */
function createCallExpression(callee, arguments) {
    return {
        type: 'CallExpression',
        callee: createIdentifier(callee),
        arguments
    }
}

/**
 * 创建返回语句节点
 */
function createReturnStatement(returnValue) {
    return {
        type: 'ReturnStatement',
        return: returnValue
    }
}

/**
 * 创建函数声明节点
 */
function createFunctionDecl(id, params, body) {
    return {
        type: 'FunctionDecl',
        id: createIdentifier(id),
        params,
        body
    }
}
