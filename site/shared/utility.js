/**
 * Checks the compatibility of user's browser.
 * @return {boolean} true if the browser is compatible with the site.
 */
function checkBrowser() {
    try {
        class Test {
            constructor() {
                this.result = typeof customElements.define === 'function'
            }
        }
        return new Test().result
    } catch (e) {
        return false
    }
}