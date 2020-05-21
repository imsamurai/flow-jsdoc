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
    get some2() : Number {
        return "null"
    }

    /**
     * @param {boolean} x
     * @param {boolean} y
     * @returns {Object}
     */
    func(x/*: number */, y: boolean) /*: string */ {
        return "dsfsdf";
    }

    /**
     * @param {boolean} x
     * @param {boolean} y
     * @returns {Object}
     */
    func2(x: boolean, y: boolean) : Object {
        return "dsfsdf";
    }
}

/**
 * @param {boolean} x
 * @param {boolean} y
 * @returns {Object}
 */
const x = (x/*: number */, y: boolean) /*: string */ => 3

/**
 * @param {boolean} x
 * @param {boolean} y
 * @returns {Object}
 */
const x2 = (x: boolean, y: boolean) : Object => 3
