/**
 * @param {...Map<string, number>} x Some rest param
 */
function f(...x: Array<Map<string, number>>) {

}

/**
 * @param {...Map<string, number>} x Some rest param
 */
function f2(...x/*: Array<Map<string, number>> */) {

}
