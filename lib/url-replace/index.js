'use strict';

/**
     a
    / \
   b   c
  / \
 d   e
 Would output: d,e,b,c,a
 从叶子到根节点。。。
 */
const fs = require('fs');
const acorn = require('acorn');
const walk = require('acorn/dist/walk');
const escodegen = require('escodegen');
const logger = require('jdf-log');

const seajsReplace = require('./seajs-replace');

const urlReplace = module.exports = {};

/**
 * 给js代码中的路径做处理，处理方式由callback决定
 * 本方法提供需要处理的路径相关代码块
 * 本方法需要callback返回处理过的callback形参，例：
 * this.main(source, function (nodeObj) {
 *     // TODO handle nodeObj;
 *     return nodeObj;
 * });
 * @param  {string}   source   js代码块
 * @param  {Object}   options  可选，后续功能扩展用
 * @param  {Function} callback 处理路径的回调函数
 * @return {[Object]}          传递给回调函数的参数，并且已由回调函数处理
 */
urlReplace.main = function (source, options, callback) {
    if (!callback && typeof options === 'function') {
        callback = options;
    }
    let comments = [], tokens = [];
    logger.verbose(`parse source to ast`);
    const ast = acorn.parse(source, {
        sourceType: 'script'
    });

    // 收集阶段
    // 反向深度优先walk
    logger.verbose(`walk ast`);
    walk.simple(ast, {
        CallExpression: urlReplace.visitors.CallExpression,
    });

    // 处理阶段
    // ------begin---
    logger.verbose(`handle define`);
    seajsReplace.handleDefine(function (nodeObj) {
        nodeObj = callback(nodeObj);
        return nodeObj;
    });

    logger.verbose(`handle seajs.use(include require.async)`);
    seajsReplace.handleUse(function (nodeObj) {
        nodeObj = callback(nodeObj);
        return nodeObj;
    });
    // ------end--------

    // 生成阶段
    console.log(escodegen.generate(ast));
    return escodegen.generate(ast);
}

urlReplace.visitors = {
    CallExpression: function (node) {
        seajsReplace.collectUse(node);
        seajsReplace.collectRequireAsync(node);
        seajsReplace.collectDefine(node);
    }
};

let source = fs.readFileSync('./exampledata.js');
urlReplace.main(source, function (nodeObj) {
    // 这是个示例
    nodeObj.str = 'misc.360buyimg.com/' + nodeObj.str;
    return nodeObj;
});