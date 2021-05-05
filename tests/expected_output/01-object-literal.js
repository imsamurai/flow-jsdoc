var obj = {
    /**
     * Some description
     * @param {number} key The key!
     * @return {Object} The lock!
     */
    foo: function(key: number) : Object {
    	return {};
    },

    /**
     * The answer to life, the universe, and everything.
     * @return {number} The answer
     */
    bar: function(undocumented) : number {
    	return 42;
    },

    /**
     * The answer to life, the universe, and everything.
     * @return {{"some 1": number, z: boolean, a: string, "032423": Object}} The answer
     */
    baz: function() : {"some 1": number, "z": boolean, "a": string, "032423": Object} {
    }
};
