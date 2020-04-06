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
            /* Swipe down to close */
            let startPos = {}, movedY = 0, movedX = 0, wantsToClose = false;
            ele.addEventListener('touchstart', function (event) {
                let touch = event.targetTouches[0];
                startPos = {x: touch.pageX, y: touch.pageY};
            });
            ele.addEventListener('touchmove', (event) => {
                if (event.targetTouches.length > 1 || event.scale && event.scale !== -1
                    || ele.scrollTop >= 10) return;
                let touch = event.targetTouches[0];
                movedX = touch.pageX - startPos.x; movedY = touch.pageY - startPos.y;
                if (movedY > 0 && movedY > Math.abs(movedX)) {
                    wantsToClose = true;
                    ele.style.bottom = -movedY + 'px';
                } else {
                    wantsToClose = false;
                }
            });
            ele.addEventListener('touchend', () => {
                if (wantsToClose) {
                    if (movedY >= ele.clientHeight * 0.3) {
                        this.hide();
                        wantsToClose = false;
                    } else {
                        this.$showCard();
                    }
                }
            });
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
            this.isMoving = false;
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
                this.isMoving = true;
                ele.style.opacity = null;
                let animator = new ObjectAnimator(parseInt(ele.style.bottom), 0);
                animator.addUpdateListener(v => ele.style.bottom = v + 'px');
                animator.doOnEnd(() => {
                    this.shown = true;
                    this.isMoving = false;
                });
                animator.start();
            };
            this.$hideCard = () => {
                this.isMoving = true;
                let animator = new ObjectAnimator(parseInt(ele.style.bottom), -ele.clientHeight);
                animator.addUpdateListener(v => ele.style.bottom = v + 'px');
                animator.doOnEnd(() => {
                    this.shown = false;
                    ele.style.opacity = '0';
                    this.isMoving = false;
                });
                animator.start();
            };
            this.show = () => {
                if (this.isMoving) return;
                this.$showBlocker();
                this.$showCard();
            };
            this.hide = () => {
                if (this.isMoving) return;
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

            this.show = () => {
                if (this.isMoving) return;
                this.$showCard();
                this.$showBlocker();
                measureAll();
                moveClone(this.sharedB, this.sharedA.position, this.sharedB.position,
                    () => this.sharedB.style.opacity = this.sharedA.style.opacity = '0',
                    () => this.sharedB.style.opacity = null);
            };

            this.hide = () => {
                if (this.isMoving) return;
                measureAll();
                this.$hideCard();
                this.$hideBlocker();
                moveClone(this.sharedA, this.sharedB.position, this.sharedA.position,
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