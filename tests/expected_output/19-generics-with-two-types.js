/**
 * @property {Map<string, number>} x Some  property
 * @property {Promise<any>} y Some  property
 */
class Foo {
    x: Map<string, number>;
    y: Promise<any>;
    /**
     * @param {Map<string, number>} one
     * @returns {Map<string, number>}
     */
    f(one: Map<string, number>) : Map<string, number> {

    }

    /**
     * @param {Promise<any>} one
     * @returns {Promise<any>}
     */
    f2(one: Promise<any>) : Promise<any> {

    }
}
