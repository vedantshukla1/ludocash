const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const srcDir = path.join(__dirname, 'src');

function findJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findJsFiles(filePath, fileList);
    } else if (filePath.endsWith('.js')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const jsFiles = findJsFiles(srcDir);

jsFiles.forEach(file => {
  if (file.includes('sounds.js')) return; // skip sound util
  
  const code = fs.readFileSync(file, 'utf8');
  if (!code.includes('TouchableOpacity') && !code.includes('Pressable')) return;
  
  let modified = false;
  let hasPlaySoundImport = code.includes('playSound');

  try {
    const ast = require('@babel/parser').parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'], 
    });

    traverse(ast, {
      JSXOpeningElement(path) {
        const name = path.node.name.name;
        if (name === 'TouchableOpacity' || name === 'Pressable') {
          // Look for onPress
          const onPressAttr = path.node.attributes.find(
            attr => attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'onPress'
          );

          if (onPressAttr && onPressAttr.value && onPressAttr.value.type === 'JSXExpressionContainer') {
            const exp = onPressAttr.value.expression;
            
            // Check if playSound is already called inside
            let hasPlaySound = false;
            path.traverse({
              CallExpression(callPath) {
                if (callPath.node.callee && callPath.node.callee.name === 'playSound') {
                  hasPlaySound = true;
                  callPath.stop();
                }
              }
            });

            if (!hasPlaySound) {
              modified = true;
              
              const playSoundCall = t.callExpression(
                t.identifier('playSound'),
                [t.stringLiteral('button_click')]
              );

              if (t.isArrowFunctionExpression(exp) || t.isFunctionExpression(exp)) {
                if (t.isBlockStatement(exp.body)) {
                  exp.body.body.unshift(t.expressionStatement(playSoundCall));
                } else {
                  exp.body = t.blockStatement([
                    t.expressionStatement(playSoundCall),
                    t.returnStatement(exp.body)
                  ]);
                }
              } else {
                onPressAttr.value.expression = t.arrowFunctionExpression(
                  [t.restElement(t.identifier('args'))],
                  t.blockStatement([
                    t.expressionStatement(playSoundCall),
                    t.returnStatement(
                      t.callExpression(exp, [t.spreadElement(t.identifier('args'))])
                    )
                  ])
                );
              }
            }
          }
        }
      }
    });

    if (modified) {
      let output = generate(ast, {}, code).code;
      
      // Inject import if missing
      if (!hasPlaySoundImport) {
        const relativePath = path.relative(path.dirname(file), path.join(srcDir, 'utils', 'sounds')).replace(/\\/g, '/');
        const importStmt = `import { playSound } from '${relativePath.startsWith('.') ? relativePath : './' + relativePath}';\n`;
        
        const lines = output.split('\n');
        let lastImportIdx = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('import ')) {
            lastImportIdx = i;
          }
        }
        
        if (lastImportIdx >= 0) {
          lines.splice(lastImportIdx + 1, 0, importStmt);
          output = lines.join('\n');
        } else {
          output = importStmt + output;
        }
      }

      fs.writeFileSync(file, output);
      console.log('Injected button sounds into: ' + file);
    }

  } catch (err) {
    console.error('Failed to parse ' + file, err.message);
  }
});
