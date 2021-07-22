let DomUtils = {
    isSelectable(element) {
        if (!(element instanceof Element)) {
            return false;
        }
        const unselectableTypes = ["button", "checkbox", "color", "file", "hidden", "image", "radio", "reset", "submit"];
        return ((element.nodeName.toLowerCase() === "input") && (unselectableTypes.indexOf(element.type) === -1)) ||
            (element.nodeName.toLowerCase() === "textarea") || element.isContentEditable;
    }
};
let fakeSpliteInputTag = document.createElement("fakespliteinput");
let fakeSpliteClickTag = document.createElement("fakespliteclick");

let LocalHints = {
    getVisibleClickable(mydocumet, element) {
        let contentEditable, role;
        const tagName = (element.tagName.toLowerCase ? element.tagName.toLowerCase() : null) || "";
        let isClickable = false;
        let onlyHasTabIndex = false;
        let possibleFalsePositive = false;
        const visibleElements = [];
        let reason = null;
        if (tagName === "img") {
            let mapName = element.getAttribute("usemap");
            if (mapName) {
                const imgClientRects = element.getClientRects();
                mapName = mapName.replace(/^#/, "").replace("\"", "\\\"");
                const map = mydocumet.querySelector(`map[name=\"${mapName}\"]`);
                if (map && (imgClientRects.length > 0)) {
                    const areas = map.getElementsByTagName("area");
                    visibleElements.push(...areas);
                }
            }
        }
        const ariaDisabled = element.getAttribute("aria-disabled");
        if (ariaDisabled && ["", "true"].includes(ariaDisabled.toLowerCase()))
            return [];

        if (!this.checkForAngularJs) {
            this.checkForAngularJs = (function () {
                const angularElements = mydocumet.getElementsByClassName("ng-scope");
                if (angularElements.length === 0) {
                    return () => false;
                } else {
                    const ngAttributes = [];
                    for (let prefix of ['', 'data-', 'x-']) {
                        for (let separator of ['-', ':', '_']) {
                            ngAttributes.push(`${prefix}ng${separator}click`);
                        }
                    }
                    return function (element) {
                        for (let attribute of ngAttributes) {
                            if (element.hasAttribute(attribute)) {
                                return true;
                            }
                        }
                        return false;
                    };
                }
            })();
        }

        if (!isClickable)
            isClickable = this.checkForAngularJs(element);

        if (element.hasAttribute("onclick")) {
            isClickable = true;
        } else if (((role = element.getAttribute("role")) != null) &&
            ["button", "tab", "link", "checkbox", "menuitem", "menuitemcheckbox", "menuitemradio"].includes(role.toLowerCase())) {
            isClickable = true;
        } else if (((contentEditable = element.getAttribute("contentEditable")) != null) &&
            ["", "contenteditable", "true"].includes(contentEditable.toLowerCase())) {
            isClickable = true;
        }

        if (!isClickable && element.hasAttribute("jsaction")) {
            const jsactionRules = element.getAttribute("jsaction").split(";");
            for (let jsactionRule of jsactionRules) {
                const ruleSplit = jsactionRule.trim().split(":");
                if ((ruleSplit.length >= 1) && (ruleSplit.length <= 2)) {
                    const [eventType, namespace, actionName] =
                        ruleSplit.length === 1 ?
                            ["click", ...ruleSplit[0].trim().split("."), "_"]
                            :
                            [ruleSplit[0], ...ruleSplit[1].trim().split("."), "_"];
                    if (!isClickable) {
                        isClickable = (eventType === "click") && (namespace !== "none") && (actionName !== "_");
                    }
                }
            }
        }

        switch (tagName) {
            case "a":
                isClickable = true;
                break;
            case "textarea":
                if (!isClickable) {
                    isClickable = !element.disabled && !element.readOnly;
                }
                break;
            case "input":
                let type = element.getAttribute("type");
                if (!isClickable) {
                    isClickable = !((type && (type.toLowerCase() === "hidden")) ||
                        element.disabled ||
                        (element.readOnly && DomUtils.isSelectable(element)));
                }
                break;
            case "button":
            case "select":
                if (!isClickable) {
                    isClickable = !element.disabled;
                }
                break;
            case "object":
            case "embed":
                isClickable = true;
                break;
            case "label":
                if (!isClickable) {
                    isClickable = (element.control !== undefined) && (element.control !== null) && !element.control.disabled &&
                        ((this.getVisibleClickable(mydocumet, element.control)).length === 0);
                }
                break;
            case "img":
                if (!isClickable) {
                    isClickable = ["zoom-in", "zoom-out"].includes(element.style.cursor);
                }
                break;
            case "details":
                isClickable = true;
                reason = "Open.";
                break;
        }

        const className = element.getAttribute("class");
        if (!isClickable && className && className.toLowerCase().includes("button"))
            possibleFalsePositive = isClickable = true;

        const tabIndexValue = element.getAttribute("tabindex");
        const tabIndex = tabIndexValue ? parseInt(tabIndexValue) : -1;
        if (!isClickable && !(tabIndex < 0) && !isNaN(tabIndex)) {
            isClickable = onlyHasTabIndex = true;
        }

        if (isClickable) {
            visibleElements.push(element);
        }

        return visibleElements;
    },

    getLocalHints(requireHref) {
        let visibleElement;
        let element;
        if (!document.documentElement)
            return [];
        let getAllElements = function (root, elements, i_frameles) {
            if (elements == null)
                elements = [];
            if (i_frameles == null)
                i_frameles = new Map();

            for (let element of Array.from(root.querySelectorAll("*"))) {
                // 对于跨域的此处没办法通过js获取到,但是浏览器要关闭跨域就没问题了。
                if (element.tagName.toLowerCase() === "iframe") {
                    if (element.contentDocument == null) {
                        continue
                    }
                    for (let ele of element.contentDocument.querySelectorAll("*")) {
                        if (i_frameles.has(element.contentDocument)) {
                            i_frameles.get(element.contentDocument).push(ele)
                        } else {
                            i_frameles.set(element.contentDocument, [ele])
                        }
                    }
                    continue
                }
                elements.push(element);
                if (element.shadowRoot)
                    getAllElements(element.shadowRoot, elements);
            }
            return [elements, i_frameles];
        };

        const [elements, i_frameles] = getAllElements(document.documentElement);
        let visibleElements = [];

        for (element of Array.from(elements)) {
            if (!requireHref || !!element.href) {
                visibleElement = this.getVisibleClickable(document, element);
                visibleElements.push(...visibleElement);
            }
        }
        for (let [iframeDocument, eles] of i_frameles.entries()) {
            for (let ele of eles) {
                visibleElement = this.getVisibleClickable(iframeDocument, ele);
                visibleElements.push(...visibleElement);
            }

        }
        visibleElements = visibleElements.reverse();
        const descendantsToCheck = [1, 2, 3];
        visibleElements =
            (() => {
                const result = [];
                for (let position = 0; position < visibleElements.length; position++) {
                    element = visibleElements[position];
                    if (element.possibleFalsePositive && (function () {
                        let index = Math.max(0, position - 6);
                        while (index < position) {
                            let candidateDescendant = visibleElements[index].element;
                            for (let _ of descendantsToCheck) {
                                candidateDescendant = candidateDescendant != null ? candidateDescendant.parentElement : undefined;
                                if (candidateDescendant === element.element)
                                    return true;
                            }
                            index += 1;
                        }
                        return false;
                    })()) {
                        // This is not a false positive.
                        continue;
                    }
                    result.push(element);
                }
                return result;
            })();
        return visibleElements.reverse();
    },

    getInputHints() {
        let visibleElements = this.getLocalHints();
        let inputClickEle = [];
        let otherClickEle = []
        for (let position = 0; position < visibleElements.length; position++) {
            let element = visibleElements[position];
            let tagName = element.tagName.toLowerCase()
            if (tagName === "input" || tagName === "textarea") {
                let typeFirstAttr = element.getAttribute("type")
                if (typeFirstAttr === "button" || typeFirstAttr === "submit") {
                    let tmpArray = []
                    let i = 1
                    let step = 0
                    while (i < 5) {
                        if ((position + i) >= visibleElements.length) {
                            break
                        }
                        let mayClicked = visibleElements[position + i]
                        if (mayClicked.tagName.toLowerCase() === "input" && mayClicked.getAttribute("type") === "text") {
                            tmpArray.push(mayClicked)
                            step = i
                        }
                        i += 1
                    }
                    if (tmpArray.length !== 0) {
                        tmpArray.push(element)
                        inputClickEle.push(tmpArray)
                        position += step
                    }
                } else {
                    let tmpArray = [element]
                    let checkButton = false
                    let i = 1
                    while (i < 8) {
                        if ((position + i) >= visibleElements.length) {
                            break
                        }
                        let mayClicked = visibleElements[position + i]
                        let parentNodeEle = mayClicked.parentNode

                        let parentNodeEleClassVal = parentNodeEle.getAttribute("class") ? parentNodeEle.getAttribute("class").toLowerCase() : null
                        let parentNodeEleIDVal = parentNodeEle.getAttribute("id") ? parentNodeEle.getAttribute("id").toLowerCase() : null
                        let classVal = mayClicked.getAttribute("class") ? mayClicked.getAttribute("class").toLowerCase() : null
                        let idVal = mayClicked.getAttribute("id") ? mayClicked.getAttribute("id").toLowerCase() : null
                        let jsOnClick = mayClicked.getAttribute("onclick") ? mayClicked.getAttribute("onclick").toLowerCase() : null
                        if (mayClicked.tagName.toLowerCase() === "input" || mayClicked.tagName.toLowerCase() === "textarea" || (mayClicked.getAttribute("contentEditable") !== null && ["", "contenteditable", "true"].includes(mayClicked.getAttribute("contentEditable").toLowerCase()))) {
                            tmpArray.push(mayClicked)
                            let typeSecondAttr = mayClicked.getAttribute("type")
                            if (typeSecondAttr === "submit" || typeSecondAttr === "button") {
                                checkButton = true
                                break
                            }
                        } else if (mayClicked.tagName.toLowerCase() === "button") {
                            tmpArray.push(mayClicked)
                            checkButton = true
                            break
                        } else if (classVal && (classVal.includes("submit") || classVal.includes("search") || classVal.includes("button") || classVal.includes("btn"))) {
                            tmpArray.push(mayClicked)
                            checkButton = true
                            break
                        } else if (idVal && (idVal.includes("submit") || idVal.includes("search") || idVal.includes("button") || idVal.includes("btn"))) {
                            tmpArray.push(mayClicked)
                            checkButton = true
                            break
                        } else if (jsOnClick && (jsOnClick.includes(".submit()") || (jsOnClick !== "" && i <= 2))) {
                            tmpArray.push(mayClicked)
                            checkButton = true
                            break
                        } else if (parentNodeEleClassVal && (parentNodeEleClassVal.includes("search") || parentNodeEleClassVal.includes("btn") || parentNodeEleClassVal.includes("submit") || parentNodeEleClassVal.includes("button"))) {
                            tmpArray.push(mayClicked)
                            checkButton = true
                            break
                        } else if (parentNodeEleIDVal && (parentNodeEleIDVal.includes("search") || parentNodeEleIDVal.includes("btn") || parentNodeEleIDVal.includes("submit") || parentNodeEleIDVal.includes("button"))) {
                            tmpArray.push(mayClicked)
                            checkButton = true
                            break
                        }
                        i += 1

                    }
                    if (checkButton) {
                        checkButton = false
                        inputClickEle.push(tmpArray)
                        position += i
                        continue
                    }
                    i = -3
                    while (i < 0) {
                        if ((position + i) < 0 || i === 0) {
                            continue
                        }
                        let mayClicked = visibleElements[position + i]
                        let jsOnClick = mayClicked.getAttribute("onclick") ? mayClicked.getAttribute("onclick").toLowerCase() : null
                        if (jsOnClick && (jsOnClick.includes(".submit()") || (jsOnClick !== "" && i <= 2))) {
                            tmpArray.push(mayClicked)
                            checkButton = true
                            break
                        }
                        i += 1
                    }
                    if (checkButton) {
                        checkButton = false
                        inputClickEle.push(tmpArray)
                        position += i
                    }
                }
            }else{
                otherClickEle.push(element)
            }
        }
        return this.makeFloatArray(inputClickEle,otherClickEle);
    },
    makeFloatArray(inputClickEle,otherClickEle) {
        let result = []
        for (eles of inputClickEle) {
            result.push(...eles)
            result.push(fakeSpliteInputTag)
        }
        if (result.length!==0){
            result.pop()
        }
        result.push(fakeSpliteClickTag)
        result.push(...otherClickEle)
        return result
    }
};
// LocalHints.getInputHints()
