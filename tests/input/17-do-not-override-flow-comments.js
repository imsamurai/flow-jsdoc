class Foo {

    /**
     * @type {Number}
     */
    get some()/*: string */ {
        return "null"
    }

    /**
     * @type {Number}
     */
    get some2() {
        return "null"
    }

    /**
     * @param {boolean} x
     * @param {boolean} y
     * @returns {Object}
     */
    func(x/*: number */, y) /*: string */ {
        return "dsfsdf";
    }

    /**
     * @param {boolean} x
     * @param {boolean} y
     * @returns {Object}
     */
    func2(x, y) {
        return "dsfsdf";
    }
}

/**
 * @param {boolean} x
 * @param {boolean} y
 * @returns {Object}
 */
const x = (x/*: number */, y) /*: string */ => 3

/**
 * @param {boolean} x
 * @param {boolean} y
 * @returns {Object}
 */
const x2 = (x, y) => 3
