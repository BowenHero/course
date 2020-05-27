const css = `
$ib inline-block
div
  p
    transition zoom(1.4) translateX(10px)
  display $ib
  .a-b
    color red
d-ib
  display inline-block
`
/**
 * ============================================================================
 *                            词法分析器（Tokenizer）!
 * type: 
 *   variable
 *   selector
 *   propertbb
 *   value
 * ============================================================================
 */
function tokenizer(text) {
  let tokens = [];
  text.trim().split(/\n|\r\n/).forEach(line => {
    const spaces = line.match(/^\s+/) || ['']
    const indent = spaces[0].length
    const input = line.trim()
    let current = 0;
    while (current < input.length) {
      const char = input[current];
      const WHITESPACE = /\s/;
      const SELECTOR = /\.|#/
      let value = ''
      if (WHITESPACE.test(char)) {
        current++;
        continue;
      }
      // 变量
      if (char === '$') {
        value = char
        current++
        while (/[a-zA-Z0-9]/.test(input[current]) && current < input.length) {
          value += input[current];
          current++;
        }
        tokens.push({
          type: 'variable',
          value,
          indent
        })
        // 跳过空格
        value = ''
        current++
        // 值
        while (/[a-zA-Z0-9\-]/.test(input[current]) && current < input.length) {
          value += input[current];
          current++;
        }
        tokens.push({
          type: 'value',
          value,
          indent
        })
        value = ''
        continue;
      }
      // 选择器
      if (!WHITESPACE.test(input)) {
        let value = char
        current++
        while (/[a-zA-Z0-9\-]/.test(input[current]) && current < input.length) {
          value += input[current];
          current++;
        }
        tokens.push({
          type: 'selector',
          value,
          indent
        })
      } else {
        // 属性和值（变量）
        let words = input.split(/\s/)
        tokens.push({
          type: 'property',
          value: words.shift(),
          indent
        })
        const name = words.join(' ')
        if (/^\$/.test(name)) {
          tokens.push({
            type: 'variable',
            value: name,
            indent: 0
          })
        } else {
          tokens.push({
            type: 'value',
            value: name,
            indent: 0
          })
        }
      }
      break;
    }
  })
  return tokens;
}

/**
 * ============================================================================
 *                             语法分析器（Parser）!!!
 * {
 *   type: 'root',
 *   children: [{
 *     type: 'variable',
 *     key: '',
 *     value: '',
 *   }, {
 *     type: 'selector',
 *     rules: [{
 *       property: '',
 *       value: '',
 *     }],
 *     indent: 0,
 *     children: []
 *   }]
 * } 
 * ============================================================================
 */
function parser(tokens) {
  var ast = {
    type: 'root',
    children: [],
    indent: -1
  };
  let curNode = ast
  let node
  let vDict = {}
  while (node = tokens.shift()) {
    if (node.type === 'variable') {
      if (tokens[0] && tokens[0].type === 'value') {
        const vNode = tokens.shift()
        vDict[node.value] = vNode.value
      } else {
        curNode.rules[curNode.rules.length - 1].value = vDict[node.value]
      }
      continue;
    }
    if (node.type === 'property') {
      curNode.rules.push({
        property: node.value
      })
      continue;
    }
    if (node.type === 'value') {
      curNode.rules[curNode.rules.length - 1].value = node.value
      continue;
    }
    if (node.type === 'selector') {

    }
  }
  return ast;
}

/**
 * ============================================================================
 *                                   遍历器!!!
 * ============================================================================
 */

/**
 * 现在我们有了 AST，我们需要一个 visitor 去遍历所有的结点。当遇到某个类型的结点时，我们
 * 需要调用 visitor 中对应类型的处理函数。
 *
 *   traverse(ast, {
 *     Program(node, parent) {
 *       // ...
 *     },
 *
 *     CallExpression(node, parent) {
 *       // ...
 *     },
 *
 *     NumberLiteral(node, parent) {
 *       // ...
 *     }
 *   });
 */

// 所以我们定义一个遍历器，它有两个参数，AST 和 vistor。在它的里面我们又定义了两个函数...
function traverser(ast, visitor) {

  // `traverseArray` 函数允许我们对数组中的每一个元素调用 `traverseNode` 函数。
  function traverseArray(array, parent) {
    array.forEach(function (child) {
      traverseNode(child, parent);
    });
  }

  // `traverseNode` 函数接受一个 `node` 和它的父结点 `parent` 作为参数，这个结点会被
  // 传入到 visitor 中相应的处理函数那里。
  function traverseNode(node, parent) {

    // 首先我们看看 visitor 中有没有对应 `type` 的处理函数。
    var method = visitor[node.type];

    // 如果有，那么我们把 `node` 和 `parent` 都传入其中。
    if (method) {
      method(node, parent);
    }

    // 下面我们对每一个不同类型的结点分开处理。
    switch (node.type) {

      // 我们从顶层的 `Program` 开始，Program 结点中有一个 body 属性，它是一个由若干
      // 个结点组成的数组，所以我们对这个数组调用 `traverseArray`。
      //
      // （记住 `traverseArray` 会调用 `traverseNode`，所以我们会递归地遍历这棵树。）
      case 'Program':
        traverseArray(node.body, node);
        break;

        // 下面我们对 `CallExpressions` 做同样的事情，遍历它的 `params`。
      case 'CallExpression':
        traverseArray(node.params, node);
        break;

        // 如果是 `NumberLiterals`，那么就没有任何子结点了，所以我们直接 break
      case 'NumberLiteral':
        break;

        // 同样，如果我们不能识别当前的结点，那么就抛出一个错误。
      default:
        throw new TypeError(node.type);
    }
  }

  // 最后我们对 AST 调用 `traverseNode`，开始遍历。注意 AST 并没有父结点。
  traverseNode(ast, null);
}

/**
 * ============================================================================
 *                                   转换器!!!
 * ============================================================================
 */

// 定义我们的转换器函数，接收 AST 作为参数
function transformer(ast) {

  // 创建 `newAST`，它与我们之前的 AST 类似，有一个类型为 Program 的根节点。
  var newAst = {
    type: 'Program',
    body: []
  };

  // 下面的代码会有些奇技淫巧，我们在父结点上使用一个属性 `context`（上下文），这样我们就
  // 可以把结点放入他们父结点的 context 中。当然可能会有更好的做法，但是为了简单我们姑且
  // 这么做吧。
  //
  // 注意 context 是一个*引用*，从旧的 AST 到新的 AST。
  ast._context = newAst.body;

  // 我们把 AST 和 visitor 函数传入遍历器
  traverser(ast, {

    // 第一个 visitor 方法接收 `NumberLiterals`。
    NumberLiteral: function (node, parent) {

      // 我们创建一个新结点，名字叫 `NumberLiteral`，并把它放入父结点的 context 中。
      parent._context.push({
        type: 'NumberLiteral',
        value: node.value
      });
    },

    // 下一个，`CallExpressions`。
    CallExpression: function (node, parent) {

      // 我们创建一个 `CallExpression` 结点，里面有一个嵌套的 `Identifier`。
      var expression = {
        type: 'CallExpression',
        callee: {
          type: 'Identifier',
          name: node.name
        },
        arguments: []
      };

      // 下面我们在原来的 `CallExpression` 结点上定义一个新的 context，它是 expression
      // 中 arguments 这个数组的引用，我们可以向其中放入参数。
      node._context = expression.arguments;

      // 然后来看看父结点是不是一个 `CallExpression`，如果不是...
      if (parent.type !== 'CallExpression') {

        // 我们把 `CallExpression` 结点包在一个 `ExpressionStatement` 中，这么做是因为
        // 单独存在（原文为top level）的 `CallExpressions` 在 JavaScript 中也可以被当做
        // 是声明语句。
        // 
        // 译者注：比如 `var a = foo()` 与 `foo()`，后者既可以当作表达式给某个变量赋值，也
        // 可以作为一个独立的语句存在。
        expression = {
          type: 'ExpressionStatement',
          expression: expression
        };
      }

      // 最后我们把 `CallExpression`（可能是被包起来的） 放入父结点的 context 中。
      parent._context.push(expression);
    }
  });

  // 最后返回创建好的新 AST。
  return newAst;
}

/**
 * ============================================================================
 *                                代码生成器!!!!
 * ============================================================================
 */

function codeGenerator(node) {

  // 对于不同 `type` 的结点分开处理。
  switch (node.type) {

    // 如果是 `Program` 结点，那么我们会遍历它的 `body` 属性中的每一个结点，并且递归地
    // 对这些结点再次调用 codeGenerator，再把结果打印进入新的一行中。
    case 'Program':
      return node.body.map(codeGenerator)
        .join('\n');

      // 对于 `ExpressionStatements`,我们对它的 expression 属性递归调用，同时加入一个
      // 分号。
    case 'ExpressionStatement':
      return (
        codeGenerator(node.expression) +
        ';' // << (...因为我们喜欢用*正确*的方式写代码)
      );

      // 对于 `CallExpressions`，我们会打印出 `callee`，接着是一个左圆括号，然后对
      // arguments 递归调用 codeGenerator，并且在它们之间加一个逗号，最后加上右圆括号。
    case 'CallExpression':
      return (
        codeGenerator(node.callee) +
        '(' +
        node.arguments.map(codeGenerator)
        .join(', ') +
        ')'
      );

      // 对于 `Identifiers` 我们只是返回 `node` 的 name。
    case 'Identifier':
      return node.name;

      // 对于 `NumberLiterals` 我们只是返回 `node` 的 value
    case 'NumberLiteral':
      return node.value;

      // 如果我们不能识别这个结点，那么抛出一个错误。
    default:
      throw new TypeError(node.type);
  }
}

/**
 * ============================================================================
 *                         !!!!!!!!!!!!编译器!!!!!!!!!!!
 * ============================================================================
 */

function compiler(input) {
  var tokens = tokenizer(input);
  var ast = parser(tokens);
  var newAst = transformer(ast);
  var output = codeGenerator(newAst);
  return output;
}

function log(o) {
  typeof o === 'object' ? console.log(JSON.stringify(o, null, 2)) : console.log(o)
}
const pre = {
  tokenizer: tokenizer,
  parser: parser,
  transformer: transformer,
  codeGenerator: codeGenerator,
  compiler: compiler
};
const token = pre.tokenizer(css)
log(token)
const ast = pre.parser(token)
log(ast)