// Created by zhufucdev
// Licenced under the GPL-v3

let ContentViewer = {};
(function () {
    let counter = 0;

    class Viewer {
        constructor(ele, options) {
            Object.defineProperty(this, 'rootElement', {
                get() {
                    return ele
                }
            });
            ele.style.bottom = -ele.clientHeight + 'px';
            ele.style.zIndex = '1001';
            ele.style.maxHeight = '100%';
            ele.style.overflowY = 'auto';
            this.shown = false;
            this.onhide = undefined;
            this.updateHeight = () => {
                if (!this.shown)
                    ele.style.bottom = -ele.clientHeight + 'px';
            };
            window.addEventListener('resize', this.updateHeight);
            /* Make a blocker */
            let blocker = document.createElement('div');
            blocker.style.display = 'none';
            blocker.style.background = '#000';
            blocker.style.opacity = '0.5';
            blocker.style.position = 'fixed';
            blocker.style.width = blocker.style.height = '100%';
            blocker.style.top = blocker.style.left = '0';
            blocker.style.zIndex = '1000';
            document.body.insertAdjacentElement('beforeend', blocker);

            let originalBodyOverflow;
            this.$showBlocker = () => {
                let animator = new ObjectAnimator(0, 0.5);
                animator.addUpdateListener(v => blocker.style.opacity = v.toString());
                blocker.style.opacity = '0';
                blocker.style.display = null;
                originalBodyOverflow = document.body.style.overflow;
                document.body.style.overflow = 'hidden';
                animator.start();
            };
            this.$hideBlocker = () => {
                let animator = new ObjectAnimator(0.5, 0);
                animator.addUpdateListener(v => blocker.style.opacity = v.toString());
                animator.doOnEnd(() => {
                    blocker.style.display = 'none';
                    document.body.style.overflow = originalBodyOverflow;
                });
                animator.start();
            };
            this.$showCard = () => {
                let animator = new ObjectAnimator(-ele.clientHeight, 0);
                animator.addUpdateListener(v => ele.style.bottom = v + 'px');
                animator.doOnEnd(() => this.shown = true);
                animator.start();
            };
            this.$hideCard = () => {
                let animator = new ObjectAnimator(0, -ele.clientHeight);
                animator.addUpdateListener(v => ele.style.bottom = v + 'px');
                animator.doOnEnd(() => this.shown = false);
                animator.start();
            };
            this.show = () => {
                this.$showBlocker();
                this.$showCard();
            };
            this.hide = () => {
                this.$hideBlocker();
                this.$hideCard();
                if (typeof this.onhide === "function") this.onhide();
            };
            if (options !== undefined) {
                if (options.hideOnTouch === true) {
                    blocker.addEventListener('click', () => this.hide())
                }
            }
        }
    }

    class ElementSharedViewer extends Viewer {
        constructor(ele, sharedA, sharedB, options) {
            super(ele, options);
            this.sharedA = sharedA;
            this.sharedB = sharedB;
            let measureAll = () => {
                this.sharedA.position = measure(this.sharedA);
                this.sharedB.position = measure(this.sharedB, false);
                if (!this.shown) {
                    this.sharedB.position.y -= ele.clientHeight;
                }
            };

            function measure(ele, considerScroll) {
                let x = 0, y = 0, test = ele;
                while (test !== document.body && test != null) {
                    y += test.offsetTop;
                    x += test.offsetLeft;
                    test = test.offsetParent;
                }
                let html = document.querySelector('html');
                if (considerScroll !== false) {
                    y -= html.scrollTop;
                    x -= html.scrollLeft;
                }
                return {
                    x: x,
                    y: y,
                    height: ele.clientHeight,
                    width: ele.clientWidth
                }

            }

            function move(ele, from, to, prepare, end) {
                function update(v) {
                    ele.style.left = (to.x - from.x) * v + from.x + 'px';
                    ele.style.top = (to.y - from.y) * v + from.y + 'px';
                    ele.style.width = (to.width - from.width) * v + from.width + 'px';
                    ele.style.height = (to.height - from.height) * v + from.height + 'px';
                }

                ele = clone(ele, true);
                ele.style.position = 'fixed';
                update(0);
                ele.style.display = ele.style.opacity = null;

                if (typeof prepare === "function") prepare();

                let animator = new ObjectAnimator(0, 1);
                animator.addUpdateListener(update);
                animator.doOnEnd(() => {
                    ele.remove();
                    if (typeof end === "function") end()
                });
                animator.start();
            }

            function clone(ele, hide) {
                let result = ele.cloneNode(true);
                if (hide === true) result.style.display = 'none';
                document.body.insertAdjacentElement('beforeend', result);
                result.style.zIndex = '1002';
                return result;
            }

            this.show = () => {
                measureAll();
                this.$showCard();
                this.$showBlocker();
                move(this.sharedB, this.sharedA.position, this.sharedB.position,
                    () => this.sharedB.style.opacity = this.sharedA.style.opacity = '0',
                    () => this.sharedB.style.opacity = null);
            };

            this.hide = () => {
                measureAll();
                this.$hideCard();
                this.$hideBlocker();
                move(this.sharedA, this.sharedB.position, this.sharedA.position,
                    () => this.sharedB.style.opacity = this.sharedA.style.opacity = '0',
                    () => this.sharedA.style.opacity = null);
            }
        }
    }

    /**
     * Allows an element to slide in from bottom and to be focused on.
     * @param ele
     * @param options {{hideOnTouch: boolean}}
     * @return {Viewer|ElementSharedViewer}
     */
    ContentViewer.init = (ele, options) => {
        let sharedResult = ele.querySelector('.shared-element'),
            sharedOrigin;
        let result;
        if (sharedResult) {
            let elements = document.querySelectorAll('.shared-element');
            for (let i in elements) {
                if (elements.hasOwnProperty(i)) {
                    let v = elements[i];
                    if (v !== sharedResult && v.getAttribute('data-target') === '#' + ele.id) {
                        sharedOrigin = v;
                        break;
                    }
                }
            }
            if (!sharedOrigin) {
                throw 'The content viewer has a shared element as child, which does not have an origin.'
            }
            result = new ElementSharedViewer(ele, sharedOrigin, sharedResult, options)
        } else {
            result = new Viewer(ele, options)
        }
        counter++;
        return result;
    };
})();
window.ContentViewer = ContentViewer;