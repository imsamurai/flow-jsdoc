"use strict";

var falafel = require("./lib/falafel");
var doctrine = require("doctrine"); // JSDoc parsing
var fs = require("fs");
var util = require("util");

function jsdocTagToFlowTag(tag) {
    // console.log(util.inspect(tag));
    return {
        loc: tag.title, //param|return
        description: tag.description, //param|return
        name: tag.name, // the parameter name
        type: jsdocTypeToFlowType(tag.type) // the parameter type
    };
}

/**
 * Extract formatted JSDoc from a comment.
 * @param {String} comment The comment which may have JSDoc in it.
 * @return {Object} With 'params' and 'return' arrays which have 'loc', 'name'
 * and 'type' elements.
 */
function extractJsdoc(comment) {
    var docAst = doctrine.parse(comment, { unwrap: true, sloppy: true });
    if (!docAst.tags || docAst.tags.length === 0) {
        return null;
    }
    // only interested in @param @property, and @return
    var paramTags = docAst.tags.filter(function(tag) {
        return tag.title === "param";
    }).map(jsdocTagToFlowTag);

    var returnTags = docAst.tags.filter(function(tag) {
        return tag.title === "return" || tag.title === "returns" || tag.title === "type";
    }).map(jsdocTagToFlowTag);

    var propTags = docAst.tags.filter(function(tag) {
        return tag.title === "property" || tag.title === "prop";
    }).map(jsdocTagToFlowTag);

    var enumTags = docAst.tags.filter(function(tag) {
        return tag.title === "enum";
    }).map(jsdocTagToFlowTag);

    return {
        params: paramTags,
        returns: returnTags,
        props: propTags,
        enums: enumTags
    };
}

/**
 * Extract "formatted JSDoc" from an in-line comment. This is actually a
 * custom syntax specific to flow-jsdoc which looks like:
 *    //: (string, number): Object
 * There needs to be a ":" to start it off (to avoid false positives).
 * Since there are no parameter names in this syntax form, the function
 * node is also required.
 * @return {Object} Exactly the same format as `extractJsdoc(comment)`.
 */
function extractInlineAnnotations(funcNode, comment) {
    comment = comment.trim();
    if (comment[0] !== ":") {
        return null; // invalid syntax
    }
    // [ "", " (string, number)", " Object" ]
    var segments = comment.split(":");
    var returnType = segments[2] ? segments[2].trim() : null; // optional, may be 'void'
    var paramBlock = segments[1].trim();
    if (paramBlock[0] !== "(" || paramBlock[paramBlock.length-1] !== ")") {
        panicInline(funcNode, comment,
            "Expected inline comment to have ( ) around parameters"
        );
    }
    paramBlock = paramBlock.slice(1, -1); // "string, number"
    var paramTypes = paramBlock.split(",").map(function(p) {
        return p.trim();
    }).filter(function(p) {
        return p.length > 0;
    });

    // Make sure the number of params in the comment == num in function
    if (paramTypes.length !== funcNode.params.length) {
        panicInline(funcNode, comment,
            "Inline comment has wrong number of parameters: " + paramTypes.length +
            ". Expected: " + funcNode.params.length
        );
        process.exit(1);
    }

    var paramTags = funcNode.params.map(function(p, i) {
        return {
            loc: "param",
            name: p.name,
            type: paramTypes[i]
        };
    });
    var returnTags = [];
    if (returnType) {
        returnTags = [{
            loc: "return",
            type: returnType
        }];
    }

    return {
        params: paramTags,
        returns: returnTags,
        props: []
    };
}

function panicInline(funcNode, comment, msg) {
    console.error(
        msg + "\n" +
        "    " + comment + "\n" +
        "    " + funcNode.source().split("\n")[0] // just the function header
    );
    process.exit(1);
}

function jsdocTypeToFlowType(jsdocType) {
    if (!jsdocType || !jsdocType.type) {
        return;
    }
    switch(jsdocType.type) {
        case "NameExpression": // {string}
            return jsdocType.name;
        case "TypeApplication": // {Foo<Bar>}
            // e.g. 'Array' in Array<String>
            var baseType = jsdocTypeToFlowType(jsdocType.expression);
            // Flow only supports single types for generics
            var specificType = jsdocTypeToFlowType(jsdocType.applications[0]);
            if (baseType && specificType) {
                return baseType + "<" + specificType + ">";
            }
            break;
        case "UnionType": // {(Object|String)}
            var types = jsdocType.elements.map(function(t) {
                return jsdocTypeToFlowType(t);
            });
            return types.join(" | ");
        case "AllLiteral": // {*}
            return "any";
        case "OptionalType": // {string=}
        case "NullableType": // {?string}
            return "?" + jsdocTypeToFlowType(jsdocType.expression);
        default:
            // console.log("Unknown jsdoc type: %s", JSON.stringify(jsdocType));
            break;
    }
}

/**
 * Retrieve a function node along with parsed JSDoc comments for it.
 * @param {Node} node The node to inspect.
 * @return {?Object} An object with "jsdoc" and "node" keys, or null.
 */
function getCommentedFunctionNode(node) {
    if (!node.leadingComments) {
        // JSDoc comments are always before the function, so if there is
        // nothing here, we ain't interested.
        return null;
    }
    // console.log("=================");
    // console.log("type: " + node.type);
    // console.log(util.inspect(node));
    /*
     * We handle the following function representations:
     *
     *     Type               Path to Function              Example
     * ==========================================================================================
     * FunctionDeclaration           -                  function foo(bar) {}
     * VariableDeclaration   .declarations[0].init      var foo = function(bar) {}
     * ExpressionStatement   .expression.right          ObjClass.prototype.foo = function(bar) {}
     * MethodDefinition      .value                     class ObjClass { foo(bar) {} }
     * Property              .value                     var obj = { key: function(bar) {} }
     * ReturnStatement       .argument                  return function(foo, bar) {}
     * ArrowFunctionExpression       -                  (foo, bar) => {}
     * ExportNamedDeclaration .declaration              export function foo(bar) {}
     *
     */
    var nodeTypes = [
        "FunctionDeclaration", "ExpressionStatement", "VariableDeclaration",
        "MethodDefinition", "Property", "ReturnStatement", "ArrowFunctionExpression",
        "ExportNamedDeclaration"
    ];
    if (nodeTypes.indexOf(node.type) === -1) {
        return null;
    }
    var funcNode = null;
    switch (node.type) {
        case "FunctionDeclaration":
        case "ArrowFunctionExpression":
            funcNode = node;
            break;
        case "VariableDeclaration":
            funcNode = node.declarations[0].init;
            break;
        case "ExpressionStatement":
            funcNode = node.expression.right;
            break;
        case "MethodDefinition":
            funcNode = node.value;
            break;
        case "Property":
            funcNode = node.value;
            break;
        case "ReturnStatement":
            funcNode = node.argument;
            break;
        case "ExportNamedDeclaration":
            var declaration = node.declaration;
            if (declaration.type === 'VariableDeclaration') {
                funcNode = declaration.declarations[0].init;
            } else {
                funcNode = declaration
            }
            break;
    }
    var funcNodeTypes = ["FunctionDeclaration", "FunctionExpression", "ArrowFunctionExpression"];
    if (!funcNode || funcNodeTypes.indexOf(funcNode.type) === -1) {
        // We can't find a function here which can map to leadingComments.
        return null;
    }
    var funcDocs = null;
    for (var i=0; i<node.leadingComments.length; i++) {
        // Block comments are either JSDoc or flow-jsdoc specific in-inline syntax
        if (node.leadingComments[i].type === "Block") {
            funcDocs = extractJsdoc(node.leadingComments[i].value);
            if (funcDocs) { break; }
            // may be inline form with /* */
            funcDocs = extractInlineAnnotations(funcNode, node.leadingComments[i].value);

            if (funcDocs) {
                node.leadingComments[i].update("");
                break;
            }
        }
        else if (node.leadingComments[i].type === "Line") {
            // Line comments can only be flow-jsdoc specific in-line syntax.
            funcDocs = extractInlineAnnotations(funcNode, node.leadingComments[i].value);
            if (funcDocs) {
                node.leadingComments[i].update("");
                break;
            }
        }
    }

    return {
        node: funcNode,
        jsdoc: funcDocs
    };
}

/**
 * Retrieve an ES6 class node along with parsed JSDoc comments from the constructor().
 * @param {Node} node The node to inspect.
 * @return {?Object} An object with "jsdoc" and "node" keys, or null.
 */
function getCommentedClassNode(node) {
    const nodeType = node.type;
    if (nodeType !== "ClassBody" && nodeType !== "ClassDeclaration") {
        return null;
    }

    // look for a constructor() and then look for property tags which we can annotate with.
    var constructNode = null;
    for (var i = 0; i < node.body.length; i++) {
        if (node.body[i].kind === "constructor" && node.body[i].type === "MethodDefinition") {
            constructNode = node.body[i];
        }
    }

    if (nodeType === "ClassDeclaration") {
        constructNode = node;
    }

    if (!constructNode || !constructNode.leadingComments) {
        return null;
    }

    let leadingComments = constructNode.leadingComments;

    if (nodeType === "ClassDeclaration") {
        node = node.body;
        // skip all comments before actial class jsdoc
        leadingComments = [constructNode.leadingComments[constructNode.leadingComments.length - 1]];
    }

    // check for @property JSDoc on the constructor
    var constructDocs = null;

    for (var i=0; i<leadingComments.length; i++) {
        if (leadingComments[i].type === "Block") {
            constructDocs = extractJsdoc(leadingComments[i].value);
            break;
        }
    }
    if (nodeType === "ClassDeclaration" && constructDocs) {
        applyClassNodeStaticPropertyTransformation(constructNode, constructDocs);
    }
    return {
        node: node,
        jsdoc: constructDocs
    };
}

function applyClassNodeStaticPropertyTransformation(constructNode, constructDocs) {
    if (constructDocs.enums.length > 1) {
        console.error(constructNode.source());
        console.error(constructDocs);
        throw new Error("Enum must be only one!")
    }

    // make all props static and same type if enum tag found
    if (constructDocs.enums.length > 0) {
        const {type} = constructDocs.enums[0];
        constructDocs.props.forEach(
            item => {
                item.name = `static ${item.name}`;
                if (item.type !== type) {
                    console.error(constructNode.source());
                    console.error(constructDocs);
                    throw new Error(`All properties must be type of ${type}!`)
                }
            }
        );
    }
    // if @static found in prop description make props static
    else {
        constructDocs.props.filter(
            item => item.description && item.description.match(/@static/i)
        ).forEach(
            item => item.name = `static ${item.name}`
        );
    }
}

/*
 * Modify function signatures with flow syntax if there is JSDoc for said signature.
 */
function decorateFunctions(node) {
    var i;
    var funcNode = getCommentedFunctionNode(node);
    if (!funcNode || !funcNode.jsdoc || !funcNode.node.params) {
        return;
    }

    // Pair up the function params with the JSDoc params (if they exist)
    funcNode.node.params.forEach(function(param) {
        for (i = 0; i < funcNode.jsdoc.params.length; i++) {
            if (!funcNode.jsdoc.params[i].type) {
                continue;
            }

            // If default options are set keep the assignment in flow
            if (param.type === 'AssignmentPattern') {
                if (funcNode.jsdoc.params[i].name === param.left.name) {
                    // Remove ? if default value is set
                    var type = funcNode.jsdoc.params[i].type.replace(/^\?/, '');

                    param.update(
                        param.left.source() + ": " + type + ' = ' + param.right.source()
                    );
                }
            } else {
                if (funcNode.jsdoc.params[i].name === param.name) {
                    param.update(
                        param.source() + ": " + funcNode.jsdoc.params[i].type
                    );
                }
            }
        }
    });

    // Pair up the return value if possible
    // we only support 1 return type currently
    var returnDoc = funcNode.jsdoc.returns[0];
    if (returnDoc && returnDoc.type && funcNode.node.body) {
        if (funcNode.node.type === "ArrowFunctionExpression") {
            // we can't just add this to the end as it will then appear AFTER the =>
            // whereas we actually want it BEFORE the =>
            // Sadly, there isn't a nice way to access the bit before the =>. We do
            // however know that the node source is the entire function, and the node
            // body is the stuff between the { }. We can therefore grab the function
            // header portion and find/replace on the fat arrow.
            var funcHeader = funcNode.node.source().replace(funcNode.node.body.source(), "");
            var arrowIndex = funcHeader.lastIndexOf("=>");
            if (arrowIndex === -1) {
                // well this was unexpected...
                return;
            }
            // inject annotation before the arrow
            funcHeader = (
                funcHeader.slice(0, arrowIndex) + ": " + returnDoc.type + " " + funcHeader.slice(arrowIndex)
            );
            // replace the entire function to replace the header portion
            funcNode.node.update(
                funcHeader + funcNode.node.body.source()
            );
        }
        else {
            funcNode.node.body.update(
                ": " + returnDoc.type + " " + funcNode.node.body.source()
            );
        }
    }
}

/**
 * Modify ES6 classes by adding 'field declarations' to them if the constructor has JSDoc.
 */
function decorateClasses(node) {
    // check for class nodes
    var clsNode = getCommentedClassNode(node);
    if (!clsNode || !clsNode.jsdoc || clsNode.jsdoc.props.length === 0) {
        return;
    }

    var clsSrc = clsNode.node.source();
    if (clsSrc[0] !== "{") {
        // something isn't right, bail.
        return;
    }

    // work out line endings (find first \n and see if it has \r before it)
    var nl = "\n";
    var newlineIndex = clsSrc.indexOf("\n");
    if (clsSrc[newlineIndex-1] === "\r") {
        nl = "\r\n";
    }

    // use the same indent as the next non-blank line
    var indent = "";
    var lines = clsSrc.split(nl);
    for (var i = 1; i < lines.length; i++) { //i=1 to skip the starting {
        if (lines[i].length > 0) {
            var whitespaceMatch = /^[ \t]+/.exec(lines[i]); // match spaces or tabs
            if (whitespaceMatch) {
                indent = whitespaceMatch[0];
                break;
            }
        }
    }

    // work out what to inject into the class definition
    var fieldTypeDecls = clsNode.jsdoc.props.map(function(p) {
        return indent + p.name + ": " + p.type + ";";
    }).join(nl);

    clsNode.node.update("{" + nl + fieldTypeDecls + clsSrc.substr(1));
}

module.exports = function(src, opts) {
    opts = opts || {};

    // Walk the AST.
    // Esprima has an undocumented 'attachComment' option which binds comments
    // to the nodes in the AST.
    var output = falafel(src, {attachComment: true, jsx: true, sourceType: "module"}, function (node) {
        decorateFunctions(node);
        decorateClasses(node);
    });

    return output;
};
