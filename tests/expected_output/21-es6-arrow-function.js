/**
 * @param {string} prefix prefix to use in field
 * @returns {Object} virtual field with given prefix
 */
const f = (prefix: string) : Object => ({
    some: true
});

/**
 * @param {string} prefix prefix to use in field
 * @returns {Object} virtual field with given prefix
 */
const f2 = (prefix: string) : Object => {
    return { some: true };
};
