/**
 * @property {Map<string, number>} x Some  property
 * @property {Promise<any>} y Some  property
 */
class Foo {
    /**
     * @param {Map<string, number>} one
     * @returns {Map<string, number>}
     */
    f(one) {

    }

    /**
     * @param {Promise<any>} one
     * @returns {Promise<any>}
     */
    f2(one) {

    }

    /**
     * @param {Promise<{x:number, y: {z: number}}>} one
     * @returns {Promise<{x:number, y: {z: number}}>}
     */
    f3(one) {

    }

    /**
     * @param {Promise<undefined>} one
     * @returns {Promise<undefined>}
     */
    f4(one) {

    }

    /**
     * @param {Promise<function(x:number,y:string): boolean>} one
     * @returns {Promise<function(x:number,y:string): boolean>}
     */
    f5(one) {

    }

    /**
     * @param {function(x:number,y:string): boolean} one
     * @returns {function(x:number,y:string): boolean}
     */
    f6(one) {

    }

    /**
     * @param {function(number, Array<string>, {x: boolean}, function(number, Array<string>): boolean): boolean} one
     * @returns {function(number, Array<string>, {x: boolean}, function(number, Array<string>): boolean): boolean}
     */
    f7(one) {

    }
}
