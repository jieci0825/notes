// 读取文件目录
const fs = require('fs')
const path = require('path')
const matter = require('gray-matter')
const { globSync } = require('glob')
const { execSync } = require('child_process')

const DocsDir = path.join(process.cwd(), 'docs')

/**
 * 生成节点
 * @param {*} names
 */
function genNode(key, parentKey) {
    const isFile = key.endsWith('.md')

    const filename = key.split(path.sep).pop()

    const node = {
        filename: isFile ? filename.replace(/\.md$/, '') : filename,
        path: `.${path.sep}docs${path.sep}${key}`, // 相对地址
        children: isFile ? null : [],
        key,
        parentKey
    }

    return node
}

/**
 * 生成文件树
 */
function genTree(nodes, parentKey = null) {
    const tree = []
    nodes
        .filter(item => item.parentKey === parentKey)
        .forEach(item => {
            const children = genTree(nodes, item.key)
            if (children.length) {
                item.children = children
            }
            tree.push(item)
        })
    return tree
}

/**
 * 构建节点列表
 */
function buildNodes(files) {
    const nodes = []
    files.forEach(item => {
        buildNode(item, nodes)
    })

    function buildNode(paths, nodes) {
        let preNode = null
        while (paths.length) {
            const name = paths.shift()
            const node = genNode(name, preNode ? preNode.key : null)
            nodes.push(node)
            preNode = node
        }
    }

    return nodes
}

/**
 * 根据 key 去重
 */
function uniqByKey(arr) {
    return Array.from(new Map(arr.map(item => [item.key, item])).values())
}

/**
 * 获取所有 markdown 文件列表
 */
function getAllMdFiles(dir) {
    const files = globSync(`**${path.sep}*.md`, { cwd: dir }).map(item => {
        const paths = item.split(path.sep)
        return paths.map((_, i) => paths.slice(0, i + 1).join(path.sep))
    })

    return files
}

/**
 * 递归遍历树
 */
function traverseTree(nodes, handler) {
    if (!Array.isArray(nodes)) return

    nodes.forEach(node => {
        handler(node)

        if (Array.isArray(node.children)) {
            traverseTree(node.children, handler)
        }
    })
}

/**
 * 根据树结构生成目录
 */
function generateToc(tree, level = 0) {
    const indent = '  '.repeat(level)
    let result = ''

    for (const node of tree) {
        // 目录
        if (Array.isArray(node.children)) {
            result += `${indent}- ${node.filename}\n`
            result += generateToc(node.children, level + 1)
        }
        // Markdown 文件
        else {
            result += `${indent}- [${node.filename}](${node.path})\n`
        }
    }

    return result
}

/**
 * 将 toc 写入文件
 */
function writeTocToFile(tocContent, filePath) {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const lines = raw.split('\n')

    const TOC_START = '<!-- AUTO_TOC_START -->'
    const TOC_END = '<!-- AUTO_TOC_END -->'

    const tocBlock = [TOC_START, tocContent, TOC_END]

    const startIndex = lines.findIndex(l => l.includes(TOC_START))
    const endIndex = lines.findIndex(l => l.includes(TOC_END))

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        // 情况 1：已存在 TOC → 直接替换
        lines.splice(startIndex, endIndex - startIndex + 1, ...tocBlock)
    } else {
        // 情况 2：不存在 TOC → 固定从第 2 行插入
        const insertIndex = Math.min(1, lines.length)
        lines.splice(insertIndex, 0, ...tocBlock)
    }

    fs.writeFileSync(filePath, lines.join('\n'))
}

/**
 * 更新 TOC
 */
function runUpdateToc() {
    const files = getAllMdFiles(DocsDir)
    const nodes = uniqByKey(buildNodes(files))
    const nodeTrees = genTree(nodes)
    traverseTree(nodeTrees, node => {
        if (node.path.endsWith('.md')) {
            const filePath = path.join(process.cwd(), node.path)
            const fileContent = fs.readFileSync(filePath, 'utf-8')
            const { data } = matter(fileContent)
            node.meta = data
        }
    })
    const toc = generateToc(nodeTrees)
    const tocFilePath = path.join(process.cwd(), 'README.md')
    writeTocToFile(toc, tocFilePath)
    console.log('TOC generated successfully!')
}

/**
 * 执行命令
 */
function runCommand(cmd) {
    console.log(`\n> ${cmd}`)
    execSync(cmd, { stdio: 'inherit', cwd: process.cwd() })
}

function run() {
    try {
        // 1. 更新 TOC
        runUpdateToc()

        // 2. git add
        runCommand(`git add README.md`)

        // 3. 判断是否有变更
        // const diff = execSync('git diff --cached --name-only').toString().trim()
        // console.log('===', diff)

        // if (!diff) {
        //     console.log('\nNo changes to commit.')
        //     process.exit(0)
        // }

        // 3. git commit
        // runCommand('git commit -m "docs: update toc"')

        // 4. git push
        // runCommand('git push')

        console.log('\n✔ TOC updated and pushed successfully.')
    } catch (error) {
        console.error('\n✖ Script failed.', error)
        process.exit(1)
    }
}

run()
